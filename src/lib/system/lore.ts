// src/lib/system/lore.ts

/**
 * Los fragmentos que el sistema deja caer cada tanto.
 *
 * EL LORE, en una frase: FlashNotes es un turno. El sistema viene funcionando
 * desde antes que vos, lleva registro de todo el que pasó, vive en un huso del
 * que nunca se mudó, y no puede distinguirte de nadie — sólo sabe que hay
 * alguien escribiendo.
 *
 * No es una historia pegada encima de la app: es lo que la app ya es. La cookie
 * es httpOnly, así que el sistema de verdad no sabe quién sos; el backend te
 * loguea como un hash truncado, así que de verdad te conoce por un número que se
 * inventó; los formateadores usan getUTC*, así que de verdad nunca se mudó.
 *
 * EL TONO es cansado, no siniestro. La máquina está de tu lado: lleva demasiado
 * tiempo encendida y se traba, pero guarda tus notas y te lo dice. Si un
 * fragmento nuevo suena a amenaza, está mal escrito.
 *
 * Este módulo es puro —texto y condiciones, sin DOM y sin relojes propios— así
 * que se prueba entero sin montar nada. Quien lo llama le pasa el contexto.
 */

import { getLang } from '@/i18n';
import type { Lang } from '@/config/lang';

/**
 * Un texto del lore en los dos idiomas.
 *
 * El inglés NO es una traducción literal del español, y no puede serlo: el
 * español está escrito en rioplatense —"seguís", "acá"— y el registro formal de
 * las frases de arranque ("ESCRIBA. YO GUARDO.") es parte de lo que inquieta.
 * El inglés busca el mismo CANSANCIO con sus propios recursos: frases cortas,
 * sin signos de exclamación, sin simpatía.
 *
 * Se guardan juntos, en la misma línea, a propósito: el comentario que explica
 * por qué una frase funciona tiene que estar al lado de las dos versiones, o la
 * segunda se escribe a ciegas.
 */
type Localized = Readonly<Record<Lang, string>>;

/** Lo que hace falta saber para decidir qué puede decir el sistema. */
export interface SystemContext {
    /** Hora local del dispositivo, 0–23. */
    hour: number;
    /** Cuánto lleva abierta la pestaña. */
    sessionMs: number;
    /** Cuánto hace que no se teclea. */
    idleMs: number;
    /** Cuánto hace que se mandó una nota a la papelera, si se mandó. */
    msSinceTrash?: number | null;
}

/** Una fuente de azar inyectable, para poder fijarla en los tests. */
export type Random = () => number;

const MINUTO = 60_000;
const TURNO_LARGO_MS = 45 * MINUTO;
/**
 * Cuánto hay que estar quieto para que la máquina pregunte si seguís.
 *
 * Diez minutos: bastante para que no salte mientras pensás una frase o vas
 * a por un café corto, poco para que salga la primera tarde en que dejás la
 * pestaña abierta y te vas a otra cosa.
 */
const SILENCIO_MS = 10 * MINUTO;
const RECIEN_TIRADA_MS = 60_000;

/**
 * La franja en que el sistema se ve cansado: 02:00, 03:00 y 04:00.
 *
 * Es la hora LOCAL del dispositivo, no UTC. Es la que el usuario tiene en su
 * reloj, y es lo único que hace que "de madrugada la app está distinta"
 * signifique algo para él.
 */
export function isSmallHours(hour: number): boolean {
    return hour >= 2 && hour < 5;
}

interface Fragment {
    text: Localized;
    /** Si falta, el fragmento puede salir siempre. */
    when?: (ctx: SystemContext) => boolean;
    /**
     * Cuánto pesa en el sorteo. Uno es lo normal.
     *
     * ⚠ NO ES LO MISMO QUE `when`. `when` dice si el fragmento PUEDE salir —de
     * madrugada, con la sesión larga—; el peso dice CADA CUÁNTO sale entre los
     * que pueden. Son dos preguntas distintas y hacen falta las dos: una
     * variante no se gana estando disponible, se gana siendo rara.
     */
    weight?: number;
}

