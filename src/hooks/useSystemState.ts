// src/hooks/useSystemState.ts
'use client';

import { awardFrom } from '@/lib/system/asciiArt';
import { useSyncExternalStore } from 'react';
import {
    ESCALATION_WINDOW_MS,
    LOCKOUT_AT,
    LOCKOUT_MS,
    countAfter,
    levelFor,
    type CollapseLevel,
} from '@/lib/system/collapseEscalation';
import { countGreeting, CHAT_WINDOW_MS } from '@/lib/system/greeting';
import { clearFound as clearArt, onlyMissing, ART_SOURCES } from '@/lib/system/asciiArt';
import { forgetHint } from '@/lib/system/helpHint';
import { clearEntity } from '@/lib/system/entity';
import { resetScores } from '@/lib/system/pongScores';
import { clearUsed } from '@/lib/system/commandUnlock';
import { leaveV02, isV02, toggleV02, forgetV02Trip } from '@/lib/system/v02';
import { clearDropped } from '@/lib/system/dropped';
import { clearV02Notes } from '@/lib/system/v02Notes';
import { forgetWord } from '@/lib/system/morse';
import { stopDrift } from '@/lib/system/timeDrift';

export { ESCALATION_WINDOW_MS, LOCKOUT_AT, LOCKOUT_MS };
export type { CollapseLevel };

/**
 * La integridad del sistema, compartida por toda la app.
 *
 * Es el almacén del que cuelgan los secretos: un número de 0 a 100 que a 100 se
 * comporta con normalidad, cuanto más baja más inestable se ve, y a 0 colapsa.
 *
 * Vive en un almacén de módulo con useSyncExternalStore, igual que
 * useNetworkStatus y useTheme — el patrón del proyecto para estado compartido.
 * La razón es la misma que allá: lo miran varios componentes a la vez (la
 * cabecera, la barra de estado, la capa de efectos) y con un useState por
 * componente cada uno tendría su propia integridad.
 *
 * QUÉ SE RECUERDA Y QUÉ NO:
 *  · la integridad NO se recuerda. Recargar siempre devuelve un sistema sano,
 *    para que nadie se encuentre una app rota sin saber por qué.
 *  · el interruptor de efectos y los secretos hallados SÍ, en localStorage.
 */

const EFFECTS_STORAGE_KEY = 'flashnotes:effects';
const SECRETS_STORAGE_KEY = 'flashnotes:secrets';

/**
 * Hasta cuándo dura el bloqueo.
 *
 * Es lo ÚNICO de toda esta app que sobrevive a recargar. Todo lo demás —la
 * integridad, la cuenta de colapsos, el fallo cromático— se limpia con F5, y
 * recargar es la salida fácil. Acá justamente no la hay: o resolvés el puzzle o
 * esperás. Guardar el instante de vencimiento y no un booleano es lo que hace
 * que la espera corra aunque cierres la pestaña.
 */
const LOCKOUT_STORAGE_KEY = 'flashnotes:lockout';

/**
 * Las ventanas de error abiertas durante el bloqueo.
 *
 * Se guardan porque el bloqueo persiste a la recarga y ellas son parte de él:
 * volver y encontrarse la pantalla de error LIMPIA rompería la ilusión — daría a
 * entender que recargar sirve de algo, que es justo lo que este estado niega.
 */
const PHANTOMS_STORAGE_KEY = 'flashnotes:phantoms';

export interface StoredPhantom {
    id: number;
    code: string;
    text: string;
    topPct: number;
    leftPct: number;
}

/** Las ventanas que quedaron abiertas la última vez. */
export function readStoredPhantoms(): StoredPhantom[] {
    try {
        const raw = localStorage.getItem(PHANTOMS_STORAGE_KEY);
        if (!raw) return [];

        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];

        return parsed.filter(
            (p): p is StoredPhantom =>
                typeof p === 'object' &&
                p !== null &&
                typeof (p as StoredPhantom).code === 'string' &&
                typeof (p as StoredPhantom).text === 'string'
        );
    } catch {
        return [];
    }
}

/** Recuerda las ventanas abiertas. */
export function storePhantoms(phantoms: readonly StoredPhantom[]) {
    try {
        localStorage.setItem(PHANTOMS_STORAGE_KEY, JSON.stringify(phantoms));
    } catch {
        // Sin persistencia, la pantalla vuelve limpia. Es aceptable.
    }
}

