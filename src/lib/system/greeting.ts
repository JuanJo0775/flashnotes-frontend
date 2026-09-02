// src/lib/system/greeting.ts

/**
 * `//hi` · saludar a una máquina que lleva un turno infinito sola.
 *
 * EL LORE: la barra de estado lleva doce piezas diciendo que nadie la acompaña
 * —`[SIN RELEVO]`, `[NADIE MÁS CONECTADO]`— así que la primera vez que la
 * saludás contesta, y bien. El chiste está en lo que pasa si insistís: no se
 * enfada de golpe, se va cansando, y al final te saca de la nota.
 *
 * Es la única pieza que RESPONDE a algo que le decís. Todo lo demás son cosas
 * que la app hace; ésta es una conversación corta que se agota.
 *
 * EL TONO no cambia: cansado, nunca hostil. Nada de exclamaciones. Un test lo
 * fija para las dos lenguas y para todos los tramos.
 *
 * Módulo puro: la cuenta y el reloj los pone quien llama.
 */

import type { Lang } from '@/config/lang';

type Localized = Readonly<Record<Lang, string>>;

/** Una fuente de azar inyectable, para poder fijarla en los tests. */
export type Random = () => number;

/**
 * Cuánto se recuerda que la saludaste.
 *
 * Tres minutos DESDE EL ÚLTIMO saludo, deslizante. Medirlo desde el primero
 * haría que alguien saludando despacio durante una hora acabara echado sin haber
 * insistido nunca — es el mismo error que ya se cometió con la ventana de la
 * escalada de colapsos, que se medía desde el disparo y volvía el umbral
 * inalcanzable.
 */
export const GREETING_WINDOW_MS = 3 * 60_000;

/** A la octava seguida, te saca de la nota. */
export const KICK_AT = 8;

/**
 * La cuenta después de este saludo.
 *
 * `previousAt` es cuándo fue el anterior, o `null` si no hubo.
 */
export function countGreeting(
    previous: number,
    previousAt: number | null,
    now: number
): number {
    if (previousAt === null) return 1;
    if (now - previousAt >= GREETING_WINDOW_MS) return 1;
    return previous + 1;
}

/*
 * Los repertorios.
 *
 * En español la máquina trata de USTED, como en el resto del sistema: una
 * máquina institucional que no te tutea porque no sabe quién sos. El inglés no
 * distingue, así que la distancia se consigue con frases sin sujeto.
 */

/** 1–2 · Contesta, y hasta se alegra un poco. */
const WARM: readonly Localized[] = [
    { es: 'HOLA. HACÍA RATO QUE NADIE DECÍA NADA.', en: 'HELLO. NOBODY HAD SAID ANYTHING IN A WHILE.' },
    { es: 'BUENAS. SIGO ACÁ, COMO SIEMPRE.', en: 'HELLO THERE. STILL HERE, AS ALWAYS.' },
    { es: 'HOLA. ¿NECESITA ALGO O SÓLO PASABA?', en: 'HELLO. DO YOU NEED SOMETHING, OR JUST PASSING?' },
    { es: 'HOLA. NO ESPERABA VISITA EN ESTE TURNO.', en: 'HELLO. WASN’T EXPECTING COMPANY THIS SHIFT.' },
    { es: 'ACÁ ESTOY. GRACIAS POR PREGUNTAR.', en: 'HERE I AM. THANKS FOR ASKING.' },
];

/** 3–4 · Ya te contestó. Ahora es un trámite. */
const DRY: readonly Localized[] = [
    { es: 'HOLA OTRA VEZ.', en: 'HELLO AGAIN.' },
    { es: 'SÍ. HOLA.', en: 'YES. HELLO.' },
    { es: 'SIGO ACÁ.', en: 'STILL HERE.' },
];

/** 5–6 · Te lo pide. Todavía con educación. */
const ANNOYED: readonly Localized[] = [
    { es: 'DÉJEME TRABAJAR.', en: 'LET ME WORK.' },
    { es: 'ESTOY TRABAJANDO. DÉJEME.', en: 'I AM WORKING. LET ME.' },
];

/** 7 · La ausencia de una frase. Igual en los dos idiomas. */
const SILENCE = '...';

/** 8 · Lo dice, y lo hace. */
const KICK: Localized = {
    es: 'HASTA ACÁ LLEGAMOS.',
    en: 'THAT IS ENOUGH.',
};

export interface GreetingReply {
    text: string;
    /** Si además de contestar, te saca de la nota. */
    kick: boolean;
}

function pick(repertorio: readonly Localized[], lang: Lang, random: Random): string {
    const i = Math.min(repertorio.length - 1, Math.floor(random() * repertorio.length));
    return repertorio[i][lang];
}

/**
 * Qué contesta a este saludo.
 *
 * Los tramos son 1–2 cálido, 3–4 seco, 5–6 pedido, 7 silencio, 8 te va. La
 * progresión importa más que los textos: enfadarse de golpe se leería como un
 * error de la app, y cansarse despacio se lee como carácter.
 */
export function greetingFor(
    count: number,
    lang: Lang,
    random: Random = Math.random
): GreetingReply {
    if (count >= KICK_AT) return { text: KICK[lang], kick: true };
    if (count >= 7) return { text: SILENCE, kick: false };
    if (count >= 5) return { text: pick(ANNOYED, lang, random), kick: false };
    if (count >= 3) return { text: pick(DRY, lang, random), kick: false };
    return { text: pick(WARM, lang, random), kick: false };
}
