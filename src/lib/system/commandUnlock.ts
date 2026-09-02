// src/lib/system/commandUnlock.ts

/**
 * Qué comandos escondidos ya se descubrieron.
 *
 * `//help` no los lista por su nombre: los enseña TACHADOS, con letras que no
 * son las suyas, como un documento censurado. Se ve que hay algo, se ve cuántos
 * y se ve cuánto miden — y no se ve qué son.
 *
 * SE DESBLOQUEAN AL USARLOS, NO AL VERLOS. Encontrar el nombre por ahí no basta:
 * hay que teclearlo. Ver no es descubrir, y un comando que se desbloqueara con
 * sólo leerlo convertiría cualquier fuga en una entrega.
 *
 * Una vez usado, `//help` lo lista con su nombre de verdad y su descripción,
 * para siempre. La lista crece contigo.
 */

const STORAGE_KEY = 'flashnotes:cmds';

/** Caché en memoria: `//help` la consulta en cada tirada. */
let cache: Set<string> | null = null;

export function readUsed(): Set<string> {
    if (cache) return cache;

    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return (cache = new Set());

        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return (cache = new Set());

        return (cache = new Set(parsed.filter((n): n is string => typeof n === 'string')));
    } catch {
        return (cache = new Set());
    }
}

/** Anota que este comando se usó. Devuelve si era la primera vez. */
export function markUsed(name: string): boolean {
    const usados = readUsed();
    if (usados.has(name)) return false;

    usados.add(name);
    cache = usados;

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...usados]));
    } catch {
        // Sin sitio: se desbloquea igual, sólo no se recuerda al volver.
    }

    return true;
}

export function isUnlocked(name: string): boolean {
    return readUsed().has(name);
}

/** Lo usan `//reset` y los tests. */
export function clearUsed() {
    cache = null;
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // Nada que hacer.
    }
}

const LETRAS = 'abcdefghijklmnopqrstuvwxyz';

/**
 * Un número reproducible a partir de un texto.
 *
 * DETERMINISTA a propósito: si la censura se sorteara en cada tirada, la lista
 * bailaría cada vez que pidieras la ayuda y se leería como ruido en vez de como
 * un documento tachado. Tachado significa que hay algo fijo debajo.
 */
function ruido(texto: string, i: number): number {
    let h = 2166136261;
    for (let k = 0; k < texto.length; k += 1) {
        h ^= texto.charCodeAt(k);
        h = Math.imul(h, 16777619);
    }
    h ^= i * 2654435761;
    return Math.abs(h) % LETRAS.length;
}

/**
 * El nombre censurado.
 *
 * CONSERVA EL LARGO, y eso es deliberado: saber que un comando tiene cinco
 * letras es una pista de verdad —se puede cruzar con lo que sueltan las ventanas
 * de error— sin regalar nada. Un tachón de ancho fijo no diría ni eso.
 *
 * Todo se vuelve letra, incluidos los guiones bajos: dejar la forma
 * (`//xxxx_xxx`) delataría a `//date_off` de un vistazo.
 */
export function redact(name: string, prefix = '//'): string {
    const cuerpo = name.startsWith(prefix) ? name.slice(prefix.length) : name;

    const tachado = [...cuerpo]
        .map((_, i) => LETRAS[ruido(name, i)])
        .join('');

    // Con nombres de dos letras, una coincidencia es improbable pero posible, y
    // un «tachón» que resulte ser el nombre de verdad sería un regalo.
    const salida = prefix + tachado;
    if (salida === name) {
        return prefix + LETRAS[(ruido(name, 0) + 1) % LETRAS.length] + tachado.slice(1);
    }

    return salida;
}
