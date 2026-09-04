// src/lib/system/entityWindows.ts

/**
 * Las ventanas que usa el ente.
 *
 * Las de error fantasma llevan existiendo desde la señal rota: cuadros que se
 * abren solos, se quejan del vídeo y se cierran. ⚠ ÉL NO ABRE VENTANAS NUEVAS —
 * usa las que ya había. Un cuadro con un formato distinto se leería como una
 * función de la app; uno idéntico a los de siempre, diciendo otra cosa, se lee
 * como que alguien se metió donde no debía.
 *
 * Hay dos clases y no una:
 *
 *   · LOS DATOS — cosas que sabe de vos, dichas como si fueran telemetría.
 *     Ninguna es falsa, y ahí está el escalofrío: la app siempre supo eso.
 *   · LAS BROMAS — averías que no existen, con la cara seria de las que sí.
 *
 * Módulo puro: sin estado, sin DOM, sin relojes.
 */

import type { Lang } from '@/config/lang';

type Localized = Readonly<Record<Lang, string>>;

export interface EntityWindow {
    /** El mismo formato de código que las de siempre. */
    code: string;
    text: Localized;
}

/*
 * ⚠ LOS DATOS SON CIERTOS, TODOS.
 *
 * Ninguna de estas ventanas miente: la app cuenta las sesiones, sabe cuánto
 * llevás quieto y sabe qué borraste. Decirlo en voz alta no revela nada nuevo —
 * y por eso inquieta. Si alguna fuera falsa esto pasaría a ser un susto barato,
 * y el susto barato se olvida; enterarte de que siempre se supo, no.
 *
 * Y en MAYÚSCULAS, al revés que todo lo suyo: acá no está hablando él, está
 * hablando el sistema con sus palabras. Que use la voz de la máquina para
 * decirte lo que sabe es exactamente el truco.
 */
const DATOS: readonly EntityWindow[] = [
    {
        code: '0x4E20',
        text: {
            es: 'SESIÓN REGISTRADA. NO ES LA PRIMERA.',
            en: 'SESSION LOGGED. NOT THE FIRST ONE.',
        },
    },
    {
        code: '0x0F1E',
        text: {
            es: 'INACTIVIDAD MEDIDA DESDE EL PRIMER DÍA',
            en: 'IDLE TIME MEASURED SINCE DAY ONE',
        },
    },
    {
        code: '0x33A7',
        text: {
            es: 'LO QUE BORRASTE SIGUE CONTADO',
            en: 'WHAT YOU DELETED IS STILL COUNTED',
        },
    },
];

/*
 * LAS BROMAS.
 *
 * Averías que no existen, con la cara seria de las que sí. ⚠ NINGUNA HABLA DE
 * TUS NOTAS NI DE GUARDAR — la regla de las ventanas de siempre sigue valiendo:
 * nada puede aparentar pérdida de trabajo. Un susto sobre tus datos no es una
 * broma, es una crueldad.
 */
const BROMAS: readonly EntityWindow[] = [
    {
        code: '0x0000',
        text: {
            es: 'ERROR SIN NÚMERO. NO SE PUDO ASIGNAR UNO.',
            en: 'UNNUMBERED ERROR. COULD NOT ASSIGN ONE.',
        },
    },
    {
        code: '0xDEAD',
        text: {
            es: 'SUBSISTEMA DE VÍDEO PIDE UNAS VACACIONES',
            en: 'VIDEO SUBSYSTEM IS REQUESTING TIME OFF',
        },
    },
    {
        code: '0x1A1A',
        text: {
            es: 'ESTE CUADRO NO ESTÁ ACÁ',
            en: 'THIS WINDOW IS NOT HERE',
        },
    },
];

/** Todas las suyas, en el orden en que se declaran. */
export const ENTITY_WINDOWS: readonly EntityWindow[] = [...DATOS, ...BROMAS];

/**
 * Cada cuántas ventanas le toca una a él.
 *
 * ⚠ POCAS. Las ventanas van de la señal rota, y si la mayoría fueran suyas
 * dejarían de ser una avería para ser un canal — y él no tiene un canal, tiene
 * grietas. Una de cada cuatro es bastante para que aparezcan y poco para que
 * nadie las espere.
 */
export const ENTITY_WINDOW_ODDS = 1 / 4;

/**
 * ¿Esta ventana es suya? Y si lo es, cuál.
 *
 * `null` significa que le toca al sistema quejarse del vídeo, como siempre.
 * Sólo abre ventanas si está despierto: dormido no hay nadie detrás.
 */
export function entityWindow(
    awake: boolean,
    random: () => number = Math.random
): EntityWindow | null {
    if (!awake) return null;
    if (random() >= ENTITY_WINDOW_ODDS) return null;

    const i = Math.min(
        ENTITY_WINDOWS.length - 1,
        Math.floor(random() * ENTITY_WINDOWS.length)
    );

    return ENTITY_WINDOWS[i];
}
