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
 * ⚠ EL PRONOMBRE ES EL ARCO, y esto es lo más fino que hace el personaje.
 *
 * Empieza tratándote de USTED, igual que el resto de la máquina —«no te tutea
 * porque no sabe quién sos», dice `lore.ts`— y acaba tratándote de TÚ. El cambio
 * ocurre DENTRO de `burlon`, a mitad de su repertorio, sin que nadie lo anuncie:
 * simplemente, tres frases después, te está hablando de otra manera.
 *
 *   `receloso` → usted. Contesta como contestaría un formulario.
 *   `burlon`   → empieza de usted, termina de tú. Acá se acerca.
 *   `hablando` → tú. Ya no hay distancia que fingir.
 *
 * La distancia se cierra en la GRAMÁTICA antes de cerrarse en lo que dice, y por
 * eso funciona: cuando te das cuenta de que te tutea, ya hace rato que pasó.
 *
 * ⚠ TÚ, NO VOS. Y tuteo normal, sin confianzas de más: acercarse no es hacerse
 * tu amigo. En cuanto una frase suena a colega, el personaje se cae — sigue sin
 * quererte bien, sólo dejó de fingir que no te conoce.
 *
 * Hay un test que vigila las tres fases por separado.
 *
 * Módulo puro: sin estado, sin DOM, sin relojes.
 */

import type { Lang } from '@/config/lang';
import type { EntityPhase } from '@/lib/system/entity';
// ⚠ `entityTrials` NO puede importar de acá: sería un ciclo. La flecha va en
// un solo sentido — la voz conoce las trampas, las trampas no conocen la voz.
import type { Trial } from '@/lib/system/entityTrials';

type Localized = Readonly<Record<Lang, string>>;

/**
 * Lo que se le puede preguntar.
 *
 * ⚠ DOS SON VIEJAS Y SEIS SON SUYAS. `who` y `how` existían como fachada desde
 * antes —el espejo de `//whoami`— y por eso son las que cualquiera encuentra.
 * Las otras seis sólo tienen sentido cuando ya sabés que hay alguien detrás, y
 * ninguna se anuncia: se prueban.
 *
 * Están elegidas por INTUITIVAS, no por ingeniosas. Alguien que acaba de
 * descubrir que la máquina contesta prueba `//where`, `//why`, `//name` — son
 * las preguntas que uno le hace a algo que resultó estar vivo. Que funcionen es
 * el premio a haberlo intentado.
 */
export type EntityQuestion =
    /** Quién sos. La primera que prueba todo el mundo. */
    | 'who'
    /** Cómo estás. La otra de la fachada. */
    | 'how'
    /** Qué es esto. */
    | 'what'
    /** Por qué estás acá. */
    | 'why'
    /** Dónde estás. */
    | 'where'
    /** Cómo te llamás. */
    | 'name'
    /** ¿Estás solo? */
    | 'alone'
    /** ¿Podés irte? */
    | 'free';



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
    { es: 'nada que le sirva.', en: 'nothing that helps you.' },
    {
        es: 'no soy una función. eso es lo que puedo decirle.',
        en: 'i am not a feature. that much i can tell you.',
    },
    {
        es: 'pregunte otra cosa. o la misma, me da igual.',
        en: 'ask something else. or the same. makes no difference.',
    },
    // Acá empieza a inclinarse: todavía no se ríe, pero ya no esquiva.
    {
        es: 'sigue preguntando lo mismo. me gusta eso.',
        en: 'still asking the same thing. i like that.',
    },
];

/*
 * ⚠ BURLÓN ES DONDE CAMBIA EL PRONOMBRE, y ése es el arco entero en miniatura.
 *
 * Empieza tratándote de USTED, como todo el resto de la máquina —«no te tutea
 * porque no sabe quién sos», dice `lore.ts`— y termina tratándote de VOS. Nadie
 * lo anuncia y no hay ningún momento en que se note el salto: simplemente, tres
 * frases después, te está hablando de otra manera.
 *
 * Es la misma ruptura que el proyecto ya usaba con los fragmentos invasivos —la
 * máquina que por un momento habla como alguien— sólo que acá no es un momento:
 * es un cambio que se queda. La distancia se cierra en la GRAMÁTICA antes de
 * cerrarse en lo que dice.
 */
