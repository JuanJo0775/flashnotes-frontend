// tests/lib/system/entityVariants.test.ts

/**
 * LA LIMITACIÓN ES EL PERSONAJE.
 *
 * No es una IA: es algo encerrado que intenta comunicarse con el único canal que
 * tiene. Reconoce un puñado de variantes de cada pregunta —porque lo intenta— y
 * nada más. Si entendiera cualquier cosa dejaría de estar atrapado.
 */

import { entityQuestionOf, UNDERSCORE_HINT } from '@/lib/system/entityVoice';

describe('reconoce variantes de la misma pregunta', () => {
    it('las de «quién sos»', () => {
        for (const v of ['whoareu', 'who', 'quien', 'quien_eres', 'quienes']) {
            expect(entityQuestionOf(v)).toBe('who');
        }
    });

    it('las de «cómo estás»', () => {
        for (const v of ['howareu', 'how', 'como', 'como_estas', 'comoestas']) {
            expect(entityQuestionOf(v)).toBe('how');
        }
    });

    it('sin importar mayúsculas', () => {
        expect(entityQuestionOf('WhoAreU')).toBe('who');
    });
});

describe('pero el repertorio es CERRADO', () => {
    it('lo que no está, no está', () => {
        // Si entendiera cualquier cosa dejaría de estar atrapado.
        for (const v of ['hola', 'ayuda', 'que_hora_es', '']) {
            expect(entityQuestionOf(v)).toBeNull();
        }
    });
});

describe('el guión bajo', () => {
    it('la pista existe en los dos idiomas y no es la misma frase', () => {
        expect(UNDERSCORE_HINT.es).toBeTruthy();
        expect(UNDERSCORE_HINT.en).toBeTruthy();
        expect(UNDERSCORE_HINT.es).not.toBe(UNDERSCORE_HINT.en);
    });

    it('deja ver el `_` sin dar una orden', () => {
        // Una máquina que te corrige es un tutorial. Ésta se delata: se le
        // escapa que los espacios no le llegan.
        for (const texto of [UNDERSCORE_HINT.es, UNDERSCORE_HINT.en]) {
            expect(texto).toContain('_');
            expect(texto).toBe(texto.toLowerCase());
            expect(texto).not.toMatch(/escrib|teclea|use |type |write /i);
        }
    });
});
