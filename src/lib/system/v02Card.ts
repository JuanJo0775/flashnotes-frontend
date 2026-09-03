// src/lib/system/v02Card.ts

/**
 * Una tarjeta de nota, dibujada con caracteres.
 *
 * En la v0.2 las tarjetas no son cajas con borde: son **cuadros dibujados** con
 * `+`, `-` y `|`, como se dibujaba un recuadro antes de que hubiera recuadros.
 * Los huecos se rellenan con puntos y guiones porque nadie había resuelto todavía
 * cómo alinear dos cosas en extremos opuestos.
 *
 * ES UNA FUNCIÓN PURA que devuelve líneas de texto: se prueba entera, carácter a
 * carácter, sin montar nada. La misma decisión que el corte del pong, y por el
 * mismo motivo.
 *
 * ⚠ TODO ASCII IMPRIMIBLE. Los bloques y los marcos de caja (`█ ┌ ─`) NO están
 * en JetBrains Mono: los pinta una fuente de reserva con otras métricas y el
 * cuadro se descuadra fila a fila. Es la trampa que hizo bailar el corte del pong
 * — ver REGLAS · C8. Con `+ - |` no hay nada que medir.
 */

/** Lo ancho que se dibuja, en caracteres. */
export const CARD_COLS = 46;

/** Cuántas líneas del contenido se enseñan. */
const BODY_LINES = 3;

export interface CardNote {
    title: string;
    content: string;
    /** Lo que se pinta en el pie: tamaño, edad… */
    meta: string;
}

/** Recorta a lo ancho, sin partir a mitad de un carácter visible. */
function corta(texto: string, ancho: number): string {
    if (texto.length <= ancho) return texto;
    return `${texto.slice(0, Math.max(0, ancho - 1))}>`;
}

/** Una fila del cuadro: `| contenido        |`. */
function fila(texto: string, interior: number): string {
    return `| ${corta(texto, interior).padEnd(interior)} |`;
}

/**
 * El cuadro entero.
 *
 * Las líneas miden todas exactamente `CARD_COLS`, y un test lo fija: en una
 * rejilla de caracteres, una fila más corta descuadra el dibujo aunque los
 * glifos alineen.
 */
export function renderCard(note: CardNote): string[] {
    const interior = CARD_COLS - 4;

    const cuerpo = note.content.split('\n').filter((l) => l.trim().length > 0);

    const lineas: string[] = [];

    // Arriba, con el título metido en la propia línea del marco: así se lee como
    // una etiqueta pegada al cuadro y no como una primera fila cualquiera.
    const titulo = ` ${corta(note.title, interior - 2)} `;
    lineas.push(`+-${titulo}${'-'.repeat(Math.max(0, interior - titulo.length))}-+`);

    for (let i = 0; i < BODY_LINES; i += 1) {
        lineas.push(fila(cuerpo[i] ?? '', interior));
    }

    // El pie: los puntos rellenan el hueco hasta el dato, que es como se
    // alineaban dos cosas en extremos opuestos antes de que hubiera con qué.
    const puntos = Math.max(1, interior - note.meta.length - 1);
    lineas.push(`| ${'.'.repeat(puntos)} ${note.meta.padStart(0)} |`.slice(0, CARD_COLS - 1) + '|');

    lineas.push(`+${'-'.repeat(CARD_COLS - 2)}+`);

    return lineas;
}
