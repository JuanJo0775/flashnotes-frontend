// src/lib/system/eyeStatic.ts

/**
 * El ojo detrás de la pared: lluvia de dígitos, y el ojo por AUSENCIA.
 *
 * ⚠ NO ESTÁ DIBUJADO: ESTÁ RECORTADO. El campo se llena de unos y ceros y la
 * forma del ojo es donde los dígitos NO están. Una silueta encima del ruido se
 * leía como un emoji pegado sobre una textura — el problema no era el dibujo,
 * era que el ojo y el fondo estaban hechos de cosas distintas, así que uno se
 * veía ENCIMA del otro en vez de DENTRO.
 *
 * ⚠ Y ES UN PRIMER PLANO. No un ojo pequeño con una cejita encima —eso es un
 * icono— sino un ojo que llena el hueco de lado a lado, como cuando algo se
 * acerca demasiado al otro lado de una rendija.
 *
 * SOBRE EL COLOR, que se decide en `glitch.css` y no acá: la referencia venía en
 * cian, pero de ella se toma la FORMA, no la paleta. Esta app es monocroma
 * estricta y un color suelto sería lo más ruidoso de todo el producto. El hueco
 * es oscuro en los dos temas —un agujero es oscuro, eso es físico— así que
 * funciona igual en claro y en oscuro sin pedirle nada al tema.
 *
 * Módulo puro: recibe la forma y un dado, y devuelve un fotograma de texto.
 */

/**
 * Cuántos dígitos de ancho y de alto tiene el campo.
 *
 * ⚠ TIENE QUE CABER ENTERO EN EL HUECO. Con más columnas de las que caben, el
 * campo se recorta por los cuatro lados y lo que queda a la vista es justo el
 * centro del ojo, o sea el vacío: parece que no se dibuja nada. Las medidas van
 * atadas al tamaño del hueco y al cuerpo de letra en `glitch.css`.
 */
export const COLS = 62;
export const ROWS = 27;

export interface EyeShape {
    /**
     * Hacia dónde mira, de `-1` a `1`.
     *
     * Sólo se mueve el iris; el párpado se queda. Un ojo que se desplaza entero
     * no mira: se traslada.
     */
    look: number;
    /** Cuánto está cerrado, de `0` (abierto) a `1` (cerrado del todo). */
    lid: number;
}

/*
 * ══ LA GEOMETRÍA ════════════════════════════════════════════════════════════
 *
 * Todo en coordenadas de `-1` a `1`, con `x` a lo ancho e `y` hacia abajo.
 */

/** El ojo, apenas a la izquierda y por debajo del centro. */
const OJO_X = -0.06;
const OJO_Y = 0.24;

/** Y grande: de borde a borde. */
const ANCHO = 0.90;
const ALTO_ARRIBA = 0.40;
const ALTO_ABAJO = 0.30;

/**
 * ⚠ EL PÁRPADO DE ARRIBA NO ES SIMÉTRICO.
 *
 * Su punto más alto va corrido a la derecha, así que el arco sube despacio y
 * cae de golpe. Un arco simétrico es un óvalo partido por la mitad; esta
 * asimetría es lo único que separa «un ojo» de «una lente».
 */
const SESGO = 0.08;

/**
 * EL PLIEGUE, que es lo que en la referencia barre por encima.
 *
 * No es una ceja suelta: es la sombra del párpado, pegada al ojo y siguiéndole
 * la curva. Se separa un poco y se va afinando hacia la izquierda, y de ahí
 * sale el barrido.
 */
const PLIEGUE_SEP = 0.30;
const PLIEGUE_GROSOR = 0.15;

/** El iris, y el anillo de dígitos que lo dibuja por dentro. */
const IRIS_R = 0.26;
const ANILLO = 0.05;

/**
 * Cuánto hay que achatar lo redondo para que salga redondo.
 *
 * ⚠ ESTUVO EN 1.9 Y ERA UN ERROR DE CUENTA. Las celdas son el doble de altas
 * que de anchas, sí, pero el campo tiene más columnas que filas y las dos cosas
 * casi se cancelan. Con 1.9 el iris salía como una rendija y no se veía.
 */
const ACHATA = ((ROWS - 1) / (COLS - 1)) * 2;

/** El borde de arriba del ojo, a esta altura de `x`. */
function parpadoArriba(x: number, abierto: number): number {
    const t = (x - SESGO) / ANCHO;
    const caida = Math.max(0, 1 - t * t) ** 0.6;

    return OJO_Y - ALTO_ARRIBA * abierto * caida;
}

/** Y el de abajo, más plano: un ojo no es simétrico de arriba abajo. */
function parpadoAbajo(x: number, abierto: number): number {
    const t = (x - SESGO * 0.4) / ANCHO;
    const caida = Math.max(0, 1 - t * t) ** 0.9;

    return OJO_Y + ALTO_ABAJO * abierto * caida;
}

