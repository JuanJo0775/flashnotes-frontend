// src/lib/system/asciiArt.ts

/**
 * `//art` · las piezas que el sistema guarda de cuando alguien las dibujó.
 *
 * EL LORE: no son adornos que la app inventa. Son cosas que ya estaban en la
 * memoria de una máquina que lleva encendida demasiado tiempo — la polilla es la
 * primera avería de la historia de la computación, la cinta y el disquete son
 * soportes que esta terminal conoció. Cada pieza trae un pie que dice qué es,
 * como una etiqueta de archivo.
 *
 * SE COLECCIONAN. `//art` da una que no tengas mientras queden; cuando las tenés
 * todas, empieza a repetir. La cuenta vive en `localStorage`, atada a este
 * navegador, con el mismo patrón que los marcadores del pong.
 *
 * ⚠ TODO ASCII IMPRIMIBLE, y no por gusto retro: los bloques (█ ▌ ░) NO están en
 * JetBrains Mono y los pinta una fuente de reserva con otras métricas, así que un
 * dibujo con bloques se descuadra fila a fila. Es la misma trampa que hizo bailar
 * el corte del pong. Ver docs/REGLAS.md · C8.
 */

import type { Lang } from '@/config/lang';

type Localized = Readonly<Record<Lang, string>>;

const STORAGE_KEY = 'flashnotes:art';

export interface ArtPiece {
    id: string;
    /** El pie: qué es esto. */
    caption: Localized;
    art: string;
}

/**
 * La base.
 *
 * Piezas CHICAS a propósito: la respuesta se pinta en el hueco del editor, y
 * algo de treinta filas obligaría a desplazar para ver un dibujo, que es
 * exactamente lo contrario de lo que un dibujo hace.
 */
export const ART: readonly ArtPiece[] = [
    {
        id: 'moth',
        // La primera avería informática documentada fue una polilla dentro de un
        // relé, en 1947. De ahí viene «bug». Es la pieza que mejor explica por
        // qué esta app habla todo el rato de fallos.
        caption: {
            es: 'POLILLA · HALLADA EN EL RELÉ 70, 1947',
            en: 'MOTH · FOUND IN RELAY 70, 1947',
        },
        art: [
            '     \\         /     ',
            '  .--.\\.-----./.--.  ',
            " /    \\|     |/    \\ ",
            '|  /\\  |  .  |  /\\  |',
            " \\ \\/  '.___.'  \\/ / ",
            "  '--'    |    '--'  ",
            '          |          ',
        ].join('\n'),
    },
    {
        id: 'floppy',
        caption: { es: 'DISQUETE · 1,44 MB', en: 'FLOPPY DISK · 1.44 MB' },
        art: [
            ' .-----------------. ',
            ' | .-------------. | ',
            ' | |             | | ',
            ' | |             | | ',
            " | '-------------' | ",
            ' |    .------.     | ',
            ' |    |::::::|     | ',
            " '----'------'-----' ",
        ].join('\n'),
    },
    {
        id: 'crt',
        caption: {
            es: 'TERMINAL · SIN SEÑAL DESDE ENTONCES',
            en: 'TERMINAL · NO SIGNAL SINCE',
        },
        art: [
            '  .-------------------.  ',
            '  |  ...............  |  ',
            '  |  .             .  |  ',
            '  |  .   > _       .  |  ',
            '  |  .             .  |  ',
            '  |  ...............  |  ',
            "  '--------.-.--------'  ",
            "        .---'-'---.      ",
            "       '-----------'     ",
        ].join('\n'),
    },
    {
        id: 'cassette',
        caption: { es: 'CINTA · LADO A', en: 'TAPE · SIDE A' },
        art: [
            ' .---------------------. ',
            ' |  .--.         .--.  | ',
            ' | (    )       (    ) | ',
            " |  '--'         '--'  | ",
            ' |   ...............   | ',
            " '---------------------' ",
        ].join('\n'),
    },
    {
        id: 'cursor',
        caption: {
            es: 'CURSOR · ESPERANDO DESDE HACE RATO',
            en: 'CURSOR · WAITING FOR A WHILE',
        },
        art: [
            '   _______________   ',
            '  |               |  ',
            '  |  >            |  ',
            '  |               |  ',
            "  '---------------'  ",
        ].join('\n'),
    },
    {
        id: 'dish',
        caption: {
            es: 'ANTENA · NADIE DEL OTRO LADO',
            en: 'DISH · NOBODY ON THE OTHER SIDE',
        },
        art: [
            '      .-""-.      ',
            "    .'      '.    ",
            '   /          \\   ',
            '  |     ..     |  ',
            "   \\    ''    /   ",
            "    '.      .'    ",
            '      |    |      ',
            '     -+----+-     ',
        ].join('\n'),
    },
    {
        id: 'bulb',
        caption: {
            es: 'PILOTO · ENCENDIDO DESDE EL PRIMER ARRANQUE',
            en: 'PILOT LAMP · ON SINCE FIRST BOOT',
        },
        art: [
            "      .-'-.      ",
            '     /     \\     ',
            '    |  ...  |    ',
            '    |  ...  |    ',
            "     \\ ... /     ",
            '      |___|      ',
            '      |___|      ',
        ].join('\n'),
    },
    {
        id: 'key',
        caption: {
            es: 'LLAVE · LA CERRADURA YA NO EXISTE',
            en: 'KEY · THE LOCK IS GONE',
        },
        art: [
            '    .--.             ',
            "   /    \\            ",
            '  |  ..  |======_=_  ',
            "   \\    /       | |  ",
            "    '--'        '-'  ",
        ].join('\n'),
    },
];

