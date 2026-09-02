// src/hooks/useToday.ts
'use client';

import { useSyncExternalStore } from 'react';
import { formatDate } from '@/lib/utils/formatters';
import { subscribeToClock } from '@/hooks/useClock';

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

/*
 * SE SUSCRIBE AL RELOJ, y hace falta.
 *
 * La fecha no cambia sola mientras la pestaña está abierta, así que antes esto
 * no se suscribía a nada: se calculaba una vez y ahí se quedaba. Con `//date_off`
 * eso lo dejaba INÚTIL — el reloj se volvía loco a la vista y la fecha de la
 * cabecera seguía impasible, que es justo donde más se nota que el sistema
 * perdió la referencia.
 *
 * Colgándola del latido del reloj, la fecha salta de día, de mes y de año igual
 * que la hora. El coste es un repintado por segundo de un `<span>`, y sólo
 * cambia de valor cuando el texto cambia de verdad.
 */
const getToday = () => formatDate(new Date());
const getNoDate = () => null;

export function useToday(): string | null {
    return useSyncExternalStore(subscribeToClock, getToday, getNoDate);
}
