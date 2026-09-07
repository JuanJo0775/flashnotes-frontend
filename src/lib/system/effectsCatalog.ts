// src/lib/system/effectsCatalog.ts

/**
 * TODOS los efectos visuales del sistema, uno por uno.
 *
 * ⚠ POR QUÉ EXISTE ESTE FICHERO.
 *
 * Los efectos estaban repartidos entre tres hojas de estilo y sólo se veían
 * jugando: el fallo cromático hay que ganárselo insistiendo con el interruptor
 * de tema, el colapso hay que provocarlo, la pared hay que romperla. Nadie
 * podía ver el repertorio completo, ni comprobar que uno se veía bien en los
 * dos temas, ni saber cuántos había. Y lo que no se puede mirar de un vistazo
 * se duplica: acabás escribiendo un efecto nuevo sin saber que ya existía uno
 * casi igual.
 *
 * La frontera es exacta y comprobable: **una entrada por cada `@keyframes` del
 * proyecto**. Un test recorre las hojas y exige que las dos listas coincidan en
 * las dos direcciones, igual que el que ata `ARTE.md` al código:
 *
 *   · Animación nueva sin catalogar → falla, y hay que describirla.
 *   · Entrada de un keyframe borrado → falla, y hay que quitarla.
 *
 * Sin eso, este catálogo envejece en una semana y pasa a mentir, que es peor
 * que no existir.
 */

/** Dónde vive la animación. Es también dónde hay que ir a tocarla. */
export type EffectSheet = 'animations' | 'glitch' | 'v02';

export interface VisualEffect {
    /** El nombre del `@keyframes`. Su identidad, y lo que ata el test. */
    id: string;
    /** Cómo se lo llama hablando. */
    nombre: string;
    /** Qué hace, en una línea. */
    que: string;
    /** Cuándo lo ve alguien que está jugando. */
    cuando: string;
    /** La hoja donde vive. */
    hoja: EffectSheet;
    /**
     * Las clases que hay que ponerle a un elemento para verlo.
     *
     * Es lo que usa el banco para enseñar la muestra, y de paso documenta la
     * combinación exacta: varios de estos efectos NO se activan solos, sino
     * apilando dos clases (`.glitch-jolt.is-severe`).
     */
    clases: string;
    /**
     * Si necesita algo detrás para verse.
     *
     * Los que trabajan con `backdrop-filter` no pintan nada propio: modifican
     * lo que haya debajo. Sobre un fondo liso no se ve NADA, y eso ya costó una
     * confusión — parecía que el efecto estaba roto.
     */
    necesitaFondo?: boolean;
    /**
     * Si decora TEXTO en vez de pintar una capa.
     *
     * El cursor, los puntos de espera y el fantasma no dibujan nada por su
     * cuenta: le hacen algo a unas letras. En un elemento vacío no se ve nada, y
     * eso tampoco se lee como «falta el texto» — se lee como «este efecto no
     * funciona», que es la confusión cara.
     */
    necesitaTexto?: boolean;
}

/**
 * El repertorio.
 *
 * El orden es el de la hoja y dentro de ella el del fichero, no alfabético: así
 * los que se usan juntos quedan juntos, que es como se los entiende.
 */
