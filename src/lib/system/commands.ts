// src/lib/system/commands.ts

import { LIMITS } from '@/config/limits';
import { formatDuration } from '@/lib/utils/formatters';
import { getLang } from '@/i18n';
import { greetingFor } from '@/lib/system/greeting';
import type { Lang } from '@/config/lang';

/**
 * Un texto de la terminal en los dos idiomas.
 *
 * Los NOMBRES de los comandos (`//help`, `//diag`) NO se traducen: son la interfaz
 * de la terminal, igual que `ls` o `df` en un shell de verdad, y traducirlos
 * rompería el músculo de quien ya los sabe. Lo que se traduce es todo lo que el
 * sistema RESPONDE, más los resúmenes que lista `//help`.
 */
type Localized = Readonly<Record<Lang, string>>;

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
    | { kind: 'set-effects'; enabled: boolean };

export interface CommandResult {
    output: string;
    effect: CommandEffect;
    /** Qué secreto queda marcado como hallado, si marca alguno. */
    secretId?: string;
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
export function isGreetingLine(content: string): boolean {
    if (!isCommandLine(content)) return false;
    const linea = content.trim().toLowerCase();
    return linea === GREETING_COMMAND;
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
     * Sólo lo usa `//attach_*`: listarlo convertiría el hallazgo en una lectura
     * y dejaría a `//ps` sin su único motivo para ser leído.
     */
    hidden?: boolean;
    /**
     * El secreto que marca. Puede venir del comando entero o de la respuesta.
     *
     * `//attach_*` lo decide al resolver: sólo el PID que abre el juego cuenta
     * como hallazgo. Adjuntarse al auto-guardado y llevarse un reproche no lo es.
     */
    secretId?: string;
    resolve: (ctx: CommandContext, args: string, lang: Lang) => CommandResult;
}

const texto = (output: string) => ({ output, effect: SIN_EFECTO });

const COMMANDS: readonly Command[] = [
    {
        name: '//help',
        summary: { es: 'esta lista', en: 'this list' },
        secretId: 'commands',
        resolve: (_ctx, _args, lang) =>
            texto(
                [
                    lang === 'es' ? 'COMANDOS DISPONIBLES' : 'AVAILABLE COMMANDS',
                    '',
                    ...COMMANDS.filter((c) => !c.hidden).map(
                        (c) => `  ${c.name.padEnd(12)} ${c.summary[lang]}`
                    ),
                ].join('\n')
            ),
    },
    {
        name: '//version',
        summary: {
            es: 'quién dice ser este sistema',
            en: 'who this system claims to be',
        },
        resolve: (_ctx, _args, lang) =>
            texto(
                lang === 'es'
                    ? 'FLASH-NOTES v1.0 · NÚCLEO ESTABLE'
                    : 'FLASH-NOTES v1.0 · STABLE CORE'
            ),
    },
    {
        name: '//whoami',
        summary: {
            es: 'a quién cree tener enfrente',
            en: 'who it thinks is out there',
        },
        secretId: 'whoami',
        // La cookie de sesión es httpOnly (session.js): el JavaScript del
        // cliente NO puede leerla, y el hash que sale en los logs se calcula en
        // el servidor. En vez de inventar un identificador o de pedir un
        // endpoint nuevo, la limitación ES la respuesta — y dice exactamente lo
        // que la app es.
        resolve: (_ctx, _args, lang) =>
            texto(
                (lang === 'es'
                    ? [
                          'NO SÉ. LA COOKIE ES httpOnly — NI YO PUEDO LEERLA.',
                          'SOS ESTE NAVEGADOR. NADA MÁS.',
                      ]
                    : [
                          "I DON'T KNOW. THE COOKIE IS httpOnly — NOT EVEN I CAN READ IT.",
                          'YOU ARE THIS BROWSER. NOTHING ELSE.',
                      ]
                ).join('\n')
            ),
    },
    {
        name: '//sudo',
        summary: { es: 'pedir permiso', en: 'ask for permission' },
        secretId: 'sudo',
        resolve: (_ctx, _args, lang) =>
            texto(
                (lang === 'es'
                    ? ['NO HAY SUPERUSUARIO. NO HAY USUARIOS.', 'HAY UN NAVEGADOR.']
                    : [
                          'THERE IS NO SUPERUSER. THERE ARE NO USERS.',
                          'THERE IS A BROWSER.',
                      ]
                ).join('\n')
            ),
    },
    {
        name: '//uptime',
        summary: {
            es: 'cuánto lleva abierta esta pestaña',
            en: 'how long this tab has been open',
        },
        resolve: (ctx, _args, lang) =>
            texto(
                `${lang === 'es' ? 'TURNO ACTIVO' : 'SHIFT ACTIVE'}  ${formatDuration(
                    ctx.now.getTime() - ctx.sessionStart.getTime()
                )}`
            ),
    },
    {
        name: '//date',
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
        summary: { es: 'cuánto llevás escrito', en: 'how much you have written' },
        secretId: 'inspect',
        resolve: (ctx, _args, lang) => texto(formatUsage(ctx.notes, lang)),
    },
    {
        name: '//ps',
        summary: {
            es: 'qué está corriendo ahora mismo',
            en: "what's running right now",
        },
        secretId: 'inspect',
        resolve: (_ctx, _args, lang) => texto(processTable(lang)),
    },
    {
        name: '//log',
        summary: { es: 'las últimas peticiones', en: 'the last requests' },
        secretId: 'log',
        resolve: (ctx) => texto(ctx.log),
    },
    {
        name: '//history',
        summary: {
            es: 'las versiones guardadas de esta nota',
            en: 'the saved versions of this note',
        },
        secretId: 'history',
        // "ACTAS" es deliberado: no dice "versiones" ni "historial", dice el
        // registro oficial de algo que pasó. "THE RECORDS" hace lo mismo.
        resolve: (_ctx, _args, lang) => ({
            output: lang === 'es' ? 'CONSULTANDO ACTAS…' : 'CONSULTING THE RECORDS…',
            effect: { kind: 'fetch-history' },
        }),
    },
    {
        name: '//diag',
        summary: {
            es: 'abrir el panel de diagnóstico',
            en: 'open the diagnostics panel',
        },
        secretId: 'diagnostics',
        resolve: (_ctx, _args, lang) => ({
            output: lang === 'es' ? 'ABRIENDO DIAGNÓSTICO…' : 'OPENING DIAGNOSTICS…',
            effect: { kind: 'open-diagnostics' },
        }),
    },
    {
        name: '//chaos',
        summary: {
            es: 'encender o apagar los efectos (on | off)',
            en: 'turn the effects on or off (on | off)',
        },
        secretId: 'chaos',
        resolve: (ctx, args, lang) => {
            const arg = args.trim().toLowerCase();
            // `on` y `off` son argumentos, no palabras: no se traducen.
            const rotulo = lang === 'es' ? 'EFECTOS' : 'EFFECTS';

            if (arg === 'on' || arg === 'off') {
                const enabled = arg === 'on';
                return {
                    output: `${rotulo}: ${enabled ? 'ON' : 'OFF'}`,
                    effect: { kind: 'set-effects', enabled },
                };
            }

            // Sin argumento no cambia nada: informa. Un `//chaos` suelto que
            // apagara los efectos sería una sorpresa desagradable.
            const uso = lang === 'es' ? 'USÁ' : 'USE';
            return texto(
                `${rotulo}: ${ctx.effectsEnabled ? 'ON' : 'OFF'} · ${uso} >chaos on | >chaos off`
            );
        },
    },
    {
        name: '//panic',
        summary: { es: 'romper el sistema', en: 'break the system' },
        secretId: 'collapse',
        resolve: () => ({ output: '', effect: { kind: 'collapse' } }),
    },
    {
        name: '//hi',
        summary: { es: 'saludar', en: 'say hello' },
        secretId: 'greeting',
        resolve: (ctx, _args, lang) => {
            const reply = greetingFor(ctx.greetings, lang);
            return {
                output: reply.text,
                effect: reply.kick ? { kind: 'leave-note' } : SIN_EFECTO,
            };
        },
    },
    {
        name: '//date_off',
        summary: {
            es: 'soltar el reloj del sistema',
            en: 'let the system clock go',
        },
        secretId: 'date',
        resolve: (_ctx, _args, lang) => ({
            output:
                lang === 'es'
                    ? [
                          'REFERENCIA HORARIA LIBERADA.',
                          '',
                          'YA NO SÉ EN QUÉ AÑO ESTAMOS.',
                          'RECARGUE PARA QUE VUELVA.',
                      ].join('\n')
                    : [
                          'TIME REFERENCE RELEASED.',
                          '',
                          'I NO LONGER KNOW WHAT YEAR IT IS.',
                          'RELOAD TO GET IT BACK.',
                      ].join('\n'),
            effect: { kind: 'time-drift' },
        }),
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
        match: /^attach_(\d+)$/,
        hidden: true,
        summary: { es: '—', en: '—' },
        resolve: (_ctx, args, lang) => {
            const pid = Number(args);
            const proceso = PROCESSES.find((p) => p.pid === pid);

            if (!proceso) {
                return texto(
                    lang === 'es' ? `NO HAY PROCESO ${pid}.` : `NO PROCESS ${pid}.`
                );
            }

            if (pid !== PONG_PID) {
                const enUso =
                    lang === 'es'
                        ? `PROCESO ${proceso.name} EN USO.`
                        : `PROCESS ${proceso.name} IN USE.`;

                return texto(`${enUso} ${proceso.refusal[lang]}`);
            }

            // El hallazgo. La máquina no explica qué es: lo admite.
            return {
                output:
                    lang === 'es'
                        ? [
                              `ADJUNTANDO A ${proceso.name}…`,
                              'ACTIVO DESDE EL PRIMER ARRANQUE.',
                              '',
                              '¿HACE CUÁNTO QUE ESTÁ MIRANDO?',
                          ].join('\n')
                        : [
                              `ATTACHING TO ${proceso.name}…`,
                              'RUNNING SINCE FIRST BOOT.',
                              '',
                              'HOW LONG HAVE YOU BEEN WATCHING?',
                          ].join('\n'),
                effect: { kind: 'play-pong' },
                // Sólo acá. Adjuntarse al auto-guardado y llevarse un reproche
                // no es haber encontrado nada.
                secretId: 'pong',
            };
        },
    },
];

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
export function run(content: string, ctx: CommandContext): CommandResult | null {
    if (!isCommandLine(content)) return null;

    const lang = ctx.lang ?? getLang();

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
    const command =
        COMMANDS.find((c) => c.name === buscado) ??
        COMMANDS.find((c) => c.match?.test(corto));

    if (!command) {
        const desconocido =
            lang === 'es'
                ? `COMANDO DESCONOCIDO: ${nombre.toUpperCase()}. PROBÁ //help.`
                : `UNKNOWN COMMAND: ${nombre.toUpperCase()}. TRY //help.`;

        return { output: desconocido, effect: SIN_EFECTO };
    }

    // Cuando el comando empareja por patrón, el argumento es lo capturado —el
    // PID de `//attach_6`— y no lo que venga separado por espacios.
    const capturado = command.match?.exec(corto)?.[1];
    const args = capturado ?? resto.join(' ');

    const { output, effect, secretId } = command.resolve(ctx, args, lang);
    return { output, effect, secretId: secretId ?? command.secretId };
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
        return lang === 'es'
            ? `${etiqueta} · SIN DESFASE. ESTÁS EN LA HORA DEL SISTEMA.`
            : `${etiqueta} · NO OFFSET. YOU ARE ON SYSTEM TIME.`;
    }

