// src/lib/system/audio/play.ts

/**
 * La única puerta por la que la app suena.
 *
 * Las tres piezas de debajo están separadas a propósito y ninguna sirve sola:
 *
 *  · `mix.ts` reparte el volumen y cierra la compuerta, pero es aritmética y no
 *    puede obligar a nadie.
 *  · `voices.ts` sabe programar nodos y no consulta nada, para que el banco de
 *    pruebas pueda dispararlas sueltas y a mano.
 *  · `context.ts` decide si hay contexto siquiera.
 *
 * Acá se juntan, y por eso ésta es la función que llama el suscriptor. ⚠ UNA
 * VOZ INVOCADA POR FUERA DE ACÁ SE SALTA EL REPARTO Y LA COMPUERTA A LA VEZ:
 * suena a volumen completo y sin límite de repetición.
 */

import type { Random } from '@/lib/system/lore';
import type { SoundCategory } from '@/lib/system/audio/mix';
import { allow, gainFor } from '@/lib/system/audio/mix';
import { ensureAudio, type AudioGraph } from '@/lib/system/audio/context';
import {
    CATEGORY_OF,
    beep,
    confirm,
    drawer,
    button,
    capacitor,
    powerDown,
    powerUp,
    glitchBurst,
    head,
    key,
    relay,
    sweep,
    thud,
    tick,
} from '@/lib/system/audio/voices';

/** Qué se le puede pedir a cada voz. */
export interface VoiceArgs {
    key: undefined;
    tick: undefined;
    relay: undefined;
    drawer: undefined;
    button: undefined;
    capacitor: undefined;
    powerUp: undefined;
    powerDown: undefined;
    head: undefined;
    thud: undefined;
    confirm: { wrong: boolean };
    sweep: { fromHz: number; toHz: number; ms: number };
    beep: { hz: number; ms: number };
    glitchBurst: { amplitudePx: number; durationMs: number };
}

export type VoiceName = keyof VoiceArgs;

/**
 * El catálogo `nombre → voz`.
 *
 * Datos puros: una tabla que se puede recorrer y comprobar entera sin sonar. Es
 * lo que permite que un test enumere las voces y exija que todas declaren
 * familia, en vez de descubrir una suelta el día que suene demasiado fuerte.
 */
const VOICES = {
    key,
    tick,
    relay,
    drawer,
    button,
    capacitor,
    powerDown,
    powerUp,
    head,
    thud,
    beep,
    confirm,
    sweep,
    glitchBurst,
} as const;

/**
 * Las ganancias de familia, creadas una vez y guardadas.
 *
 * ⚠ NO SE CREAN POR DISPARO. Un nodo de escala por pulsación son miles de nodos
 * en una sesión de escritura; acá son tres por familia y se quedan mientras
 * viva el contexto.
 *
 * Cada familia recibe un grafo con `air`, `speaker` y `room` ya escalados, así
 * que la voz sigue sin saber nada de presupuestos: se enchufa donde siempre.
 */
const escalados = new Map<SoundCategory, AudioGraph>();
let escaladosDe: AudioContext | null = null;

function graphFor(g: AudioGraph, cat: SoundCategory): AudioGraph {
    // Un contexto nuevo invalida los nodos viejos: son de otro grafo y
    // conectarlos tira error en un navegador de verdad.
    if (escaladosDe !== g.ctx) {
        escalados.clear();
        escaladosDe = g.ctx;
    }

    const guardado = escalados.get(cat);
    if (guardado) return guardado;

    const escala = gainFor(cat);

    const air = g.ctx.createGain();
    air.gain.value = escala;
    air.connect(g.air);

    const speaker = g.ctx.createGain();
    speaker.gain.value = escala;
    speaker.connect(g.speaker);

    const room = g.ctx.createGain();
    room.gain.value = escala;
    room.connect(g.room);

    const nuevo: AudioGraph = { ctx: g.ctx, air, speaker, room, master: g.master };
    escalados.set(cat, nuevo);
    return nuevo;
}

/**
 * Suena, si se le deja.
 *
 * Devuelve si llegó a sonar. Quien llama no tiene que comprobar nada antes —ni
 * el interruptor, ni el contexto, ni cuándo sonó la última vez— porque si cada
 * sitio tuviera que acordarse, alguno se olvidaría.
 */
export function play<N extends VoiceName>(
    name: N,
    args?: VoiceArgs[N],
    now: number = Date.now(),
    random: Random = Math.random
): boolean {
    const g = ensureAudio();
    if (!g) return false;

    const cat = CATEGORY_OF[name];
    if (!allow(cat, now)) return false;

    const voz = VOICES[name] as (g: AudioGraph, a: unknown, r: Random) => void;
    const destino = graphFor(g, cat);

    // Las voces sin argumentos reciben el azar en el segundo hueco; las que sí
    // tienen, en el tercero. La tabla de arriba fija cuál es cuál.
    if (args === undefined) {
        (voz as unknown as (g: AudioGraph, r: Random) => void)(destino, random);
    } else {
        voz(destino, args, random);
    }

    return true;
}
