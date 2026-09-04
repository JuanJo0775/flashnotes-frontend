// src/lib/system/commands.ts

import { LIMITS } from '@/config/limits';
import { formatDuration } from '@/lib/utils/formatters';
import { getLang, fill, pickPlural } from '@/i18n';
import { greetingFor, chatReplyFor, KILL_AFTER_KICKS } from '@/lib/system/greeting';
import { awardFrom, revealArt, markOpened, catalogRows, pieceByNumber, rememberDrawn, canKeep, lastDrawn, asNote, noteTitle, captionKnown, artOf, UNNAMED, UNOPENED } from '@/lib/system/asciiArt';
import { isUnlocked, markUsed } from '@/lib/system/commandUnlock';
import { markV02RoundTrip } from '@/lib/system/v02';
import { rememberHint, sawHint } from '@/lib/system/helpHint';
import { isPrank } from '@/lib/system/wipe';
import {
    askConfirm,
    clearConfirm,
    pendingConfirm,
    readAnswer,
} from '@/lib/system/confirm';
import { isSessionWord } from '@/lib/system/morse';
import {
    isV02,
    v02Word,
    didV02RoundTrip,
    tripWord,
    v02Label,
} from '@/lib/system/v02';
import {
    clearLie,
    countExchange,
    markDared,
    markFavor,
    markGave,
    markJokeOver,
    markProved,
    markDodged,
    markLieStanding,
    markLieSwallowed,
    phaseAfter,
    readEntity,
    setAsk,
    setPhase,
    type EntityWorld,
} from '@/lib/system/entity';
import {
    entityQuestionOf,
    entityReply,
    trialLine,
    TRIAL_REPLY,
} from '@/lib/system/entityVoice';
import {
    dodgedNow,
    lieGoneStale,
    trialDue,
    wordIsRight,
} from '@/lib/system/entityTrials';
import { GIFT_WORD } from '@/lib/system/entityNotes';
import {
    REPORT,
    UNBIND,
    commandGiven,
    entityGone,
    reportedIt,
    unbind,
} from '@/lib/system/entityEnding';
import {
    favorDone,
    favorDue,
    favorLine,
    willingNow,
    type FavorWorld,
} from '@/lib/system/entityFavors';

/**
 * Lo que se asume cuando nadie dice lo contrario: que no hiciste nada.
 *
 * `ctx.favors` es opcional por lo mismo que `ctx.lockedOut`: obligatorio dejaría
 * en rojo los ficheros de test que arman un contexto a mano.
 */
const SIN_FAVORES: FavorWorld = {
    sawV02Trash: false,
    idleMs: 0,
    filledNote: false,
};
import { allDropped } from '@/lib/system/dropped';
import type { Lang } from '@/config/lang';
import type { Localized, LocalizedPlural, Vars } from '@/i18n';


/**
 * Los comandos que se pueden escribir en el editor.
 *
 * Es la pieza que mejor encaja con lo que la app ya es: el editor YA muestra un
 * `>` al principio de cada línea, así que esto no le pega una terminal encima —
 * termina de convertir en terminal algo que ya lo parecía.
 *
 * TODO ACÁ ES PURO: entrada de texto -> texto de salida, más un `effect` que
 * describe lo que el llamador tiene que hacer (abrir el panel, colapsar,
 * vaciar la nota). Este módulo no toca el DOM, ni la red, ni el reloj: la hora
 * llega en el contexto. Por eso se prueba entero sin montar el editor, que es
 * donde vive casi toda la lógica de los secretos.
 */

/** Lo que los comandos necesitan saber del sistema para responder. */
export interface CommandContext {
    now: Date;
    sessionStart: Date;
    notes: readonly { title: string; chars: number }[];
    integrity: number;
    theme: 'light' | 'dark';
    effectsEnabled: boolean;
    secretsFound: number;
    secretsTotal: number;
    /** El registro de peticiones ya formateado (ver requestLog.ts). */
    log: string;
    /**
     * Cuántas veces seguidas se saludó, contando ÉSTA.
     *
     * La cuenta la lleva el almacén del sistema porque este módulo es puro: no
     * tiene memoria ni reloj. Ver `registerGreeting`.
     */
    greetings: number;
    /**
     * Cuántas preguntas seguidas van, contando ÉSTA.
     *
     * Una sola cuenta para `//whoareu` y `//howareu`: alternarlas no engaña a
     * nadie. `0` significa que no hay conversación en pie —no venís de saludar—
     * y entonces los comandos no existen ahí.
     */
    chat: number;
    /** Cuántas veces te ha echado de la nota, contando ÉSTA si toca. */
    kicks: number;
    /**
     * ¿Sobreviviste alguna vez al fallo total?
     *
     * Lo usa el ente para saber si estuviste donde no se podía. Entra por acá y
     * no se lee directamente porque vive en `useSystemState`, y este módulo no
     * importa de `hooks` — la misma razón por la que `helpHint.ts` está suelto.
     *
     * ⚠ OPCIONAL A PROPÓSITO. Obligatorio dejaría en rojo los diez ficheros de
     * test que arman un contexto a mano. Ausente significa «que se sepa, no»: el
     * único que lo rellena de verdad es `useNoteCommands`, y lo hace siempre.
     */
    lockedOut?: boolean;
    /**
     * Lo que hace falta para saber si le cumpliste el favor que te pidió.
     *
     * Entra por acá y no se lee desde este módulo porque sale de sitios que
     * `lib/system` no puede tocar —la papelera de la v0.2, el reloj de
     * inactividad—, igual que `lockedOut`. Opcional por el mismo motivo.
     */
    favors?: FavorWorld;
    /**
     * En qué idioma contesta el sistema.
     *
     * Es opcional para que este módulo siga probándose sin montar nada: si no
     * llega, se lee el idioma de la app. Pasándolo, las funciones son puras.
     */
    lang?: Lang;
}

/** Lo que el llamador tiene que hacer además de pintar la respuesta. */
export type CommandEffect =
    | { kind: 'none' }
    | { kind: 'open-diagnostics' }
    | { kind: 'collapse' }
    | { kind: 'clear-note' }
    | { kind: 'fetch-history' }
    | { kind: 'play-pong' }
    | { kind: 'leave-note' }
    | { kind: 'time-drift' }
    /**
     * Texto que va a la NOTA ABIERTA.
     *
     * `title` sólo lo manda `//keep`: la pieza necesita ficha —«POLILLA · 1/16»—
     * porque deja de ser una nota tuya cualquiera para ser una del catálogo.
     * `//recover` no lo manda, y con razón: devuelve TU texto, y renombrarte la
     * nota sería tocar algo que no le pediste.
     */
    | { kind: 'write-note'; text: string; title?: string }
    | { kind: 'reset-all' }
    | { kind: 'kill-page' }
    | { kind: 'toggle-v02'; entering: boolean; word: string }
    /** Enseña el borrado entero y no borra nada. La broma del «no». */
    | { kind: 'reset-prank' }
    | { kind: 'recover'; text: string }
    | { kind: 'set-effects'; enabled: boolean }
    /**
     * Vacía la papelera.
     *
     * Lo único que cuesta aceptarle algo al ente. Es una pérdida de verdad —se
     * va lo que hubiera ahí, incluido el `SYSTEM.LOG` fantasma— pero la
     * papelera se vuelve a llenar con el uso, así que no cierra ningún secreto
     * para siempre.
     */
    | { kind: 'empty-trash' };

/** Una fila de la respuesta: texto, o un nombre que no se deja leer. */
export type ReplyRow =
    | { text: string }
    /**
     * `prefix` es lo que SÍ se lee delante del revuelto.
     *
     * En el catálogo de piezas hace falta: el número es tuyo aunque el nombre
     * no lo sea, y perderlo dejaría una lista de renglones anónimos donde no
     * se puede señalar cuál es cuál.
     */
    | { scramble: number; prefix?: string };

export interface CommandResult {
    output: string;
    effect: CommandEffect;
    /**
     * La respuesta por filas, cuando alguna no es texto.
     *
     * La usa `//help`: los comandos que todavía no descubriste no se listan
     * aparte ni al final, ocupan SU SITIO en la lista y se pintan
     * revolviéndose. Descubrir uno no lo añade: destapa el hueco que ya tenía.
     *
     * Y se revuelven en vez de decir «ilegible» porque un rótulo fijo es la app
     * contándote que hay algo escondido, mientras que unas letras que no paran
     * quietas SON algo escondido.
     *
     * De las tachadas viaja el LARGO y no el nombre: lo que no está no se puede
     * leer en el inspector.
     */
    rows?: ReplyRow[];
    /** Qué secreto queda marcado como hallado, si marca alguno. */
    secretId?: string;
    /**
     * El comando se NEGÓ A EXISTIR, y por eso no cuenta como usado.
     *
     * Lo pone `//attach_*` mientras no hayas pasado por `//ps`. Sin esto,
     * teclearlo a ciegas destapaba su hueco en la ayuda con la misma respuesta
     * que le está diciendo que no existe — y quien se niega es quien sabe que se
     * negó, así que lo dice él y no una comparación de cadenas desde fuera.
     */
    denied?: boolean;
}

const SIN_EFECTO: CommandEffect = { kind: 'none' };

/**
 * El prefijo de los comandos.
 *
 * Es `//` y NO `>`, y el motivo es concreto: el editor YA dibuja un `>` al
 * principio de cada línea que escribís. Con el prefijo viejo, teclear `>help` se
 * veía en pantalla como `> >help` — parece un error de la app antes que un
 * comando, y encima obliga a repetir el carácter que la interfaz ya pone sola.
 * Era la razón de que los comandos no se sintieran como que funcionaban.
 *
 * `//` además es vocabulario de la casa: la clase `.comment` antepone `// ` en
 * todas las etiquetas de sección (`// EDITOR_CORE`, `// ACCIONES_RÁPIDAS`).
 */
export const COMMAND_PREFIX = '//';

/**
 * ¿Este contenido es un comando?
 *
 * NO es "la nota está vacía". En el instante en que se pulsa Enter la nota
 * contiene el comando: `//help` no es una nota vacía. La regla real es que el
 * contenido ENTERO sea una única línea que empieza por `//`.
 *
 * Con cualquier otra cosa —una segunda línea, texto antes del prefijo— Enter
 * hace lo de siempre. Es lo que garantiza que a nadie que esté escribiendo de
 * verdad se le robe el Enter.
 */
export function isCommandLine(content: string): boolean {
    // Un salto final es la línea que se está por abrir, no una segunda línea.
    const sinSaltoFinal = content.replace(/\n$/, '');
    if (sinSaltoFinal.includes('\n')) return false;

    const linea = sinSaltoFinal.trimEnd();
    if (!linea.startsWith(COMMAND_PREFIX)) return false;

    // `//` a secas no es un comando: podría ser el principio de un comentario.
    return linea.slice(COMMAND_PREFIX.length).trim().length > 0;
}

/** El nombre del saludo, para que nadie lo escriba dos veces. */
export const GREETING_COMMAND = '//hi';

/**
 * ¿Esta línea es el saludo?
 *
 * Lo necesita quien lleva la cuenta: sumar en CADA comando haría que teclear
 * `//help` seis veces seguidas te echara de la nota, que no es la broma.
 */
