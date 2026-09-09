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
 * ⚠ Y NO APARECE: SE RESUELVE. El hueco se abre con ruido y nada más, y el ojo
 * emerge de ese ruido vaciándose DESDE EL CENTRO HACIA EL BORDE, como una foto
 * revelándose. Es lo que hacen las referencias del cliente y es lo que separa
 * «hay un dibujo detrás» de «algo se está asomando»: un recorte que aparece de
 * golpe es una máscara que se enciende; una forma que se resuelve estaba ahí
 * antes de que la vieras.
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
 * atadas al tamaño del hueco y al cuerpo de letra en `glitch.css`, y la cuenta
 * está escrita en `CELL_ASPECT`.
 *
 * ⚠ Y EL CUERPO MANDA SOBRE EL NÚMERO. Estuvieron en 62×27 con la letra a 6 px,
 * y a ese tamaño el navegador pinta los dígitos con suavizado de SUBPÍXEL:
 * salían azules y naranjas, o sea color suelto en la única parte del producto
 * que no puede tener ninguno. A 9 px cada dígito es un glifo de verdad, se lee,
 * y sale gris — que es como tiene que salir. Las columnas son entonces las que
 * quepan, y el hueco se hizo más grande para que quepan más: la resolución es
 * lo único que separa un ojo de una mancha con forma de ojo.
 */
export const COLS = 59;
export const ROWS = 23;

/**
 * Lo alta que es una celda respecto de lo ancha.
 *
 * Sale del CSS y no de un ojo a mano: cuerpo 9 px, interlínea 1.06 y avance de
 * la monoespaciada 0.6 em más 0.04 em de separación.
 *
 *     ancho = 9 · (0.6 + 0.04) = 5.76      alto = 9 · 1.06 = 9.54
 *
 * ⚠ SI CAMBIA EL CUERPO EN `glitch.css`, CAMBIA ACÁ. Hay un test que ata las
 * dos cosas, porque de esta constante depende que lo redondo salga redondo.
 */
export const CELL_ASPECT = 9.54 / 5.76;

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
    /**
     * Cuánto está, de `0` (no hay nada, sólo lluvia) a `1` (recortado del todo).
     *
     * ⚠ NO ES OPACIDAD. Una forma que se funde es una capa encima bajando de
     * opacidad, y eso vuelve a poner al ojo y al campo en planos distintos, que
     * es el error del que se viene. Acá lo que sube es la PROBABILIDAD de que
     * una celda del hueco esté vacía, y sube antes en el centro que en el
     * borde: el ojo se come el ruido desde dentro.
     */
    presence: number;
}

/*
 * ══ LA GEOMETRÍA ════════════════════════════════════════════════════════════
 *
 * Todo en coordenadas de `-1` a `1`, con `x` a lo ancho e `y` hacia abajo.
 */

/** El ojo, apenas a la izquierda y por encima del centro. */
const OJO_X = -0.06;
const OJO_Y = 0.18;

/** Y grande: de borde a borde. */
const ANCHO = 1.0;
const ALTO_ARRIBA = 0.58;
const ALTO_ABAJO = 0.46;

/**
 * ⚠ EL PÁRPADO DE ARRIBA NO ES SIMÉTRICO.
 *
 * Su punto más alto va corrido a la derecha, así que el arco sube despacio y
 * cae de golpe. Un arco simétrico es un óvalo partido por la mitad; esta
 * asimetría es lo único que separa «un ojo» de «una lente».
 *
 * ⚠ ES UNA INCLINACIÓN, NO UN DESPLAZAMIENTO. Estuvo restándose de la `x`
 * antes de medir el ancho, y entonces movía el ojo ENTERO hacia la derecha: se
 * salía del campo por un lado y dejaba cuatro columnas muertas por el otro. El
 * ojo va centrado y lo que se ladea es la altura del arco.
 */
const SESGO = 0.28;

/**
 * EL PLIEGUE, que es lo que en la referencia barre por encima.
 *
 * No es una ceja suelta: es la sombra del párpado, pegada al ojo y siguiéndole
 * la curva. Se separa un poco y se va afinando hacia la izquierda, y de ahí
 * sale el barrido.
 */
const PLIEGUE_SEP = 0.16;
const PLIEGUE_GROSOR = 0.34;

