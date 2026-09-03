// src/hooks/useSystemFragment.ts
'use client';

import { idleMs } from '@/lib/system/idle';
import { useSyncExternalStore } from 'react';
import { pickFragment } from '@/lib/system/lore';
import { getSystemState } from '@/hooks/useSystemState';

/**
 * El fragmento que el sistema está diciendo ahora mismo, o null.
 *
 * Cada tanto `[SYSTEM_OK]` no dice `[SYSTEM_OK]`: dice otra cosa durante unos
 * segundos y vuelve. Lo dispara el temporizador ambiental y también el glitch
 * (§1), que una de cada cinco veces lo acompaña — un fallo suelto es ruido, un
 * fallo que ocurre justo cuando el sistema dice algo es una frase.
 *
 * Vive en un almacén de módulo porque lo miran dos sitios: la barra de estado,
 * que lo pinta, y la capa de glitch, que lo provoca.
 *
 * SIN ANIMACIÓN: el fragmento aparece y desaparece de golpe, como todo cambio de
 * estado en esta app. Esa sequedad es lo que lo hace sentir un fallo y no un
 * adorno.
 *
 * NO respeta `prefers-reduced-motion`, y es correcto: un fragmento es texto, no
 * movimiento — la regla lo dice explícitamente. Sí respeta el interruptor de
 * efectos, porque `>chaos off` tiene que poder callar al sistema del todo.
 */

/**
 * Cuánto se queda un fragmento en pantalla.
 *
 * No es un tiempo fijo: va de cinco segundos a un minuto entero, sorteado en
 * cada aparición. Con una duración fija el efecto se vuelve un pestañeo
 * reconocible —siempre el mismo lapso, siempre el mismo ritmo— y el ojo lo
 * archiva como animación. Variando tanto, a veces apenas lo ves y a veces el
 * sistema se queda diciendo `[SIN RELEVO]` un minuto largo mientras escribís,
 * que es mucho más incómodo que cualquier temblor.
 */
export const FRAGMENT_MIN_VISIBLE_MS = 5000;
export const FRAGMENT_MAX_VISIBLE_MS = 60_000;

/** Cuánto dura ESTE fragmento. */
function visibleMs(): number {
    return (
        FRAGMENT_MIN_VISIBLE_MS +
        Math.random() * (FRAGMENT_MAX_VISIBLE_MS - FRAGMENT_MIN_VISIBLE_MS)
    );
}

const listeners = new Set<() => void>();

let current: string | null = null;
let previous: string | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

function notify() {
    listeners.forEach((l) => l());
}

/**
 * Muestra un fragmento, si hay uno que decir.
 *
 * Con uno ya en pantalla no hace nada: dos fragmentos pisándose se leerían como
 * un parpadeo en vez de como una frase.
 */
export function showFragment() {
    if (current !== null) return;
    if (!getSystemState().effectsEnabled) return;

    const ahora = new Date();
    const system = getSystemState();

    current = pickFragment(
        {
            hour: ahora.getHours(),
            sessionMs: Date.now() - system.sessionStart,
            idleMs: idleMs(),
        },
        previous
    );
    previous = current;
    notify();

    hideTimer = setTimeout(() => {
        current = null;
        hideTimer = null;
        notify();
    }, visibleMs());
}

/** Retira el fragmento en el acto. */
export function clearFragment() {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = null;

    if (current === null) return;
    current = null;
    notify();
}

export function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function getFragment(): string | null {
    return current;
}

// En el servidor no hay reloj ni sesión: nunca hay fragmento, así que el marcado
// del servidor y el del cliente coinciden.
const getServerSnapshot = (): string | null => null;

export function useSystemFragment(): string | null {
    return useSyncExternalStore(subscribe, getFragment, getServerSnapshot);
}
