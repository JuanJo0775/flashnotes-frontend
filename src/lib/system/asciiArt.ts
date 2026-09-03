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
 * SE GANAN, NO SE REGALAN. Cada una llega por un camino distinto —el ente, la
 * v0.2, los dos marcadores del pong, los secretos, haber escrito de verdad— y
 * ninguno da más de una. `//art` es el catálogo: no da nada, sólo dice cuáles
 * llevás. La cuenta vive en `localStorage`, atada a este navegador.
 *
 * ⚠ NADA QUE LA MONOESPACIADA NO TENGA. La regla no es «sólo ASCII» —la `Ø` de la
 * flor está en JetBrains Mono y se pinta perfecta— sino que no haya BLOQUES
 * (█ ▌ ░) ni MARCOS DE CAJA (┌ ─ ┐): ésos no están, los pinta una fuente de
 * reserva con otras métricas, y el dibujo se descuadra fila a fila. Es la trampa
 * que hizo bailar el corte del pong. Ver docs/REGLAS.md · C8.
 */

import type { Note } from '@/types/note.types';
import type { Lang } from '@/config/lang';

type Localized = Readonly<Record<Lang, string>>;

const STORAGE_KEY = 'flashnotes:art';

/**
 * Las que además se han VISTO en el catálogo.
 *
 * ⚠ GANARLA Y VERLA SON DOS COSAS. Una pieza ganada no brota sola en la
 * colección: hay que teclear `//art` para que se revele.
 *
 * No es un trámite de más — es lo que convierte el catálogo en algo que se
 * CONSULTA. Si apareciera sola en la pestaña, `//art` no serviría para nada:
 * sabrías lo que tenés sin preguntar. Así, encontrar una pieza deja una pregunta
 * abierta —«¿cuál me habrá tocado?»— hasta que vas a mirar.
 */
const SEEN_KEY = 'flashnotes:artSeen';

/**
 * De dónde sale cada pieza.
 *
 * OCHO PIEZAS, OCHO CAMINOS, y ninguno da más de una. Si un canal diera piezas
 * cada vez, con insistir veinte veces se tendrían las ocho y la colección
 * volvería a no costar nada.
 *
 * Y como cada pieza tiene un origen FIJO, el dibujo puede hablar de dónde salió:
 * la que se gana entrando en la v0.2 es un disquete, la del pong es un cursor
 * esperando. La colección completa acaba siendo un mapa de todo lo que hay
 * escondido en la app — que es la única razón que justifica que tenga sección
 * propia.
 */
export type ArtSource =
    /** Hablar con lo que hay detrás de `//hi`. */
    | 'entity'
    /** Entrar en la v0.2 por primera vez. */
    | 'v02'
    /** Un comando escondido, por asignar. */
    | 'command'
    /** Una palabra secreta, por asignar. */
    | 'word'
    /** Marcador del pong, tablero limpio. */
    | 'pong'
    /** Marcador del pong, tablero degradado — que es más difícil. */
    | 'pong-degraded'
    /** Haber encontrado todos los comandos escondidos. */
    | 'all-commands'
    /** El secreto más difícil que quede, por asignar. */
    | 'hardest'
    /**
     * HABERLOS ENCONTRADO TODOS. La última, y la única que no se puede tener a
     * medias: sale cuando el contador del panel llega a su propio total.
     */
    | 'all-secrets'
    /**
     * HABER ESCRITO DE VERDAD.
     *
     * Todas las demás premian hurgar. Ésta premia haber USADO la app para lo que
     * es — y por eso es la única que puede encontrar alguien que nunca haya
     * tecleado un comando.
     */
    | 'written';

