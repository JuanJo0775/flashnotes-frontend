// src/lib/system/artHints.ts

/**
 * Las tres pistas que empujan hacia `//art`, y por qué son tres.
 *
 * Ganar una pieza dejaba un premio en la mano y ninguna indicación de dónde
 * mirarlo: el aviso no dice el nombre —a propósito— y `//art` sólo salía por la
 * fuga de `//help`, que es azar. Se podían juntar cinco piezas sin saber que
 * había una colección.
 *
 * Tres pistas de intensidad creciente, y ninguna dice «tecleá esto»:
 *
 *   1 · EL PARPADEO. Al ganar, la pestaña de colección se VISLUMBRA un instante
 *       con el nombre revuelto y se apaga. No deja entrar. Dice «hay un sitio»,
 *       no dice cuál ni cómo.
 *   2 · EL RESTO EN LA PAPELERA (`artScrap.ts`). Si no viste el parpadeo, ahí
 *       queda el dibujo comido con las letras del comando repartidas.
 *   3 · LA BARRA DE ESTADO. Si tampoco, el `[TODO_BIEN?]` de siempre cambia unos
 *       segundos por `[BUEN ARTE]` y vuelve solo. Es la más descarada y la
 *       última.
 *
 * Las tres se apagan en cuanto tecleás `//art`: son un empujón, no un mueble.
 *
 * Módulo con estado propio y sin DOM: los componentes se suscriben.
 */

/*
 * ⚠ ESTE MÓDULO NO IMPORTA `asciiArt`, Y ES A PROPÓSITO.
 *
 * Quien enciende las pistas es `awardPiece` y quien las apaga es `revealArt`,
 * las dos en `asciiArt`. Si además éste leyera de allí habría un ciclo entre los
 * dos módulos: funciona con los empaquetadores de hoy porque las llamadas son en
 * tiempo de ejecución, y revienta el día que alguien mueva algo al cuerpo del
 * módulo. La dependencia va en UNA dirección y acá sólo hay relojes.
 */

/** Cuánto dura el parpadeo de la pestaña. */
export const GLIMPSE_MS = 1_200;

/** Y cuánto se queda el rótulo cambiado en la barra de estado. */
export const BRAG_MS = 4_000;

/**
 * Lo que dice la barra cuando presume.
 *
 * No menciona el comando: dice que hay algo que le gusta. Es la misma voz naíf
 * del `LINDO` del panel — la máquina no sabe qué son los dibujos, sólo que le
 * parecen bonitos.
 */
export const BRAG: Readonly<Record<'es' | 'en', string>> = {
    es: '[BUEN ARTE]',
    en: '[ART OK]',
};

const oyentes = new Set<() => void>();

let destelloHasta = 0;
let alardeHasta = 0;

function avisar() {
    oyentes.forEach((o) => o());
}

export function subscribeHints(oyente: () => void): () => void {
    oyentes.add(oyente);
    return () => {
        oyentes.delete(oyente);
    };
}

/**
 * Acabás de ganar una pieza: enciende las pistas.
 *
 * Quien decide si TOCA encenderlas es `awardPiece`: sólo llama acá cuando la
 * pieza es nueva y el catálogo sigue sin mirarse. Acá dentro no hay reglas,
 * sólo relojes — y ésa es la razón de que este módulo no dependa de nada.
 */
export function hintEarned(ahora: number = Date.now()) {
    destelloHasta = ahora + GLIMPSE_MS;
    alardeHasta = ahora + BRAG_MS;
    avisar();
}

/**
 * TE LLEVASTE UNA PIEZA: la barra lo dice, y nada más.
 *
 * ⚠ ESTO ESTABA PEGADO A `hintEarned` Y SE REPORTÓ JUGANDO: «cuando sale la
 * broma del reset y sale el `:)` se nos debe desbloquear un arte, y eso no
 * pasó». La pieza SÍ entraba —se comprobó ejecutando el camino entero— pero no
 * se veía NADA: el alarde vivía dentro de la función que enciende las pistas, y
 * esa función sólo corre la primera vez.
 *
 * O sea que a partir de la primera pieza abierta, ganar una llegaba en silencio.
 * Un premio que no se anuncia no es un premio: es un cambio en un contador que
 * nadie está mirando.
 *
 * Son dos cosas distintas y ahora son dos funciones:
 *
 *  · EL ALARDE — «hay algo que me gusta» — pasa CADA VEZ que ganás una. Es el
 *    acuse de recibo de que te llevaste algo.
 *  · LA PISTA A LA PESTAÑA — el destello que te dice DÓNDE mirar — pasa una
 *    sola vez, porque enseñar dos veces dónde está la colección es un tutorial.
 */
export function bragEarned(ahora: number = Date.now()) {
    alardeHasta = ahora + BRAG_MS;
    avisar();
}

/**
 * La colección cambió: avisa a quien esté mirando, y nada más.
 *
 * ⚠ NO ENCIENDE NINGUNA PISTA, y por eso es otra función. `hintEarned` decide
 * además que hay que destellar la pestaña, y eso sólo toca la primera vez.
 * Ganar una pieza pasa SIEMPRE, y quien quiera enterarse de todas —el sonido,
 * por ejemplo— necesitaba un aviso que no llevara reglas pegadas.
 */
export function artChanged() {
    avisar();
}

/** ¿Se está vislumbrando la pestaña ahora mismo? */
export function isGlimpsing(ahora: number = Date.now()): boolean {
    return ahora < destelloHasta;
}

/** ¿Y la barra de estado está presumiendo? */
export function isBragging(ahora: number = Date.now()): boolean {
    return ahora < alardeHasta;
}

/**
 * Las apaga todas.
 *
 * Lo llama `revealArt`: en cuanto mirás el catálogo las pistas ya cumplieron, y
 * una pista que sigue insistiendo después de haber servido deja de ser una pista
 * para ser un pesado.
 */
export function clearHints() {
    destelloHasta = 0;
    alardeHasta = 0;
    avisar();
}
