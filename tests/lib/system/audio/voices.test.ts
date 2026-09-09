// tests/lib/system/audio/voices.test.ts

/**
 * LAS VOCES, Y SOBRE TODO LA TECLA.
 *
 * La tecla es el sonido que más veces va a sonar en la vida del producto: si
 * está mal, todo está mal. Y lo que separa una tecla de un bip es que una tecla
 * NO ES UN SONIDO, son tres capas — el chasquido del interruptor, la resonancia
 * del plástico y el golpe de fondo.
 *
 * Eso no se puede comprobar de oído desde un test, pero sí se puede comprobar
 * que las tres capas EXISTAN. Un oscilador solo suena a juguete, y el día que
 * alguien «simplifique» esto a una fuente, la suite lo dice.
 */

import { CATEGORY_OF, KEY_LAYERS, beep, glitchBurst, key, relay, tick } from '@/lib/system/audio/voices';
import { ensureAudio, teardownAudio } from '@/lib/system/audio/context';
import { installFakeAudio, lastContext, reaches, type FakeNode } from './fakeAudio';

let quitarFalso: () => void;

beforeEach(() => {
    localStorage.clear();
    quitarFalso = installFakeAudio();
});

afterEach(() => {
    teardownAudio();
    quitarFalso();
});

/** Azar determinista, para que el jitter no haga flakear nada. */
function azar(semilla: number): () => number {
    let s = semilla;
    return () => {
        s = (s * 1_103_515_245 + 12_345) % 2_147_483_648;
        return s / 2_147_483_648;
    };
}

/** Los nodos creados desde una marca. */
function nuevos(desde: number): FakeNode[] {
    return lastContext()!.created.slice(desde);
}

/** Las fuentes de sonido de un tramo: lo que suena de verdad. */
function fuentes(desde: number): FakeNode[] {
    return nuevos(desde).filter((n) => n.kind === 'bufferSource' || n.kind === 'oscillator');
}

describe('la tecla, que es la que más va a sonar', () => {
    it('⚠ son TRES capas, no un pitido', () => {
        /*
         * El §3 lo dice como principio y acá se fija como estructura:
         * transitorio + cuerpo + cola. Tres fuentes de sonido, y si mañana
         * quedan dos, esto falla y obliga a mirar por qué.
         */
        const g = ensureAudio()!;
        const antes = lastContext()!.created.length;

        key(g, azar(1));

        expect(fuentes(antes)).toHaveLength(3);
    });

    it('cada capa lleva su envolvente, no entra a saco', () => {
        // Sin envolvente hay una discontinuidad en cada extremo — un «clic»
        // digital sucio. Es el ruido que delata al audio mal hecho.
        const g = ensureAudio()!;
        const antes = lastContext()!.created.length;

        key(g, azar(2));

        const ganancias = nuevos(antes).filter((n) => n.kind === 'gain');

        expect(ganancias.length).toBeGreaterThanOrEqual(3);
        for (const gan of ganancias) {
            expect(gan.gain.calls.length).toBeGreaterThan(0);
        }
    });

    it('todas las capas terminan saliendo por el bus', () => {
        const g = ensureAudio()!;
        const antes = lastContext()!.created.length;

        key(g, azar(3));

        for (const f of fuentes(antes)) {
            expect(reaches(f, 'gain')).toBe(true);
        }
    });

    it('todo lo que arranca también para: no quedan nodos colgando', () => {
        /*
         * ⚠ UNA FUENTE QUE NO SE PARA NO SE RECOLECTA.
         *
         * Es la fuga clásica de Web Audio, y en un sonido que va a dispararse
         * miles de veces por sesión no es un detalle: son miles de nodos vivos
         * a los diez minutos de escribir.
         */
        const g = ensureAudio()!;
        const antes = lastContext()!.created.length;

        key(g, azar(4));

        for (const f of fuentes(antes)) {
            expect(f.started).not.toBeNull();
            expect(f.stopped).not.toBeNull();
            expect(f.stopped!).toBeGreaterThan(f.started!);
        }
    });

    it('⚠ y no suena dos veces igual', () => {
        // Lo que delata al audio falso. Dos teclas con azar distinto tienen que
        // dar frecuencias distintas en alguna de sus capas.
        const g = ensureAudio()!;

        const antes1 = lastContext()!.created.length;
        key(g, azar(11));
        const f1 = nuevos(antes1)
            .filter((n) => n.kind === 'biquad' || n.kind === 'oscillator')
            .map((n) => n.frequency.value);

        const antes2 = lastContext()!.created.length;
        key(g, azar(999));
        const f2 = nuevos(antes2)
            .filter((n) => n.kind === 'biquad' || n.kind === 'oscillator')
            .map((n) => n.frequency.value);

        expect(f1).not.toEqual(f2);
    });

    it('⚠ cada disparo lee un TROZO DISTINTO del ruido', () => {
        /*
         * El búfer es uno solo y se reutiliza —eso es lo correcto—, pero si
         * todos los disparos arrancan en la muestra cero, todos los chasquidos
         * comparten la misma forma de onda inicial. El filtro cambia, el
         * volumen cambia, y aun así se OYE la repetición: el ataque es
         * identico y el ataque es lo primero que llega al oido.
         *
         * Un `start(cuando)` sin desplazamiento es exactamente ese fallo, y es
         * invisible salvo escuchando mucho rato.
         */
        const g = ensureAudio()!;

        const puntos = new Set<number>();
        for (let i = 0; i < 6; i += 1) {
            const antes = lastContext()!.created.length;
            key(g, azar(i + 40));
            for (const f of fuentes(antes)) {
                if (f.kind === 'bufferSource') puntos.add(f.offset!);
            }
        }

        expect(puntos.size).toBeGreaterThan(1);
        for (const p of puntos) expect(p).not.toBeNull();
    });

    it('el ruido se genera UNA vez, no en cada tecla', () => {
        /*
         * Un búfer de ruido nuevo por pulsación sería reservar memoria y
         * rellenarla con miles de números en el hilo principal MIENTRAS alguien
         * escribe. Es la forma más fácil de hacer que el sonido pese, y el §7
         * avisa de que esto no se puede hacer mal la primera vez.
         */
        const g = ensureAudio()!;

        // La primera tecla SI lo crea —una vez, y esa es la idea—, asi que la
        // cuenta se toma despues de ella: lo que se afirma es que las veinte
        // siguientes no crean ninguno mas.
        key(g, azar(0));
        const antes = lastContext()!.buffersCreated;

        for (let i = 1; i <= 20; i += 1) key(g, azar(i));

        expect(lastContext()!.buffersCreated).toBe(antes);
    });
});