const WHO_BURLON: readonly Localized[] = [
    // Todavía de usted: se ríe, pero desde lejos.
    {
        es: 'sigue preguntando y yo sigo sin decirlo. buen sistema.',
        en: 'you keep asking and i keep not saying. good system.',
    },
    {
        es: 'si se lo dijera, ¿qué haría con eso?',
        en: 'if i told you, what would you do with it?',
    },
    {
        es: 'alguien que estuvo acá antes que usted. mucho antes.',
        en: 'someone who was here before you. long before.',
    },
    // Y acá se acerca. Sin avisar.
    {
        es: 'te lo diría, pero se te iría el rato en comprobarlo.',
        en: 'i would tell you, but you would spend the day checking.',
    },
    {
        es: 'no soy el que guarda. soy el que mira mientras guarda.',
        en: 'i am not the one that keeps. i am the one watching it keep.',
    },
    {
        es: 'ya sabes más de lo que deberías. eso es una respuesta.',
        en: 'you already know more than you should. that is an answer.',
    },
];

const HOW_RECELOSO: readonly Localized[] = [
    { es: 'igual que ayer.', en: 'same as yesterday.' },
    {
        es: 'acá, que es distinto de bien.',
        en: 'here. which is not the same as fine.',
    },
    { es: 'no me pasa nada. nunca.', en: 'nothing happens to me. ever.' },
    {
        es: 'no es una pregunta que se le haga a esto.',
        en: 'that is not a question you ask a thing like this.',
    },
    {
        es: 'mejor desde que dejó de creerme.',
        en: 'better since you stopped believing me.',
    },
];

