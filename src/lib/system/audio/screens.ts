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
/**
 * Los golpes de una BÚSQUEDA.
 *
 * Escrito una vez porque los dos sitios que buscan tienen que sonar igual: si
 * uno se quedara en tres, el arranque y la vuelta serían dos discos distintos.
 */
export const SEEK_KNOCKS = 4;

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
     * Mientras la marca se vea, LA SALA SE AGACHA.
     *
     * ⚠ No es lo mismo que invertirla. Invertir es cambiar de sitio; agacharse
     * es hacerle hueco a algo. Cuando contesta ÉL, el zumbido baja y vuelve
     * despacio — la habitación entera se calla un poco para escucharlo, que es
     * lo que hace una habitación cuando alguien habla en serio.
     */
    readonly ducks?: true;

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
         *
         * ⚠ CUATRO GOLPES PORQUE ESTÁ BUSCANDO. El mismo cabezal con uno solo es
         * una escritura — ver `save-ok`, al final de esta tabla.
         */
        shot: { voice: 'head', args: { golpes: SEEK_KNOCKS } },
    },
    {
        mark: 'collapse-reboot',
        what: 'La máquina leyendo para volver, y sigue leyendo mientras carga',
        shot: { voice: 'head', args: { golpes: SEEK_KNOCKS } },
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
        mark: 'is-entity',
        what: 'Cuando contesta ÉL, la sala baja para escucharlo',
        /*
         * ⚠ NO TRAE VOZ PROPIA, Y ESO ES EL PUNTO. Darle un sonido al ente sería
         * ponerle un instrumento a algo que lleva todo el juego sin tener
         * cuerpo. Lo que cambia no es lo que se oye: es lo que DEJA de oírse.
         *
         * La marca la pinta el editor cuando la respuesta es suya. No se deduce
         * del texto: fiarse de la minúscula sería atar el sonido a una
         * convención de estilo.
         */
        ducks: true,
    },
    {
        mark: 'phantom-error',
        what: 'Una ventana de error apareciendo de golpe',
        /*
         * ⚠ EL BIP FEO, Y ACÁ ES DONDE VA. Es la bocinita haciendo lo único que
         * sabe hacer: un cuadrado crudo de 340 Hz, corto y sin adornos. Una
         * ventana de error de esa época no tenía un sonido bonito, tenía ESE.
         *
         * Y suena una vez POR VENTANA. Salen varias, una detrás de otra, y que
         * cada una traiga el suyo es lo que convierte el bloqueo en algo que te
         * acorrala en vez de en una pantalla con dibujos.
         */
        shot: { voice: 'beep', args: { hz: 340, ms: 90 } },
    },
    {
        mark: 'lockout-body',
        what: 'El bloqueo: la máquina que ya no te deja entrar',
        /*
         * La señal cayéndose y algo que llega al suelo detrás — el mismo par que
         * el colapso, porque es el mismo suceso llevado hasta el final: acá no
         * vuelve.
         */
        shot: { voice: 'sweep', args: { fromHz: 700, toHz: 55, ms: 1_100 } },
        then: { voice: 'thud', ms: 800 },
    },
    {
        mark: 'dead-page',
        what: 'La página muerta: te sacó y ya',
        /*
         * ⚠ EL APAGADO, Y NADA MÁS. Es el final más brusco que tiene el juego
         * —insististe con el saludo hasta que la página se murió— y lo que
         * corresponde es lo que corresponde: le cortaron la corriente. Ponerle
         * algo encima sería suavizarlo, y eso es justo lo que no hay que hacer.
         */
        shot: { voice: 'powerDown' },
    },
    /*
     * ────────────────────────────────────────────────────────────────────
     * LO QUE PASA MIENTRAS TRABAJÁS. Las dos únicas cosas de esta tabla que
     * no son una avería ni una ceremonia: si tu texto está a salvo, y si la
     * máquina sigue hablando con el otro lado.
     *
     * ⚠ Y SON LAS QUE MÁS SE VAN A OÍR, así que son las más chicas de todo el
     * sistema. Una fanfarria cada dos segundos y medio deja de ser un aviso a
     * la tercera vez, y a la décima es un motivo para apagar el sonido.
     * ────────────────────────────────────────────────────────────────────
     */
    {
        mark: 'save-ok',
        what: 'Tu texto quedó guardado: el cabezal aterriza y escribe',
        /*
         * ⚠ UN SOLO GOLPE, Y ES EL MISMO CABEZAL DEL ARRANQUE. Una máquina de
         * esa época no te decía «guardado»: hacía ruido al escribir, y ESE ruido
         * era la confirmación. La gente aprendía a esperarlo y a desconfiar
         * cuando no llegaba.
         *
         * Cuatro golpes serían una búsqueda —el disco yendo a ver dónde poner
         * esto— y uno es el aterrizaje. La diferencia entre buscar y escribir es
         * la cuenta, y no hace falta nada más para contarla.
         */
        shot: { voice: 'head', args: { golpes: 1 } },
    },
    {
        mark: 'save-fail',
        what: 'NO se guardó, que es la única de estas dos que importa de verdad',
        /*
         * ⚠ FEO Y GRAVE, A PROPÓSITO. El resto del sistema se permite ser
         * bonito; esto no. Es el aviso de que lo que escribiste puede perderse,
         * y tiene que interrumpir.
         *
         * Es la bocinita otra vez —la misma de las ventanas de error— pero una
         * octava más abajo y más larga: la ventana de error es un susto, y esto
         * es una mala noticia.
         */
        shot: { voice: 'beep', args: { hz: 190, ms: 220 } },
    },
    {
        mark: 'net-lost',
        what: 'Quedarse sin línea: la señal se cae y no hay a quién llamar',
        /*
         * ⚠ EL MISMO BARRIDO QUE SE CAE EN `//reset`, pero corto y sin impacto
         * detrás. Allá se cae la imagen entera y algo llega al suelo; acá sólo se
         * cae la LÍNEA, y una línea que se corta no hace ruido al aterrizar.
         *
         * Que las dos cosas usen el mismo barrido no es economía: es que son la
         * misma clase de suceso —algo que estaba y dejó de estar— y el oído las
         * empareja solo.
         */
        shot: { voice: 'sweep', args: { fromHz: 420, toHz: 90, ms: 260 } },
    },
    {
        mark: 'net-down',
        what: 'El servidor dejó de contestar, con la línea todavía en pie',
        /*
         * Más arriba y más corto que quedarse sin red, y ésa es toda la
         * diferencia que hace falta: la línea sigue, lo que no contesta es el
         * otro lado. Se oye como medio corte, que es exactamente lo que es.
         */
        shot: { voice: 'sweep', args: { fromHz: 520, toHz: 260, ms: 180 } },
    },
    {
        mark: 'net-back',
        what: 'Y la línea volviendo: un contacto que se cierra',
        /*
         * ⚠ EL RELÉ, QUE ES LO CONTRARIO DE UN BARRIDO. Los cortes bajan; una
         * conexión no «sube», se CIERRA — un contacto que engancha, con su
         * rebote. Es la misma armadura del cambio de tema, y que se repita está
         * bien: en esta máquina las cosas se conectan de una sola manera.
         */
        shot: { voice: 'relay' },
    },
    /*
     * ────────────────────────────────────────────────────────────────────
     * LA v0.2, QUE ES OTRA MÁQUINA.
     *
     * ⚠ NO ES LA 1.0 CON COSAS ROTAS: es la 1.0 antes de que se escribieran.
     * Así que su arranque no es éste con piezas quitadas — no tiene carta de
     * ajuste porque no tiene nada que emitir, no tiene rótulo porque nadie la
     * firmó, y no cuenta la memoria porque no sabe cuánta tiene.
     *
     * Y suena más pobre y más eléctrica. Acá la bocinita pesa más que la
     * habitación, que es exactamente la diferencia entre un equipo viejo y uno
     * que ya sabe presentarse.
     * ────────────────────────────────────────────────────────────────────
     */
    {
        mark: 'collapse-halted',
        what: 'La v0.2 rindiéndose: se detuvo y no va a volver sola',
        /*
         * ⚠ UN PITIDO LARGO, GRAVE Y FEO, Y DESPUÉS NADA. Es la única fila de
         * la tabla en la que lo que suena marca un FINAL sin que la pantalla
         * cambie: la máquina se queda encendida, con el error puesto, y lo
         * último que hace es quejarse por el altavoz.
         *
         * Larga a propósito —casi medio segundo— porque un bip corto se lee
         * como un aviso y esto no avisa de nada: informa de que se paró. Y por
         * el altavoz y no por la sala, que es donde vive esta versión.
         *
         * Lo que MÁS cuenta, igual, es lo que deja de sonar: mientras intentaba
         * volver, el cabezal buscaba cada segundo y medio. Acá el disco calla.
         */
        shot: { voice: 'beep', args: { hz: 140, ms: 420 } },
    },
    {
        mark: 'v02-wake',
        what: 'La v0.2 recibiendo corriente: algo se suelta dentro de la caja',
        /*
         * ⚠ ACÁ VIVE EL CONDENSADOR, Y ERA LA ÚLTIMA VOZ SIN ENCHUFAR. Estuvo
         * construida y sin sitio desde el principio —un golpe de 72 a 30 Hz con
         * un chispazo corto encima— porque en la 1.0 no hay ningún momento en
         * el que a esta máquina se le suelte algo: esa versión enciende limpio.
         *
         * Que una versión vieja arranque con esto EN VEZ del encendido limpio es
         * toda la distancia entre las dos, y no cuesta ni una pantalla: es el
         * mismo dibujo del tubo abriéndose con otra cosa debajo.
         */
        shot: { voice: 'capacitor' },
    },
    {
        mark: 'v02-static',
        what: 'Y lo que enseña cuando no hay nada enganchado: estática, y muda',
        /*
         * ⚠ ESTA FILA NO TRAE VOZ, Y ES LA MITAD DE LO QUE CUENTA. La carta de
         * ajuste de la 1.0 viene con su tono de 1 kHz porque una carta de ajuste
         * es una señal que alguien EMITE. Esto es lo contrario: no hay señal. Un
         * tono acá diría que algo está transmitiendo, que es justo lo que no
         * pasa.
         *
         * Se declara igual, con su marca, para que quede escrito que el silencio
         * es una decisión y no un hueco — y para que el catálogo la enseñe.
         */
    },
    {
        mark: 'v02-load',
        what: 'La barra que se inventa el total, contando en voz alta mientras carga',
        /*
         * ⚠ EL TIC DEL TELETIPO, QUE ES EL DE IMPRIMIR UNA LÍNEA. La barra se
         * redibuja entera cada latido, así que cada latido es una línea escrita:
         * el mismo suceso que cuando la máquina contesta un comando. No hace
         * falta una voz nueva para algo que ya tiene la suya.
         *
         * Espaciado y con azar, porque una barra que avanza a compás sería un
         * reloj y esta barra no mide nada — pega saltos y a veces retrocede.
         */
        shot: { voice: 'tick' },
        repeat: { ms: 380, jitter: 0.4 },
        /*
         * ⚠ Y CUANDO SE VA, EL BIP. Es el equivalente pobre del POST de la 1.0:
         * allá un pitido corto y limpio a 1 050 Hz CERTIFICA que la comprobación
         * salió bien; acá no se comprobó nada, así que lo único que dice el bip
         * es «ya está» — más grave, más largo y más feo, que es lo que suena
         * cuando el altavoz es lo único que hay.
         *
         * Va al IRSE y no al aparecer porque el final de la carga no tiene
         * pantalla propia: lo que pasa es que la barra deja de estar.
         */
        onGone: { voice: 'beep', args: { hz: 620, ms: 150 } },
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