export interface ArtPiece {
    id: string;
    /** El pie: qué es esto. */
    caption: Localized;
    /** Cómo se gana. Uno por pieza, y ninguno repetido. */
    source: ArtSource;
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
        source: 'entity',
        // La primera avería informática documentada fue una polilla dentro de un
        // relé, en 1947. De ahí viene «bug». Es la pieza que mejor explica por
        // qué esta app habla todo el rato de fallos.
        caption: {
            es: 'POLILLA · HALLADA EN EL RELÉ 70, 1947',
            en: 'MOTH · FOUND IN RELAY 70, 1947',
        },
        /*
         * LA MEJOR DE LAS OCHO, y la que cuenta el proyecto entero. Sólo se
         * ensanchó a la medida de la serie y se le puso el relé alrededor: la
         * polilla no estaba suelta, estaba DENTRO de un contacto.
         */
        art: [
            '+======================================+',
            '|  |    |    |    |    |    |    |     |',
            '|             \\           /            |',
            '|               \\  .-.  /              |',
            '|      .------\\---( o )---/------.     |',
            '|     /         \\  ._.  /         \\    |',
            '|    /  .:::.    \\ ||| /    .:::.  \\   |',
            '|   |  (:::::)     |||     (:::::)  |  |',
            '|    \\  ":::"      |||      ":::"  /   |',
            '|     \\            |||            /    |',
            '|      "------.    |||    .------"     |',
            '|                  "                   |',
            '|  |    |    |    |    |    |    |     |',
            '+======================================+',
        ].join('\n'),
    },
    {
        id: 'floppy',
        source: 'v02',
        caption: { es: 'DISQUETE · 1,44 MB', en: 'FLOPPY DISK · 1.44 MB' },
        /*
         * SE GANA ENTRANDO EN LA v0.2, y por eso es un disquete: el soporte donde
         * esa versión guardaba lo suyo, y que nadie migró. La etiqueta lleva su
         * número de versión escrito a mano, como se escribían.
         */
        art: [
            '   +==============================+     ',
            '   |  +========================+  |     ',
            '   |  |                        |  |==+  ',
            '   |  |     v 0 . 2            |  |  |  ',
            '   |  |     ...............    |  |  |  ',
            '   |  |                        |  |==+  ',
            '   |  +========================+  |     ',
            '   |                              |     ',
            '   |     +==============+         |     ',
            '   |     | :::::::::::: |         |     ',
            '   |     | :::::::::::: |         |     ',
            '   +=====+==============+=========+     ',
        ].join('\n'),
    },
    {
        id: 'crt',
        source: 'command',
        caption: {
            es: 'TERMINAL · SIN SEÑAL DESDE ENTONCES',
            en: 'TERMINAL · NO SIGNAL SINCE',
        },
        /*
         * El tubo, con su peana. Se ensanchó a la medida de la serie y se le
         * puso el barrido dentro — la misma línea que cruza toda la app, aquí
         * quieta para siempre.
         */
        art: [
            '     +============================+     ',
            '     |                            |     ',
            '     |  ........................  |     ',
            '     |  .                      .  |     ',
            '     |  .  > _                 .  |     ',
            '     |  .                      .  |     ',
            '     |  .~~~~~~~~~~~~~~~~~~~~~~.  |     ',
            '     |  .                      .  |     ',
            '     |  ........................  |     ',
            '     |                            |     ',
            '     +=============+==+===========+     ',
            '                   |  |                 ',
            '           +=======+==+=======+         ',
            '        +======================+        ',
        ].join('\n'),
    },
    {
        id: 'cassette',
        source: 'word',
        caption: { es: 'CINTA · LADO A', en: 'TAPE · SIDE A' },
        /*
         * Estaba APLASTADA: seis filas para algo que necesita diez para tener
         * carretes. Ahora los tiene, y se ve la cinta pasando de uno al otro.
         */
        art: [
            '  +==================================+  ',
            '  |                                  |  ',
            '  |   .------.          .------.     |  ',
            '  |  ( ...... )        ( ...... )    |  ',
            '  |  ( .:oo:. )========( .:oo:. )    |  ',
            '  |  ( ...... )        ( ...... )    |  ',
            '  |   :------:          :------:     |  ',
            '  |                                  |  ',
            '  |  ::::::::::::::::::::::::::::    |  ',
            '  |                                  |  ',
            '  +==================================+  ',
        ].join('\n'),
    },
    {
        id: 'cursor',
        source: 'pong',
        caption: {
            es: 'CURSOR · ESPERANDO DESDE HACE RATO',
            en: 'CURSOR · WAITING FOR A WHILE',
        },
        /*
         * SE GANA CON EL PONG, así que el dibujo es la pista: dos palas, la
         * bola en medio, y el cursor esperando turno abajo.
         *
         * La anterior era un rectángulo con un `>` dentro y no decía nada que la
         * app no dijera ya. Una pieza que se gana jugando tiene que enseñar la
         * partida.
         */
        art: [
            '+======================================+',
            // 03–02. Un doble cero es una pista que nadie empezó; un marcador
            // apretado es una partida en marcha, que es lo que la bola con
            // estela ya está contando.
            '|  03                            02    |',
            '|  ==                            ==    |',
            '|                  :                   |',
            '|   ||             :               ||  |',
            '|   ||             :               ||  |',
            '|   ||             :   . . o       ||  |',
            '|   ||             :               ||  |',
            '|   ||             :               ||  |',
            '|                  :                   |',
            '|  ::::::::::::::::::::::::::::::::    |',
            '|   > _                                |',
            '+======================================+',
        ].join('\n'),
    },
    {
        id: 'dish',
        source: 'pong-degraded',
        caption: {
            es: 'ANTENA · NADIE DEL OTRO LADO',
            en: 'DISH · NOBODY ON THE OTHER SIDE',
        },
        /*
         * SE GANA EN EL TABLERO DEGRADADO, que es el difícil. Es la antena que
         * lleva escuchando sin que conteste nadie — y las ondas que salen de ella
         * se pierden hacia arriba.
         */
        art: [
            '   ~   ~   ~   ~   ~   ~   ~   ~   ~    ',
            '     ~     ~     ~     ~     ~     ~    ',
            '                                        ',
            '           .------------.               ',
            '         .-              -.             ',
            '        (        ..        )            ',
            '        (        ..        )            ',
            '         :-              -:             ',
            '           :------------:               ',
            '                |  |                    ',
            '                |  |                    ',
            '             +==+==+==+                 ',
            '            ::::::::::::                ',
        ].join('\n'),
    },
    {
        id: 'bulb',
        source: 'all-commands',
        caption: {
            es: 'PILOTO · ENCENDIDO DESDE EL PRIMER ARRANQUE',
            en: 'PILOT LAMP · ON SINCE FIRST BOOT',
        },
        /*
         * SE GANA ENCONTRÁNDOLOS TODOS, así que es la lámpara que lleva
         * encendida desde el primer arranque — la que estuvo ahí mientras
         * buscabas.
         *
         * La anterior parecía un bote: le faltaba la rosca. Ahora la tiene, y el
         * halo de tildes arriba y abajo es lo que la enciende.
         */
        art: [
            '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
            '                 .----.                 ',
            '              .-:      :-.              ',
            '             (            )             ',
            '            (   ::::::::   )            ',
            '            (   ::::::::   )            ',
            '             (            )             ',
            '              -:        :-              ',
            '                |======|                ',
            '                |------|                ',
            '                |======|                ',
            '                |------|                ',
            '                 .----.                 ',
            '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
        ].join('\n'),
    },
    {
        id: 'flower',
        source: 'written',
        caption: {
            es: 'FLOR · CRECIÓ MIENTRAS USTED ESCRIBÍA',
            en: 'FLOWER · IT GREW WHILE YOU WROTE',
        },
        /*
         * LA ÚNICA QUE NO SE GANA HURGANDO.
         *
         * Todas las demás premian buscar secretos. Ésta premia haber USADO la app
         * para lo que es — y por eso puede encontrarla alguien que no haya
         * tecleado un comando en su vida.
         *
         * Es lo que la hace valer: en una colección donde todo se consigue
         * escarbando, la pieza más difícil de justificar es la que se consigue
         * simplemente escribiendo. Y es la que mejor dice de qué va esta app.
         */
        art: [
            '             .-.       .-.              ',
            '            (   )     (   )             ',
            '             :-:       :-:              ',
            '          .-.     .-.     .-.           ',
            '         (   )   ( Ø )   (   )          ',
            '          :-:     :-:     :-:           ',
            '             .-.       .-.              ',
            '            (   )     (   )             ',
            '             :-:       :-:              ',
            '                   |                    ',
            '            [      |      ]             ',
            '             \\           /              ',
            '              \\_________/               ',
        ].join('\n'),
    },
    {
        id: 'shelf',
        source: 'all-secrets',
        caption: {
            es: 'CUADERNO · JUANJO0775 ESTUVO AQUÍ',
            en: 'NOTEBOOK · JUANJO0775 WAS HERE',
        },
        /*
         * LA ÚLTIMA, y la única que no se puede tener a medias: sale cuando el
         * contador del panel llega a su propio total.
         *
         * Un cuaderno ABIERTO, con las dos hojas y el pliegue en medio. Todas las
         * demás piezas son cosas que la máquina guardaba de antes; ésta es la
         * única que habla de FUERA de la máquina — y por eso cierra la colección.
         *
         * No dice «el que escribió esto» sino ESTUVO AQUÍ, que es lo que se
         * escribe en un margen. La diferencia importa: lo primero es una firma de
         * autor, lo segundo es alguien que pasó por un sitio y lo apuntó — que es
         * de lo que va esta app entera.
         */
        art: [
            ' .-/|              \\ /              |\\-.',
            ' |||                |                |||',
            ' |||   ~~~*~~~      |                |||',
            ' |||                |     estuvo     |||',
            ' |||  JuanJo0775    |                |||',
            ' |||                |      aqui      |||',
            ' |||                |                |||',
            ' ||/===============\\|/===============\\||',
            "  `-  ------------  ^  ^ -----------  -'",
        ].join('\n'),
    },
    {
        id: 'key',
        source: 'hardest',
        caption: {
            es: 'LLAVE · LA CERRADURA YA NO EXISTE',
            en: 'KEY · THE LOCK IS GONE',
        },
        /*
         * EL SECRETO MÁS DIFÍCIL, y por eso la cerradura ya no existe: para
         * cuando la conseguís, no queda nada que abrir.
         *
         * En la anterior el paletón salía a otra altura que el ojo y se veía
         * torcida. Acá el vástago sale del centro exacto y los dientes cuelgan
         * de él.
         */
        art: [
            '                                        ',
            '        .-""-.                          ',
            '      .:      :.                        ',
            '     /    .--.    \\                     ',
            '    |    ( ** )    |==============+     ',
            '    |     :--:     |    |   |   | |     ',
            '     \\            /     |   |   | |     ',
            '      ":.      .:"      "   "   " "     ',
            '        "-..-"                          ',
            '                                        ',
            '   : : : : : : : : : : : : : : : : :    ',
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
        localStorage.removeItem(SEEN_KEY);
    } catch {
        // Nada que hacer.
    }
}

