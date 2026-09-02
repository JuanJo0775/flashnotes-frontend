// tests/lib/system/greeting.test.ts
import {
    GREETING_WINDOW_MS,
    KICK_AT,
    greetingFor,
    countGreeting,
} from '@/lib/system/greeting';

/** Azar clavado, para que el reparto no dependa del dado. */
const PRIMERO = () => 0;
const ULTIMO = () => 0.999;

describe('greeting · la cuenta y su ventana', () => {
    test('el primer saludo es el uno', () => {
        expect(countGreeting(0, null, 1000)).toBe(1);
    });

    test('saludar seguido suma', () => {
        expect(countGreeting(3, 1000, 2000)).toBe(4);
    });

    test('pasada la ventana, la cuenta vuelve a empezar', () => {
        // Volver mañana no es insistir. La escalada castiga la insistencia,
        // no el uso.
        expect(countGreeting(7, 1000, 1000 + GREETING_WINDOW_MS + 1)).toBe(1);
    });

    test('justo dentro de la ventana, sigue contando', () => {
        expect(countGreeting(7, 1000, 1000 + GREETING_WINDOW_MS - 1)).toBe(8);
    });

    test('la ventana se mide desde el ÚLTIMO saludo, no desde el primero', () => {
        // Deslizante: si contara desde el primero, alguien saludando despacio
        // durante horas acabaría echado sin haber insistido nunca.
        const primero = countGreeting(0, null, 0);
        const segundo = countGreeting(primero, 0, GREETING_WINDOW_MS - 1);
        const tercero = countGreeting(
            segundo,
            GREETING_WINDOW_MS - 1,
            2 * GREETING_WINDOW_MS - 2
        );

        expect(tercero).toBe(3);
    });
});

describe('greeting · la escalada', () => {
    test('el primero saluda de verdad', () => {
        const r = greetingFor(1, 'es', PRIMERO);

        expect(r.text.length).toBeGreaterThan(3);
        expect(r.kick).toBe(false);
    });

    test('los primeros no repiten siempre lo mismo', () => {
        // Si el saludo fuera fijo, la segunda vez ya no sería un saludo.
        expect(greetingFor(1, 'es', PRIMERO).text).not.toBe(
            greetingFor(1, 'es', ULTIMO).text
        );
    });

    test('a la tercera se vuelve seco', () => {
        const calido = greetingFor(1, 'es', PRIMERO).text;
        const seco = greetingFor(3, 'es', PRIMERO).text;

        expect(seco).not.toBe(calido);
        expect(seco.length).toBeLessThan(calido.length);
    });

    test('a la quinta pide que lo dejes trabajar', () => {
        expect(greetingFor(5, 'es', PRIMERO).text).toMatch(/TRABAJAR|DEJE/i);
    });

    test('a la séptima ya no contesta, sólo puntos', () => {
        expect(greetingFor(7, 'es', PRIMERO).text).toBe('...');
    });

    test('a la octava te saca de la nota', () => {
        const r = greetingFor(KICK_AT, 'es', PRIMERO);

        expect(r.kick).toBe(true);
    });

    test('y lo dice antes de hacerlo', () => {
        // Echarte sin decir nada se leería como que la app se colgó.
        expect(greetingFor(KICK_AT, 'es', PRIMERO).text.length).toBeGreaterThan(0);
    });

    test('pasado el límite sigue echándote', () => {
        expect(greetingFor(KICK_AT + 5, 'es', PRIMERO).kick).toBe(true);
    });

    test('antes del límite no echa a nadie', () => {
        for (let i = 1; i < KICK_AT; i += 1) {
            expect(greetingFor(i, 'es', PRIMERO).kick).toBe(false);
        }
    });
});

describe('greeting · los dos idiomas', () => {
    test('contesta distinto en cada idioma', () => {
        expect(greetingFor(1, 'es', PRIMERO).text).not.toBe(
            greetingFor(1, 'en', PRIMERO).text
        );
    });

    test('en inglés también pide que lo dejen trabajar', () => {
        expect(greetingFor(5, 'en', PRIMERO).text).toMatch(/WORK|LET ME/i);
    });

    test('los puntos son los mismos en los dos idiomas', () => {
        // No es una frase, es la ausencia de una.
        expect(greetingFor(7, 'en', PRIMERO).text).toBe('...');
    });

    test('echa en los dos idiomas', () => {
        expect(greetingFor(KICK_AT, 'en', PRIMERO).kick).toBe(true);
    });
});

describe('greeting · el tono', () => {
    // La máquina está cansada, no es hostil. Si un texto suena a amenaza, está
    // mal escrito — vale para el lore entero.
    test('nunca grita con signos de exclamación', () => {
        for (let i = 1; i <= KICK_AT + 1; i += 1) {
            for (const lang of ['es', 'en'] as const) {
                for (const random of [PRIMERO, ULTIMO]) {
                    expect(greetingFor(i, lang, random).text).not.toContain('!');
                }
            }
        }
    });

    test('todo va en mayúsculas, como el resto del sistema', () => {
        for (let i = 1; i <= KICK_AT; i += 1) {
            const { text } = greetingFor(i, 'es', PRIMERO);
            expect(text).toBe(text.toUpperCase());
        }
    });
});
