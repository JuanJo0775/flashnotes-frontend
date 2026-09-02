// src/lib/system/boot.ts

/**
 * El encendido del monitor.
 *
 * Lo que sale ANTES de la app, cada vez que se carga: las barras de color, el
 * rótulo del fabricante, la comprobación de memoria, y a trabajar. Lo que hacía
 * un equipo de los de antes cuando le dabas al interruptor.
 *
 * POR QUÉ SIEMPRE Y NO SÓLO LA PRIMERA VEZ. Porque un arranque que sale una vez
 * es una pantalla de bienvenida, y una pantalla de bienvenida se salta. Un
 * encendido que sale SIEMPRE es cómo es la máquina — y a los tres días ya no lo
 * mirás, igual que no mirabas el POST de un ordenador de verdad.
 *
 * Dura poco a propósito: lo justo para reconocerlo. Un arranque de tres segundos
 * es carácter; uno de ocho es un peaje.
 *
 * ⚠ LAS BARRAS NO SE DIBUJAN CON CARACTERES. Los bloques (`█`) no están en
 * JetBrains Mono y los pintaría una fuente de reserva con otras métricas
 * (REGLAS · C8). Van con CSS, que además permite el color de verdad.
 */

/**
 * Cuánto tarda en arrancar, de punta a punta.
 *
 * ⚠ CAMBIA EN CADA ENCENDIDO, entre dos y ocho segundos. Un equipo de verdad no
 * tarda siempre lo mismo: depende de lo que encuentre, de si el disco responde a
 * la primera, de la temperatura. Un arranque cronometrado se siente como una
 * animación; uno que unas veces vuela y otras se hace de rogar se siente como
 * una máquina.
 *
 * Y es lo que hace que valga la pena mirarlo alguna vez: nunca sabés si te toca
 * el corto o el largo.
 */
export const BOOT_MIN_MS = 2_000;
export const BOOT_MAX_MS = 8_000;

export type BootPhase = 'off' | 'bars' | 'logo' | 'check' | 'done';

/**
 * El apagón con el que EMPIEZA el arranque.
 *
 * Recargar es apagar y encender. Lo que se ve primero, entonces, es el equipo
 * apagándose: la misma animación del fallo crítico —la imagen se aplasta a una
 * línea, la línea se cierra a un punto— y sólo después las barras.
 *
 * Fijo y fuera del sorteo: es un gesto físico, no una espera.
 */
export const BOOT_OFF_MS = 420;

/**
 * Cómo se reparte el tiempo entre los tramos.
 *
 * El encendido del tubo es fijo y corto: es un gesto físico, no una espera, y
 * estirarlo lo convertiría en otra cosa. El resto se reparte el tiempo que haya
 * salido, y el rótulo se lleva la mitad porque es lo único que hay que MIRAR.
 */
const REPARTO: readonly { phase: BootPhase; peso: number }[] = [
    { phase: 'bars', peso: 0.25 },
    { phase: 'logo', peso: 0.5 },
    { phase: 'check', peso: 0.25 },
];

/*
 * ⚠ ACÁ HUBO UN «ENCENDIDO DEL TUBO» Y SE QUITÓ.
 *
 * Era una animación propia: una línea que nacía en el centro y se abría hacia
 * arriba y abajo, pintada con la tinta del tema —o sea, del color contrario al
 * fondo—. Se veía como una pantalla ajena abriéndose, no como un monitor
 * encendiéndose.
 *
 * El apagón de un tubo ya existe y está bien: es el del fallo crítico, después
 * de la estática y las franjas. Ése es el gesto de la casa y se usa donde toca —
 * en el borrado. Inventar su inverso para el arranque era un segundo lenguaje
 * para decir algo que no hacía falta decir: lo que abre el arranque son las
 * barras de color, y con eso basta.
 */

/** Cuánto dura este arranque. Se sortea una vez y se reparte. */
export function bootDuration(rand: () => number = Math.random): number {
    return Math.round(BOOT_MIN_MS + rand() * (BOOT_MAX_MS - BOOT_MIN_MS));
}

