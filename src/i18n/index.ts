// src/i18n/index.ts
'use client';

import { useMemo, useSyncExternalStore } from 'react';
import {
    LANG_STORAGE_KEY,
    DEFAULT_LANG,
    isLang,
    normalizeLang,
    type Lang,
} from '@/config/lang';
import { es } from './es';
import { en } from './en';
import type {
    Dictionary,
    TranslationKey,
    Vars,
    Message,
    Localized,
    LocalizedPlural,
    PluralKey,
} from './types';

export type { Lang, TranslationKey, Vars, Message, Localized, LocalizedPlural, PluralKey };

const DICTIONARIES: Record<Lang, Dictionary> = { es, en };

/**
 * Idioma efectivo de la aplicación, compartido por toda la app.
 *
 * Es el MISMO patrón que `useTheme`: un almacén externo con `useSyncExternalStore`,
 * caché y suscriptores. No es copiar por copiar — los tres motivos por los que
 * aquel archivo está escrito así valen igual acá:
 *
 *  · `getSnapshot` se llama en cada render, y no conviene tocar `localStorage`
 *    ni `navigator` cada vez;
 *  · otra pestaña puede cambiar el idioma, y el evento `storage` lo propaga;
 *  · el render del servidor no tiene ni almacenamiento ni navegador, así que
 *    necesita su propio snapshot.
 *
 * Orden de resolución: elección guardada -> idioma del navegador -> DEFAULT_LANG.
 */

const listeners = new Set<() => void>();
let cached: Lang | null = null;

function readStored(): Lang | null {
    try {
        const value = localStorage.getItem(LANG_STORAGE_KEY);
        return isLang(value) ? value : null;
    } catch {
        // Ventana privada o almacenamiento bloqueado: manda el navegador.
        return null;
    }
}

function readBrowser(): Lang | null {
    if (typeof navigator === 'undefined') return null;
    return normalizeLang(navigator.language);
}

