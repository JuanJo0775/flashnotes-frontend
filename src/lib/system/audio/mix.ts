// src/lib/system/audio/mix.ts

/**
 * La mezcla: cuánto suena cada cosa, y cada cuánto se le deja sonar.
 *
 * Es la respuesta concreta a «que no sea aturdidor», y son dos reglas:
 *
 *  1 · UN PRESUPUESTO DE VOLUMEN POR CATEGORÍA, en dBFS relativos al maestro.
 *      No se elige el volumen sonido a sonido —así es como una mezcla se
 *      descuadra— sino por familia, y las familias están ordenadas por cuánta
 *      atención merecen.
 *  2 · UNA COMPUERTA: nunca dos sonidos de la misma categoría dentro de
 *      GATE_MS. Sin esto, escribir rápido dispara una ametralladora.
 *
 * ⚠ ESTE MÓDULO NO TOCA WEB AUDIO Y NO DEBE HACERLO NUNCA. Es aritmética y un
 * mapa de marcas de tiempo. Que sea puro es lo que permite comprobar la
 * escalera de volúmenes sin sonar, y es lo que hace que no pese: en reposo no
 * hay temporizadores, ni nodos, ni nada corriendo. La compuerta es una
 * búsqueda, una resta y una comparación.
 */

/**
 * Las familias de sonido, ordenadas por atención.
 *
 * Son categorías de MEZCLA, no de origen: lo que las agrupa es cuánto derecho
 * tienen a que las oigas, no de qué módulo salen.
 */
export type SoundCategory =
    /** El zumbido del chasis. Suena casi siempre, así que es el más callado. */
    | 'ambience'
    /** Teclas y tics de teletipo. Lo que más veces va a sonar. */
    | 'keys'
    /** Los confirms de hallazgo: secretos y piezas. */
    | 'confirm'
    /** Fallos ambientales: el glitch, los relés, la avería cromática. */
    | 'glitch'
    /** El fallo total y el derrumbe. Pasa una vez y tiene que doler. */
    | 'failure';

/**
 * El pico de cada familia, en dBFS relativos al maestro.
 *
 * ⚠ EL ORDEN ES LA JERARQUÍA DE ATENCIÓN Y HAY UN TEST QUE LO ATA. El ambiente
 * es lo más bajo porque suena siempre; el fallo total lo más alto porque pasa
 * una vez. Subir las teclas «para oírlas mejor» hasta alcanzar los confirms
 * deja una máquina que grita al escribir y susurra cuando algo se rompe.
 *
 * ⚠ Y EL AMBIENTE NO ESTÁ «UN POCO» MÁS ABAJO: ESTÁ VEINTE DECIBELIOS ABAJO.
 *
 * Esta tabla mide PICOS, y ahí lo continuo hace trampa sin querer. El pico de un
 * zumbido ES su nivel medio, porque no para nunca; una tecla es un transitorio
 * de ocho milisegundos cuyo nivel medio está veinte decibelios por debajo de su
 * pico. A igual pico, lo continuo se oye muchísimo más fuerte.
 *
 * Estuvo en −34 —diez de separación— y luego en −44, y las DOS veces se reportó
 * que el fondo se comía las actividades. Veintiséis no es un número de gusto: es
 * la distancia típica entre el pico y el valor medio de un golpe corto, más el
 * margen de que un zumbido continuo no descansa nunca.
 *
 * ⚠ Y esto SÓLO significa algo desde que las fuentes del ambiente se normalizan:
 * antes sumaban 2,13 entre ellas, así que bajar el número de la tabla arreglaba
 * la mitad del problema y la otra mitad seguía intacta.
 */
export const PEAK_DBFS: Readonly<Record<SoundCategory, number>> = {
    ambience: -50,
    keys: -24,
    confirm: -18,
    glitch: -14,
    failure: -8,
};

/**
 * Cuánto sube el maestro, en decibelios.
 *
 * ⚠ ERA UN AGUJERO DEL DISEÑO Y SE REPORTÓ JUGANDO: «el volumen está muy bajo,
 * me toca subirle mucho el sonido al compu».
 *
 * El presupuesto de arriba es RELATIVO: dice quién suena más que quién, y lo
 * hace bien. Pero nadie fijaba el nivel ABSOLUTO, así que lo más fuerte de todo
 * el producto salía a −8 dBFS y una tecla a −24 — correcto entre ellos, y
 * bajísimo contra cualquier otra pestaña del navegador.
 *
 * Y los dos síntomas reportados eran el mismo fallo: subir el equipo para oír la
 * tecla convierte el zumbido del ambiente en un tono de prueba.
 *
 * ⚠ ES UN SOLO NÚMERO AL FINAL DE LA CADENA, y por eso no desordena nada. Subir
 * las teclas «para oírlas mejor» habría desarmado la jerarquía de atención; esto
 * sube todo por igual y deja la escalera intacta.
 */
export const MASTER_DB = 8;

/**
 * El hueco mínimo entre dos sonidos de la misma familia.
 *
 * Sesenta milisegundos. Escribir rápido son unos 40 ms entre teclas, así que
 * la compuerta recorta justo las ráfagas y deja pasar el tecleo normal.
 */
export const GATE_MS = 60;

/** De decibelios a ganancia lineal, que es lo que entiende un `GainNode`. */
export function dbToGain(db: number): number {
    // `10 ** -Infinity` ya es 0 exacto, así que el silencio de verdad del
    // derrumbe sale solo y no hace falta un caso aparte.
    return 10 ** (db / 20);
}

/** El pico de una familia, ya convertido a ganancia. */
export function gainFor(category: SoundCategory): number {
    return dbToGain(PEAK_DBFS[category]);
}

/**
 * Cuándo sonó por última vez cada familia.
 *
 * Un mapa y nada más: sin temporizadores que mantener ni que limpiar. Cinco
 * entradas como mucho, que es todo lo que este módulo llega a ocupar.
 */
const ultimo = new Map<SoundCategory, number>();

/**
 * ¿Se le deja sonar a esta familia ahora?
 *
 * ⚠ UN RECHAZO NO CORRE LA VENTANA, y esto es lo delicado. Si cada disparo
 * rechazado empujara el reloj otros GATE_MS, mientras no pararas de escribir no
 * volvería a sonar nada: la tecla sonaría sólo al dejar de teclear, siempre
 * tarde y despegada del gesto. La marca se mueve únicamente cuando algo suena
 * de verdad.
 *
 * Y cada familia tiene su puerta, no hay una global: el glitch y la tecla
 * ocurren a la vez constantemente —escribís y la máquina falla encima— y con
 * una sola puerta uno se comería al otro según cuál llegara primero.
 */
export function allow(category: SoundCategory, now: number = Date.now()): boolean {
    const previo = ultimo.get(category);

    if (previo !== undefined && now - previo < GATE_MS) return false;

    ultimo.set(category, now);
    return true;
}

/** Olvida todas las marcas. Para los tests y para cuando se apaga el sonido. */
export function resetGate() {
    ultimo.clear();
}
