// src/i18n/types.ts

import type { es } from './es';
import type { Lang } from '@/config/lang';

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

/**
 * Un texto en TODOS los idiomas.
 *
 * Es `Record<Lang, string>` y no un ternario `lang === 'es' ? … : …` por una
 * razón concreta: el día que `Lang` gane un idioma, cada objeto `Localized`
 * incompleto deja de compilar y el compilador enumera exactamente qué falta.
 * Un ternario, en cambio, compilaría igual y serviría inglés en silencio — el
 * mismo agujero que el diccionario evita por diseño, reabierto a mano.
 *
 * Se usa para el texto de AUTOR que vive junto a su comentario (el lore y las
 * respuestas de los comandos). El texto de interfaz va en el diccionario.
 */
export type Localized = Readonly<Record<Lang, string>>;

/**
 * Las formas de plural de un texto. `other` es obligatoria; el resto son las
 * categorías que `Intl.PluralRules` puede devolver y que cada idioma use.
 *
 * Español e inglés sólo distinguen `one`/`other`, pero declarar las demás es lo
 * que permite añadir un idioma con más categorías —el ruso tiene `few` y
 * `many`— sin rehacer nada.
 */
export interface PluralForms {
    other: string;
    zero?: string;
    one?: string;
    two?: string;
    few?: string;
    many?: string;
}

export type LocalizedPlural = Readonly<Record<Lang, PluralForms>>;

/**
 * Las claves del diccionario que forman un grupo de plural: las que tienen
 * variante `.other`. `sidebar.files.one` + `sidebar.files.other` se piden como
 * `t.plural('sidebar.files', n)`, y el tipo sólo acepta bases que existan.
 */
type BaseDePlural<K> = K extends `${infer Base}.other` ? Base : never;

export type PluralKey = BaseDePlural<TranslationKey>;
