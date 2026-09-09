// src/lib/system/audio/bars.ts

/**
 * El tono de las barras de ajuste. El sonido de la industria.
 *
 * ⚠ NO ES UNA LICENCIA: EXISTE DE VERDAD. Las barras de ajuste de televisión van
 * SIEMPRE con un tono de referencia de 1 kHz. Es la señal con la que se calibraba
 * el nivel de audio de una emisión, y por eso todo el mundo la asocia con «esto
 * es una carta de ajuste» aunque no sepa por qué.
 *
 * Es la pieza que convierte el arranque de este producto en algo que se
 * RECONOCE, en vez de en unos rectángulos de colores con música encima.
 *
 * Sale por la bocinita porque es una SEÑAL: no la hace la habitación, la emite
 * el aparato.
 */

import type { Random } from '@/lib/system/lore';
import { ensureAudio } from '@/lib/system/audio/context';
import { PEAK_DBFS, dbToGain } from '@/lib/system/audio/mix';
import { vary } from '@/lib/system/audio/jitter';

/**
 * Mil hercios. El de verdad.
 *
 * Cualquier otro número suena parecido y no significa nada: éste es el que se
 * usó durante cincuenta años y el que el oído tiene asociado.
 */
export const BARS_HZ = 1_000;

/** Cuánto tarda en entrar y en salir. Corto, pero nunca cero. */
const RAMPA_S = 0.05;

let vivo: { osc: OscillatorNode; gain: GainNode } | null = null;

/**
 * Enciende el tono, si no estaba.
 *
 * Idempotente por lo mismo que el ambiente: lo va a llamar cualquier cosa que
 * detecte las barras, y dos tonos de 1 kHz a la vez baten entre ellos y suenan
 * a avería en lugar de a carta de ajuste.
 */
export function startBarsTone(random: Random = Math.random) {
    if (vivo) return;

    const g = ensureAudio();
    if (!g) return;

    const t0 = g.ctx.currentTime;

    const osc = g.ctx.createOscillator();
    osc.type = 'sine';
    /*
     * Un pelo desafinado y no clavado en 1 000: un generador de tono real tiene
     * su deriva, y un 1 000,000 exacto es lo que delata que esto salió de un
     * ordenador de hoy. La diferencia es inaudible como nota y audible como
     * verdad.
     */
    osc.frequency.value = vary(BARS_HZ, 0.004, random);

    const gain = g.ctx.createGain();
    /*
     * ⚠ ENTRA Y SALE CON RAMPA. Un tono puro que empieza o acaba en seco deja un
     * chasquido de discontinuidad, y en una senoide limpia se oye muchísimo. En
     * el sonido más reconocible del arranque sería justo donde peor queda.
     */
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(dbToGain(PEAK_DBFS.ambience) * 6, t0 + RAMPA_S);

    osc.connect(gain);
    gain.connect(g.speaker);
    gain.connect(g.room);
    osc.start(t0);

    vivo = { osc, gain };
}

/** Lo apaga con su rampa y suelta los nodos. */
export function stopBarsTone() {
    if (!vivo) return;

    const { osc, gain } = vivo;
    vivo = null;

    try {
        const t0 = gain.context.currentTime;

        gain.gain.cancelScheduledValues(t0);
        gain.gain.setValueAtTime(gain.gain.value, t0);
        gain.gain.linearRampToValueAtTime(0.0001, t0 + RAMPA_S);

        // Se para DESPUÉS de la rampa, o el chasquido vuelve por la puerta de
        // atrás justo cuando se estaba evitando por la de delante.
        osc.stop(t0 + RAMPA_S + 0.02);
    } catch {
        // Contexto ya cerrado. No hay nada que apagar.
    }
}

/** Si el tono está sonando ahora mismo. */
export function barsToneIsOn(): boolean {
    return vivo !== null;
}