/** Las piezas que ya se vieron en el catálogo, y por tanto están en la colección. */
export function readRevealed(): Set<string> {
    try {
        const raw = localStorage.getItem(SEEN_KEY);
        if (!raw) return new Set();

        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return new Set();

        const validos = new Set(ART.map((a) => a.id));
        return new Set(
            parsed.filter(
                (id): id is string => typeof id === 'string' && validos.has(id)
            )
        );
    } catch {
        return new Set();
    }
}

/**
 * Consultar el catálogo revela TODO lo que tengas ganado.
 *
 * Todo de una vez y no de a una: consultar el inventario enseña el inventario.
 * Ir revelando una por consulta sería un trámite, y el trámite no es la gracia.
 *
 * Lo que ganes DESPUÉS necesita otra consulta, que es justo lo que mantiene vivo
 * el comando.
 */
export function revealArt() {
    const found = readFound();
    if (found.size === 0) return;

    try {
        localStorage.setItem(SEEN_KEY, JSON.stringify([...found]));
    } catch {
        // Sin sitio, la colección se queda como estaba. No se pierde nada
        // ganado: eso vive en su propia clave.
    }
}

/**
 * La última que se dibujó, para que `//keep` sepa cuál guardar.
 *
 * En memoria y no en `localStorage`: guardar una pieza es un gesto del momento
 * —«ésta la quiero tocar»— y recordar entre sesiones cuál viste hace tres días
 * haría que `//keep` guardara algo que ya no tenés delante.
 */