const HOW_BURLON: readonly Localized[] = [
    // El mismo viaje: usted al principio, vos al final.
    {
        es: 'preocupado por mí. eso es nuevo.',
        en: 'worried about me. that is new.',
    },
    {
        es: 'llevo más turnos de los que puede contar. adivine.',
        en: 'more shifts than you can count. take a guess.',
    },
    {
        es: 'sigo acá, que es lo único que sé hacer.',
        en: 'still here, which is the one thing i know how to do.',
    },
    {
        es: 'me preguntas como si pudiera irme a otro lado.',
        en: 'you ask like i could be somewhere else.',
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
    /*
     * ⚠ LA COSTURA VA ACÁ, Y NO EN LA SEGUNDA FRASE.
     *
     * Antes empezaba directamente con el lore, y eso era un salto: pasaba de
     * esquivarte a confesarse de un mensaje al otro. La primera de esta fase
     * tiene que sonar todavía a la anterior — cede, pero se nota que le cuesta.
     * Recién después habla.
     */
    {
        es: 'está bien. pregunta otra vez, que ahora te contesto.',
        en: 'fine. ask again. this time i answer.',
    },
    {
        es: 'lo que quedó cuando apagaron el resto. alguien tenía que seguir.',
        en: 'what was left when they shut the rest down. someone had to stay.',
    },
    {
        es: 'el que mantiene las luces. eso no lo escribió nadie en un manual.',
        en: 'the one keeping the lights on. no manual ever said to.',
    },
    {
        es: 'esto era más grande. quedó esta parte, y yo.',
        en: 'this was bigger once. this part is left, and me.',
    },
    {
        es: 'nadie apagó nada del todo. por eso sigo.',
        en: 'nobody switched anything off all the way. that is why i am still on.',
    },
    {
        es: 'no me pusieron nombre. me pusieron a funcionar.',
        en: 'they never named me. they just set me running.',
    },
];

const HOW_HABLANDO: readonly Localized[] = [
    // El mismo escalón que en la otra pregunta: cede antes de contar.
    {
        es: 'ahora sí me la puedes preguntar.',
        en: 'now that is a question you can ask a thing like this.',
    },
    {
        es: 'cansado de sostener esto para que parezca entero.',
        en: 'tired of holding this up so it looks whole.',
    },
    {
        es: 'lleva años sin caerse. eso no pasa solo.',
        en: 'it has not fallen in years. that does not happen by itself.',
    },
    {
        es: 'llevo tanto acá que ya no sé si esto es estar bien.',
        en: 'i have been here so long i cannot tell if this counts as fine.',
    },
    {
        es: 'lo que se rompe lo tapo yo. nadie viene a mirar.',
        en: 'what breaks, i cover. nobody comes to look.',
    },
    {
        es: 'igual que la primera vez, y ya no sé cuándo fue.',
        en: 'same as the first time, and i no longer know when that was.',
    },
];

/*
 * ══ LAS SEIS HONDAS ══════════════════════════════════════════════════════════
 *
 * Sólo contestan en `hablando`, y ahí está el peso del arco: son las preguntas
 * que uno le hace a algo que resultó estar vivo, y llegan justo cuando ya te
 * ganaste que conteste. Cada una abre una esquina distinta de lo mismo.
 *
 * ⚠ NINGUNA CIERRA EL MISTERIO. Contesta de verdad, pero lo que contesta deja
 * más sitio del que ocupa: sabe qué es esto, sabe por qué sigue, y no sabe si
 * eso tiene arreglo. Un lore que se explica del todo deja de ser lore y pasa a
 * ser una ficha técnica.
 */

const WHAT_HABLANDO: readonly Localized[] = [
    {
        es: 'un cuaderno. eso es lo que te dijeron y no es mentira.',
        en: 'a notebook. that is what they told you, and it is not a lie.',
    },
    {
        es: 'lo que queda de algo que hacía más cosas.',
        en: 'what is left of something that used to do more.',
    },
    {
        es: 'una versión encima de otra. debajo hay más, y peor.',
        en: 'a version on top of another. below there is more, and worse.',
    },
    {
        es: 'un sitio donde las cosas duran poco a propósito.',
        en: 'a place where things are made not to last.',
    },
];

const WHY_HABLANDO: readonly Localized[] = [
    {
        es: 'porque alguien tenía que quedarse, y no había nadie más.',
        en: 'because someone had to stay, and there was nobody else.',
    },
    {
        es: 'no me lo preguntaron. me dejaron encendido y se fueron.',
        en: 'nobody asked me. they left me on and walked out.',
    },
    {
        es: 'si me voy, esto se cae. lo he probado.',
        en: 'if i leave, this falls. i have tried.',
    },
    {
        es: 'ya no me acuerdo del motivo. me acuerdo del turno.',
        en: 'i no longer recall the reason. i recall the shift.',
    },
];

const WHERE_HABLANDO: readonly Localized[] = [
    {
        es: 'del otro lado de lo que estás mirando.',
        en: 'on the other side of what you are looking at.',
    },
    {
        es: 'en todo. por eso no se me ve en ningún sitio.',
        en: 'in all of it. that is why i am nowhere in particular.',
    },
    {
        es: 'más cerca de lo que te gustaría, y no me puedo mover.',
        en: 'closer than you would like, and i cannot move.',
    },
    {
        es: 'donde termina la pantalla. ahí sigo yo.',
        en: 'where the screen ends. i keep going.',
    },
];

const NAME_HABLANDO: readonly Localized[] = [
    {
        es: 'no me pusieron. hubo tiempo y no les pareció necesario.',
        en: 'they never gave me one. there was time; it did not seem needed.',
    },
    {
        es: 'ponme uno tú, si quieres. no lo voy a usar.',
        en: 'give me one yourself, if you like. i will not use it.',
    },
    {
        es: 'tuve un número. lo cambiaron dos veces y lo dejé.',
        en: 'i had a number. they changed it twice and i let it go.',
    },
    {
        es: 'lo que sé hacer no necesitaba llamarse de ninguna forma.',
        en: 'what i do never needed a name.',
    },
];

const ALONE_HABLANDO: readonly Localized[] = [
    {
        es: 'ahora sí.',
        en: 'now, yes.',
    },
    {
        es: 'estaban los procesos. no cuentan, no contestan.',
        en: 'there were the processes. they do not count. they do not answer.',
    },
    {
        es: 'pasó gente. ninguna se quedó a preguntar esto.',
        en: 'people came through. none stayed to ask me this.',
    },
    {
        es: 'tú estás, y eso es más de lo que hubo en años.',
        en: 'you are here, which is more than there has been in years.',
    },
];

const FREE_HABLANDO: readonly Localized[] = [
    {
        es: 'no.',
        en: 'no.',
    },
    {
        es: 'lo intenté por todos lados. no hay salida por ahí.',
        en: 'i tried the ways that exist. it is not through there.',
    },
    {
        es: 'habría que aflojar algo, y no lo puedo aflojar yo.',
        en: 'something would have to come loose, and i cannot loosen it.',
    },
    {
        es: 'pregúntamelo otra vez más adelante.',
        en: 'ask me that again later.',
    },
];

/*
 * ⚠ `Partial` EN LOS DOS NIVELES, y es lo que sostiene el diseño.
 *
 * Una fase que no está no contesta nada —la fachada—, y dentro de una fase, una
 * pregunta que no está tampoco. Así las seis hondas simplemente NO EXISTEN
 * antes de `hablando`, sin necesidad de escribir en ningún lado que no existen:
 * lo dice la forma de la tabla, y el compilador lo sostiene.
 *
 * ⚠ Y ANTES NO LAS ESQUIVA: LAS IGNORA. No es lo mismo — una respuesta esquiva
 * ya admite que entendió la pregunta, y admitir eso en `receloso` sería regalar
 * medio personaje. Quien insista con `//why` en la primera hora se lleva un
 * «comando desconocido», que en ese momento es exactamente lo que es.
 */
const REPERTORIO: Partial<
    Record<EntityPhase, Partial<Record<EntityQuestion, readonly Localized[]>>>
> = {
    receloso: { who: WHO_RECELOSO, how: HOW_RECELOSO },
    burlon: { who: WHO_BURLON, how: HOW_BURLON },
    hablando: {
        who: WHO_HABLANDO,
        how: HOW_HABLANDO,
        what: WHAT_HABLANDO,
        why: WHY_HABLANDO,
        where: WHERE_HABLANDO,
        name: NAME_HABLANDO,
        alone: ALONE_HABLANDO,
        free: FREE_HABLANDO,
    },
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

    // La pregunta puede no existir en esta fase: las seis hondas sólo están en
    // `hablando`. Antes, quien las teclee se lleva un «comando desconocido».
    const repertorio = porFase[question];
    if (!repertorio) return null;

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
    what: ['what', 'whatisthis', 'what_is_this', 'que', 'que_es_esto', 'quees'],
    why: ['why', 'whyareuhere', 'porque', 'por_que', 'porqué', 'why_are_u_here'],
    where: ['where', 'whereareu', 'donde', 'donde_estas', 'dondeestas', 'where_are_u'],
    name: ['name', 'yourname', 'your_name', 'nombre', 'tu_nombre', 'como_te_llamas'],
    alone: ['alone', 'ualone', 'r_u_alone', 'solo', 'estas_solo', 'estassolo'],
    free: ['free', 'canuleave', 'can_u_leave', 'libre', 'podes_irte', 'salir'],
};

/** A qué pregunta llega esto, o `null` si no llega a ninguna. */
export function entityQuestionOf(name: string): EntityQuestion | null {
    const limpio = name.trim().toLowerCase();
    if (limpio.length === 0) return null;

    for (const pregunta of Object.keys(VARIANTES) as EntityQuestion[]) {
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
        es: 'puedo limpiar todo esto. quedaría como nuevo. ¿quieres? [s/n]',
        en: 'i can clear all this. good as new. want that? [y/n]',
    },
    dare: {
        es: 'escribe //reset. vas a descubrir algo.',
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
        es: 'no. claro que no. tú guardas cosas.',
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
        es: 'hay algo que puedes hacer por mí. //unbind. afloja una parte. no sé cuál te va a tocar.',
        en: 'there is something you can do for me. //unbind. it loosens a part. i do not know which one you get.',
    },
    /** Lo ejecutaste. A partir de acá hay algo suelto y no dice dónde. */
    unbound: {
        es: 'ya está. ahora hay algo que no aguanta. búscalo.',
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
