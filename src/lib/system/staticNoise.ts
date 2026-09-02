// src/lib/system/staticNoise.ts

import type { Random } from '@/lib/system/lore';

/**
 * La estática del colapso.
 *
 * Se dibuja a 160×90 y se escala con `image-rendering: pixelated`: barato, y
 * además se ve más auténtico que el ruido fino — la estática de una televisión
 * tiene el grano gordo.
 *
 * POR QUÉ NO ES SAL Y PIMIENTA. La primera versión sorteaba blanco o negro por
 * píxel, y eso no se ve como una tele: se ve como grano de papel. Una señal de
 * verdad se lee FILA A FILA, así que el ruido está correlacionado
 * horizontalmente — cada línea tiene su propio brillo y su propio contraste, y
 * eso es lo que produce las vetas horizontales que el ojo reconoce como
 * estática.
 *
 * Encima de eso van dos cosas más: varios niveles de gris en vez de dos, que le
 * dan profundidad, y una barra de sincronismo que baja lentamente, que es la
 * marca de una señal que ni siquiera consigue engancharse.
 *
 * Está separado del componente para poder probar la forma del ruido sin montar
 * un canvas: jsdom no implementa el contexto 2D.
 */

export const NOISE_W = 160;
export const NOISE_H = 90;

/** Cuántos niveles de gris. Dos se ven digitales; seis, con grano. */
export const LEVELS = 6;

/** Alto de la barra de sincronismo, en filas. */
const SYNC_BAR_H = 7;

/** Cuántas filas baja la barra por fotograma. */
const SYNC_BAR_SPEED = 3;

/**
 * Pinta un fotograma de estática sobre un búfer RGBA.
 *
 * `frame` es el número de fotograma: mueve la barra de sincronismo, así que dos
 * llamadas con el mismo búfer y distinto `frame` dan imágenes distintas aunque
 * el azar esté clavado.
 */
export function paintNoise(
    data: Uint8ClampedArray,
    frame: number,
    random: Random = Math.random
): void {
    const syncTop = (frame * SYNC_BAR_SPEED) % (NOISE_H + SYNC_BAR_H);

    for (let y = 0; y < NOISE_H; y += 1) {
        // Cada fila arranca con su propio brillo y su propio contraste. Es lo
        // que crea las vetas horizontales: dos filas vecinas pueden ser una casi
        // blanca y la otra casi negra, y dentro de cada una el grano es parejo.
        const rowBias = random();
        const rowGain = 0.35 + random() * 0.65;

        // Una de cada tantas filas se cae del todo: la línea muerta de una
        // señal que perdió un renglón entero.
        const dropout = random() < 0.04;

        // La barra de sincronismo aclara la banda por la que va pasando.
        const enSync = y >= syncTop - SYNC_BAR_H && y < syncTop;

        for (let x = 0; x < NOISE_W; x += 1) {
            let v: number;

            if (dropout) {
                // Casi negra, con apenas un rastro de grano para que no parezca
                // una franja pintada.
                v = random() < 0.9 ? 0 : 1;
            } else {
                const mezcla = rowBias * (1 - rowGain) + random() * rowGain;
                v = Math.floor(mezcla * LEVELS);
                if (enSync) v = Math.min(LEVELS - 1, v + 2);
            }

            const nivel = Math.round((Math.min(LEVELS - 1, v) / (LEVELS - 1)) * 255);
            const i = (y * NOISE_W + x) * 4;

            // Monocroma: un solo valor para los tres canales. El color de esta
            // app está reservado a otra cosa.
            data[i] = nivel;
            data[i + 1] = nivel;
            data[i + 2] = nivel;
            data[i + 3] = 255;
        }
    }
}
