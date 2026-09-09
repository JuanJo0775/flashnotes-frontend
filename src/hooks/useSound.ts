// src/hooks/useSound.ts
'use client';

import { useSyncExternalStore } from 'react';
import { isSoundOn, subscribeSound } from '@/lib/system/audio/context';

/**
 * Si el sonido está encendido.
 *
 * Hermano de `usePrefersReducedMotion`, y almacén compartido por la misma razón
 * que `useTheme` o `useNetworkStatus`: lo miran varios sitios a la vez —el
 * panel de diagnóstico, el banco de pruebas— y con un `useState` por componente
 * cada uno tendría su propia idea de si la máquina suena.
 *
 * ⚠ Y NO SE PUEDE LEER AL PINTAR (C1): el valor vive en `localStorage` y en
 * `matchMedia`. En el servidor se asume que SÍ suena, que es el valor por
 * defecto, y el cliente corrige al hidratar sin desajuste — igual que hace
 * `usePrefersReducedMotion` con el movimiento.
 */
export function useSound(): boolean {
    return useSyncExternalStore(subscribeSound, isSoundOn, () => true);
}
