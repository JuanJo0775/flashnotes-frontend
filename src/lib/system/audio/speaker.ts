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
 * `tanh(k·x)/k`: pendiente UNIDAD en el origen y cada vez menos según se acerca
 * a los extremos. Eso aplasta los picos y genera los armónicos IMPARES que el
 * oído lee como «con cuerpo».
 *
 * ⚠ SE DIVIDE POR `k` Y NO POR `tanh(k)`, Y LA DIFERENCIA COSTÓ QUE NO SE OYERA
 * NADA. Normalizando para que ±1 caiga en ±1 —que es lo que parece correcto—
 * las señales pequeñas salen multiplicadas por `k/tanh(k)`, o sea que la
 * cantidad de saturación se convierte en un control de volumen escondido. Con
 * la bocinita a 2,2 y el aire a 0,6 eso eran SEIS decibelios de desequilibrio
 * que nadie escribió, encima de los que el §8 reparte a propósito: la tecla
 * salía a −33 dBFS y el bip la tapaba entera.
 *
 * Un saturador deforma; no sube ni baja. Si algo por debajo altera el nivel en
 * secreto, el presupuesto de `mix.ts` deja de significar nada.
 *
 * ⚠ LA CURVA TIENE QUE SER IMPAR. Una curva asimétrica genera armónicos pares,
 * suena a avería en vez de a altavoz, y mete corriente continua en el bus — o
 * sea, deja el altavoz de quien escucha empujado hacia un lado.
 *
 * Con `amount` en cero es la identidad, y eso no es un caso raro: el banco de
 * pruebas necesita poder apagar el parlante para comparar, y un «apagado» que
 * siguiera coloreando no serviría de nada.
 */
export function saturationCurve(
    amount: number = SATURATION,
    samples: number = 4_097
    // El respaldo se declara `ArrayBuffer` y no el `ArrayBufferLike` que
    // TypeScript infiere: `WaveShaperNode.curve` rechaza lo segundo, porque
    // admitiria un `SharedArrayBuffer` que el nodo no puede usar.
): Float32Array<ArrayBuffer> {
    const curva = new Float32Array(samples);

    for (let i = 0; i < samples; i += 1) {
        // De índice a la entrada del shaper, que va de −1 a 1.
        const x = (i / (samples - 1)) * 2 - 1;

        curva[i] = amount === 0 ? x : Math.tanh(amount * x) / amount;
    }

    return curva;
}

/**
 * El tope de la compensación.
 *
 * Sin él, un Q alto a frecuencia baja pide multiplicar por cientos, y lo que
 * sale amplificado no es el sonido: es el ruido de cuantización. El tope
 * convierte un fallo silencioso en uno acotado.
 */
export const MAKEUP_MAX = 40;

/**
 * Lo que hay que devolverle a un pasabanda estrecho.
 *
 * ⚠ POR QUÉ EXISTE ESTO, QUE ES LA CORRECCIÓN MÁS IMPORTANTE DEL SISTEMA.
 *
 * Las voces físicas se construyen metiendo ruido de banda ancha por pasabandas
 * estrechos: así una tecla suena a plástico y a placa en vez de a siseo. Pero un
 * pasabanda a 310 Hz con Q 6,5 deja pasar unos 48 Hz de los 24 000 disponibles,
 * o sea que TIRA EL 99,8% DE LA ENERGÍA.
 *
 * El error que esto arregla fue tratar el número de la envolvente como el nivel
 * de salida. No lo es: es un multiplicador sobre lo que el filtro deja pasar, y
 * eso ya viene diezmado. La bocinita no cruza ningún filtro estrecho y sale
 * entera — medido en el navegador, tapaba a la tecla por 28 dB, cuando el §8
 * pide 6.
 *
 * Para ruido, la amplitud que sobrevive va con la RAÍZ de la fracción de
 * espectro conservada, y esa fracción es el ancho de banda (`f0/Q`) sobre la
 * mitad de la frecuencia de muestreo.
 *
 * Y nunca atenúa: si la banda es más ancha que el espectro no hay nada que
 * devolver, pero tampoco nada que quitar.
 */
export function bandpassMakeup(f0: number, q: number, sampleRate: number): number {
    const ancho = f0 / q;
    const fraccion = ancho / (sampleRate / 2);

    return Math.min(MAKEUP_MAX, Math.max(1, 1 / Math.sqrt(fraccion)));
}
