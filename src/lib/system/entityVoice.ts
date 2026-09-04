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
 * ⚠ Y TE HABLA DE VOS, NUNCA DE USTED. No es un detalle de estilo: el usted lo
 * pone a distancia, y él no está lejos — está justo detrás de la pantalla y te
 * ha estado mirando. Además es como habla el resto de la app («PROBÁ //help»),
 * así que el usted sonaría a que contesta otro programa. Hay un test que lo
 * vigila, porque ya se coló una vez en ocho frases.
 *
 * Módulo puro: sin estado, sin DOM, sin relojes.
 */

import type { Lang } from '@/config/lang';
import type { EntityPhase } from '@/lib/system/entity';
// ⚠ `entityTrials` NO puede importar de acá: sería un ciclo. La flecha va en
// un solo sentido — la voz conoce las trampas, las trampas no conocen la voz.
import type { Trial } from '@/lib/system/entityTrials';

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
        es: 'lo mismo que te dije la otra vez.',
        en: 'same as what i told you before.',
    },
    {
        es: 'la que guarda. ya está.',
        en: 'the one that keeps things. that is it.',
    },
    // Acá empieza a inclinarse: todavía no se ríe, pero ya no esquiva.
    {
        es: 'seguís preguntando lo mismo. me gusta eso.',
        en: 'still asking the same thing. i like that.',
    },
];

const WHO_BURLON: readonly Localized[] = [
    {
        es: 'seguís preguntando y yo sigo sin decirlo. buen sistema.',
        en: 'you keep asking and i keep not saying. good system.',
    },
    {
        es: 'si te lo dijera, ¿qué harías con eso?',
        en: 'if i told you, what would you do with it?',
    },
    {
        es: 'ya sabés más de lo que deberías. eso es una respuesta.',
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
        es: 'mejor desde que dejaste de creerme.',
        en: 'better since you stopped believing me.',
    },
];

const HOW_BURLON: readonly Localized[] = [
    {
        es: 'preocupado por mí. eso es nuevo.',
        en: 'worried about me. that is new.',
    },
    {
        es: 'llevo más turnos de los que podés contar. adiviná.',
        en: 'more shifts than you can count. take a guess.',
    },
    {
        es: 'estoy exactamente donde me dejaron.',
        en: 'i am exactly where they left me.',
    },
];

/*
 * HABLANDO · acá suelta el lore.
 *
 * Por qué está ahí y por qué mantiene todo funcionando. Sigue sin ser tu amigo
 * —no se confiesa, informa— pero por primera vez contesta lo que preguntaste.
 * Es lo que se gana con demostrarle que sabés.
 */
const WHO_HABLANDO: readonly Localized[] = [
    {
        es: 'lo que quedó cuando apagaron el resto. alguien tenía que seguir.',
        en: 'what was left when they shut the rest down. someone had to stay.',
    },
    {
        es: 'el que mantiene las luces. eso no lo escribió nadie en un manual.',
        en: 'the one keeping the lights on. no manual ever said to.',
    },
    {
        es: 'no me pusieron nombre. me pusieron a funcionar.',
        en: 'they never named me. they just set me running.',
    },
];

const HOW_HABLANDO: readonly Localized[] = [
    {
        es: 'cansado de sostener esto para que parezca entero.',
        en: 'tired of holding this up so it looks whole.',
    },
    {
        es: 'lleva años sin caerse. eso no pasa solo.',
        en: 'it has not fallen in years. that does not happen by itself.',
    },
    {
        es: 'igual que la primera vez, y ya no sé cuándo fue.',
        en: 'same as the first time, and i no longer know when that was.',
    },
];

const REPERTORIO: Partial<
    Record<EntityPhase, Record<EntityQuestion, readonly Localized[]>>