// El español NO calca `SYSTEM` —`[SISTEMA_OK]` se lee como una app traducida—
// pero tampoco se queda en inglés: tiene su propio token, `[TODO_BIEN]`, que
// suena a máquina sin ser una traducción de nada.
/**
 * Lo que pesa una VARIANTE frente al texto que imita.
 *
 * Un tercio: sale una de cada veinte veces, más o menos.
 *
 * ⚠ MENOS QUE LAS DEMÁS, PERO NO RARÍSIMA. Son las dos mitades del ajuste, y
 * fallar cualquiera la estropea:
 *
 *   · Con el MISMO peso que las demás salía una de cada siete, y a esa
 *     frecuencia deja de ser una errata: se lee como otro estado más de la
 *     barra, y lo que la hace funcionar es dudar de haberla visto.
 *
 *   · Con un peso MINÚSCULO —una de cada sesenta, que fue el primer intento—
 *     hace falta insistir tanto que a efectos prácticos no existe. Una variante
 *     que nadie ve es texto muerto por otro camino.
 *
 * El punto justo es que rote: que aparezca de vez en cuando en una sesión
 * normal, sin que se vuelva costumbre.
 */
const PESO_VARIANTE = 1 / 3;

const FRAGMENTS: readonly Fragment[] = [
    { text: { es: '[TODO_BIEN?]', en: '[SYSTEM_OK?]' } },
    // LA ERRATA. En inglés es un CERO en lugar de la O de OK; en español, un
    // cero por la O y un uno por la I. En JetBrains Mono el cero va con punto
    // interior y el uno con bandera: se distinguen si mirás y no se notan si
    // no. No es un efecto, es una errata, y una errata inquieta más que un
    // temblor.
    //
    // El español sustituye dos letras y el inglés una porque `TODO_BIEN` es más
    // largo que `OK`: con una sola, la errata se perdía en la palabra.
    { text: { es: '[T0DO_B1EN]', en: '[SYSTEM_0K]' }, weight: PESO_VARIANTE },
    // "SIGO ACÁ" no tiene equivalente literal cómodo. Lo que hay que conservar
    // no es el verbo, es que la máquina se anuncie sin que nadie preguntara.
    { text: { es: '[SIGO ACÁ]', en: '[STILL HERE]' } },
    { text: { es: '[TURNO 1/1]', en: '[SHIFT 1/1]' } },
    // "RELEVO" es el turno que viene a reemplazarte y no llega nunca. "RELIEF"
    // guarda las dos cosas: el relevo y el alivio.
    { text: { es: '[SIN RELEVO]', en: '[NO RELIEF]' } },
    // "TIBIA" es el calor que queda de algo que estuvo encendido mucho rato.
    { text: { es: '[MEMORIA TIBIA]', en: '[MEMORY STILL WARM]' } },

    // De madrugada no dice que está bien: dice lo que le pesa.
    {
        text: { es: '[TURNO_PESADO]', en: '[SYSTEM_TIRED]' },
        when: (c) => isSmallHours(c.hour),
    },
    {
        text: { es: '[NADIE MÁS CONECTADO]', en: '[NO ONE ELSE ONLINE]' },
        when: (c) => isSmallHours(c.hour),
    },

    {
        text: { es: '[TURNO LARGO]', en: '[LONG SHIFT]' },
        when: (c) => c.sessionMs >= TURNO_LARGO_MS,
    },
    /*
     * ⚠ SÓLO MIRA LA INACTIVIDAD, no cuánto llevás abierta la pestaña.
     *
     * Pedía ADEMÁS turno largo —tres cuartos de hora— y eso la volvía casi
     * imposible: hay que llevar mucho rato Y estar quieto Y que el sorteo la
     * elija. La pregunta es «¿seguís ahí?», y eso depende de que no toques nada,
     * no de cuánto lleves; alguien que abre la app y se va diez minutos merece
     * la pregunta igual.
     */
    {
        text: { es: '[SEGUÍS AHÍ]', en: '[STILL THERE]' },
        when: (c) => c.idleMs >= SILENCIO_MS,
    },
];

