// src/lib/system/audio/speaker.ts

/**
 * El altavoz malo y la caja de plástico.
 *
 * Ésta es la jugada más rentable de todo el sistema de sonido, y conviene
 * entender por qué antes de tocarla: las máquinas viejas no sonaban así porque
 * emitieran sonidos raros, sino porque el altavoz era un cono de cinco
 * centímetros metido en una carcasa que resonaba. No bajaba de 200 Hz, no subía
 * de 6 kHz, y saturaba en cuanto se le pedía volumen.
 *
 * Modelado UNA VEZ sobre el bus entero, cualquier cosa que se le meta ya sale
 * de época. Sale gratis para todos los sonidos a la vez, presentes y futuros, y
 * evita el trabajo imposible de hacer «sonar viejo» a cada voz por separado.
 *
 * Son dos piezas: la banda que el cono deja pasar, y la curva con la que se
 * dobla lo que se le pide de más.
 */

/** Por debajo de esto el cono no mueve aire. Adiós a los graves. */
export const BAND_LOW_HZ = 200;

/** Y por encima tampoco. Es lo que le quita el brillo digital a todo. */
export const BAND_HIGH_HZ = 6_000;

/**
 * Cuánto satura.
 *
 * Suave a propósito: lo que se busca es cuerpo, no distorsión audible. Si se
 * nota que hay un efecto, está de más.
 */
export const SATURATION = 2.2;

/**
 * La tabla que se le pasa a un `WaveShaperNode`.
 *
 * `tanh` normalizada: manda ±1 a ±1 exactos y va perdiendo pendiente según se
 * acerca a los extremos, que es lo que aplasta los picos y genera los armónicos
 * IMPARES que el oído lee como «con cuerpo».
 *
 * ⚠ LA CURVA TIENE QUE SER IMPAR. Una curva asimétrica genera armónicos pares,
 * suena a avería en vez de a altavoz, y mete corriente continua en el bus — o
 * sea, deja el altavoz de quien escucha empujado hacia un lado.
 *
 * Con `amount` en cero es la identidad, y eso no es un caso raro: el banco de
 * pruebas necesita poder apagar el parlante para comparar, y un «apagado» que
 * siguiera coloreando no serviría de nada.
 */
export function saturationCurve(amount: number = SATURATION, samples: number = 4_097): Float32Array {
    const curva = new Float32Array(samples);
    const techo = Math.tanh(amount);

    for (let i = 0; i < samples; i += 1) {
        // De índice a la entrada del shaper, que va de −1 a 1.
        const x = (i / (samples - 1)) * 2 - 1;

        curva[i] = amount === 0 ? x : Math.tanh(amount * x) / techo;
    }

    return curva;
}
