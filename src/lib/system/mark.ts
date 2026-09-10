// src/lib/system/mark.ts

/**
 * LA MARCA DE LA CASA: `[▌]`.
 *
 * ⚠ QUÉ PROBLEMA RESUELVE. El icono de la pestaña era el de Next —el que trae
 * la plantilla, 26 KB de logo ajeno— en una app que tiene catálogo de color,
 * catálogo de iconos y un test que ata cada glifo a su documento. La pestaña es
 * lo ÚNICO del producto que se ve sin abrirlo, y llevaba el nombre de otro.
 *
 * ⚠ QUÉ DIBUJA, Y POR QUÉ ES ÉSTE. Los dos únicos gestos que esta casa repite
 * en todas partes: los CORCHETES —cada icono del sistema los lleva, el rótulo
 * los lleva, `[FLASH-NOTES v1.0]`— y el CURSOR DE BLOQUE, que es lo único que
 * se mueve de forma continua en toda la interfaz. Juntos dicen exactamente lo
 * que es la app: una terminal esperando a que escribas. No hace falta una letra
 * dentro; a 16 píxeles una letra es una mancha.
 *
 * ⚠ Y SE DIBUJA CON RECTÁNGULOS, no con trazos ni curvas. A 16 píxeles un
 * trazo de 1,5 px lo pinta el navegador con antialias y la marca sale borrosa.
 * Todas las medidas de aquí abajo son PARES sobre una rejilla de 32, así que al
 * dividir por dos —el tamaño real de una pestaña— cada borde cae en un píxel
 * entero. Es la misma disciplina que el resto: nada suave.
 */

/** Un rectángulo de la marca, en unidades de la rejilla. */
export interface MarkRect {
    x: number;
    y: number;
    w: number;
    h: number;
}

/**
 * La rejilla.
 *
 * ⚠ 32 Y NO 16: a 16 el brazo del corchete tendría que medir 1 unidad y no
 * habría forma de hacerlo más fino que el bloque. Con 32 el trazo mide 2 —un
 * píxel en la pestaña— y el bloque 8, que es la diferencia de peso que hace que
 * una cosa sea el marco y la otra el contenido.
 */
export const MARK_GRID = 32;

/**
 * Los siete rectángulos.
 *
 * Dos corchetes de tres piezas cada uno —el palo y sus dos brazos— y el bloque
 * en medio.
 *
 * ⚠ EL BLOQUE NO LLENA EL HUECO. Mide 8 × 12 sobre 32: deja aire arriba, abajo
 * y a los lados. Un bloque que toca los corchetes se lee como una barra de
 * carga o una pila; separado se lee como lo que es, un cursor dentro de su
 * paréntesis.
 */
export const MARK_RECTS: readonly MarkRect[] = [
    // Corchete izquierdo.
    { x: 4, y: 4, w: 2, h: 24 },
    { x: 4, y: 4, w: 6, h: 2 },
    { x: 4, y: 26, w: 6, h: 2 },
    // Corchete derecho, en espejo.
    { x: 26, y: 4, w: 2, h: 24 },
    { x: 22, y: 4, w: 6, h: 2 },
    { x: 22, y: 26, w: 6, h: 2 },
    // Y el cursor.
    { x: 12, y: 10, w: 8, h: 12 },
];

/**
 * Los dos colores, en sus dos temas.
 *
 * ⚠ ACÁ SÍ SE COPIAN LOS HEX, y es la única parte de la identidad donde pasa.
 * El banco los lee del navegador con `getComputedStyle` justamente para no
 * copiarlos; un archivo `.svg` suelto en el disco no tiene navegador que
 * preguntar, y el icono de la pestaña lo pinta el navegador ANTES de cargar una
 * sola línea de CSS de la app. No hay a quién preguntarle.
 *
 * Lo que sí hay es un test que ata estos cuatro valores contra `globals.css` en
 * las dos direcciones, que es lo que impide que el día que se retoque el tema
 * la pestaña se quede con el color viejo.
 */
export const MARK_COLORS = {
    /** El lienzo, `--color-primary`. */
    ground: { light: '#e6e4de', dark: '#121110' },
    /** La tinta, `--color-ink`. */
    ink: { light: '#12110d', dark: '#e8e5dc' },
} as const;

/**
 * La marca, escrita como archivo.
 *
 * ⚠ EL TEMA VIVE DENTRO DEL SVG. Un icono de pestaña no hereda nada de la
 * página: si fuera tinta sobre transparente, en una barra oscura desaparecería.
 * Lleva su propio lienzo y su propia consulta de medios, así que se da vuelta
 * con el sistema igual que se da vuelta la app.
 *
 * ⚠ Y LOS COLORES VAN EN UNA HOJA, no en atributos. `fill="var(--tinta)"` no
 * funciona: `var()` es válido en una declaración de CSS, no en un atributo de
 * presentación, y el navegador lo descarta sin avisar — se ve negro y nadie
 * entiende por qué. Por eso cada rectángulo lleva clase.
 */
export function markSvg(): string {
    const { ground, ink } = MARK_COLORS;
    const caja = `0 0 ${MARK_GRID} ${MARK_GRID}`;

    const piezas = MARK_RECTS.map(
        (r) => `    <rect class="i" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}"/>`,
    ).join('\n');

    return [
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${caja}" width="${MARK_GRID}" height="${MARK_GRID}">`,
        '    <style>',
        `        .g { fill: ${ground.light} }`,
        `        .i { fill: ${ink.light} }`,
        '        @media (prefers-color-scheme: dark) {',
        `            .g { fill: ${ground.dark} }`,
        `            .i { fill: ${ink.dark} }`,
        '        }',
        '    </style>',
        `    <rect class="g" width="${MARK_GRID}" height="${MARK_GRID}"/>`,
        piezas,
        '</svg>',
        '',
    ].join('\n');
}
