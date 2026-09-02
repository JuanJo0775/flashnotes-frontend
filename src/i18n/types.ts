// src/i18n/types.ts

import type { es } from './es';

/**
 * El diccionario español DEFINE la forma. `en.ts` se declara `Dictionary`, así
 * que si le falta una clave el proyecto no compila y si le sobra una, tampoco.
 *
 * Por eso no hay ningún test que compare las claves de los dos idiomas: lo
 * verifica `tsc`, que ya corre en `npm run check`. Un test comprobaría lo mismo
 * más tarde y peor.
 *
 * `es.ts` NO lleva `as const` a propósito: con él, los valores serían tipos
 * literales ('Notas' en vez de string) y el inglés estaría obligado a repetir
 * las mismas cadenas exactas. Sin él, las claves siguen siendo literales —que es
 * lo que da el autocompletado y la verificación— y los valores son `string`.
 */
export type Dictionary = typeof es;

export type TranslationKey = keyof Dictionary;

/** Variables de interpolación: `{n}` en la plantilla. */
export type Vars = Record<string, string | number>;

/**
 * Un texto pendiente de traducir: la clave y sus variables, sin resolver.
 *
 * Existe por un fallo concreto. Los errores se guardaban en el estado de React
 * como texto YA traducido, así que al cambiar de idioma la pantalla quedaba
 * mezclada: todo en español menos el error, que se había resuelto en inglés
 * cuando ocurrió y nadie lo volvía a mirar.
 *
 * Guardando la CLAVE, el texto se resuelve en cada render y sigue al idioma.
 */
export interface Message {
    key: TranslationKey;
    vars?: Vars;
}
