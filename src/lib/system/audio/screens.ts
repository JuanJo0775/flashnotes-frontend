// src/lib/system/audio/screens.ts

/**
 * QUÉ SUENA EN CADA PANTALLA. Una tabla, y no código repartido.
 *
 * ⚠ LA ASOCIACIÓN ES UN DATO, Y ÉSA ES TODA LA IDEA. Antes cada momento de la
 * máquina estaba cableado a mano dentro del suscriptor: cinco bloques casi
 * iguales, y cada pantalla nueva obligaba a acordarse de ir a tocarlos. Es el
 * mismo camino por el que `awardFrom` acabó llamado desde nueve sitios.
 *
 * Acá la pantalla no pide sonar: **pinta la marca que ya pintaba** y el sonido
 * la reconoce. Una pantalla nueva que pinte `.collapse-dying` suena a tubo
 * apagándose sin tocar una línea de sonido, porque lo que se comparte no es una
 * llamada — es la marca.
 *
 * ⚠ Y SE ESCOGIERON MARCAS QUE YA EXISTÍAN, no clases inventadas para esto.
 * `.collapse-dying` la pintan LAS TRES pantallas que apagan un tubo —el
 * arranque, el colapso y el barrido— porque las tres cierran la imagen a un
 * punto. Que ya estuviera compartida es la prueba de que el momento es el mismo;
 * inventar una clase nueva habría sido decidir por mi cuenta que no lo era.
 *
 * Hay un test que exige que cada marca de esta tabla la pinte alguien de verdad,
 * y otro que exige que el documento la cuente. Una fila que no corresponda a
 * ninguna pantalla es una promesa muerta, y se nota sola.
 */

import type { VoiceArgs, VoiceName } from '@/lib/system/audio/play';
import { play } from '@/lib/system/audio/play';

/**
 * Cada cuánto vuelve a buscar el cabezal mientras el reinicio carga.
 *
 * ⚠ NO ES DECORACIÓN, TAPA EL SILENCIO MÁS LARGO DEL PRODUCTO. La barra de
 * reinicio del colapso dura ENTRE DIEZ Y CUARENTA SEGUNDOS, y más cuanto más
 * hayas insistido. Sonaba UNA vez al aparecer y después se quedaba muda todo ese
 * rato, que además es el tramo más tenso que hay: fue lo que se reportó como
 * «el sonido sólo lo escuché una vez, luego ya no sale».
 *
 * Y había una segunda mitad peor: el zumbido de fondo se apaga tras un rato sin
 * actividad —ver `IDLE_MS`—, así que en un reinicio largo la máquina se quedaba
 * muerta del todo justo mientras trabajaba. El cabezal arregla las dos cosas con
 * el mismo gesto, porque cada golpe cuenta como actividad.
 *
 * Segundo y medio es el ritmo de un disco de verdad buscando: bastante lento
 * para que cada golpe se oiga suelto, bastante seguido para que no parezca que
 * la máquina se rindió.
 */
export const SEEK_MS = 1_500;

/**
 * Cuánto se mueve cada búsqueda alrededor de `SEEK_MS`.
 *
 * A compás exacto suena a metrónomo, y un disco buscando nunca encuentra dos
 * veces a la misma distancia. Se exporta porque quien mida esto tiene que saber
 * cuál es el hueco MÁXIMO entre dos golpes: un test que espere `SEEK_MS` a secas
 * falla una de cada tantas sin que nada esté roto, que es la peor clase de test.
 */
export const SEEK_JITTER = 0.35;

/**
 * Cuánto tarda la carta de ajuste en traer su tono, desde que se ve.
 *
 * ⚠ NO ES UN RETRASO POR GUSTO: ES LO QUE IMPIDE QUE DOS SONIDOS SE PISEN.
 * Reportado jugando: «cuando le doy a la tecla se solapan dos sonidos, uno de
 * las barras y otro como de inicio».
 *
 * El encendido y el tono caían en el mismo milisegundo, y dos cosas que empiezan
 * a la vez el oído las lee como UNA cosa sucia, no como dos. Separadas se leen
 * como lo que son: primero despierta el aparato —el chasquido del interruptor,
 * el golpe de corriente, el flyback subiendo— y cuando eso se asienta entra la
 * señal. Es también el orden real: un monitor no emite su tono de referencia en
 * el instante en que le dan tensión.
 *
 * Trescientos milisegundos: bastante para que el golpe haya caído, poco para que
 * no parezca que la señal se perdió. ⚠ Y no puede crecer mucho más — el tramo de
 * barras del arranque más corto dura 500 ms, y un retraso mayor dejaría la carta
 * muda justo en el arranque que menos dura.
 */
export const TONE_AFTER_MS = 300;

/**
 * Una voz con lo que haya que pedirle.
 *
 * El mapeado sobre `VoiceName` da una unión donde cada nombre va con SUS
 * argumentos y no con los de otro: pedir `beep` sin hercios, o `powerUp` con
 * ellos, no compila.
 */
