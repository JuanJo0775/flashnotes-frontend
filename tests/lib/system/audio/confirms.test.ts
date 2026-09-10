// tests/lib/system/audio/confirms.test.ts

/**
 * UNA FAMILIA DE CONFIRMS, NO TREINTA Y TRES MELODÍAS.
 *
 * Treinta y tres jingles distintos son ruido, no diseño: nadie recuerda
 * treinta y tres, y la primera vez que suena uno nuevo no significa nada porque
 * no se parece a lo anterior. Un confirm corto de dos notas, repetido, se
 * aprende a la segunda y a la tercera ya es «encontré algo».
 *
 * ⚠ Y LOS DEL ENTE SUENAN MAL A PROPÓSITO. Es el mismo confirm, desafinado y al
 * revés. Porque esos hallazgos NO LOS ENCONTRASTE VOS: te los dio él. Es una
 * diferencia de sentido y tiene que oírse, pero tiene que oírse COMO UNA
 * VARIANTE — si fuera otro sonido distinto, se leería como otra categoría de
 * cosa en vez de como la misma cosa torcida.
 */

import { CATEGORY_OF, confirm, drawer } from '@/lib/system/audio/voices';
import { ensureAudio, teardownAudio } from '@/lib/system/audio/context';
import { installFakeAudio, lastContext, type FakeNode } from './fakeAudio';

let quitarFalso: () => void;

beforeEach(() => {
    localStorage.clear();
    quitarFalso = installFakeAudio();
});

afterEach(() => {
    teardownAudio();
    quitarFalso();
});

function azar(semilla: number): () => number {
    let s = semilla;
    return () => {
        s = (s * 1_103_515_245 + 12_345) % 2_147_483_648;
        return s / 2_147_483_648;
    };
}

function nuevos(desde: number): FakeNode[] {
    return lastContext()!.created.slice(desde);
}

/** Las frecuencias de los osciladores de un disparo, en orden. */
function notas(desde: number): number[] {
    return nuevos(desde)
        .filter((n) => n.kind === 'oscillator')
        .map((n) => n.frequency.value);
}

describe('el confirm de siempre', () => {
    it('son DOS notas, ni una ni tres', () => {
        const g = ensureAudio()!;
        const antes = lastContext()!.created.length;

        confirm(g, { wrong: false }, azar(1));

        expect(notas(antes)).toHaveLength(2);
    });

    it('sube: la segunda es más aguda que la primera', () => {
        // Subir es la forma universal de decir que algo salió bien. Bajar es lo
        // que hace un error, y por eso es lo que hace la variante torcida.
        const g = ensureAudio()!;
        const antes = lastContext()!.created.length;

        confirm(g, { wrong: false }, azar(2));

        const [primera, segunda] = notas(antes);
        expect(segunda).toBeGreaterThan(primera);
    });

    it('y no suena dos veces igual', () => {
        const g = ensureAudio()!;

        const a1 = lastContext()!.created.length;
        confirm(g, { wrong: false }, azar(7));
        const uno = notas(a1);

        const a2 = lastContext()!.created.length;
        confirm(g, { wrong: false }, azar(555));

        expect(notas(a2)).not.toEqual(uno);
    });
});

describe('⚠ el de los hallazgos que te dio ÉL', () => {
    it('es la misma voz: también son dos notas', () => {
        /*
         * Ésta es la mitad que hace que la idea funcione. Si el confirm torcido
         * tuviera otra forma —tres notas, o ruido— se leería como otra clase de
         * suceso. Tiene que ser EL MISMO, mal.
         */
        const g = ensureAudio()!;
        const antes = lastContext()!.created.length;

        confirm(g, { wrong: true }, azar(1));

        expect(notas(antes)).toHaveLength(2);
    });

    it('pero va al revés: la segunda es más grave', () => {
        const g = ensureAudio()!;
        const antes = lastContext()!.created.length;

        confirm(g, { wrong: true }, azar(2));

        const [primera, segunda] = notas(antes);
        expect(segunda).toBeLessThan(primera);
    });

    it('y está desafinado, no sólo invertido', () => {
        /*
         * Invertir a secas daría un confirm descendente perfectamente afinado, y
         * eso suena a «cancelado», que es otra cosa. Lo que tiene que sonar es
         * ROTO: el mismo gesto con el tono corrido.
         */
        const g = ensureAudio()!;

        const aBien = lastContext()!.created.length;
        confirm(g, { wrong: false }, azar(3));
        const bien = notas(aBien);

        const aMal = lastContext()!.created.length;
        confirm(g, { wrong: true }, azar(3));
        const mal = notas(aMal);

        // Con el MISMO azar, ninguna de las dos notas cae donde caería la buena.
        expect(mal[0]).not.toBeCloseTo(bien[1], 1);
        expect(mal[1]).not.toBeCloseTo(bien[0], 1);
    });
});

