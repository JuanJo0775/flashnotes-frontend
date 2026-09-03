// src/lib/system/pongScores.ts

/**
 * Los marcadores del `vsync-test`.
 *
 * DOS TABLEROS SEPARADOS, y ésa es la decisión de la pieza. Jugar mientras la
 * señal está rota (§14) no es jugar otro juego: la física es idéntica byte por
 * byte, lo que cambia es que la pantalla está averiada y ves la pelota doble y
 * corrida. Es el mismo juego a ciegas, o sea un logro distinto, y por eso lleva
 * marcador aparte en vez de ensuciar el limpio.
 *
 * Viven en `localStorage`, con el mismo patrón que el tema, el bloqueo y las
 * ventanas fantasma: atados a este navegador y sobreviven a recargar. La app es
 * efímera, pero lo que conseguiste sigue ahí cuando volvés.
 *
 * NO van a Mongo: guardar un contador de peloteo pedía una colección, un
 * endpoint y una migración, y el backend no se toca en esta pieza — como no se
 * tocó en las catorce anteriores.
 */

const STORAGE_KEY = 'flashnotes:pong';

/**
 * El récord de la máquina, que ya está puesto cuando llegás.
 *
 * Lleva jugando desde antes que vos y no tenía nada más que hacer. Es
 * inalcanzable a propósito: no es una meta, es el tamaño del turno que lleva
 * sola. Ése es el chiste, y también la parte triste.
 */
export const SYSTEM_RECORD = 118_394;

/** Limpio, o con la señal rota. */
export type Board = 'clean' | 'degraded';

export interface BoardScore {
    /** El mejor peloteo conseguido. */
    best: number;
    /** Cuántas partidas se jugaron, se batiera el récord o no. */
    games: number;
}

export type Scores = Record<Board, BoardScore>;

const VACIO = (): BoardScore => ({ best: 0, games: 0 });

const enBlanco = (): Scores => ({ clean: VACIO(), degraded: VACIO() });

/**
 * La caché en memoria.
 *
 * Existe para que leer el marcador durante una partida no toque
 * `localStorage` sesenta veces por segundo. `clearScores()` la tira, que es lo
 * que permite a los tests releer de cero.
 */
let cache: Scores | null = null;

/** Un tablero suelto, sólo si de verdad lo parece. */
function parseBoard(raw: unknown): BoardScore {
    if (typeof raw !== 'object' || raw === null) return VACIO();

    const { best, games } = raw as Partial<BoardScore>;

    return {
        best: typeof best === 'number' && best >= 0 ? Math.floor(best) : 0,
        games: typeof games === 'number' && games >= 0 ? Math.floor(games) : 0,
    };
}

/**
 * Los marcadores guardados.
 *
 * Si lo guardado no se entiende, se empieza de cero y NUNCA se lanza: el mismo
 * criterio que el resto del almacenamiento de la app. Un marcador corrupto no
 * puede tumbar la pantalla.
 */
export function readScores(): Scores {
    if (cache) return cache;

    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return (cache = enBlanco());

        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            return (cache = enBlanco());
        }

        const obj = parsed as Partial<Record<Board, unknown>>;
        return (cache = {
            clean: parseBoard(obj.clean),
            degraded: parseBoard(obj.degraded),
        });
    } catch {
        return (cache = enBlanco());
    }
}

/** Anota una partida terminada. Sólo pisa el récord si de verdad es mejor. */
export function recordRally(board: Board, rally: number): Scores {
    const actual = readScores();
    const limpio = Number.isFinite(rally) && rally > 0 ? Math.floor(rally) : 0;

    const siguiente: Scores = {
        ...actual,
        [board]: {
            best: Math.max(actual[board].best, limpio),
            games: actual[board].games + 1,
        },
    };

    cache = siguiente;

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(siguiente));
    } catch {
        // Sin sitio o sin permiso: la partida vale igual, sólo no se recuerda.
    }

    return siguiente;
}

/**
 * Tira la CACHÉ, no lo guardado.
 *
 * Es lo que hace falta para releer del almacenamiento como si acabaras de abrir
 * la pestaña. Para borrar de verdad está `resetScores`.
 */
export function clearScores() {
    cache = null;
}

/** Borra los marcadores de verdad. Lo usa `//reset`. */
export function resetScores() {
    cache = null;
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // Nada que hacer.
    }
}