/**
 * Los secretos que se pueden encontrar.
 *
 * Sólo entra lo que provocás vos. Lo ambiental —el glitch, los fragmentos de la
 * barra, el barrido trabado, el arranque en vídeo inverso— te pasa, no lo
 * encontrás: contarlo inflaría el denominador con cosas que nadie puede buscar.
 *
 * El total sale de la longitud de esta lista y nunca de un número escrito a
 * mano, porque va a cambiar.
 */
export const SECRET_IDS = [
    'commands',
    'diagnostics',
    'logo',
    'collapse',
    'history',
    'log',
    'sudo',
    'whoami',
    'date',
    'inspect',
    'ghost-file',
    'trash-tally',
    'chaos',
    'chroma',
    'pong',
    'greeting',
    'art',
    'art-keep',

    /*
     * LO CONSTRUIDO DESPUÉS.
     *
     * El contador tiene que incluirlo TODO: es lo que le dice a alguien cuánto
     * conoce del sistema, y con la mitad de las piezas fuera decía que ya casi
     * lo había visto todo cuando le faltaba la capa más profunda.
     *
     * Cada uno de éstos se marca en alguna parte, y un test lo comprueba pieza
     * por pieza — la lista y las marcas se escriben en sitios distintos y es
     * exactamente así como se desincronizan.
     */
    'date-off',
    'chat',
    'kicked',
    /*
     * La BROMA del borrado sí cuenta, aunque `//reset` no.
     *
     * No es lo mismo: el comando es un botón peligroso, y contarlo animaba a
     * usarlo. La broma es lo que sólo ve quien tuvo el valor de teclearlo y la
     * prudencia de decir que no — eso sí es un hallazgo.
     */
    'reset-prank',
    // ⚠ `reset` NO está acá, y no es un olvido: encontrarlo no es un logro, es
    // saber que hay un botón peligroso. Contarlo entre los hallazgos animaba a
    // usarlo, que es lo contrario de lo que hace falta con el único comando que
    // destruye algo tuyo.
    'collection',
    'morse',
    'v02',
    'v02-recover',
    'v02-todo',
    'v02-corrupt',
    /*
     * HABER DESPERTADO AL ENTE.
     *
     * No es lo mismo que `chat`: aquél es haber hablado con la fachada —dos
     * respuestas y se acaba—, éste es haber notado que detrás hay alguien. Son
     * dos hallazgos distintos y el contador tiene que decirlo.
     */
    'entity-awake',
    /*
     * DEMOSTRARLE QUE SABÉS.
     *
     * Contestar bien la única pregunta del juego cuya respuesta el sistema
     * conoce. Es el primer momento en que el intercambio va en las dos
     * direcciones, y por eso cuenta aparte de haberlo despertado.
     */
    'entity-proved',
    /*
     * DECIRLE QUE NO.
     *
     * Rechazar que «limpie todo esto». Es la única trampa del juego donde la
     * respuesta prudente es la que premia — y por eso aceptar cuesta la
     * papelera: sin precio no habría decisión, habría un botón con dos
     * etiquetas.
     */
    'entity-refused',
    /*
     * HABER VUELTO, Y HABERLE HECHO CASO.
     *
     * Te fuiste, volviste al día siguiente y había una nota esperándote con
     * instrucciones. Es lo único del juego que premia haber vuelto — y lo único
     * que él no puede fingir que pasó.
     */
    'entity-gift',
    /*
     * HABERLO REPORTADO.
     *
     * El otro final. Cuenta como hallazgo igual que ayudarlo: taparlo es una
     * decisión, no un fallo — el comando que te pasó es una grieta de verdad, y
     * elegir cerrarla es tan razonable como aprovecharla.
     *
     * ⚠ Ayudarlo NO tiene secreto propio: su premio es la pieza, y contarlo dos
     * veces desequilibraría los dos finales. Éste lo tiene porque su pieza llega
     * tapada, y sin él reportar valdría menos en el contador que ayudar — que es
     * exactamente la clase de empujón que este final no puede tener.
     */
    'entity-reported',
] as const;

export type SecretId = (typeof SECRET_IDS)[number];

/** Cuánto espera el contador de clics antes de olvidarse de todo. */
const CLICK_RESET_MS = 4000;