describe('⚠ cada capa devuelve lo que su filtro se lleva', () => {
    /*
     * LA CORRECCION QUE HIZO QUE ESTO SE OYERA.
     *
     * Medido en el navegador antes de existir: la tecla salia a −47,5 dBFS de
     * RMS y el bip a −19,4. Veintiocho decibelios, cuando el §8 pide seis. La
     * tecla estaba, pero debajo de todo.
     *
     * La causa era de modelo: el numero de la envolvente NO es el nivel de
     * salida, es un multiplicador sobre lo que el filtro deja pasar — y un
     * pasabanda estrecho deja pasar casi nada. La bocinita no cruza ninguno y
     * salia entera.
     */

    it('el cuerpo de la tecla pide MUCHO mas de uno, y eso es correcto', () => {
        const g = ensureAudio()!;
        const antes = lastContext()!.created.length;

        key(g, azar(3), ['body']);

        const pico = Math.max(
            ...nuevos(antes)
                .filter((n) => n.kind === 'gain')
                .flatMap((n) => n.gain.calls.map((c) => c.value))
        );

        // Su filtro esta a 310 Hz con Q 6,5: se lleva mas del 99% de la energia.
        expect(pico).toBeGreaterThan(5);
    });

    it('y el chasquido, que es ancho, pide bastante menos', () => {
        /*
         * Es la comprobacion de que la compensacion depende del FILTRO y no es
         * un numero pegado a ojo. El chasquido va a 2,8 kHz con Q 1,1 — banda
         * ancha y aguda— asi que pierde mucho menos que el cuerpo.
         */
        const g = ensureAudio()!;

        const picoDe = (capa: 'click' | 'body') => {
            const antes = lastContext()!.created.length;
            key(g, azar(3), [capa]);
            return Math.max(
                ...nuevos(antes)
                    .filter((n) => n.kind === 'gain')
                    .flatMap((n) => n.gain.calls.map((c) => c.value))
            );
        };

        expect(picoDe('click')).toBeLessThan(picoDe('body'));
    });

    it('la bocinita NO compensa nada: no cruza ningun filtro estrecho', () => {
        // Y si algun dia alguien le mete uno, este test recuerda por que su
        // nivel esta donde esta.
        const g = ensureAudio()!;
        const antes = lastContext()!.created.length;

        beep(g, { hz: 880, ms: 90 }, azar(6));

        const pico = Math.max(
            ...nuevos(antes)
                .filter((n) => n.kind === 'gain')
                .flatMap((n) => n.gain.calls.map((c) => c.value))
        );

        expect(pico).toBeLessThanOrEqual(1);
    });
});

describe('las capas de la tecla, sueltas', () => {
    /*
     * ⚠ PARA QUÉ EXISTE ESTO, QUE NO ES PARA LOS TESTS.
     *
     * Si la tecla suena mal, saberlo no sirve de nada: hay que saber CUÁL de
     * las tres capas está mal. Mezcladas es imposible — el chasquido tapa al
     * cuerpo y el cuerpo tapa al fondo. El banco de pruebas las dispara sueltas
     * y por eso la voz tiene que saber tocar sólo una.
     */

    it('declara sus tres capas por nombre', () => {
        expect([...KEY_LAYERS]).toEqual(['click', 'body', 'thud']);
    });

    it('pedir una sola capa suena una sola fuente', () => {
        const g = ensureAudio()!;
        const antes = lastContext()!.created.length;

        key(g, azar(1), ['body']);

        expect(fuentes(antes)).toHaveLength(1);
    });

    it('y el cuerpo es el que lleva la resonancia grave', () => {
        // La capa que separa un teclado mecanico de uno de membrana. Si su
        // filtro se va a los agudos, deja de sonar a plastico y a placa.
        const g = ensureAudio()!;
        const antes = lastContext()!.created.length;

        key(g, azar(1), ['body']);

        const f = nuevos(antes).find((n) => n.kind === 'biquad')!;

        expect(f.frequency.value).toBeGreaterThan(200);
        expect(f.frequency.value).toBeLessThan(500);
    });

    it('sin pedir nada suenan las tres, que es lo normal', () => {
        const g = ensureAudio()!;
        const antes = lastContext()!.created.length;

        key(g, azar(1));

        expect(fuentes(antes)).toHaveLength(3);
    });
});

