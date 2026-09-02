// tests/lib/system/asciiNoise.test.ts
import {
    NOISE_MODES,
    modeForFrame,
    noiseFrame,
    type NoiseMode,
} from '@/lib/system/asciiNoise';

const COLS = 60;
const ROWS = 20;

/** Qué proporción de la rejilla está pintada. */
function densidad(f: string): number {
    const sinSaltos = f.replace(/\n/g, '');
    return [...sinSaltos].filter((c) => c !== ' ').length / sinSaltos.length;
}

/** Los caracteres distintos que usa un fotograma, sin contar el espacio. */
function glifos(f: string): Set<string> {
    return new Set([...f.replace(/\n/g, '')].filter((c) => c !== ' '));
}

describe('asciiNoise - la forma', () => {
    test('devuelve una rejilla del tamaño pedido', () => {
        for (const modo of NOISE_MODES) {
            const f = noiseFrame(COLS, ROWS, 0, modo, () => 0.5);
            const lineas = f.split('\n');

            expect(lineas).toHaveLength(ROWS);
            for (const l of lineas) expect(l).toHaveLength(COLS);
        }
    });

    test('una rejilla vacía no revienta', () => {
        expect(noiseFrame(COLS, 0, 0, 'snow', () => 0.5)).toBe('');
    });

    test('nunca usa letras', () => {
        // Una letra invita a leerla, y el ojo se pone a buscar palabras donde
        // tiene que ver materia.
        for (const modo of NOISE_MODES) {
            const f = noiseFrame(COLS, ROWS, 3, modo, Math.random);
            expect(f).not.toMatch(/[a-zñáéíóú]/i);
        }
    });
});

describe('asciiNoise - cada modo se ve distinto', () => {
    // El problema de la versión anterior era mezclar treinta glifos en cada
    // fotograma: eso da sopa, no señal. Cada modo usa POCOS caracteres, y es lo
    // que le da carácter propio a cada uno.
    test('ningún modo mezcla más de cuatro glifos', () => {
        for (const modo of NOISE_MODES) {
            const f = noiseFrame(COLS, ROWS, 0, modo, Math.random);
            expect(glifos(f).size).toBeLessThanOrEqual(4);
        }
    });

    test('las rayas son densas y de bloque', () => {
        // Cada fila elige UN glifo de los tres, así que exigir que aparezca `█`
        // en un fotograma concreto es una lotería: con trece filas pintadas,
        // fallaba una vez de cada doscientas. Lo que se comprueba es lo que de
        // verdad define al modo — que sea denso y que use SÓLO su repertorio.
        const f = noiseFrame(COLS, ROWS, 0, 'bars', Math.random);

        expect(densidad(f)).toBeGreaterThan(0.3);
        for (const g of glifos(f)) expect('█▓▌').toContain(g);
    });

    test('los puntos son escasos y finos', () => {
        const f = noiseFrame(COLS, ROWS, 0, 'dots', Math.random);

        expect(densidad(f)).toBeLessThan(0.3);
    });

    test('sin señal está casi vacío', () => {
        const f = noiseFrame(COLS, ROWS, 0, 'nosignal', Math.random);

        expect(densidad(f)).toBeLessThan(0.15);
    });

    test('la nieve queda entre medias', () => {
        const nieve = densidad(noiseFrame(COLS, ROWS, 0, 'snow', Math.random));

        expect(nieve).toBeGreaterThan(densidad(noiseFrame(COLS, ROWS, 0, 'dots', Math.random)));
        expect(nieve).toBeLessThan(densidad(noiseFrame(COLS, ROWS, 0, 'bars', Math.random)));
    });
});

describe('asciiNoise - la señal cambia de modo', () => {
    // Una sola textura durante dos segundos se vuelve un patrón. Alternando, se
    // lee como una señal que va buscando engancharse y no lo consigue.
    test('el modo depende del fotograma', () => {
        const vistos = new Set<NoiseMode>();
        for (let f = 0; f < 40; f += 1) vistos.add(modeForFrame(f));

        expect(vistos.size).toBeGreaterThan(2);
    });

    test('un modo aguanta varios fotogramas seguidos', () => {
        // Cambiar cada fotograma sería parpadeo, no textura.
        expect(modeForFrame(0)).toBe(modeForFrame(1));
    });

    test('siempre devuelve un modo del repertorio', () => {
        for (let f = 0; f < 60; f += 1) {
            expect(NOISE_MODES).toContain(modeForFrame(f));
        }
    });
});

describe('asciiNoise - estructura horizontal', () => {
    test('la nieve se lee fila a fila, no como grano parejo', () => {
        const lineas = noiseFrame(80, 30, 0, 'snow', Math.random).split('\n');
        const d = (l: string) => [...l].filter((c) => c !== ' ').length / l.length;
        const ds = lineas.map(d);

        expect(Math.max(...ds) - Math.min(...ds)).toBeGreaterThan(0.2);
    });

    test('las rayas se desplazan con los fotogramas', () => {
        expect(noiseFrame(COLS, ROWS, 0, 'bars', () => 0.5)).not.toBe(
            noiseFrame(COLS, ROWS, 3, 'bars', () => 0.5)
        );
    });
});