function resolve(): Lang {
    return readStored() ?? readBrowser() ?? DEFAULT_LANG;
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

/** Fija el idioma, lo recuerda y lo aplica al documento. */
export function setLang(lang: Lang) {
    // `<html lang>` no es decorativo: los lectores de pantalla lo usan para
    // elegir la voz. Si no se actualiza, la app en inglés se lee con acento
    // español.
    document.documentElement.setAttribute('lang', lang);

    try {
        localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
        // Sin persistencia el idioma dura lo que la pestaña. Es aceptable.
    }

    cached = lang;
    notify();
}

/** Alterna entre los dos idiomas. */
export function toggleLang() {
    setLang(getLang() === 'es' ? 'en' : 'es');
}

/** El idioma actual, fuera de React. */
export function getLang(): Lang {
    if (cached === null) cached = resolve();
    return cached;
}

export function subscribeToLang(listener: () => void) {
    listeners.add(listener);

    if (listeners.size === 1 && typeof window !== 'undefined') {
        window.addEventListener('storage', refresh);
    }

    return () => {
        listeners.delete(listener);

        if (listeners.size === 0) {
            if (typeof window !== 'undefined') {
                window.removeEventListener('storage', refresh);
            }
            // Sin nadie suscrito no hay quien mantenga la caché al día, así que
            // se invalida: el próximo montaje vuelve a leer el estado real.
            cached = null;
        }
    };
}

// En el servidor no hay ni almacenamiento ni navegador. Se devuelve el idioma
// por defecto; el script de arranque ya dejó `<html lang>` correcto antes del
// primer pintado, y useSyncExternalStore re-renderiza con el valor real al
// hidratar.
const getServerSnapshot = (): Lang => DEFAULT_LANG;

export function useLang(): Lang {
    return useSyncExternalStore(subscribeToLang, getLang, getServerSnapshot);
}

/**
 * Busca una clave y sustituye las variables.
 *
 * Es pura: idioma + clave + variables -> texto. Se puede llamar fuera de React
 * (en el mapeo de errores del cliente HTTP, por ejemplo).
 *
 * Si la clave falta —sólo posible si alguien esquiva el tipado— devuelve la
 * clave misma. Es feo en pantalla, y esa es la intención: un texto que falta
 * tiene que verse, no desaparecer en un hueco en blanco.
 */
export function translate(lang: Lang, key: TranslationKey, vars?: Vars): string {
    const template = DICTIONARIES[lang][key] ?? key;

    return vars ? fill(template, vars) : template;
}

/**
 * ¿Existe esta clave?
 *
 * Hace falta cuando la clave se arma en tiempo de ejecución y no se puede
 * escribir literal — el caso real es el mapeo de errores, que compone
 * `error.${code}` con un código que llega del servidor. Un backend más nuevo
 * puede mandar un código que este frontend todavía no conoce, y eso tiene que
 * degradar a un mensaje genérico en vez de pintar la clave cruda.
 */
export function hasKey(key: string): key is TranslationKey {
    return key in es;
}

/** Resuelve un `Message` —clave + variables— al idioma pedido. */
export function translateMessage(lang: Lang, message: Message): string {
    return translate(lang, message.key, message.vars);
}

// ---------------------------------------------------------------------------
//  Plurales
// ---------------------------------------------------------------------------

/**
 * Las reglas de plural del idioma, cacheadas.
 *
 * `new Intl.PluralRules(...)` no es gratis y esto se llama en cada render que
 * pinte un contador. Son dos objetos en toda la vida de la pestaña.
 */
const REGLAS = new Map<Lang, Intl.PluralRules>();

function reglas(lang: Lang): Intl.PluralRules {
    let r = REGLAS.get(lang);
    if (!r) {
        r = new Intl.PluralRules(lang);
        REGLAS.set(lang, r);
    }
    return r;
}

/**
 * El texto que le toca a `count`, con `{n}` ya sustituido.
 *
 * Se delega en `Intl.PluralRules` en lugar de escribir `n === 1 ? … : …`. Para
 * español e inglés dan lo mismo, pero la regla de "uno contra el resto" es una
 * particularidad de estos dos idiomas, no una ley: el ruso tiene tres formas y
 * el japonés una. Con `Intl` esos idiomas entran sin tocar esta función.
 *
 * Si al idioma le falta la categoría que pide la regla, se cae en `other`, que
 * el tipo garantiza que existe.
 */
export function translatePlural(
    lang: Lang,
    key: PluralKey,
    count: number,
    vars?: Vars
): string {
    const categoria = reglas(lang).select(count);
    const exacta = `${key}.${categoria}`;
    const elegida = (hasKey(exacta) ? exacta : `${key}.other`) as TranslationKey;

    return translate(lang, elegida, { n: count, ...vars });
}

/** Lo mismo para un texto de autor que no vive en el diccionario. */
export function pickPlural(
    lang: Lang,
    forms: LocalizedPlural,
    count: number,
    vars?: Vars
): string {
    const formas = forms[lang];
    const plantilla = formas[reglas(lang).select(count)] ?? formas.other;

    return fill(plantilla, { n: count, ...vars });
}

/** Sustituye `{x}` en una plantilla. Es lo que comparten `translate` y los plurales. */
export function fill(template: string, vars: Vars): string {
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in vars ? String(vars[name]) : match
    );
}

export interface TFunction {
    (key: TranslationKey, vars?: Vars): string;
    /** `t.plural('sidebar.files', 1)` -> "archivo"; con 3 -> "archivos". */
    plural(key: PluralKey, count: number, vars?: Vars): string;
}

/**
 * Un traductor atado a un idioma.
 *
 * Se arma acá fuera y no dentro de `useT` a propósito: colgar `plural` de la
 * función es una mutación, y el compilador de React la rechaza si ocurre dentro
 * del cuerpo de un hook. Fuera es una fábrica corriente que devuelve un objeto
 * nuevo — y de paso sirve para usar el traductor sin React.
 */
export function makeT(lang: Lang): TFunction {
    const t = ((key: TranslationKey, vars?: Vars) => translate(lang, key, vars)) as TFunction;

    t.plural = (key, count, vars) => translatePlural(lang, key, count, vars);

    return t;
}

/** El traductor ligado al idioma actual. Es lo que usan los componentes. */
export function useT(): TFunction {
    const lang = useLang();

    return useMemo(() => makeT(lang), [lang]);
}
