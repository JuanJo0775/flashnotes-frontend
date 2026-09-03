// tests/lib/system/lockoutPuzzle.test.ts
import {
    DUMP_COLS,
    DUMP_ROWS,
    PATTERN_LEN,
    buildDump,
    isTheOddOne,
} from '@/lib/system/lockoutPuzzle';

describe('lockoutPuzzle - el volcado', () => {
    test('tiene la forma de un volcado de memoria', () => {
        const dump = buildDump(() => 0.5);

        expect(dump.cells).toHaveLength(DUMP_ROWS * DUMP_COLS);
        for (const c of dump.cells) expect(c).toMatch(/^[0-9A-F]{2}$/);
    });

    test('casi todo se repite: es un patrón, no ruido', () => {
        // Si fuera aleatorio no habría nada que encontrar. La gracia es que el
        // ojo vea la repetición y la rompa una sola celda.
        const dump = buildDump(() => 0.5);
        const distintos = new Set(dump.cells);

        expect(distintos.size).toBeLessThanOrEqual(dump.pattern.length + 1);
    });

    test('exactamente una celda rompe el patrón', () => {
        const dump = buildDump(() => 0.5);

        const rotas = dump.cells.filter(
            (c, i) => c !== dump.pattern[i % dump.pattern.length]
        );

        expect(rotas).toHaveLength(1);
    });

    test('la celda rota está donde dice el índice', () => {
        const dump = buildDump(() => 0.5);
        const i = dump.oddIndex;

        expect(dump.cells[i]).not.toBe(dump.pattern[i % dump.pattern.length]);
    });

    test('no cae siempre en el mismo sitio', () => {
        const a = buildDump(() => 0.1);
        const b = buildDump(() => 0.9);

        expect(a.oddIndex).not.toBe(b.oddIndex);
    });

    test('nunca cae en la primera celda', () => {
        // Con el patrón sin establecer todavía, la primera no se puede ver como
        // rota: no hay nada con lo que compararla.
        const a = buildDump(() => 0);

        expect(a.oddIndex).toBeGreaterThan(0);
    });
});

describe('lockoutPuzzle - resolverlo', () => {
    test('acertar la celda rota lo resuelve', () => {
        const dump = buildDump(() => 0.5);

        expect(isTheOddOne(dump, dump.oddIndex)).toBe(true);
    });

    test('cualquier otra celda no', () => {
        const dump = buildDump(() => 0.5);
        const otra = dump.oddIndex === 0 ? 1 : dump.oddIndex - 1;

        expect(isTheOddOne(dump, otra)).toBe(false);
    });

    test('un índice fuera de rango no lo resuelve', () => {
        const dump = buildDump(() => 0.5);

        expect(isTheOddOne(dump, -1)).toBe(false);
        expect(isTheOddOne(dump, dump.cells.length)).toBe(false);
    });
});

describe('lockoutPuzzle - errar cambia el puzzle', () => {
    // Si el volcado no cambiara, errar sólo tacharía una celda y el puzzle se
    // resolvería por descarte. Cambiándolo, cada intento vuelve a ser una
    // búsqueda — y con la aberración encima, una búsqueda que cuesta.
    test('dos volcados seguidos no son el mismo', () => {
        const a = buildDump();
        const b = buildDump();

        expect(a.cells.join('')).not.toBe(b.cells.join(''));
    });

    test('el patrón también cambia, no sólo la celda rota', () => {
        const patrones = new Set(
            Array.from({ length: 12 }, () => buildDump().pattern.join(''))
        );

        expect(patrones.size).toBeGreaterThan(1);
    });

    test('cada volcado nuevo sigue teniendo exactamente una celda rota', () => {
        for (let i = 0; i < 12; i += 1) {
            const d = buildDump();
            const rotas = d.cells.filter(
                (c, j) => c !== d.pattern[j % d.pattern.length]
            );
            expect(rotas).toHaveLength(1);
        }
    });
});

describe('lockoutPuzzle · por qué cuesta encontrarlo', () => {
    // Con patrón de 5 bytes y 10 columnas, la repetición caía en COLUMNAS
    // PERFECTAS: cada columna mostraba siempre el mismo byte y la celda rota
    // saltaba a la vista sin buscarla. El puzzle se resolvía de un vistazo.
    test('el patrón es primo con el ancho de la rejilla', () => {
        const mcd = (a: number, b: number): number => (b === 0 ? a : mcd(b, a % b));

        expect(mcd(PATTERN_LEN, DUMP_COLS)).toBe(1);
    });

    test('así ninguna columna repite siempre el mismo byte', () => {
        const { cells } = buildDump(() => 0.5);

        const columnaConstante = Array.from({ length: DUMP_COLS }, (_, c) =>
            Array.from({ length: DUMP_ROWS }, (_, f) => cells[f * DUMP_COLS + c])
        ).some((col) => new Set(col).size === 1);

        expect(columnaConstante).toBe(false);
    });

    test('la celda rota se parece a la que le tocaba', () => {
        // Un byte al azar cantaba demasiado. Cambiando UN dígito hexadecimal
        // sigue siendo hallable —el patrón está entero alrededor— pero hay que
        // mirar de verdad.
        for (let i = 0; i < 50; i += 1) {
            const dump = buildDump(() => (i * 0.019) % 1);
            const tocaba = dump.pattern[dump.oddIndex % PATTERN_LEN];
            const roto = dump.cells[dump.oddIndex];

            const distintos = [...roto].filter((c, j) => c !== tocaba[j]).length;
            expect(distintos).toBe(1);
        }
    });

    test('pero sigue sin coincidir con ningún byte del patrón', () => {
        // Si coincidiera, se leería como parte de la repetición y el puzzle no
        // tendría solución visible. Difícil no es lo mismo que imposible.
        for (let i = 0; i < 50; i += 1) {
            const dump = buildDump(() => (i * 0.019) % 1);

            expect(dump.pattern).not.toContain(dump.cells[dump.oddIndex]);
        }
    });

    test('siempre hay exactamente una celda fuera de sitio', () => {
        for (let i = 0; i < 50; i += 1) {
            const dump = buildDump(() => (i * 0.019) % 1);

            const fuera = dump.cells.filter(
                (c, idx) => c !== dump.pattern[idx % PATTERN_LEN]
            );

            expect(fuera).toHaveLength(1);
        }
    });
});
