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

/**
 * Cuántos bytes tiene el patrón que se repite.
 *
 * SIETE, Y ES PRIMO CON LAS DIEZ COLUMNAS A PROPÓSITO.
 *
 * Eran cinco, y cinco divide a diez: la repetición caía en columnas perfectas —
 * cada columna mostraba siempre el mismo byte— y la celda rota saltaba a la
 * vista sin buscarla. El puzzle se resolvía de un vistazo y no era un puzzle.
 *
 * Con siete el patrón se corre una columna en cada fila y tarda siete filas en
 * volver a alinearse; como el volcado tiene seis, ninguna fila repite la
 * alineación de otra. Hay que leer el patrón de verdad en vez de escanear una
 * columna.
 *
 * Un test lo fija calculando el máximo común divisor: si alguien cambia el
 * ancho de la rejilla, salta.
 */
export const PATTERN_LEN = 7;

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

const HEX = '0123456789ABCDEF';

/**
 * El byte que rompe el patrón: el que tocaba, con UN dígito cambiado.
 *
 * Antes era un byte al azar y cantaba demasiado: entre bytes repetidos, uno sin
 * ninguna relación se ve de lejos. Cambiando un solo dígito hexadecimal sigue
 * siendo hallable —el patrón entero está alrededor para comparar— pero hay que
 * mirar de verdad.
 *
 * DIFÍCIL NO ES LO MISMO QUE IMPOSIBLE: el resultado nunca puede coincidir con
 * otro byte del patrón, o la celda se leería como parte de la repetición y el
 * puzzle se quedaría sin solución visible. Si ninguna variante de un dígito
 * sirve —sólo pasa con patrones muy apretados— se cambia el otro dígito.
 */
function brokenByte(
    esperado: string,
    pattern: readonly string[],
    random: Random
): string {
    const candidatos: string[] = [];

    for (let pos = 0; pos < 2; pos += 1) {
        for (const d of HEX) {
            if (d === esperado[pos]) continue;
            const v =
                pos === 0 ? `${d}${esperado[1]}` : `${esperado[0]}${d}`;
            if (!pattern.includes(v)) candidatos.push(v);
        }
    }

    // No puede quedar vacío con un patrón de siete bytes distintos —hay treinta
    // variantes de un dígito— pero si algún día lo quedara, no se rompe.
    if (candidatos.length === 0) return esperado === 'FF' ? '00' : 'FF';

    return candidatos[Math.floor(random() * candidatos.length) % candidatos.length];
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

    cells[oddIndex] = brokenByte(pattern[oddIndex % PATTERN_LEN], pattern, random);

    return { cells, pattern, oddIndex };
}

/** ¿Es ésta la celda que rompe el patrón? */
export function isTheOddOne(dump: MemoryDump, index: number): boolean {
    if (index < 0 || index >= dump.cells.length) return false;
    return index === dump.oddIndex;
}
