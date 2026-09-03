// src/hooks/useNetworkStatus.ts
'use client';

import { useSyncExternalStore } from 'react';
import { apiClient } from '@/lib/api/client';

/**
 * Estado de conectividad, compartido por TODA la app.
 *
 * Antes esto era un hook con `useState` + `setInterval` dentro. Como lo usaban
 * dos componentes a la vez (StatusBar y NoteEditor), había dos sondeos
 * independientes al backend, cada uno con su propio estado. Entre eso y el
 * heartbeat de sesión, la app consumía casi todo su propio límite de peticiones
 * sin que el usuario hiciera nada, y terminaba autobloqueándose con 429.
 *
 * Ahora hay un único sondeo a nivel de módulo y los componentes se suscriben
 * con useSyncExternalStore: da igual cuántos lo usen.
 */

const POLL_INTERVAL_MS = 60_000;
const HEALTH_TIMEOUT_MS = 5_000;

export interface NetworkStatus {
    /** El navegador cree tener red. */
    isOnline: boolean;
    /** El backend respondió al último health check. */
    backendReachable: boolean;
    /** Ambas cosas: se puede guardar con confianza. */
    isFullyOperational: boolean;
    /** Todavía no se completó la primera comprobación. */
    isChecking: boolean;
    /**
     * Cuánto duró la última caída del backend, en ms, o null.
     *
     * Se rellena en el instante en que el servidor VUELVE, y quien lo muestra
     * lo descarta con clearLastOutage(). Es un dato que la app siempre tuvo y
     * tiraba: hasta ahora, recuperarse sólo quitaba el aviso.
     */
    lastOutageMs: number | null;
}

let state: NetworkStatus = {
    isOnline: true,
    backendReachable: true,
    isFullyOperational: true,
    isChecking: true,
    lastOutageMs: null,
};

/** Desde cuándo el backend no responde. null si responde. */
let downSince: number | null = null;

const listeners = new Set<() => void>();
let subscriberCount = 0;
let intervalId: ReturnType<typeof setInterval> | null = null;
let inFlight = false;

function setState(next: Partial<Omit<NetworkStatus, 'isFullyOperational'>>) {
    const merged = { ...state, ...next };
    const resolved: NetworkStatus = {
        ...merged,
        isFullyOperational: merged.isOnline && merged.backendReachable,
    };

    const unchanged =
        resolved.isOnline === state.isOnline &&
        resolved.backendReachable === state.backendReachable &&
        resolved.isChecking === state.isChecking &&
        resolved.lastOutageMs === state.lastOutageMs;

    if (unchanged) return;

    state = resolved;
    listeners.forEach((l) => l());
}

/**
 * Anota si el backend acaba de caerse o de volver.
 *
 * El cronómetro NO se reinicia mientras sigue caído: si cada comprobación
 * fallida volviera a marcar el inicio, una caída de diez minutos se contaría
 * como el minuto que hay entre dos sondeos.
 */
function trackOutage(healthy: boolean): number | null {
    if (!healthy) {
        if (downSince === null) downSince = Date.now();
        return state.lastOutageMs;
    }

    if (downSince === null) return state.lastOutageMs;

    const duracion = Date.now() - downSince;
    downSince = null;
    return duracion;
}

/** Descarta el aviso de reconexión, una vez mostrado. */
export function clearLastOutage() {
    setState({ lastOutageMs: null });
}

/** El estado actual, para quien no sea un componente. */
export function getNetworkStatus(): NetworkStatus {
    return state;
}

/**
 * Comprueba si el backend responde. Expuesta para forzar una comprobación
 * después de un fallo, sin esperar al siguiente ciclo.
 */
export async function checkBackendHealth(): Promise<boolean> {
    if (inFlight) return state.backendReachable;
    inFlight = true;

    try {
        const res = await apiClient.get('/health', { timeout: HEALTH_TIMEOUT_MS });
        const healthy = res.data?.success === true;
        setState({
            backendReachable: healthy,
            isChecking: false,
            lastOutageMs: trackOutage(healthy),
        });
        return healthy;
    } catch {
        setState({
            backendReachable: false,
            isChecking: false,
            lastOutageMs: trackOutage(false),
        });
        return false;
    } finally {
        inFlight = false;
    }
}

function handleOnline() {
    setState({ isOnline: true });
    void checkBackendHealth();
}

function handleOffline() {
    setState({ isOnline: false, backendReachable: false, isChecking: false });
}

function start() {
    setState({ isOnline: navigator.onLine });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    void checkBackendHealth();
    intervalId = setInterval(() => {
        if (state.isOnline) void checkBackendHealth();
    }, POLL_INTERVAL_MS);
}

function stop() {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    if (++subscriberCount === 1) start();

    return () => {
        listeners.delete(listener);
        if (--subscriberCount === 0) stop();
    };
}

const getSnapshot = () => state;

// En el render del servidor no hay red que comprobar: se asume operativo para
// que el marcado del servidor y el del cliente coincidan.
const SERVER_SNAPSHOT: NetworkStatus = {
    isOnline: true,
    backendReachable: true,
    isFullyOperational: true,
    isChecking: true,
    lastOutageMs: null,
};
const getServerSnapshot = () => SERVER_SNAPSHOT;

export function useNetworkStatus(): NetworkStatus {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
