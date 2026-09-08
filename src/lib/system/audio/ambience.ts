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

/**
 * El peso de cada fuente: los tres armónicos y el aire de la caja.
 *
 * ⚠ SE NORMALIZAN, Y ÉSE ERA EL SEGUNDO MOTIVO DE QUE EL FONDO SE COMIERA A LAS
 * ACTIVIDADES. Cuatro fuentes sumándose ANTES del presupuesto sumaban 2,13, así
 * que el ambiente salía a más del doble de lo que la tabla decía: −37 dBFS
 * reales cuando el presupuesto ponía −44.
 *
 * Es el fallo clásico de mezclar: cada voz suena bien sola, y lo que llega a la
 * salida es la SUMA. Normalizadas, el número de la tabla vuelve a significar lo
 * que dice.
 */
const PESOS = { armonicos: [1, 0.45, 0.18], aire: 0.22 } as const;

const SUMA = PESOS.armonicos.reduce((a, b) => a + b, 0) + PESOS.aire;

/** Lo que suman las fuentes del zumbido, ya normalizado. Tiene que ser 1. */
export const AMBIENCE_MIX = SUMA / SUMA;

/** Cuánto tarda en aparecer. Segundos, no milisegundos: ver `startAmbience`. */
export const FADE_IN_S = 4;

/**
 * Lo que tarda en entrar cuando la máquina ACABA de despertarse.
 *
 * ⚠ ES CORTO A PROPÓSITO, Y NO CONTRADICE LO DE ARRIBA. Los cuatro segundos
 * existen para que el fondo no se oiga ENTRAR a mitad de una sesión, que es
 * cuando entrar lo convertiría en un suceso. Al encender la máquina es al revés:
 * ahí el zumbido apareciendo ES el suceso —el aparato recibiendo corriente— y se
 * pidió oírlo.
 *
 * Además tiene que caber en el compás oscuro del arranque: si siguiera subiendo
 * cuando llegan las barras, volvería a taparlas, que es justo lo que se corrigió.
 */
export const WAKE_FADE_S = 1;

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
export function startAmbience(random: Random = Math.random, fadeS: number = FADE_IN_S) {
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
    salida.gain.linearRampToValueAtTime(ambienceGain(), t0 + fadeS);
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
        [1, PESOS.armonicos[0] / SUMA, 0.07],
        [2, PESOS.armonicos[1] / SUMA, 0.11],
        [3, PESOS.armonicos[2] / SUMA, 0.043],
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
     * ⚠ Y VA POR UN PASABAJOS, NO POR UN PASABANDA. Estuvo puesto como pasabanda
     * con Q 0,7 —un ancho enorme, que deja pasar agudos de sobra— y encima con
     * la compensación de un filtro estrecho, ×9,66. Eso no es un chasis: es
     * siseo de banda ancha, y se reportó jugando tal cual, «suena a estática».
     *
     * Un chasis es GRAVE. Un pasabajos mata el siseo de raíz y de paso deja de
     * necesitar compensación: lo que no se recorta no hay que devolverlo.
     *
     * Va en bucle porque no tiene forma propia: es textura, y una textura no
     * tiene principio ni final.
     */
    const aire = fuenteDeRuido(g, random);
    aire.loop = true;
    const cuerpo = filtro(g, 'lowpass', vary(150, 0.08, random), 0.9);
    const gAire = g.ctx.createGain();
    gAire.gain.value = vary(PESOS.aire / SUMA, 0.15, random);
    aire.connect(cuerpo.nodo).connect(gAire);
    gAire.connect(salida);
    aire.start(t0);
    fuentes.push(aire);

    /*
     * ⚠ AQUÍ HUBO UN LATIDO SINCRONIZADO CON EL BARRIDO Y SE QUITÓ.
     *
     * La idea era que la línea del CRT, que cruza cada nueve segundos, también
     * se oyera: una respiración lenta del zumbido al compás de lo que se ve.
     * Sobre el papel encajaba. Escuchándolo, molesta — y quien lo pidió dijo que
     * no se refería a eso.
     *
     * Queda escrito para que nadie lo vuelva a añadir por la misma razón: un
     * fondo que PULSA se convierte en algo que reclama atención, y un fondo que
     * reclama atención ya no es un fondo. Lo continuo tiene que ser plano.
     */

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
