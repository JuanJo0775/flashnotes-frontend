// src/lib/system/audio/ambience.ts

/**
 * El zumbido del chasis: UN elemento, muy tenue, que no suena siempre.
 *
 * ⚠ NO ES UN LECHO DE AMBIENTE, y la distinción es la que decide si el producto
 * cansa. Un zumbido de red más un ventilador más siseo, sonando sin parar,
 * agota en cinco minutos y arruina todo lo demás por enmascaramiento: cuanto
 * más fondo hay, menos sitio queda para lo que sí importa oír.
 *
 * ⚠ Y LA RAZÓN DE QUE EXISTA ES PODER DESAPARECER. Quitar de golpe algo que
 * llevaba veinte minutos ahí es lo más fuerte que puede hacer este sistema, y no
 * cuesta ni un fichero. Sin nada de fondo, el silencio del derrumbe no cuesta
 * nada y no vale nada. Por eso puede estar tan bajo como haga falta —está a
 * −34 dBFS, diez por debajo de las teclas— pero tiene que estar.
 *
 * Va por el aire: el chasis es un objeto de la habitación, no algo que emita la
 * bocinita.
 */

import type { Random } from '@/lib/system/lore';
import { ensureAudio } from '@/lib/system/audio/context';
import { PEAK_DBFS, dbToGain } from '@/lib/system/audio/mix';
import { vary } from '@/lib/system/audio/jitter';
import { filtro, fuenteDeRuido } from '@/lib/system/audio/voices';

/** La fundamental del zumbido. Grave, pero no tanto como para no oírse. */
const HUM_HZ = 58;

/** Cuánto tarda en aparecer. Segundos, no milisegundos: ver `startAmbience`. */
export const FADE_IN_S = 4;

/** Y cuánto en irse cuando se le manda parar. */
const FADE_OUT_S = 2.5;

/** Lo que suena ahora mismo, o nada. */
let vivo: {
    salida: GainNode;
    fuentes: (OscillatorNode | AudioBufferSourceNode)[];
} | null = null;

/** El volumen del ambiente, ya convertido. */
export function ambienceGain(): number {
    return dbToGain(PEAK_DBFS.ambience);
}

/**
 * Enciende el zumbido, si no estaba.
 *
 * ⚠ ES IDEMPOTENTE A PROPÓSITO. Cualquier cosa que parezca actividad va a querer
 * llamar a esto, y dos ambientes a la vez suenan al doble Y desafinan entre
 * ellos — que es peor que el doble, porque suena a avería sin serlo.
 */
export function startAmbience(random: Random = Math.random) {
    if (vivo) return;

    const g = ensureAudio();
    if (!g) return;

    const t0 = g.ctx.currentTime;

    const salida = g.ctx.createGain();
    salida.gain.setValueAtTime(0.0001, t0);
    /*
     * ⚠ SUBE EN SEGUNDOS, NO EN MILISEGUNDOS. Un ambiente que entra de golpe se
     * oye ENTRAR, y entonces deja de ser ambiente para ser un suceso. Lo que
     * tiene que pasar es que en algún momento te des cuenta de que ya estaba.
     */
    salida.gain.linearRampToValueAtTime(ambienceGain(), t0 + FADE_IN_S);
    salida.connect(g.air);
    salida.connect(g.room);

    const fuentes: (OscillatorNode | AudioBufferSourceNode)[] = [];

    /*
     * DOS ARMÓNICOS Y SUS DERIVAS.
     *
     * ⚠ TIENE QUE RESPIRAR. Un bucle fijo se delata en treinta segundos: el oído
     * aprende el patrón y a partir de ahí oye un fichero repitiéndose. Lo que
     * hace que un zumbido se lea como una máquina ENCENDIDA son los LFOs lentos
     * moviéndolo por debajo, cada uno a su ritmo y sin múltiplos entre ellos.
     */
    for (const [mult, nivel, lfoHz] of [
        [1, 1, 0.07],
        [2, 0.45, 0.11],
        [3, 0.18, 0.043],
    ] as const) {
        const osc = g.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = vary(HUM_HZ * mult, 0.02, random);

        const nivelGain = g.ctx.createGain();
        nivelGain.gain.value = nivel;

        // La deriva: un oscilador lentísimo empujando el tono del armónico.
        const lfo = g.ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = vary(lfoHz, 0.25, random);

        const profundidad = g.ctx.createGain();
        profundidad.gain.value = vary(1.6, 0.3, random) * mult;
        lfo.connect(profundidad);
        profundidad.connect(osc.detune);

        osc.connect(nivelGain);
        nivelGain.connect(salida);

        osc.start(t0);
        lfo.start(t0);
        fuentes.push(osc, lfo);
    }

    /*
     * EL AIRE DE LA CAJA.
     *
     * ⚠ SIN ESTO ES UN TONO DE PRUEBA, y se reportó jugando tal cual: «cuando
     * sale da un pitido feo». Tres senos puros a 58, 116 y 174 Hz son
     * exactamente lo que un laboratorio usa para calibrar — y cuanto más subís
     * el volumen, más se nota que es un oscilador y no una máquina.
     *
     * Lo que convierte un zumbido en un CHASIS es el ruido ancho y grave de una
     * caja de plástico con una fuente dentro. Va en bucle porque no tiene forma
     * propia: es textura, y una textura no tiene principio ni final.
     */
    const aire = fuenteDeRuido(g, random);
    aire.loop = true;
    const cuerpo = filtro(g, 'bandpass', vary(180, 0.1, random), 0.7);
    const gAire = g.ctx.createGain();
    gAire.gain.value = vary(0.5, 0.15, random) * cuerpo.makeup;
    aire.connect(cuerpo.nodo).connect(gAire);
    gAire.connect(salida);
    aire.start(t0);
    fuentes.push(aire);

    vivo = { salida, fuentes };
}

