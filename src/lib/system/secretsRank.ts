// src/lib/system/secretsRank.ts

/**
 * Cuánto conocés del sistema, dicho de una forma que dé ganas de seguir.
 *
 * `7/28` es un dato. Una barra y un rango son una invitación: se ve de un
 * vistazo que falta mucho, y el nombre del escalón siguiente da curiosidad sin
 * decir de qué va.
 *
 * ⚠ NINGÚN RANGO NOMBRA UN SECRETO, y hay un test que lo prohíbe. Si un escalón
 * se llamara «el de la versión vieja», el contador dejaría de dar curiosidad
 * para dar instrucciones — y enseñar lo que todavía no encontraste es
 * exactamente lo único que no puede hacer.
 *
 * Todo puro, como el resto de los dibujos: se prueba sin montar nada.
 */

import type { Lang } from '@/i18n';

/** Lo ancho de la barra, sin contar los corchetes. */
export const BAR_CELLS = 14;

/**
 * Los escalones, del que no ha visto nada al que lo ha visto todo.
 *
 * Hablan de **quien mira**, no de lo que hay: describen una actitud —pasar por
 * encima, fijarse, insistir— y por eso ninguno se queda viejo cuando se añade
 * una pieza nueva.
 */
export const RANKS: readonly { es: string; en: string }[] = [
    { es: 'DE PASO', en: 'PASSING THROUGH' },
    { es: 'CURIOSO', en: 'CURIOUS' },
    { es: 'SE FIJA', en: 'PAYS ATTENTION' },
    { es: 'INSISTE', en: 'PERSISTENT' },
    { es: 'CONOCE LA CASA', en: 'KNOWS THE PLACE' },
    { es: 'NO QUEDA NADA', en: 'NOTHING LEFT' },
];

/**
 * La barra, dibujada con caracteres.
 *
 * El primer hallazgo SIEMPRE enciende una celda aunque no le toque por
 * proporción: redondearlo a cero sería decirle a alguien que lo que acaba de
 * encontrar no cuenta. Y la última sólo se enciende con todos, por el mismo
 * motivo al revés.
 */
/*
 * LOS DOS CARACTERES DE LA BARRA.
 *
 * Bloques, como una barra de desplazamiento, y no `#` y `.`: lo que se busca es
 * una barra, y `#` se lee como texto.
 *
 * ⚠ LOS DOS SALEN DEL MISMO BLOQUE UNICODE (U+2588 y U+2591) a propósito.
 * Ninguno está en JetBrains Mono, así que los pinta una fuente de reserva — pero
 * la MISMA para los dos, con lo que miden igual y la barra no se descuadra al
 * llenarse. Mezclar un bloque con un punto ASCII sí la habría descuadrado, que
 * es la trampa de REGLAS · C8.
 */
const LLENA = '█';
const VACIA = '░';

export function secretsBar(found: number, total: number): string {
    if (total <= 0) return `[${VACIA.repeat(BAR_CELLS)}]`;

    const proporcion = Math.min(1, Math.max(0, found / total));

    let llenas = Math.round(proporcion * BAR_CELLS);
    if (found > 0 && llenas === 0) llenas = 1;
    if (found < total && llenas === BAR_CELLS) llenas = BAR_CELLS - 1;

    return `[${LLENA.repeat(llenas)}${VACIA.repeat(BAR_CELLS - llenas)}]`;
}

/**
 * El escalón que te toca.
 *
 * El último se reserva para haberlos encontrado TODOS: darlo al noventa por
 * ciento le diría a alguien que ya terminó cuando le faltan tres.
 */
export function secretsRank(found: number, total: number, lang: Lang): string {
    if (total <= 0 || found <= 0) return RANKS[0][lang];
    if (found >= total) return RANKS[RANKS.length - 1][lang];

    // Los intermedios se reparten el tramo que queda entre el primero y el
    // último, que son los dos que tienen dueño fijo.
    const intermedios = RANKS.length - 2;
    const i = Math.min(
        intermedios,
        Math.max(1, Math.ceil((found / total) * intermedios))
    );

    return RANKS[i][lang];
}