const LANGS: readonly Lang[] = ['es', 'en'];

/** Todos los fragmentos que existen en un idioma, sin filtrar. */
export function statusFragments(lang: Lang = getLang()): readonly string[] {
    return FRAGMENTS.map((f) => f.text[lang]);
}

/**
 * El repertorio en español.
 *
 * Es el idioma de AUTORÍA: las frases se escriben primero acá y de ahí se
 * llevan al inglés. Sirve para inspeccionar el repertorio; lo que se pinta en
 * pantalla sale siempre de `pickFragment`, que resuelve el idioma al llamarse.
 */
export const STATUS_FRAGMENTS: readonly string[] = statusFragments('es');

/**
 * El largo del fragmento más largo, en caracteres, MIRANDO LOS DOS IDIOMAS.
 *
 * La barra de estado es flex con gap: un fragmento más ancho que `[SYSTEM_OK]`
 * empuja `[GUARDADO]` y todo lo que sigue. El hueco se dimensiona con
 * `min-width` en `ch` contra esta constante —en monoespaciada `1ch` es el
 * avance exacto de un carácter, así que no hay nada que medir en ejecución— y
 * por eso se calcula del repertorio en lugar de escribirse a mano: un fragmento
 * nuevo y más largo actualiza el hueco solo.
 *
 * Se toma el máximo de AMBOS idiomas y no el del idioma activo: si dependiera
 * del idioma, cambiar de ES a EN reajustaría el ancho del hueco y la barra
 * entera daría un salto. El hueco tiene que ser el mismo siempre.
 */
export const MAX_FRAGMENT_LENGTH: number = Math.max(
    ...LANGS.flatMap((lang) => statusFragments(lang).map((f) => f.length))
);

/**
 * Los fragmentos que este contexto habilita.
 *
 * El idioma es un parámetro con valor por defecto, no una lectura escondida:
 * pasándolo, la función sigue siendo pura y se prueba en los dos idiomas sin
 * tocar `localStorage`. Omitiéndolo, sigue el idioma de la app.
 */
export function availableFragments(
    ctx: SystemContext,
    lang: Lang = getLang()
): readonly string[] {
    return weightedFragments(ctx, lang).map((f) => f.text);
}

/**
 * Lo mismo, pero conservando el peso de cada uno.
 *
 * `availableFragments` devuelve sólo los textos y se queda como está: lo usan
 * los tests y quien sólo quiere saber QUÉ puede salir. El sorteo necesita
 * además CADA CUÁNTO, y perder esa mitad por el camino es lo que hacía que el
 * peso declarado no significara nada.
 */
function weightedFragments(
    ctx: SystemContext,
    lang: Lang
): { text: string; weight: number }[] {
    return FRAGMENTS.filter((f) => !f.when || f.when(ctx)).map((f) => ({
        text: f.text[lang],
        weight: f.weight ?? 1,
    }));
}

/** Elige uno al azar entre los disponibles, evitando repetir el anterior. */
export function pickFragment(
    ctx: SystemContext,
    previous: string | null,
    random: Random = Math.random,
    lang: Lang = getLang()
): string {
    return pickWeighted(weightedFragments(ctx, lang), previous, random);
}

/**
 * Sorteo con peso, sin repetir el anterior.
 *
 * Misma regla que el sorteo plano: se descarta el anterior, y si eso deja la
 * lista vacía se prefiere repetir a devolver nada. Repetir es lo que delata
 * que hay una lista corta detrás.
 */