/** Qué pasa en cada clic sobre el rótulo de la cabecera. */
const CLICK_STEPS: Record<
    number,
    { integrity: number; glitchPx: number; durationMs: number }
> = {
    5: { integrity: 80, glitchPx: 3, durationMs: 180 },
    6: { integrity: 60, glitchPx: 5, durationMs: 200 },
    7: { integrity: 40, glitchPx: 7, durationMs: 230 },
    8: { integrity: 20, glitchPx: 10, durationMs: 260 },
};

const COLLAPSE_AT_CLICK = 9;
const FLICKER_AT_CLICK = 3;

/** A partir de cuántos borrados definitivos el sistema lo menciona. */
export const TALLY_AT = 5;

/**
 * Cuántas pulsaciones seguidas del interruptor de tema rompen la señal.
 *
 * Diez, y con menos de THEME_WINDOW_MS entre una y otra. Nadie cambia de tema
 * diez veces seguidas sin querer: hace falta ensañarse, que es exactamente el
 * gesto que este secreto premia. Con menos, alguien indeciso podía romperlo sin
 * enterarse de por qué.
 */
export const THEME_BREAK_AT = 10;
const THEME_WINDOW_MS = 1200;

export interface SystemState {
    /** 0–100. En memoria: recargar devuelve 100. */
    integrity: number;
    effectsEnabled: boolean;
    secretsFound: number;
    secretsTotal: number;
    /** Cuándo se abrió la pestaña, para el uptime y la fatiga del glitch. */
    sessionStart: number;
    /** Borrados definitivos de esta sesión. No se recuerda entre sesiones. */
    permanentDeletes: number;
    /** Cuándo se mandó la última nota a la papelera, o null. */
    noteTrashedAt: number | null;
    /**
     * La señal se rompió: la interfaz se ve con fallo cromático.
     *
     * Es puramente visual — todo sigue funcionando y todo sigue guardándose— y
     * NO se arregla solo: dura hasta que se recarga la página. Es el único
     * estado de la app que no se puede deshacer desde la propia app, y esa es
     * la gracia.
     */
    chromaticFailure: boolean;
    /**
     * El sistema dejó de reiniciarse solo: hay una pantalla de error encima.
     *
     * Se levanta resolviendo el puzzle que esconde, o esperando cinco minutos.
     * Sobrevive a recargar la página.
     */
    lockedOut: boolean;
    /** Cuántos golpes lleva el rótulo dentro de la ventana. Lo mide el panel. */
    labelClicks: number;
    /**
     * Estás en la versión de antes.
     *
     * Se publica desde acá y no se lee suelto para que la interfaz se repinte al
     * entrar y al salir — leer el almacén con una función suelta no re-renderiza
     * (REGLAS · B2), y la barra de estado ya se quedó pillada una vez por eso.
     */
    v02: boolean;
}

/** Lo que hay que hacer tras un clic en el rótulo. */
export type LogoClickOutcome =
    | { kind: 'none' }
    | { kind: 'version-flicker' }
    | { kind: 'integrity'; value: number; glitchPx: number; durationMs: number }
    | { kind: 'collapse' };

function readEffects(): boolean {
    try {
        // Ausente significa encendido: los efectos son el estado normal.
        return localStorage.getItem(EFFECTS_STORAGE_KEY) !== 'off';
    } catch {
        return true;
    }
}

function readSecrets(): Set<string> {
    try {
        const raw = localStorage.getItem(SECRETS_STORAGE_KEY);
        if (!raw) return new Set();

        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return new Set();

        // Se filtra contra el registro: un identificador viejo que ya no existe
        // no puede inflar el contador y dejarlo en 13/12.
        return new Set(
            parsed.filter(
                (id): id is SecretId =>
                    typeof id === 'string' && (SECRET_IDS as readonly string[]).includes(id)
            )
        );
    } catch {
        return new Set();
    }
}