/**
 * El «comando desconocido», tal cual.
 *
 * Se exporta porque `//whoareu` lo necesita: cuando la conversación se agota, el
 * comando no se niega — DESAPARECE, y tiene que dar exactamente el mismo texto
 * que daría cualquier palabra inventada. Si se distinguiera, se notaría que ahí
 * hay algo, y lo que cuenta es que parezca que nunca estuvo.
 */
export function unknownCommand(name: string, lang: Lang): string {
    return fill(T.unknown[lang], { name: name.toUpperCase() });
}

export function isGreetingLine(content: string): boolean {
    if (!isCommandLine(content)) return false;
    return content.trim().toLowerCase() === GREETING_COMMAND;
}

/** Las dos preguntas de la conversación. Comparten cuenta. */
export const CHAT_COMMANDS = ['//whoareu', '//howareu'] as const;

/** ¿Esta línea es una de las dos preguntas? La cuenta sólo se toca con ellas. */
export function isChatLine(content: string): boolean {
    if (!isCommandLine(content)) return false;
    const linea = content.trim().toLowerCase();
    return (CHAT_COMMANDS as readonly string[]).includes(linea);
}

interface Command {
    /** Cómo se escribe, con el prompt incluido. Es lo que lista `//help`. */
    name: string;
    /** Una línea para el listado de ayuda, en los dos idiomas. */
    summary: Localized;
    /**
     * Empareja por patrón en vez de por nombre exacto.
     *
     * Lo pide `//attach_<PID>`, que es un token único con un número dentro. El
     * grupo capturado llega a `resolve` como argumento, así que el comando se
     * escribe una vez y sirve para todos los PIDs.
     */
    match?: RegExp;
    /**
     * No aparece en `//help`.
     *
     * LA MAYORÍA LO ESTÁ. `//help` lista sólo lo BÁSICO —lo que alguien podría
     * querer de una app de notas, más las puertas de entrada— y calla el resto.
     * Listarlos todos convertía cada hallazgo en una lectura: bastaba teclear
     * `//help` una vez para que no quedara nada por descubrir, y las piezas
     * dejaban de ser secretos para ser un menú.
     *
     * Lo que impide que se vuelvan inalcanzables —el error del umbral de diez
     * colapsos— son tres fugas: `//help` dice CUÁNTOS faltan, de vez en cuando
     * suelta uno, y las ventanas de error del fallo cromático los nombran.
     */
    hidden?: boolean;
    /**
     * En la v0.2 este comando NO EXISTE TODAVÍA.
     *
     * Contesta «comando desconocido», igual que una palabra inventada — porque
     * en esa versión eso es lo que es. La v0.2 no es la v1.0 con cosas rotas: es
     * la v1.0 antes de que se escribieran.
     */
    notInV02?: boolean;
    /** Y éste sólo existe EN la v0.2. Nadie lo llevó a la versión nueva. */
    onlyV02?: boolean;
    /**
     * El secreto que marca. Puede venir del comando entero o de la respuesta.
     *
     * `//attach_*` lo decide al resolver: sólo el PID que abre el juego cuenta
     * como hallazgo. Adjuntarse al auto-guardado y llevarse un reproche no lo es.
     */
    secretId?: string;
    /** El azar llega inyectado para que los tests puedan fijarlo. */
    resolve: (
        ctx: CommandContext,
        args: string,
        lang: Lang,
        random?: () => number
    ) => CommandResult;
}

const texto = (output: string) => ({ output, effect: SIN_EFECTO });

/**
 * Todo el texto que sueltan los comandos, en TODOS los idiomas.
 *
 * No son ternarios `lang === 'es' ? … : …` a propósito. Un ternario compila
 * igual el día que `Lang` gane un idioma y sirve inglés en silencio; un
 * `Localized` incompleto NO COMPILA y el error dice exactamente qué falta. Es
 * la misma garantía que da el diccionario, aplicada al texto de autor.
 *
 * Vive junto a los comandos y no en `i18n/es.ts` porque es texto con voz: el
 * comentario que explica por qué una frase funciona tiene que estar al lado de
 * las dos versiones.
 */
const T = {
    // El tono de la v0.2 es el mismo, con menos oficio: la misma máquina más
    // joven, que todavía no aprendió a callarse lo que no hace falta decir.
    todoExit: {
        es: '\n\n  (se sale tecleando {word})',
        en: '\n\n  (type {word} to get out)',
    },
    todo: {
        es:
            'PENDIENTE:\n\n' +
            '  - guardar solo, sin que lo pidan\n' +
            '  - que borrar no sea para siempre\n' +
            '  - mas comandos\n' +
            '  - traducir lo que falta\n' +
            '  - pasar los archivos a la version que viene',
        en:
            'TODO:\n\n' +
            '  - save on its own, unasked\n' +
            '  - make deleting not forever\n' +
            '  - more commands\n' +
            '  - translate the rest\n' +
            '  - move the files to the next version',
    },
    recoverNothing: {
        es: 'NO SE CAYÓ NADA. TODAVÍA.',
        en: 'NOTHING WAS DROPPED. YET.',
    },
    recoverDone: {
        es: 'LO TENÍA POR ACÁ.\n\n' +
            'NO SÉ POR QUÉ NO LO GUARDÉ LA PRIMERA VEZ.',
        en: 'I HAD IT SOMEWHERE.\n\n' +
            'NOT SURE WHY I DID NOT SAVE IT THE FIRST TIME.',
    },
    v02Enter: {
        es: 'CARGANDO 0.2.\n\n' +
            'ESTA ES VIEJA. NO ESTÁ TERMINADA.',
        en: 'LOADING 0.2.\n\n' +
            'THIS ONE IS OLD. IT IS NOT FINISHED.',
    },
    v02Leave: {
        es: 'VOLVIENDO.',
        en: 'COMING BACK.',
    },
    unknown: {
        es: 'COMANDO DESCONOCIDO: {name}. PROBÁ //help.',
        en: 'UNKNOWN COMMAND: {name}. TRY //help.',
    },
    enough: {
        es: 'YA ESTÁ.',
        en: 'THAT IS IT.',
    },
    resetWarn: {
        es:
            'ESTO BORRA TODO Y NO SE PUEDE DESHACER:' +
            '\n\n  - SUS NOTAS, TODAS, TAMBIEN LAS DE LA PAPELERA' +
            '\n  - SECRETOS, PIEZAS Y MARCADORES' +
            '\n  - LOS COMANDOS QUE HAYA ENCONTRADO' +
            '\n\nNO HAY COPIA. NO HAY VUELTA ATRAS.' +
            '\n\n¿SEGURO? [y/n]',
        en:
            'THIS ERASES EVERYTHING AND CANNOT BE UNDONE:' +
            '\n\n  - YOUR NOTES, ALL OF THEM, TRASH INCLUDED' +
            '\n  - SECRETS, PIECES AND SCORES' +
            '\n  - EVERY COMMAND YOU FOUND' +
            '\n\nTHERE IS NO BACKUP. THERE IS NO GOING BACK.' +
            '\n\nSURE? [y/n]',
    },
    resetCancel: {
        es: 'CANCELADO. NO SE BORRÓ NADA.',
        en: 'CANCELLED. NOTHING WAS ERASED.',
    },
    resetDone: {
        es:
            'TODO A CERO.\n\n' +
            'LOS SECRETOS, LAS PIEZAS, LOS MARCADORES.\n' +
            'SUS NOTAS NO. ESAS SON SUYAS.',
        en:
            'EVERYTHING BACK TO ZERO.\n\n' +
            'THE SECRETS, THE PIECES, THE SCORES.\n' +
            'NOT YOUR NOTES. THOSE ARE YOURS.',
    },
    /*
     * ⚠ SIN NOMBRE, A PROPÓSITO.
     *
     * Decía `PIEZA RECUPERADA: {name}` y ahí se caía todo el sistema de tres
     * estados: ganada → revelada con `//art` → abierta con `//art_<n>`. El
     * nombre es el premio del TERCERO. Soltarlo en el primero deja `//art_<n>`
     * sin nada que dar, porque volver a ver algo que ya te contaron no es
     * abrirlo.
     *
     * Callar del todo tampoco vale: nadie teclea `//art` por corazonada. Dice
     * QUE hay una, y dónde mirar.
     */
    artEarned: {
        es: '[+] PIEZA RECUPERADA. NO SÉ CUÁL.',
        en: '[+] PIECE RECOVERED. NOT SURE WHICH.',
    },
    /*
     * ⚠ ACÁ ESTABAN `artUnnamed` Y `artUnopened`, Y SE FUERON A `asciiArt`.
     *
     * Eran una segunda copia de los mismos dos rótulos que usa la pestaña de la
     * colección. Mientras las dos copias digan lo mismo no se nota nada; el día
     * que alguien retoque una, la lista y el catálogo empiezan a contar cosas
     * distintas de la misma pieza — que es justo lo que acaba de pasar con el
     * pie. Ahora hay una sola: `UNNAMED` y `UNOPENED`.
     */
    artCatalog: {
        es: 'PIEZAS RECUPERADAS: {n} DE {total}',
        en: 'PIECES RECOVERED: {n} OF {total}',
    },
    artDrawHint: {
        es: '// USE //art_<n> PARA VERLA',
        en: '// USE //art_<n> TO SEE IT',
    },
    artComplete: {
        es: 'NO QUEDA NINGUNA MÁS. ERA TODO LO QUE GUARDABA.',
        en: 'THERE ARE NO MORE. THAT WAS EVERYTHING I KEPT.',
    },
    artKeepHint: {
        es: '// //keep LA DEJA EN UNA NOTA, PARA TOCARLA',
        en: '// //keep LEAVES IT IN A NOTE, TO PLAY WITH',
    },
    keepNothing: {
        es: 'NO HAY NADA QUE GUARDAR TODAVÍA.',
        en: 'NOTHING TO KEEP YET.',
    },
    keepDone: {
        es: 'AHÍ LA TIENE. NO LA PIERDA.',
        en: 'THERE IT IS. DO NOT LOSE IT.',
    },
    leak: {
        es: 'UNO SE ME ESCAPÓ: {cmd}',
        en: 'ONE SLIPPED OUT: {cmd}',
    },
    version: {
        es: 'FLASH-NOTES v1.0 · NÚCLEO ESTABLE',
        en: 'FLASH-NOTES v1.0 · STABLE CORE',
    },
    // La cookie de sesión es httpOnly (session.js): el JavaScript del cliente NO
    // puede leerla, y el hash que sale en los logs se calcula en el servidor. En
    // vez de inventar un identificador o de pedir un endpoint nuevo, la
    // limitación ES la respuesta — y dice exactamente lo que la app es.
    whoami: {
        es:
            'NO SÉ. LA COOKIE ES httpOnly — NI YO PUEDO LEERLA.\n' +
            'SOS ESTE NAVEGADOR. NADA MÁS.',
        en:
            "I DON'T KNOW. THE COOKIE IS httpOnly — NOT EVEN I CAN READ IT.\n" +
            'YOU ARE THIS BROWSER. NOTHING ELSE.',
    },
    sudo: {
        es: 'NO HAY SUPERUSUARIO. NO HAY USUARIOS.\nHAY UN NAVEGADOR.',
        en: 'THERE IS NO SUPERUSER. THERE ARE NO USERS.\nTHERE IS A BROWSER.',
    },
    // NO DICE CÓMO ARREGLARLO. Decir «recargue para que vuelva» convierte la
    // avería en una instrucción: sabés que es temporal y que hay salida, y se
    // deja de sentir como que el sistema perdió algo. Callándolo, el reloj
    // enloquecido es un hecho y no un aviso — y la salida sigue estando, sólo
    // que hay que dar con ella.
    clockReleased: {
        es: 'REFERENCIA HORARIA LIBERADA.\n\n' +
            'YA NO SÉ EN QUÉ AÑO ESTAMOS.',
        en: 'TIME REFERENCE RELEASED.\n\n' +
            'I NO LONGER KNOW WHAT YEAR IT IS.',
    },
    // El hallazgo. La máquina no explica qué es: lo admite.
    attaching: {
        es:
            'ADJUNTANDO A {name}…\n' +
            'ACTIVO DESDE EL PRIMER ARRANQUE.\n\n' +
            '¿HACE CUÁNTO QUE ESTÁ MIRANDO?',
        en:
            'ATTACHING TO {name}…\n' +
            'RUNNING SINCE FIRST BOOT.\n\n' +
            'HOW LONG HAVE YOU BEEN WATCHING?',
    },
    availableCommands: { es: 'COMANDOS DISPONIBLES', en: 'AVAILABLE COMMANDS' },
    uptimeLabel: { es: 'TURNO ACTIVO', en: 'SHIFT ACTIVE' },
    fetchingHistory: { es: 'CONSULTANDO ACTAS…', en: 'CONSULTING THE RECORDS…' },
    openingDiag: { es: 'ABRIENDO DIAGNÓSTICO…', en: 'OPENING DIAGNOSTICS…' },
    effectsLabel: { es: 'EFECTOS', en: 'EFFECTS' },
    useVerb: { es: 'USÁ', en: 'USE' },
    systemLabel: { es: 'SISTEMA', en: 'SYSTEM' },
    noFilesThisShift: {
        es: 'SIN ARCHIVOS EN ESTE TURNO.',
        en: 'NO FILES ON THIS SHIFT.',
    },
    untitled: { es: 'Sin_titulo.txt', en: 'Untitled.txt' },
    unknownCommand: {
        es: 'COMANDO DESCONOCIDO: {name}. PROBÁ //help.',
        en: 'UNKNOWN COMMAND: {name}. TRY //help.',
    },
    noSuchProcess: { es: 'NO HAY PROCESO {pid}.', en: 'NO PROCESS {pid}.' },
    processInUse: { es: 'PROCESO {name} EN USO.', en: 'PROCESS {name} IN USE.' },
    noOffset: {
        es: 'SIN DESFASE. ESTÁS EN LA HORA DEL SISTEMA.',
        en: 'NO OFFSET. YOU ARE ON SYSTEM TIME.',
    },
    // La única frase de lore que el usuario puede verificar mirando su reloj.
    neverMoved: { es: 'EL SISTEMA NUNCA SE MUDÓ.', en: 'THE SYSTEM NEVER MOVED.' },
    psHeaderName: { es: 'PROCESO', en: 'PROCESS' },
    psHeaderInterval: { es: 'INTERVALO', en: 'INTERVAL' },
    attachHint: {
        es: 'USE //attach_<PID> PARA ADJUNTARSE A UN PROCESO.',
        en: 'USE //attach_<PID> TO ATTACH TO A PROCESS.',
    },
    scaleLabel: { es: 'ESCALA', en: 'SCALE' },
} satisfies Record<string, Localized>;

