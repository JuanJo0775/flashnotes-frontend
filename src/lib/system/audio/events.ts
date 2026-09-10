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

import type { VoiceArgs, VoiceName } from '@/lib/system/audio/play';
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
        what: 'Un tirón de imagen: la señal rompiéndose, también dentro del pong',
        voice: 'glitchBurst',
        where: 'el almacén de `useGlitch`, y `data-render` del pong',
    },
    {
        what: 'Cada golpe a la pared suelta, y cruje más cuanto más cede',
        voice: 'tear',
        where: 'la clase `is-blow` y la variable `--blow-amp` del `body`',
    },
    {
        /*
         * ⚠ Y LA ÚLTIMA PIEZA ES SU MOMENTO MÁS GRANDE, con el mismo sonido.
         * Lo que lo hace grande no es la voz: es que el cuarto se cae antes y el
         * acuse queda SOLO en el hueco. El silencio es lo más caro que tiene
         * esta app y lo que menos se usa.
         */
        what: 'Encontrar un secreto —los del ente suenan torcidos— y completar la colección, con el cuarto caído',
        voice: 'confirm',
        where: 'el almacén del sistema comparando conjuntos, y el de la colección al llegar a la última',
    },
    {
        what: 'La señal cayéndose, y el barrido de `//reset`',
        voice: 'sweep',
        where: 'los atributos `data-wiping` y `data-collapsing`',
    },
    {
        // El mismo impacto en dos sitios: detrás de algo que cae, y solo cuando
        // lo que cae es una nota que dejaste caer.
        what: 'Lo que llega al suelo detrás de esa caída, y una nota cayendo al cesto',
        voice: 'thud',
        where: 'los mismos atributos 620 ms después, y el almacén del sistema',
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
        /*
         * ⚠ UNA FILA, DOS GESTOS, Y ES EL MISMO CAJÓN. Se abre para sacar una
         * pieza que te ganaste y se cierra cuando algo se fue para no volver: la
         * misma madera contando las dos únicas cosas de esta app que son para
         * siempre. Dos filas dirían que son dos sonidos, y no lo son.
         */
        what: 'Lo que vuelve a tus manos —una pieza ganada, una nota rescatada— y, cerrándose, lo que se va para siempre',
        voice: 'drawer',
        where: 'los almacenes de la colección y del sistema, comparando cuentas',
    },

];

/**
 * Con qué se dispara cada voz que pide argumentos, para poder OÍRLA suelta.
 *
 * ⚠ EL CATÁLOGO SE QUEJÓ SOLO, y con razón: la mitad de las filas tenían el
 * botón apagado porque su voz necesita datos —hercios, amplitud— y no había de
 * dónde sacarlos. Un catálogo donde la mitad no se deja oír no es un catálogo.
 *
 * Los valores son los que usa la app de verdad en el sitio más representativo de
 * cada voz, no números inventados para la demostración: lo que se oye acá tiene
 * que ser lo que se oye jugando.
 */
type ConArgumentos = {
    [N in VoiceName]: VoiceArgs[N] extends undefined ? never : N;
}[VoiceName];

/*
 * ⚠ EL TIPO ES LO QUE IMPIDE QUE ESTO SE QUEDE CORTO. Está escrito sobre las
 * voces QUE PIDEN ARGUMENTOS, no sobre todas: añadir una voz con datos y no
 * darle muestra no compila, y poner una muestra a una voz que no lleva datos
 * tampoco. Una lista de demostraciones que puede quedarse vieja en silencio no
 * sirve, porque el fallo se ve jugando y no en la suite.
 */
export const SAMPLE_ARGS: { readonly [N in ConArgumentos]: VoiceArgs[N] } = {
    beep: { hz: 1_050, ms: 110 },
    // La búsqueda, que es la que se oye arrancando. La escritura de un golpe
    // vive en su fila de pantalla, con el resto de lo que guarda.
    head: { golpes: 4 },
    sweep: { fromHz: 1_100, toHz: 60, ms: 900 },
    glitchBurst: { amplitudePx: 7, durationMs: 180 },
    tear: { amplitudePx: 9 },
    confirm: { wrong: false },
    // El cajón abriéndose, que es el que se gana. El que se cierra tiene su
    // propia fila, con lo que se lleva.
    drawer: { closing: false },
};

/**
 * La muestra de una voz cualquiera, sin que quien pregunta tenga que saber si
 * esa voz lleva datos o no. Devuelve `undefined` para las que no llevan, que es
 * exactamente lo que `play` espera recibir de ellas.
 */
export function sampleArgs(voice: VoiceName): VoiceArgs[VoiceName] {
    return (SAMPLE_ARGS as Partial<Record<VoiceName, VoiceArgs[VoiceName]>>)[voice];
}

/*
 * ⚠ ACÁ VIVÍA `capacitor`, DECLARADO COMO PENDIENTE, y ya no: encontró su sitio.
 * Suena cuando la v0.2 recibe corriente, que es el único momento del juego en el
 * que a esta máquina se le suelta algo por dentro. Su fila está en
 * `SCREEN_SOUNDS`, con la marca `.v02-wake`, porque es una pantalla y no un
 * suceso invisible.
 *
 * Se deja escrito el hueco por el mismo motivo por el que estaba declarado: para
 * que quien venga a buscar por qué una voz no suena encuentre la respuesta y no
 * un silencio.
 */

/**
 * Las voces que NO tienen suceso propio porque son INGREDIENTES.
 *
 * ⚠ No es una lista de excepciones para que el test calle: es la diferencia
 * entre una voz y una pieza de una voz. `whine` no se dispara nunca sola — la
 * usan por dentro el encendido y el apagado, y darle un suceso propio sería
 * inventar un momento en el que un flyback chilla sin que nada lo encienda.
 */
export const INTERNAL_VOICES: readonly Voz[] = ['whine'];