interface StoredLockout {
    /** Cuándo vence. */
    until: number;
    /**
     * Si la señal ya estaba rota cuando el bloqueo empezó.
     *
     * El fallo cromático vive SÓLO en memoria a propósito: recargar es la salida
     * fácil, y esa es su gracia. Pero el bloqueo sí sobrevive a la recarga, y sin
     * guardar esto pasaba algo que no cuadraba: rompías la señal, entrabas en
     * fallo crítico, recargabas, resolvías el puzzle — y la app volvía impecable.
     * Resolver el puzzle acababa arreglando una avería que el puzzle no toca.
     *
     * Guardándolo, la señal sigue rota al salir del bloqueo, y sólo la limpia una
     * recarga cuando ya no hay bloqueo que la sostenga.
     */
    chroma: boolean;
}

function readLockout(): StoredLockout | null {
    try {
        const raw = localStorage.getItem(LOCKOUT_STORAGE_KEY);
        if (!raw) return null;

        // Se acepta el formato viejo —un número suelto— para que un bloqueo
        // guardado antes de este cambio no se pierda ni reviente al leerse.
        const parsed: unknown = JSON.parse(raw);
        const registro: StoredLockout =
            typeof parsed === 'number'
                ? { until: parsed, chroma: false }
                : {
                      until: Number((parsed as StoredLockout)?.until),
                      chroma: Boolean((parsed as StoredLockout)?.chroma),
                  };

        // Un bloqueo ya vencido no revive: se limpia al leerlo.
        if (!Number.isFinite(registro.until) || registro.until <= Date.now()) {
            localStorage.removeItem(LOCKOUT_STORAGE_KEY);
            return null;
        }
        return registro;
    } catch {
        return null;
    }
}

const SESSION_START = Date.now();

let integrity = 100;
let effectsEnabled = readEffects();
let secrets = readSecrets();
let permanentDeletes = 0;
let noteTrashedAt: number | null = null;
let chromaticFailure = false;

let themeClicks = 0;
let lastThemeClick = 0;

let collapseCount: number | null = null;
/**
 * Cuándo se RECUPERÓ el último colapso, no cuándo empezó. Ver countAfter.
 *
 * `null` mientras no se haya recuperado ninguno: romper el sistema otra vez sin
 * dejar que vuelva es el caso más insistente de todos, y ahí la racha sigue.
 */
let lastRecoveryAt: number | null = null;
const bloqueoGuardado = readLockout();
let lockoutUntil: number | null = bloqueoGuardado?.until ?? null;

/**
 * La señal rota vuelve CON el bloqueo.
 *
 * Es la única vez que el fallo cromático sobrevive a una recarga, y hace falta:
 * sin esto, romper la señal → fallo crítico → recargar → resolver el puzzle
 * devolvía una app impecable, o sea que resolver el puzzle acababa arreglando
 * una avería que el puzzle no toca. Recargar volvía a ser la salida fácil justo
 * en el único estado que la niega.
 *
 * Seguro para la hidratación porque `SERVER_SNAPSHOT` declara `false`: el
 * servidor y el primer render del cliente coinciden, y la corrección llega
 * después.
 */
if (bloqueoGuardado?.chroma) chromaticFailure = true;
let lockoutTimer: ReturnType<typeof setTimeout> | null = null;

/** Cuántos golpes lleva el rótulo. El panel lo usa para medir el desgaste. */
let clickCount = 0;

let state: SystemState = {
    integrity,
    effectsEnabled,
    secretsFound: secrets.size,
    secretsTotal: SECRET_IDS.length,
    sessionStart: SESSION_START,
    permanentDeletes,
    noteTrashedAt,
    chromaticFailure,
    lockedOut: lockoutUntil !== null,
    labelClicks: clickCount,
    v02: isV02(),
};

const listeners = new Set<() => void>();
let clickResetTimer: ReturnType<typeof setTimeout> | null = null;

function publish() {
    const next: SystemState = {
        integrity,
        effectsEnabled,
        secretsFound: secrets.size,
        secretsTotal: SECRET_IDS.length,
        sessionStart: SESSION_START,
        permanentDeletes,
        noteTrashedAt,
        chromaticFailure,
        lockedOut: lockoutUntil !== null,
        labelClicks: clickCount,
        v02: isV02(),
    };

    const unchanged =
        next.integrity === state.integrity &&
        next.effectsEnabled === state.effectsEnabled &&
        next.secretsFound === state.secretsFound &&
        next.permanentDeletes === state.permanentDeletes &&
        next.noteTrashedAt === state.noteTrashedAt &&
        next.chromaticFailure === state.chromaticFailure &&
        next.v02 === state.v02 &&
        next.lockedOut === state.lockedOut &&
        next.labelClicks === state.labelClicks;

    if (unchanged) return;

    state = next;
    listeners.forEach((l) => l());
}