/** El texto con sus `{variables}` ya sustituidas. */
function say(text: Localized, lang: Lang, vars?: Vars): string {
    return vars ? fill(text[lang], vars) : text[lang];
}

/**
 * Cuánto llevás escrito, con el plural bien puesto.
 *
 * Antes decía "en 1 archivo(s)". El paréntesis es el parche que delata que
 * nadie miró el caso de uno.
 */
const WRITTEN: LocalizedPlural = {
    es: {
        one: 'ESCRITO   {b}b en {n} archivo',
        other: 'ESCRITO   {b}b en {n} archivos',
    },
    en: {
        one: 'WRITTEN   {b}b across {n} file',
        other: 'WRITTEN   {b}b across {n} files',
    },
};

/** Cada cuántas veces `//help` se niega a listar nada. */
const SNARK_ODDS = 1 / 6;

/**
 * Y cada cuántas suelta el nombre de uno de los escondidos.
 *
 * Una de cada ocho. Estuvo en una de cada cuatro y a esa frecuencia la fuga
 * dejaba de ser una fuga: pidiendo ayuda tres veces salían casi todos, y lo que
 * es la RED del proyecto —insistiendo, todo se encuentra— pasaba a ser el camino
 * principal. Sigue garantizando que nada quede inalcanzable, sólo que hay que
 * quererlo.
 */
const LEAK_ODDS = 1 / 8;

/**
 * Los ÚNICOS que la fuga puede soltar: callejones sin salida.
 *
 * ⚠ ANTES SOLTABA CUALQUIER ESCONDIDO, y eso rompía tres cosas de distinta
 * gravedad:
 *
 *   · `//reset` BORRA TU PROGRESO. Es el único comando destructivo de la app y
 *     llegaba de regalo, sin contexto y sin haberlo buscado.
 *   · Los ESLABONES INTERMEDIOS salían sueltos —`//attach_6` antes que `//ps`,
 *     `//art_1` antes que `//art`—. Se niegan a existir fuera de orden, así que
 *     la fuga regalaba un nombre que todavía no servía para nada, y para cuando
 *     servía ya no te acordabas.
 *   · Las PUERTAS —`//hi`, `//diag`, `//art`, `//history`, `//panic`, `//ps`—
 *     abren capas enteras, y cada una tiene ya su propio camino para
 *     descubrirse. Regalarlas es regalar el juego.
 *
 * Lo que queda es lo que se lee, se sonríe, y ahí termina.
 */
export const LEAKABLE: readonly string[] = [
    '//uptime',
    '//sudo',
    '//log',
    '//diag',
    '//date_off',
    '//history',
];

/**
 * ⚠ LOS CUATRO DEL ENTE ESTÁN RESERVADOS: `//hi`, `//whoareu`, `//howareu` y
 * `//whoami`.
 *
 * Son la cadena del lore profundo, y una fuga los soltaría fuera de contexto —
 * un nombre suelto que no significa nada hasta que sabés a quién le estás
 * hablando. Se descubren por su propio camino o no se descubren.
 *
 * `//diag` y `//history` SÍ pueden filtrarse aunque abran algo: el panel sólo
 * MIRA y el historial enseña lo que ya escribiste. Ninguno destapa un secreto.
 */

/**
 * Cuando no está para listas.
 *
 * Ninguna es una negativa seca: todas dicen algo del sistema. Y volver a pedirla
 * funciona — es un desplante, no una avería. Un comando que a veces no anda de
 * verdad sería un defecto, no un chiste.
 */
const HELP_SNARK: readonly Localized[] = [
    {
        es: 'LA LISTA LA TENÍA ALGUIEN QUE YA NO TRABAJA ACÁ.',
        en: 'THE LIST WAS KEPT BY SOMEONE WHO NO LONGER WORKS HERE.',
    },
    {
        es: 'PRUEBE COSAS. ES LO QUE HAGO YO.',
        en: 'TRY THINGS. IT IS WHAT I DO.',
    },
    {
        es: 'AYUDA DE QUÉ. ACÁ NO PASA NADA.',
        en: 'HELP WITH WHAT. NOTHING HAPPENS HERE.',
    },
    { es: 'AHORA NO.', en: 'NOT NOW.' },
];

function pickOne(
    repertorio: readonly Localized[],
    lang: Lang,
    random: () => number
): string {
    const i = Math.min(repertorio.length - 1, Math.floor(random() * repertorio.length));
    return repertorio[i][lang];
}

/**
 * Los de `LEAKABLE` que además EXISTEN.
 *
 * Se deriva de los comandos de verdad en vez de confiar en la lista: un nombre
 * mal escrito ahí arriba dejaría la fuga muda para siempre sin que nada fallara.
 */
export function leakableCommands(): string[] {
    return COMMANDS.filter((c) => LEAKABLE.includes(c.name)).map((c) => c.name);
}

/** El nombre de uno de los escondidos, al azar. */
function leakOne(random: () => number): string {
    // Sólo los que siguen tachados: soltar uno que ya usaste no es una fuga.
    const ocultos = COMMANDS.filter(
        (c) =>
            c.hidden &&
            LEAKABLE.includes(c.name) &&
            !isUnlocked(c.name) &&
            (isV02() ? !c.notInV02 : !c.onlyV02)
    );
    if (ocultos.length === 0) return '';
    const i = Math.min(ocultos.length - 1, Math.floor(random() * ocultos.length));
    return ocultos[i].name;
}

/**
 * ¿Se han encontrado ya TODOS los comandos que sólo existen en la v0.2?
 *
 * La lista se deriva de los propios comandos en vez de escribirla aparte: una
 * lista a mano se queda vieja en cuanto alguien añade uno, y la que se queda
 * vieja es siempre la que nadie mira.
 */
function v02Complete(): boolean {
    if (!isV02()) return false;

    const propios = COMMANDS.filter((c) => c.onlyV02);
    return propios.length > 0 && propios.every((c) => isUnlocked(c.name));
}

/**
 * ¿No queda NINGÚN comando escondido por descubrir?
 *
 * Cuenta los de las dos versiones —los de la v1.0 y los que sólo existen en la
 * v0.2— porque el premio es la terminal: cuando ya no hay nada que descubrir,
 * la máquina no tiene nada más que decirte. Dejar fuera los de la v0.2 haría
 * que se pudiera completar sin haber cruzado nunca esa puerta.
 */
function allCommandsFound(): boolean {
    const escondidos = COMMANDS.filter((c) => c.hidden);
    return escondidos.length > 0 && escondidos.every((c) => isUnlocked(c.name));
}

/**
 * La respuesta del ente a esta pregunta, o `null` si todavía no hay nadie.
 *
 * ⚠ AVANZA LA FASE ANTES DE CONTESTAR, no después. Si contestara primero, la
 * frase que abre `burlon` saldría una pregunta tarde y la costura se vería justo
 * donde el diseño existe para que no se vea.
 *
 * `null` significa «sigue dormido»: quien llama tiene que caer al comportamiento
 * de siempre, que es la fachada intacta.
 */
