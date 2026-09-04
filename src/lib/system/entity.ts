// src/lib/system/entity.ts

/**
 * El ente · en qué fase está y cuánto lleva ahí.
 *
 * ⚠ ESTO ES TODO LO QUE GUARDA. Lo que sabe de vos —secretos, piezas, si
 * cruzaste a la v0.2, si te echó de la nota— lo lee de donde ya vive. Si llevara
 * su propio registro habría dos verdades sobre lo mismo, y la que se queda vieja
 * es siempre la que nadie mira.
 *
 * LA CUENTA DE INTERCAMBIOS NO ES UN MARCADOR. Es lo que mueve el tono DENTRO de
 * una fase: el repertorio va ordenado y se indexa por ella, así que la voz se
 * desliza en vez de saltar. Ver `entityVoice.ts`.
 *
 * Módulo puro salvo el almacenamiento.
 */

const STORAGE_KEY = 'flashnotes:entity';

/**
 * El arco entero, aunque esta etapa sólo llegue a `burlon`.
 *
 * Se declaran las siete porque el arco es el diseño, y verlo completo acá evita
 * que las etapas siguientes lo reinventen. Las que todavía no tienen puerta
 * están marcadas.
 */
export type EntityPhase =
    /** Ni existe. La fachada entera, sin grietas. */
    | 'dormido'
    /** Estuviste donde no se podía. Contesta corto y de lado. */
    | 'receloso'
    /** Volviste. Ahora juega con vos. */
    | 'burlon'
    /** ⏳ Etapa 2 · le demostraste que sabés. Suelta el lore. */
    | 'hablando'
    /** ⏳ Etapa 2 · notó que sabés lo que no deberías, y te pide cosas. */
    | 'pidiendo'
    /** ⏳ Etapa 4 · le inspirás confianza. Te da el comando. */
    | 'dispuesto'
    /** ⏳ Etapa 4 · se fue. No vuelve a contestar. */
    | 'ido'
    /** ⏳ Etapa 4 · lo reportaste. Sigue atrapado, y calla. */
    | 'rencoroso';

const PHASES: readonly EntityPhase[] = [
    'dormido',
    'receloso',
    'burlon',
    'hablando',
    'pidiendo',
    'dispuesto',
    'ido',
    'rencoroso',
];

/** Qué te preguntó y está esperando que contestes. */
export type EntityAsk = 'word';

export interface EntitySnapshot {
    phase: EntityPhase;
    /** Cuántos intercambios llevás DENTRO de la fase actual. */
    exchanges: number;
    /**
     * La pregunta que dejó en el aire, si dejó alguna.
     *
     * ⚠ PERSISTE, al revés que el `[y/n]` de `//reset`. Aquélla vive en memoria
     * porque una pregunta pendiente al recargar sería una trampa esperando una
     * `y` distraída. Ésta ES una trampa, y que siga ahí cuando volvés es justo
     * lo que se busca.
     */
    asking?: EntityAsk;
    /** Dijo su mentira y sigue sin desmentir. La puerta está abierta. */
    lieStanding?: boolean;
    /** Te la tragaste sin mirar. Esa puerta se cerró. */
    lieSwallowed?: boolean;
    /** Ya te retó a escribir `//reset`. No se reta dos veces. */
    dared?: boolean;
    /** Te retó y no lo escribiste. De acá sale el «te dio miedo». */
    dodged?: boolean;
}

const DORMIDO: EntitySnapshot = { phase: 'dormido', exchanges: 0 };

export function readEntity(): EntitySnapshot {
    try {
        const crudo = localStorage.getItem(STORAGE_KEY);
        if (crudo === null) return { ...DORMIDO };

        const leido: unknown = JSON.parse(crudo);
        if (typeof leido !== 'object' || leido === null) return { ...DORMIDO };

        const {
            phase,
            exchanges,
            asking,
            lieStanding,
            lieSwallowed,
            dared,
            dodged,
        } = leido as Partial<EntitySnapshot>;

        // Una fase que el código ya no conoce se ignora: renombrar una no puede
        // dejar a nadie atrapado en un estado inexistente.
        if (!PHASES.includes(phase as EntityPhase)) return { ...DORMIDO };

        /*
         * ⚠ LO FALSO SE OMITE, no se guarda como `false`.
         *
         * Así «no hay pregunta en el aire» tiene UNA sola forma —`undefined`— y
         * no dos. Con `null` y `false` conviviendo, cada sitio que lo mire
         * elegiría su comprobación y alguno elegiría mal.
         */
        return {
            phase: phase as EntityPhase,
            exchanges: typeof exchanges === 'number' ? exchanges : 0,
            ...(asking === 'word' ? { asking: 'word' as const } : {}),
            ...(lieStanding ? { lieStanding: true } : {}),
            ...(lieSwallowed ? { lieSwallowed: true } : {}),
            ...(dared ? { dared: true } : {}),
            ...(dodged ? { dodged: true } : {}),
        };
    } catch {
        return { ...DORMIDO };
    }
}

