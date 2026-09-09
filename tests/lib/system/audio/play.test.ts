// tests/lib/system/audio/play.test.ts

/**
 * LA CAPA QUE HACE QUE EL PRESUPUESTO SIRVA DE ALGO.
 *
 * `mix.ts` reparte el volumen y cierra la compuerta, pero es aritmética: no
 * puede obligar a nadie. Las voces, por su lado, sólo saben programar nodos y
 * no consultan nada — a propósito, para que el banco de pruebas pueda
 * dispararlas sueltas.
 *
 * Éste es el único sitio donde las dos cosas se juntan, y por eso es el único
 * sitio por el que la app puede sonar. Una voz llamada por fuera de acá se
 * salta el reparto Y la compuerta a la vez.
 */

import { CATEGORY_OF } from '@/lib/system/audio/voices';
import { gainFor } from '@/lib/system/audio/mix';
import { play } from '@/lib/system/audio/play';
import { setSoundOn, teardownAudio } from '@/lib/system/audio/context';
import { contextCount, installFakeAudio, lastContext, type FakeNode } from './fakeAudio';

let quitarFalso: () => void;

beforeEach(() => {
    localStorage.clear();
    quitarFalso = installFakeAudio();
});

afterEach(() => {
    teardownAudio();
    quitarFalso();
});

function fuentes(desde: number): FakeNode[] {
    return lastContext()!
        .created.slice(desde)
        .filter((n) => n.kind === 'bufferSource' || n.kind === 'oscillator');
}

describe('apagado no suena, y no cuesta nada', () => {
    it('con el sonido apagado no se crea ni un contexto', () => {
        setSoundOn(false);

        play('key');
        play('glitchBurst', { amplitudePx: 9, durationMs: 180 });

        expect(contextCount()).toBe(0);
    });

    it('y quien llama no tiene que preguntar antes', () => {
        // La comprobación vive acá dentro. Si cada sitio que suena tuviera que
        // acordarse de mirar el interruptor, alguno se olvidaría.
        setSoundOn(false);

        expect(() => play('key')).not.toThrow();
    });
});

describe('la compuerta, ya aplicada de verdad', () => {
    it('dos teclas seguidas: la segunda no llega a sonar', () => {
        play('key', undefined, 1_000);
        const antes = lastContext()!.created.length;

        play('key', undefined, 1_030);

        expect(fuentes(antes)).toHaveLength(0);
    });

    it('pero pasado el hueco vuelve a sonar', () => {
        play('key', undefined, 1_000);
        const antes = lastContext()!.created.length;

        play('key', undefined, 1_100);

        expect(fuentes(antes).length).toBeGreaterThan(0);
    });

    it('⚠ y una tecla no le cierra la puerta al glitch', () => {
        /*
         * Son de familias distintas y ocurren a la vez constantemente: escribís
         * y la máquina falla encima. Si compartieran puerta, el fallo se
         * comería la tecla o al revés según cuál llegara primero — y el glitch
         * es justo el que tiene que sonar sincronizado con la imagen.
         */
        play('key', undefined, 1_000);
        const antes = lastContext()!.created.length;

        play('glitchBurst', { amplitudePx: 9, durationMs: 180 }, 1_000);

        expect(fuentes(antes).length).toBeGreaterThan(0);
    });
});

describe('el presupuesto del §8, aplicado', () => {
    it('cada familia suena a su volumen y no al que la voz pidió', () => {
        /*
         * ⚠ SIN ESTO EL §8 ES DECORACIÓN.
         *
         * Las voces traen sus picos internos, que son relativos entre sus
         * capas. Lo que decide cuánto suena una tecla FRENTE a un fallo es la
         * familia, y ese reparto tiene que aplicarse en un solo sitio.
         */
        play('key');

        const escalas = lastContext()!
            .created.filter((n) => n.kind === 'gain')
            .map((n) => n.gain.value);

        expect(escalas).toContain(gainFor('keys'));
    });

    it('el fallo suena mucho mas fuerte que el ambiente, como manda la tabla', () => {
        expect(gainFor(CATEGORY_OF.glitchBurst)).toBeGreaterThan(gainFor('ambience'));
    });

    it('las ganancias de familia se crean UNA vez, no en cada disparo', () => {
        /*
         * Un nodo de escala por pulsación son miles de nodos en una sesión de
         * escritura. Se crean al vuelo la primera vez y se quedan.
         */
        play('key', undefined, 1_000);
        const antes = lastContext()!.created.filter((n) => n.kind === 'gain').length;

        for (let i = 1; i <= 10; i += 1) play('key', undefined, 1_000 + i * 100);

        const despues = lastContext()!.created.filter((n) => n.kind === 'gain').length;
        const porDisparo = (despues - antes) / 10;

        // Cada tecla crea sus tres envolventes y ninguna escala mas.
        expect(porDisparo).toBeLessThanOrEqual(3);
    });
});

describe('⚠ con el audio dormido, un golpe NO se guarda para despues', () => {
    /*
     * MEDIDO EN EL NAVEGADOR, y es la clase de fallo que no se ve leyendo.
     *
     * Todo `AudioContext` nace suspendido hasta que hay un gesto del usuario.
     * Pero un contexto suspendido NO tira lo que se le programa: congela su
     * reloj y lo guarda. Se midio con un tono a 0,2 de amplitud programado con
     * el contexto dormido — al despertarlo OCHO SEGUNDOS despues sono entero, a
     * su amplitud completa.
     *
     * O sea que todo lo que la maquina intenta decir antes del primer gesto se
     * amontona y estalla junto en el instante en que alguien toca una tecla. Es
     * exactamente el «pitido feo al empezar» que se reporto jugando.
     *
     * ⚠ El ambiente es la excepcion y no pasa por aca: es continuo, no un
     * instante, asi que oirlo aparecer tarde es lo correcto — sigue ahi cuando
     * llega el permiso.
     */
    it('no programa nada mientras el contexto no corre', () => {
        const g = crearGrafoDormido();
        const antes = g.created.length;

        /*
         * ⚠ CON UN `now` MUY POSTERIOR, Y MEDIDO EN RELOJ DE VERDAD. Con el
         * de por defecto la compuerta de 60 ms rechaza el disparo y el test
         * pasa en verde sin que exista la regla que dice medir: se comprobo,
         * pasaba. Y un numero pequeno tampoco vale — `Date.now()` ronda el
         * billon y siete cifras quedan en el PASADO, o sea otra vez la
         * compuerta. Tambien se comprobo.
         */
        const sono = play('key', undefined, Date.now() + 900_000);

        expect(sono).toBe(false);
        expect(g.created.slice(antes)).toHaveLength(0);
    });

    it('y en cuanto corre, vuelve a sonar', () => {
        const g = crearGrafoDormido();
        play('key', undefined, Date.now() + 900_000);

        g.blocked = false;
        g.state = 'running';
        const antes = g.created.length;

        expect(play('key', undefined, Date.now() + 1_800_000)).toBe(true);
        expect(g.created.slice(antes).length).toBeGreaterThan(0);
    });
});

/**
 * Un grafo ya montado pero con el contexto dormido.
 *
 * `ensureAudio` despierta el contexto en cada llamada —es lo correcto—, asi que
 * para medir el caso del navegador bloqueado hay que volver a dormirlo DESPUES
 * de que el grafo exista. Es justo lo que pasa de verdad: el grafo se construye
 * al montar la app y el permiso no llega hasta el primer gesto.
 */
function crearGrafoDormido() {
    play('key');
    const g = lastContext()!;
    g.blocked = true;
    g.state = 'suspended';
    return g;
}
