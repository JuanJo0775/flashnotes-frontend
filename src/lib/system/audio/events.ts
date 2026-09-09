// src/lib/system/audio/events.ts

/**
 * QUÉ SUCESO DISPARA CADA SONIDO, cuando el suceso no es una pantalla.
 *
 * ⚠ ES EL COMPAÑERO DE `SCREEN_SOUNDS`, Y ENTRE LOS DOS NO PUEDE FALTAR NADA.
 * Aquella tabla cubre lo que se VE —marcas del árbol que la app ya pinta—, pero
 * media voz del sistema cuelga de cosas que no se ven: una tecla, un almacén que
 * cambia, un observador de atributos. Sin esta lista, esa mitad sólo estaba
 * escrita en el código del suscriptor, o sea en ninguna parte legible.
 *
 * Hay un test que exige que TODA voz declarada en `CATEGORY_OF` aparezca en una
 * de las dos tablas —o en `INTERNAL_VOICES` con su motivo—, así que una voz nueva
 * sin suceso documentado no llega a pasar la suite. Es lo que convierte esto en
 * documentación en vez de en un comentario que envejece.
 *
 * ⚠ Y LAS PENDIENTES SE DECLARAN, no se omiten. Una voz construida y todavía sin
 * enchufar es una decisión a medias: omitirla la haría parecer inexistente, y
 * quien buscara por qué no suena no encontraría ni el hueco.
 */

import type { VoiceName } from '@/lib/system/audio/play';
import type { CATEGORY_OF } from '@/lib/system/audio/voices';

/**
 * Todo lo que declara familia, que es más que lo que `play` sabe disparar.
 *
 * ⚠ La diferencia no es un descuido: `whine` declara familia porque pasa por la
 * mezcla, pero no está en la tabla de `play` porque nunca se pide sola.
 */
type Voz = keyof typeof CATEGORY_OF;

/** Un sonido y el suceso que lo trae. */
export interface EventSound {
    /** El suceso, en el idioma de quien juega. */
    readonly what: string;

    /** La voz que lo dice. */
    readonly voice: VoiceName;

    /** De dónde se entera el sonido. Ninguna de éstas toca código de la app. */
    readonly where: string;

    /** Construida, con su sitio decidido, y todavía sin enchufar. */
    readonly pending?: true;
}

export const EVENT_SOUNDS: readonly EventSound[] = [
    {
        what: 'Escribir en el editor, y borrar mientras borre algo',
        voice: 'key',
        where: '`keydown` en el documento, en captura',
    },
    {
        what: 'Pulsar un botón, o cualquier cosa con cursor de mano',
        voice: 'button',
        where: '`click` en el documento, en captura',
    },
    {
        what: 'Un tirón de imagen: la señal rompiéndose',
        voice: 'glitchBurst',
        where: 'el almacén de `useGlitch`',
    },
    {
        what: 'Cada golpe a la pared suelta, y cruje más cuanto más cede',
        voice: 'tear',
        where: 'la clase `is-blow` y la variable `--blow-amp` del `body`',
    },
    {
        what: 'Encontrar un secreto — y los del ente suenan torcidos',
        voice: 'confirm',
        where: 'el almacén del sistema, comparando conjuntos',
    },
    {
        what: 'La señal cayéndose, y el barrido de `//reset`',
        voice: 'sweep',
        where: 'los atributos `data-wiping` y `data-collapsing`',
    },
    {
        what: 'Lo que llega al suelo detrás de esa caída',
        voice: 'thud',
        where: 'los mismos atributos, 620 ms después',
    },
    {
        what: 'La avería de señal, el segundo clic en el rótulo, y los tres tonos del pong',
        voice: 'beep',
        where: 'el almacén del sistema, el contador del rótulo, y los contadores del pong',
    },
    {
        what: 'El tema cambiando, y parar o seguir el juego',
        voice: 'relay',
        where: 'el atributo `data-theme`, y `data-paused` del pong',
    },
    {
        what: 'Una línea impresa por el teletipo, nunca un carácter',
        voice: 'tick',
        where: 'el texto de la respuesta, contando renglones',
    },
    {
        what: 'Ganarse una pieza de arte: un cajón que se abre',
        voice: 'drawer',
        where: 'el almacén de la colección, comparando la cuenta',
    },
    {
        what: 'Un condensador soltándose dentro de la caja',
        voice: 'capacitor',
        where: 'todavía en ninguna parte',
        pending: true,
    },
];

/**
 * Las voces que NO tienen suceso propio porque son INGREDIENTES.
 *
 * ⚠ No es una lista de excepciones para que el test calle: es la diferencia
 * entre una voz y una pieza de una voz. `whine` no se dispara nunca sola — la
 * usan por dentro el encendido y el apagado, y darle un suceso propio sería
 * inventar un momento en el que un flyback chilla sin que nada lo encienda.
 */
export const INTERNAL_VOICES: readonly Voz[] = ['whine'];
