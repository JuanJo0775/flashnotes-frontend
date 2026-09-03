// src/hooks/useGlitch.ts
'use client';

import { useSyncExternalStore } from 'react';
import type { Random } from '@/lib/system/lore';
import {
    buildSlices,
    glitchAmplitudePx,
    glitchIntervalMs,
    rollSeverity,
    rollsFragment,
    rollsNegative,
    type GlitchSeverity,
    type GlitchSlice,
} from '@/lib/system/glitchTiming';
import { getSystemState, isSystemFailing } from '@/hooks/useSystemState';
import { showFragment } from '@/hooks/useSystemFragment';

/**
 * El glitch ambiental: la máquina falla sola, cada tanto.
 *
 * Almacén de módulo porque lo miran dos sitios a la vez: la capa de efectos, que
 * pinta las franjas y el negativo, y el contenedor de la app, que es el que da
 * el tirón.
 *
 * EL ACOPLAMIENTO CON LOS FRAGMENTOS es lo importante de esta pieza. Un fallo
 * suelto es ruido; un fallo que ocurre justo cuando el sistema dice algo es una
 * frase. Una de cada cinco veces el glitch dispara además un fragmento, con
 * retraso suficiente para que el ojo llegue a mirar.
 */

/** Cuánto dura el tirón más corto. Los graves duran más (ver DURATION_MS). */
export const GLITCH_MS = 180;

/** Cuánto tarda el fragmento en aparecer después del tirón. */
export const FRAGMENT_DELAY_MS = 120;

export interface GlitchState {
    active: boolean;
    /** Cuánto tiembla, en píxeles. Sube con la integridad baja. */
    amplitudePx: number;
    /** Si este fallo además invierte la pantalla. */
    negative: boolean;
    /** Qué tan grave es. La mayoría son leves. */
    severity: GlitchSeverity;
    /** Las franjas desplazadas de lado. Vacío en los fallos leves. */
    slices: GlitchSlice[];
    /**
     * Si este fallo trae además una ráfaga de aberración cromática.
     *
     * El botón secreto y el fallo del tema son la misma familia: los dos son
     * pánico. Que el botón dispare a veces la MISMA aberración —transitoria y
     * sin romper nada— es lo que los emparenta, en vez de dejarlos como dos
     * efectos sueltos que casualmente conviven.
     *
     * Sólo en los fallos graves, y nunca con la señal ya rota: ahí ya hay
     * aberración permanente y una transitoria encima no se vería.
     */
    chromaBurst: boolean;
}

const REPOSO: GlitchState = {
    active: false,
    amplitudePx: 3,
    negative: false,
    severity: 'minor',
    slices: [],
    chromaBurst: false,
};

/** Cada cuántos fallos graves, uno trae ráfaga cromática. */
const CHROMA_BURST_ODDS = 2;

/**
 * Cuánto dura cada nivel.
 *
 * Un fallo grave dura más porque tiene más que mostrar: con 180 ms, las
 * rebanadas apenas se ven. Pero tampoco mucho más — pasado medio segundo deja
 * de leerse como un fallo y empieza a leerse como una animación.
 */
const DURATION_MS: Record<GlitchSeverity, number> = {
    minor: 180,
    major: 280,
    severe: 420,
};

/**
 * Un escalón más de gravedad. Lo usa el fallo cromático.
 *
 * Con la señal rota nunca hay fallos leves: lo mínimo es `major`, que es el
 * nivel del clic 7 del rótulo — rebanadas, fantasma y caída de nivel. Un
 * parpadeo suave sobre una pantalla ya averiada no se nota.
 */
function escalate(severity: GlitchSeverity): GlitchSeverity {
    if (severity === 'minor') return 'major';
    return 'severe';
}

let state: GlitchState = REPOSO;
const listeners = new Set<() => void>();

let endTimer: ReturnType<typeof setTimeout> | null = null;
let fragmentTimer: ReturnType<typeof setTimeout> | null = null;

function publish(next: GlitchState) {
    state = next;
    listeners.forEach((l) => l());
}

/**
 * Dispara un fallo.
 *
 * CON LA SEÑAL ROTA, PEGA MÁS FUERTE. La primera versión los bloqueaba durante
 * el fallo cromático, y era al revés de lo que hacía falta: una pantalla ya
 * averiada que además NO da tirones se ve extrañamente estable. Ahora la avería
 * sube el nivel de gravedad un escalón, así que los tirones secos —los del clic
 * 7 del rótulo— entran también ahí.
 */
export function fireGlitch(
    random: Random = Math.random,
    forced?: GlitchSeverity
) {
    const system = getSystemState();
    if (!system.effectsEnabled) return;

    if (endTimer) clearTimeout(endTimer);
    if (fragmentTimer) clearTimeout(fragmentTimer);

    // Con la señal rota, todo sube un escalón: lo que sería leve pasa a serio y
    // lo serio pasa a grave. Un nivel forzado (el del botón secreto) gana al
    // sorteo, y también escala si la señal está rota.
    const fallando = isSystemFailing();
    const base = forced ?? rollSeverity(random);
    const severity = fallando ? escalate(base) : base;

    publish({
        active: true,
        amplitudePx: glitchAmplitudePx(system.integrity),
        // El negativo se reserva a los fallos que ya son serios: en uno leve,
        // invertir la pantalla entera es desproporcionado y delata el truco.
        negative: severity !== 'minor' && rollsNegative(random),
        severity,
        slices: buildSlices(severity, random),
        chromaBurst:
            severity === 'severe' && !fallando && random() < 1 / CHROMA_BURST_ODDS,
    });

    if (rollsFragment(random)) {
        fragmentTimer = setTimeout(() => {
            fragmentTimer = null;
            showFragment();
        }, FRAGMENT_DELAY_MS);
    }

    endTimer = setTimeout(() => {
        endTimer = null;
        publish({ ...REPOSO, amplitudePx: state.amplitudePx });
    }, DURATION_MS[severity]);
}

/**
 * Qué gravedad le toca a un fallo provocado por el botón secreto.
 *
 * NO SE SORTEA. Con el sorteo, el clic 7 —el que más se nota— caía en `minor` el
 * 70 % de las veces y se sentía flojo justo cuando el sistema debería estar
 * peor. La gravedad la fija la integridad: si el usuario la bajó a golpes, el
 * fallo que ve tiene que corresponderse con lo que hizo.
 */
export function severityForIntegrity(integrity: number): GlitchSeverity {
    if (integrity >= 80) return 'minor';
    if (integrity >= 40) return 'major';
    return 'severe';
}

/** Cuánto falta para el próximo fallo, según lo que lleve abierta la pestaña. */
export function nextGlitchDelayMs(random: Random = Math.random): number {
    return glitchIntervalMs(Date.now() - getSystemState().sessionStart, random);
}

export function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function getGlitch(): GlitchState {
    return state;
}

const getServerSnapshot = (): GlitchState => REPOSO;

export function useGlitch(): GlitchState {
    return useSyncExternalStore(subscribe, getGlitch, getServerSnapshot);
}