export type Shot = {
    [N in VoiceName]: { readonly voice: N; readonly args?: VoiceArgs[N] };
}[VoiceName];

/** Lo que suena cuando una pantalla enseña algo. */
export interface ScreenSound {
    /** La clase que la pantalla YA pinta. No se inventa ninguna para esto. */
    readonly mark: string;

    /** Qué momento es, en una línea. Lo lee el documento y el catálogo. */
    readonly what: string;

    /**
     * El tono de referencia de 1 kHz, y cuánto tarda en entrar.
     *
     * ⚠ No es una licencia: las cartas de ajuste iban SIEMPRE con él, porque era
     * la señal con la que se calibraba el nivel de audio de una emisión. Es lo
     * que convierte unos rectángulos de colores en algo que se RECONOCE.
     *
     * Lo de `afterMs` es lo que evita que se pise con el encendido: ver
     * `TONE_AFTER_MS`.
     */
    readonly tone?: { readonly afterMs: number };

    /** La voz en el instante en que la marca aparece. */
    readonly shot?: Shot;

    /** El segundo tiempo, más tarde. El encendido y su cabezal, por ejemplo. */
    readonly then?: Shot & { readonly ms: number };

    /** Y si `shot` se repite mientras la marca siga puesta. */
    readonly repeat?: { readonly ms: number; readonly jitter: number };
}

/**
 * LA TABLA.
 *
 * ⚠ EL ORDEN NO IMPORTA, PERO LA DISTINCIÓN ENTRE LAS DOS BARRAS SÍ. Las del
 * arranque salen de un tubo que estaba APAGADO, así que traen el encendido; las
 * del colapso salen de un tubo que ya estaba encendido —lo que se cayó es la
 * señal, no el equipo— así que sólo traen la carta. Sonar a encendido ahí
 * contaría algo que no pasó.
 */
export const SCREEN_SOUNDS: readonly ScreenSound[] = [
    {
        mark: 'collapse-dying',
        what: 'El tubo al que le cortan la corriente',
        shot: { voice: 'powerDown' },
    },
    {
        mark: 'boot-bars',
        what: 'La pantalla despertando, y su carta de ajuste detrás',
        /*
         * ⚠ EL ENCENDIDO VA ACÍ Y NO ANTES, y se discutió jugando. No suena
         * sólo a filamentos calentando: es el aparato entero despertando —el
         * chasquido del interruptor, el golpe de corriente y el flyback
         * subiendo—, y eso pertenece al instante en que aparece la IMAGEN.
         * Ponerlo en una oscuridad previa lo dejaba contando algo que todavía no
         * se veía.
         *
         * Lo que estaba mal era que el tono entrara a la vez: ahora entra detrás.
         */
        shot: { voice: 'powerUp' },
        tone: { afterMs: TONE_AFTER_MS },
    },
    {
        mark: 'collapse-bars',
        what: 'La carta de ajuste de un tubo que seguía encendido',
        tone: { afterMs: TONE_AFTER_MS },
    },
    {
        mark: 'boot-logo',
        what: 'Un disco leyendo para arrancar, bajo el rótulo del fabricante',
        /*
         * ⚠ EL CABEZAL VIVE EN EL RÓTULO, que es lo que el documento contó
         * siempre y el código no hacía: iba colgado 620 ms después del encendido,
         * o sea encima de las barras. Acá tiene su propio tramo y el arranque
         * queda en cuatro momentos que no se pisan: despertar, señal, lectura y
         * comprobación.
         */
        shot: { voice: 'head' },
    },
    {
        mark: 'collapse-reboot',
        what: 'La máquina leyendo para volver, y sigue leyendo mientras carga',
        shot: { voice: 'head' },
        repeat: { ms: SEEK_MS, jitter: SEEK_JITTER },
    },
    {
        mark: 'boot-check',
        what: 'El bip de POST: memoria contada, todo bien',
        /*
         * REFERENCIA REAL DE LA INDUSTRIA: un PC que pasaba su autoprueba de
         * encendido daba UN pitido corto y agudo. Va en la comprobación y no
         * antes — el bip no anuncia que empieza, CERTIFICA que terminó bien.
         */
        shot: { voice: 'beep', args: { hz: 1_050, ms: 110 } },
    },
];

/** El selector que encuentra todas las marcas de una sola pasada. */
export const SCREEN_SELECTOR = SCREEN_SOUNDS.map((s) => `.${s.mark}`).join(', ');

/**
 * Dispara una fila de la tabla.
 *
 * ⚠ EL ÚNICO SITIO CON UN CAST, Y ESTÁ ACOTADO A PROPÓSITO. `Shot` es una unión
 * de pares nombre-argumentos correctos, pero TypeScript no puede correlacionar
 * los dos lados de una unión al pasarlos a una función genérica. El cast va acá,
 * una vez, con la unión ya validada por el tipo; quien escriba la tabla sigue
 * teniendo la comprobación entera.
 */
export function fire(shot: Shot): boolean {
    return play(shot.voice, shot.args as VoiceArgs[VoiceName]);
}
