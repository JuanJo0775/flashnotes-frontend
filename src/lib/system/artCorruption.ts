// src/lib/system/artCorruption.ts

/**
 * La pieza tal como el sistema la archivó: mal.
 *
 * Ganás una pieza y en la papelera queda un resto de lo que recuperó, comido.
 * Entre la basura están las letras de `//art`, y ése es uno de los caminos para
 * descubrir el catálogo.
 *
 * ⚠ EL COMANDO VA PARTIDO EN TROZOS, y ésa es toda la gracia. Entero se lee como
 * un cartel —«acá tenés el comando»— y deja de ser un hallazgo. Repartido hay que
 * juntarlo con la vista, y hasta que lo juntás no sabés si es un comando o ruido.
 * Ningún trozo pasa de dos caracteres: `//` solo puede ser un resto cualquiera.
 *
 * ⚠ SE CORROMPE AL VUELO, no hay una segunda versión dibujada a mano. Dieciséis
 * dibujos gemelos serían dieciséis sitios más donde las dos copias pueden
 * separarse en silencio —ya pasó con `ARTE.md`— y cada pieza nueva obligaría a
 * dibujar dos.
 *
 * Módulo puro: mismo dibujo y misma semilla, mismo resto.
 */

/**
 * El comando, UNA LETRA POR FILA.
 *
 * ⚠ VA EN VERTICAL, y ésa es toda la idea. Un dibujo en caracteres se lee en
 * horizontal: los ojos barren de izquierda a derecha y nadie va leyendo columnas.
 * Así que una columna de letras entre el destrozo NO se lee — se ve como cinco
 * restos más, alineados de casualidad. Hasta que un día no.
 *
 * Es el punto exacto que costó encontrar. Repartido en trozos horizontales
 * quedaba invisible: entre la basura, dos caracteres más de basura no llaman la
 * atención de nadie. Entero y en horizontal era un cartel. En vertical se VE
 * —cinco letras en fila india saltan— y aun así hay que darse cuenta de que se
 * leen hacia abajo.
 *
 * En MAYÚSCULAS porque entre el ruido se distinguen mejor, y el comando se
 * normaliza a minúsculas al teclearlo: `//ART` y `//art` son el mismo.
 */
export const COMMAND_SHARDS: readonly string[] = ['/', '/', 'A', 'R', 'T'];

/**
 * La basura con la que se sustituye.
 *
 * Nada que la monoespaciada no tenga (REGLAS · C8), y nada que se confunda con
 * los trozos del comando: sin barras, sin letras. Así lo único legible entre el
 * ruido es lo que se puso a propósito.
 */
const BASURA = '#%&@?*+~=$';

/**
 * De cada carácter con tinta, cuántos se comen del todo.
 *
 * ⚠ EMPEZÓ EN 0,14 Y SE VEÍA DEMASIADO ENTERO, dos veces seguidas. El resto
 * tiene que parecer un bloque mal recuperado, no un dibujo con manchitas: si se
 * reconoce a la primera deja de leerse como algo que el sistema estropeó, y la
 * pieza de verdad —la que se gana— pierde valor por haberla visto ya.
 *
 * Entre lo comido y lo ensuciado se toca SEIS DE CADA DIEZ caracteres con tinta.
 * Queda la silueta y poco más, que es exactamente lo que sobrevive a un bloque
 * recuperado a medias.
 */
const COMIDOS = 0.34;

/** Y cuántos se sustituyen por basura. */
const SUCIOS = 0.26;

/**
 * Un número reproducible entre 0 y 1 a partir de una clave.
 *
 * ⚠ CON MEZCLA FINAL, igual que el ruido de la v0.2. Con el FNV a secas, claves
 * parecidas caen en tramos parecidos y la corrupción sale casi igual en piezas
 * distintas: los bits altos apenas cambian y son los que mandan al pasar a
 * decimal.
 */
function ruido(clave: string): number {
    let h = 2166136261;
    for (let i = 0; i < clave.length; i += 1) {
        h ^= clave.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }

    h ^= h >>> 16;
    h = Math.imul(h, 2246822507);
    h ^= h >>> 13;
    h = Math.imul(h, 3266489909);
    h ^= h >>> 16;

    return (h >>> 0) / 4294967296;
}

/**
 * El resto que quedó de esta pieza.
 *
 * `semilla` identifica la pieza: la misma da siempre el mismo resto. Vive en la
 * papelera, y si cambiara en cada repintado sería un cartel de neón parpadeando
 * en vez de algo que alguien tiró ahí.
 */
