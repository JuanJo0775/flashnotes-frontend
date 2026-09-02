// src/lib/system/morse.ts

/**
 * El código que el reloj esconde.
 *
 * DE DÓNDE SALE: el pie de la barra lateral enseñaba `--:--:--` cuando no tenía
 * hora que mostrar, y eso ya parecía morse. La pieza no se inventó — se leyó de
 * algo que llevaba ahí desde el principio. Es la regla del lore aplicada al pie
 * de la letra: nada se inventa, se apoya en algo que ya era cierto.
 *
 * QUÉ HACE: tres clics seguidos sobre la hora la cambian por una palabra en
 * morse. Descifrada, es el comando que abre la v0.2.
 *
 * CAMBIA POR SESIÓN. La palabra se sortea al cargar la página y vive sólo en
 * memoria: la de hoy no sirve mañana, y contarla no sirve de nada. Se resuelve
 * mirando, no preguntando.
 *
 * ⚠ SÓLO PUNTOS Y RAYAS, y el separador es el mismo `:` del reloj. Así el código
 * se lee como una hora rota y no como un adorno pegado encima — que es lo que lo
 * hace encontrable sin explicarlo.
 */

/**
 * Las letras que se usan.
 *
 * Un subconjunto corto a propósito: son las que dan códigos BREVES —de una a
 * tres señales— para que la palabra entera quepa donde cabía `--:--:--` sin
 * volverse un muro. Con letras de cinco señales el hueco se desbordaba.
 */
export const MORSE: Readonly<Record<string, string>> = {
    A: '.-',
    D: '-..',
    E: '.',
    G: '--.',
    I: '..',
    K: '-.-',
    M: '--',
    N: '-.',
    O: '---',
    R: '.-.',
    S: '...',
    T: '-',
    U: '..-',
    W: '.--',
};

/**
 * Las palabras que puede tocar.
 *
 * Todas se escriben SÓLO con las letras de arriba, todas son cortas, y todas
 * dicen algo del sistema: no son claves al azar, son lo que la máquina diría si
 * pudiera. Un test fija que se puedan codificar.
 */
export const WORDS: readonly string[] = [
    'MODO',
    'DIARIO',
    'RESTO',
    'SIGUE',
    'ANTES',
    'AGUA',
    'NIDO',
    'TARDE',
    'MADERA',
    'ESTAR',
];

/** Codifica una palabra. Las letras se separan con el `:` del reloj. */
export function toMorse(word: string): string {
    return word
        .toUpperCase()
        .split('')
        .map((c) => MORSE[c] ?? '')
        .filter((c) => c.length > 0)
        .join(':');
}

/**
 * La palabra de ESTA sesión.
 *
 * En memoria y no en almacenamiento: recargar da otra, y ésa es la gracia. Si se
 * guardara, la palabra de un día serviría al siguiente y el código dejaría de ser
 * de la sesión para ser un secreto más que se copia y se pega.
 */
let palabra: string | null = null;

export function sessionWord(random: () => number = Math.random): string {
    if (palabra === null) {
        palabra = WORDS[Math.min(WORDS.length - 1, Math.floor(random() * WORDS.length))];
    }
    return palabra;
}

/** El código que enseña el reloj. */
export function sessionMorse(random: () => number = Math.random): string {
    return toMorse(sessionWord(random));
}

/** ¿Esta línea es la palabra de la sesión, tecleada como comando? */
export function isSessionWord(name: string): boolean {
    return palabra !== null && name.toUpperCase() === palabra;
}

/** Sólo para los tests y para `//reset`. */
export function forgetWord() {
    palabra = null;
}
