// tests/lib/system/entityPidiendo.test.ts

/**
 * `pidiendo` ERA UNA FASE QUE EXISTÍA Y NO ALCANZABA NADIE.
 *
 * Estaba en el tipo, estaba en las puertas de los favores —`favorDue` y
 * `willingNow` la aceptan— y no había una sola línea que la pusiera. El arco
 * entero pasaba de `hablando` al final sin nombrar nunca el tramo en el que te
 * pide cosas.
 *
 * ⚠ Y SI ALGUIEN LA HUBIERA PUESTO, ÉL SE HABRÍA QUEDADO MUDO. Sin fila en el
 * repertorio, `entityReply` devuelve `null` y todas sus preguntas pasan a
 * «comando desconocido»: la fase existía justo lo suficiente para romper el
 * juego el día que se usara. Salió en una auditoría.
 */

import { entityReply, QUESTIONS } from '@/lib/system/entityVoice';

const LENGUAS = ['es', 'en'] as const;

describe('la fase existe de verdad', () => {
    it('⚠ contesta a todo lo que contesta `hablando`', () => {
        // No es un atajo compartir el repertorio: es lo que esa fase ES. Lo que
        // cambia cuando empieza a pedir no es su voz —sigue siendo él— sino que
        // ADEMÁS quiere algo.
        for (const q of QUESTIONS) {
            const hablando = entityReply(q, 'hablando', 0, 'es');
            if (hablando === null) continue;

            expect(entityReply(q, 'pidiendo', 0, 'es')).toBe(hablando);
        }
    });

    it('y en los dos idiomas', () => {
        for (const lang of LENGUAS) {
            expect(entityReply('who', 'pidiendo', 0, lang)).toBeTruthy();
        }
    });

    it('⚠ y NO se queda muda, que es lo que habría pasado', () => {
        /*
         * Ésta es la que importa: si la fila no estuviera, esto devolvería
         * `null` y quien llegara a pedir favores dejaría de poder hablarle.
         */
        const mudas = QUESTIONS.filter(
            (q) =>
                entityReply(q, 'hablando', 0, 'es') !== null &&
                entityReply(q, 'pidiendo', 0, 'es') === null
        );

        expect(mudas).toEqual([]);
    });

    it('avanza igual que `hablando` a lo largo del repertorio', () => {
        // El índice es cuántos intercambios llevás dentro de la fase: si una
        // avanzara y la otra no, cruzar a `pidiendo` reiniciaría lo que dice.
        for (let i = 0; i < 4; i += 1) {
            expect(entityReply('who', 'pidiendo', i, 'es')).toBe(
                entityReply('who', 'hablando', i, 'es')
            );
        }
    });
});