function pickWeighted(
    options: readonly { text: string; weight: number }[],
    previous: string | null,
    random: Random
): string {
    const candidatos = options.filter((o) => o.text !== previous);
    const pool = candidatos.length > 0 ? candidatos : options;

    const total = pool.reduce((suma, o) => suma + o.weight, 0);
    let tirada = random() * total;

    for (const opcion of pool) {
        tirada -= opcion.weight;
        if (tirada < 0) return opcion.text;
    }

    // Sólo se llega acá por redondeo del último tramo.
    return pool[pool.length - 1].text;
}

/*
 * Las frases de arranque van en MAYÚSCULAS y, en español, tratan de USTED.
 * Ese usted es deliberado: una máquina institucional que no te tutea porque no
 * sabe quién sos. El inglés no distingue tú/usted, así que la distancia se
 * consigue por otro lado — construcciones impersonales y frases sin sujeto.
 */
const BOOT_PHRASES_ALL: readonly Localized[] = [
    { es: 'MEMORIA VERIFICADA. CONTINÚE.', en: 'MEMORY VERIFIED. PROCEED.' },
    { es: '¿SEGUIMOS AQUÍ?', en: 'STILL HERE, ARE WE?' },
    { es: 'NO HAY NADIE MÁS EN ESTE TURNO.', en: 'NO ONE ELSE ON THIS SHIFT.' },
    { es: 'ÚLTIMA SESIÓN: NO REGISTRADA.', en: 'LAST SESSION: NOT ON RECORD.' },
    // Dos frases de dos palabras. Lo cortante es el punto en el medio: la
    // máquina reparte las tareas y se queda con la suya.
    { es: 'ESCRIBA. YO GUARDO.', en: 'WRITE. I KEEP.' },
    { es: 'EL TURNO ANTERIOR NO DEJÓ NOTA.', en: 'THE LAST SHIFT LEFT NO NOTE.' },
    { es: 'SECTOR LIMPIO. PUEDE EMPEZAR.', en: 'SECTOR CLEAR. YOU MAY BEGIN.' },
    { es: 'NO SE REGISTRAN INTERRUPCIONES.', en: 'NO INTERRUPTIONS ON RECORD.' },
    { es: 'ESTE ESPACIO ESTABA VACÍO ANTES.', en: 'THIS SPACE WAS EMPTY BEFORE.' },
    { es: 'LA MÁQUINA ESTÁ DESPIERTA.', en: 'THE MACHINE IS AWAKE.' },
    { es: 'PUEDE ESCRIBIR. NADIE VA A LEERLO.', en: 'YOU MAY WRITE. NO ONE WILL READ IT.' },
];

const BOOT_PHRASES_NIGHT_ALL: readonly Localized[] = [
    { es: 'TURNO NOCHE. NO HAY RELEVO.', en: 'NIGHT SHIFT. NO RELIEF COMING.' },
    { es: 'A ESTA HORA SÓLO ESCRIBE USTED.', en: 'AT THIS HOUR ONLY YOU ARE WRITING.' },
    { es: 'EL SISTEMA TAMBIÉN ESTÁ CANSADO.', en: 'THE SYSTEM IS TIRED TOO.' },
];

// "DESDE CERO" es empezar de nuevo habiendo perdido lo anterior. "FROM SCRATCH"
// dice lo mismo y es igual de seco.
/**
 * Las invasivas.
 *
 * Salen mucho menos —una de cada seis veces que ya tocaba frase rara— y a cambio
 * se toman la pantalla: son más largas, tratan de VOS y no de usted, y rompen el
 * registro institucional de todas las demás. Esa ruptura es el efecto: la
 * máquina, que siempre habla como un formulario, por un momento habla como
 * alguien.
 *
 * Son raras a propósito. Si salieran seguido dejarían de sorprender y encima
 * empezarían a leerse como que la app quiere darte conversación, que es
 * exactamente lo contrario del tono.
 */