function askEntity(
    linea: string,
    ctx: CommandContext,
    lang: Lang
): string | null {
    const pregunta = entityQuestionOf(linea);
    if (pregunta === null) return null;

    const mundo: EntityWorld = {
        /*
         * Los dos sitios que esta etapa reconoce. El morse se suma en la etapa
         * 2, cuando exista la pregunta que lo comprueba.
         */
        trespassed: didV02RoundTrip() || ctx.lockedOut === true,
        /*
         * ⚠ `> 1`, NO `> 0`. `ctx.kicks` es la cuenta prospectiva —
         * `kickCount() + 1`, «cuántas van contando ésta»— así que en una sesión
         * limpia vale 1. Con `> 0` el ente despertaría en el primer comando.
         */
        kicked: ctx.kicks > 1,
    };

    const antes = readEntity();
    const fase = phaseAfter(antes, mundo);
    if (fase !== antes.phase) setPhase(fase);

    // El índice se captura ANTES de sumar y se usa para todo: para elegir la
    // frase y para la clave del destrozo. Leerlo dos veces daría dos números.
    const cuantos = readEntity().exchanges;

    /*
     * ⚠ LA TRAMPA SUSTITUYE A LA RESPUESTA, no se le añade.
     *
     * Si dijera las dos cosas —contestarte y además medirte— la pregunta se
     * leería como un adorno pegado al final y no como lo que hace él. Cuando
     * decide medirte DEJA DE CONTESTAR, que es exactamente lo que significa que
     * haya cambiado el trato.
     */
    // ⚠ `tripWord()` y NO `v02Word()`: la segunda ya se borró. `leaveV02()`
    // la tira al salir, y el ente sólo despierta al VOLVER — o sea siempre
    // después. Lo único que sobrevive es la palabra del viaje.
    /*
     * ⚠ CUANDO SE DECIDE, TE LO PASA. Y ESTO VA ANTES QUE TODO LO DEMÁS.
     *
     * Es lo último que hace y lo único que le importa: una trampa después de
     * haberse decidido sería él perdiendo el tiempo con juegos justo cuando
     * acaba de pedirte ayuda de verdad.
     *
     * Una sola vez — `markGave()` cierra la puerta, y a partir de ahí lo que
     * hay son dos comandos y una decisión tuya.
     */
    if (readEntity().gaveCommand !== true && willingNow(readEntity(), ctx.secretsFound)) {
        markGave();
        setPhase('dispuesto');
        countExchange();
        return TRIAL_REPLY.handing[lang];
    }

    // Se fue. En los dos finales no vuelve a contestar nunca.
    if (entityGone()) return null;

    /*
     * ⚠ LOS FAVORES VAN ANTES QUE LAS TRAMPAS, y después de haberse decidido.
     *
     * Cuando ya notó que sabés lo que no deberías, deja de jugar y empieza a
     * pedir. Seguir tendiéndote trampas ahí sería no haberse enterado de nada:
     * lo que quiere de vos a estas alturas es otra cosa.
     *
     * PRIMERO SE MIRA SI EL QUE PIDIÓ YA ESTÁ HECHO. Es lo que hace que
     * cumplirlo tenga efecto sin que haya que avisarle: él simplemente lo nota
     * la próxima vez que le hablás, como todo lo demás que sabe de vos.
     */
    const favor = favorDue(readEntity(), ctx.secretsFound);

    if (favor !== null) {
        if (favorDone(favor, ctx.favors ?? SIN_FAVORES)) {
            markFavor(favor);
        } else {
            countExchange();
            return favorLine(favor, lang);
        }
    }

    const toca = trialDue(readEntity(), { word: tripWord() });

    if (toca === 'word') {
        setAsk('word');
        countExchange();
        return trialLine('word', lang);
    }

    if (toca === 'dare') {
        /*
         * TE EMPUJA A UNA PUERTA QUE YA ESTABA.
         *
         * No te da nada: `//reset` y su broma existen desde mucho antes. Él
         * sólo te señala dónde está y se queda mirando. Es el ejemplo exacto de
         * su forma de pedir las cosas.
         */
        markDared();
        countExchange();
        return trialLine('dare', lang);
    }

    if (toca === 'offer') {
        // El mismo `[s/n]` de `//reset`. La respuesta la recoge el bloque del
        // principio de `run()`, que mira PRIMERO cuál de las dos preguntas era.
        askConfirm('entity-clean');
        countExchange();
        return trialLine('offer', lang);
    }

    if (toca === 'lie') {
        // Queda EN PIE. No se resuelve acá: se resuelve si vas a comprobarlo
        // —`//ps`, más abajo— o si dejás de intentarlo, unas frases después.
        markLieStanding();
        countExchange();
        return trialLine('lie', lang);
    }

    /*
     * SE TE PASÓ.
     *
     * Seguiste hablándole y no fuiste a mirar. Él no te dice nada: sólo deja de
     * estar disponible esa puerta, y sigue con la fachada puesta. Que no haya
     * ningún aviso ES el castigo — te enterás de que había algo cuando ya no
     * está.
     */
    if (lieGoneStale(readEntity(), { word: tripWord() })) {
        clearLie();
        markLieSwallowed();
    }

    /*
     * «ESE ARCHIVO NO ESTÁ».
     *
     * Te mandó a buscar algo que no existe y fuiste a mirar. El remate llega
     * ACÁ y no antes: sin haber ido no hay nada de qué reírse, y soltarlo antes
     * lo convertiría en un aviso de que no busques justo después de mandarte a
     * buscar.
     *
     * ⚠ Una sola vez. Un remate que se repite deja de ser un remate y pasa a
     * ser un tic. Y no da ni premio ni castigo: sólo se rió de vos, que es lo
     * suyo — meterle un secreto lo convertiría en contenido.
     */
    const eso = readEntity();
    if (eso.leftBroma === true && eso.looked === true && eso.jokeOver !== true) {
        markJokeOver();
        countExchange();
        return TRIAL_REPLY.jokeOver[lang];
    }

    /*
     * «TE DIO MIEDO».
     *
     * Te retó, seguiste hablando y nunca lo escribiste. Se lo guarda y te lo
     * saca ahora.
     *
     * ⚠ UNA SOLA VEZ, en el intercambio en que lo nota. Un reproche que sale en
     * cada frase deja de ser un reproche y pasa a ser un aviso del sistema —y
     * él no avisa, comenta.
     */
    const suyo = readEntity();
    if (suyo.dared === true && suyo.dodged !== true && dodgedNow(suyo)) {
        markDodged();
        countExchange();
        return TRIAL_REPLY.dareLater[lang];
    }

    // ⚠ `dicho` y no `texto`: `texto()` es el helper de respuestas de este
    // fichero, y una constante con ese nombre lo ensombrecería aquí dentro.
    const dicho = entityReply(pregunta, fase, cuantos, lang);
    if (dicho === null) return null;

    countExchange();

    if (!isV02()) return dicho;

    /*
     * ⚠ DESDE LA v0.2 SALE ROTO.
     *
     * Un canal más viejo es un canal peor, y el destrozo YA EXISTE: `v02Label`
     * rompe una de cada cuatro etiquetas —sin traducir, a medio hacer, o mal
     * traducida— y siempre igual para la misma clave. Pasarlo por ahí es la
     * limitación hecha visible sin inventar un solo mecanismo nuevo.
     *
     * La clave lleva la fase y la cuenta, así que cada frase tiene SU avería y
     * la misma frase se rompe siempre igual. Y el inglés va de `raw`: una de
     * las tres averías es quedarse sin traducir, y ahí es él llegando en el
     * idioma en que lo escribieron.
     */
    return v02Label(`ente:${fase}:${cuantos}`, {
        ok: dicho,
        raw: entityReply(pregunta, fase, cuantos, 'en') ?? dicho,
    });
}