export const VISUAL_EFFECTS: readonly VisualEffect[] = [
    // ── animations.css · lo ambiental, lo que siempre está ──────────────────
    {
        id: 'blink',
        necesitaTexto: true,
        nombre: 'Cursor',
        que: 'Enciende y apaga el bloque del cursor, a saltos y sin desvanecer.',
        cuando: 'Siempre que hay un cursor de texto o una línea escribiéndose.',
        hoja: 'animations',
        clases: 'cursor-block',
    },
    {
        id: 'flash-out',
        nombre: 'Destello de tema',
        que: 'Un fogonazo que se apaga de golpe, sin transición.',
        cuando: 'Al cambiar entre claro y oscuro.',
        hoja: 'animations',
        clases: 'flash-transition',
    },
    {
        id: 'scanline',
        nombre: 'Barrido CRT',
        que: 'La línea que baja por la pantalla, sin parar, en nueve segundos.',
        cuando: 'Siempre. Es la respiración del tubo.',
        hoja: 'animations',
        clases: 'scanline-effect',
    },
    {
        id: 'loading-dots',
        necesitaTexto: true,
        nombre: 'Puntos de espera',
        que: 'Tres puntos que aparecen de a uno, a saltos.',
        cuando: 'Mientras algo tarda: guardar, consultar el historial.',
        hoja: 'animations',
        clases: 'loading-dots',
    },

    // ── glitch.css · el fallo ambiental ─────────────────────────────────────
    {
        id: 'glitch-jolt',
        nombre: 'Tirón',
        que: 'La imagen salta de lado en escalones secos. La amplitud sale de `--glitch-amp`.',
        cuando: 'El fallo ambiental, y cada golpe a la pared suelta.',
        hoja: 'glitch',
        clases: 'glitch-jolt',
    },
    {
        id: 'band-roll',
        nombre: 'Franjas',
        que: 'Bandas horizontales que barren la pantalla de arriba abajo.',
        cuando: 'Acompañan al tirón, y viven mientras dura el golpe.',
        hoja: 'glitch',
        clases: 'glitch-bands',
    },
    {
        id: 'negative-blink',
        nombre: 'Vídeo inverso',
        que: 'Invierte la pantalla dos veces en doscientos milisegundos.',
        cuando: 'En los fallos que además dan la vuelta a la imagen.',
        hoja: 'glitch',
        clases: 'glitch-negative',
    },
    {
        id: 'scanline-stutter',
        nombre: 'Barrido trabado',
        que: 'El barrido baja, SE QUEDA CLAVADO a media pantalla y termina de golpe.',
        cuando: 'Cuando la máquina se traba. Es el mismo barrido de siempre, atascado.',
        hoja: 'glitch',
        clases: 'scanline-effect is-stuttering',
    },
    {
        id: 'ghost-shift',
        necesitaTexto: true,
        nombre: 'Fantasma',
        que: 'Una sombra del texto desplazada que no se está quieta.',
        cuando: 'Texto que no termina de fijarse.',
        hoja: 'glitch',
        clases: 'glitch-ghost',
    },
    {
        id: 'vhold-slip',
        nombre: 'Salto de sincronismo',
        que: 'La imagen se va hacia arriba y vuelve, como un vertical mal ajustado.',
        cuando: 'Sólo en los fallos graves, montado sobre el tirón.',
        hoja: 'glitch',
        clases: 'glitch-jolt is-severe',
    },
    {
        id: 'level-drop',
        nombre: 'Caída de nivel',
        que: 'El brillo baja, sube de más y vuelve. Trabaja sobre lo que haya debajo.',
        cuando: 'Cuando la señal pierde fuerza un instante.',
        hoja: 'glitch',
        clases: 'glitch-level',
        necesitaFondo: true,
    },
    {
        id: 'chroma-drift',
        nombre: 'Deriva cromática',
        que: 'Los canales de color se separan despacio y vuelven.',
        cuando: 'Parte de la avería de señal, que se gana insistiendo con el tema.',
        hoja: 'glitch',
        clases: 'chromatic-failure',
    },
    {
        id: 'chroma-jolt',
        nombre: 'Tirón cromático',
        que: 'Un salto brusco cada tanto, dentro de la avería. Casi todo el ciclo está quieto.',
        cuando: 'Igual: durante la avería de señal.',
        hoja: 'glitch',
        clases: 'chromatic-failure',
    },
    {
        id: 'chroma-swap',
        nombre: 'Canales cruzados',
        que: 'Rojo y cian se intercambian a saltos.',
        cuando: 'El corazón de la avería cromática. También en el bloqueo.',
        hoja: 'glitch',
        clases: 'chromatic-failure',
    },
    {
        id: 'chroma-roll',
        nombre: 'Arrastre cromático',
        que: 'Una banda de color que recorre la imagen sin parar.',
        cuando: 'La rasgadura, y el velo de la lluvia binaria del ojo.',
        hoja: 'glitch',
        clases: 'chromatic-tear',
    },
    {
        id: 'collapse-drag',
        nombre: 'Arrastre del colapso',
        que: 'Barras que caen de arriba abajo y no paran.',
        cuando: 'Durante el fallo total del sistema.',
        hoja: 'glitch',
        clases: 'collapse-drag',
    },
    {
        id: 'collapse-dying',
        nombre: 'Muerte del tubo',
        que: 'La imagen se aplasta a una raya, se queda, y se apaga. Un CRT desenchufado.',
        cuando: 'El instante final del colapso, antes del reinicio.',
        hoja: 'glitch',
        clases: 'collapse-dying',
    },
    {
        id: 'phantom-open',
        nombre: 'Ventana fantasma',
        que: 'La ventana de error aparece en dos saltos, sin crecer.',
        cuando: 'Cada ventana de error del bloqueo.',
        hoja: 'glitch',
        clases: 'phantom-error',
    },
    {
        id: 'loose-slab-twitch',
        nombre: 'Tic del pedazo',
        que: 'Cada once segundos, la zona suelta se invierte un instante. Lo único que la delata.',
        cuando: 'Con la pared aún entera, antes de tocarla.',
        hoja: 'glitch',
        clases: 'loose-slab',
        necesitaFondo: true,
    },
    {
        id: 'loose-slab-fall',
        nombre: 'La caída',
        que: 'El pedazo gira y cae fuera de la pantalla.',
        cuando: 'Cuando la pared cede, tras los golpes.',
        hoja: 'glitch',
        clases: 'loose-slab loose-slab--cae',
    },
    {
        id: 'loose-slab-scan',
        nombre: 'Barrido del pedazo',
        que: 'El trozo se lleva su propio barrido puesto mientras da vueltas.',
        cuando: 'Sólo mientras cae. Es lo que lo hace un trozo de PANTALLA y no una ficha.',
        hoja: 'glitch',
        clases: 'loose-slab loose-slab--cae',
    },
    {
        id: 'wall-grain-boil',
        nombre: 'Grano hirviendo',
        que: 'La estática del hueco se remueve, a saltos.',
        cuando: 'Por el agujero de la pared, detrás y delante de la lluvia.',
        hoja: 'glitch',
        clases: 'wall-grain',
    },
    {
        id: 'wall-vhold',
        nombre: 'Sincronismo de la lluvia',
        que: 'La señal del agujero se descuadra cada tanto.',
        cuando: 'Sobre la lluvia binaria. ⚠ Nunca sobre el agujero: lo que se descuadra es la señal, no la pared.',
        hoja: 'glitch',
        clases: 'wall-rain',
    },
    {
        id: 'wall-scar-twitch',
        nombre: 'Tic de la cicatriz',
        que: 'La marca que quedó parpadea un instante cada veintitrés segundos.',
        cuando: 'Después del reinicio, para siempre. La pared no vuelve a estar entera.',
        hoja: 'glitch',
        clases: 'wall-scar',
    },

    // ── v02.css · la versión vieja ──────────────────────────────────────────
    {
        id: 'v02-indeciso',
        nombre: 'Indecisión de la v0.2',
        que: 'La avería cromática, pero peor hecha: la versión vieja ni siquiera falla bien.',
        cuando: 'Con la avería de señal activa dentro de la v0.2.',
        hoja: 'v02',
        clases: 'chromatic-failure',
    },
] as const;

/** Cuántos hay. Sale de la lista y nunca de un número escrito a mano. */
export const VISUAL_EFFECTS_TOTAL = VISUAL_EFFECTS.length;

/** Los de una hoja, para agrupar el catálogo sin repartir la lista. */
export function effectsOf(hoja: EffectSheet): readonly VisualEffect[] {
    return VISUAL_EFFECTS.filter((e) => e.hoja === hoja);
}