/** ¿Esta celda está dentro del ojo, o sea vacía? */
function esHueco(x: number, y: number, shape: EyeShape): boolean {
    const abierto = 1 - shape.lid;
    const arriba = parpadoArriba(x, abierto);
    const abajo = parpadoAbajo(x, abierto);

    /*
     * EL PLIEGUE. Por encima del párpado, siguiéndole la curva, afinándose
     * hacia la izquierda. Desaparece cuando el ojo se cierra: sin párpado
     * abierto no hay pliegue que le haga sombra.
     */
    if (abierto > 0.25) {
        const grosor = PLIEGUE_GROSOR * (0.3 + 0.7 * ((x + 1) / 2));
        const centro = arriba - PLIEGUE_SEP - grosor / 2;

        if (Math.abs(y - centro) <= grosor / 2) return true;
    }

    // EL OJO.
    if (y < arriba || y > abajo) return false;

    /*
     * Y DENTRO, EL IRIS.
     *
     * Se dibuja al revés que todo lo demás: en el anillo SÍ hay dígitos. Es lo
     * único que se ve dentro del hueco, y alcanza para entender que hay un iris
     * ahí y hacia dónde está mirando.
     */
    const ix = x - OJO_X - shape.look * 0.3;
    const iy = (y - OJO_Y) / ACHATA;
    const d = Math.sqrt(ix * ix + iy * iy);

    return !(d > IRIS_R - ANILLO && d < IRIS_R + ANILLO);
}

/**
 * Un fotograma.
 *
 * ⚠ LA LLUVIA CAE EN COLUMNAS, no en celdas sueltas. Con cada celda tirada
 * aparte queda una alfombra pareja de ruido, y una alfombra no llueve. Cada
 * columna lleva su propia densidad, así que aparecen las rayas verticales y los
 * claros que hacen que se lea como algo cayendo — que es lo que hace la
 * referencia y lo que le da el ritmo.
 *
 * Los huecos del ojo se quedan donde están mientras el resto hierve, y eso es
 * lo que hace que MIRE: si se movieran también, sería ruido.
 */
export function rainFrame(
    shape: EyeShape,
    random: () => number = Math.random
): string {
    /*
     * Lo tupida que va cada columna en esta pasada.
     *
     * ⚠ MUY TUPIDA, Y ESO ES LO QUE HACE VISIBLE EL OJO. Con columnas al 50-95%
     * el campo ya estaba lleno de claros al azar, así que el vacío del ojo no
     * contrastaba con nada: se perdía dentro de su propio ruido. Denso, el
     * único hueco grande que queda es la forma — que es exactamente cómo
     * funciona la referencia.
     */
    const densidad: number[] = [];
    for (let c = 0; c < COLS; c += 1) densidad.push(0.88 + random() * 0.12);

    const filas: string[] = [];

    for (let r = 0; r < ROWS; r += 1) {
        const y = (r / (ROWS - 1)) * 2 - 1;
        let fila = '';

        for (let c = 0; c < COLS; c += 1) {
            const x = (c / (COLS - 1)) * 2 - 1;

            if (esHueco(x, y, shape)) {
                fila += ' ';
                continue;
            }

            fila += random() > densidad[c] ? ' ' : random() < 0.5 ? '0' : '1';
        }

        filas.push(fila);
    }

    return filas.join('\n');
}

/** Cada cuánto se vuelve a tirar la lluvia, en milisegundos. */
export const FRAME_MS = 90;

/**
 * Hacia dónde mira y cuánto tiene el ojo abierto, en este fotograma.
 *
 * ⚠ LOS DOS RITMOS SON DISTINTOS Y NO ENCAJAN, a propósito. En cuanto el
 * parpadeo y la mirada caen juntos, el ojo deja de mirar y pasa a repetirse.
 */
export function eyeAt(frame: number, closing: boolean): EyeShape {
    if (closing) {
        // El cierre final: baja y se queda abajo. No vuelve a abrirse.
        return { look: 0, lid: Math.min(1, frame / 10) };
    }

    // Mira, se queda, mira a otro lado. Las pausas son lo que hace que parezca
    // que está decidiendo dónde mirar, y no barriendo.
    const t = (frame % 58) / 58;
    const look = t < 0.25 ? 0 : t < 0.45 ? -1 : t < 0.7 ? -1 : t < 0.9 ? 1 : 0;

    // Y parpadea de tanto en tanto: un instante, y sigue.
    const b = frame % 71;
    const lid = b === 0 ? 0.6 : b === 1 ? 1 : b === 2 ? 0.5 : 0;

    return { look, lid };
}