describe('el glitch, que tiene que temblar con la imagen', () => {
    it('⚠ se corta en ESCALONES, no en una rampa suave', () => {
        /*
         * La imagen usa `steps(1, end)`: salta, no se desliza. Si el sonido se
         * desvanece suavemente mientras la pantalla da tirones secos, las dos
         * cosas dejan de ser el mismo suceso y pasan a ser un efecto de imagen
         * con música encima.
         */
        const g = ensureAudio()!;
        const antes = lastContext()!.created.length;

        glitchBurst(g, { amplitudePx: 6, durationMs: 180 }, azar(5));

        const escalonadas = nuevos(antes)
            .filter((n) => n.kind === 'gain')
            .filter((n) => n.gain.calls.filter((c) => c.method === 'setValueAtTime').length >= 3);

        expect(escalonadas.length).toBeGreaterThan(0);
    });

    it('y suena más fuerte cuanto más tiembla', () => {
        // El §5 lo pide explícitamente: lo que reacciona no puede ser una
        // muestra. La amplitud del tirón tiene que llegar al volumen.
        const g = ensureAudio()!;

        const pico = (amplitudePx: number) => {
            const antes = lastContext()!.created.length;
            glitchBurst(g, { amplitudePx, durationMs: 180 }, azar(5));
            return Math.max(
                ...nuevos(antes)
                    .filter((n) => n.kind === 'gain')
                    .flatMap((n) => n.gain.calls.map((c) => c.value))
            );
        };

        expect(pico(12)).toBeGreaterThan(pico(3));
    });

    it('y dura lo que dura el tirón, ni más ni menos', () => {
        // Si el sonido siguiera después de que la imagen se calma, el suceso se
        // partiría en dos: primero se ve, después se oye.
        const g = ensureAudio()!;
        const antes = lastContext()!.created.length;

        glitchBurst(g, { amplitudePx: 6, durationMs: 180 }, azar(9));

        const largo = Math.max(...fuentes(antes).map((f) => f.stopped! - f.started!));

        expect(largo).toBeGreaterThan(0.1);
        expect(largo).toBeLessThan(0.32);
    });
});

describe('el resto de las voces', () => {
    it('la bocinita es una onda cuadrada cruda, y eso es lo correcto', () => {
        /*
         * Es la ÚNICA voz que tiene que sonar barata. Una PC de los 80 tenía un
         * altavoz malo y eso es lo que la delata. Acá, y sólo acá, lo pobre es
         * la intención.
         */
        const g = ensureAudio()!;
        const antes = lastContext()!.created.length;

        beep(g, { hz: 880, ms: 90 }, azar(6));

        const osc = nuevos(antes).find((n) => n.kind === 'oscillator');

        expect(osc!.type).toBe('square');
    });

    it('el relé es seco: empieza y acaba en menos de 40 ms', () => {
        const g = ensureAudio()!;
        const antes = lastContext()!.created.length;

        relay(g, azar(7));

        const masLargo = Math.max(...fuentes(antes).map((f) => f.stopped! - f.started!));

        expect(masLargo).toBeLessThan(0.04);
    });

    it('el tic del teletipo es más corto que una tecla', () => {
        const g = ensureAudio()!;

        const dura = (fn: () => void) => {
            const antes = lastContext()!.created.length;
            fn();
            return Math.max(...fuentes(antes).map((f) => f.stopped! - f.started!));
        };

        expect(dura(() => tick(g, azar(8)))).toBeLessThan(dura(() => key(g, azar(8))));
    });
});

describe('el catálogo de categorías', () => {
    it('cada voz declara a qué familia de la mezcla pertenece', () => {
        /*
         * ⚠ SIN ESTO, UNA VOZ NUEVA SUENA A VOLUMEN COMPLETO.
         *
         * El presupuesto del §8 sólo sirve si toda voz pasa por él. Una que no
         * declare familia se salta el reparto y la compuerta a la vez, que son
         * justo las dos cosas que impiden que el sistema aturda.
         */
        expect(CATEGORY_OF.key).toBe('keys');
        expect(CATEGORY_OF.tick).toBe('keys');
        expect(CATEGORY_OF.beep).toBe('confirm');
        expect(CATEGORY_OF.relay).toBe('glitch');
        expect(CATEGORY_OF.glitchBurst).toBe('glitch');
    });
});