export function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function getSystemState(): SystemState {
    return state;
}

/**
 * ¿El sistema está en estado de fallo?
 *
 * Junta los dos: la señal rota (§14) y la memoria corrupta (el bloqueo). Los dos
 * son el mismo estado desde el punto de vista de los efectos —todo tiene que
 * verse roto— y tenerlo en un solo sitio evita que la próxima pieza se acuerde
 * de uno y se olvide del otro, que es justo lo que pasó con el bloqueo.
 *
 * El bloqueo es el MÁS crítico de los dos: ahí no sólo falla la imagen, es que
 * el sistema ya ni intenta volver.
 */
export function isSystemFailing(): boolean {
    return state.chromaticFailure || state.lockedOut;
}

// Un bloqueo leído de localStorage al arrancar también tiene que vencer solo.
if (lockoutUntil !== null) scheduleLockoutExpiry();

/** Vuelve a 100. Lo usan el reinicio del contador y el final del colapso. */
export function resetIntegrity() {
    integrity = 100;
    publish();
}

/** Enciende o apaga los efectos ambientales, y lo recuerda. */
export function setEffectsEnabled(enabled: boolean) {
    effectsEnabled = enabled;

    try {
        localStorage.setItem(EFFECTS_STORAGE_KEY, enabled ? 'on' : 'off');
    } catch {
        // Sin persistencia el interruptor dura lo que la pestaña. Es aceptable.
    }

    publish();
}

/** Anota un secreto como hallado. Los que no están en el registro se ignoran. */
export function markSecretFound(id: string) {
    if (!(SECRET_IDS as readonly string[]).includes(id)) return;
    if (secrets.has(id)) return;

    secrets = new Set(secrets).add(id);

    try {
        localStorage.setItem(SECRETS_STORAGE_KEY, JSON.stringify([...secrets]));
    } catch {
        // Igual que arriba: se pierde al recargar y no pasa nada.
    }

    /*
     * HABERLOS ENCONTRADO TODOS DA LA ÚLTIMA PIEZA.
     *
     * Acá y no en el panel: el panel se puede no abrir nunca, y el hallazgo no
     * puede depender de que alguien vaya a mirar el contador. Ocurre cuando
     * ocurre, y `awardPiece` ya se encarga de no darla dos veces.
     */
    /*
     * ⚠ NO BASTA CON LOS SECRETOS: hacen falta TODAS LAS DEMÁS PIEZAS.
     *
     * El cuaderno es el que cierra la caja, y lo dice en el dibujo: es el
     * único sitio del proyecto donde aparece un nombre propio. Darlo sólo con
     * el contador de secretos lo dejaba al alcance de quien nunca hubiera
     * mirado la colección, que es justo lo contrario de lo que celebra.
     *
     * `onlyMissing` pregunta «¿la única que falta es ésta?» y no «¿están las
     * dieciséis?», porque la pieza que cierra la caja no puede exigirse a sí
     * misma.
     */
    if (secrets.size >= SECRET_IDS.length && onlyMissing(ART_SOURCES.everything)) {
        awardFrom('everything');
    }

    publish();
}

/**
 * Un clic sobre `[FLASH-NOTES v1.0]`.
 *
 * EL REINICIO A LOS 4 s ES OBLIGATORIO, no una comodidad: sin él, dos clics
 * accidentales separados por días acabarían rompiéndole el sistema a alguien
 * que sólo quería escribir. El contador tiene que olvidar.
 *
 * El clic 3 existe porque sin él la pieza no se descubre nunca: los clics 1 a 4
 * no daban ninguna señal, así que un curioso que tocaba el logo dos veces y
 * paraba no se enteraba de que ahí había algo.
 */