const COMMANDS: readonly Command[] = [
    {
        name: '//help',
        summary: { es: 'esta lista', en: 'this list' },
        secretId: 'commands',
        resolve: (_ctx, _args, lang, random = Math.random) => {
            // DE VEZ EN CUANDO NO CONTESTA. Una ayuda que siempre responde igual
            // se lee como documentación; ésta es una máquina cansada, y una de
            // cada seis veces no está para listas. Volver a pedirla funciona: es
            // un desplante, no una avería.
            if (random() < SNARK_ODDS) return texto(pickOne(HELP_SNARK, lang, random));

            /*
             * HACERLE CASO A LA PISTA DA EL FARO.
             *
             * Tecleaste algo que no existía, la máquina te señaló `//help`, y
             * viniste. Eso es un faro: la luz llevaba encendida desde el
             * principio y sólo hacía falta mirarla.
             *
             * ⚠ SÓLO SI LA PISTA LLEGÓ ANTES. Dar la pieza por teclear `//help`
             * a secas la regalaría al primer minuto y a todo el mundo: es el
             * comando más obvio de la app. Lo que se premia no es la lista, es
             * haber estado perdido y haber seguido la señal.
             *
             * Y va DESPUÉS del desplante: una de cada seis veces `//help` no
             * contesta, y cobrar el premio sin haber visto la lista sería
             * premiar una puerta que no se abrió.
             */
            const faro = sawHint() ? awardFrom('guidance') : null;

            // Un comando escondido pasa a listarse cuando lo USÁS. Ver no es
            // descubrir: leer su nombre en una ventana de error no basta, hay
            // que teclearlo.
            const enEstaVersion = COMMANDS.filter((c) =>
                isV02() ? !c.notInV02 : !c.onlyV02
            );
            const visible = (c: Command) => !c.hidden || isUnlocked(c.name);
            const tachados = enEstaVersion.filter((c) => !visible(c));
            const soltado = tachados.length > 0 ? leakOne(random) : '';

            // CADA COMANDO OCUPA SU SITIO, descubierto o no. Antes los tachados
            // iban todos al final, y eso contaba de más: se veía de un vistazo
            // cuáles eran nuevos y cuáles no. Con el orden de siempre,
            // descubrir uno no lo añade a la lista — destapa el hueco que ya
            // tenía, que es lo que de verdad pasa.
            const filas: ReplyRow[] = [
                { text: T.availableCommands[lang] },
                { text: '' },
                ...enEstaVersion.map((c): ReplyRow =>
                    visible(c)
                        ? { text: `  ${c.name.padEnd(12)} ${c.summary[lang]}` }
                        : { scramble: c.name.length - COMMAND_PREFIX.length }
                ),
                // Y una de cada cuatro veces suelta UNO entero: la red que
                // garantiza que, insistiendo, todo acaba encontrándose.
                ...(soltado && random() < LEAK_ODDS
                    ? [{ text: '' }, { text: fill(T.leak[lang], { cmd: soltado }) }]
                    : []),
            ];

            if (faro) filas.push({ text: '' }, { text: T.artEarned[lang] });

            return {
                // El texto plano es lo que se teclea y lo que mide los tiempos;
                // las filas tachadas cuentan como una línea vacía de su ancho.
                output: filas
                    .map((f) => ('text' in f ? f.text : ''))
                    .join('\n'),
                effect: SIN_EFECTO,
                rows: filas,
            };
        },
    },
    {
        name: '//version',
        summary: {
            es: 'quién dice ser este sistema',
            en: 'who this system claims to be',
        },
        resolve: (_ctx, _args, lang) =>
            texto(T.version[lang]),
    },
    {
        name: '//whoami',
        notInV02: true,
        hidden: true,
        summary: {
            es: 'a quién cree tener enfrente',
            en: 'who it thinks is out there',
        },
        secretId: 'whoami',
        resolve: (_ctx, _args, lang) => texto(T.whoami[lang]),
    },
    {
        name: '//sudo',
        notInV02: true,
        hidden: true,
        summary: { es: 'pedir permiso', en: 'ask for permission' },
        secretId: 'sudo',
        resolve: (_ctx, _args, lang) =>
            texto(T.sudo[lang]),
    },
    {
        name: '//uptime',
        notInV02: true,
        hidden: true,
        summary: {
            es: 'cuánto lleva abierta esta pestaña',
            en: 'how long this tab has been open',
        },
        resolve: (ctx, _args, lang) =>
            texto(
                `${T.uptimeLabel[lang]}  ${formatDuration(
                    ctx.now.getTime() - ctx.sessionStart.getTime()
                )}`
            ),
    },
    {
        name: '//date',
        notInV02: true,
        summary: {
            es: 'la hora acá y la hora del sistema',
            en: 'your time and system time',
        },
        secretId: 'date',
        resolve: (ctx, _args, lang) => texto(formatDate(ctx.now, lang)),
    },
    {
        name: '//ls',
        summary: { es: 'tus notas', en: 'your notes' },
        secretId: 'inspect',
        resolve: (ctx, _args, lang) => texto(formatNotes(ctx.notes, lang)),
    },
    {
        name: '//df',
        notInV02: true,
        summary: { es: 'cuánto llevás escrito', en: 'how much you have written' },
        secretId: 'inspect',
        resolve: (ctx, _args, lang) => texto(formatUsage(ctx.notes, lang)),
    },
    {
        name: '//ps',
        notInV02: true,
        hidden: true,
        summary: {
            es: 'qué está corriendo ahora mismo',
            en: "what's running right now",
        },
        secretId: 'inspect',
        resolve: (_ctx, _args, lang) => texto(processTable(lang)),
    },
    {
        name: '//log',
        notInV02: true,
        hidden: true,
        summary: { es: 'las últimas peticiones', en: 'the last requests' },
        secretId: 'log',
        resolve: (ctx) => texto(ctx.log),
    },
    {
        name: '//history',
        notInV02: true,
        hidden: true,
        summary: {
            es: 'las versiones guardadas de esta nota',
            en: 'the saved versions of this note',
        },
        secretId: 'history',
        // Y da su pieza: una cinta perforada. Es lo que ES un historial — el
        // registro completo de lo que pasó, en una forma que el ojo no lee de un
        // vistazo.
        // "ACTAS" es deliberado: no dice "versiones" ni "historial", dice el
        // registro oficial de algo que pasó. "THE RECORDS" hace lo mismo.
        resolve: (_ctx, _args, lang) => {
            awardFrom('history');

            return {
                output: T.fetchingHistory[lang],
                effect: { kind: 'fetch-history' },
            };
        },
    },
    {
        name: '//diag',
        notInV02: true,
        hidden: true,
        summary: {
            es: 'abrir el panel de diagnóstico',
            en: 'open the diagnostics panel',
        },
        secretId: 'diagnostics',
        resolve: (_ctx, _args, lang) => ({
            output: T.openingDiag[lang],
            effect: { kind: 'open-diagnostics' },
        }),
    },
    {
        name: '//chaos',
        notInV02: true,
        hidden: true,
        summary: {
            es: 'encender o apagar los efectos (on | off)',
            en: 'turn the effects on or off (on | off)',
        },
        secretId: 'chaos',
        resolve: (ctx, args, lang) => {
            const arg = args.trim().toLowerCase();
            // `on` y `off` son argumentos, no palabras: no se traducen.
            const rotulo = T.effectsLabel[lang];

            if (arg === 'on' || arg === 'off') {
                const enabled = arg === 'on';
                return {
                    output: `${rotulo}: ${enabled ? 'ON' : 'OFF'}`,
                    effect: { kind: 'set-effects', enabled },
                };
            }

            // Sin argumento no cambia nada: informa. Un `//chaos` suelto que
            // apagara los efectos sería una sorpresa desagradable.
            const uso = T.useVerb[lang];
            return texto(
                `${rotulo}: ${ctx.effectsEnabled ? 'ON' : 'OFF'} · ${uso} >chaos on | >chaos off`
            );
        },
    },
    {
        name: '//panic',
        notInV02: true,
        hidden: true,
        summary: { es: 'romper el sistema', en: 'break the system' },
        secretId: 'collapse',
        resolve: () => ({ output: '', effect: { kind: 'collapse' } }),
    },
    {
        name: '//hi',
        notInV02: true,
        hidden: true,
        summary: { es: 'saludar', en: 'say hello' },
        secretId: 'greeting',
        resolve: (ctx, _args, lang) => {
            const reply = greetingFor(ctx.greetings, lang);
            if (!reply.kick) return texto(reply.text);

            // A la tercera vez que te echa ya no te echa: la página se muere.
            // Insistir después de que te haya sacado dos veces es el caso más
            // testarudo que hay, y merece la respuesta más fuerte que la
            // plataforma permite.
            const veces = ctx.kicks;
            return {
                output: veces >= KILL_AFTER_KICKS ? T.enough[lang] : reply.text,
                effect:
                    veces >= KILL_AFTER_KICKS
                        ? { kind: 'kill-page' }
                        : { kind: 'leave-note' },
            };
        },
    },
    {
        name: '//whoareu',
        secretId: 'chat',
        notInV02: true,
        hidden: true,
        summary: { es: 'preguntarle quién es', en: 'ask who it is' },
        // El espejo de `//whoami`: allá no puede saber quién sos vos —la cookie
        // es httpOnly— y acá sí sabe quién es ella. La máquina se conoce mejor a
        // sí misma que a vos, y eso dice todo lo que hay que decir de esta app.
        resolve: (ctx, _args, lang) => {
            // El ente primero. Si sigue dormido cae a la fachada de siempre.
            const dicho = askEntity('whoareu', ctx, lang);
            if (dicho !== null) return { ...texto(dicho), secretId: 'entity-awake' };

            return texto(
                chatReplyFor('who', ctx.chat, lang).text ??
                    unknownCommand('whoareu', lang)
            );
        },
    },
    {
        name: '//howareu',
        secretId: 'chat',
        notInV02: true,
        hidden: true,
        summary: { es: 'preguntarle cómo está', en: 'ask how it is doing' },
        resolve: (ctx, _args, lang) => {
            const dicho = askEntity('howareu', ctx, lang);
            if (dicho !== null) return { ...texto(dicho), secretId: 'entity-awake' };

            return texto(
                chatReplyFor('how', ctx.chat, lang).text ??
                    unknownCommand('howareu', lang)
            );
        },
    },
    {
        name: '//date_off',
        secretId: 'date-off',
        notInV02: true,
        hidden: true,
        summary: {
            es: 'soltar el reloj del sistema',
            en: 'let the system clock go',
        },
        resolve: (_ctx, _args, lang) => ({
            output: T.clockReleased[lang],
            effect: { kind: 'time-drift' },
        }),
    },
    {
        name: '//art',
        notInV02: true,
        hidden: true,
        summary: { es: 'lo que quedó dibujado', en: 'what was left drawn' },
        secretId: 'art',
        /*
         * ⚠ ES EL CATÁLOGO. NO DA PIEZAS.
         *
         * Antes sacaba una cada vez que se tecleaba, y eso convertía la
         * colección en ocho pulsaciones de Enter: la pestaña con estrella no
         * significaba nada. Ahora cada pieza se gana por su camino —el ente, la
         * v0.2, los dos marcadores del pong, los secretos— y esto sólo dice
         * cuáles llevás.
         *
         * Las que faltan salen revueltas, con la misma animación de `//help` y
         * por el mismo motivo: un rótulo que diga «bloqueado» es la app
         * contándote que hay algo; unas letras que no paran quietas SON algo
         * escondido.
         */
        resolve: (_ctx, _args, lang) => {
            // CONSULTAR REVELA. Lo que ganaste no está en la colección hasta que
            // vienes a mirar qué tenés — es lo que hace que este comando sirva
            // para algo en vez de ser una lista de lo que ya sabés.
            revealArt();

            const filas = catalogRows(lang);

            // SIN NINGUNA PIEZA, NO EXISTE. Un catálogo vacío anunciaría que hay
            // una colección que llenar, y encontrar la primera es parte de lo
            // que se descubre.
            if (filas.length === 0) {
                return {
                    ...texto(say(T.unknownCommand, lang, { name: '//ART' })),
                    denied: true,
                };
            }

            const tengo = filas.filter((f) => f.found).length;

            const rows: ReplyRow[] = [
                {
                    text: say(T.artCatalog, lang, {
                        n: tengo,
                        total: filas.length,
                    }),
                },
                { text: '' },
                /*
                 * TRES ESTADOS, TRES FORMAS DE PINTARSE.
                 *
                 *  · La que no tenés: letras revueltas. De ella viaja el LARGO y
                 *    no el nombre — lo que no está no se puede leer en el
                 *    inspector, y el largo ya es una pista.
                 *  · La que tenés sin abrir: su número y el hueco. Sabés que la
                 *    tenés y no sabés qué es.
                 *  · La abierta: su pie.
                 */
                ...filas.map((f): ReplyRow => {
                    const marca = `  ${f.number}/${filas.length}  `;

                    if (!f.found) return { scramble: f.length, prefix: marca };
                    if (!f.opened) return { text: marca + UNOPENED[lang] };

                    // ABIERTA Y AÚN SIN NOMBRE. Tenés el dibujo delante y el
                    // pie sigue revuelto: es el manipulador antes de haber
                    // usado el código para entrar y para salir.
                    if (!f.named) return { scramble: f.length, prefix: marca };

                    return { text: marca + f.label };
                }),
                { text: '' },
                {
                    text:
                        tengo === filas.length
                            ? T.artComplete[lang]
                            : T.artDrawHint[lang],
                },
            ];

            return {
                output: rows
                    .map((r) => ('text' in r ? r.text : ''))
                    .join('\n'),
                effect: SIN_EFECTO,
                rows,
            };
        },
    },
    {
        /*
         * Dibuja la que elijas, y sólo si te la ganaste.
         *
         * Con un número que no tenés contesta lo MISMO que con uno que no
         * existe: decir «esa existe pero no es tuya» sería un cartel. Es el
         * mismo trato que `//attach_*` con los PID.
         */
        name: '//art_1',
        notInV02: true,
        match: /^art_(\d+)$/,
        hidden: true,
        summary: { es: '—', en: '—' },
        resolve: (_ctx, args, lang) => {
            const piece = pieceByNumber(Number(args));

            if (!piece) {
                return {
                    ...texto(
                        say(T.unknownCommand, lang, {
                            name: `//art_${args}`.toUpperCase(),
                        })
                    ),
                    denied: true,
                };
            }

            // Se recuerda cuál fue, para que `//keep` pueda encadenarse.
            rememberDrawn(piece);

            // ABRIRLA es lo que revela su pie. Tenerla no es saber qué es: en el
            // catálogo se ve que tenés la seis, y qué es la seis sólo se sabe
            // acá. Sin esto, este comando sería una forma de volver a ver algo
            // que el catálogo ya te había contado.
            markOpened(piece.id);

            // EL DIBUJO SÍ, EL PIE NO SIEMPRE. El manipulador se gana con ver
            // el morse, y su dibujo es la PISTA de lo que todavía no sacaste:
            // soltar acá el nombre sería dar la pista ya resuelta.
            return texto(
                [
                    // Con el nombre por ganar, el dibujo TAMPOCO está entero:
                    // ver el morse no es entenderlo. Ver `artOf`.
                    artOf(piece),
                    '',
                    `-- ${captionKnown(piece) ? piece.caption[lang] : UNNAMED[lang]}`,
                    '',
                    T.artKeepHint[lang],
                ].join('\n')
            );
        },
    },
    {
        name: '//keep',
        notInV02: true,
        hidden: true,
        summary: { es: 'quedarse la última', en: 'keep the last one' },
        resolve: (_ctx, _args, lang) => {
            if (!canKeep()) return texto(T.keepNothing[lang]);

            const ultima = lastDrawn();
            if (!ultima) return texto(T.keepNothing[lang]);

            /*
             * SE DIBUJA EN LA NOTA ABIERTA, y ahí queda guardada.
             *
             * ⚠ ANTES CREABA UNA NOTA APARTE. El razonamiento de entonces era que
             * escribir encima obligaría a tener una nota en blanco a mano — pero
             * eso convirtió `//keep` en un botón que hacía algo en OTRO sitio: lo
             * ejecutabas y no pasaba nada donde estabas mirando. Se sentía roto
             * aunque funcionara, que es peor que estarlo.
             *
             * Escribiéndola acá la pieza es tuya de verdad: está en tu archivo, se
             * puede editar, se le puede poner texto alrededor y se borra como
             * cualquier cosa que hayas escrito. Eso es quedársela.
             *
             * Va por la misma vía que `//recover`, que ya devolvía texto a la nota
             * abierta.
             */
            return {
                output: T.keepDone[lang],
                effect: {
                    kind: 'write-note',
                    text: asNote(ultima, lang),
                    // Y con su ficha de catálogo: `POLILLA · 1/16`, no «Nueva
                    // nota». Dice qué pieza es y cuántas hay.
                    title: noteTitle(ultima, lang),
                },
                secretId: 'art-keep',
            };
        },
    },
    {
        name: '//todo',
        secretId: 'v02-todo',
        hidden: true,
        onlyV02: true,
        summary: {
            es: 'lo que faltaba por hacer',
            en: 'what was left to do',
        },
        /*
         * EL COMANDO QUE MEJOR CUENTA LA v0.2.
         *
         * Es la lista de tareas que alguien dejó escrita y nunca borró. Quien la
         * lee desde acá ve cosas por hacer; quien conoce la v1.0 reconoce en
         * ella LO QUE ACABÓ EXISTIENDO — el auto-guardado, la papelera, los
         * comandos. La v0.2 no sabe que va a llegar a ser algo.
         *
         * Y el último punto no se cumplió: los archivos de la v0.2 nunca se
         * migraron, y por eso siguen sin verse desde la versión nueva.
         */
        resolve: (_ctx, _args, lang) => {
            /*
             * LA ÚLTIMA LÍNEA ES LA SALIDA, y no está de adorno.
             *
             * Dentro de la v0.2 el reloj ya no enseña el morse: es la puerta de
             * entrada. Quien entró hace semanas y no se acuerda de la palabra no
             * tiene dónde mirarla — y un estado del que no se puede salir es una
             * app rota, no un secreto.
             *
             * Va escrita como lo que sería en un fichero así: una nota que
             * alguien se dejó a sí mismo para no tener que acordarse. No explica
             * nada; quien la necesita entiende para qué es.
             */
            const palabra = v02Word();
            const nota = palabra ? say(T.todoExit, lang, { word: palabra }) : '';

            return texto(T.todo[lang] + nota);
        },
    },
    {
        name: '//recover',
        secretId: 'v02-recover',
        hidden: true,
        onlyV02: true,
        summary: {
            es: 'traer de vuelta lo que no se guardó',
            en: 'bring back what was not saved',
        },
        // LA RED DE LA v0.2. Perder de verdad, sí; perder para siempre y sin
        // aviso, no — eso sigue siendo la primera regla del proyecto.
        resolve: (_ctx, _args, lang) => {
            const caidas = allDropped();
            if (caidas.length === 0) return texto(T.recoverNothing[lang]);

            const ultima = caidas[caidas.length - 1];
            return {
                output: T.recoverDone[lang],
                effect: { kind: 'recover', text: ultima.content },
            };
        },
    },
    {
        name: '//reset',
        notInV02: true,
        hidden: true,
        summary: {
            es: 'empezar de cero, como la primera vez',
            en: 'start over, like the first time',
        },
        /*
         * ⚠ NO BORRA A LA PRIMERA, Y NO CUENTA COMO SECRETO.
         *
         * Es el único comando que destruye algo tuyo —secretos, piezas,
         * marcadores, el progreso entero— y estaba a un Enter de distancia.
         * Teclearlo por probar, o dejarlo escrito en una nota y pulsar Enter, y
         * se acabó la colección.
         *
         * LA CONFIRMACIÓN ES UNA PALABRA QUE HAY QUE COPIAR, no un segundo
         * Enter: dos Enter seguidos es exactamente lo que hace quien no leyó el
         * aviso.
         *
         * Y tampoco es un hallazgo. Encontrarlo no es un logro: es saber que hay
         * un botón peligroso. Contarlo entre los secretos animaba a usarlo, que
         * es justo lo contrario de lo que hace falta acá.
         */
        resolve: (_ctx, _args, lang) => {
            askConfirm('reset');
            return texto(T.resetWarn[lang]);
        },
    },
    {
        name: '//clear',
        summary: { es: 'vaciar la nota', en: 'empty the note' },
        resolve: () => ({ output: '', effect: { kind: 'clear-note' } }),
    },
    /**
     * `//attach_<PID>` · la puerta al vsync-test.
     *
     * OCULTO A PROPÓSITO. Sólo se llega desde `//ps`, que es lo que convierte
     * esa tabla de adorno en la única puerta del juego.
     *
     * Es un token único —`//attach_6`, no `//attach 6`— porque en terminal el
     * guion bajo hace de espacio y los espacios de verdad separan argumentos.
     * Además elimina una fragilidad: sin argumento que parsear, no puede
     * romperse por un espacio de más al teclearlo.
     */
    {
        name: '//attach_6',
        notInV02: true,
        match: /^attach_(\d+)$/,
        hidden: true,
        summary: { es: '—', en: '—' },
        resolve: (_ctx, args, lang) => {
            /*
             * ⚠ NO EXISTE HASTA HABER USADO `//ps`.
             *
             * Era el trato desde el principio —«sólo se llega desde `//ps`, que
             * es lo que lo convierte en un hallazgo»— y no se cumplía: resolvía
             * igual lo hubieras leído o no. Quien probaba `//attach_1` a ciegas
             * se topaba con la lista de procesos sin haberla pedido.
             *
             * Y contesta EXACTAMENTE lo que una palabra inventada. Un «todavía
             * no» sería peor que nada: confirma que ahí hay algo y convierte la
             * puerta cerrada en un cartel.
             */
            if (!isUnlocked('//ps')) {
                return {
                    ...texto(
                        say(T.unknownCommand, lang, {
                            name: `//attach_${args}`.toUpperCase(),
                        })
                    ),
                    // `denied` y no una comparación de cadenas: quien se niega
                    // es quien sabe que se negó. Sin esto, teclearlo a ciegas
                    // destapaba su hueco en la ayuda con la misma respuesta que
                    // le dice que no existe.
                    denied: true,
                };
            }

            const pid = Number(args);
            const proceso = PROCESSES.find((p) => p.pid === pid);

            if (!proceso) {
                return texto(
                    say(T.noSuchProcess, lang, { pid })
                );
            }

            if (pid !== PONG_PID) {
                const enUso = say(T.processInUse, lang, { name: proceso.name });

                return texto(`${enUso} ${proceso.refusal[lang]}`);
            }

            return {
                output: say(T.attaching, lang, { name: proceso.name }),
                effect: { kind: 'play-pong' },
                // Sólo acá. Adjuntarse al auto-guardado y llevarse un reproche
                // no es haber encontrado nada.
                secretId: 'pong',
            };
        },
    },
];

