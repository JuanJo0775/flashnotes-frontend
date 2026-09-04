// tests/lib/system/entityWilling.test.ts

/**
 * CUÁNDO TE PASA EL COMANDO.
 *
 * ⚠ NO ES «CONFIADO». No es que él confíe en general: es que VOS le inspirás
 * confianza a él para pedirte esto. La diferencia no es de matiz — de ella
 * depende que la escena no suene a que te ganaste una medalla.
 *
 * ⚠ Y NO SE ABRE POR UNA SUMA. No es «tres de cinco». Se abre porque se dan
 * TRES COSAS A LA VEZ, y cada una le dice algo distinto de vos:
 *
 *   · le pasaste alguna de sus pruebas  → no sos tonto
 *   · le hiciste algún favor            → harías cosas por él
 *   · sabés lo que no deberías          → no te vas a asustar
 *
 * Si se implementa como un contador vuelve a ser una barra de progreso, y con
 * ella se pierde lo único que hacía especial esta fase: que ÉL decide, y lo
 * decide por lo que sabe de vos.
 */

import { willingNow, PIDE_CON } from '@/lib/system/entityFavors';
import type { EntityPhase, EntitySnapshot } from '@/lib/system/entity';

const en = (
    phase: EntityPhase,
    extra: Partial<EntitySnapshot> = {}
): EntitySnapshot => ({ phase, exchanges: 0, ...extra });

/** Alguien que ya cumple las tres cosas. */
const listo = (extra: Partial<EntitySnapshot> = {}) =>
    en('hablando', { lieSwallowed: false, didQuiet: true, ...extra });

describe('las tres a la vez, o ninguna', () => {
    it('con las tres, se decide', () => {
        expect(
            willingNow(listo({ provedIt: true }), PIDE_CON)
        ).toBe(true);
    });

    it('sin haberle pasado ninguna prueba, no', () => {
        // No sabe si sos tonto. Y a un tonto no le pide esto.
        expect(willingNow(listo(), PIDE_CON)).toBe(false);
    });

    it('sin haberle hecho ningún favor, no', () => {
        // Sabe que no sos tonto, pero no que harías algo por él.
        expect(
            willingNow(en('hablando', { provedIt: true }), PIDE_CON)
        ).toBe(false);
    });

    it('y sin saber lo que no deberías, tampoco', () => {
        // Podrías asustarte. Y el que se asusta lo reporta.
        expect(
            willingNow(listo({ provedIt: true }), PIDE_CON - 1)
        ).toBe(false);
    });
});

describe('⚠ y NO es una suma', () => {
    it('cumplir los tres favores no compensa no haberle pasado ninguna prueba', () => {
        /*
         * Éste es el test que impide que la condición se convierta en «tres de
         * cinco». Con muchísimo de una cosa y nada de otra, sigue siendo que
         * no: las tres dicen cosas distintas y ninguna sustituye a otra.
         */
        expect(
            willingNow(
                en('hablando', {
                    didV02Trash: true,
                    didQuiet: true,
                    didFullNote: true,
                }),
                PIDE_CON * 10
            )
        ).toBe(false);
    });

    it('ni saber muchísimo compensa no haberle hecho nada', () => {
        expect(
            willingNow(en('hablando', { provedIt: true }), PIDE_CON * 10)
        ).toBe(false);
    });
});

describe('y sólo mientras habla con vos', () => {
    it('cuando ya se fue, no se decide nada', () => {
        // Las fases no retroceden, y de `ido` no se vuelve.
        expect(willingNow({ ...listo({ provedIt: true }), phase: 'ido' }, PIDE_CON)).toBe(
            false
        );
    });
});