export function corruptArt(art: string, semilla: string): string {
    const filas = art.split('\n');
    const rejilla = filas.map((f) => [...f]);

    // Las casillas CON TINTA, en orden de lectura. Sobre el vacío no se corrompe
    // nada: agujerear el aire no rompe un dibujo, sólo lo ensancha.
    const conTinta: { y: number; x: number }[] = [];
    rejilla.forEach((fila, y) =>
        fila.forEach((c, x) => {
            if (c !== ' ') conTinta.push({ y, x });
        })
    );

    for (const [i, casilla] of conTinta.entries()) {
        const actual = rejilla[casilla.y][casilla.x];
        const dado = ruido(`${semilla}:${i}`);
        const sucio = () =>
            BASURA[
                Math.min(
                    Math.floor(ruido(`${semilla}:s:${i}`) * BASURA.length),
                    BASURA.length - 1
                )
            ];

        /*
         * ⚠ LAS LETRAS SE VAN TODAS, SIN SORTEO.
         *
         * Es lo que hace que el comando se encuentre. Los dibujos llevan letras
         * propias —el `oo` de la polilla, la `A` y el `3 min` del casete, el
         * `v 0 . 2` del disquete— y mientras sobreviva cualquiera de ellas, las
         * cinco del comando son cinco letras más entre otras y no destacan en
         * nada.
         *
         * Comiéndoselas todas, lo ÚNICO alfabético que queda en el bloque es el
         * comando. No lo señala nadie y sigue habiendo que darse cuenta de que se
         * lee hacia abajo, pero ya hay algo a lo que agarrarse.
         *
         * Los DÍGITOS se quedan: parecen datos, y un bloque de datos con dígitos
         * sueltos es exactamente lo que dice ser.
         */
        if (/[a-zA-Z]/.test(actual)) {
            rejilla[casilla.y][casilla.x] = dado < COMIDOS ? ' ' : sucio();
            continue;
        }

        if (dado < COMIDOS) {
            rejilla[casilla.y][casilla.x] = ' ';
        } else if (dado < COMIDOS + SUCIOS) {
            rejilla[casilla.y][casilla.x] = sucio();
        }
    }

    /*
     * Y AHORA EL COMANDO, EN COLUMNA.
     *
     * Se busca una columna con sitio para las cinco letras seguidas y se escriben
     * hacia abajo. Se prefieren las casillas VACÍAS —el ojo va a lo que está solo
     * en el hueco— pero si no hay hueco limpio se pisa el destrozo igual: vale más
     * un comando encontrable sobre la tinta que uno perfecto que no está.
     *
     * ⚠ NO SE ELIGE LA COLUMNA AL AZAR ENTRE TODAS. Las de los bordes dejan la
     * columna pegada al canto y ahí se lee como parte del marco; se descartan las
     * cuatro de cada lado.
     */
    const alto = COMMAND_SHARDS.length;
    const candidatas: { x: number; y: number; limpias: number }[] = [];

    for (let x = 4; x < 36; x += 1) {
        for (let y = 0; y + alto <= rejilla.length; y += 1) {
            let limpias = 0;
            for (let k = 0; k < alto; k += 1) {
                if (rejilla[y + k][x] === ' ') limpias += 1;
            }
            candidatas.push({ x, y, limpias });
        }
    }

    if (candidatas.length > 0) {
        // De las que más hueco limpio tienen, una cualquiera: así la columna cae
        // en un sitio distinto en cada pieza y no siempre en el mismo borde.
        const mejor = Math.max(...candidatas.map((c) => c.limpias));
        const buenas = candidatas.filter((c) => c.limpias === mejor);
        const cual = Math.floor(ruido(`${semilla}:col`) * buenas.length);
        const { x, y } = buenas[Math.min(cual, buenas.length - 1)];

        COMMAND_SHARDS.forEach((letra, k) => {
            rejilla[y + k][x] = letra;
        });
    }

    return rejilla.map((f) => f.join('')).join('\n');
}

/**
 * De cada carácter con tinta, cuántos se pierden en una pieza A MEDIO RECUPERAR.
 *
 * Mucho menos que en el resto de la papelera: aquélla es un bloque que el sistema
 * archivó mal y tiene que costar reconocerlo; ésta es TU pieza, ganada, que
 * todavía no terminaste de recuperar. Se reconoce de sobra y se ve que le falta
 * algo — que es exactamente el estado en que está.
 */
const DANADOS = 0.16;

/**
 * La pieza a medio recuperar.
 *
 * ⚠ NO LLEVA EL COMANDO. Eso es cosa del resto de la papelera, que es una PISTA;
 * esto es una pieza incompleta, y meterle letras la convertiría en otro acertijo
 * encima del que ya tiene.
 *
 * Se usa con las piezas cuyo nombre todavía no se ganó (`nameNeeds`): el
 * manipulador se consigue viendo el morse, y hasta que no usás el código para
 * entrar y salir de la v0.2 ni el nombre ni el dibujo están enteros. Ver el
 * morse no es entenderlo.
 */
export function damageArt(art: string, semilla: string): string {
    const rejilla = art.split('\n').map((f) => [...f]);
    let i = 0;

    for (const fila of rejilla) {
        for (let x = 0; x < fila.length; x += 1) {
            if (fila[x] === ' ') continue;

            const dado = ruido(`${semilla}:d:${i}`);
            i += 1;

            if (dado < DANADOS) fila[x] = ' ';
        }
    }

    return rejilla.map((f) => f.join('')).join('\n');
}