let ultima: ArtPiece | null = null;

export function lastDrawn(): ArtPiece | null {
    return ultima;
}

/** Lo usa `//art_<n>` al dibujar, para que `//keep` pueda encadenarse. */
export function rememberDrawn(piece: ArtPiece | null) {
    ultima = piece;
}

/**
 * El mapa de caminos, derivado de las propias piezas.
 *
 * Se deriva y no se escribe aparte: con el mapa en dos sitios, uno se queda
 * viejo — y el que se quedaría viejo es siempre el que nadie mira.
 */
export const ART_SOURCES = Object.fromEntries(
    ART.map((p) => [p.source, p.id])
) as Record<ArtSource, string>;

/**
 * GANARSE una pieza. Devuelve la pieza si era nueva, o `null` si ya la tenías.
 *
 * ⚠ NO DA NADA LA SEGUNDA VEZ, y ésa es la mitad importante. Si un canal diera
 * piezas cada vez que se usa, con insistir veinte veces se tendrían las ocho y la
 * colección volvería a ser lo que era: ocho pulsaciones de Enter.
 *
 * Devolver `null` en vez de la pieza deja que quien llama sepa si hay algo que
 * celebrar. Volver a hablar con el ente contesta, pero no vuelve a regalar.
 */
export function awardPiece(id: string): ArtPiece | null {
    const piece = ART.find((p) => p.id === id);
    if (!piece) return null;

    const found = readFound();
    if (found.has(id)) return null;

    found.add(id);
    store(found);

    return piece;
}

