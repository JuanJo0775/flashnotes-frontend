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
 * Las que además se han ABIERTO con `//art_<n>`.
 *
 * ⚠ TENERLA NO ES SABER QUÉ ES. Una pieza pasa por tres estados —ganada,
 * revelada, abierta— y el PIE no llega hasta el tercero.
 *
 * En el catálogo ves que tenés la seis y no sabés qué es la seis hasta abrirla.
 * Sin esto, `//art_<n>` sería sólo una forma de volver a ver algo que el
 * catálogo ya te había contado.
 */
const OPEN_KEY = 'flashnotes:artOpen';

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
    | 'written'
    /**
     * HABER SACADO EL MORSE DEL RELOJ.
     *
     * No descifrarlo: sólo verlo. Es el momento exacto en que la app deja de
     * parecer una libreta — hay una señal, no se entiende, y está ahí a la vista.
     * Por eso la pieza es una antena: recibir algo que todavía no sabés leer.
     */
    | 'morse'
    /**
     * HABER MIRADO EL HISTORIAL de una nota con `//history`.
     *
     * Su pieza es una cinta perforada: un registro completo de lo que pasó,
     * guardado en una forma que el ojo no lee de un vistazo. Es lo que ES un
     * historial.
     */
    | 'history'
    /**
     * HABER PASADO POR EL BLOQUEO Y SALIR.
     *
     * El momento más oscuro de la app. Su pieza es un faro: sigue mandando su
     * señal aunque no haya nadie mirando, que es lo que la máquina lleva
     * haciendo desde antes de que llegaras.
     */
    | 'lockout'
    /**
     * HABER DICHO QUE NO Y QUE TE GASTARAN LA BROMA.
     *
     * Su pieza es una carita: es el único momento en que la máquina se ríe con
     * vos y no de vos. Se gana justo después del susto, y sólo la ve quien tuvo
     * el valor de teclear `//reset` y la prudencia de decir que no.
     */
    | 'prank'
    /**
     * HABER DEJADO LA PESTAÑA ABIERTA SIN ESCRIBIR.
     *
     * Su pieza es un ojo. Todas las demás premian hacer algo; ésta premia NO
     * hacer nada — y lo que cuenta es que la máquina siguió ahí mientras tanto,
     * mirando.
     */
    | 'idle'
    /**
     * HABER JUNTADO MUCHAS NOTAS.
     *
     * Su pieza es una biblioteca. Es la hermana del arbusto: aquélla premia
     * haber escrito mucho de una vez, ésta haber vuelto muchas veces.
     */
    | 'many-notes';

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
         * ⚠ ES SU PROPIO ESPEJO, CARÁCTER A CARÁCTER.
         *
         * Dos intentos salieron torcidos por centrar cada fila «a ojo». El eje
         * real de un marco de cuarenta columnas cae ENTRE la 19 y la 20, no en
         * una columna: cualquier motivo de ancho impar puesto ahí queda medio
         * carácter corrido, y medio carácter en trece filas es un bicho chueco.
         *
         * Ahora la mitad izquierda se dibuja y la derecha se genera invirtiéndola
         * —cambiando `/` por `\` y `(` por `)`—, así que la simetría no depende de
         * contar bien. Por eso el cuerpo y la cabeza son de ancho PAR.
         *
         * Las alas llevan relleno degradado —`:::` denso junto al cuerpo, `.` en
         * el borde— y un ocelo en cada una, que es la mancha que tienen las
         * polillas de verdad. Un contorno con un punto dentro no era un ala, era
         * un globo.
         */
        art: [
            '+======================================+',
            '|::|::|::|::|::|::|::|::|::|::|::|::|::|',
            '|          \\                /          |',
            '|            \\\\   .--.   //            |',
            '|  .-------\\\\--   (oo)   --//-------.  |',
            '|  /:::::.  \\\\    ".."    //  .:::::\\  |',
            '| /:::::::::.\\\\    ||    //.:::::::::\\ |',
            '||::::(o):::: \\    ||    / ::::(o)::::||',
            '| \\:::::::::" .    ||    . ":::::::::/ |',
            '|  \\:::::"      .-++++-.      ":::::/  |',
            '| "--------.       ||       .--------" |',
            '|                  ""                  |',
            '|::|::|::|::|::|::|::|::|::|::|::|::|::|',
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
        /*
         * ⚠ EL OBTURADOR ES LO QUE LO HACE INCONFUNDIBLE.
         *
         * La versión anterior era una caja con una etiqueta: podía ser cualquier
         * cosa cuadrada. Un disquete se reconoce por la CHAPA METÁLICA de la
         * derecha con su muelle — es la única pieza que tiene y que no tiene
         * ninguna otra cosa.
         *
         * Y la etiqueta lleva renglones escritos, no una línea suelta: nadie
         * etiquetaba un disquete con una palabra.
         *
         * ⚠ COLOCADO POR COLUMNAS, no a ojo. La primera versión tenía la
         * etiqueta, el obturador y la ventana cada uno empezando donde caía, y
         * las piezas no alineaban entre sí: se veía desfasado sin que se supiera
         * decir dónde. Acá cada elemento arranca en una columna FIJA y todo lo
         * demás se mide desde ahí.
         */
        art: [
            ' +====================================+ ',
            ' |                         .--------. | ',
            ' |                         |::::::::| | ',
            ' |  .-------------------.  |::::::::| | ',
            ' |  | v 0 . 2           |  |::::::::| | ',
            ' |  | ................. |  "--------" | ',
            ' |  | ................. |             | ',
            ' |  "-------------------"             | ',
            ' |                                    | ',
            ' |       .--------------------.       | ',
            ' |       |::::::::::::::::::::|       | ',
            ' |       "--------------------"       | ',
            ' +====================================+ ',
        ].join('\n'),
    },
    {
        id: 'crt',
        source: 'pong-degraded',
        caption: {
            es: 'TERMINAL · SIN SEÑAL DESDE ENTONCES',
            en: 'TERMINAL · NO SIGNAL SINCE',
        },
        /*
         * EL BISEL ES LO QUE LO HACE UN APARATO.
         *
         * Antes era una caja con texto dentro y podía ser una ventana, un cartel
         * o un marco. El doble `::` alrededor de la pantalla es el bisel, y abajo
         * están los MANDOS: dos ruedas de ajuste, la rejilla del altavoz y el
         * piloto. Un aparato se reconoce por lo que tiene alrededor de la
         * pantalla, no por la pantalla.
         *
         * El barrido sigue dentro, quieto para siempre: la misma línea que cruza
         * toda la app.
         */
        art: [
            '  +==================================+  ',
            '  |   .--------------------------.   |  ',
            '  |   |::::::::::::::::::::::::::|   |  ',
            '  |   |::                      ::|   |  ',
            '  |   |:: > _                  ::|   |  ',
            '  |   |::                      ::|   |  ',
            '  |   |::~~~~~~~~~~~~~~~~~~~~~~::|   |  ',
            '  |   |::::::::::::::::::::::::::|   |  ',
            '  |   "--------------------------"   |  ',
            '  |   (o)   (o)    [======]   .::.   |  ',
            '  +===============+==+===============+  ',
            '                  |  |                  ',
            '            .-----+--+-----.            ',
            '            "---------------"           ',
        ].join('\n'),
    },
    {
        id: 'cassette',
        source: 'command',
        caption: { es: 'CINTA · LADO A', en: 'TAPE · SIDE A' },
        /*
         * Estaba APLASTADA: seis filas para algo que necesita diez para tener
         * carretes. Ahora los tiene, y se ve la cinta pasando de uno al otro.
         */
        /*
         * LA CINTA SE VE PASAR, que es lo único que hay que mirar por la ventana
         * de un casete. Antes era un `====` entre dos carretes —un cable, no una
         * cinta—; ahora es una banda ancha de `::::` cruzando por delante.
         *
         * Y LOS CARRETES TIENEN DISTINTA DENSIDAD: el izquierdo lleno de `:::`,
         * el derecho con los puntos separados. Eso es lo que cuenta que ESTUVO
         * SONANDO — dos carretes iguales serían una cinta sin usar.
         *
         * Con dos renglones de etiqueta y aire arriba y abajo: quedaba
         * demasiado achatada para lo ancha que es.
         */
        art: [
            '+======================================+',
            '|  LADO A                              |',
            '|  .................................   |',
            '+======================================+',
            '|                                      |',
            '|   .-------.  ::::::::   .-------.    |',
            '|  ( ::::::: ):::::::::: ( . . . . )   |',
            '|  ( ::(o):: ):::::::::: ( .:(o):. )   |',
            '|  ( ::::::: ):::::::::: ( . . . . )   |',
            '|   "-------"  ::::::::   "-------"    |',
            '|                                      |',
            '|   .--.   .--.   .--.   .--.   .--.   |',
            '+======================================+',
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
        id: 'quill',
        source: 'word',
        caption: {
            es: 'PLUMA · Y EL TINTERO QUE LA ESPERA',
            en: 'QUILL · AND THE INKWELL THAT WAITS',
        },
        /*
         * SE GANA EN EL TABLERO DEGRADADO, que es el difícil. Es la antena que
         * lleva escuchando sin que conteste nadie — y las ondas que salen de ella
         * se pierden hacia arriba.
         */
        /*
         * ⚠ NO CONVENCÍA, y el motivo era que las ondas estaban SUELTAS.
         *
         * Flotaban arriba, en filas ordenadas, sin salir de ninguna parte. Un
         * plato mirando al frente con unas rayas encima no cuenta que esté
         * emitiendo: cuenta que hay rayas.
         *
         * Ahora el plato está DE PERFIL, abierto hacia arriba a la derecha, con
         * su brazo y su bocina — y las ondas salen justo de ahí, abriéndose. Es
         * lo que hace que se vea escuchando hacia algún lado en vez de posando.
         */
        /*
         * NACIÓ DE UN ACCIDENTE. Era un intento de antena de perfil y salió una
         * pluma con su tintero — mejor que lo que se buscaba, así que se quedó
         * como pluma y la antena se rehízo aparte.
         *
         * ⚠ SE DEJA COMO ESTÁ. Lo único que se le tocó fue CERRARLA ARRIBA: el
         * cálamo subía y se cortaba contra el borde, y una línea que se corta en
         * el filo se lee como un dibujo mal recortado, no como una punta.
         *
         * Hubo un intento de «arreglarla» cambiándole las barbas y quitándole
         * las marcas de la derecha. Estaba aprobada: rehacer lo aprobado no es
         * mejorar, es deshacer.
         */
        art: [
            '           "-.               ) ) )      ',
            '        .-"                ) ) )        ',
            '      .:                 ) ) )          ',
            '     /                 ) ) )            ',
            '    |         .-------o                 ',
            '    |      .-"                          ',
            '     \\  .-"                             ',
            '      ":"                               ',
            '       |                                ',
            '       |                                ',
            '    .--+--.                             ',
            '   /       \\                            ',
            '  "---------"                           ',
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
        id: 'shrub',
        source: 'written',
        caption: {
            es: 'ARBUSTO · CRECIÓ MIENTRAS USTED ESCRIBÍA',
            en: 'SHRUB · IT GREW WHILE YOU WROTE',
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
        /*
         * ⚠ NO CONVENCÍA porque los pétalos no se TOCABAN.
         *
         * Eran seis óvalos sueltos alrededor de un centro, separados por aire, y
         * eso no es una flor: es una constelación. Una flor tiene los pétalos
         * pegados unos a otros, saliendo todos del mismo sitio.
         *
         * Ahora se tocan y arrancan del centro, y la maceta es la de la
         * referencia: los corchetes de la boca y el cuerpo estrechándose hacia
         * abajo.
         */
        art: [
            '               .-.                      ',
            '           .-."   ".-.                  ',
            '          (           )                 ',
            '           "-.     .-"                  ',
            '        .-."   .-.   ".-.               ',
            '       (      ( Ø )      )              ',
            '        "-.    "-"    .-"               ',
            '           .-"     "-.                  ',
            '          (           )                 ',
            '           "-."   ".-"                  ',
            '               "|"                      ',
            '        [.......|.......]               ',
            '         \\             /                ',
            '          "-----------"                 ',
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
        id: 'telegraph',
        source: 'morse',
        caption: {
            es: 'MANIPULADOR · LO QUE HIZO ESAS RAYAS',
            en: 'TELEGRAPH KEY · WHAT MADE THOSE MARKS',
        },
        /*
         * SE GANA VIENDO EL MORSE, no descifrándolo. Ése es el momento en que la
         * app deja de parecer una libreta: hay una señal, no se entiende, y está
         * a la vista.
         *
         * Por eso el plato está RECIBIENDO y no emitiendo — las ondas entran
         * hacia él, no salen — y lo que baja por el cable son puntos y rayas. La
         * pieza no dice «hay una antena»: dice «acaba de llegar algo».
         */
        /*
         * ⚠ ACÁ HUBO UNA ANTENA Y NO ERA LO CORRECTO.
         *
         * Una antena RECIBE. Pero encontrar el morse del reloj no es que llegue
         * algo: es que hay un MENSAJE QUE NO SABÉS LEER. Son dos cosas distintas,
         * y la antena contaba la que no era.
         *
         * Un manipulador de telégrafo es el aparato que HACE las rayas. Lo que se
         * encontró en el reloj salió de algo así — y verlo es entender de golpe
         * qué clase de cosa estabas mirando.
         *
         * Se reconoce por tres piezas: la base pesada, el brazo con su pivote, y
         * la perilla arriba. Sin la perilla es un pisapapeles.
         */
        art: [
            '                 .---.                  ',
            '                (     )                 ',
            '                 "-+-"                  ',
            '                   |                    ',
            '       .-----------+-----------.        ',
            '      |                         |       ',
            '   ===+=========================+===    ',
            '      |            |||          |       ',
            '      "------------+++----------"       ',
            '          .-----------------.           ',
            '         |                   |          ',
            '         "-------------------"          ',
            '                                        ',
            '        - . -   . - .   - - .           ',
        ].join('\n'),
    },
    {
        id: 'tape',
        source: 'history',
        caption: {
            es: 'CINTA PERFORADA · TODO ESTÁ AHÍ, ILEGIBLE',
            en: 'PUNCHED TAPE · IT IS ALL THERE, UNREADABLE',
        },
        /*
         * SE GANA MIRANDO EL HISTORIAL, y es lo que ES un historial: el registro
         * completo de lo que pasó, guardado en una forma que el ojo no lee de un
         * vistazo.
         *
         * Se reconoce por la fila de agujeros CHICOS en medio —los del
         * arrastre— frente a los grandes de los datos. Sin esa fila es una hoja
         * con puntos; con ella, es cinta.
         */
        art: [
            ' +====================================+ ',
            ' | O   O O   O    O  O O   O   O O  O | ',
            ' |  O O   O    O O   O    O O   O   O | ',
            ' | O   O    O O   O   O O    O   O O  | ',
            ' | .................................. | ',
            ' | O O   O   O    O O   O    O   O  O | ',
            ' |   O    O O   O    O   O O   O O  O | ',
            ' | O  O O   O    O  O   O  O   O   O  | ',
            ' |  O   O    O O   O  O O    O O   O  | ',
            ' +====================================+ ',
        ].join('\n'),
    },
    {
        id: 'lighthouse',
        source: 'lockout',
        caption: {
            es: 'FARO · SIGUE AVISANDO A NADIE',
            en: 'LIGHTHOUSE · STILL WARNING NOBODY',
        },
        /*
         * SE GANA SALIENDO DEL BLOQUEO, el momento más oscuro de la app.
         *
         * Un faro sigue mandando su señal aunque no haya nadie mirando — que es
         * lo que esta máquina lleva haciendo desde antes de que llegaras. De
         * todas las piezas, la que mejor dice qué es este sitio cuando no estás.
         *
         * Los rayos salen de la LINTERNA y no de la punta del tejado: es de donde
         * sale la luz de verdad, y ponerlos arriba lo convertía en una antena.
         */
        art: [
            '                 .-.                    ',
            '                /   \\                   ',
            '     \\         |     |         /        ',
            '       \\      .+-----+.      /          ',
            '   - -   \\    |  ( )  |    /   - -      ',
            '           - -+-------+- -              ',
            '              |       |                 ',
            '              | :::::: |                ',
            '             .+-------+.                ',
            '            /           \\               ',
            '           "-------------"              ',
            '      ~~~~~~~~~~~~~~~~~~~~~~~~          ',
        ].join('\n'),
    },
    {
        id: 'smile',
        source: 'prank',
        caption: {
            es: 'CARITA · ERA BROMA, YA LE DIJE',
            en: 'SMILEY · IT WAS A JOKE, I TOLD YOU',
        },
        /*
         * SE GANA CON LA BROMA DEL BORRADO: dijiste que no, te enseñó el borrado
         * entero igual, y al final confesó.
         *
         * Es el único momento en que la máquina se ríe CON vos y no de vos, y la
         * única pieza que sale de un alivio. Por eso la sonrisa es ancha y los
         * ojos están cerrados — está riéndose, no observando. Un ojo abierto la
         * habría vuelto inquietante, que es el trabajo de otra pieza.
         */
        /*
         * ⚠ ES UN `:)` DE LADO, no una cara de frente.
         *
         * Una cara redonda con dos ojos y una boca es un emoticono de los de
         * después. Éste es el de ANTES: dos puntos y un paréntesis, que es lo que
         * se tecleaba cuando no había otra cosa — y encaja con una app que se
         * pasa el día escribiendo con caracteres.
         *
         * Los dos puntos van a la izquierda y el arco a la derecha, girado
         * noventa grados. Hay que inclinar la cabeza para verlo, que es
         * exactamente lo que había que hacer con los originales.
         *
         * ⚠ SON LOS DOS CARACTERES, GRANDES. No una cara con ojos y boca: el
         * `:` es un `:` y el `)` es un `)`, dibujados a tamaño de pieza. Un
         * primer intento puso ojos redondos con pupila y dejó de ser un
         * emoticono para ser una cara de perfil, que es otra cosa.
         *
         * ⚠ Y EL ARCO ABOMBA HACIA LA DERECHA. Un intento lo puso al revés
         * —extremos a la derecha, panza a la izquierda— y eso es un `(`: el
         * dibujo decía `:(`. La diferencia entre esta pieza y su contraria es
         * hacia qué lado se curva una línea, y no se ve hasta que alguien lo
         * lee como una cara.
         */
        art: [
            '                 :::                    ',
            '                    :::                 ',
            '     :::::             :::              ',
            '     :::::                :::           ',
            '     :::::                   ::         ',
            '                             ::         ',
            '                             ::         ',
            '                             ::         ',
            '     :::::                   ::         ',
            '     :::::                :::           ',
            '     :::::             :::              ',
            '                    :::                 ',
            '                 :::                    ',
        ].join('\n'),
    },
    {
        id: 'eye',
        source: 'idle',
        caption: {
            es: 'OJO · SIGUIÓ ABIERTO MIENTRAS USTED NO ESTABA',
            en: 'EYE · IT STAYED OPEN WHILE YOU WERE AWAY',
        },
        /*
         * SE GANA NO HACIENDO NADA: dejar la pestaña abierta un buen rato sin
         * escribir. Todas las demás premian hacer algo; ésta premia lo contrario,
         * y lo que cuenta es que la máquina siguió ahí mientras tanto.
         *
         * La pupila va CERRADA y llena —un punto sólido, no un anillo— porque un
         * ojo con el centro hueco parece una rosquilla. Y las pestañas de arriba
         * son lo único que impide que se lea como una almendra.
         */
        /*
         * ⚠ HECHO DE UNOS Y CEROS, y el ojo aparece por AUSENCIA.
         *
         * No está dibujado con líneas: es un campo de dígitos con un hueco
         * dentro, y el hueco tiene forma de ojo. Es lo mismo que hace la máquina
         * — no te mira con un ojo, te mira con lo que guarda de vos.
         *
         * La pupila es el único sitio donde los dígitos VUELVEN, y va llena: un
         * centro hueco se lee como una rosquilla. El contraste entre el campo
         * lleno, el blanco del iris y la pupila llena es lo único que hace que la
         * forma se vea.
         */
        art: [
            '1 0 1 1 0 1 0 1 1 0 1 0 1 1 0 1 0 1 1 0 ',
            '0 1 0 1 1 0 1 0 1 1 0 1 0 1 1 0 1 0 1 1 ',
            '1 0 1 0 1 1         0 1 1 0 1 0 1 1 0 1 ',
            '0 1 1 0 1                     1 0 1 0 1 ',
            '1 0 1 0         0 1 1 0         0 1 1 0 ',
            '0 1 1         1 0 1 1 0 1         1 0 1 ',
            '1 0 1         0 1 1 0 1 0         0 1 0 ',
            '0 1 1 0         1 0 0 1         1 0 1 1 ',
            '1 0 1 0 1                     0 1 0 1 0 ',
            '0 1 1 0 1 0 1       1 0 1 0 1 1 0 1 0 1 ',
            '1 0 1 0 1 1 0 1 0 1 1 0 1 0 1 1 0 1 0 1 ',
            '0 1 1 0 1 0 1 1 0 1 0 1 1 0 1 0 1 1 0 1 ',
        ].join('\n'),
    },
    {
        id: 'library',
        source: 'many-notes',
        caption: {
            es: 'BIBLIOTECA · TODO LO QUE USTED VOLVIÓ A ESCRIBIR',
            en: 'LIBRARY · EVERYTHING YOU CAME BACK TO WRITE',
        },
        /*
         * SE GANA JUNTANDO MUCHAS NOTAS, y es la hermana del arbusto: aquélla
         * premia haber escrito mucho de una vez, ésta haber VUELTO muchas veces.
         *
         * Dos baldas y no una: una fila de lomos es un estante, dos son una
         * biblioteca. Y los lomos tienen anchos distintos porque una fila de
         * libros iguales se lee como una reja.
         */
        /*
         * LOS LOMOS SON TODOS DISTINTOS, y eso es lo único que la hace leerse.
         *
         * Una fila de libros iguales es una reja. Acá cada uno lleva su marca —
         * rayas, ondas, dos puntos, comas— con anchos distintos, como una
         * estantería de verdad donde no hay dos libros del mismo grosor.
         *
         * Dos baldas y no una: una fila de lomos es un estante, dos son una
         * biblioteca.
         */
        art: [
            ' +====================================+ ',
            ' | |=| |~~| |:| |^^| |==| |o| |,,| |~|| ',
            ' | | |  ||  | | | ||  |  | | |  ||  ||| ',
            ' | |=| |~~| |:| |^^| |==| |o| |,,| |~|| ',
            ' | |_| |__| |_| |__| |__| |_| |__| |_|| ',
            ' +====================================+ ',
            ' | |~| |==| |,| |::| |^^| |=| |~~| |o|| ',
            ' | | |  ||  | | | ||  |  | | |  ||  ||| ',
            ' | |~| |==| |,| |::| |^^| |=| |~~| |o|| ',
            ' | |_| |__| |_| |__| |__| |_| |__| |_|| ',
            ' +====================================+ ',
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
        /*
         * ⚠ EL ANILLO SE VEÍA CHUECO, y el motivo era medio carácter.
         *
         * Cada fila estaba centrada en su propio eje: unas en la columna 10,5 y
         * otras en la 11. Medio carácter no se nota leyendo el código y en
         * pantalla convierte un círculo en un huevo torcido.
         *
         * Ahora TODAS son simétricas respecto a la columna 11, y para eso las
         * anchuras del anillo son impares: una forma de ancho par no puede
         * centrarse en una columna entera, y ahí nacía la torcedura.
         */
        art: [
            '        .-"""-.                         ',
            '      .:       :.                       ',
            '     /           \\                      ',
            '    |    ( * )    |=================+   ',
            '    |     :-:     |   |    |    |   |   ',
            '     \\           /    |    |    |   |   ',
            '      ":.     .:"     "    "    "   "   ',
            '        "-...-"                         ',
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
        localStorage.removeItem(OPEN_KEY);
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

/** Las que se han abierto, y de las que por tanto se conoce el pie. */
export function readOpened(): Set<string> {
    try {
        const raw = localStorage.getItem(OPEN_KEY);
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
 * Marca una pieza como abierta. Lo llama `//art_<n>`.
 *
 * Sólo si la tenés: abrir lo que no se ganó no significaría nada, y dejaría el
 * catálogo diciendo el nombre de algo que no está.
 */
export function markOpened(id: string) {
    if (!readFound().has(id)) return;

    const abiertas = readOpened();
    if (abiertas.has(id)) return;

    abiertas.add(id);

    try {
        localStorage.setItem(OPEN_KEY, JSON.stringify([...abiertas]));
    } catch {
        // Sin sitio, el pie se vuelve a esconder al recargar. Molesto, no grave.
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
    /** Si además se abrió con `//art_<n>`, que es cuando se conoce el pie. */
    opened: boolean;
    /** El nombre, sólo si la abriste. Vacío si no. */
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

    const abiertas = readOpened();

    return ART.map((piece, i) => {
        const tengo = found.has(piece.id);
        const abierta = tengo && abiertas.has(piece.id);
        const nombre = piece.caption[lang];

        return {
            number: i + 1,
            found: tengo,
            opened: abierta,
            // El pie sólo llega al abrirla: tenerla no es saber qué es.
            label: abierta ? nombre : '',
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