export const ART_TOTAL = ART.length;

/** Las piezas que ya salieron, atadas a este navegador. */
export function readFound(): Set<string> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return new Set();

        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return new Set();

        const validos = new Set(ART.map((a) => a.id));
        return new Set(
            parsed.filter((id): id is string => typeof id === 'string' && validos.has(id))
        );
    } catch {
        return new Set();
    }
}

function store(found: Set<string>) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...found]));
    } catch {
        // Sin sitio: la colección no se recuerda. La pieza se ve igual.
    }
}

/** Sólo para los tests: el almacenamiento es el estado. */
export function clearFound() {
    ultima = null;
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // Nada que hacer.
    }
}

export interface ArtDraw {
    piece: ArtPiece;
    /** Cuántas van, contando ésta. */
    found: number;
    total: number;
    /** Si ésta era nueva. */
    isNew: boolean;
}

/**
 * Saca una pieza.
 *
 * PRIORIZA LAS QUE FALTAN. Sorteando entre las ocho a ciegas, conseguir la
 * última pedía una media de veinte intentos y la colección se volvía un trámite;
 * dando primero las que no tenés, cada `//art` avanza hasta completarla y sólo
 * entonces empieza a repetir.
 */
/**
 * La última que salió, para que `//keep` sepa cuál guardar.
 *
 * En memoria y no en `localStorage`: guardar una pieza es un gesto del momento
 * —«ésta me gusta»— y recordar entre sesiones cuál viste hace tres días haría
 * que `//keep` guardara algo que ya no tenés delante.
 */
let ultima: ArtPiece | null = null;

export function lastDrawn(): ArtPiece | null {
    return ultima;
}

export function drawArt(random: () => number = Math.random): ArtDraw {
    const found = readFound();
    const faltan = ART.filter((a) => !found.has(a.id));
    const bolsa = faltan.length > 0 ? faltan : ART;

    const piece = bolsa[Math.min(bolsa.length - 1, Math.floor(random() * bolsa.length))];
    const isNew = !found.has(piece.id);

    if (isNew) {
        found.add(piece.id);
        store(found);
    }

    ultima = piece;
    return { piece, found: found.size, total: ART_TOTAL, isNew };
}

/**
 * `//keep` se desbloquea con la PRIMERA pieza.
 *
 * Esperar a tenerlas las ocho dejaría el comando inútil justo mientras se
 * colecciona, que es cuando dan ganas de guardar una.
 */
export function canKeep(): boolean {
    return readFound().size > 0;
}

/** Cómo queda la pieza al guardarla en una nota. */
export function asNote(piece: ArtPiece, lang: Lang): string {
    return [piece.art, '', `-- ${piece.caption[lang]}`].join('\n');
}
