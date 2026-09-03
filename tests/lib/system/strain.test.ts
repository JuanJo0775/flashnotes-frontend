// tests/lib/system/strain.test.ts

/**
 * LOS INSTRUMENTOS TIENEN QUE MOVERSE.
 *
 * La integridad decía 100 % y el núcleo 38 °C con la señal rota, con tirones
 * cayendo solos y con el rótulo aporreado. Un panel de diagnóstico que marca lo
 * mismo pase lo que pase no es un instrumento: es un adorno con números.
 *
 * Y es el único sitio de la app donde se puede MEDIR lo que está pasando. Si no
 * se mueve, la avería no tiene testigo.
 */

import { strainedIntegrity, strainedCore } from '@/lib/system/strain';
import { CORE_MIN_C, CORE_MAX_C } from '@/lib/system/diagnostics';

const sano = { chromaticFailure: false, glitching: false, clicks: 0 };

describe('la integridad', () => {
    it('sin nada roto, está entera', () => {
        expect(strainedIntegrity(100, sano)).toBe(100);
    });

    it('baja con la señal cromática rota', () => {
        expect(strainedIntegrity(100, { ...sano, chromaticFailure: true })).toBeLessThan(
            100
        );
    });

    it('baja mientras hay un tirón, y vuelve', () => {
        // Sube y baja: el tirón pasa, y lo que pasa se recupera. Una caída que
        // no vuelve sería un daño, y los tirones no dañan nada.
        const durante = strainedIntegrity(100, { ...sano, glitching: true });

        expect(durante).toBeLessThan(100);
        expect(strainedIntegrity(100, sano)).toBe(100);
    });

    it('baja más cuantas más veces le pegues al rótulo', () => {
        const pocos = strainedIntegrity(100, { ...sano, clicks: 2 });
        const muchos = strainedIntegrity(100, { ...sano, clicks: 7 });

        expect(muchos).toBeLessThan(pocos);
        expect(pocos).toBeLessThan(100);
    });

    it('las averías se suman: dos cosas rotas bajan más que una', () => {
        const una = strainedIntegrity(100, { ...sano, chromaticFailure: true });
        const dos = strainedIntegrity(100, {
            ...sano,
            chromaticFailure: true,
            glitching: true,
        });

        expect(dos).toBeLessThan(una);
    });

    it('nunca baja de cero ni pasa de cien', () => {
        const roto = strainedIntegrity(100, {
            chromaticFailure: true,
            glitching: true,
            clicks: 99,
        });

        expect(roto).toBeGreaterThanOrEqual(0);
        expect(strainedIntegrity(100, sano)).toBeLessThanOrEqual(100);
    });

    it('respeta la integridad que ya venía dada', () => {
        // El rótulo la baja por su cuenta al aporrearlo. Esto no la sustituye:
        // le suma el desgaste de lo que esté roto encima.
        expect(strainedIntegrity(60, sano)).toBe(60);
        expect(strainedIntegrity(60, { ...sano, glitching: true })).toBeLessThan(60);
    });
});

describe('el núcleo', () => {
    it('sin nada roto, marca lo que diga el ritmo', () => {
        expect(strainedCore(50, sano)).toBe(50);
    });

    it('SUBE con las averías: forzar la máquina la calienta', () => {
        // Al revés que la integridad, y por eso son dos lecturas y no una: una
        // dice cuánto queda sano, la otra cuánto está costando.
        expect(strainedCore(50, { ...sano, chromaticFailure: true })).toBeGreaterThan(
            50
        );
        expect(strainedCore(50, { ...sano, glitching: true })).toBeGreaterThan(50);
    });

    it('sube con los golpes al rótulo', () => {
        expect(strainedCore(50, { ...sano, clicks: 6 })).toBeGreaterThan(
            strainedCore(50, { ...sano, clicks: 1 })
        );
    });

    it('no se sale de su escala', () => {
        // El panel dibuja la barra contra estos dos extremos: pasarse la
        // rompería.
        const ardiendo = strainedCore(CORE_MAX_C, {
            chromaticFailure: true,
            glitching: true,
            clicks: 99,
        });

        expect(ardiendo).toBeLessThanOrEqual(CORE_MAX_C);
        expect(strainedCore(CORE_MIN_C, sano)).toBeGreaterThanOrEqual(CORE_MIN_C);
    });
});
