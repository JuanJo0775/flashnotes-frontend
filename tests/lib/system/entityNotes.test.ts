// tests/lib/system/entityNotes.test.ts

/**
 * LO QUE TE DEJA CUANDO NO ESTÁS.
 *
 * Función pura sobre una tabla, como `trialDue`: recibe dónde está el ente, qué
 * ya dejó y cuánto llevabas sin venir, y dice qué toca.
 *
 * ⚠ LO FALSO TIENE QUE SER COMPROBABLE. Igual que su mentira hablada: si lo que
 * dice en una nota no se puede desmentir, no es una trampa, es una app rota.
 */

import {
    LEFT_TITLE,
    leftNoteText,
    noteDue,
    type LeftNote,
    type NoteWorld,
} from '@/lib/system/entityNotes';
import { AWAY_ENOUGH } from '@/lib/system/entity';
import type { EntityPhase, EntitySnapshot } from '@/lib/system/entity';

const TODAS: readonly LeftNote[] = ['falsa', 'broma', 'vuelta'];
const LENGUAS = ['es', 'en'] as const;

const mundo = (parcial: Partial<NoteWorld> = {}): NoteWorld => ({
    awayMs: 0,
    ...parcial,
});

const en = (
    phase: EntityPhase,
    extra: Partial<EntitySnapshot> = {}
): EntitySnapshot => ({ phase, exchanges: 0, ...extra });

describe('mientras no lo conozcas, no deja nada', () => {
    it('la fachada no escribe notas', () => {
        // Dormido no existe, y receloso apenas te contesta: que ya te dejara
        // cosas escritas se adelantaría a lo que él es en ese tramo.
        expect(noteDue(en('dormido'), mundo())).toBeNull();
        expect(noteDue(en('receloso'), mundo())).toBeNull();
    });

    it('ni siquiera aunque vuelvas al día siguiente', () => {
        expect(
            noteDue(en('dormido'), mundo({ awayMs: AWAY_ENOUGH * 2 }))
        ).toBeNull();
    });
});

describe('la nota del día siguiente', () => {
    it('sale al volver tras una ausencia de verdad', () => {
        expect(noteDue(en('burlon'), mundo({ awayMs: AWAY_ENOUGH + 1 }))).toBe(
            'vuelta'
        );
    });

    it('y no por irse un rato', () => {
        expect(noteDue(en('burlon'), mundo({ awayMs: 60_000 }))).not.toBe(
            'vuelta'
        );
    });

    it('gana a las demás: es lo primero que ve al volver', () => {
        // Volvés y hay algo esperándote. Que ese momento lo ocupe otra nota
        // desperdicia lo único que él no puede fingir.
        expect(
            noteDue(
                en('hablando', { leftFalsa: true }),
                mundo({ awayMs: AWAY_ENOUGH + 1 })
            )
        ).toBe('vuelta');
    });

    it('pero sólo una vez', () => {
        expect(
            noteDue(
                en('burlon', { leftVuelta: true }),
                mundo({ awayMs: AWAY_ENOUGH + 1 })
            )
        ).not.toBe('vuelta');
    });
});

describe('la nota falsa', () => {
    it('la deja en burlón', () => {
        expect(noteDue(en('burlon'), mundo())).toBe('falsa');
    });

    it('y no la repite', () => {
        expect(noteDue(en('burlon', { leftFalsa: true }), mundo())).not.toBe(
            'falsa'
        );
    });

    it('⚠ y lo que afirma se puede comprobar', () => {
        /*
         * Dice que `//panic` repara la integridad, y `//panic` hace justo lo
         * contrario: provoca el colapso (§13). Quien le haga caso lo descubre
         * en el acto, que es lo que la hace una trampa y no un fallo.
         *
         * Es la misma regla que su mentira hablada: se eligió algo que el juego
         * YA PODÍA desmentir.
         */
        for (const lang of LENGUAS) {
            expect(leftNoteText('falsa', lang)).toContain('//panic');
        }
    });
});

describe('la broma', () => {
    it('llega después de la falsa', () => {
        expect(noteDue(en('hablando', { leftFalsa: true }), mundo())).toBe(
            'broma'
        );
    });

    it('te manda a buscar algo sin avisar de que no está', () => {
        // Si la nota misma dijera que es broma, no habría broma.
        for (const lang of LENGUAS) {
            expect(leftNoteText('broma', lang)).not.toMatch(
                /broma|joke|mentira|kidding/i
            );
        }
    });
});

describe('cuando ya las dejó todas, para', () => {
    it('no inventa una cuarta', () => {
        expect(
            noteDue(
                en('hablando', {
                    leftFalsa: true,
                    leftBroma: true,
                    leftVuelta: true,
                }),
                mundo({ awayMs: AWAY_ENOUGH + 1 })
            )
        ).toBeNull();
    });
});

describe('todas suenan a él', () => {
    it('en minúsculas y en los dos idiomas, sin calcar', () => {
        for (const k of TODAS) {
            for (const lang of LENGUAS) {
                const texto = leftNoteText(k, lang);
                expect(texto).toBeTruthy();
                expect(texto).toBe(texto.toLowerCase());
            }
            expect(leftNoteText(k, 'es')).not.toBe(leftNoteText(k, 'en'));
        }
    });

    it('y te hablan de vos, nunca de usted', () => {
        const USTED = /\busted(es)?\b|\bsigue\s|\bpuede\s|\bsabe\s|\bmire\b/;
        for (const k of TODAS) {
            expect(leftNoteText(k, 'es')).not.toMatch(USTED);
        }
    });
});

describe('los títulos', () => {
    it('existen en los dos idiomas', () => {
        for (const k of TODAS) {
            for (const lang of LENGUAS) {
                expect(LEFT_TITLE[k][lang]).toBeTruthy();
            }
        }
    });

    it('⚠ y NO llevan su nombre: él no firma', () => {
        // Una nota firmada es un mensaje. Sin firmar es algo que apareció, y
        // eso es mucho peor de encontrarse en la papelera.
        for (const k of TODAS) {
            for (const lang of LENGUAS) {
                expect(LEFT_TITLE[k][lang]).not.toMatch(/ente|entity/i);
            }
        }
    });
});