/** El guion completo para una duración dada. */
export function bootScript(
    totalMs: number,
    lockedOut = false
): { phase: BootPhase; ms: number }[] {
    const apagon = { phase: 'off' as const, ms: BOOT_OFF_MS };

    /*
     * ⚠ CON EL BLOQUEO PUESTO, EL ARRANQUE SE QUEDA EN LAS BARRAS.
     *
     * Un equipo bloqueado no llega a arrancar: se apaga, enseña que no hay
     * señal, y vuelve a la pantalla de fallo. Enseñarle el rótulo del
     * fabricante y la comprobación de memoria sería contar que arrancó bien
     * justo antes de decirle que no arrancó — y encima obligaría a esperar
     * hasta ocho segundos para volver a leer el mismo error.
     */
    /*
     * Y SIN APAGÓN: un equipo bloqueado no se apagó, se quedó colgado. El apagón
     * cuenta que algo se cerró bien para volver a abrirse, y acá no se cierra
     * nada — se vuelve al mismo sitio. Sólo las barras, que es lo que enseña un
     * monitor cuando no hay nada que enseñar.
     */
    if (lockedOut) return [{ phase: 'bars', ms: BOOT_BARS_LOCKED_MS }];

    return [
        apagon,
        ...REPARTO.map(({ phase, peso }) => ({
            phase,
            ms: Math.round(totalMs * peso),
        })),
    ];
}

/** Lo que duran las barras cuando no hay nada más que enseñar. */
const BOOT_BARS_LOCKED_MS = 900;

/** Qué toca en el paso `n` de un guion. */
export function bootAt(
    guion: readonly { phase: BootPhase; ms: number }[],
    step: number
): { phase: BootPhase; ms: number } {
    return guion[step] ?? { phase: 'done', ms: 0 };
}

/**
 * Las barras de color de una carta de ajuste.
 *
 * Siete, y en este orden, porque es el de las barras SMPTE de verdad: de la más
 * clara a la más oscura por luminancia. Puestas en cualquier otro orden se ven
 * como rayas de colores; en éste se reconocen.
 */
export const BOOT_BARS: readonly string[] = [
    '#c0c0c0',
    '#c0c000',
    '#00c0c0',
    '#00c000',
    '#c000c0',
    '#c00000',
    '#0000c0',
];

/**
 * El rótulo del fabricante.
 *
 * Arte ASCII, no un recuadro. Hubo una versión con el nombre dentro de una caja
 * —más legible, imposible de romper— y se descartó a la vista: en una pantalla de
 * arranque el rótulo no está para LEERSE, está para RECONOCERSE. Un cuadro con
 * letras espaciadas se lee y no dice nada; esto se reconoce.
 *
 * ⚠ LAS BARRAS VAN DOBLES. `'\|'` en una cadena de TypeScript es `|` a secas:
 * la barra se la come el escape. Con una sola, dos de las cuatro líneas salían un
 * carácter más cortas y el rótulo se veía descuadrado en pantalla — que es
 * exactamente lo que pasaba en la primera versión de esto.
 *
 * Ningún error, ninguna advertencia: sólo un dibujo torcido. Lo cazó el test que
 * exige que las cuatro líneas midan lo mismo.
 */
export const BOOT_LOGO: readonly string[] = [
    ' _____ _         _   _  _     _        ',
    '|   __| |___ ___| |_| \\| |___| |_ ___  ',
    '|   __| | .-. |_-|   |    | . |  _| -_|',
    '|__|  |_|__,_|___|_|_|_|\\_|___|_| |___|',
];

/** Lo que va debajo del rótulo. La broma es que nadie firmó nunca esto. */
export const BOOT_VENDOR = 'FLASHNOTES SYSTEMS INC.  ---  NINGUN DERECHO RESERVADO';

/**
 * La comprobación de memoria.
 *
 * `640K` es la cifra exacta del límite de memoria convencional del PC de IBM, y
 * quien la reconoce sabe de qué se está hablando. Quien no, ve un número que
 * cuadra con el resto.
 */
export function bootCheckLines(): readonly string[] {
    return [
        'MEMORIA CONVENCIONAL ..... 640K  OK',
        'ALMACENAMIENTO LOCAL ..... PRESENTE',
        'RELOJ .................... SIN AJUSTAR',
        '',
        'INICIANDO FLASH-NOTES...',
    ];
}
