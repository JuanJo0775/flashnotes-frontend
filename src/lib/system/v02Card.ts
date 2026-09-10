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
 * Y EL CUADRO DE UNA PIEZA DE LA COLECCIÓN.
 *
 * ⚠ POR QUÉ NO SIRVE `renderCard`, que ya dibuja cuadros: aquélla es para una
 * NOTA —tres líneas de texto y los renglones en blanco fuera, porque en una nota
 * no dicen nada— y acá los renglones en blanco son PARTE DEL DIBUJO. Pasar el
 * arte por ella lo dejaba apretado contra sí mismo y recortado a tres líneas.
 *
 * ⚠ MISMO ANCHO QUE LAS NOTAS, y eso no es ahorro: las dos rejillas se ven en la
 * misma versión, y dos anchos distintos se leen como dos programas. Cuarenta y
 * seis columnas dan justo para las cuarenta del dibujo con su aire.
 *
 * ⚠ Y EL DIBUJO NO SE TOCA. Lo que entra ya viene leído por la versión vieja
 * —comido, cortado o vacío—; acá sólo se le pone el marco alrededor. Una función
 * que dibuja marcos no decide además qué se ve dentro.
 */
export function renderArtCard(pieza: {
    /** El número de casilla, `07/16`. Va metido en la línea de arriba. */
    title: string;
    /** El dibujo, tal como toque enseñarlo. Puede venir vacío. */
    art: string;
    /** El pie: el nombre, o por qué no hay nombre. */
    foot: string;
}): string[] {
    const interior = CARD_COLS - 4;
    const lineas: string[] = [];

    const titulo = ` ${corta(pieza.title, interior - 2)} `;
    lineas.push(`+-${titulo}${'-'.repeat(Math.max(0, interior - titulo.length))}-+`);

    /*
     * ⚠ LOS RENGLONES EN BLANCO SE QUEDAN. Son el aire del dibujo: quitarlos
     * —que es lo que hace la tarjeta de una nota— apelmaza la pieza y deja de
     * parecerse a lo que es.
     */
    const cuerpo = pieza.art.length > 0 ? pieza.art.split('\n') : [];
    for (const linea of cuerpo) lineas.push(fila(linea, interior));

    /*
     * Y un renglón vacío antes del pie, siempre. Sin él, el nombre queda pegado
     * a la última línea del dibujo y parece formar parte de él.
     */
    lineas.push(fila('', interior));
    lineas.push(fila(pieza.foot, interior));

    lineas.push(`+${'-'.repeat(CARD_COLS - 2)}+`);

    return lineas;
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
