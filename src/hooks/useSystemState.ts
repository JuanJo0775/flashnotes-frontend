// src/hooks/useSystemState.ts
'use client';

import { useSyncExternalStore } from 'react';
import {
    ESCALATION_WINDOW_MS,
    LOCKOUT_AT,
    LOCKOUT_MS,
    countAfter,
    levelFor,
    type CollapseLevel,
} from '@/lib/system/collapseEscalation';

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

function readLockout(): number | null {
    try {
        const raw = localStorage.getItem(LOCKOUT_STORAGE_KEY);
        if (!raw) return null;

        const hasta = Number(raw);
        // Un bloqueo ya vencido no revive: se limpia al leerlo.
        if (!Number.isFinite(hasta) || hasta <= Date.now()) {
            localStorage.removeItem(LOCKOUT_STORAGE_KEY);
            return null;
        }
        return hasta;
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
let lockoutUntil = readLockout();
let lockoutTimer: ReturnType<typeof setTimeout> | null = null;

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
};

const listeners = new Set<() => void>();

let clickCount = 0;
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
    };

    const unchanged =
        next.integrity === state.integrity &&
        next.effectsEnabled === state.effectsEnabled &&
        next.secretsFound === state.secretsFound &&
        next.permanentDeletes === state.permanentDeletes &&
        next.noteTrashedAt === state.noteTrashedAt &&
        next.chromaticFailure === state.chromaticFailure &&
        next.lockedOut === state.lockedOut;

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

    if (clickCount === FLICKER_AT_CLICK) return { kind: 'version-flicker' };

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

    return true;
}

/**
 * Anota un colapso y devuelve con qué fuerza toca reproducirlo.
 *
 * La cuenta vive sólo en memoria: recargar corta la racha, que es lo justo — la
 * escalada castiga insistir en una sesión, no volver mañana. El BLOQUEO es la
 * excepción y sí persiste (ver LOCKOUT_STORAGE_KEY).
 */
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
        localStorage.setItem(LOCKOUT_STORAGE_KEY, String(lockoutUntil));
    } catch {
        // Sin persistencia el bloqueo dura lo que la pestaña. Aceptable.
    }

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
};

export function useSystemState(): SystemState {
    return useSyncExternalStore(subscribe, getSystemState, () => SERVER_SNAPSHOT);
}