/**
 * Hasta dónde llega el pliegue, medido en lo alto que es el ojo debajo.
 *
 * ⚠ NO LLEGA A LAS PUNTAS, Y ES LO QUE LO SALVA. Barriendo de canto a canto se
 * juntaba con el ojo en los dos extremos y las dos formas quedaban pegadas en
 * una sola mancha con forma de coma — que no es una cara mirándote, es un
 * garabato. Recortado al tramo donde el ojo es alto, queda una franja de
 * dígitos entre los dos y se leen como dos cosas: el ojo, y su sombra.
 *
 * ⚠ Y CORTO ES MEJOR QUE FINO. El campo tiene dieciocho filas: un pliegue que
 * cruce medio campo con una fila de grosor no se lee como una curva, se lee
 * como claros sueltos — o sea ruido compitiendo con el ojo, que es lo único
 * que acá tiene permiso para llamar la atención. Menos ancho y más cuerpo.
 */
const PLIEGUE_ALCANCE = 0.8;

/** El iris, y el anillo de dígitos que lo dibuja por dentro. */
const IRIS_R = 0.21;
const ANILLO = 0.045;

/**
 * EL BRILLO, que es lo que separa un ojo de un dibujo de un ojo.
 *
 * ⚠ UN OJO SIN REFLEJO ESTÁ MUERTO. Es el detalle más pequeño de toda la escena
 * y el que más trabaja: un anillo con nada dentro se lee como un símbolo —una
 * diana, una lente— y en cuanto tiene una chispa arriba a la izquierda se lee
 * como algo húmedo que te está mirando. No es adorno: es lo que dice que está
 * vivo.
 *
 * Va en dígitos, como el anillo: dentro del hueco, lo que se ve es lo que NO se
 * borró.
 */
const BRILLO_R = 0.05;
const BRILLO_X = -0.07;
const BRILLO_Y = -0.07;

/**
 * Cuánto hay que achatar lo redondo para que salga redondo.
 *
 * ⚠ ESTA CUENTA SE HIZO MAL DOS VECES Y LAS DOS SE VIO. Estuvo en `1.9` a ojo,
 * y después «corregida» a `((ROWS-1)/(COLS-1))·2`, que está DADA VUELTA: con
 * ella el iris salía aplastado 1,6 veces y se leía como una rendija en lugar de
 * como un iris.
 *
 * La cuenta de verdad: un tramo de `x` mide `(COLS-1)/2` celdas de ancho y un
 * tramo de `y` mide `(ROWS-1)/2` celdas de alto, así que para que un círculo
 * salga redondo en PÍXELES hay que pesar cada celda por su tamaño real.
 */
const ACHATA = (COLS - 1) / (ROWS - 1) / CELL_ASPECT;

/**
 * Cuánto ojo hay a esta altura de `x`: `1` en el centro y `0` pasadas las
 * puntas. Es la misma caída que usa el párpado de arriba, y es lo que hace que
 * la costura del ojo cerrado se afile en los cantos en vez de cruzar el campo
 * entero de lado a lado.
 */
function anchoEn(x: number): number {
    const t = x / ANCHO;

    return Math.max(0, 1 - t * t) ** 0.6;
}

/** El borde de arriba del ojo, a esta altura de `x`. */
function parpadoArriba(x: number, abierto: number): number {
    return OJO_Y - ALTO_ARRIBA * abierto * anchoEn(x) * (1 + SESGO * x);
}

/** Y el de abajo, más plano: un ojo no es simétrico de arriba abajo. */
function parpadoAbajo(x: number, abierto: number): number {
    const t = x / ANCHO;
    const caida = Math.max(0, 1 - t * t) ** 0.9;

    return OJO_Y + ALTO_ABAJO * abierto * caida * (1 - SESGO * 0.35 * x);
}

/**
 * Cuánto de hueco es esta celda: `0` es campo y `1` es el corazón del vacío.
 *
 * ⚠ DEVUELVE UNA HONDURA Y NO UN SÍ O NO, y de ahí sale todo lo demás. Con un
 * booleano el ojo sólo puede estar o no estar, así que aparecer es encenderse.
 * Con la hondura, el centro se vacía antes que el borde y la forma se REVELA:
 * es la diferencia entre una máscara y algo que se acerca.
 */
