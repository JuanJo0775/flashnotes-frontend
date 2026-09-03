// tests/lib/system/replyTiming.test.ts
import {
    HOLD_LONG_MS,
    LONG_REPLY_LINES,
    isLongReply,
    replyTimings,
} from '@/lib/system/replyTiming';

const lineas = (n: number) => Array.from({ length: n }, (_, i) => `L${i}`).join('\n');

describe('replyTiming · qué respuesta es larga', () => {
    test('una línea no lo es', () => {
        expect(isLongReply('HOLA')).toBe(false);
    });

    test('justo en el umbral tampoco', () => {
        expect(isLongReply(lineas(LONG_REPLY_LINES))).toBe(false);
    });

    test('una más ya lo es', () => {
        expect(isLongReply(lineas(LONG_REPLY_LINES + 1))).toBe(true);
    });
});

describe('replyTiming · el tecleo no se hace eterno', () => {
    // Con 18 ms fijos por carácter, `//help` tardaba ocho segundos en aparecer.
    test('el tecleo entero cabe en poco más de un segundo', () => {
        const texto = 'X'.repeat(600);
        const { typeMs } = replyTimings(texto);

        expect(typeMs * texto.length).toBeLessThan(1500);
    });

    test('una respuesta corta se teclea a ritmo de terminal', () => {
        // Sin mínimo, «OK» aparecería de golpe y no se leería como tecleado.
        expect(replyTimings('OK').typeMs).toBeGreaterThan(10);
    });

    test('borrarla también es rápido', () => {
        const texto = 'X'.repeat(600);
        const { eraseMs } = replyTimings(texto);

        expect(eraseMs * texto.length).toBeLessThan(1000);
    });
});

describe('replyTiming · cuánto se queda', () => {
    test('una respuesta larga aguanta lo suficiente para desplazarla', () => {
        expect(replyTimings(lineas(20)).holdMs).toBe(HOLD_LONG_MS);
    });

    test('y una corta no se queda ahí molestando', () => {
        expect(replyTimings('OK').holdMs).toBeLessThan(HOLD_LONG_MS);
    });

    test('la larga se queda bastante más que la corta', () => {
        expect(replyTimings(lineas(20)).holdMs).toBeGreaterThan(
            replyTimings('OK').holdMs * 3
        );
    });

    test('pero TODAS se van solas: ninguna se queda para siempre', () => {
        // Que la terminal se limpie y deje la nota en blanco es parte de cómo se
        // siente. Una respuesta que hay que cerrar a mano es una molestia.
        for (const texto of ['OK', lineas(3), lineas(40)]) {
            expect(Number.isFinite(replyTimings(texto).holdMs)).toBe(true);
        }
    });
});