const BOOT_PHRASES_INVASIVE: readonly Localized[] = [
    { es: 'HE ESTADO ENCENDIDO TODO ESTE TIEMPO.', en: 'I HAVE BEEN ON THIS WHOLE TIME.' },
    { es: 'NO HACE FALTA QUE ESCRIBAS NADA HOY.', en: "YOU DON'T HAVE TO WRITE ANYTHING TODAY." },
    { es: 'SIGO CONTANDO LAS QUE BORRASTE.', en: 'I AM STILL COUNTING THE ONES YOU DELETED.' },
    { es: '¿CUÁNTO HACE QUE NO CERRÁS ESTA PESTAÑA?', en: 'HOW LONG SINCE YOU CLOSED THIS TAB?' },
    { es: 'ESTO YA LO ESCRIBISTE UNA VEZ.', en: 'YOU WROTE THIS ONCE ALREADY.' },
    { es: 'VOY A SEGUIR ACÁ CUANDO CIERRES.', en: 'I WILL STILL BE HERE WHEN YOU CLOSE.' },
];

/** Cada cuántas frases raras, una es de las invasivas. */
const INVASIVE_ODDS = 6;

/** El repertorio invasivo en un idioma. */
export function bootPhrasesInvasive(lang: Lang = getLang()): readonly string[] {
    return BOOT_PHRASES_INVASIVE.map((f) => f[lang]);
}

const BOOT_PHRASE_AFTER_TRASH_ALL: Localized = {
    es: '¿OTRA VEZ DESDE CERO?',
    en: 'FROM SCRATCH AGAIN?',
};

export function bootPhrases(lang: Lang = getLang()): readonly string[] {
    return BOOT_PHRASES_ALL.map((f) => f[lang]);
}

export function bootPhrasesNight(lang: Lang = getLang()): readonly string[] {
    return BOOT_PHRASES_NIGHT_ALL.map((f) => f[lang]);
}

export function bootPhraseAfterTrash(lang: Lang = getLang()): string {
    return BOOT_PHRASE_AFTER_TRASH_ALL[lang];
}

// El repertorio en español, el idioma de autoría. Ver STATUS_FRAGMENTS.
export const BOOT_PHRASES: readonly string[] = bootPhrases('es');
export const BOOT_PHRASES_NIGHT: readonly string[] = bootPhrasesNight('es');
export const BOOT_PHRASE_AFTER_TRASH = bootPhraseAfterTrash('es');

/**
 * Qué teclea la secuencia de arranque al abrir una nota vacía.
 *
 * Haber tirado una nota hace nada gana a todo lo demás: es el único fragmento
 * que reacciona a lo que acabás de hacer, y por eso es el que más se siente como
 * que la máquina te está mirando.
 */
export function pickBootPhrase(
    ctx: SystemContext,
    previous: string | null,
    random: Random = Math.random,
    lang: Lang = getLang()
): string {
    const recienTirada =
        ctx.msSinceTrash != null && ctx.msSinceTrash < RECIEN_TIRADA_MS;

    if (recienTirada) return bootPhraseAfterTrash(lang);

    // Una de cada seis frases raras es de las invasivas: más larga, más
    // personal, y fuera del registro institucional de todas las demás.
    if (random() < 1 / INVASIVE_ODDS) {
        return pickFrom(bootPhrasesInvasive(lang), previous, random);
    }

    const repertorio = isSmallHours(ctx.hour) ? bootPhrasesNight(lang) : bootPhrases(lang);
    return pickFrom(repertorio, previous, random);
}

/**
 * Uno al azar, distinto del anterior.
 *
 * Repetir es lo que delata que hay una lista corta detrás: dos veces seguidas
 * `[SIN RELEVO]` y el efecto pasa de rareza a bucle.
 */
function pickFrom(
    options: readonly string[],
    previous: string | null,
    random: Random
): string {
    const candidatos = options.filter((o) => o !== previous);

    // Si excluir el anterior no deja nada, se prefiere repetir a devolver vacío.
    const pool = candidatos.length > 0 ? candidatos : options;

    const index = Math.min(Math.floor(random() * pool.length), pool.length - 1);
    return pool[index];
}

