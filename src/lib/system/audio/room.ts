// src/lib/system/audio/room.ts

/**
 * La sala donde pasa todo.
 *
 * Es el salto de calidad más grande que tiene disponible este sistema y el más
 * barato: un `ConvolverNode` con una respuesta al impulso mete la tecla, el
 * relé y el zumbido DENTRO DEL MISMO CUARTO. Sin ella son tres sonidos sueltos
 * saliendo de un navegador; con ella son tres cosas que pasan en un sitio.
 *
 * ⚠ LA IR SE GENERA CON CÓDIGO Y NO SE DESCARGA. Es ruido que decae, o sea
 * aritmética: no gasta un solo byte del presupuesto de muestras, no arrastra
 * licencias, y se comprueba con tests normales sin `AudioContext` de por medio.
 *
 * El cuarto es PEQUEÑO Y APAGADO —una habitación con cosas dentro— y nunca una
 * catedral. Una cola larga es el error clásico: delata al instante que alguien
 * puso un efecto de reverberación en vez de un lugar.
 */

import type { Random } from '@/lib/system/lore';

/**
 * Cuánto dura la cola.
 *
 * Un tercio de segundo. Pasado el medio segundo deja de sonar a cuarto y
 * empieza a sonar a iglesia, y hay un test que fija ese techo.
 */
export const ROOM_SECONDS = 0.32;

/**
 * Con qué brusquedad se apaga.
 *
 * Cuanto más alto, más seco. Un cuarto con moqueta, un mueble y un CRT absorbe
 * mucho, así que esto va alto a propósito.
 */
export const ROOM_DECAY = 3.4;

/**
 * Construye la respuesta al impulso: un canal por lado.
 *
 * ⚠ LOS DOS CANALES LLEVAN RUIDO DISTINTO, y no es un detalle. Con los dos
 * lados idénticos la sala colapsa a un punto dentro de la cabeza y deja de
 * tener anchura; el cuarto se convierte en un eco. Que cada lado decaiga con su
 * propio ruido es lo único que lo vuelve un sitio con paredes.
 */
export function impulseResponse(
    sampleRate: number,
    seconds: number = ROOM_SECONDS,
    decay: number = ROOM_DECAY,
    random: Random = Math.random
): [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>] {
    // El parámetro de `Float32Array` no es adorno: `copyToChannel` exige un
    // respaldo de `ArrayBuffer` y rechaza el `ArrayBufferLike` que TypeScript
    // infiere por defecto, que además admitiría un `SharedArrayBuffer`.
    const largo = Math.floor(sampleRate * seconds);

    const izq = new Float32Array(largo);
    const der = new Float32Array(largo);

    for (let i = 0; i < largo; i += 1) {
        // El sobre exponencial: 1 al principio, casi 0 al final. Es lo que
        // convierte una ráfaga de ruido en una cola que se apaga.
        const sobre = (1 - i / largo) ** decay;

        izq[i] = (random() * 2 - 1) * sobre;
        der[i] = (random() * 2 - 1) * sobre;
    }

    return [izq, der];
}
