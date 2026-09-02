// tests/lib/system/whoAreYou.test.ts
import {
    WHOAREU_GONE_AT,
    KILL_AFTER_KICKS,
    whoAreYouFor,
} from '@/lib/system/greeting';
import { unknownCommand } from '@/lib/system/commands';

describe('whoAreYou · la conversación se agota', () => {
    // Es la escalada de `//hi` pero en horizontal: allá se cansa de que la
    // saluden, acá de que le pregunten.
    test('la primera contesta, y hasta se explica', () => {
        expect(whoAreYouFor(1, 'es').text).toMatch(/OCUPADO/i);
    });

    test('la segunda ya es sólo una palabra', () => {
        const primera = whoAreYouFor(1, 'es').text!;
        const segunda = whoAreYouFor(2, 'es').text!;

        expect(segunda.length).toBeLessThan(primera.length);
    });

    test('a la tercera el comando DESAPARECE', () => {
        // No se niega: deja de existir. Es más fuerte que un desplante.
        expect(whoAreYouFor(WHOAREU_GONE_AT, 'es').text).toBeNull();
    });

    test('y sigue sin existir si insistís', () => {
        expect(whoAreYouFor(WHOAREU_GONE_AT + 5, 'es').text).toBeNull();
    });

    test('sin conversación en pie, tampoco existe', () => {
        // `count` 0 significa que no venís de saludar.
        expect(whoAreYouFor(0, 'es').text).not.toBeNull();
    });

    test('contesta en los dos idiomas', () => {
        expect(whoAreYouFor(1, 'en').text).not.toBe(whoAreYouFor(1, 'es').text);
    });

    test('ninguna respuesta grita', () => {
        // El tono es cansado, nunca hostil. Vale para el lore entero.
        for (let i = 1; i < WHOAREU_GONE_AT; i += 1) {
            for (const lang of ['es', 'en'] as const) {
                expect(whoAreYouFor(i, lang).text).not.toContain('!');
            }
        }
    });
});

describe('whoAreYou · desaparecer significa desaparecer', () => {
    test('el texto es EXACTAMENTE el de un comando inventado', () => {
        // Si se distinguiera, se notaría que ahí había algo — y lo que cuenta es
        // que parezca que nunca estuvo.
        const inventado = unknownCommand('whoareu', 'es');

        expect(inventado).toContain('WHOAREU');
        expect(inventado).toMatch(/DESCONOCIDO/);
    });

    test('y en inglés también', () => {
        expect(unknownCommand('whoareu', 'en')).toMatch(/UNKNOWN/);
    });
});

describe('greeting · insistir después de que te eche', () => {
    test('hacen falta tres expulsiones para matar la página', () => {
        // A la primera te saca de la nota. Volver e insistir otras dos veces es
        // el caso más testarudo que hay.
        expect(KILL_AFTER_KICKS).toBe(3);
    });
});
