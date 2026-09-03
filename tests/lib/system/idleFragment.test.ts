// tests/lib/system/idleFragment.test.ts

/**
 * `[SEGUÍS AHÍ]` NO PODÍA SALIR NUNCA.
 *
 * La frase estaba escrita, traducida y con su condición —`idleMs` por encima de
 * un umbral—, pero los dos sitios que arman el contexto del sistema pasaban
 * `idleMs: 0` fijo. O sea que la única frase que pregunta por la inactividad no
 * llegaba a mirarse jamás: código muerto con aspecto de estar vivo, que es la
 * peor clase.
 *
 * Estos tests fijan las dos mitades: que la condición sea la inactividad de
 * verdad, y que alguien la mida.
 */

import { pickFragment, statusFragments } from '@/lib/system/lore';
import { fakeIdle, idleMs, markActivity, resetIdle } from '@/lib/system/idle';

const ctx = (idle: number) => ({ hour: 15, sessionMs: 60_000, idleMs: idle });

beforeEach(() => {
    resetIdle();
});

describe('el reloj de la inactividad', () => {
    it('empieza a cero y avanza', () => {
        expect(idleMs()).toBeLessThan(1_000);

        fakeIdle(11 * 60_000);

        expect(idleMs()).toBeGreaterThanOrEqual(11 * 60_000);
    });

    it('cualquier señal de vida lo reinicia', () => {
        fakeIdle(11 * 60_000);
        markActivity();

        expect(idleMs()).toBeLessThan(1_000);
    });
});

describe('la frase', () => {
    it('existe', () => {
        expect(statusFragments('es')).toContain('[SEGUÍS AHÍ]');
    });

    it('NO sale recién tecleado', () => {
        const salidas = new Set(
            Array.from({ length: 200 }, () => pickFragment(ctx(0), null))
        );

        expect([...salidas]).not.toContain('[SEGUÍS AHÍ]');
    });

    it('sí sale tras diez minutos quieto', () => {
        // No hace falta llevar horas abierta: la pregunta es «¿seguís ahí?», y
        // eso depende de que no toques nada, no de cuánto lleves.
        const salidas = new Set(
            Array.from({ length: 400 }, () => pickFragment(ctx(10 * 60_000), null))
        );

        expect([...salidas]).toContain('[SEGUÍS AHÍ]');
    });
});
