// tests/lib/system/audio/wire.test.ts

/**
 * UN SOLO SUSCRIPTOR, NO CUARENTA LLAMADAS.
 *
 * ⚠ ES LA DECISIÓN QUE EL PLAN DICE QUE HAY QUE ACERTAR A LA PRIMERA, y tiene
 * razón: si el sonido se reparte por los componentes, quedan disparos huérfanos
 * en sitios que nadie recuerda, y el día que uno suene de más no hay forma de
 * saber quién lo pidió. `awardFrom` ya está llamado desde NUEVE sitios
 * distintos: ése es el futuro que esto evita.
 *
 * Todo cuelga de los eventos que YA EXISTEN. Cuatro de las fuentes no tocan una
 * línea de código de la app —dos almacenes, una escucha de teclado y un
 * observador del `body`— y las otras dos entran por el embudo por el que ya
 * pasaban todas las llamadas.
 */

import { startSound } from '@/lib/system/audio/wire';
import { teardownAudio } from '@/lib/system/audio/context';
import { fireGlitch } from '@/hooks/useGlitch';
import { markSecretFound, setEffectsEnabled } from '@/hooks/useSystemState';
import { contextCount, installFakeAudio, lastContext, type FakeNode } from './fakeAudio';

let quitarFalso: () => void;
let parar: () => void;

beforeEach(() => {
    localStorage.clear();
    quitarFalso = installFakeAudio();
    parar = startSound();
});

afterEach(() => {
    parar();
    teardownAudio();
    quitarFalso();
});

/** Las fuentes de sonido creadas desde una marca: lo que suena de verdad. */
function fuentes(desde: number): FakeNode[] {
    return lastContext()!
        .created.slice(desde)
        .filter((n) => n.kind === 'bufferSource' || n.kind === 'oscillator');
}

/** Cuántos nodos hay, o cero si aún no nació el contexto. */
function marca(): number {
    return lastContext()?.created.length ?? 0;
}

function teclear(key: string, target: HTMLElement) {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

describe('las teclas', () => {
    it('suenan al escribir en un área de texto', () => {
        const area = document.createElement('textarea');
        document.body.append(area);

        teclear('a', area);

        expect(fuentes(0).length).toBeGreaterThan(0);
        area.remove();
    });

    it('⚠ pero NO cuando el foco no está escribiendo en ningún sitio', () => {
        /*
         * Si sonara con cualquier tecla, navegar con el tabulador o pulsar
         * Escape haría ruido de teclado sin que nadie esté escribiendo. La tecla
         * es el sonido de ESCRIBIR, no el de tocar el teclado.
         */
        const div = document.createElement('div');
        document.body.append(div);

        teclear('a', div);

        expect(contextCount()).toBe(0);
        div.remove();
    });

    it('y los modificadores solos no golpean nada', () => {
        // Pulsar Shift para escribir una mayúscula suena UNA vez, la de la
        // letra. Si sonara también el Shift, escribir en mayúsculas sonaría al
        // doble de velocidad.
        const area = document.createElement('textarea');
        document.body.append(area);

        teclear('Shift', area);
        teclear('Control', area);

        expect(contextCount()).toBe(0);
        area.remove();
    });
});

describe('el glitch', () => {
    it('suena cuando el almacén del glitch se enciende', () => {
        /*
         * ⚠ CUELGA DEL MISMO CAMBIO DE ESTADO QUE PINTA LA IMAGEN, y ésa es la
         * razón de suscribirse en vez de disparar a mano: el sonido y el tirón
         * salen del mismo suceso, así que no hay dos relojes que sincronizar.
         */
        setEffectsEnabled(true);
        const antes = marca();

        fireGlitch();

        expect(fuentes(antes).length).toBeGreaterThan(0);
    });
});

describe('los hallazgos', () => {
    it('un secreto suena', () => {
        const antes = marca();

        markSecretFound('commands');

        expect(fuentes(antes).length).toBeGreaterThan(0);
    });

    it('el mismo secreto NO suena dos veces', () => {
        // `markSecretFound` ya ignora los repetidos; esto fija que el sonido
        // siga esa decisión en vez de tener la suya.
        markSecretFound('diagnostics');
        const antes = marca();

        markSecretFound('diagnostics');

        expect(fuentes(antes)).toHaveLength(0);
    });

    it('⚠ y los del ente suenan DISTINTO de los demás', async () => {
        /*
         * La diferencia de sentido que el plan pide que se oiga: los suyos no
         * los encontraste, te los dio él. Se comprueba por la forma de las
         * notas, que es lo que las distingue — la buena sube y la torcida baja.
         */
        /*
         * ⚠ CON UNA ESPERA ENTRE MEDIO, y la primera versión no la tenía: los
         * dos confirms son de la misma familia, así que la compuerta de 60 ms
         * se comía el segundo y el test fallaba por un motivo que no era el
         * suyo. Dos hallazgos en el mismo milisegundo no pasan jugando.
         */
        const sube = async (id: string) => {
            const antes = marca();
            markSecretFound(id);
            await new Promise((r) => setTimeout(r, 70));

            const notas = fuentes(antes).map((n) => n.frequency.value);
            return notas.length === 2 ? notas[1] > notas[0] : null;
        };

        expect(await sube('history')).toBe(true);
        expect(await sube('entity-awake')).toBe(false);
    });

    it('y reportarlo suena BIEN, porque ése te lo llevaste vos', () => {
        /*
         * Es el único `entity-*` que no te dio él: es el que conseguiste
         * VOLVIÉNDOTE EN SU CONTRA. Que suene limpio justo ahí lo convierte en
         * una pequeña traición, que vale más que una melodía número treinta y
         * cuatro.
         */
        const antes = marca();
        markSecretFound('entity-reported');
        const notas = fuentes(antes).map((n) => n.frequency.value);

        expect(notas[1]).toBeGreaterThan(notas[0]);
    });
});

describe('apagarlo lo apaga entero', () => {
    it('parar el suscriptor deja de sonar', () => {
        parar();

        const area = document.createElement('textarea');
        document.body.append(area);
        teclear('a', area);

        expect(contextCount()).toBe(0);
        area.remove();
    });
});
