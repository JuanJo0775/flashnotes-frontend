// tests/lib/system/laVuelta.test.ts

/**
 * QUE VOLVISTE, Y QUE EL RELOJ SE SOLTÓ: dos cosas que la máquina no decía.
 *
 * ⚠ LA MÁQUINA LLEVA EL REGISTRO DE TODO EL QUE PASÓ —de eso va el lore entero—
 * y era el ente quien medía tu ausencia: el único que se enteraba de que habías
 * vuelto. La cosa que mejor sabe hacer, callada.
 *
 * ⚠ Y EL TONO ES LO QUE SE VIGILA ACÁ. «Volviste» la convierte en alguien que te
 * esperaba; «turno reanudado» es un registro que se retoma donde se quedó, y el
 * dato —cuánto tiempo estuviste sin abrirlo— lo pone quien lee, no la app.
 */

import { availableFragments, type SystemContext } from '@/lib/system/lore';

const MINUTO = 60_000;
const DIA = 24 * 60 * MINUTO;

const ctx = (over: Partial<SystemContext> = {}): SystemContext => ({
    hour: 15,
    sessionMs: 60_000,
    idleMs: 0,
    ...over,
});

describe('volver después de días', () => {
    test('recién estuviste: no dice nada', () => {
        expect(availableFragments(ctx({ awayMs: 2 * DIA }), 'es')).not.toContain(
            '[TURNO REANUDADO]'
        );
    });

    test('⚠ y un día no cuenta: eso es el horario de alguien, no una ausencia', () => {
        // Con un día lo dice cualquiera que abra la app los lunes y los
        // miércoles, y entonces deja de significar nada.
        expect(availableFragments(ctx({ awayMs: DIA }), 'es')).not.toContain(
            '[TURNO REANUDADO]'
        );
    });

    test('a los tres días, la máquina lo anota', () => {
        expect(availableFragments(ctx({ awayMs: 3 * DIA }), 'es')).toContain(
            '[TURNO REANUDADO]'
        );
    });

    test('y sigue valiendo a los meses, porque no dice cuánto', () => {
        /*
         * Un número —«[8 DÍAS]»— es la app contándote tu propia vida, y encima
         * envejece mal: a los cuatro meses da risa. Sin número, la frase vale
         * igual a los tres días que al año.
         */
        const largo = availableFragments(ctx({ awayMs: 400 * DIA }), 'es');

        expect(largo).toContain('[TURNO REANUDADO]');
        for (const f of largo) expect(f).not.toMatch(/\d+ DÍAS|\d+ DAYS/);
    });

    test('⚠ y no es un reproche: no hay ni una palabra de eso', () => {
        const dichos = availableFragments(ctx({ awayMs: 30 * DIA }), 'es');

        for (const f of dichos) {
            expect(f).not.toMatch(/VOLVISTE|TE FUISTE|POR FIN|TARDASTE/);
        }
    });

    test('allá abajo no se sabe: la versión vieja es antes', () => {
        expect(
            availableFragments(ctx({ awayMs: 30 * DIA, v02: true }), 'es')
        ).not.toContain('[TURNO REANUDADO]');
    });

    test('y sin el dato, la barra sigue funcionando igual', () => {
        // El contexto llega de sitios que no saben nada de ausencias —los tests
        // viejos, el banco— y ahí no puede fallar ni salir la frase.
        const sinDato = availableFragments(ctx(), 'es');

        expect(sinDato).not.toContain('[TURNO REANUDADO]');
        expect(sinDato.length).toBeGreaterThan(3);
    });
});