export function registerLogoClick(): LogoClickOutcome {
    clickCount += 1;

    if (clickResetTimer) clearTimeout(clickResetTimer);
    clickResetTimer = setTimeout(() => {
        clickCount = 0;
        clickResetTimer = null;
        resetIntegrity();
    }, CLICK_RESET_MS);

    if (clickCount >= COLLAPSE_AT_CLICK) {
        clickCount = 0;
        integrity = 0;
        publish();
        return { kind: 'collapse' };
    }

    const step = CLICK_STEPS[clickCount];
    if (step) {
        integrity = step.integrity;
        publish();
        return {
            kind: 'integrity',
            value: step.integrity,
            glitchPx: step.glitchPx,
            durationMs: step.durationMs,
        };
    }

    if (clickCount === FLICKER_AT_CLICK) {
        // ⚠ ESTO FALTABA, y era un defecto de verdad: `logo` estaba en la lista
        // del contador y no se marcaba en ninguna parte, así que el panel decía
        // «x/18» con un 18 al que era IMPOSIBLE llegar. El mismo error que el
        // umbral de diez colapsos, pero peor — acá la app te dice a la cara
        // cuántos te faltan.
        markSecretFound('logo');
        return { kind: 'version-flicker' };
    }

    return { kind: 'none' };
}

/**
 * Anota un borrado definitivo.
 *
 * Es la única acción irreversible de la app, y a partir del quinto el diálogo de
 * confirmación deja de ser genérico y te dice que estuvo contando. La cuenta
 * muere con la pestaña a propósito: es una observación sobre esta sesión, no un
 * expediente.
 */
export function registerPermanentDelete() {
    permanentDeletes += 1;
    publish();

    if (permanentDeletes >= TALLY_AT) markSecretFound('trash-tally');
}

/**
 * Un toque al interruptor de tema. Devuelve si ESTE toque rompió la señal.
 *
 * Las pulsaciones tienen que ir seguidas: si pasa más de THEME_WINDOW_MS entre
 * dos, la cuenta vuelve a empezar. Igual que con el rótulo de la cabecera, el
 * olvido es lo que impide que alguien que cambia de tema dos veces por semana
 * termine con la pantalla rota sin entender por qué.
 *
 * Roto ya, deja de contar: el interruptor queda inservible hasta recargar.
 */
export function registerThemeToggle(): boolean {
    if (chromaticFailure) return false;

    const ahora = Date.now();
    themeClicks = ahora - lastThemeClick <= THEME_WINDOW_MS ? themeClicks + 1 : 1;
    lastThemeClick = ahora;

    if (themeClicks < THEME_BREAK_AT) return false;

    chromaticFailure = true;
    publish();
    markSecretFound('chroma');
    // Y da la bombilla: el tema se queda a medio camino entre claro y oscuro,
    // que es exactamente lo que dibuja la pieza.
    awardFrom('theme-glitch');

    return true;
}

/**
 * Anota un colapso y devuelve con qué fuerza toca reproducirlo.
 *
 * La cuenta vive sólo en memoria: recargar corta la racha, que es lo justo — la
 * escalada castiga insistir en una sesión, no volver mañana. El BLOQUEO es la
 * excepción y sí persiste (ver LOCKOUT_STORAGE_KEY).
 */
/**
 * Cuántas veces seguidas saludaste, y cuándo fue la última.
 *
 * Viven acá y no en `greeting.ts` porque ese módulo es puro: no tiene reloj ni
 * memoria propia. Acá viven todos los contadores de sesión, y como el resto, NO
 * se recuerdan entre recargas — volver mañana no es insistir.
 */
let greetings = 0;
let lastGreetingAt: number | null = null;

/** Suma un saludo y devuelve cuántos van seguidos. */
export function registerGreeting(now: number = Date.now()): number {
    greetings = countGreeting(greetings, lastGreetingAt, now);
    lastGreetingAt = now;
    markSecretFound('greeting');

    // La conversación empieza de cero con cada saludo: preguntarle algo después
    // de volver a saludar es una charla nueva, no la misma insistencia.
    chat = 0;
    return greetings;
}

/**
 * Cuántas veces te ha echado de la nota.
 *
 * A la primera te saca. Si volvés y volvés a insistir hasta que te eche tres
 * veces, la página se queda muerta.
 */
let kicks = 0;

export function registerKick(): number {
    // Que te eche de la nota es un final, y los finales cuentan.
    markSecretFound('kicked');

    kicks += 1;
    return kicks;
}

export function kickCount(): number {
    return kicks;
}

/**
 * La cuenta de `//whoareu`, y si la conversación sigue en pie.
 *
 * Fuera de la ventana el comando NO EXISTE: no es que se niegue, es que ahí no
 * hay nada. Devuelve 0 para que quien llama dé el mismo «comando desconocido»
 * que daría cualquier palabra inventada.
 */