    // La única frase de lore que el usuario puede verificar mirando su reloj.
    return lang === 'es'
        ? `${etiqueta} · EL SISTEMA NUNCA SE MUDÓ.`
        : `${etiqueta} · THE SYSTEM NEVER MOVED.`;
}

function formatDate(now: Date, lang: Lang): string {
    const local = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const utc = `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}`;
    const desfase = describeOffset(now.getTimezoneOffset(), lang);
    const [etiqueta, frase] = desfase.split(' · ');

    return [
        `LOCAL     ${local} (${etiqueta})`,
        `${(lang === 'es' ? 'SISTEMA' : 'SYSTEM').padEnd(9)} ${utc} UTC`,
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
        return lang === 'es' ? 'SIN ARCHIVOS EN ESTE TURNO.' : 'NO FILES ON THIS SHIFT.';

    const ANCHO = 34;

    return notes
        .map((n) => {
            const nombre = n.title || (lang === 'es' ? 'Sin_titulo.txt' : 'Untitled.txt');
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

    return lang === 'es'
        ? [
              `ESCRITO   ${total}b en ${notes.length} archivo(s)`,
              `ESCALA    ${escala}b  ${meter(total / escala)}`,
          ].join('\n')
        : [
              `WRITTEN   ${total}b across ${notes.length} file(s)`,
              `SCALE     ${escala}b  ${meter(total / escala)}`,
          ].join('\n');;
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
        lang === 'es'
            ? fila('PROCESO', 'INTERVALO', 'PID')
            : fila('PROCESS', 'INTERVAL', 'PID'),
        ...PROCESSES.map((p) => fila(p.name, p.interval, `  ${p.pid}`)),
        '',
        // Da el VERBO pero no el PID. Adivinar «attach» a ciegas sería
        // imposible —y un secreto inalcanzable es código muerto, error que este
        // proyecto ya cometió una vez—, pero decir cuál de los seis es el raro
        // sería regalar el hallazgo. La pista se entrega, la observación es tuya.
        lang === 'es'
            ? 'USE //attach_<PID> PARA ADJUNTARSE A UN PROCESO.'
            : 'USE //attach_<PID> TO ATTACH TO A PROCESS.',
    ].join('\n');
}