function store(snapshot: EntitySnapshot) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
        // Sin persistencia dura lo que la pestaña. Aceptable.
    }
}

/**
 * Lo pone en una fase.
 *
 * ⚠ CAMBIAR DE FASE PONE LA CUENTA A CERO, y poner la MISMA fase no la toca. La
 * cuenta mide cuánto llevás dentro de ésta: arrastrarla haría que la primera
 * respuesta de una fase nueva saliera del final de su repertorio, que es
 * exactamente el salto de tono que el diseño existe para evitar.
 */
export function setPhase(phase: EntityPhase) {
    const actual = readEntity();
    if (actual.phase === phase) return;

    // ⚠ La cuenta a cero, pero lo que RECUERDA se conserva. Pasar de fase no es
    // una amnistía: él no perdona, sólo cambia de tono.
    store({ ...actual, phase, exchanges: 0 });
}

/** Suma un intercambio y devuelve el nuevo total. */
export function countExchange(): number {
    const actual = readEntity();
    const exchanges = actual.exchanges + 1;

    store({ ...actual, exchanges });
    return exchanges;
}

/** Lo olvida todo. Lo llaman `//reset` y los tests. */
export function clearEntity() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // Nada que hacer.
    }
}

/**
 * Deja una pregunta en el aire, o la retira.
 *
 * Retirarla BORRA el campo en vez de ponerlo a `null`: ver el comentario de
 * `readEntity` sobre por qué «nada» tiene una sola forma.
 */
export function setAsk(ask: EntityAsk | null) {
    const actual = readEntity();

    if (ask === null) {
        // `delete` y no desestructurar-para-omitir: aquello deja una variable
        // sin usar y el linter la marca, con razón.
        const sin: EntitySnapshot = { ...actual };
        delete sin.asking;
        store(sin);
        return;
    }

    store({ ...actual, asking: ask });
}

/** Dijo su mentira. Queda en pie hasta que la desmientas o la dejes pasar. */
export function markLieStanding() {
    store({ ...readEntity(), lieStanding: true });
}

/** La mentira deja de estar en pie: la desmentiste, o ya no vas a hacerlo. */
export function clearLie() {
    const sin: EntitySnapshot = { ...readEntity() };
    delete sin.lieStanding;
    store(sin);
}

/** Te la tragaste sin mirar. Esa puerta se cerró. */
export function markLieSwallowed() {
    store({ ...readEntity(), lieSwallowed: true });
}

/** Ya te lanzó el reto del `//reset`. */
export function markDared() {
    store({ ...readEntity(), dared: true });
}

/** Te lo lanzó y no lo escribiste. */
export function markDodged() {
    store({ ...readEntity(), dodged: true });
}

/**
 * Lo que el ente necesita saber del mundo para decidir si avanza.
 *
 * ⚠ SON DATOS QUE YA EXISTEN, traídos por quien llama. El ente no los guarda ni
 * los consulta él: recibirlos lo deja puro y hace que las transiciones se
 * prueben como una tabla.
 */
export interface EntityWorld {
    /**
     * ¿Estuvo donde no se podía? La v0.2, el fallo total, el morse.
     *
     * Cada uno es un sitio al que no debería haber llegado.
     */
    trespassed: boolean;
    /** ¿Insistió con `//hi` hasta que lo echó de la nota? */
    kicked: boolean;
}

/**
 * Cuántos intercambios en `receloso` hacen falta para que se suelte.
 *
 * Tres. No es una cifra de dificultad: es lo mínimo para que se lea como VOLVER.
 * Con uno sería la misma conversación; con dos, insistir; con tres ya sos
 * alguien que vuelve, y eso es lo que le interesa.
 */
export const RETURN_AT = 3;

/**
 * Dónde debería estar el ente, dado dónde está y qué pasó.
 *
 * ⚠ NUNCA RETROCEDE. Devuelve la fase actual o una posterior, jamás una
 * anterior. Una fachada que se recompone no da miedo: da desconfianza en el
 * código.
 */
export function phaseAfter(
    snapshot: EntitySnapshot,
    world: EntityWorld
): EntityPhase {
    if (snapshot.phase === 'dormido') {
        return world.trespassed || world.kicked ? 'receloso' : 'dormido';
    }

    if (snapshot.phase === 'receloso') {
        return snapshot.exchanges >= RETURN_AT ? 'burlon' : 'receloso';
    }

    /*
     * ⏳ `burlon` NO AVANZA EN ESTA ETAPA.
     *
     * Lo que abre `hablando` es demostrarle que sabés, y las dos formas de
     * hacerlo —la pregunta que te mide y la mentira comprobable— son TRAMPAS,
     * que son la etapa 2. Abrirlo antes dejaría una fase sin repertorio.
     */
    return snapshot.phase;
}