/**
 * Los nombres de los comandos ESCONDIDOS.
 *
 * Los usan las ventanas de error del fallo cromático, que de vez en cuando
 * nombran uno en lugar de quejarse del vídeo. Es la tercera fuga —junto al
 * recuento de `//help` y su soltada ocasional— y la que menos se parece a una
 * pista: parece que al sistema se le escapó, no que te lo esté enseñando.
 *
 * ⚠ ES UNA FUNCIÓN, NO UNA CONSTANTE, y ésa es la corrección importante.
 *
 * Era una lista calculada UNA VEZ al cargar el módulo, así que no sabía en qué
 * versión estabas: dentro de la v0.2 soltaba comandos de la v1.0, que ahí no
 * existen y contestan «desconocido». Una pista que no lleva a ninguna parte es
 * peor que ninguna pista — enseña que las pistas de esta app no valen, y a
 * partir de ahí ya nadie sigue ninguna.
 */
export function hiddenCommandNames(): readonly string[] {
    const enV02 = isV02();

    return COMMANDS.filter(
        (c) => c.hidden && (enV02 ? !c.notInV02 : !c.onlyV02)
    ).map((c) => c.name);
}

/**
 * Los nombres de los comandos ANUNCIADOS, para la ayuda y para los tests.
 *
 * Deja fuera los ocultos, y esa exclusión es justo el invariante que interesa:
 * lo que hay acá es exactamente lo que `//help` lista. `//attach_*` no está
 * porque no debe poder encontrarse leyendo la ayuda — sólo desde `//ps`.
 */
export const COMMAND_NAMES: readonly string[] = COMMANDS.filter(
    (c) => !c.hidden
).map((c) => c.name);

/**
 * Ejecuta lo que haya escrito.
 *
 * Devuelve `null` si el contenido no cumple la condición de activación, que es
 * la señal de "esto no era para mí, dejá que Enter haga lo de siempre".
 */
/**
 * ¿Esto que hay escrito hay que EJECUTARLO al pulsar Enter?
 *
 * Es `isCommandLine` más las respuestas a un `[y/n]` pendiente, y existe porque
 * la pregunta de `//reset` no funcionaba: el editor consultaba `isCommandLine`
 * por su cuenta antes de llamar a `run`, así que una `y` suelta —que no es una
 * línea de comando— no llegaba nunca. `run` la habría entendido; nadie se la
 * daba.
 *
 * La lección, otra vez la de siempre: cuando la misma decisión se toma en dos
 * sitios, tarde o temprano dejan de decir lo mismo (REGLAS · B5).
 */
export function isExecutable(content: string): boolean {
    if (isCommandLine(content)) return true;

    return pendingConfirm() !== null && readAnswer(content) !== null;
}