function hondura(x: number, y: number, shape: EyeShape): number {
    const abierto = 1 - shape.lid;
    const arriba = parpadoArriba(x, abierto);
    const abajo = parpadoAbajo(x, abierto);

    /*
     * EL PLIEGUE. Por encima del párpado, siguiéndole la curva, afinándose
     * hacia la izquierda. Desaparece cuando el ojo se cierra: sin párpado
     * abierto no hay pliegue que le haga sombra.
     *
     * Va menos hondo que el ojo a propósito: es una sombra, así que se resuelve
     * DESPUÉS y se disuelve ANTES. Si los dos se revelaran al mismo paso, el
     * pliegue competiría con el ojo por ser lo que aparece.
     */
    const alcance = anchoEn(x);

    if (abierto > 0.25 && alcance > PLIEGUE_ALCANCE) {
        const grosor =
            (PLIEGUE_GROSOR * (alcance - PLIEGUE_ALCANCE)) /
            (1 - PLIEGUE_ALCANCE);
        const centro = arriba - PLIEGUE_SEP - grosor / 2;
        const dentro = 1 - Math.abs(y - centro) / (grosor / 2);

        if (dentro > 0) return dentro * 0.6;
    }

    // EL OJO.
    const ancho = alcance;
    if (ancho <= 0) return 0;

    /*
     * ⚠ UN OJO CERRADO NO ES NADA: ES UNA COSTURA.
     *
     * Con los párpados juntos el hueco medía exactamente cero, así que el ojo
     * desaparecía del campo justo durante el tramo en que se está resolviendo
     * — que es el único momento en que hace falta que se lo vea. La costura es
     * el ojo dibujado con el grosor mínimo que el campo sabe pintar: una
     * celda, afilándose hacia las puntas.
     */
    const costura = (ancho * 1) / (ROWS - 1);
    const centro = (arriba + abajo) / 2;
    const medio = Math.max((abajo - arriba) / 2, costura);

    const fuera = Math.abs(y - centro);
    if (fuera > medio) return 0;

    /*
     * Y DENTRO, EL IRIS.
     *
     * Se dibuja al revés que todo lo demás: en el anillo SÍ hay dígitos. Es lo
     * único que se ve dentro del hueco, y alcanza para entender que hay un iris
     * ahí y hacia dónde está mirando.
     *
     * No existe con el ojo casi cerrado, por lo mismo que el pliegue: un iris
     * asomando por una costura sería la costura partida en tres trozos, no un
     * ojo. Aparece a medida que el párpado sube, que es cuando hay dónde
     * ponerlo.
     */
    if (abierto > 0.35) {
        const ix = x - OJO_X - shape.look * 0.3;
        const iy = (y - OJO_Y) / ACHATA;
        const d = Math.sqrt(ix * ix + iy * iy);

        if (d > IRIS_R - ANILLO && d < IRIS_R + ANILLO) return 0;

        // Y el brillo, arriba a la izquierda, dentro del iris.
        const bx = ix - BRILLO_X;
        const by = iy - BRILLO_Y;

        if (Math.sqrt(bx * bx + by * by) < BRILLO_R) return 0;
    }

    // Y la hondura del ojo: máxima en mitad del párpado, cero en los cantos.
    return Math.min(1, (medio - fuera) / medio);
}

/**
 * Lo ancha que es la banda por la que el ojo se resuelve, en unidades de
 * `presence`.
 *
 * Con `0` el ojo se recortaría de golpe en cuanto `presence` pasara de cero.
 * Con esto, mientras sube quedan celdas del borde todavía llenas de dígitos y
 * celdas del centro ya vacías — o sea, un tramado. El tramado ES el efecto.
 */
