// src/hooks/useTheme.ts
'use client';

import { useSyncExternalStore } from 'react';
import { THEME_STORAGE_KEY, type Theme } from '@/config/theme';

export type { Theme };

/**
 * Tema efectivo de la aplicación, compartido por toda la app.
 *
 * Tres estados posibles, no dos:
 *  · sin elección guardada → manda `prefers-color-scheme` del sistema
 *  · elección guardada     → manda ella, y se estampa en `data-theme` del <html>
 *
 * El CSS ya contempla los tres casos (ver globals.css), así que acá sólo hay que
 * estampar el atributo y avisar a quien esté suscrito.
 */

const listeners = new Set<() => void>();
let cached: Theme | null = null;
let mediaQuery: MediaQueryList | null = null;

function readStored(): Theme | null {
    try {
        const value = localStorage.getItem(THEME_STORAGE_KEY);
        return value === 'light' || value === 'dark' ? value : null;
    } catch {
        // Ventana privada o almacenamiento bloqueado: se sigue con el del sistema.
        return null;
    }
}

function readSystem(): Theme {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolve(): Theme {
    return readStored() ?? readSystem();
}

function notify() {
    listeners.forEach((listener) => listener());
}

function refresh() {
    const next = resolve();
    if (next === cached) return;
    cached = next;
    notify();
}

/** Fija el tema, lo recuerda y lo aplica al documento. */
export function setTheme(theme: Theme) {
    document.documentElement.setAttribute('data-theme', theme);

    try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
        // Sin persistencia el tema dura lo que la pestaña. Es aceptable.
    }

    cached = theme;
    notify();
}

/** Invierte el tema actual. */
export function toggleTheme() {
    setTheme(getSnapshot() === 'dark' ? 'light' : 'dark');
}

function subscribe(listener: () => void) {
    listeners.add(listener);

    if (listeners.size === 1) {
        mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        // Sólo importa mientras no haya elección explícita; refresh() ya lo resuelve.
        mediaQuery.addEventListener('change', refresh);
        // Otra pestaña puede haber cambiado el tema.
        window.addEventListener('storage', refresh);
    }

    return () => {
        listeners.delete(listener);

        if (listeners.size === 0) {
            mediaQuery?.removeEventListener('change', refresh);
            window.removeEventListener('storage', refresh);
            mediaQuery = null;
            // Sin nadie suscrito no hay quien mantenga el caché al día, así que
            // se invalida: el próximo montaje vuelve a leer el estado real.
            cached = null;
        }
    };
}

function getSnapshot(): Theme {
    // Se cachea porque useSyncExternalStore llama a esto en cada render y no
    // conviene tocar localStorage y matchMedia cada vez.
    if (cached === null) cached = resolve();
    return cached;
}

// En el servidor no hay ni almacenamiento ni preferencia del sistema. Se
// devuelve el tema por defecto del diseño (papel claro, como la referencia);
// useSyncExternalStore re-renderiza con el valor real al hidratar, sin
// desajuste. El parpadeo lo evita el script de arranque de layout.tsx.
const getServerSnapshot = (): Theme => 'light';

export function useTheme(): Theme {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
