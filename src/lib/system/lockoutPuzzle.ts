// src/lib/system/lockoutPuzzle.ts

import type { Random } from '@/lib/system/lore';

/**
 * El puzzle escondido en la pantalla de error.
 *
 * Cuando el sistema deja de reiniciarse (diez colapsos seguidos), la pantalla se
 * queda con un volcado de memoria. El volcado REPITE un patrón corto de bytes, y
 * una sola celda está mal. Haciendo clic en esa celda, el sistema se recupera.
 *
 * POR QUÉ ESTE PUZZLE Y NO OTRO. Tenía que cumplir tres cosas: verse como algo
 * que un sistema roto mostraría de verdad (un volcado hexadecimal lo es), no
 * necesitar instrucciones (el ojo encuentra la irregularidad en una cuadrícula
 * repetida sin que nadie se lo explique), y resolverse con un clic en vez de
 * escribiendo — el teclado es del editor, que sigue vivo debajo, y pedirle al
 * usuario que escriba acá le robaría las pulsaciones.
 *
 * Siempre hay una salida sin resolverlo: a los cinco minutos se levanta solo.
 * Un puzzle sin salida deja de ser un chiste en cuanto alguien no lo ve.
 */

export const DUMP_COLS = 10;
export const DUMP_ROWS = 6;

/** Cuántos bytes tiene el patrón que se repite. */
const PATTERN_LEN = 5;

export interface MemoryDump {
    /** Las celdas, en orden de lectura. */
    cells: string[];
    /** El patrón que se repite. */
    pattern: string[];
    /** Cuál es la celda que lo rompe. */
    oddIndex: number;
}

/** Un byte en hexadecimal, con dos dígitos. */
function byte(random: Random): string {
    return Math.floor(random() * 256)
        .toString(16)
        .toUpperCase()
        .padStart(2, '0');
}

export function buildDump(random: Random = Math.random): MemoryDump {
    const total = DUMP_ROWS * DUMP_COLS;

    // El patrón se construye con bytes distintos entre sí: dos iguales harían
    // que la repetición se leyera peor y el fallo costara más de encontrar por
    // el motivo equivocado.
    const pattern: string[] = [];
    let semilla = 0;
    while (pattern.length < PATTERN_LEN) {
        const b = byte(() => (random() + semilla * 0.137) % 1);
        if (!pattern.includes(b)) pattern.push(b);
        semilla += 1;
    }

    const cells = Array.from({ length: total }, (_, i) => pattern[i % PATTERN_LEN]);

    // Nunca en la primera celda: sin patrón establecido todavía, no habría con
    // qué compararla y el puzzle sería injusto.
    const oddIndex = 1 + Math.floor(random() * (total - 1));

    // El byte roto tiene que ser distinto del que le tocaba, pero además NO debe
    // coincidir con ningún otro del patrón: si coincidiera, la celda se leería
    // como parte de la repetición y el puzzle no tendría solución visible.
    let roto = byte(random);
    let intento = 0;
    while (pattern.includes(roto) && intento < 32) {
        roto = byte(() => (random() + intento * 0.071) % 1);
        intento += 1;
    }
    if (pattern.includes(roto)) roto = 'FF';
    if (pattern.includes(roto)) roto = '00';

    cells[oddIndex] = roto;

    return { cells, pattern, oddIndex };
}

/** ¿Es ésta la celda que rompe el patrón? */
export function isTheOddOne(dump: MemoryDump, index: number): boolean {
    if (index < 0 || index >= dump.cells.length) return false;
    return index === dump.oddIndex;
}
