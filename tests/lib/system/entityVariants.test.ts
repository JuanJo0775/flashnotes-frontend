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
    /*
     * ⚠ SON CUATRO POR PREGUNTA: dos en inglés y dos en español. La cuenta la
     * vigila `entityQuestions.test.ts`, que falla con la quinta — este fichero
     * mira que las que hay lleguen. Las dos cosas hacen falta: que sean pocas y
     * que las pocas funcionen.
     *
     * ⚠ ESTA LISTA SE RECORTÓ, y el recorte ES el arreglo. Tenía `quienes`,
     * `como` y `comoestas`, de una época en la que cada forma razonable se iba
     * sumando. Cada una parecía inofensiva; juntas hacían una máquina que te
     * entiende casi siempre, que es exactamente lo que él no es.
     */
    it('las de «quién eres»', () => {
        for (const v of ['whoareu', 'who', 'quien', 'quien_eres']) {
            expect(entityQuestionOf(v)).toBe('who');
        }
    });

    it('las de «cómo estás»', () => {
        for (const v of ['howareu', 'how', 'como_estas', 'que_tal']) {
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
        /*
         * ⚠ `hola` YA NO SIRVE DE EJEMPLO, y el cambio es correcto: desde que
         * el saludo es una de sus preguntas, `hola` es la forma castellana de
         * `hi` — igual que `quien` lo es de `who` y `donde` de `where`. Lo que
         * este test vigila es que el repertorio sea CERRADO, no que una palabra
         * concreta quede fuera para siempre.
         */
        for (const v of ['gracias', 'ayuda', 'que_hora_es', '']) {
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