let chat = 0;

export function registerChat(now: number = Date.now()): number {
    const enConversacion =
        lastGreetingAt !== null && now - lastGreetingAt < CHAT_WINDOW_MS;

    if (!enConversacion) {
        chat = 0;
        return 0;
    }

    // UNA SOLA CUENTA para `//whoareu` y `//howareu`: alternarlas no engaña a
    // nadie, que es lo que haría alguien buscándole la vuelta.
    chat += 1;
    return chat;
}

/**
 * Devuelve el sistema a como estaba la primera vez.
 *
 * Los secretos, las piezas, los marcadores, los comandos desbloqueados, la
 * palabra en morse, el reloj suelto, el bloqueo, la integridad. Todo.
 *
 * ⚠ NO TOCA LAS NOTAS, y no es un descuido: reiniciar el juego no es reiniciar
 * tu trabajo. Un comando escondido que borre lo que escribiste no es un huevo de
 * pascua, es una pérdida de datos — la primera regla del proyecto.
 */
export function resetEverything() {
    secrets.clear();
    integrity = 100;
    permanentDeletes = 0;
    noteTrashedAt = null;
    chromaticFailure = false;
    themeClicks = 0;
    greetings = 0;
    lastGreetingAt = null;
    chat = 0;
    kicks = 0;
    collapseCount = null;
    lastRecoveryAt = null;

    clearLockout();
    clearArt();
    resetScores();
    clearUsed();
    leaveV02();
    // Se lleva por delante la palabra del viaje, que es la única que el ente
    // puede preguntarte. Ver `markV02RoundTrip()`.
    forgetV02Trip();
    // ⚠ ESTO FALTABA: era la única clave que el borrado no tocaba, y el faro
    // se recuperaba con el primer `//help` de después.
    forgetHint();
    // El ente vuelve a estar dormido. Dejarlo despierto tras un borrado sería
    // la única cosa del sistema que se acuerda de vos cuando ya nada más lo
    // hace — y eso es otro secreto, no el que hay.
    clearEntity();
    clearV02Notes();
    clearDropped();
    forgetWord();
    stopDrift();

    try {
        localStorage.removeItem(SECRETS_STORAGE_KEY);
    } catch {
        // Nada que hacer.
    }

    publish();
}

/**
 * Entra o sale de la v0.2, y AVISA.
 *
 * `toggleV02()` sólo cambia la bandera y el almacenamiento; sin publicar, nadie
 * se entera y el rótulo de la cabecera se queda diciendo v1.0 con la v0.2 ya
 * puesta. Cambiar estado compartido sin notificar es el mismo error que dejó la
 * barra de estado pillada en `[TODO_BIEN]` durante la avería (REGLAS · B2).
 */
export function registerV02Toggle(word?: string): boolean {
    const dentro = toggleV02(word);
    publish();
    return dentro;
}

export function registerCollapse(): CollapseLevel {
    collapseCount = countAfter(collapseCount, lastRecoveryAt, Date.now());

    // ROMPER EL SISTEMA CON LA SEÑAL YA ROTA VA DIRECTO AL FALLO CRÍTICO.
    //
    // No hace falta llegar a seis: son dos averías distintas ocurriendo a la
    // vez, y ésa ES la condición crítica. Pedirle además que repita el colapso
    // cinco veces más sería contar dos veces lo mismo — y encima el usuario que
    // combinó las dos cosas a propósito merece el desenlace, no un contador.
    const nivel = state.chromaticFailure
        ? levelFor(LOCKOUT_AT)
        : levelFor(collapseCount);

    if (nivel.lockout) startLockout();

    return nivel;
}

/**
 * Anota que el sistema terminó de reiniciarse.
 *
 * Es desde ACÁ que corre la ventana de la escalada, no desde el colapso: el
 * rearranque ocurre dentro de la ventana, y contarlo castigaría al usuario
 * porque la máquina tarda en volver en vez de porque insistió.
 */
export function registerRecovery() {
    lastRecoveryAt = Date.now();
}

