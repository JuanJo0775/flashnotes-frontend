// src/hooks/usePrefersReducedMotion.ts
'use client';

import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void) {
    const mq = window.matchMedia(QUERY);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
}

const getSnapshot = () => window.matchMedia(QUERY).matches;

// En el servidor se asume que sí hay movimiento: es lo que ve la mayoría, y el
// cliente corrige al hidratar sin desajuste.
const getServerSnapshot = () => false;

/**
 * Si el sistema pide menos movimiento.
 *
 * El CSS ya neutraliza las animaciones declarativas, pero una secuencia guiada
 * por temporizadores en JavaScript hay que saltársela a mano.
 */
export function usePrefersReducedMotion(): boolean {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
