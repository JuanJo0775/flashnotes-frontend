// src/lib/system/asciiNoise.ts

import type { Random } from '@/lib/system/lore';

/**
 * La estática del colapso, hecha de caracteres.
 *
 * POR QUÉ NO ES RUIDO DE PÍXELES. El ruido de píxeles es la estática de una
 * TELEVISIÓN, y esta app es una terminal de texto: se leía como un efecto de
 * otra familia visual pegado encima de todo lo demás. Una terminal no hace
 * estática, hace basura — la misma rejilla de celdas de siempre llena de glifos
 * que no significan nada.
 *
 * POR QUÉ HAY MODOS, Y POCOS GLIFOS EN CADA UNO. La primera versión de esto
 * mezclaba treinta caracteres distintos en cada fotograma y quedaba peor que el
 * ruido de píxeles: una sopa sin forma. Lo que hace que una interferencia se vea
 * BIEN es la estructura, no la variedad — rayas gruesas, o granito fino, o casi
 * nada. Así que cada modo usa dos o tres caracteres y basta, y la señal va
 * saltando de un modo a otro como si buscara engancharse y no lo consiguiera.
 *
 * Módulo puro: devuelve texto. Quien lo pinta sólo tiene que escribirlo.
 */

export type NoiseMode = 'snow' | 'bars' | 'dots' | 'nosignal';

export const NOISE_MODES: readonly NoiseMode[] = ['snow', 'bars', 'dots', 'nosignal'];

/**
 * El repertorio de cada modo. Corto a propósito.
 *
 * `bars` va con bloques enteros y medios: da masa. `snow` con los sombreados,
 * que tienen peso pero dejan respirar. `dots` con puntuación fina. `nosignal`
 * con bloques sueltos sobre el vacío.
 */
const GLYPHS: Record<NoiseMode, string> = {
    bars: '█▓▌',
    // Pesado a ligero, y REPETIDO para pesar la tirada: `░` sale seis de cada
    // nueve veces y `▓` sólo una. Con los tres por igual, la nieve salía como un
    // muro blanco — todos los sombreados son claros y a media densidad tapan la
    // pantalla entera.
    snow: '░░░░░░▒▒▓',
    dots: '·:.',
    nosignal: '▄▀',
};

/** Cuántos fotogramas aguanta un modo antes de cambiar. */
const MODE_FRAMES = 5;

/**
 * Qué textura toca en este fotograma.
 *
 * El orden es fijo y no aleatorio: una secuencia se lee como un aparato
 * recorriendo estados, y el azar puro se lee como parpadeo. `nosignal` va
 * intercalado entre las densas para que la pantalla respire — sin esos huecos,
 * dos segundos de ruido continuo cansan y dejan de dar miedo.
 */
const MODE_CYCLE: readonly NoiseMode[] = [
    'snow',
    'bars',
    'nosignal',
    'dots',
    'snow',
    'nosignal',
];

export function modeForFrame(frame: number): NoiseMode {
    const paso = Math.floor(frame / MODE_FRAMES) % MODE_CYCLE.length;
    return MODE_CYCLE[paso];
}

/** Un carácter del repertorio de un modo. */
function glyph(mode: NoiseMode, random: Random): string {
    const set = GLYPHS[mode];
    return set[Math.floor(random() * set.length)];
}

/**
 * Un fotograma de interferencia.
 *
 * `frame` desplaza las estructuras, así que la textura se MUEVE en vez de
 * titilar en el sitio — que es la diferencia entre una señal y un ruido.
 */
export function noiseFrame(
    cols: number,
    rows: number,
    frame: number,
    mode: NoiseMode = modeForFrame(frame),
    random: Random = Math.random
): string {
    if (rows <= 0 || cols <= 0) return '';

    const lineas: string[] = [];

    for (let y = 0; y < rows; y += 1) {
        lineas.push(renderRow(cols, y, frame, mode, random));
    }

    return lineas.join('\n');
}

function renderRow(
    cols: number,
    y: number,
    frame: number,
    mode: NoiseMode,
    random: Random
): string {
    switch (mode) {
        // Rayas: bandas horizontales gruesas que bajan. Es la más limpia de las
        // cuatro y la que mejor se lee como avería de señal.
        case 'bars': {
            const banda = Math.floor((y + frame) / 3) % 3;
            if (banda === 2) return ' '.repeat(cols);

            const ch = glyph(mode, random);
            // Los bordes de la banda se deshilachan: una banda de canto perfecto
            // parecería una caja dibujada, no una interferencia.
            return Array.from({ length: cols }, () =>
                random() < 0.92 ? ch : ' '
            ).join('');
        }

        // Nieve: grano medio con densidad propia por fila. La lectura fila a
        // fila es lo que produce las vetas que el ojo reconoce como ruido.
        case 'snow': {
            // De 0,12 a 0,5. Antes iba de 0,2 a 0,9 y la media quedaba en 0,55:
            // eso no es nieve, es una pared. Acá el grano tiene peso y aún así
            // se ve el negro por debajo, que es lo que lo hace respirar.
            const densidad = 0.12 + random() * 0.38;
            return Array.from({ length: cols }, () =>
                random() < densidad ? glyph(mode, random) : ' '
            ).join('');
        }

        // Puntos: granito fino y escaso. Es el respiro entre las densas.
        case 'dots': {
            return Array.from({ length: cols }, () =>
                random() < 0.18 ? glyph(mode, random) : ' '
            ).join('');
        }

        // Sin señal: casi todo vacío, con algún trazo suelto. Una pantalla que
        // ya ni ruido consigue producir.
        case 'nosignal':
        default: {
            const viva = (y + frame) % 7 === 0;
            if (!viva) return ' '.repeat(cols);

            return Array.from({ length: cols }, () =>
                random() < 0.45 ? glyph(mode, random) : ' '
            ).join('');
        }
    }
}
