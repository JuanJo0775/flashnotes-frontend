// tests/lib/system/entityWindows.test.ts

/**
 * LAS VENTANAS QUE USA EL ENTE.
 *
 * ⚠ NO ABRE VENTANAS NUEVAS: usa las que ya había. Un cuadro con otro formato
 * se leería como una función de la app; uno idéntico a los de siempre, diciendo
 * otra cosa, se lee como que alguien se metió donde no debía.
 */

import {
    ENTITY_WINDOWS,
    ENTITY_WINDOW_ODDS,
    entityWindow,
} from '@/lib/system/entityWindows';
import { PHANTOM_MESSAGES } from '@/components/effects/PhantomError';

const LENGUAS = ['es', 'en'] as const;

describe('dormido no abre ninguna', () => {
    it('sin nadie detrás, las ventanas son del sistema', () => {
        expect(entityWindow(false, () => 0)).toBeNull();
    });
});

describe('despierto, alguna es suya', () => {
    it('con el dado a favor', () => {
        expect(entityWindow(true, () => 0)).not.toBeNull();
    });

    it('pero pocas: siguen siendo averías, no un canal', () => {
        /*
         * Si la mayoría fueran suyas dejarían de ser una avería para ser un
         * canal — y él no tiene un canal, tiene grietas.
         */
        expect(ENTITY_WINDOW_ODDS).toBeLessThanOrEqual(1 / 3);
        expect(entityWindow(true, () => 0.9)).toBeNull();
    });
});

describe('⚠ se disfrazan de las de siempre', () => {
    it('mismo formato de código', () => {
        // El formato es lo que las hace pasar por averías del sistema.
        const forma = /^0x[0-9A-F]{4}$/;

        for (const m of PHANTOM_MESSAGES) expect(m.code).toMatch(forma);
        for (const v of ENTITY_WINDOWS) expect(v.code).toMatch(forma);
    });

    it('y en MAYÚSCULAS, al revés que todo lo suyo', () => {
        /*
         * Acá no está hablando él: está hablando el sistema con sus palabras.
         * Que use la voz de la máquina para decirte lo que sabe ES el truco, y
         * ponerlas en minúsculas lo delataría en la primera.
         */
        for (const v of ENTITY_WINDOWS) {
            for (const lang of LENGUAS) {
                expect(v.text[lang]).toBe(v.text[lang].toUpperCase());
            }
        }
    });
});

describe('⚠ ninguna aparenta pérdida de trabajo', () => {
    it('no hablan de tus notas ni de guardar', () => {
        /*
         * Es la regla de las ventanas de siempre y sigue valiendo. Un susto
         * sobre tus datos no es una broma, es una crueldad.
         *
         * «LO QUE BORRASTE SIGUE CONTADO» habla del CONTADOR, que es cierto y
         * ya existía — no de recuperar nada ni de haber perdido nada.
         */
        for (const v of ENTITY_WINDOWS) {
            for (const lang of LENGUAS) {
                expect(v.text[lang]).not.toMatch(
                    /GUARDA|PERDID|CORRUPT|SAVE|LOST|UNSAVED/i
                );
            }
        }
    });
});

describe('los dos idiomas', () => {
    it('todas traducidas, y sin calcar', () => {
        for (const v of ENTITY_WINDOWS) {
            expect(v.text.es).toBeTruthy();
            expect(v.text.en).toBeTruthy();
            expect(v.text.es).not.toBe(v.text.en);
        }
    });
});

describe('hay de las dos clases', () => {
    it('datos y bromas, que no son lo mismo', () => {
        // Los datos son ciertos y por eso inquietan; las bromas no existen y
        // por eso se ríen. Con una sola clase se pierde la mitad del efecto.
        expect(ENTITY_WINDOWS.length).toBeGreaterThanOrEqual(6);
    });
});
