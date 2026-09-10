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
import { didV02RoundTrip } from '@/lib/system/v02';
import { hintEarned, bragEarned, clearHints } from '@/lib/system/artHints';
import { damageArt } from '@/lib/system/artCorruption';
import { eyeIsBarred } from '@/lib/system/entity';

type Localized = Readonly<Record<Lang, string>>;

const STORAGE_KEY = 'flashnotes:art';

/**
 * Lo que va en el sitio del pie mientras el pie no se ha ganado.
 *
 * Dejarlo VACÍO sería peor: parecería que a la pieza no le pusieron nombre.
 * Así se ve que hay uno y que todavía no es tuyo, que es la diferencia entre
 * un descuido y una puerta.
 *
 * ⚠ ESTABA SIN TRADUCIR, y se colaba una palabra española en la interfaz en
 * inglés — el mismo descuido que tenía el nombre del resto de la papelera.
 */
export const UNNAMED: Localized = {
    es: '[ SIN IDENTIFICAR ]',
    en: '[ UNIDENTIFIED ]',
};

/**
 * Y lo que va mientras la pieza no se ha ABIERTO con `//art_<n>`.
 *
 * No es lo mismo que `UNNAMED` y no puede decir lo mismo: aquél es una pieza
 * cuyo nombre hay que ganarse aparte, y éste una que sólo hay que ir a ver.
 * Confundirlos convertiría un trámite en un acertijo.
 */
export const UNOPENED: Localized = {
    es: '[ SIN ABRIR ]',
    en: '[ UNOPENED ]',
};

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
    /**
     * HABLAR CON LO QUE HAY DETRÁS DE `//hi`.
     *
     * Su pieza es el OJO: lo que todo lo ve. Es lo único de la app que sabe
     * cuánto llevás acá, porque nunca se fue.
     *
     * ⚠ UN HUECO, DOS DIBUJOS. Se gana al final del arco, y cuál te toca depende
     * de lo que elegiste: ayudarlo deja el ojo, reportarlo deja el ojo TAPADO.
     * No son dos piezas — con dos, la colección pasaría a diecisiete y nunca se
     * podría completar. Ver `artOf` y `entityEnding.ts`.
     *
     * Cablearla es lo que por fin hace alcanzable el CUADERNO (`everything`),
     * que exige todas las demás y llevaba sin poder conseguirse desde el
     * rediseño de la colección.
     */
    | 'entity'
    /**
     * VACIAR LA v0.2: entrar y encontrar los comandos que sólo existen ahí.
     *
     * ⚠ NO ES «ENTRAR». Cruzar la puerta ya tiene premio —de ella cuelga el
     * manipulador— y dar además una pieza por cruzarla convertía el sitio en
     * un pasillo: se entraba, se cobraba y se salía sin mirar nada.
     * Son pocos comandos, así que es un remate y no una condena.
     */
    | 'v02'
    /**
     * HABER VISTO CAERSE EL SISTEMA.
     *
     * Su pieza es la POLILLA, y no hay ninguna que encaje mejor: la primera
     * avería informática documentada fue un bicho dentro de un relé, en 1947,
     * y de ahí viene la palabra «bug». Acabás de ver uno, y acá está.
     *
     * ⚠ SE DA AL ENTRAR, NO AL SALIR. Salir tiene su propio premio —la llave,
     * para quien resuelve el puzzle— y son dos logros distintos: caer ahí
     * dentro le pasa a cualquiera, salir por la puerta buena no.
     */
    | 'blackout'
    /**
     * HABER LLENADO UNA NOTA HASTA EL TOPE (`LIMITS.CONTENT_MAX`).
     *
     * Su pieza es la pluma con su tintero: escribir hasta que no cabe más. Es
     * la hermana de la sesión larga — aquélla premia el rato, ésta el volumen
     * de una sola sentada.
     */
    | 'full-note'
    /** Marcador del pong, tablero limpio. */
    | 'pong'
    /**
     * HABER ROTO EL TEMA A FUERZA DE CLICS: el fallo cromático.
     *
     * Su pieza queda a medio camino entre encendida y apagada, como el tema
     * cuando se parte. ⚠ ANTES ERA EL MARCADOR DEL PONG DEGRADADO, que se
     * quedó sin pieza al mudarse la terminal: el juego cabe entero en una,
     * y dos marcadores para el mismo juego eran una pieza contada dos veces.
     */
    | 'theme-glitch'
    /**
     * HABER ENCONTRADO TODOS LOS COMANDOS ESCONDIDOS.
     *
     * Todos: los de la v1.0 y los que sólo existen en la v0.2. Su pieza es la
     * TERMINAL, y no por adorno — cuando ya no queda ningún comando por
     * descubrir, la máquina no tiene nada más que decirte. De ahí «sin señal
     * desde entonces».
     */
    | 'all-commands'
    /**
     * RESOLVER EL PUZZLE DEL FALLO TOTAL.
     *
     * El bloqueo se levanta de dos maneras: resolviendo el puzzle o esperando
     * a que venza. Sólo la primera cuenta — esperar no es resolver, y una
     * llave que se gana esperando no abre nada.
     *
     * Su pieza es la LLAVE, y su pie ya lo decía antes de tener camino: «la
     * cerradura ya no existe». Encontrás la salida de algo que, en cuanto
     * sale, deja de estar.
     */
    | 'blackout-puzzle'
    /**
     * TODO: TODOS LOS SECRETOS Y TODAS LAS DEMÁS PIEZAS.
     *
     * La última de verdad, y la única que no se puede tener a medias. No basta
     * el contador de secretos: hay que haber recuperado además las otras
     * quince, así que es literalmente la pieza que cierra la caja.
     *
     * Por eso es el cuaderno firmado: el único sitio del proyecto donde aparece
     * un nombre propio, y sólo lo ve quien llegó al final.
     */
    | 'everything'
    /**
     * HABER ESTADO MEDIA HORA SEGUIDA CON LA PESTAÑA ABIERTA.
     *
     * Todas las demás premian hurgar. Ésta premia haber USADO la app para lo
     * que es — y por eso es la única que puede encontrar alguien que nunca haya
     * tecleado un comando. Su pieza es un arbusto: creció mientras estabas.
     */
    | 'long-session'
    /**
     * HABER SACADO EL MORSE DEL RELOJ.
     *
     * No descifrarlo: sólo verlo. Es el momento exacto en que la app deja de
     * parecer una libreta — hay una señal, no se entiende, y está ahí a la vista.
     *
     * ⚠ SU PIEZA LLEGA SIN NOMBRE, y es la única así. El dibujo —un
     * manipulador de telégrafo— ES LA PISTA: verlo es entender de golpe qué
     * clase de cosa parpadea en la hora. El nombre se gana aparte, usando el
     * código para entrar en la v0.2 y para salir. Ver `NameGate`.
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
     * HABER SEGUIDO LA PISTA: teclear algo que no existe y hacerle caso a
     * `//help`.
     *
     * Su pieza es el FARO, y es la única que premia haber estado PERDIDO. La
     * máquina no te dejó a oscuras: te señaló dónde mirar, y viniste. La luz
     * llevaba encendida desde el principio.
     *
     * ⚠ NO BASTA CON TECLEAR `//help`. Es el comando más obvio de la app: darla
     * por eso sería regalarla en el primer minuto y a todo el mundo. Hace falta
     * que la pista haya llegado ANTES.
     *
     * ⚠ ANTES ERA «pasar por el bloqueo y salir». El bloqueo se repartió en dos
     * —entrar da la polilla, resolver el puzzle da la llave— y un tercer premio
     * por el mismo sitio era el mismo logro cobrado tres veces.
     */
    | 'guidance'
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
     * EN PAUSA · LA CINTA ESTÁ RESERVADA.
     *
     * ⚠ SIN CABLEAR A PROPÓSITO. Este hueco pasó por tres dueños —el ojo, la
     * polilla, la cinta— y cada mudanza dejó un pie contando algo que ya no
     * pasaba. Se queda quieta hasta que su camino esté decidido, que es más
     * barato que volver a mudarla.
     */
    | 'reserved-tape'
    /**
     * HABER JUNTADO MUCHAS NOTAS.
     *
     * Su pieza es una biblioteca. Es la hermana del arbusto: aquélla premia
     * haber escrito mucho de una vez, ésta haber vuelto muchas veces.
     */
    | 'many-notes';