/** Lo apaga y suelta sus nodos. */
export function stopAmbience() {
    if (!vivo) return;

    const { salida, fuentes } = vivo;
    vivo = null;

    try {
        const ctx = salida.context;
        const t0 = ctx.currentTime;

        salida.gain.cancelScheduledValues(t0);
        salida.gain.setValueAtTime(salida.gain.value, t0);
        salida.gain.linearRampToValueAtTime(0.0001, t0 + FADE_OUT_S);

        // Se paran DESPUÉS del desvanecido: cortar un oscilador en marcha deja
        // un chasquido, que es justo lo que un ambiente no puede hacer.
        for (const f of fuentes) f.stop(t0 + FADE_OUT_S + 0.05);
    } catch {
        // Contexto ya cerrado. No hay nada que apagar.
    }
}

/**
 * CALLA LA SALA DEL TODO, y vuelve.
 *
 * ⚠ EL SILENCIO ES CERO, NO UN NÚMERO PEQUEÑO. Un ambiente a −60 dB sigue
 * estando ahí y el oído lo nota; lo que tiene que notar es que no hay NADA. La
 * diferencia entre casi nada y nada es exactamente el efecto.
 *
 * Y vuelve solo: si no volviera, el derrumbe dejaría la máquina muerta y el
 * silencio dejaría de ser un gesto para pasar a ser una avería.
 */
export function silence(ms: number) {
    if (!vivo) return;

    const { salida } = vivo;
    const t0 = salida.context.currentTime;
    const dura = ms / 1_000;

    salida.gain.cancelScheduledValues(t0);
    salida.gain.setValueAtTime(0, t0);
    salida.gain.setValueAtTime(0, t0 + dura);
    salida.gain.linearRampToValueAtTime(ambienceGain(), t0 + dura + 1.2);
}

/**
 * Lo baja sin apagarlo, mientras dure.
 *
 * Para cuando habla el ente: la sala se calla para escucharlo. Es el recurso más
 * barato y más fuerte que tiene este sistema, y no cuesta ni un fichero — pero
 * NO es el silencio del derrumbe: ahí no queda nada, y acá queda un hilo.
 */
export function duck(ms: number, cuanto = 0.15) {
    if (!vivo) return;

    const { salida } = vivo;
    const t0 = salida.context.currentTime;
    const dura = ms / 1_000;

    salida.gain.cancelScheduledValues(t0);
    salida.gain.linearRampToValueAtTime(ambienceGain() * cuanto, t0 + 0.4);
    salida.gain.setValueAtTime(ambienceGain() * cuanto, t0 + dura);
    salida.gain.linearRampToValueAtTime(ambienceGain(), t0 + dura + 1.5);
}

/** Si el zumbido está sonando ahora mismo. */
export function ambienceIsOn(): boolean {
    return vivo !== null;
}