/** Deja el sistema bloqueado y programa su vencimiento. */
function startLockout() {
    lockoutUntil = Date.now() + LOCKOUT_MS;

    try {
        localStorage.setItem(
            LOCKOUT_STORAGE_KEY,
            JSON.stringify({ until: lockoutUntil, chroma: chromaticFailure })
        );
    } catch {
        // Sin persistencia el bloqueo dura lo que la pestaña. Aceptable.
    }

    /*
     * CAER EN EL FALLO TOTAL DA LA POLILLA.
     *
     * La primera avería informática documentada fue un bicho dentro de un relé,
     * en 1947, y de ahí viene la palabra «bug». Acabás de ver uno de verdad.
     *
     * ⚠ AL ENTRAR, NO AL SALIR. Salir tiene su propio premio —la llave, para
     * quien resuelve el puzzle— y son dos logros distintos: caer ahí dentro le
     * pasa a cualquiera; salir por la puerta buena, no.
     */
    awardFrom('blackout');

    scheduleLockoutExpiry();
    publish();
}

/** Programa el levantamiento automático del bloqueo. */
function scheduleLockoutExpiry() {
    if (lockoutTimer) clearTimeout(lockoutTimer);
    if (lockoutUntil === null) return;

    lockoutTimer = setTimeout(
        () => {
            lockoutTimer = null;
            clearLockout();
        },
        Math.max(0, lockoutUntil - Date.now())
    );
}

/** Levanta el bloqueo: lo llama el puzzle resuelto y el vencimiento. */
export function clearLockout() {
    if (lockoutTimer) clearTimeout(lockoutTimer);
    lockoutTimer = null;

    if (lockoutUntil === null) return;

    /*
     * ⚠ ACÁ SE DABA EL FARO, Y YA NO.
     *
     * El bloqueo se repartió en dos premios: ENTRAR da la polilla y RESOLVER
     * EL PUZZLE da la llave. Un tercero por el mismo sitio sería el mismo
     * logro cobrado tres veces — y encima éste se cobraba también al vencer
     * el plazo, o sea por esperar.
     *
     * El faro está en pausa hasta decidir qué premia. Ver `ArtSource`.
     */
    lockoutUntil = null;

    try {
        localStorage.removeItem(LOCKOUT_STORAGE_KEY);
        // Las ventanas se van con el bloqueo: son parte de él.
        localStorage.removeItem(PHANTOMS_STORAGE_KEY);
    } catch {
        // Nada que hacer.
    }

    // Resolverlo también corta la racha: si no, el colapso siguiente volvería a
    // bloquear en el acto y el puzzle no habría servido de nada.
    collapseCount = null;
    publish();
}

/** Anota que acabás de mandar una nota a la papelera. */
export function markNoteTrashed() {
    noteTrashedAt = Date.now();
    publish();
}

// En el servidor no hay ni almacenamiento ni sesión: se devuelve un sistema
// sano para que el marcado del servidor y el del cliente coincidan.
const SERVER_SNAPSHOT: SystemState = {
    integrity: 100,
    effectsEnabled: true,
    secretsFound: 0,
    secretsTotal: SECRET_IDS.length,
    sessionStart: 0,
    permanentDeletes: 0,
    noteTrashedAt: null,
    chromaticFailure: false,
    lockedOut: false,
    labelClicks: 0,
    // El servidor nunca está en la v0.2: la bandera vive en el navegador, así
    // que el primer render del cliente tiene que coincidir con esto.
    v02: false,
};

/**
 * ¿Hay bloqueo AHORA MISMO? Sin pasar por React.
 *
 * `useSystemState` no sirve para esto: `useSyncExternalStore` devuelve el
 * snapshot del SERVIDOR en el primer render del cliente (REGLAS · C2), y ahí el
 * bloqueo siempre es `false`. El arranque preguntaba, le decían que no, hacía el
 * recorrido largo de ocho segundos, terminaba enseñando el inicio, y sólo
 * entonces aparecía la pantalla de fallo. Se veía la app un rato en medio de un
 * bloqueo, que es justo lo que el bloqueo existe para impedir.
 *
 * Esto lee el almacenamiento y ya. Sólo vale llamarlo desde un efecto o desde
 * código que ya sepa que está en el navegador.
 */
export function isLockedOutNow(): boolean {
    return readLockout() !== null;
}

export function useSystemState(): SystemState {
    return useSyncExternalStore(subscribe, getSystemState, () => SERVER_SNAPSHOT);
}