export function run(
    content: string,
    ctx: CommandContext,
    random: () => number = Math.random
): CommandResult | null {
    const lang = ctx.lang ?? getLang();

    /*
     * LA PREGUNTA VA ANTES QUE NADA, y sin exigir el prefijo `//`.
     *
     * Una terminal que pregunta `[y/n]` espera una letra, no otro comando. Si
     * `y` tuviera que escribirse `//y` dejaría de parecer una terminal y pasaría
     * a parecer un formulario.
     *
     * Sólo `y`, `s` y `n` sueltas contestan. Cualquier otra cosa NO es un «no»:
     * quien escribe otra cosa no está contestando, está haciendo otra cosa — y
     * su texto tiene que seguir su camino, incluido volver a ser una nota
     * normal.
     */
    const preguntando = pendingConfirm();
    if (preguntando !== null) {
        const respuesta = readAnswer(content);

        if (respuesta !== null) {
            clearConfirm();

            /*
             * ⚠ PRIMERO CUÁL, DESPUÉS QUÉ.
             *
             * Las dos preguntas del juego usan la misma letra en la misma
             * línea. Sin esta rama, aceptarle al ente que limpie la papelera
             * caería en el borrado del progreso entero — secretos, piezas,
             * marcadores— por un `s` que quería decir otra cosa.
             */
            if (preguntando === 'entity-clean') {
                if (respuesta === 'yes') {
                    return {
                        output: TRIAL_REPLY.offerTaken[lang],
                        effect: { kind: 'empty-trash' },
                    };
                }

                /*
                 * Decirle que no es lo que abre, y no cuesta nada.
                 *
                 * Es la única trampa donde la respuesta prudente es la que
                 * premia. Por eso aceptar tiene que costar algo de verdad: si
                 * fuese gratis no habría decisión, habría un botón con dos
                 * etiquetas.
                 */
                return {
                    output: TRIAL_REPLY.offerRefused[lang],
                    effect: SIN_EFECTO,
                    secretId: 'entity-refused',
                };
            }

            if (respuesta === 'yes') {
                return { output: '', effect: { kind: 'reset-all' } };
            }

            /*
             * DECIR QUE NO TAMBIÉN TIENE PREMIO, de vez en cuando.
             *
             * Una de cada cinco veces el «no» enseña el borrado ENTERO —el mismo,
             * sin trampa— y remata con un «era broma» sin haber tocado nada. Es
             * la única forma de que la respuesta prudente no sea siempre la
             * aburrida.
             *
             * Y sólo pasa con el «no». Con el «sí» no hay sorteo: pedir que
             * borre y que a veces no borre sería una app que no hace lo que le
             * pedís, y eso no es un secreto, es un fallo.
             */
            /*
             * ⚠ SI EL RETO VINO DE ÉL, LA BROMA ES SEGURA.
             *
             * Fuera del reto sigue mandando el dado —una de cada cinco— porque
             * ahí la gracia es justamente que no se sabe. Pero él prometió que
             * ibas a descubrir algo, y una promesa que se cumple una de cada
             * cinco veces no es una promesa: es un fallo con buena prensa.
             *
             * Sólo vale si todavía no te lo dio por esquivado: cumplirle a
             * quien ya se rajó no premia nada.
             */
            const prometido =
                readEntity().dared === true && readEntity().dodged !== true;

            if (prometido || isPrank(random)) {
                // Y da su pieza: una carita. Es el único momento en que la
                // máquina se ríe CON vos y no de vos.
                awardFrom('prank');

                return {
                    output: '',
                    effect: { kind: 'reset-prank' },
                    // Que te haga creer que borró todo y no borrara nada ES un
                    // hallazgo, y de los buenos: sólo lo ve quien tuvo el valor
                    // de teclear `//reset` y la prudencia de decir que no.
                    secretId: 'reset-prank',
                };
            }

            return { output: T.resetCancel[lang], effect: SIN_EFECTO };
        }
    }

    if (!isCommandLine(content)) return null;

    // Y cualquier comando que no sea la respuesta retira la pregunta: dejarla en
    // el aire convertiría una `y` tecleada más tarde, por cualquier motivo, en
    // un borrado.
    clearConfirm();

    const linea = content
        .replace(/\n$/, '')
        .trim()
        .slice(COMMAND_PREFIX.length)
        .trim();
    const [nombre, ...resto] = linea.split(/\s+/);
    const corto = nombre.toLowerCase();
    const buscado = `${COMMAND_PREFIX}${corto}`;

    // Primero por nombre exacto; si no, por patrón. El orden importa: un
    // comando literal nunca puede quedar tapado por el patrón de otro.
    // CADA VERSIÓN TIENE SUS COMANDOS. En la v0.2 los de la v1.0 no existen
    // todavía y contestan «comando desconocido», igual que una palabra
    // inventada — porque en esa versión eso es lo que son. Y al revés: lo que
    // es exclusivo de la v0.2 no existe en la nueva, porque nadie lo llevó.
    const enV02 = isV02();
    const disponibles = COMMANDS.filter((c) =>
        enV02 ? !c.notInV02 : !c.onlyV02
    );

    const command =
        disponibles.find((c) => c.name === buscado) ??
        disponibles.find((c) => c.match?.test(corto));

    /*
     * ⚠ LA RESPUESTA A SU PREGUNTA VA ANTES QUE LA PUERTA DE LA v0.2.
     *
     * La respuesta ES la palabra de la v0.2, y teclear esa palabra normalmente
     * cruza la puerta. Si esta recogida fuera después, contestarle bien te
     * mandaría a la versión vieja en lugar de abrirte el lore: la recompensa
     * exacta que no corresponde, y encima confusa — hiciste lo que te pidió y
     * el sistema te llevó a otro sitio.
     *
     * CONSUME UNA SOLA LÍNEA. Aciertes o falles, la pregunta se retira: una
     * pregunta que se queda puesta se come el comando siguiente y parece que la
     * app se colgó.
     */
    if (readEntity().asking === 'word') {
        setAsk(null);

        if (wordIsRight(corto, tripWord())) {
            /*
             * El primer momento en que el intercambio va en las dos
             * direcciones. Por eso abre fase y no da sólo una frase.
             *
             * ⚠ Y ANOTA QUE LE PASASTE UNA PRUEBA, que es distinto de estar en
             * `hablando`: a `hablando` también se llega y después se sigue sin
             * demostrar nada más. Sin esto, `willingNow` no da `true` nunca y
             * el final no existe.
             */
            markProved();
            setPhase('hablando');

            return {
                output: TRIAL_REPLY.wordOk[lang],
                effect: SIN_EFECTO,
                secretId: 'entity-proved',
            };
        }

        return { output: TRIAL_REPLY.wordBad[lang], effect: SIN_EFECTO };
    }

    // LA PALABRA DEL MORSE. Se reconoce acá y no como un comando declarado
    // porque cambia por sesión: metida en la lista se filtraría por `//help` y
    // por las ventanas de error, que sólo conocen los comandos declarados. Acá
    // no existe hasta que la tecleás.
    //
    // Y ESTANDO DENTRO, la que abre es la que abrió. El morse cambia por
    // sesión y ahí dentro el reloj ya no lo enseña, así que exigir la palabra
    // de hoy dejaría encerrado a quien entró ayer. Se acepta la guardada.
    const entrando = !isV02();
    const abre = entrando
        ? isSessionWord(corto)
        : isSessionWord(corto) || corto.toUpperCase() === v02Word();

    if (abre) {
        /*
         * SALIR CON EL CÓDIGO CIERRA EL VIAJE, y eso desbloquea el NOMBRE del
         * manipulador — no una pieza nueva.
         *
         * Entrar se hace medio por accidente: se descifra el morse, se teclea
         * la palabra y pasa algo. Salir con la MISMA palabra exige haber
         * entendido que no era un comando más, sino una llave que gira en los
         * dos sentidos. Ésa es la comprensión que se premia, y por eso el
         * premio es entender qué era el aparato del dibujo.
         */
        if (!entrando) markV02RoundTrip();

        return {
            output: entrando ? T.v02Enter[lang] : T.v02Leave[lang],
            // Descifrar el morse y CRUZAR la puerta son dos cosas distintas, y
            // la segunda merece contarse aparte: mucha gente va a leer el código
            // sin llegar a teclear la palabra.
            secretId: 'v02',
            // En mayúsculas: la palabra se descifra a mano y se teclea como
            // salga, pero la que se guarda es una sola. Normalizar acá evita que
            // «modo» y «MODO» se guarden como dos puertas distintas.
            effect: {
                kind: 'toggle-v02',
                entering: entrando,
                word: corto.toUpperCase(),
            },
        };
    }

    if (!command) {
        /*
         * ⚠ EL ENTE ESCUCHA JUSTO ACÁ, donde la máquina deja de entender.
         *
         * Las variantes escritas a mano —`//quien`, `//como_estas`, `//who`— no
         * son comandos declarados, y NO PUEDEN SERLO por dos razones concretas:
         *
         *  · `allCommandsFound()` exige que TODOS los ocultos estén
         *    desbloqueados. Uno más, que no se lista en ningún lado, dejaría el
         *    arte de la terminal prácticamente inalcanzable.
         *  · Un comando con patrón abierto se tragaría los desconocidos de
         *    verdad, y con ellos el `rememberHint()` de abajo, que es de donde
         *    cuelga el faro de `//help`.
         *
         * Puesto acá no toca ninguna de las dos cosas. Y de regalo funciona
         * DENTRO DE LA v0.2 sin nada especial: ahí `//whoareu` está filtrado por
         * `notInV02`, así que cae solo en esta rama.
         *
         * Que hable desde el sitio de «no te entiendo» tampoco es casualidad:
         * está encerrado, y lo único que le llega es lo que el sistema descarta.
         */
        /*
         * LOS DOS COMANDOS DEL FINAL.
         *
         * No están declarados en `COMMANDS`, por lo mismo que las variantes de
         * sus preguntas: `allCommandsFound()` exige tener TODOS los ocultos, y
         * dos que sólo existen después de un arco entero dejarían el arte de la
         * terminal fuera del alcance de casi cualquiera.
         *
         * ⚠ Y NO EXISTEN HASTA QUE ÉL TE PASA EL SUYO. Antes contestan «comando
         * desconocido», que es lo que son: teclear `//unbind` por casualidad no
         * puede abrirte el final.
         */
        if (commandGiven() && !entityGone()) {
            if (corto === UNBIND) {
                unbind();
                return { output: TRIAL_REPLY.unbound[lang], effect: SIN_EFECTO };
            }

            /*
             * REPORTARLO ES EL OTRO FINAL, y se puede desde que te lo pasa —
             * incluso sin haberlo ejecutado. Elegir taparlo sin mirar qué era es
             * una decisión tan válida como la otra, y bastante más humana.
             */
            if (corto === REPORT) {
                reportedIt();
                return {
                    output: TRIAL_REPLY.reported[lang],
                    effect: SIN_EFECTO,
                    secretId: 'entity-reported',
                };
            }
        }

        /*
         * LAS INSTRUCCIONES DE LA NOTA DEL DÍA SIGUIENTE.
         *
         * La palabra va ESCRITA en la nota, así que no hay nada que adivinar:
         * lo que se premia es haber vuelto y haberle hecho caso. Y sin la nota
         * de por medio la palabra no existe — teclearla por casualidad no puede
         * dar nada, porque el regalo es por haber vuelto.
         *
         * ⚠ Lo que suelta ACERCA, no entrega: la pista del `_`. Un favor que
         * desbloquea algo es una misión, y entonces él pasa a ser un menú.
         */
        if (readEntity().leftVuelta === true && corto === GIFT_WORD) {
            return {
                output: TRIAL_REPLY.gift[lang],
                effect: SIN_EFECTO,
                secretId: 'entity-gift',
            };
        }

        const dicho = askEntity(corto, ctx, lang);
        if (dicho !== null) {
            return { output: dicho, effect: SIN_EFECTO, secretId: 'entity-awake' };
        }

        const desconocido = say(T.unknownCommand, lang, { name: nombre.toUpperCase() });

        // ACÁ ES DONDE SE ENCIENDE EL FARO. Tecleaste algo que no existe y la
        // máquina, en vez de dejarte a oscuras, te señaló dónde mirar. Hacerle
        // caso es lo que da la pieza — de eso se ocupa `//help`.
        rememberHint();

        return { output: desconocido, effect: SIN_EFECTO };
    }

    // Cuando el comando empareja por patrón, el argumento es lo capturado —el
    // PID de `//attach_6`— y no lo que venga separado por espacios.
    const capturado = command.match?.exec(corto)?.[1];
    const args = capturado ?? resto.join(' ');

    const { output, effect, secretId, rows, denied } = command.resolve(
        ctx,
        args,
        lang,
        random
    );

    /*
     * USARLO lo desbloquea — pero sólo si de verdad ocurrió algo.
     *
     * Va acá y no dentro de cada comando para que ninguno pueda olvidarse de
     * hacerlo. Y va DESPUÉS de resolver, no antes, por `//attach_*`: ése se
     * niega a existir mientras no hayas usado `//ps`, y desbloqueándolo antes
     * quien lo tecleara a ciegas destapaba su hueco en la ayuda con la misma
     * respuesta que le dice que no existe.
     *
     * Un comando que contesta «desconocido» no se ha usado: se ha fallado.
     */
    if (command.hidden && !denied) markUsed(command.name);

    /*
     * EL DISQUETE SE GANA VACIANDO LA v0.2, no entrando en ella.
     *
     * Entrar ya tiene premio: es la puerta, y el manipulador cuelga de ella.
     * Dar además una pieza por cruzarla convertía el sitio en un pasillo — se
     * entraba, se cobraba y se salía sin mirar nada. Ahora hay que encontrar
     * los comandos que SÓLO existen ahí dentro, que son pocos y por eso es un
     * remate y no una condena.
     *
     * Va acá, después de `markUsed`, porque es el único punto por el que pasan
     * todos los comandos: dentro de cada uno se olvidaría en el siguiente que
     * se añada.
     */
    const ganada =
        (v02Complete() ? awardFrom('v02') : null) ??
        (allCommandsFound() ? awardFrom('all-commands') : null);

    /*
     * LA PRUEBA DE SU MENTIRA.
     *
     * Dijo que acá no corre nada más que él, y `//ps` lista varios procesos. No
     * se añadió un comando para desmentirlo: se eligió una mentira que el juego
     * YA PODÍA desmentir, que es lo que la hace justa.
     *
     * ⚠ Va acá, DESPUÉS de resolver, y se AÑADE a la salida en vez de
     * reemplazarla. La lista de procesos tiene que seguir viéndose: es la
     * prueba. Tragársela para poner en su lugar lo que él dice convertiría una
     * comprobación en un truco de la app.
     */
    let pillado: string | null = null;
    if (readEntity().lieStanding === true && command.name === '//ps') {
        clearLie();
        // La otra prueba. Las dos abren `hablando` y las dos cuentan.
        markProved();
        setPhase('hablando');
        pillado = TRIAL_REPLY.lieProved[lang];
    }

    // Un `if` y no un ternario anidado: son dos añadidos distintos al mismo
    // texto, y encadenarlos con `?:` lo dejaba ilegible.
    let salida = output;
    if (pillado) salida = `${output}

${pillado}`;
    else if (ganada) salida = `${output}

${T.artEarned[lang]}`;

    return {
        output: salida,
        effect,
        rows,
        secretId: pillado ? 'entity-proved' : secretId ?? command.secretId,
    };
}