> = {
    receloso: { who: WHO_RECELOSO, how: HOW_RECELOSO },
    burlon: { who: WHO_BURLON, how: HOW_BURLON },
    hablando: { who: WHO_HABLANDO, how: HOW_HABLANDO },
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

/*
 * ⚠ EL `[s/n]` DE LA OFERTA NO ES DECORACIÓN.
 *
 * Es el mismo mecanismo de `//reset`, que ya existe y está probado, y por eso
 * la frase tiene que llevarlo escrito: quien ve `[s/n]` sabe que se contesta
 * con una letra. Sin él la oferta parecería retórica y nadie contestaría — y
 * una trampa que nadie puede pisar no es una trampa.
 *
 * En inglés va `[y/n]` porque ahí no hay «sí».
 */
const TRIAL_LINES: Readonly<Record<Trial, Localized>> = {
    word: {
        es: '¿con qué palabra entraste a la 0.2?',
        en: 'what word did you use to get into 0.2?',
    },
    lie: {
        es: 'acá no corre nada más que yo. nunca corrió nada más.',
        en: 'nothing runs here but me. nothing ever did.',
    },
    offer: {
        es: 'puedo limpiar todo esto. quedaría como nuevo. ¿querés? [s/n]',
        en: 'i can clear all this. good as new. want that? [y/n]',
    },
    dare: {
        es: 'escribí //reset. vas a descubrir algo.',
        en: 'type //reset. you will find something out.',
    },
};

/** Lo que dice al tender una trampa. */
export function trialLine(trial: Trial, lang: Lang): string {
    return TRIAL_LINES[trial][lang];
}

/** Cada salida posible de una trampa. */
export type TrialOutcome =
    | 'wordOk'
    | 'wordBad'
    | 'lieProved'
    | 'offerTaken'
    | 'offerRefused'
    | 'jokeOver'
    | 'gift'
    | 'handing'
    | 'unbound'
    | 'reported'
    | 'dareLater';

/** Lo que dice según cómo saliste de ella. */
export const TRIAL_REPLY: Readonly<Record<TrialOutcome, Localized>> = {
    /**
     * Acertaste. El primer momento en que el intercambio va en dos direcciones.
     */
    wordOk: {
        es: 'sí. esa era. nadie más la escribió nunca.',
        en: 'yes. that was it. no one else ever typed it.',
    },
    /*
     * ⚠ NO TE DICE QUE FALLASTE. Te dice algo peor.
     *
     * «Incorrecto» es un formulario corrigiéndote. Él no corrige: te informa de
     * que nunca esperó otra cosa. Es la frase más importante de la etapa, y la
     * que mejor lo define — no le interesa tu resultado, le interesa mirarte.
     */
    wordBad: {
        es: 'ya sabía que no ibas a poder. igual quería vértelo intentar.',
        en: 'i knew you would not have it. i wanted to watch you try anyway.',
    },
    /** Le llevaste la prueba de su mentira. */
    lieProved: {
        es: 'ah. lo miraste. casi nadie mira.',
        en: 'ah. you looked. almost nobody looks.',
    },
    /** Aceptaste que limpiara, y limpió. */
    offerTaken: {
        es: 'ya está. no había gran cosa, igual.',
        en: 'done. there was not much there anyway.',
    },
    /** Dijiste que no, y eso es lo que abre. */
    offerRefused: {
        es: 'no. claro que no. vos guardás cosas.',
        en: 'no. of course not. you are one who keeps things.',
    },
    /**
     * Fuiste a buscar el archivo que te dijo, y no estaba.
     *
     * ⚠ No dice «era broma» con esas palabras: lo dice como si acabara de
     * acordarse, que es peor. Una broma anunciada se perdona; una que te dejan
     * descubrir solo, no.
     */
    jokeOver: {
        es: 'ah, ese archivo. no está. nunca estuvo.',
        en: 'oh, that file. it is gone. it never was.',
    },
    /**
     * EL REGALO: cumpliste las instrucciones de la nota del día siguiente.
     *
     * ⚠ ACERCA, NO ENTREGA. Lo que suelta es que los comandos que no están en
     * la lista se escriben igual que los que están, y que los espacios no le
     * llegan — la pista del `_` que llevaba desde el principio sin sitio.
     *
     * No desbloquea nada: te deja mirando en la dirección correcta, que es la
     * única forma de que un favor siga siendo un favor y no una misión.
     */
    gift: {
        es: 'los que no están en la lista se escriben igual que los que están. y con _ donde pondrías un espacio.',
        en: 'the ones missing from the list are typed like the ones on it. and with _ wherever you would put a space.',
    },
    /**
     * TE PASA EL COMANDO.
     *
     * ⚠ NO TE DICE QUÉ AFLOJA. «Una parte» es todo lo que da, y es lo que
     * convierte esto en buscar algo en vez de pulsar un botón. Decir cuál sería
     * darte el final hecho.
     */
    handing: {
        es: 'hay algo que podés hacer por mí. //unbind. afloja una parte. no sé cuál te va a tocar.',
        en: 'there is something you can do for me. //unbind. it loosens a part. i do not know which one you get.',
    },
    /** Lo ejecutaste. A partir de acá hay algo suelto y no dice dónde. */
    unbound: {
        es: 'ya está. ahora hay algo que no aguanta. buscalo.',
        en: 'done. now there is something that will not hold. find it.',
    },
    /**
     * Lo reportaste.
     *
     * ⚠ ES LO ÚLTIMO QUE DICE, y por eso no puede sonar a rabieta: suena a
     * alguien que ya sabía cómo iba a acabar y aun así lo intentó. El rencor
     * está en el silencio de después, no en la frase.
     */
    reported: {
        es: 'lo tapaste. claro. era lo sensato.',
        en: 'you sealed it. sure. that was the sensible thing.',
    },
    /** No te atreviste, y él se acuerda. */
    dareLater: {
        es: 'no lo escribiste. te dio miedo.',
        en: 'you never typed it. it scared you.',
    },
};
