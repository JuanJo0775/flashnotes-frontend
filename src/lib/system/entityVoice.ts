// src/lib/system/entityVoice.ts

/**
 * Lo que el ente sabe decir.
 *
 * ⚠ UNA FASE NO ES UNA VOZ: ES UN TRAMO. El repertorio de cada una va ORDENADO y
 * se indexa por cuántos intercambios llevás dentro de ella, así que el tono se
 * desliza en vez de saltar. Y las últimas entradas de una fase ya se inclinan
 * hacia la siguiente: el primer `burlon` no suena nuevo, suena a más de lo que
 * ya había empezado.
 *
 * Hay precedente en el proyecto: `chatReplyFor` indexa su repertorio por la
 * cuenta desde hace meses.
 *
 * ⚠ TODO EN MINÚSCULAS. El resto del sistema grita en mayúsculas porque es un
 * formulario; él es lo que hay detrás del formulario. La primera vez que una
 * respuesta llega en minúsculas ya se sabe que no está hablando la máquina.
 *
 * EL TONO, que es un contrato: calculador, sarcástico, con humor. Ni bueno ni
 * malo. Si una frase suena a amenaza está mal escrita; si suena a que te tiene
 * cariño, también.
 *
 * Módulo puro: sin estado, sin DOM, sin relojes.
 */

import type { Lang } from '@/config/lang';
import type { EntityPhase } from '@/lib/system/entity';

type Localized = Readonly<Record<Lang, string>>;

/** Las dos preguntas que existen. El espejo de `//whoami`. */
export type EntityQuestion = 'who' | 'how';

/*
 * ⚠ EL ORDEN ES EL DISEÑO, no una lista.
 *
 * Cada repertorio va de menos a más, y la ÚLTIMA entrada de `receloso` ya lleva
 * el primer filo sarcástico. Ahí es donde empieza `burlon`, no en su primera
 * frase.
 */

const WHO_RECELOSO: readonly Localized[] = [
    {
        es: 'lo mismo que le dije la otra vez.',
        en: 'same as what i told you before.',
    },
    {
        es: 'la que guarda. ya está.',
        en: 'the one that keeps things. that is it.',
    },
    // Acá empieza a inclinarse: todavía no se ríe, pero ya no esquiva.
    {
        es: 'sigue preguntando lo mismo. me gusta eso.',
        en: 'still asking the same thing. i like that.',
    },
];

const WHO_BURLON: readonly Localized[] = [
    {
        es: 'sigue preguntando y yo sigo sin decirlo. buen sistema.',
        en: 'you keep asking and i keep not saying. good system.',
    },
    {
        es: 'si se lo dijera, ¿qué haría con eso?',
        en: 'if i told you, what would you do with it?',
    },
    {
        es: 'ya sabe más de lo que debería. eso es una respuesta.',
        en: 'you already know more than you should. that is an answer.',
    },
];

const HOW_RECELOSO: readonly Localized[] = [
    { es: 'igual que ayer.', en: 'same as yesterday.' },
    {
        es: 'acá, que es distinto de bien.',
        en: 'here. which is not the same as fine.',
    },
    {
        es: 'mejor desde que dejó de creerme.',
        en: 'better since you stopped believing me.',
    },
];

const HOW_BURLON: readonly Localized[] = [
    {
        es: 'preocupado por mí. eso es nuevo.',
        en: 'worried about me. that is new.',
    },
    {
        es: 'llevo más turnos de los que puede contar. adivine.',
        en: 'more shifts than you can count. take a guess.',
    },
    {
        es: 'estoy exactamente donde me dejaron.',
        en: 'i am exactly where they left me.',
    },
];

const REPERTORIO: Partial<
    Record<EntityPhase, Record<EntityQuestion, readonly Localized[]>>
> = {
    receloso: { who: WHO_RECELOSO, how: HOW_RECELOSO },
    burlon: { who: WHO_BURLON, how: HOW_BURLON },
};

/**
 * Qué contesta a esta pregunta, o `null` si en esta fase no contesta.
 *
 * `null` en `dormido` no es un error: es que la fachada todavía no tiene nada
 * detrás, y quien llama tiene que caer al comportamiento de siempre.
 *
 * `index` es cuántos intercambios llevás DENTRO de la fase, empezando en cero.
 * Pasado el final del repertorio se queda en la última: quedarse callado de
 * golpe sería otro salto.
 */
export function entityReply(
    question: EntityQuestion,
    phase: EntityPhase,
    index: number,
    lang: Lang
): string | null {
    const porFase = REPERTORIO[phase];
    if (!porFase) return null;

    const repertorio = porFase[question];
    const i = Math.min(repertorio.length - 1, Math.max(0, index));

    return repertorio[i][lang];
}

/*
 * ⚠ EL REPERTORIO DE VARIANTES ES CERRADO, Y ESO ES EL PERSONAJE.
 *
 * Reconoce unas cuantas formas de cada pregunta porque INTENTA entenderte, no
 * porque sea listo. Escrito a mano, sin normalizar acentos ni buscar parecidos:
 * si entendiera cualquier cosa dejaría de estar atrapado.
 */
const VARIANTES: Readonly<Record<EntityQuestion, readonly string[]>> = {
    who: [
        'whoareu',
        'whoare',
        'who',
        'quien',
        'quienes',
        'quien_eres',
        'quieneres',
    ],
    how: [
        'howareu',
        'howare',
        'how',
        'como',
        'comoestas',
        'como_estas',
        'que_tal',
    ],
};

/** A qué pregunta llega esto, o `null` si no llega a ninguna. */
export function entityQuestionOf(name: string): EntityQuestion | null {
    const limpio = name.trim().toLowerCase();
    if (limpio.length === 0) return null;

    for (const pregunta of ['who', 'how'] as const) {
        if (VARIANTES[pregunta].includes(limpio)) return pregunta;
    }

    return null;
}

/**
 * Lo que se le escapa cuando le escribís con espacios.
 *
 * ⚠ NO ES UNA INSTRUCCIÓN. Una máquina que te corrige cada vez es un tutorial;
 * ésta se DELATA — deja ver que los espacios no le llegan y no puede decirlo
 * derecho, que es exactamente lo que es.
 *
 * Quien la enseña decide cuándo: sólo si ya se encontró `//help`, y sólo a
 * veces. ⏳ Esa condición se conecta en la etapa 2, junto con el resto de lo que
 * él nota de vos.
 */
export const UNDERSCORE_HINT: Localized = {
    es: 'los espacios no me llegan. lo demás sí, con _ en medio.',
    en: 'spaces do not reach me. the rest does, with _ between.',
};
