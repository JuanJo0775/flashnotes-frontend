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
     * El tono de referencia de 1 kHz.
     *
     * ⚠ No es una licencia: las cartas de ajuste iban SIEMPRE con él, porque era
     * la señal con la que se calibraba el nivel de audio de una emisión. Es lo
     * que convierte unos rectángulos de colores en algo que se RECONOCE.
     */
    readonly tone?: true;

    /** La voz en el instante en que la marca aparece. */
    readonly shot?: Shot;

    /** El segundo tiempo, más tarde. El encendido y su cabezal, por ejemplo. */
    readonly then?: Shot & { readonly ms: number };

    /** Y si `shot` se repite mientras la marca siga puesta. */
    readonly repeat?: { readonly ms: number; readonly jitter: number };

    /**
     * Mientras la marca se vea, EL AMBIENTE SE DA VUELTA.
     *
     * ⚠ Es el §26 · 3, y no es subir el volumen: el zumbido sube y el aire de la
     * caja se enmudece. Deja de oírse una habitación con una máquina dentro y
     * pasa a oírse la máquina sola, de cerca — el sonido de estar mirando algo
     * que te mira.
     */
    readonly inverts?: true;

    /**
     * Lo que suena cuando la marca SE VA.
     *
     * ⚠ Hay momentos que no son la aparición de nada, son el final de algo, y
     * sin esto habría que inventarles una pantalla para poder oírlos.
     *
     * ⚠ HOY NO LO USA NADIE, Y SE QUEDA A PROPÓSITO. Lo estrenó el encendido,
     * colgado del final de la comprobación de memoria — y funcionaba, pero era
     * un sonido sin nada que mirar. En cuanto el encendido tuvo su propia imagen
     * (`tube-on`) se mudó ahí. La forma de expresar «al irse» sigue siendo
     * necesaria el día que un final vuelva a merecer voz, y quitarla obligaría a
     * redescubrir que hace falta.
     */
    readonly onGone?: Shot;
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
        mark: 'tube-on',
        what: 'La corriente volviendo: el tubo abriéndose de un punto a la imagen',
        /*
         * ⚠ EL PAR DEL APAGÓN, Y POR FIN CON IMAGEN QUE LO ACOMPAÑE.
         *
         * Este sonido anduvo de sitio en sitio porque no tenía ninguno propio:
         * estuvo en las barras —donde se pisaba con el tono de la carta— y
         * después al final de la comprobación, que sonaba bien pero no tenía
         * nada que mirar mientras.
         *
         * Ahora la pantalla hace el gesto inverso del apagón —un punto que se
         * abre en línea y la línea en imagen, que es lo que hace un tubo al
         * recibir tensión— y el sonido va encima de eso. Imagen y sonido
         * contando la misma cosa, que es cuando las dos dejan de sobrar.
         */
        shot: { voice: 'powerUp' },
    },
    {
        mark: 'boot-bars',
        what: 'La carta de ajuste, sola con su tono',
        /*
         * ⚠ ACÁ NO SUENA EL ENCENDIDO, Y ESO SE CORRIGIÓ DOS VECES.
         *
         * Estaba acá y se pisaba con el tono: «se solapan dos sonidos, uno de
         * las barras y otro como de inicio». El primer intento fue separarlos en
         * el tiempo, y no era eso — el sitio estaba mal. Ver `tube-on`.
         *
         * Unas barras de ajuste con su tono de 1 kHz y nada más es exactamente
         * lo que emitía una carta, y no necesita que le pongan nada encima.
         */
        tone: true,
    },
    {
        mark: 'collapse-bars',
        what: 'La carta de ajuste de un tubo que seguía encendido',
        tone: true,
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
        mark: 'loose-slab--cae',
        what: 'El pedazo de pared cayendo, y lo que llega al suelo detrás',
        /*
         * ⚠ EL IMPACTO LLEGA DETRÁS, no encima. El §26 lo pide así: «barrido
         * descendente y un impacto lejano». Los dos a la vez serían un golpe
         * sucio; separados son una cosa que cae y otra que llega al suelo, que
         * es lo que se está viendo.
         */
        shot: { voice: 'sweep', args: { fromHz: 900, toHz: 70, ms: 700 } },
        then: { voice: 'thud', ms: 520 },
    },
    {
        mark: 'wall-rain',
        what: 'El ojo mirando por el agujero: la sala se da vuelta y los datos chacharean',
        /*
         * ⚠ LOS DOS A LA VEZ SON LA IDEA. La inversión sola sería un zumbido que
         * crece —inquietante, pero mudo—; el chachareo solo sería ruido sobre el
         * mismo cuarto de siempre. Juntos, el sitio CAMBIA: la habitación se
         * cierra alrededor de la máquina y lo que se oye salir de ella son datos.
         */
        inverts: true,
        shot: { voice: 'chatter' },
        repeat: { ms: 900, jitter: 0.45 },
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

/**
 * Mientras alguna de éstas se ve, LA MÁQUINA NO TIENE CORRIENTE.
 *
 * ⚠ Y POR ESO NO HAY RUIDO DE SALA. El zumbido de fondo es el ruido de que hay
 * un aparato ENCENDIDO: un transformador, un ventilador, un tubo. Un tubo al que
 * le están cortando la corriente no lo tiene, y un equipo derrumbado tampoco —
 * por eso el colapso da tanto miedo, y por eso el zumbido volviendo es la señal
 * de que volvió.
 *
 * ⚠ Y SÓLO ÉSTAS DOS. Estuvo `boot-screen` en la lista, que callaba el fondo
 * durante TODO el arranque, y era demasiado: se pidió justo lo contrario — «ese
 * grave me gusta, que suene al entrar». Lo que hay que evitar no es que el
 * zumbido exista durante el arranque, es que su SUBIDA caiga encima de la carta
 * de ajuste. De eso se encarga el compás oscuro del arranque (`BOOT_WAKE_MS`),
 * que le da su hueco para entrar antes de que haya imagen.
 */
export const NOT_RUNNING_MARKS = ['collapse-dying', 'collapse-layer'] as const;

/** El selector que encuentra todas las marcas de una sola pasada. */
export const SCREEN_SELECTOR = [
    ...SCREEN_SOUNDS.map((s) => s.mark),
    ...NOT_RUNNING_MARKS,
]
    .map((c) => `.${c}`)
    .join(', ');

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
