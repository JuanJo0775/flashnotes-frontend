// src/lib/system/v02Loading.ts

/**
 * La pantalla de carga de la v0.2.
 *
 * Una barra de progreso dibujada con caracteres, y MAL HECHA: el porcentaje se
 * pasa de cien, pega saltos hacia atrás y el total no lo sabe nadie. Es la barra
 * que escribe quien no tiene forma de saber cuánto queda y la pone igual, porque
 * una pantalla de carga sin barra parecía peor que una que miente.
 *
 * Recortarla a 100 % sería arreglarla. Una barra que dice `137%` es exactamente
 * lo que se ve cuando el total era una suposición, y se reconoce al verlo.
 *
 * Pura y probada carácter a carácter, como el resto de los dibujos.
 */

/** Lo ancho del dibujo entero, contando corchetes y número. */
export const BAR_COLS = 40;

/** Lo que ocupa el número al final: ` 100%` y su sitio reservado. */
const HUECO_NUMERO = 6;

export function renderLoadingBar(pct: number): string {
    const dentro = BAR_COLS - HUECO_NUMERO - 2;

    // El relleno se recorta al dibujo aunque el número no: la barra se planta al
    // llegar al borde y el porcentaje sigue subiendo solo. Ver las dos cosas a
    // la vez —el tope y el número pasado— es lo que delata que nadie las ató.
    const llenos = Math.max(0, Math.min(dentro, Math.round((pct / 100) * dentro)));

    const barra = `[${'#'.repeat(llenos)}${'.'.repeat(dentro - llenos)}]`;
    const numero = `${Math.round(pct)}%`;

    return `${barra}${numero.padStart(HUECO_NUMERO)}`;
}

/**
 * Cuánto dice que lleva, latido a latido.
 *
 * Avanza a tirones y de vez en cuando RETROCEDE: una barra que se corrige a sí
 * misma es lo que hacen las que miden mal, y es más creíble que una que sube
 * suave. Nunca se planta en un número: seguir subiendo pasado el cien es lo que
 * cuenta que el total era inventado.
 */
export function fakeProgress(latidos: number, rand: () => number = Math.random): number {
    const base = latidos * 7;
    const tiron = rand() < 0.25 ? -Math.round(rand() * 12) - 4 : Math.round(rand() * 9);

    return Math.max(0, base + tiron);
}