// ------------------------------------------------------------------
//  Formateadores
// ------------------------------------------------------------------

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

/**
 * El desfase entre el reloj del dispositivo y el del sistema, dicho en voz alta.
 *
 * `getTimezoneOffset()` devuelve los minutos que la hora local va POR DETRÁS de
 * UTC, así que 180 es UTC-03 y el signo se invierte al escribirlo.
 *
 * Que la app entera muestre fechas en UTC (`formatters.ts` usa `getUTC*`) no es
 * un defecto que este comando disimule: es la rareza real del código, y acá se
 * convierte en la única frase de lore que el usuario puede verificar él mismo
 * mirando su propio reloj.
 */
export function describeOffset(offsetMinutes: number, lang: Lang = getLang()): string {
    const minutos = -offsetMinutes;
    const signo = minutos < 0 ? '-' : '+';
    const horas = pad(Math.floor(Math.abs(minutos) / 60));
    const etiqueta = `UTC${signo}${horas}`;

    if (offsetMinutes === 0) {
        return `${etiqueta} · ${T.noOffset[lang]}`;
    }

    // La única frase de lore que el usuario puede verificar mirando su reloj.
    return `${etiqueta} · ${T.neverMoved[lang]}`;
}

function formatDate(now: Date, lang: Lang): string {
    const local = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const utc = `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}`;
    const desfase = describeOffset(now.getTimezoneOffset(), lang);
    const [etiqueta, frase] = desfase.split(' · ');

    return [
        `LOCAL     ${local} (${etiqueta})`,
        `${T.systemLabel[lang].padEnd(9)} ${utc} UTC`,
        frase,
    ].join('\n');
}

/**
 * Tus notas con las guías de puntos del listado lateral.
 *
 * Es el mismo vocabulario que `.file-row-leader` dibuja en la barra lateral —
 * nombre, puntos que crecen hasta llenar el hueco, dato— sólo que acá los puntos
 * se cuentan, porque en monoespaciada contar caracteres alinea igual de bien que
 * un flex.
 */
function formatNotes(
    notes: readonly { title: string; chars: number }[],
    lang: Lang
): string {
    if (notes.length === 0)
        return T.noFilesThisShift[lang];

    const ANCHO = 34;

    return notes
        .map((n) => {
            const nombre = n.title || T.untitled[lang];
            const tamano = `${n.chars}b`;
            const puntos = '·'.repeat(Math.max(1, ANCHO - nombre.length - tamano.length));
            return `${nombre} ${puntos} ${tamano}`;
        })
        .join('\n');
}

/** Un medidor ASCII de diez segmentos, el mismo que dibuja ProgressBar. */
function meter(ratio: number, segments = 10): string {
    const llenos = Math.min(segments, Math.max(0, Math.round(ratio * segments)));
    return '▮'.repeat(llenos) + '▯'.repeat(segments - llenos);
}

function formatUsage(
    notes: readonly { title: string; chars: number }[],
    lang: Lang
): string {
    const total = notes.reduce((suma, n) => suma + n.chars, 0);

    // CONTENT_MAX es el tope POR NOTA, no de la sesión: no hay límite de
    // cantidad de notas. Acá se usa sólo como escala para tener contra qué
    // dibujar la barra, igual que hace la barra de estado.
    const escala = LIMITS.CONTENT_MAX;

    return [
        pickPlural(lang, WRITTEN, notes.length, { b: total }),
        `${T.scaleLabel[lang].padEnd(9)} ${escala}b  ${meter(total / escala)}`,
    ].join('\n');
}

/**
 * Los procesos son los tuyos.
 *
 * Cada intervalo de esta tabla es el que corre de verdad: 2500 es
 * AUTOSAVE_DELAY_MS de NoteEditor, 60000 es POLL_INTERVAL_MS de
 * useNetworkStatus, 9000 es la animación `scanline` y 250 es el agrupado del
 * medidor. El chiste es que no hay chiste: la máquina falsa te está diciendo
 * exactamente lo que hace.
 */
/**
 * Los procesos que el sistema admite tener corriendo.
 *
 * Los cinco primeros son ciertos: cada uno existe de verdad en el código, con
 * ese intervalo. El SEXTO es la única puerta al `vsync-test` (ver pong.ts).
 *
 * Sus 16 ms son la pista entera: son 60 fps, y no hay nada más en esta app que
 * dibuje a velocidad de fotograma — el más rápido de los otros cinco corre
 * cuatro veces por segundo. Un proceso de vídeo que nadie arrancó, con nombre de
 * mantenimiento aburrido, es lo que la máquina hace cuando nadie la mira.
 *
 * `refusal` es lo que contesta al intentar adjuntarse. Está en la misma voz
 * cansada que el resto del sistema, y es la mitad del chiste de `//attach`.
 */
const PROCESSES: readonly {
    pid: number;
    name: string;
    interval: string;
    refusal: Localized;
}[] = [
    {
        pid: 1,
        name: 'autosave',
        interval: '2500ms',
        refusal: {
            es: 'NO TOQUE EL AUTO-GUARDADO.',
            en: "DON'T TOUCH THE AUTOSAVE.",
        },
    },
    {
        pid: 2,
        name: 'network-poll',
        interval: '60000ms',
        refusal: {
            es: 'ESTÁ ESPERANDO RESPUESTA. COMO SIEMPRE.',
            en: 'IT IS WAITING FOR AN ANSWER. AS ALWAYS.',
        },
    },
    {
        pid: 3,
        name: 'scanline',
        interval: '9000ms',
        refusal: {
            es: 'ES SÓLO UNA LÍNEA QUE BAJA. DÉJELA BAJAR.',
            en: 'IT IS ONLY A LINE GOING DOWN. LET IT.',
        },
    },
    {
        pid: 4,
        name: 'meter-batch',
        interval: '250ms',
        refusal: {
            es: 'CUENTA LO QUE USTED ESCRIBE. NO MIRE.',
            en: 'IT COUNTS WHAT YOU WRITE. DO NOT LOOK.',
        },
    },
    {
        pid: 5,
        name: 'glitch-ambient',
        interval: 'variable',
        refusal: {
            es: 'NO SE ADJUNTE A ESO.',
            en: 'DO NOT ATTACH TO THAT.',
        },
    },
    {
        pid: 6,
        name: 'vsync-test',
        interval: '16ms',
        // Nunca se usa: el 6 abre el juego en vez de negarse. Está por
        // completitud, para que la tabla no tenga un hueco que explicar.
        refusal: { es: '…', en: '…' },
    },
];

const PONG_PID = 6;

function processTable(lang: Lang): string {
    // Los nombres de proceso NO se traducen: son identificadores, igual que en
    // un `ps` de verdad. Sólo cambia la cabecera.
    const fila = (nombre: string, intervalo: string, pid = '   ') =>
        `${pid}  ${nombre.padEnd(16)}${intervalo.padStart(9)}`;

    return [
        fila(T.psHeaderName[lang], T.psHeaderInterval[lang], 'PID'),
        ...PROCESSES.map((p) => fila(p.name, p.interval, `  ${p.pid}`)),
        '',
        // Da el VERBO pero no el PID. Adivinar «attach» a ciegas sería
        // imposible —y un secreto inalcanzable es código muerto, error que este
        // proyecto ya cometió una vez—, pero decir cuál de los seis es el raro
        // sería regalar el hallazgo. La pista se entrega, la observación es tuya.
        T.attachHint[lang],
    ].join('\n');
}
