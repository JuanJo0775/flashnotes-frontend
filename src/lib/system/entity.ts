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

export interface EntitySnapshot {
    phase: EntityPhase;
    /** Cuántos intercambios llevás DENTRO de la fase actual. */
    exchanges: number;
}

const DORMIDO: EntitySnapshot = { phase: 'dormido', exchanges: 0 };

export function readEntity(): EntitySnapshot {
    try {
        const crudo = localStorage.getItem(STORAGE_KEY);
        if (crudo === null) return { ...DORMIDO };

        const leido: unknown = JSON.parse(crudo);
        if (typeof leido !== 'object' || leido === null) return { ...DORMIDO };

        const { phase, exchanges } = leido as Partial<EntitySnapshot>;

        // Una fase que el código ya no conoce se ignora: renombrar una no puede
        // dejar a nadie atrapado en un estado inexistente.
        if (!PHASES.includes(phase as EntityPhase)) return { ...DORMIDO };

        return {
            phase: phase as EntityPhase,
            exchanges: typeof exchanges === 'number' ? exchanges : 0,
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

    store({ phase, exchanges: 0 });
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