describe('la entrega de una pieza', () => {
    it('es más larga que un confirm: es un premio, no un acuse', () => {
        const g = ensureAudio()!;

        const dura = (fn: () => void) => {
            const antes = lastContext()!.created.length;
            fn();
            return Math.max(
                ...nuevos(antes)
                    .filter((n) => n.kind === 'bufferSource' || n.kind === 'oscillator')
                    .map((n) => n.stopped! - n.started!)
            );
        };

        expect(dura(() => drawer(g, { closing: false }, azar(4)))).toBeGreaterThan(
            dura(() => confirm(g, { wrong: false }, azar(4)))
        );
    });

    it('y lleva capas: un cajón que se abre no es un pitido', () => {
        const g = ensureAudio()!;
        const antes = lastContext()!.created.length;

        drawer(g, { closing: false }, azar(5));

        const fuentes = nuevos(antes).filter(
            (n) => n.kind === 'bufferSource' || n.kind === 'oscillator'
        );

        expect(fuentes.length).toBeGreaterThanOrEqual(2);
    });
});

describe('las dos declaran familia', () => {
    it('para que el presupuesto del §8 las alcance', () => {
        expect(CATEGORY_OF.confirm).toBe('confirm');
        expect(CATEGORY_OF.drawer).toBe('confirm');
    });
});

describe('⚠ y el cajón se cierra con el mismo cajón', () => {
    /*
     * Es el truco del cabezal otra vez: una sola pieza mecánica haciendo dos
     * cosas, no dos voces parecidas. Se abre para sacar un premio y se cierra
     * cuando algo se fue para no volver — la misma madera contando las dos
     * únicas cosas de esta app que son para siempre.
     *
     * Lo que los distingue no es el volumen: es la FORMA del recorrido.
     */
    it('el tope de cerrar es MÁS GRAVE que el de abrir', () => {
        // Un cajón que se empuja choca contra el marco; uno que se saca se
        // frena solo. Medido: 122 Hz abriendo contra 93 cerrando.
        const g = ensureAudio()!;

        const tope = (closing: boolean) => {
            const antes = lastContext()!.created.length;
            drawer(g, { closing }, azar(9));
            return nuevos(antes)
                .filter((n) => n.kind === 'oscillator')
                .map((n) => n.frequency!.value)[0];
        };

        expect(tope(true)).toBeLessThan(tope(false));
    });

    it('y llega AL FINAL del recorrido, no antes', () => {
        /*
         * Abriendo, el tope suena al 72 % del camino: el cajón sale y se detiene
         * solo. Cerrando suena al 98 %, porque ahí hay un marco esperando y el
         * cajón no se frena — choca. Es lo que hace que uno suene a apertura y
         * el otro a cierre con la misma madera.
         */
        const g = ensureAudio()!;

        const cuando = (closing: boolean) => {
            const antes = lastContext()!.created.length;
            drawer(g, { closing }, azar(9));
            const fuentes = nuevos(antes);
            const madera = fuentes.find((n) => n.kind === 'bufferSource')!;
            const golpe = fuentes.find((n) => n.kind === 'oscillator')!;

            // Cuánto del recorrido de la madera llevaba cuando llegó el tope.
            return (golpe.started! - madera.started!) / (madera.stopped! - madera.started!);
        };

        expect(cuando(true)).toBeGreaterThan(cuando(false));
    });
});
