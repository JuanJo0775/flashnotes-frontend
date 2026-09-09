// tests/lib/system/bootV02.test.ts

/**
 * EL ARRANQUE DE LA v0.2 ES OTRO, NO ÉSTE CON PIEZAS QUITADAS.
 *
 * ⚠ ES LA REGLA DE TODA ESA VERSIÓN, escrita en `commands.ts` y que vale igual
 * acá: la v0.2 no es la 1.0 con cosas rotas, es la 1.0 ANTES de que se
 * escribieran. Así que su encendido no enseña menos: enseña otra cosa.
 *
 *   · No hay carta de ajuste porque no tiene nada que emitir.
 *   · No hay rótulo del fabricante porque nadie firmó esa versión.
 *   · No cuenta la memoria porque no sabe cuánta tiene.
 *
 * Lo que sí comparte es el TUBO: el apagón y el encendido son los mismos en las
 * dos, porque a esa máquina le cambiaron el programa y no el monitor. Este
 * fichero ata las dos mitades — lo que se comparte y lo que no— porque las dos
 * se pierden igual de fácil: alguien unifica los repartos «para simplificar» y
 * las dos versiones arrancan idénticas sin que falle nada.
 */

import { bootScript, bootDuration, BOOT_MAX_MS, type BootPhase } from '@/lib/system/boot';

const fases = (guion: { phase: BootPhase }[]) => guion.map((p) => p.phase);

const v02 = (from: BootPhase = 'off') => bootScript(BOOT_MAX_MS, false, from, true);

describe('la v0.2 arranca con lo suyo', () => {
    it('estática y barra, donde la 1.0 pone carta, rótulo y memoria', () => {
        expect(fases(v02())).toEqual(['off', 'wake', 'static', 'load']);
    });

    it('⚠ y la 1.0 no se entera: sigue arrancando como siempre', () => {
        // El mismo guion sin la bandera. Si alguien unificara los repartos, este
        // test es el que lo dice.
        expect(fases(bootScript(BOOT_MAX_MS))).toEqual([
            'off',
            'wake',
            'bars',
            'logo',
            'check',
        ]);
    });

    it('⚠ ninguna de las dos enseña un tramo de la otra', () => {
        /*
         * Es la comprobación que sobrevive a que alguien añada tramos: no mira
         * una lista fija, mira que los dos repertorios no se toquen. Un `logo`
         * colándose en la v0.2 sería un fabricante firmando una versión que
         * nadie firmó.
         */
        const deLa10 = new Set(fases(bootScript(BOOT_MAX_MS)));
        const deLa02 = new Set(fases(v02()));

        expect(deLa02.has('bars')).toBe(false);
        expect(deLa02.has('logo')).toBe(false);
        expect(deLa02.has('check')).toBe(false);
        expect(deLa10.has('static')).toBe(false);
        expect(deLa10.has('load')).toBe(false);
    });

    it('el tubo SÍ es el mismo: se apaga y se enciende igual', () => {
        // A esa máquina le cambiaron el programa, no el monitor.
        const dosPrimeros = (guion: { phase: BootPhase; ms: number }[]) =>
            guion.slice(0, 2);

        expect(dosPrimeros(v02())).toEqual(dosPrimeros(bootScript(BOOT_MAX_MS)));
    });

    it('la barra se lleva la mayor parte del tiempo', () => {
        /*
         * Igual que el rótulo en la 1.0, y por el mismo motivo: es lo único que
         * hay que MIRAR. La estática es información —«no hay nada enganchado»—
         * y la información se da y se pasa; sostenerla sería un efecto.
         */
        const guion = v02();
        const estatica = guion.find((p) => p.phase === 'static')!;
        const barra = guion.find((p) => p.phase === 'load')!;

        expect(barra.ms).toBeGreaterThan(estatica.ms);
    });

    it('⚠ y tarda lo mismo que la otra: la lentitud no es el chiste', () => {
        /*
         * Una v0.2 que tardara el doble sería un peaje, no un personaje. Lo que
         * la hace vieja es lo que enseña, no cuánto te hace esperar (REGLAS · A2:
         * nada de esto puede estorbar de verdad).
         */
        const suma = (guion: { ms: number }[]) => guion.reduce((t, p) => t + p.ms, 0);

        expect(suma(v02())).toBe(suma(bootScript(BOOT_MAX_MS)));
    });

    it('un tramo de la otra versión no recorta nada', () => {
        /*
         * El borrado y el colapso piden arrancar desde `bars`, que en la v0.2 no
         * existe. Vale más un arranque entero que uno vacío — la regla ya estaba
         * escrita en `bootScript` y acá se comprueba con el caso que la estrena.
         */
        expect(fases(v02('bars'))).toEqual(['off', 'wake', 'static', 'load']);
    });

    it('y el sorteo de duración es el de siempre', () => {
        // No hay un dado propio para la v0.2: es la misma máquina de sortear.
        const d = bootDuration(() => 0.5);

        expect(fases(bootScript(d, false, 'off', true))).toContain('load');
    });
});