const BORDE = 0.55;

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
            const h = hondura(x, y, shape);

            /*
             * ⚠ EL CENTRO SE VACÍA ANTES QUE EL BORDE. Con `presence` a media
             * altura, una celda honda ya está vacía y una del canto todavía
             * no, así que lo que se ve es la forma resolviéndose del ruido en
             * vez de un recorte encendiéndose.
             */
            if (
                h > 0 &&
                shape.presence * (1 + BORDE) - (1 - h) > random() * BORDE
            ) {
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

/*
 * ══ EL ARCO ═════════════════════════════════════════════════════════════════
 *
 * ⚠ EL OJO TIENE UN PRINCIPIO Y UN FINAL, Y LOS DECIDE ÉL. No hay un
 * temporizador de fuera que lo abra y otro que lo cierre: el hueco se abre, el
 * arco empieza a contar, y cuando se acaba es cuando falla el sistema. Que el
 * último gesto sea suyo y no del reloj es lo que convierte el momento en una
 * despedida en vez de en una escena que se corta.
 *
 * En tramos, y en fotogramas de 90 ms:
 */

/** Sólo ruido. No hay nada, y por eso lo que venga después llega a algo vacío. */
const LLEGA = 10;
/** La forma se resuelve del ruido, todavía con el ojo cerrado: una costura. */
const RESUELVE = 8;
/** Y se abre. */
const ABRE = 5;
/** Mira, se queda, mira a otro lado, parpadea, y vuelve a vos. */
const MIRA = 32;
/** Te mira y se cierra. */
const CIERRA = 8;
/** Y se va: la forma se disuelve otra vez en la lluvia. */
const SE_VA = 6;

const T_RESUELVE = LLEGA;
const T_ABRE = T_RESUELVE + RESUELVE;
const T_MIRA = T_ABRE + ABRE;
const T_CIERRA = T_MIRA + MIRA;
const T_SE_VA = T_CIERRA + CIERRA;

/** Cuánto dura el arco entero, en fotogramas. */
export const EYE_ARC_FRAMES = T_SE_VA + SE_VA;

/**
 * El fotograma que se enseña cuando NO PUEDE HABER MOVIMIENTO.
 *
 * Con `prefers-reduced-motion` la lluvia no hierve, así que el arco no puede
 * correr — pero el final no se borra por eso: quien pide menos movimiento pide
 * no marearse, no perderse el remate. Es el último instante con el ojo abierto,
 * o sea el que te mira.
 */
export const EYE_STILL_FRAME = T_CIERRA - 1;

/**
 * En qué fotograma del tramo de mirada empieza cada parpadeo.
 *
 * ⚠ NO CAEN DONDE CAMBIA LA MIRADA, y es la única regla que tienen. En cuanto
 * el parpadeo y la mirada van al mismo paso, el ojo deja de mirar y pasa a
 * repetirse: se vuelve un bucle, y un bucle no te está mirando a vos.
 */
const PARPADEOS = [9, 21];

/** Y cuánto dura uno: un instante, y sigue. */
const PARPADEO = [0.6, 1, 0.5];

/**
 * Hacia dónde mira dentro del tramo de mirada, de `0` a `1` del recorrido.
 *
 * Las pausas son lo que hace que parezca que está DECIDIENDO dónde mirar y no
 * barriendo. Y termina en `0`: te mira a vos antes de cerrarse, que es el
 * remate.
 */
function miradaEn(t: number): number {
    if (t < 0.19) return 0;
    if (t < 0.53) return -1;
    if (t < 0.78) return 1;
    return 0;
}

/**
 * Cómo está el ojo en este fotograma del arco.
 *
 * `frame` cuenta desde que el hueco quedó a la vista, no desde que se montó el
 * componente: lo que pasa antes de que se vea no le pasó a nadie.
 */
export function eyeAt(frame: number): EyeShape {
    // Antes de nada: sólo lluvia. El hueco se abre y no hay ojo.
    if (frame < T_RESUELVE) return { look: 0, lid: 1, presence: 0 };

    // Se resuelve del ruido, todavía cerrado: primero aparece la costura.
    if (frame < T_ABRE) {
        return {
            look: 0,
            lid: 1,
            presence: (frame - T_RESUELVE + 1) / RESUELVE,
        };
    }

    // Y se abre.
    if (frame < T_MIRA) {
        return {
            look: 0,
            lid: 1 - (frame - T_ABRE + 1) / ABRE,
            presence: 1,
        };
    }

    // Mira. Los parpadeos van por encima de la mirada, con su propio paso.
    if (frame < T_CIERRA) {
        const dentro = frame - T_MIRA;
        const inicio = PARPADEOS.find(
            (f) => dentro >= f && dentro < f + PARPADEO.length
        );

        return {
            look: miradaEn(dentro / MIRA),
            lid: inicio === undefined ? 0 : PARPADEO[dentro - inicio],
            presence: 1,
        };
    }

    // El cierre final: baja y se queda abajo. No vuelve a abrirse.
    if (frame < T_SE_VA) {
        return {
            look: 0,
            lid: Math.min(1, (frame - T_CIERRA + 1) / CIERRA),
            presence: 1,
        };
    }

    // Y se va, disolviéndose en la lluvia de la que salió.
    return {
        look: 0,
        lid: 1,
        presence: Math.max(0, 1 - (frame - T_SE_VA + 1) / SE_VA),
    };
}