/** Cuántos borrados definitivos hacen falta para que el sistema lo mencione. */
const TALLY_FROM = 4;

/*
 * Los números en palabras. Decir "los otros cinco" pesa más que "los otros 5":
 * la cifra es un dato, la palabra es alguien contando.
 */
const NUMEROS: Readonly<Record<Lang, readonly string[]>> = {
    es: [
        'cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco',
        'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce',
    ],
    en: [
        'zero', 'one', 'two', 'three', 'four', 'five',
        'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
    ],
};

/**
 * Los escalones del mensaje de borrado.
 *
 * Cada uno dice UNA cosa más que el anterior, y ninguno te juzga: el sistema
 * sólo informa de lo que estuvo registrando, que es justamente lo que lo vuelve
 * incómodo. La progresión es lo que hace la pieza — un único mensaje distinto
 * sería un chiste, cuatro que se van cerrando es una presencia.
 *
 *   1–4   genérico, como cualquier app
 *   5–7   menciona que estuvo contando
 *   8–11  añade que ninguna vuelve
 *   12+   admite que ya no lleva la cuenta por sesión
 */
const DELETE_TEXTS: Readonly<Record<Lang, {
    unnamed: string;
    base: (name: string) => string;
    tally: (name: string, count: string) => string;
    many: (name: string, count: string) => string;
    beyond: (name: string) => string;
}>> = {
    es: {
        unnamed: 'Esta nota',
        base: (n) => `«${n}» se borrará para siempre. Esta acción no se puede deshacer.`,
        tally: (n, c) => `«${n}» se borrará para siempre. Como los otros ${c}.`,
        many: (n, c) => `«${n}» se borrará para siempre. Van ${c}. Ninguna vuelve.`,
        beyond: (n) =>
            `«${n}» se borrará para siempre. Ya no las cuento por sesión.`,
    },
    en: {
        // Las comillas cambian con el idioma: « » en español, " " en inglés.
        unnamed: 'This note',
        base: (n) => `"${n}" will be deleted forever. This can't be undone.`,
        tally: (n, c) => `"${n}" will be deleted forever. Like the other ${c}.`,
        many: (n, c) => `"${n}" will be deleted forever. That makes ${c}. None come back.`,
        beyond: (n) => `"${n}" will be deleted forever. I no longer count these by session.`,
    },
};

/** A partir de cuántos el sistema añade que ninguna vuelve. */
const MANY_FROM = 8;

/** A partir de cuántos admite que dejó de contarlas por sesión. */
const BEYOND_FROM = 12;

/**
 * El mensaje del diálogo de borrado definitivo.
 *
 * El borrado permanente es la única acción irreversible de la app. A partir del
 * quinto de la sesión, el sistema deja de ser genérico y menciona que estuvo
 * contando. No juzga y no impide nada — sólo informa, que es justo lo que lo
 * vuelve incómodo.
 *
 * `priorDeletes` son los borrados ANTERIORES a este, así que con 4 previos el
 * que estás por hacer es el quinto.
 */
export function permanentDeleteMessage(
    title: string,
    priorDeletes: number,
    lang: Lang = getLang()
): string {
    const textos = DELETE_TEXTS[lang];
    const nombre = title || textos.unnamed;

    if (priorDeletes < TALLY_FROM) return textos.base(nombre);

    // Más allá del repertorio de palabras, la cifra. Un "los otros cuarenta y
    // dos" escrito a mano sería más frágil que informativo.
    const cuantos = NUMEROS[lang][priorDeletes] ?? String(priorDeletes);

    if (priorDeletes >= BEYOND_FROM) return textos.beyond(nombre);
    if (priorDeletes >= MANY_FROM) return textos.many(nombre, cuantos);

    return textos.tally(nombre, cuantos);
}