/**
 * Un CUARTO estado, y sólo para quien lo declare.
 *
 * Casi todas las piezas se ganan por hacer algo y su nombre llega al abrirlas.
 * Pero hay una que se gana ANTES de entender lo que se encontró: el manipulador
 * cae por VER el morse del reloj, no por descifrarlo. Ahí la pieza ya es tuya y
 * el dibujo se puede sacar — y el dibujo ES LA PISTA: ves un aparato de
 * telégrafo y entendés de golpe qué era eso que parpadea en la hora.
 *
 * Si el nombre viniera con la pieza, la pista llegaría ya resuelta. Así que el
 * nombre se queda revuelto hasta que usás el código para las dos cosas.
 *
 * ⚠ NO ES UNA REGLA GENERAL. Ponerle esta puerta a las dieciséis convertiría la
 * colección en dos colecciones —una de dibujos y otra de nombres— y obligaría a
 * inventar un segundo logro para cada pieza, incluidas las que no esconden
 * ningún acertijo. Es una excepción declarada, no un modo.
 */
export type NameGate =
    /** Haber usado el código para ENTRAR en la v0.2 y para SALIR de ella. */
    'v02-round-trip';

export interface ArtPiece {
    id: string;
    /** El pie: qué es esto. */
    caption: Localized;
    /** Cómo se gana. Uno por pieza, y ninguno repetido. */
    source: ArtSource;
    /** Qué hace falta ADEMÁS para leer el pie. Casi ninguna lo tiene. */
    nameNeeds?: NameGate;
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
        source: 'blackout',
        // La primera avería informática documentada fue una polilla dentro de un
        // relé, en 1947. De ahí viene «bug». Es la pieza que mejor explica por
        // qué esta app habla todo el rato de fallos.
        caption: {
            es: 'POLILLA · ASÍ EMPEZÓ LA PALABRA «BUG»',
            en: 'MOTH · THIS IS WHERE THE WORD BUG BEGAN',
        },
        /*
         * ⚠ EL CUERPO ES UNA COLUMNA QUE ATRAVIESA EL DIBUJO ENTERO.
         *
         * La versión anterior tenía un `||` de dos columnas entre las alas, y eso
         * no es un cuerpo: es un palo entre dos manchas. Sin nada que las sostenga,
         * las alas se leen como dos borrones simétricos y no como un bicho.
         *
         * Acá el cuerpo va de la cabeza a la cola con textura propia, y las alas
         * SE APOYAN en él. Ése es todo el arreglo; el resto viene detrás.
         *
         * ⚠ CUATRO ALAS, NO DOS. Anteriores anchas arriba, posteriores más chicas
         * abajo, cada par con su contorno cerrado y sus nervaduras. Es lo que da
         * volumen sin dibujar una sombra, y lo que distingue una polilla de una
         * mancha con simetría.
         *
         * ⚠ Y EL ABDOMEN SE ESTRECHA EN ESCALONES hasta la punta. Antes acababa en
         * un `""` plano, que es donde se nota que el dibujo se quedó sin ideas.
         *
         * ⚠ SIN MARCO, a diferencia de casi todas las demás. El `+====+` con sus
         * bandas se comía CUATRO de las catorce filas, y con eso la polilla no
         * cabía: hay que elegir entre el marco y el bicho.
         *
         * ⚠ GENERADO POR ESPEJO. El eje de una fila de 40 cae ENTRE la 19 y la 20,
         * así que todo motivo centrado tiene que ser de ancho PAR: el cuerpo mide
         * 8 columnas y no 9, y la cola es `\\/` y no un carácter suelto. Un motivo
         * impar en el eje queda medio carácter corrido, y medio carácter repetido
         * en doce filas es un bicho chueco. Ya pasó dos veces.
         *
         * ⚠ Y LAS ANTENAS SE ABREN HACIA ARRIBA. La referencia las tenía
         * cerrándose, y así no salen de la cabeza: caen sobre ella.
         */
        art: [
            '             \\            /             ',
            '                \\ (oo) /                ',
            '                (%%%%%%)                ',
            '  _____________(%%%%%%%%)_____________  ',
            ' (    /   /    )%%%%%%%%(    \\   \\    ) ',
            ' (___/___/___/            \\___\\___\\___) ',
            '    (    /    /(%%%%%%%%)\\    \\    )    ',
            '    (__/___/   (%%%%%%%%)   \\___\\__)    ',
            '             /  (%%%%%%)  \\             ',
            '           /     (%%%%)     \\           ',
            '                 (%%%%)                 ',
            '                   \\/                   ',
        ].join('\n'),
    },
    {
        id: 'floppy',
        source: 'v02',
        caption: { es: 'DISQUETE · 1,44 MB QUE NADIE MIGRÓ', en: 'FLOPPY DISK · 1.44 MB NOBODY EVER MIGRATED' },
        /*
         * SE GANA ENTRANDO EN LA v0.2, y por eso es un disquete: el soporte donde
         * esa versión guardaba lo suyo, y que nadie migró. La etiqueta lleva su
         * número de versión escrito a mano, como se escribían.
         */
        /*
         * ⚠ EL DIBUJO NO SE CONTORNEA: SE TEXTURA.
         *
         * Las versiones anteriores lo trazaban a punta de `+` y `-`, como un
         * plano. Pero un disquete no se reconoce por su CONTORNO —es un
         * cuadrado— sino por su SUPERFICIE: la etiqueta de papel con
         * renglones, la chapa, el canto biselado del plástico. Acá el volumen
         * lo hacen el fondo de `;`, los renglones de puntos y la banda de `"`;
         * las líneas casi no dibujan nada.
         *
         * ⚠ LA ETIQUETA VA ARRIBA Y OCUPA MÁS DE LA MITAD.
         *
         * Es la parte grande del objeto y la que uno mira. Una versión la puso
         * chiquita abajo con el obturador mandando, y quedó una cajita
         * cualquiera: podía ser una radio o una casetera.
         *
         * ⚠ LOS `[]` DE ARRIBA Y LOS BISELES `//||` DE ABAJO SON LA ESCALA.
         *
         * Los dos tornillos y las esquinas achaflanadas son lo que dice
         * «carcasa de plástico de nueve centímetros». Sin ellos el mismo marco
         * podría ser una ventana, un cuadro o una caja.
         *
         * ⚠ COLOCADO POR COLUMNAS, no a ojo. Una versión tenía la etiqueta, el
         * obturador y la ventana cada uno empezando donde caía, y las piezas no
         * alineaban entre sí: se veía desfasado sin que se supiera decir dónde.
         *
         * El `v 0 . 2` escrito sobre el segundo renglón es lo único que no sale
         * del objeto: es lo que ata la pieza a la versión de la que se ganó.
         */
        art: [
            ' ,\'\'",----------------------------,"\'\', ',
            ' ; [] ; . . . . . . . . . . . .  ; [] ; ',
            ' ;    ; . . . . . . . . . . . .  ;    ; ',
            ' ;    ; v 0 . 2                  ;    ; ',
            ' ;    ; . . . . . . . . . . . .  ;    ; ',
            ' ;    \'.                        .\'    ; ',
            ' ;     """"""""""""""""""""""""""     ; ',
            ' ;                                    ; ',
            ' ;     ,-----------------.------.     ; ',
            ' ;     ;  ,""""""",      ;      ;     ; ',
            ' ;     ;  ;       ;      ;      ;     ; ',
            ' ; //||;  ;       ;      ;      ;||\\\\ ; ',
            ' ; \\\\||;  \'_______\'      ;      ;||// ; ',
            ' \'.__________________________________.\' ',
        ].join('\n'),
    },
    {
        id: 'crt',
        source: 'all-commands',
        caption: {
            es: 'TERMINAL · YA NO LE QUEDA NADA QUE DECIR',
            en: 'TERMINAL · NOTHING LEFT TO TELL YOU',
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
        source: 'reserved-tape',
        caption: { es: 'CINTA · SIGUIÓ GIRANDO SOLA', en: 'TAPE · IT KEPT ROLLING ON ITS OWN' },
        /*
         * ⚠ LA ESCOTADURA DE ABAJO ES LA SILUETA.
         *
         * Ninguna otra cosa tiene esa muesca con los dos agujeros del
         * cabrestante. Es lo primero que hay que acertar: la versión anterior
         * acababa en una fila de `.--.` que no era nada, y sin la muesca un casete
         * es una caja con dos discos.
         *
         * ⚠ LOS CARRETES VAN PEGADOS A LA VENTANA, sin hueco: `\\|\\` a la
         * izquierda y `|/` a la derecha. Con dos espacios de por medio dejan de ser
         * un mecanismo y pasan a ser tres objetos sueltos dentro de una caja.
         *
         * ⚠ ONCE FILAS, Y LAS FILAS VACÍAS SON EL ENEMIGO.
         *
         * Costó cuatro intentos y el fallo nunca estuvo en el dibujo: estuvo en el
         * AIRE. Con la caja a 40 columnas hay sitio para dejar huecos, y cada
         * hueco vacío estira el casete sin añadirle nada — tres filas en blanco
         * entre los carretes y la muesca lo convertían en una caja alta con un
         * mecanismo pequeño flotando arriba.
         *
         * Ahora el `A` es la ÚNICA fila entre los pozos de los carretes y la
         * muesca, y el casete vuelve a ser ancho y plano, que es lo que es.
         *
         * ⚠ LA MUESCA OCUPA EL 74 % del ancho interior y los agujeros del
         * cabrestante caen al 24 % y al 76 %, medido contra la referencia. Estuvo
         * al 58 % con los agujeros al 13 % y al 83 %, casi pegados a los bordes: el
         * resto del casete creció a 40 columnas y la muesca se quedó donde estaba.
         *
         * Ésas son las dos cosas que se ven antes de poder explicarse, y por eso
         * se miden contra la referencia y no a ojo.
         *
         * La cinta va PUNTEADA y en diagonal, no maciza: así se ve pasar de un
         * carrete al otro. Y el rayado `\\\\///` del molde y el `3 min` son lo que
         * hace que parezca fabricado y no dibujado.
         */
        art: [
            '.--------------------------------------.',
            '|\\\\////////////                 3 min  |',
            '| \\/                                   |',
            '|      ______  __________  ______      |',
            '|     /      \\|\\ ....... |/      \\     |',
            '|     (      )| ........ |(      )     |',
            '|     \\______/|/       . |\\______/     |',
            '|      ______  __________  ______      |',
            '| A                                    |',
            '|     ____________________________     |',
            '|____/_.____o______________o____._\\____|',
        ].join('\n'),
    },
    {
        id: 'cursor',
        source: 'pong',
        caption: {
            es: 'JUEGO · SE TE DA BIEN. ¿CUÁNTAS VECES LO INTENTASTE?',
            en: 'GAME · YOU ARE GOOD. HOW MANY TRIES THOUGH?',
        },
        /*
         * SE GANA CON EL PONG, así que el dibujo es LA PISTA: las dos palas, la
         * red partiendo el campo por el eje, el marcador en marcha y la bola con
         * su ESTELA — que es lo único que le da dirección a un dibujo quieto.
         * Sin los dos puntos detrás, la bola era un punto suelto en medio de la
         * nada y podía ser cualquier cosa.
         *
         * Y abajo lleva el nombre del proceso, `VSYNC-TEST`, que es como se
         * llama el pong escondido en `//ps`. Eso ata la pieza al sitio del que
         * salió: quien la mira después de haberla ganado reconoce de dónde viene.
         */
        art: [
            '+======================================+',
            '|  0 3                          0 2    |',
            '|  ===                          ===    |',
            '|                  :                   |',
            '|  ||              :              ||   |',
            '|  ||              :              ||   |',
            '|  ||              :         o    ||   |',
            '|  ||              :              ||   |',
            '|  ||              :              ||   |',
            '|                  :                   |',
            '| :::::::::::::::::::::::::::::::::::: |',
            '| > _                     VSYNC-TEST   |',
            '+======================================+',
        ].join('\n'),
    },
    {
        id: 'quill',
        source: 'full-note',
        caption: {
            es: 'PLUMA · SE ACABÓ LA HOJA, NO LA TINTA',
            en: 'QUILL · THE PAGE RAN OUT, THE INK DID NOT',
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
         * La punta es LA QUE PROPUSISTE, tal cual: la barba se abre en abanico
         * arriba en vez de cerrarse en un arco liso. Mi versión cerraba, pero
         * cerraba como cierra un tubo — ésta cierra como cierra una pluma, con
         * las barbas separándose. Es la diferencia entre tapar un hueco y
         * dibujar el remate.
         *
         * Hubo un intento de «arreglarla» cambiándole las barbas y quitándole
         * las marcas de la derecha. Estaba aprobada: rehacer lo aprobado no es
         * mejorar, es deshacer.
         */
        art: [
            '                   .-"-.-¨"--".         ',
            '            .-"._.-"        ) ) )       ',
            '        .-"                ) ) )        ',
            '      .:      .-"        ) ) )          ',
            '     /   .-            ) ) )            ',
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
        source: 'theme-glitch',
        caption: {
            es: 'FOCO · NI ENCENDIDO NI APAGADO',
            en: 'BULB · NEITHER ON NOR OFF',
        },
        /*
         * SE GANA ROMPIENDO EL TEMA a fuerza de clics: el fallo cromático.
         *
         * ⚠ LA COSTURA ES EL DIBUJO.
         *
         * La misma bombilla, mitad sobre fondo claro y mitad sobre fondo oscuro,
         * con el corte exacto en el eje. No es una bombilla con relleno raro: es
         * la interfaz PILLADA A MEDIO CAMBIAR DE TEMA, que es literalmente cómo
         * se gana la pieza. El pie lo remata — ni encendida ni apagada.
         *
         * El relleno arranca fila por fila justo donde acaba la silueta (`BORDE`),
         * no en una columna fija: si fuera recto, la bombilla quedaría ENCIMA de
         * una mancha en vez de partida por ella.
         *
         * ⚠ EL MARCO NO ES ADORNO. Sin él, el relleno oscuro se desangra hasta el
         * borde de las cuarenta columnas y deja de leerse como el fondo de la
         * pieza para leerse como una mancha en la pantalla.
         *
         * ⚠ Y EL FILAMENTO VA COSIDO AL CASQUILLO. Una versión lo dejaba en dos
         * trazos sueltos flotando dentro del vidrio, y con eso el vidrio y el
         * casquillo eran dos piezas apiladas. Los dos soportes que bajan hasta el
         * cuello son lo que las convierte en un solo objeto.
         */
        art: [
            '   .--------------------------------.   ',
            '   |            .-""""-.::::::::::::|   ',
            '   |          .-"      "-.::::::::::|   ',
            '   |         (            ):::::::::|   ',
            '   |         (   \\/\\/\\/   ):::::::::|   ',
            '   |         (    |  |    ):::::::::|   ',
            '   |          "-. |  | .-"::::::::::|   ',
            '   |            "-.  .-"::::::::::::|   ',
            '   |            |::::::|::::::::::::|   ',
            '   |            |======|::::::::::::|   ',
            '   |            |------|::::::::::::|   ',
            '   |            |======|::::::::::::|   ',
            '   |             "----":::::::::::::|   ',
            '   \'--------------------------------\'   ',
        ].join('\n'),
    },
    {
        id: 'shrub',
        source: 'long-session',
        caption: {
            es: 'ARBUSTO · MIRE, CRECIÓ UN ARBUSTO',
            en: 'SHRUB · LOOK, A SHRUB GREW HERE',
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
         * ⚠ SON TRES MATAS ENCADENADAS EN VERTICAL, no una masa sola.
         *
         * Ésa es la forma, y la cintura entre mata y mata es lo que la hace un
         * ARBUSTO y no un seto. Una versión lo refundió en un único bulto
         * ovalado y, por limpio que quedara, pasó a ser un TOPIARIO: una planta
         * recortada, que es justo lo contrario de lo que cuenta la pieza. Las
         * matas crecen hacia abajo (14, 20 y 22 columnas); al revés se cae.
         *
         * ⚠ Y VAN RELLENAS. Antes eran `(           )` — huecas, y de lejos tres
         * aros. Sin peso dentro la cintura no se nota, porque no hay nada que se
         * estreche.
         *
         * ⚠ GENERADO POR ESPEJO, y el eje de una fila de 40 cae ENTRE la 19 y la
         * 20. La versión anterior se dibujaba a mano y ocupaba de la 7 a la 27:
         * todas las filas tiraban a la izquierda A LA VEZ, que es el desfase más
         * difícil de ver y el que peor sienta.
         *
         * ⚠ NADA DE `.` EN LA COLUMNA 19. Al espejarlo sale `..` en mitad del
         * dibujo, y eso pinta una raya vertical fantasma que cruza la pieza
         * entera. El generador lo comprueba en vez de confiarlo al ojo.
         *
         * La maceta tiene el BORDE VOLADO sobre el cuerpo y las paredes se
         * cierran hacia abajo. `[.......|.......]` era una caja con puntos: una
         * maceta se reconoce por el labio, igual que un faro por las franjas.
         */
        art: [
            '             \'  .-""""-.  \'             ',
            '              .-":.::.:"-.              ',
            '             (:.::::::::.:)             ',
            '               "-.::::.-"               ',
            '           .-":.::::::::.:"-.           ',
            '          (:.::::.::::.::::.:)          ',
            '             "-.::.::.::.-"             ',
            '         (:.::::.::::::.::::.:)         ',
            '             "-.::.::.::.-"             ',
            '                   ||                   ',
            '          .------------------.          ',
            '           |:.::.::::::.::.:|           ',
            '            "-.__________.-"            ',
            '              "----------"              ',
        ].join('\n'),
    },
    {
        id: 'shelf',
        source: 'everything',
        caption: {
            es: 'CUADERNO · JUANJO0775 ESTUVO AQUÍ',
            en: 'NOTEBOOK · JUANJO0775 WAS HERE',
        },
        /*
         * LA ÚLTIMA, y la única que no se puede tener a medias: sale cuando el
         * contador del panel llega a su propio total.
         *
         * Un cuaderno ABIERTO, con las dos hojas y el pliegue en medio. El canto
         * superior lo pusiste vos: sin él las hojas empezaban en el aire, y una
         * hoja tiene borde arriba aunque esté abierta. Todas las
         * demás piezas son cosas que la máquina guardaba de antes; ésta es la
         * única que habla de FUERA de la máquina — y por eso cierra la colección.
         *
         * No dice «el que escribió esto» sino ESTUVO AQUÍ, que es lo que se
         * escribe en un margen. La diferencia importa: lo primero es una firma de
         * autor, lo segundo es alguien que pasó por un sitio y lo apuntó — que es
         * de lo que va esta app entera.
         */
        art: [
            '     ______________   ______________    ',
            ' .-/|              \\ /              |\\-.',
            ' |||                |                |||',
            ' |||     ~~*~~~     |                |||',
            ' |||                |     estuvo     |||',
            ' |||  -JuanJo0775   |                |||',
            ' |||                |      aqui      |||',
            ' |||                |                |||',
            ' ||/===============\\|/===============\\||',
            '  `-  ------------  ^  ^ -----------  -\'',
        ].join('\n'),
    },
    {
        id: 'telegraph',
        source: 'morse',
        // El dibujo se gana con VER el morse; el nombre, con usar el código
        // para entrar y salir. Es la única pieza donde el dibujo es la PISTA
        // de algo que todavía no resolviste, y por eso la única con puerta.
        nameNeeds: 'v02-round-trip',
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
         * y la antena contaba la que no era. Un manipulador es el aparato que
         * HACE las rayas — verlo es entender de golpe qué clase de cosa estabas
         * mirando.
         *
         * ⚠ Y LO QUE LO HACE RECONOCIBLE ES QUE SEA UNA PALANCA.
         *
         * La versión anterior tenía el brazo RECTO sobre dos postes iguales, y
         * eso no es un manipulador: es una mesa. Tres arreglos, y ninguno es
         * decorativo:
         *
         *   · EL BRAZO VA ESCALONADO. En reposo la perilla está ARRIBA y la cola
         *     ABAJO. Ese escalón de una sola fila es lo único que convierte una
         *     barra en una palanca.
         *
         *   · EL FULCRO Y EL CONTACTO NO SON IGUALES. Antes eran dos postes
         *     idénticos, así que ninguno se leía como nada. Ahora el fulcro es un
         *     `/\\` bajo la junta, y el contacto son dos puntas enfrentadas —`v`
         *     colgando del brazo, `^` clavado en la base— CON AIRE EN MEDIO. Ese
         *     hueco es la llave abierta: es literalmente lo que se cierra al
         *     pulsar.
         *
         *   · LA BASE ES MÁS ANCHA QUE EL APARATO que sostiene. La de antes era
         *     más estrecha, y una base más estrecha que su carga no pesa.
         *
         * ⚠ LAS RAYAS DE ABAJO NO DELETREAN LA PALABRA DEL RELOJ, y eso es
         * deliberado. Esta pieza se gana por VER la señal, no por descifrarla; si
         * el dibujo llevara la respuesta se la estaría regalando a quien todavía
         * no la sacó.
         */
        art: [
            '          .-----.                       ',
            '         (:::::::)                      ',
            '          "--+--"                       ',
            '             |                          ',
            '     .----------------.                 ',
            '     |::::::::::::::::+-------------.   ',
            '     "----------------+:::::::::::::|   ',
            '             v        "-------------"   ',
            '                     /\\                 ',
            '   .---------^--------+-------------.   ',
            '   |  o                          o  |   ',
            '   "--------------------------------"   ',
            '                                        ',
            '         - . -   . - .   - - .          ',
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
        source: 'guidance',
        caption: {
            es: 'FARO · LA LUZ ESTABA AHÍ DESDE EL PRINCIPIO',
            en: 'LIGHTHOUSE · THE LIGHT WAS ON ALL ALONG',
        },
        /*
         * SE GANA SALIENDO DEL BLOQUEO, el momento más oscuro de la app.
         *
         * Un faro sigue mandando su señal aunque no haya nadie mirando — que es
         * lo que esta máquina lleva haciendo desde antes de que llegaras. De
         * todas las piezas, la que mejor dice qué es este sitio cuando no estás.
         */
        /*
         * ⚠ GENERADO POR ESPEJO: se dibuja la mitad izquierda y la derecha sale
         * de darle la vuelta cambiando `/` por `\\` y `(` por `)`.
         *
         * La versión anterior se dibujaba a mano entera y tenía la pared derecha
         * DESFASADA UNA COLUMNA en la fila del `::::::` — un espacio de más que
         * no se veía leyendo el código y sí en pantalla. Espejando, ese fallo no
         * se puede cometer. El eje de una fila de 40 cae ENTRE la 19 y la 20, así
         * que todo motivo centrado tiene que ser de ancho PAR.
         *
         * ⚠ LA TORRE LLEVA BANDAS ALTERNAS y se ensancha dos columnas por fila.
         *
         * Antes eran cuatro filas rectas, y una torre recta y lisa es un tubo.
         * Un faro se reconoce de lejos por dos cosas: que es CÓNICO y que está
         * PINTADO A FRANJAS. Sin eso hay que explicar qué es.
         *
         * ⚠ LOS RAYOS SALEN DE LA LINTERNA Y SÓLO HACIA ARRIBA.
         *
         * Ponerlos en la punta del tejado lo convertía en una antena. Y los de
         * abajo se quitaron porque chocaban con la galería: es que la balconada
         * TAPA la luz hacia abajo, así que además de estorbar eran mentira. La
         * diagonal avanza dos columnas por fila, que es la proporción real del
         * carácter; a una por fila se leería casi vertical.
         *
         * ⚠ EL MAR ES LO ÚNICO QUE NO SE ESPEJA. Agua simétrica se ve falsa, y
         * además cruza las 40 columnas: la versión anterior lo dejaba de la 6 a
         * la 27 bajo una torre centrada, y el dibujo entero parecía torcido.
         */
        art: [
            '      \\          .-""-.          /      ',
            '        \\      .+------+.      /        ',
            '          \\    |::::::::|    /          ',
            '       - - -   |::(##)::|   - - -       ',
            '            .+------------+.            ',
            '            "\\____________/"            ',
            '               |::::::::|               ',
            '              /          \\              ',
            '             /::::::::::::\\             ',
            '            /    .----.    \\            ',
            '           /:::::|    |:::::\\           ',
            '         .::::::::::::::::::::.         ',
            '~-~--~---~-~--~-~----~--~-~---~-~--~~-~-',
            '~~-~~---~~-~~~--~~-~~~-~~--~-~~~--~~-~~-',
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
            '                 ::::                   ',
            '                    ::::                ',
            '                       ::::             ',
            '     :::::                ::::          ',
            '                             ::         ',
            '                             ::         ',
            '                             ::         ',
            '                             ::         ',
            '                             ::         ',
            '     :::::                ::::          ',
            '                       ::::             ',
            '                    ::::                ',
            '                 ::::                   ',
        ].join('\n'),
    },
    {
        id: 'eye',
        source: 'entity',
        caption: {
            es: 'OJO · TE ESTOY VIENDO',
            en: 'EYE · I AM WATCHING YOU',
        },
        /*
         * SE GANA NO HACIENDO NADA: dejar la pestaña abierta un buen rato sin
         * escribir. Todas las demás premian hacer algo; ésta premia lo contrario,
         * y lo que cuenta es que la máquina siguió ahí mientras tanto.
         */
        /*
         * ⚠ ESTÁ DIBUJADO CON UNA RAMPA DE TONOS, no con unos y ceros.
         *
         * Los caracteres van de vacío a macizo —` .,:;clodxkO0KXNWM`— y cada
         * celda lleva el que pese lo que pesa la luz en ese punto. Es lo que
         * hace la referencia del cliente, y es lo que le da modelado: un campo
         * binario sólo sabe decir «hay» o «no hay», y con eso un ojo es una
         * silueta. Con la rampa hay párpado, iris, pupila y brillo.
         *
         * ⚠ Y NO SON CONTORNOS: SON CUÑAS DE TONO. El párpado de arriba no es
         * una raya maciza, es un bloque que va de claro en el canto superior a
         * macizo en la línea de pestañas — cuatro o cinco pasos de la rampa. Lo
         * mismo abajo, más corto. Dibujado como un arco fino el ojo se lee como
         * un esquema; dibujado como cuña se lee como una superficie con luz.
         *
         * ⚠ Y EL INTERIOR VA NEGRO, salvo dos grumos. Lo que se dibuja son los
         * párpados y el IRIS; la esclerótica es vacío — rellenar el ojo entero
         * da una mancha clara con forma de ojo, y una mancha no mira. Pero
         * negro liso tampoco: entre el iris y las puntas hay dos grumos de tono
         * medio, los rincones del ojo. Sin ellos la pieza se lee como dos arcos
         * y un borrón.
         *
         * ⚠ Y EL IRIS NO PUEDE TOCAR LA LÍNEA DE PESTAÑAS. Pegados, los dos
         * macizos se funden en una sola mancha y el ojo deja de estar abierto.
         * Hace falta una fila de aire entre ellos.
         *
         * ⚠ LA BANDA DEL PÁRPADO TIENE QUE MEDIR MÁS DE UNA FILA. La celda de
         * esta pieza es casi el doble de alta que de ancha, así que un arco más
         * fino que eso cae entre dos filas y desaparece a trozos: el párpado
         * salía roto por las puntas sin que se entendiera por qué.
         *
         * ⚠ Y LA RAMPA NO LLEVA COMILLA SIMPLE. La referencia la usa como tono
         * claro, pero acá los dibujos viven en cadenas entrecomilladas: una
         * comilla dentro parte la cadena. El hueco lo cubren el punto y la coma.
         *
         * ⚠ Y NO LLEVA RUIDO POR CELDA. Éste fue el error que más veces se
         * repitió, y el que hacía que el dibujo se viera «raro» sin que se
         * supiera por qué: con una tirada al azar por celda, dos caracteres
         * vecinos saltaban tres o cuatro pasos de la rampa y el resultado se
         * leía sucio, como sal y pimienta encima de un dibujo. En la referencia
         * los vecinos se llevan UN paso: son degradados.
         *
         * Lo único que se añade es un tramado ORDENADO de medio paso —el Bayer
         * de siempre— que rompe las bandas sin ensuciar nada, y un vaivén de
         * dos senos de frecuencia muy baja para que el tono no salga estéril.
         * El vaivén va MULTIPLICANDO y no sumando: sumado levanta también los
         * negros y el fondo deja de ser fondo.
         *
         * ⚠ Y HAY UN UMBRAL POR DEBAJO DEL CUAL TODO ES NEGRO. Sin él, el
         * tramado y el vaivén empujaban valores casi nulos hasta el primer
         * escalón de la rampa, y quedaban caracteres sueltos flotando en el
         * fondo — el detalle que más se notaba y peor se veía.
         *
         * El patrón sale de una semilla fija, no de `Math.random`: una pieza de
         * la colección tiene que ser SIEMPRE la misma. Si cambiara en cada
         * dibujado no habría nada que coleccionar.
         */
        art: [
            '                ...,,,,,,,..            ',
            '         .,:;;cclclllloooooll;;,,       ',
            '     .,;codxkOkOOOkkkOO00000Okdoc;,     ',
            '    :coxOKNNMMMWWNNXNNNNWWWNXK0kxol:    ',
            '    cdkKXWMMMMNKOkxxdddxxkO00K0Okxdl    ',
            '    dxOOkoc:.    xWMM0,       .:cdxd    ',
            '  :;o;.  .,,,  ;NWWdKMMx  .:::.   .cc;. ',
            ' .;c     .,,,  oXX,,,NMX   .,.      l;. ',
            '    ldk         ONNWWMW,         xdl    ',
            '    ;cdxOOO       :l;       xdddolc:    ',
            '     ,:clodxxkOO0KKKKK00kkddolc;::.     ',
            '        ,:;;clooxxkkkxxdolc;;:,.        ',
            '            .,,::::;:;::,,.             ',
            '                                        ',
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
         *
         * Los CANTOS de arriba y los tejuelos variados los pusiste vos, y son lo
         * que la termina: un lomo se ve desde arriba, y dos libros seguidos con
         * la misma marca vuelven a ser una reja.
         */
        art: [
            ' +====================================+ ',
            ' |  _   __   _   __   __   _   __   _ | ',
            ' | |=| |~~| |:| |^^| |==| |o| |,,| |~|| ',
            " | | | |==| | | |''| |  | | | |:|| |||| ",
            ' | |=| |~~| |:| |^^| |==| |o| |,,| |~|| ',
            ' | |_| |__| |_| |__| |__| |_| |__| |_|| ',
            ' +====================================+ ',
            ' |  _   __   _   __   __   _   __   _ | ',
            ' | |~| |==| |,| |::| |^^| |=| |~~| |o|| ',
            ' | | | |**| | | |  | |  | | | |  | |||| ',
            ' | |~| |==| |,| |::| |^^| |=| |~~| |o|| ',
            ' | |_| |__| |_| |__| |__| |_| |__| |_|| ',
            ' +====================================+ ',
        ].join('\n'),
    },
    {
        id: 'key',
        source: 'blackout-puzzle',
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
         *
         * El vástago DOBLE y los dientes de dos trazos con su pie los pusiste
         * vos: una llave tiene grosor, y con una sola línea parecía un alambre.
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
            '    |    ( * )    |=================|   ',
            '    |     :-:     |=================|   ',
            '     \\           /    ||   ||   ||      ',
            '      ":.     .:"     ||   ||   ||      ',
            '        "-...-"       ""   ""   ""      ',
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
    recienReveladas = new Set();
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
export function markOpened(id: string): boolean {
    if (!readFound().has(id)) return false;

    const abiertas = readOpened();
    if (abiertas.has(id)) return false;

    abiertas.add(id);

    try {
        localStorage.setItem(OPEN_KEY, JSON.stringify([...abiertas]));
    } catch {
        // Sin sitio, el pie se vuelve a esconder al recargar. Molesto, no grave.
    }

    /*
     * ⚠ DEVUELVE SI ÉSA ERA LA ÚLTIMA, y no marca el secreto acá.
     *
     * Abrirlas todas no es lo mismo que tenerlas todas: ganar una pieza es
     * tropezarse con ella y revelarla es ir a mirar, pero abrir es lo único que
     * hay que hacer UNA POR UNA — y quien las abrió todas es el único que sabe
     * cómo se llaman las dieciséis, porque el nombre sólo aparece al abrir.
     *
     * ⚠ Este módulo no importa de `hooks` —la dependencia va en una sola
     * dirección— así que quien avisa es quien ya sabe hacerlo: el comando
     * devuelve su `secretId` y `run` lo marca, que es el camino por el que pasan
     * todos los demás.
     *
     * ⚠ Y se cuenta DESPUÉS de guardar: con la cuenta vieja la última no
     * contaría y el logro pediría diecisiete.
     */
    return abiertas.size >= ART.length;
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

    /*
     * ⚠ SE ANOTA CUÁLES SON NUEVAS, y va en memoria a propósito.
     *
     * Sin esto, abrir la colección después de teclear `//art` enseñaba las tres
     * piezas nuevas exactamente igual que las de hace tres días: el trabajo de
     * haberlas ganado se perdía en una rejilla donde todas pesan lo mismo.
     *
     * En memoria y no en `localStorage` porque «recién revelada» es una cosa de
     * ESTE momento. Guardarlo entre sesiones haría que una pieza siguiera
     * pareciendo nueva tres días después, que es justo lo contrario de lo que la
     * palabra significa — y además ensuciaría el almacén con un dato que no es
     * del jugador, es de la pantalla.
     */
    const antes = readRevealed();
    recienReveladas = new Set([...found].filter((id) => !antes.has(id)));

    try {
        localStorage.setItem(SEEN_KEY, JSON.stringify([...found]));
    } catch {
        // Sin sitio, la colección se queda como estaba. No se pierde nada
        // ganado: eso vive en su propia clave.
    }

    // Y SE CALLAN LAS PISTAS. Existen para traerte hasta acá; seguir empujando
    // después de haber llegado no es una pista, es un pesado.
    clearHints();
}

/**
 * Las que destapó el último `//art`.
 *
 * Vacío si no hubo ninguna, o si la colección ya estaba entera. Lo lee la
 * pestaña para que lo recién ganado no se confunda con lo de siempre.
 */
let recienReveladas = new Set<string>();

/** Cuáles acaba de destapar el último `//art`. */
export function justRevealed(): ReadonlySet<string> {
    return recienReveladas;
}

/**
 * Y la pantalla se las lleva: ya las enseñó.
 *
 * ⚠ SIN ESTO, «RECIÉN REVELADA» NO SE APAGA NUNCA hasta el siguiente `//art`, y
 * una pieza seguía sintonizándose cada vez que abrías la pestaña — que es justo
 * lo contrario de lo que la palabra significa. La novedad se gasta al verla.
 */
export function forgetJustRevealed() {
    recienReveladas = new Set();
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

    /*
     * Y SE ENCIENDEN LAS PISTAS, pero sólo si todavía no miraste el catálogo.
     *
     * Ganar una pieza dejaba un premio en la mano y ninguna indicación de dónde
     * verlo: el aviso no dice el nombre —a propósito— y `//art` sólo salía por la
     * fuga de `//help`, que es azar. Se podían juntar cinco piezas sin enterarse
     * de que había una colección.
     *
     * La regla vive ACÁ y no en `artHints` para que aquel módulo no tenga que
     * leer de éste: la dependencia va en una sola dirección y no hay ciclo.
     */
    /*
     * SE AVISA SIEMPRE, y UNA sola vez cada cosa.
     *
     * ⚠ Ganar una pieza pasa muchas veces; encender la PISTA de dónde mirar,
     * una sola. Sin el aviso, todo lo que quisiera enterarse de un premio —el
     * sonido del cajón, por ejemplo— sólo se enteraba del PRIMERO, y a partir
     * del segundo los dibujos llegaban en silencio.
     *
     * ⚠ Y EL ALARDE VA SIEMPRE, que es lo que se corrigió: se reportó jugando
     * que la broma del `//reset` no desbloqueaba nada. Desbloqueaba —la pieza
     * entraba— pero no se veía NADA, porque el alarde estaba dentro de
     * `hintEarned` y aquélla sólo corre la primera vez. Un premio que no se
     * anuncia es un cambio en un contador que nadie mira.
     *
     * ⚠ Y CADA RAMA AVISA UNA VEZ, no suelto: las tres funciones despiertan a
     * los suscritos por su cuenta. Llamando a dos, un solo suceso despertaba dos
     * veces — lo cazó un test que contaba los avisos.
     */
    if (readRevealed().size === 0) hintEarned();
    else bragEarned();

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
    /**
     * Si su pie ya se puede LEER.
     *
     * Casi siempre es lo mismo que `opened`. Se separa por las piezas con
     * `nameNeeds`: ésas se abren —el dibujo sale— con el nombre todavía
     * tapado, y sin este campo el catálogo no podría pintar la diferencia
     * entre «no la tenés» y «la tenés y aún no sabés qué es».
     */
    named: boolean;
    /** El nombre, sólo si además se puede leer. Vacío si no. */
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
/**
 * ¿Se puede LEER el pie de esta pieza?
 *
 * Vive acá y no en cada sitio que pinta un nombre porque los sitios son
 * varios —el catálogo, `//art_<n>`, la nota de `//keep` y su título— y basta
 * con que uno se olvide para que la puerta no sirva de nada.
 */
/**
 * ¿La única que falta es ésta?
 *
 * Lo usa el cuaderno, que se gana teniéndolas TODAS. Preguntarlo así y no
 * «¿están las dieciséis?» evita la pescadilla: la pieza que cierra la caja no
 * puede exigirse a sí misma.
 */
export function onlyMissing(id: string): boolean {
    const found = readFound();
    return !found.has(id) && found.size === ART_TOTAL - 1;
}

export function captionKnown(piece: ArtPiece): boolean {
    if (piece.nameNeeds === undefined) return true;
    return didV02RoundTrip();
}

/**
 * El dibujo que toca ENSEÑAR de esta pieza.
 *
 * ⚠ SIN EL NOMBRE GANADO, EL DIBUJO TAMPOCO ESTÁ ENTERO.
 *
 * El manipulador se gana VIENDO el morse del reloj, y ver no es entender: en esa
 * primera fase la pieza está a medio recuperar, con el pie sin identificar y el
 * dibujo comido. Usar el código para entrar en la v0.2 y para salir es lo que la
 * completa — el nombre Y el dibujo a la vez.
 *
 * Vive acá y no en cada sitio que pinta una pieza porque los sitios son tres
 * —el catálogo, `//art_<n>` y la pestaña de la colección— y basta con que uno se
 * olvide para que la primera fase deje de existir. Ya pasó con el pie: la
 * colección lo enseñaba entero mientras el catálogo lo tapaba.
 */
export function artOf(piece: ArtPiece): string {
    const dibujo = piece.id === EYE_ID && eyeIsBarred() ? EYE_BARRED : piece.art;

    return captionKnown(piece) ? dibujo : damageArt(dibujo, piece.id);
}

/**
 * UN HUECO, DOS DIBUJOS.
 *
 * La pieza catorce es UNA, y cuál te toca depende de lo que elegiste al final:
 * ayudarlo te deja el ojo, reportarlo te deja el ojo TAPADO.
 *
 * ⚠ NO SON DOS PIEZAS, y no es una comodidad de implementación. Si lo fueran, la
 * colección pasaría a diecisiete y NUNCA SE PODRÍA COMPLETAR: sólo se puede
 * tener una, y el cuaderno firmado exige todas las demás. Sería el mismo agujero
 * que ya se cazó con el secreto `collection`.
 *
 * Con un hueco, los dos finales completan la colección — y queda marcada para
 * siempre por la decisión: dos personas que la tienen entera la tienen distinta.
 *
 * ⚠ ES EL MISMO DIBUJO, CELDA POR CELDA, CON UNA EQUIS ENCIMA. No es otra
 * pieza parecida: es ésta, tachada. Si el dibujo de debajo cambiara, las dos
 * versiones se leerían como dos piezas distintas — y son una.
 *
 * Una equis y no una barra: una barra tapa, y tapar deja la duda de si debajo
 * había algo. Una equis ANULA — dice que alguien lo vio, decidió que no, y lo
 * marcó. Y deja ver: el aspa cruza el iris pero no lo borra, así que entre los
 * dos trazos se siguen leyendo los párpados y trozos del iris. Se ve que había
 * un ojo, se ve dónde estaba, y se ve que alguien lo anuló.
 *
 * ⚠ Y EL ASPA LLEVA UN CANAL DE AIRE ALREDEDOR. Ésta es la parte que la hace
 * legible, y sin ella no funcionaba: la `X` YA EXISTE en la rampa de tonos del
 * dibujo, así que dos trazos de equis sobre un campo lleno de equis se leían
 * como más textura. Vaciando una celda a cada lado del trazo, el aspa deja de
 * competir con el dibujo y pasa a estar POR DELANTE de él — que es lo que hace
 * una marca puesta encima: ocupa sitio y tapa un poco alrededor.
 *
 * ⚠ Y EL TRAZO SE MIDE PERPENDICULAR, NO EN VERTICAL. El aspa va muy tendida
 * —cuarenta columnas por catorce filas— así que una tolerancia medida en
 * vertical se convierte en una banda horizontal enorme: salía un lazo.
 */
const EYE_ID = 'eye';

const EYE_BARRED = [
    '  X             ...,,,,,,,..         X  ',
    '  XXXX   .,:;;cclclllloooooll;;,, XXXX  ',
    '     XXXX dxkOkOOOkkkOO00000Ok XXXX     ',
    '    :co XXXX MMWWNNXNNNNWWW XXXX ol:    ',
    '    cdkKXW XXXX Okxxdddx XXXX 0Okxdl    ',
    '    dxOOkoc:. XXX  MM  XXX    .:cdxd    ',
    '  :;o;.  .,,,    XXXXXX   .:::.   .cc;. ',
    ' .;c     .,,,    XXXXXX    .,.      l;. ',
    '    ldk       XXX  WW  XXX       xdl    ',
    '    ;cdxOO XXXX   :l;    XXXX ddolc:    ',
    '     ,: XXXX kOO0KKKKK00kkd XXXX :.     ',
    '     XXXX ;;clooxxkkkxxdolc;;: XXXX     ',
    '  XXXX      .,,::::;:;::,,.       XXXX  ',
    '  X                                  X  ',
].join('\n');

/**
 * Y cómo se llama la pieza cuando llega tachada.
 *
 * ⚠ NO ES EL MISMO PIE. La pieza es una y el hueco es uno, pero el final que te
 * toca decide sus dos caras: el dibujo lo elige `artOf` y el nombre lo elige
 * `captionOf`.
 *
 * ⚠ Y CAMBIA LA VOZ, que es el remate. El pie de siempre lo dice ÉL, de tú: «te
 * estoy viendo». En el final en que lo reportás el ente calla para siempre, así
 * que quien rotula la pieza es la máquina institucional — y ésa no tutea porque
 * no sabe quién sos (ver `lore.ts` y `greeting.ts`). El archivo lo nombra el que
 * lo anuló, y lo primero que hace es negar que hubiera algo.
 */
const EYE_BARRED_CAPTION: Record<Lang, string> = {
    es: 'OJO VEDADO · USTED NO VIO NADA',
    en: 'BARRED EYE · YOU SAW NOTHING',
};

/**
 * Las CARAS alternativas: dibujos que comparten hueco con una pieza.
 *
 * ⚠ NO SON PIEZAS Y NO PUEDEN CONTARSE COMO TALES. El hueco es uno y cuál te
 * toca depende del final: ayudarlo te deja el ojo, reportarlo te deja el ojo
 * vedado. Si contaran como dos, la colección pasaría a diecisiete y NUNCA se
 * podría completar, porque los dos finales se excluyen entre sí.
 *
 * Se exporta porque desde fuera del módulo esta cara era invisible: la página de
 * identidad enseñaba dieciséis dibujos cuando existen diecisiete, y el que
 * faltaba era justamente el del final alternativo — el que menos gente ve.
 *
 * Un test exige que las dos caras MIDAN lo mismo, celda por celda. `ARTE.md` ya
 * avisaba de esa deriva y no había nada que la sujetara: las dos no se miran
 * nunca juntas, así que una podría quedarse corta durante meses.
 */
export const ART_FACES: readonly {
    /** El `id` de la pieza cuyo hueco comparte. */
    of: string;
    caption: Record<Lang, string>;
    art: string;
}[] = [{ of: EYE_ID, caption: EYE_BARRED_CAPTION, art: EYE_BARRED }];

/**
 * El pie que toca ENSEÑAR de esta pieza.
 *
 * Los tres estados, en orden: tenerla no es haberla mirado, y haberla mirado no
 * es saber qué es.
 *
 *   · Sin abrir      → `[ SIN ABRIR ]`. Se sabe que está y no qué es.
 *   · Abierta        → su pie.
 *   · Sin el nombre  → `[ SIN IDENTIFICAR ]`, sólo el manipulador. Ver `NameGate`.
 *
 * ⚠ VIVE ACÁ POR LO MISMO QUE `artOf`, y por el mismo fallo. La lista de `//art`
 * respetaba los tres estados y la pestaña de la colección no: enseñaba el pie de
 * TODO lo revelado, así que un solo `//art` te decía qué era cada pieza y
 * `//art_<n>` se quedaba sin nada que dar. Ya había pasado con el dibujo, y por
 * la misma razón — dos sitios decidiendo lo mismo dejan de decir lo mismo
 * (REGLAS · B5).
 */
export function captionOf(piece: ArtPiece, lang: Lang): string {
    if (!readOpened().has(piece.id)) return UNOPENED[lang];
    if (!captionKnown(piece)) return UNNAMED[lang];

    /*
     * ⚠ Y EL OJO TAPADO SE LLAMA DISTINTO, igual que se dibuja distinto.
     *
     * `artOf` ya elegía el dibujo según el final y el pie se quedaba fijo, así
     * que el ojo censurado salía rotulado «TE ESTOY VIENDO» — justo la frase
     * que ese final acaba de tachar.
     */
    if (piece.id === EYE_ID && eyeIsBarred()) return EYE_BARRED_CAPTION[lang];

    return piece.caption[lang];
}

export function catalogRows(lang: Lang = 'es'): CatalogRow[] {
    const found = readFound();
    if (found.size === 0) return [];

    const abiertas = readOpened();

    return ART.map((piece, i) => {
        const tengo = found.has(piece.id);
        const abierta = tengo && abiertas.has(piece.id);
        const legible = abierta && captionKnown(piece);
        const nombre = piece.caption[lang];

        return {
            number: i + 1,
            found: tengo,
            opened: abierta,
            named: legible,
            // El pie sólo llega al abrirla: tenerla no es saber qué es.
            label: legible ? nombre : '',
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
    // Sin el pie ganado, la ficha va sin nombre: guardarla no puede ser un
    // atajo para leer lo que todavía no se abrió.
    if (!captionKnown(piece)) return `${UNNAMED[lang]} · ${i}/${ART_TOTAL}`;
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
    const pie = captionKnown(piece) ? piece.caption[lang] : UNNAMED[lang];
    // Y el dibujo va como toque: guardar una pieza a medio recuperar guarda
    // lo que hay, no una copia entera que todavía no te ganaste.
    return [artOf(piece), '', `-- ${pie}`].join('\n');
}
