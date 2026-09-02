// src/hooks/useToday.ts
'use client';

import { useSyncExternalStore } from 'react';
import { formatDate } from '@/lib/utils/formatters';

/**
 * La fecha de hoy, pintada SÓLO en el cliente.
 *
 * `formatDate(new Date())` directo en el render se evalúa en el servidor y otra
 * vez en el cliente, con instantes distintos y husos distintos, y React tira un
 * error de hidratación en cada carga.
 *
 * `useSyncExternalStore` con un snapshot de servidor distinto es la forma que
 * React ofrece para exactamente esto: el servidor pinta el marcador de
 * posición, el cliente pinta la fecha, y no hay ni desajuste ni `setState`
 * dentro de un efecto.
 *
 * Devuelve `null` en el servidor; quien lo llama decide qué poner mientras.
 *
 * Vive aquí y no dentro de la cabecera porque lo usan la cabecera de la app y la
 * del `vsync-test`, y dos copias del mismo truco de hidratación es la clase de
 * duplicado que se rompe por un lado y no por el otro.
 */

// La fecha no cambia mientras la pestaña está abierta: no hay nada a lo que
// suscribirse, sólo la diferencia entre el render del servidor y el del cliente.
const subscribeToNothing = () => () => {};
const getToday = () => formatDate(new Date());
const getNoDate = () => null;

export function useToday(): string | null {
    return useSyncExternalStore(subscribeToNothing, getToday, getNoDate);
}
