// tests/lib/system/bootFrom.test.ts

/**
 * EL ARRANQUE NO SIEMPRE EMPIEZA POR EL PRINCIPIO.
 *
 * ⚠ EL FALLO QUE ESTO ARREGLA: tras `//reset`, la pantalla de borrado terminaba
 * APAGANDO el equipo y enseñando las BARRAS, y justo después el monitor volvía a
 * arrancar desde el apagón — o sea apagado y barras DOS VECES SEGUIDAS. Eso no
 * se lee como un encendido, se lee como un tartamudeo.
 *
 * Y tras el colapso pasaba lo contrario: la barra de carga llegaba al final y la
 * app volvía de golpe, contando que el sistema se había recuperado solo. Un
 * equipo que se apagó, arranca.
 */

import { bootScript, BOOT_MAX_MS, type BootPhase } from '@/lib/system/boot';

const fases = (guion: { phase: BootPhase }[]) => guion.map((t) => t.phase);

describe('de dónde arranca', () => {
    it('por defecto, del apagón: es lo que hace una recarga de verdad', () => {
        expect(fases(bootScript(BOOT_MAX_MS))).toEqual(['off', 'bars', 'logo', 'check']);
    });

    it('tras el borrado sigue por el rótulo, sin repetir apagón ni barras', () => {
        expect(fases(bootScript(BOOT_MAX_MS, false, 'logo'))).toEqual(['logo', 'check']);
    });

    it('tras el colapso sigue por las barras: el apagón ya lo hizo él', () => {
        expect(fases(bootScript(BOOT_MAX_MS, false, 'bars'))).toEqual([
            'bars',
            'logo',
            'check',
        ]);
    });

    it('el bloqueo manda sobre todo lo demás', () => {
        // Un equipo bloqueado no llega a arrancar: se apaga, enseña que no hay
        // señal y vuelve al fallo. Pedirle otro tramo no lo cambia.
        expect(fases(bootScript(BOOT_MAX_MS, true, 'logo'))).toEqual(['bars']);
    });

    it('un tramo que no existe no recorta nada', () => {
        // Vale más un arranque entero que uno vacío.
        expect(fases(bootScript(BOOT_MAX_MS, false, 'done'))).toEqual([
            'off',
            'bars',
            'logo',
            'check',
        ]);
    });

    it('y los tramos que quedan conservan su duración', () => {
        const entero = bootScript(BOOT_MAX_MS);
        const desdeBarras = bootScript(BOOT_MAX_MS, false, 'bars');

        expect(desdeBarras).toEqual(entero.slice(1));
    });
});