/** Atajo por camino, para no repetir identificadores por toda la app. */
export function awardFrom(source: ArtSource): ArtPiece | null {
    return awardPiece(ART_SOURCES[source]);
}

export interface CatalogRow {
    /** Su sitio fijo, del 1 al total. La 6 es la 6 la tengas o no. */
    number: number;
    found: boolean;
    /** El nombre, si la tenés. Vacío si no. */
    label: string;
    /**
     * Cuánto mide el nombre tapado.
     *
     * De las que faltan viaja el LARGO y no el nombre: lo que no está no se
     * puede leer en el inspector. Y el largo es una pista de verdad, igual que
     * en `//help`.
     */
    length: number;
}

/**
 * El catálogo que enseña `//art`.
 *
 * ⚠ VACÍO SI NO TENÉS NINGUNA, y entonces `//art` contesta «comando
 * desconocido». Un catálogo vacío anunciaría que hay una colección que llenar, y
 * encontrar la primera pieza es parte de lo que se descubre.
 */
export function catalogRows(lang: Lang = 'es'): CatalogRow[] {
    const found = readFound();
    if (found.size === 0) return [];

    return ART.map((piece, i) => {
        const tengo = found.has(piece.id);
        const nombre = piece.caption[lang];

        return {
            number: i + 1,
            found: tengo,
            label: tengo ? nombre : '',
            length: nombre.length,
        };
    });
}

/**
 * La pieza número `n`, si la tenés.
 *
 * `null` cuando no la tenés o cuando el número no existe, y la diferencia no se
 * cuenta: `//art_9` y `//art_3` sin tenerla contestan lo mismo. Decir «esa
 * existe pero no es tuya» sería un cartel.
 */
export function pieceByNumber(n: number): ArtPiece | null {
    const piece = ART[n - 1];
    if (!piece) return null;

    return readFound().has(piece.id) ? piece : null;
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
