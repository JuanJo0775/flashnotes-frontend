// src/i18n/index.ts
'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
    LANG_STORAGE_KEY,
    DEFAULT_LANG,
    isLang,
    normalizeLang,
    type Lang,
} from '@/config/lang';
import { es } from './es';
import { en } from './en';
import type { Dictionary, TranslationKey, Vars, Message } from './types';

export type { Lang, TranslationKey, Vars, Message };

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

    if (!vars) return template;

    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in vars ? String(vars[name]) : match
    );
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

export type TFunction = (key: TranslationKey, vars?: Vars) => string;

/** El traductor ligado al idioma actual. Es lo que usan los componentes. */
export function useT(): TFunction {
    const lang = useLang();
    return useCallback((key: TranslationKey, vars?: Vars) => translate(lang, key, vars), [lang]);
}
