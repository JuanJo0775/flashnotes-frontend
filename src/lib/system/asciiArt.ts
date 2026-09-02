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

import type { Note } from '@/types/note.types';
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

/**
 * Cómo se llama la pieza guardada.
 *
 * `POLILLA · 1/8`, no «Nueva nota». El número es su sitio en la colección, no el
 * orden en que la encontraste: es una ficha de catálogo, y una ficha dice qué
 * pieza es y cuántas hay.
 */
export function noteTitle(piece: ArtPiece, lang: Lang): string {
    const i = ART.findIndex((a) => a.id === piece.id) + 1;
    // El pie lleva el nombre y una coletilla («POLILLA · HALLADA EN…»); para el
    // título basta el nombre, que es lo que se lee en una lista estrecha.
    const nombre = piece.caption[lang].split(' · ')[0];

    return `${nombre} · ${i}/${ART_TOTAL}`;
}

/** Las líneas sin espacios de cola: al pasar por el editor pueden cambiar. */
function normaliza(texto: string): string {
    return texto
        .split('\n')
        .map((l) => l.replace(/\s+$/, ''))
        .join('\n')
        .trim();
}

/**
 * Qué número de pieza es lo que hay guardado en una nota, o `null`.
 *
 * SE RECONOCE POR EL DIBUJO, no por el título: el título es texto que alguien
 * pudo haber tocado, y el dibujo es la pieza. Y se comparan las líneas sin
 * espacios de cola, porque al pasar por el editor y volver una línea puede
 * perder o ganar uno sin dejar de ser la misma.
 */
export function pieceIndexOf(contenido: string): number | null {
    const limpio = normaliza(contenido);

    const i = ART.findIndex((p) => limpio.startsWith(normaliza(p.art)));

    return i < 0 ? null : i + 1;
}

export interface ArtSlot {
    /** Su sitio en el catálogo, del 1 al total. */
    number: number;
    /** La nota que la guarda, o `null` si todavía no la encontraste. */
    note: Note | null;
}

/**
 * El catálogo entero: los ocho huecos, tengas las que tengas.
 *
 * ES LO QUE CONVIERTE UNA LISTA EN UNA COLECCIÓN. Enseñar sólo lo que tenés,
 * apilado, no deja ver CUÁL acabás de encontrar ni cuáles faltan — y lo que hace
 * coleccionar es precisamente ver el sitio vacío.
 *
 * Cada pieza cae en SU hueco y no en el primero libre: si se apilaran por orden
 * de hallazgo, el número dejaría de significar nada.
 */
export function artSlots(pieces: readonly Note[]): ArtSlot[] {
    const huecos: ArtSlot[] = ART.map((_, i) => ({ number: i + 1, note: null }));

    for (const nota of pieces) {
        const n = pieceIndexOf(nota.content ?? '');
        // Una nota que no es ninguna pieza no ocupa hueco: no debería llegar
        // acá, pero si llega no puede robarle el sitio a la que falta.
        if (n !== null) huecos[n - 1].note = nota;
    }

    return huecos;
}

/** Cómo queda la pieza al guardarla en una nota. */
export function asNote(piece: ArtPiece, lang: Lang): string {
    return [piece.art, '', `-- ${piece.caption[lang]}`].join('\n');
}
