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

import { ruido } from '@/lib/system/v02';

/** Lo ancho que se dibuja, en caracteres. */
export const CARD_COLS = 46;

/** Cuántas líneas del contenido se enseñan. */
const BODY_LINES = 3;

export interface CardNote {
    title: string;
    content: string;
    /** Lo que se pinta en el pie: tamaño, edad… */
    meta: string;
    /** Con qué se decide si este cuadro quedó sin cerrar. Ver `sinCerrar`. */
    clave?: string;
}

/** Recorta a lo ancho, sin partir a mitad de un carácter visible. */
function corta(texto: string, ancho: number): string {
    if (texto.length <= ancho) return texto;
    return `${texto.slice(0, Math.max(0, ancho - 1))}>`;
}

/**
 * DE CADA CUÁNTO UN CUADRO SE QUEDA SIN CERRAR.
 *
 * Uno de cada cinco. Menos y no se ve nunca; más y la pantalla deja de leerse
 * como una versión sin terminar para leerse como una avería — que es la línea
 * que separa a esta versión de un fallo, y se cruza con una cifra.
 */
const SIN_CERRAR_ODDS = 0.2;

/**
 * UN CUADRO AL QUE LE FALTA UNA ESQUINA.
 *
 * ⚠ ERA LO ÚLTIMO QUE QUEDABA DE «interfaces a medio dibujar» (IDEAS · E2). Las
 * ETIQUETAS de esta versión ya salían a medias —sin traducir, con el nombre de
 * la variable, mal traducidas— pero los MARCOS estaban impecables: cuadros
 * perfectos dibujados por la misma gente que no llegó a escribir los textos.
 *
 * ⚠ SE QUITA UNA ESQUINA, NO SE ROMPE UN LADO. Un hueco en mitad de un lado se
 * lee como un fallo de pintado —parece que se perdió un carácter— y una esquina
 * sin rematar se lee como lo que es: alguien dibujó el cuadro a mano y no cerró.
 *
 * ⚠ Y LA LÍNEA SIGUE MIDIENDO LO MISMO: el `+` se cambia por un espacio, no se
 * quita. En una rejilla de caracteres una fila más corta descuadra el dibujo
 * entero, y eso lo fija un test desde el primer día.
 *
 * ⚠ DETERMINISTA POR CLAVE, como todo lo roto de esta versión: la misma tarjeta
 * está sin cerrar SIEMPRE. Si cambiara en cada repintado sería un cartel
 * parpadeando. Y sin clave no se toca nada — así los tests que no hablan de
 * esto ven el cuadro entero.
 */
function sinCerrar(lineas: string[], clave: string): string[] {
    if (clave === '') return lineas;

    const dado = ruido(`marco:${clave}`);
    if (dado >= SIN_CERRAR_ODDS) return lineas;

    /*
     * Cuál de las cuatro, con el MISMO dado: una tarjeta tiene UNA esquina
     * suelta, no cuatro posibles. Es el mismo reparto que usan las etiquetas
     * rotas para elegir su avería.
     */
    const cual = Math.floor((dado / SIN_CERRAR_ODDS) * 4) % 4;
    const ultima = lineas.length - 1;

    const abre = (linea: string) => ` ${linea.slice(1)}`;
    const cierra = (linea: string) => `${linea.slice(0, -1)} `;

    const copia = [...lineas];

    if (cual === 0) copia[0] = abre(copia[0]);
    else if (cual === 1) copia[0] = cierra(copia[0]);
    else if (cual === 2) copia[ultima] = abre(copia[ultima]);
    else copia[ultima] = cierra(copia[ultima]);

    return copia;
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
    /** Con qué se decide si este cuadro quedó sin cerrar. Ver `sinCerrar`. */
    clave?: string;
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

    return sinCerrar(lineas, pieza.clave ?? '');
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

    return sinCerrar(lineas, note.clave ?? '');
}
