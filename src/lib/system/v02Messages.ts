// src/lib/system/v02Messages.ts

/**
 * Lo que la v0.2 dice, y que la v1.0 no dice.
 *
 * Abrir una nota vacía acá no encuentra «Escribe algo…». Encuentra la nota que
 * alguien se dejó A SÍ MISMO mientras escribía la pantalla —«aca el usuario
 * empieza a escribir»— y que nunca sustituyó por el texto de verdad. No hace
 * falta explicar que la versión está sin terminar: se lee sola.
 *
 * ⚠ SEGUNDO SITIO DONDE ASOMAN LOS COMANDOS EXCLUSIVOS. El primero es la basura
 * de una nota que volvió mal de la papelera (`v02Restore`). Éste es el otro.
 * Ninguno de los dos está en `//help` y ninguno se puede adivinar: los comandos
 * de esta versión SE LEEN, en sitios donde nadie los puso a propósito.
 *
 * Dos caminos y no uno porque un solo camino con probabilidad baja es un
 * secreto inalcanzable — el error del umbral de diez colapsos, otra vez.
 */

import type { Lang } from '@/i18n';
import { V02_SECRETS } from '@/lib/system/v02Restore';

/** Cada cuánto el marcador de la nota vacía trae un comando pegado. */
export const PLACEHOLDER_LEAK_ODDS = 0.18;

/*
 * En minúsculas y sin puntuación cuidada A PROPÓSITO, y un test lo fija: esto no
 * es texto de producto, es un apunte de alguien. En cuanto se escribe «Comienza
 * a redactar tu nota» deja de parecer un descuido y pasa a parecer una decisión.
 */
const MARCADORES: Record<Lang, string[]> = {
    es: [
        'aca el usuario empieza a escribir',
        'texto de ejemplo (cambiar antes de publicar)',
        'poner aca lo que dijo el diseño',
        'nota vacia... falta el mensaje bueno',
    ],
    en: [
        'user starts typing here',
        'sample text (change before shipping)',
        'put the copy from the design here',
        'empty note... real message missing',
    ],
};

/** Cómo asoma el comando: pegado al apunte, como una prueba que quedó puesta. */
const CON_FUGA: Record<Lang, (cmd: string) => string> = {
    es: (cmd) => `aca el usuario empieza a escribir (probar ${cmd} antes)`,
    en: (cmd) => `user starts typing here (test ${cmd} first)`,
};

/**
 * El marcador de una nota vacía.
 *
 * Recibe el dado en vez de llamar a `Math.random()` dentro: así se prueba sin
 * espiar sorteos, igual que el resto de las piezas de esta versión.
 */
export function v02Placeholder(lang: Lang, rand: () => number = Math.random): string {
    if (rand() < PLACEHOLDER_LEAK_ODDS) {
        const cmd =
            V02_SECRETS[
                Math.min(
                    Math.floor(rand() * V02_SECRETS.length),
                    V02_SECRETS.length - 1
                )
            ];
        return CON_FUGA[lang](cmd);
    }

    const lista = MARCADORES[lang];
    return lista[Math.min(Math.floor(rand() * lista.length), lista.length - 1)];
}

/**
 * Los avisos de la v0.2.
 *
 * Dicen en voz alta lo que la v1.0 resuelve callando. No es que la versión vieja
 * hable más: es que todavía no sabía qué merecía contarse y qué no, así que lo
 * contaba todo — incluido lo que no debería.
 */
const AVISOS = {
    trashMaybe: {
        es: 'se tiro (creo). mirar papelera',
        en: 'moved to trash (i think). check the bin',
    },
    restoreDirty: {
        es: 'recuperado. venia con cosas pegadas, no se que son',
        en: 'restored. it came with stuff attached, no idea what',
    },
    noop: {
        es: 'no paso nada. reintentar?',
        en: 'nothing happened. retry?',
    },
    saved: {
        es: 'escrito en disco (sin verificar)',
        en: 'written to disk (unverified)',
    },
    listEmpty: {
        es: '0 archivos. o no cargaron',
        en: '0 files. or they did not load',
    },
} as const;

export type V02NoticeKey = keyof typeof AVISOS;

export const V02_NOTICE_KEYS = Object.keys(AVISOS) as V02NoticeKey[];

/**
 * El aviso, siempre el mismo para la misma clave.
 *
 * Constante a propósito: un aviso que cambia en cada repintado se lee como una
 * avería parpadeando, no como una versión vieja. Es la misma razón por la que
 * las etiquetas rotas son deterministas por clave.
 */
export function v02Notice(key: V02NoticeKey, lang: Lang): string {
    return AVISOS[key][lang];
}
