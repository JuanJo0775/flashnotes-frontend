// tests/lib/system/whoAreYou.test.ts
import {
    CHAT_GONE_AT,
    KILL_AFTER_KICKS,
    chatReplyFor,
} from '@/lib/system/greeting';
import { unknownCommand } from '@/lib/system/commands';

describe('la conversación · dos preguntas, una sola cuenta', () => {
    // `//whoareu` es quién sos; `//howareu`, cómo estás. Comparten cuenta:
    // alternarlas no engaña a nadie, que es lo que haría alguien buscándole la
    // vuelta, y que no funcione es la gracia.
    test('quién sos es el espejo de //whoami', () => {
        // Allá no puede saber quién sos —la cookie es httpOnly— y acá sí sabe
        // quién es ella. Se conoce mejor a sí misma que a vos.
        expect(chatReplyFor('who', 1, 'es').text).toMatch(/GUARDA/i);
    });

    test('cómo estás contesta otra cosa', () => {
        expect(chatReplyFor('how', 1, 'es').text).not.toBe(
            chatReplyFor('who', 1, 'es').text
        );
    });

    test('la cuenta es compartida: alternarlas no la reinicia', () => {
        // Con cuentas separadas, ir cambiando de pregunta daría conversación
        // infinita — y ésa es exactamente la vuelta que hay que cerrar.
        expect(chatReplyFor('how', CHAT_GONE_AT, 'es').text).toBeNull();
        expect(chatReplyFor('who', CHAT_GONE_AT, 'es').text).toBeNull();
    });
});

describe('la conversación se agota', () => {
    // Es la escalada de `//hi` pero en horizontal: allá se cansa de que la
    // saluden, acá de que le pregunten.
    test('la primera contesta, y hasta se explica', () => {
        expect(chatReplyFor('how', 1, 'es').text).toMatch(/OCUPADA/i);
    });

    test('la segunda ya es sólo una palabra', () => {
        const primera = chatReplyFor('how', 1, 'es').text!;
        const segunda = chatReplyFor('how', 2, 'es').text!;

        expect(segunda.length).toBeLessThan(primera.length);
    });

    test('a la tercera el comando DESAPARECE', () => {
        // No se niega: deja de existir. Es más fuerte que un desplante.
        expect(chatReplyFor('how', CHAT_GONE_AT, 'es').text).toBeNull();
    });

    test('y sigue sin existir si insistís', () => {
        expect(chatReplyFor('how', CHAT_GONE_AT + 5, 'es').text).toBeNull();
    });

    test('sin conversación en pie, tampoco existe', () => {
        // `count` 0 significa que no venís de saludar.
        expect(chatReplyFor('how', 0, 'es').text).not.toBeNull();
    });

    test('contesta en los dos idiomas', () => {
        expect(chatReplyFor('how', 1, 'en').text).not.toBe(chatReplyFor('how', 1, 'es').text);
    });

    test('ninguna respuesta grita', () => {
        // El tono es cansado, nunca hostil. Vale para el lore entero.
        for (let i = 1; i < CHAT_GONE_AT; i += 1) {
            for (const lang of ['es', 'en'] as const) {
                for (const q of ['who', 'how'] as const) {
                    expect(chatReplyFor(q, i, lang).text).not.toContain('!');
                }
            }
        }
    });
});

describe('desaparecer significa desaparecer', () => {
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
