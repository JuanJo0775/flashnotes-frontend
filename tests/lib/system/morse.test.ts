// tests/lib/system/morse.test.ts
import {
    MORSE,
    WORDS,
    forgetWord,
    isSessionWord,
    sessionMorse,
    sessionWord,
    toMorse,
} from '@/lib/system/morse';

beforeEach(() => forgetWord());

describe('morse · el alfabeto', () => {
    test('sólo puntos y rayas', () => {
        // Si se colara otro carácter, el código dejaría de leerse como una hora
        // rota y pasaría a leerse como un adorno pegado encima.
        for (const codigo of Object.values(MORSE)) {
            expect(codigo).toMatch(/^[.-]+$/);
        }
    });

    test('ninguna letra pasa de tres señales', () => {
        // Con letras de cinco, la palabra entera desbordaba el hueco del reloj.
        for (const codigo of Object.values(MORSE)) {
            expect(codigo.length).toBeLessThanOrEqual(3);
        }
    });

    test('ningún código se repite: sería indescifrable', () => {
        const codigos = Object.values(MORSE);

        expect(new Set(codigos).size).toBe(codigos.length);
    });

    test('son los códigos morse de verdad', () => {
        // Inventarlos haría el puzzle imposible: se descifra con una tabla que
        // cualquiera puede buscar.
        expect(MORSE.E).toBe('.');
        expect(MORSE.T).toBe('-');
        expect(MORSE.S).toBe('...');
        expect(MORSE.O).toBe('---');
        expect(MORSE.A).toBe('.-');
    });
});

describe('morse · las palabras', () => {
    test('todas se pueden escribir con el alfabeto', () => {
        for (const w of WORDS) {
            for (const letra of w) {
                expect(MORSE[letra]).toBeDefined();
            }
        }
    });

    test('ninguna es tan larga como para desbordar el hueco', () => {
        for (const w of WORDS) {
            expect(toMorse(w).length).toBeLessThanOrEqual(28);
        }
    });

    test('hay varias donde elegir', () => {
        expect(WORDS.length).toBeGreaterThanOrEqual(6);
    });

    test('ninguna se repite', () => {
        expect(new Set(WORDS).size).toBe(WORDS.length);
    });
});

describe('morse · codificar', () => {
    test('separa las letras con el dos puntos del reloj', () => {
        expect(toMorse('SOS')).toBe('...:---:...');
    });

    test('no distingue mayúsculas', () => {
        expect(toMorse('sos')).toBe(toMorse('SOS'));
    });

    test('una letra suelta no lleva separador', () => {
        expect(toMorse('E')).toBe('.');
    });
});

describe('morse · la palabra de la sesión', () => {
    test('sale de la lista', () => {
        expect(WORDS).toContain(sessionWord(() => 0));
    });

    test('no cambia dentro de la misma sesión', () => {
        // Si cambiara en cada lectura, mirar el reloj dos veces daría dos
        // códigos y el puzzle no tendría solución.
        const primera = sessionWord(() => 0);

        expect(sessionWord(() => 0.9)).toBe(primera);
    });

    test('el código es el de esa palabra', () => {
        const w = sessionWord(() => 0);

        expect(sessionMorse(() => 0)).toBe(toMorse(w));
    });

    test('olvidada, puede tocar otra', () => {
        const primera = sessionWord(() => 0);
        forgetWord();

        expect(sessionWord(() => 0.99)).not.toBe(primera);
    });

    test('reconoce la palabra tecleada', () => {
        const w = sessionWord(() => 0);

        expect(isSessionWord(w)).toBe(true);
        expect(isSessionWord(w.toLowerCase())).toBe(true);
    });

    test('no reconoce otra cualquiera', () => {
        sessionWord(() => 0);

        expect(isSessionWord('CUALQUIERA')).toBe(false);
    });

    test('sin palabra sorteada, no reconoce nada', () => {
        // Sin esto, teclear cualquier cosa antes de descubrir el código podría
        // colarse por casualidad.
        expect(isSessionWord('MODO')).toBe(false);
    });
});
