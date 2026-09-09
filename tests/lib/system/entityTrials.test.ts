// tests/lib/system/entityTrials.test.ts

/**
 * QUÉ TRAMPA TOCA.
 *
 * Función pura sobre una tabla: dónde está el ente, qué recuerda, y qué sabe la
 * app. No lee almacenamiento ni escribe nada, igual que `phaseAfter`.
 *
 * ⚠ EL TEST QUE MANDA ACÁ ES EL ÚLTIMO. Ninguna combinación puede dejar a
 * `hablando` inalcanzable: una trampa que te encierra no es una trampa, es un
 * callejón — y de los que no dan ningún error.
 */

import {
    lieGoneStale,
    MIDE_A_LOS,
    OFRECE_A_LOS,
    RETA_A_LOS,
    TRAGADA_A_LOS,
    trialDue,
    wordIsRight,
    type TrialWorld,
} from '@/lib/system/entityTrials';
import type { EntityPhase, EntitySnapshot } from '@/lib/system/entity';

const mundo = (parcial: Partial<TrialWorld> = {}): TrialWorld => ({
    word: 'NIDO',
    ...parcial,
});

const en = (
    phase: EntityPhase,
    exchanges: number,
    extra: Partial<EntitySnapshot> = {}
): EntitySnapshot => ({ phase, exchanges, ...extra });

describe('antes de burlón no hay trampas', () => {
    it('dormido y receloso no miden a nadie', () => {
        expect(trialDue(en('dormido', 9), mundo())).toBeNull();
        expect(trialDue(en('receloso', 9), mundo())).toBeNull();
    });
});

describe('en burlón te mide', () => {
    it('no de entrada: primero deja que te acomodes', () => {
        // Soltar la pregunta en la primera frase la convierte en un formulario.
        expect(trialDue(en('burlon', 0), mundo())).toBeNull();
    });

    it('pero al rato pregunta con qué palabra entraste', () => {
        expect(trialDue(en('burlon', MIDE_A_LOS), mundo())).toBe('word');
    });

    it('y si nunca entraste, no puede preguntarlo: miente en su lugar', () => {
        // Es la única pregunta cuya respuesta el sistema conoce. Sin palabra
        // guardada no hay nada que comprobar, y preguntarla sería un farol.
        expect(trialDue(en('burlon', MIDE_A_LOS), mundo({ word: null }))).toBe('lie');
    });

    it('no repite la mentira mientras siga en pie', () => {
        // Decirla dos veces la delata como guion, no como afirmación.
        expect(
            trialDue(en('burlon', MIDE_A_LOS, { lieStanding: true }), mundo({ word: null }))
        ).toBeNull();
    });
});

describe('en hablando ya no mide: juega', () => {
    it('ofrece limpiarlo todo', () => {
        expect(trialDue(en('hablando', OFRECE_A_LOS), mundo())).toBe('offer');
    });

    it('y más tarde te reta al reset', () => {
        expect(trialDue(en('hablando', RETA_A_LOS), mundo())).toBe('dare');
    });

    it('pero no te reta dos veces', () => {
        expect(trialDue(en('hablando', RETA_A_LOS, { dared: true }), mundo())).toBeNull();
    });
});

describe('la palabra se comprueba', () => {
    it('sin importar mayúsculas ni espacios', () => {
        // Se descifra del morse a mano y se teclea como salga. Exigir la forma
        // exacta castigaría el descifrado, que ya costó, en vez de entenderlo.
        expect(wordIsRight('  nido ', 'NIDO')).toBe(true);
        expect(wordIsRight('NIDO', 'NIDO')).toBe(true);
    });

    it('y una mal es una mal', () => {
        expect(wordIsRight('casa', 'NIDO')).toBe(false);
    });

    it('sin palabra guardada nada acierta', () => {
        // Si no hay nada que comprobar, no se puede acertar por accidente.
        expect(wordIsRight('nido', null)).toBe(false);
        expect(wordIsRight('', null)).toBe(false);
    });
});

describe('la mentira sólo caduca si queda otra puerta', () => {
    it('con palabra guardada, dejarla pasar la cierra', () => {
        // Queda la pregunta, así que cerrarla no encierra a nadie.
        expect(
            lieGoneStale(en('burlon', TRAGADA_A_LOS, { lieStanding: true }), mundo())
        ).toBe(true);
    });

    it('sin palabra, no caduca nunca', () => {
        /*
         * Es el único camino a `hablando`. Darla por tragada obligaba a volver
         * a decirla para no encerrarte, y repetir una afirmación dos frases
         * después lo delata como un guion en bucle. Se queda en pie esperando.
         */
        expect(
            lieGoneStale(en('burlon', 99, { lieStanding: true }), mundo({ word: null }))
        ).toBe(false);
    });

    it('y una que no está en pie no caduca', () => {
        expect(lieGoneStale(en('burlon', 99), mundo())).toBe(false);
    });
});

describe('⚠ NINGUNA COMBINACIÓN TE ENCIERRA', () => {
    it('siempre queda una puerta a hablando, pase lo que pase', () => {
        /*
         * Las dos puertas a `hablando` son la pregunta y la mentira. Si las dos
         * pudieran cerrarse a la vez —te tragaste la mentira Y nunca entraste a
         * la v0.2— el juego se quedaría sin final, y el peor fallo posible es
         * el que no da ningún error.
         */
        for (const word of ['NIDO', null]) {
            for (const tragada of [false, true]) {
                const toca = trialDue(
                    en('burlon', MIDE_A_LOS, tragada ? { lieSwallowed: true } : {}),
                    mundo({ word })
                );

                expect(['word', 'lie']).toContain(toca);
            }
        }
    });

    it('y sin palabra Y con la mentira tragada, la vuelve a decir', () => {
        // Es el único caso donde tiene que desdecirse de sí mismo, y es
        // preferible a dejar a alguien encerrado para siempre.
        expect(
            trialDue(en('burlon', MIDE_A_LOS, { lieSwallowed: true }), mundo({ word: null }))
        ).toBe('lie');
    });
});
