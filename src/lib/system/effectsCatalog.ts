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
export type EffectSheet = 'animations' | 'glitch' | 'terminal' | 'v02';

/**
 * Dónde vive cada hoja.
 *
 * ⚠ VIVE ACÁ Y NO EN LOS TESTS, y no es orden por gusto: estaba escrita a mano
 * en DOS ficheros de test, y las dos copias se quedaron cortas a la vez. Se
 * añadió una animación a `terminal.css` y no falló nada — el efecto vivió sin
 * catalogar, o sea sin aparecer en la página de identidad, que es justo lo que
 * esa página promete que no pasa.
 *
 * Con el mapa en el módulo, añadir una hoja obliga a declararla una vez y los
 * dos tests la recorren solos.
 */
export const EFFECT_SHEETS: Record<EffectSheet, string> = {
    animations: 'src/styles/animations.css',
    glitch: 'src/styles/glitch.css',
    terminal: 'src/styles/terminal.css',
    v02: 'src/styles/v02.css',
};

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
     * Dónde hay que poner la clase para que el efecto haga algo.
     *
     * ⚠ ES LA DISTINCIÓN QUE HIZO QUE NO SE VIERA NINGUNO, y no es un detalle
     * de implementación: es lo que el efecto ES.
     *
     *  · `capa` — pinta algo PROPIO por encima. `.glitch-bands` trae su
     *    degradado y su `position: fixed`; sobre un elemento vacío funciona.
     *  · `pantalla` — deforma el elemento EN EL QUE ESTÁ. `.chromatic-failure`
     *    se aplica `filter` a sí mismo y `.glitch-jolt` un `transform`. Puestos
     *    sobre una capa vacía encima, filtran y mueven la NADA: la animación
     *    corre a sesenta cuadros y no se ve absolutamente nada.
     *
     * Un test lo lee del CSS y no se fía de la declaración: si los fotogramas
     * animan `transform` o `filter: url()`, exige `pantalla`.
     */
    donde: 'capa' | 'pantalla';
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
     * Qué hay que meterle DENTRO para que se vea lo que hace.
     *
     * ⚠ Un elemento vacío no basta para todos, y el fallo no se lee como «falta
     * el contenido»: se lee como «este efecto no funciona».
     *
     *  · `texto` — el cursor, los puntos de espera y el fantasma no dibujan
     *    nada por su cuenta: le hacen algo a unas letras.
     *  · `ventana` — la ventana fantasma es un CONTENEDOR. Vacía sale de tres
     *    píxeles de alto: tiene el ancho correcto y ninguna altura, así que no
     *    se parece en nada a lo que documenta.
     */
    relleno?: 'texto' | 'ventana';
    /**
     * El atributo que el DOCUMENTO tiene que llevar para que exista.
     *
     * ⚠ NO TODO SE ACTIVA CON UNA CLASE, y esto costó el único efecto que no se
     * reproducía. `v02-indeciso` vive bajo `[data-v02] .chromatic-failure`: sin
     * ese atributo en el `<html>` la regla no aplica y el efecto NO EXISTE, por
     * muchas clases que se le pongan al elemento.
     *
     * Un test lo deriva del CSS: busca el selector que declara la animación y,
     * si cuelga de un atributo, exige que la ficha lo diga.
     */
    estado?: string;
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
        donde: 'pantalla',
        relleno: 'texto',
        nombre: 'Cursor',
        que: 'Enciende y apaga el bloque del cursor, a saltos y sin desvanecer.',
        cuando: 'Siempre que hay un cursor de texto o una línea escribiéndose.',
        hoja: 'animations',
        clases: 'cursor-block',
    },
    {
        id: 'flash-out',
        donde: 'capa',
        nombre: 'Destello de tema',
        que: 'Un fogonazo que se apaga de golpe, sin transición.',
        cuando: 'Al cambiar entre claro y oscuro.',
        hoja: 'animations',
        clases: 'flash-transition',
    },
    {
        id: 'scanline',
        donde: 'capa',
        nombre: 'Barrido CRT',
        que: 'La línea que baja por la pantalla, sin parar, en nueve segundos.',
        cuando: 'Siempre. Es la respiración del tubo.',
        hoja: 'animations',
        clases: 'scanline-effect',
    },
    {
        id: 'row-feed',
        // Mueve el elemento EN EL QUE ESTá —anima su `transform`—, no pinta una
        // capa propia. El test lo comprueba leyendo los fotogramas.
        donde: 'pantalla',
        nombre: 'Papel entrando',
        que: 'Cada fila de la lista baja a su sitio en tres escalones, escalonada como una tirada de papel.',
        cuando: 'Al llegar la lista y al aparecer una nota nueva. No es un fundido: es un rodillo.',
        hoja: 'animations',
        clases: 'row-feed',
    },
    {
        id: 'row-pull',
        donde: 'pantalla',
        nombre: 'Papel saliendo',
        que: 'La fila se va hacia arriba y su hueco se cierra detrás, como una hoja que se tira del rodillo.',
        cuando: 'Al tirar una nota a la papelera, en el lateral — que es la lista que está delante mientras escribís.',
        hoja: 'animations',
        clases: 'row-pull',
    },
    {
        id: 'art-tune',
        donde: 'pantalla',
        nombre: 'Pieza sintonizándose',
        que: 'El dibujo llega aplastado a una línea y se abre, como una imagen entrando en un tubo.',
        cuando: 'Sólo en las que destapó el último `//art`. Las que ya tenías no se mueven: lo que destaca es lo ÚNICO que se mueve.',
        hoja: 'animations',
        clases: 'art-tune',
    },
    {
        id: 'loading-dots',
        donde: 'pantalla',
        relleno: 'texto',
        nombre: 'Puntos de espera',
        que: 'Tres puntos que aparecen de a uno, a saltos.',
        cuando: 'Mientras algo tarda: guardar, consultar el historial.',
        hoja: 'animations',
        clases: 'loading-dots',
    },

    // ── glitch.css · el fallo ambiental ─────────────────────────────────────
    {
        id: 'glitch-jolt',
        donde: 'pantalla',
        nombre: 'Tirón',
        que: 'La imagen salta de lado en escalones secos. La amplitud sale de `--glitch-amp`.',
        cuando: 'El fallo ambiental, y cada golpe a la pared suelta.',
        hoja: 'glitch',
        clases: 'glitch-jolt',
    },
    {
        id: 'band-roll',
        donde: 'capa',
        nombre: 'Franjas',
        que: 'Bandas horizontales que barren la pantalla de arriba abajo.',
        cuando: 'Acompañan al tirón, y viven mientras dura el golpe.',
        hoja: 'glitch',
        clases: 'glitch-bands',
    },
    {
        id: 'negative-blink',
        donde: 'capa',
        nombre: 'Vídeo inverso',
        que: 'Invierte la pantalla dos veces en doscientos milisegundos.',
        cuando: 'En los fallos que además dan la vuelta a la imagen.',
        hoja: 'glitch',
        clases: 'glitch-negative',
    },
    {
        id: 'scanline-stutter',
        donde: 'capa',
        nombre: 'Barrido trabado',
        que: 'El barrido baja, SE QUEDA CLAVADO a media pantalla y termina de golpe.',
        cuando: 'Cuando la máquina se traba. Es el mismo barrido de siempre, atascado.',
        hoja: 'glitch',
        clases: 'scanline-effect is-stuttering',
    },
    {
        id: 'ghost-shift',
        donde: 'pantalla',
        relleno: 'texto',
        nombre: 'Fantasma',
        que: 'Una sombra del texto desplazada que no se está quieta.',
        cuando: 'Texto que no termina de fijarse.',
        hoja: 'glitch',
        clases: 'glitch-ghost',
    },
    {
        id: 'vhold-slip',
        donde: 'pantalla',
        nombre: 'Salto de sincronismo',
        que: 'La imagen se va hacia arriba y vuelve, como un vertical mal ajustado.',
        cuando: 'Sólo en los fallos graves, montado sobre el tirón.',
        hoja: 'glitch',
        clases: 'glitch-jolt is-severe',
    },
    {
        id: 'level-drop',
        donde: 'capa',
        nombre: 'Caída de nivel',
        que: 'El brillo baja, sube de más y vuelve. Trabaja sobre lo que haya debajo.',
        cuando: 'Cuando la señal pierde fuerza un instante.',
        hoja: 'glitch',
        clases: 'glitch-level',
        necesitaFondo: true,
    },
    {
        id: 'chroma-drift',
        donde: 'pantalla',
        nombre: 'Deriva cromática',
        que: 'Los canales de color se separan despacio y vuelven.',
        cuando: 'Parte de la avería de señal, que se gana insistiendo con el tema.',
        hoja: 'glitch',
        clases: 'chromatic-failure',
    },
    {
        id: 'chroma-jolt',
        donde: 'pantalla',
        nombre: 'Tirón cromático',
        que: 'Un salto brusco cada tanto, dentro de la avería. Casi todo el ciclo está quieto.',
        cuando: 'Igual: durante la avería de señal.',
        hoja: 'glitch',
        clases: 'chromatic-failure',
    },
    {
        id: 'chroma-swap',
        donde: 'pantalla',
        nombre: 'Canales cruzados',
        que: 'Rojo y cian se intercambian a saltos.',
        cuando: 'El corazón de la avería cromática. También en el bloqueo.',
        hoja: 'glitch',
        clases: 'chromatic-failure',
    },
    {
        id: 'chroma-roll',
        donde: 'capa',
        nombre: 'Arrastre cromático',
        que: 'Una banda de color que recorre la imagen sin parar.',
        cuando: 'La rasgadura, y el velo de la lluvia binaria del ojo.',
        hoja: 'glitch',
        clases: 'chromatic-tear',
    },
    {
        id: 'collapse-drag',
        donde: 'capa',
        nombre: 'Arrastre del colapso',
        que: 'Barras que caen de arriba abajo y no paran.',
        cuando: 'Durante el fallo total del sistema.',
        hoja: 'glitch',
        clases: 'collapse-drag',
    },
    {
        id: 'collapse-dying',
        donde: 'capa',
        nombre: 'Muerte del tubo',
        que: 'La imagen se aplasta a una raya, se queda, y se apaga. Un CRT desenchufado.',
        cuando: 'El instante final del colapso, antes del reinicio.',
        hoja: 'glitch',
        clases: 'collapse-dying',
    },
    {
        id: 'pong-paused',
        donde: 'capa',
        nombre: 'Pausa del vsync-test',
        que: 'El rótulo de pausa parpadea en escalones, sin desvanecerse.',
        cuando: 'Con el juego parado, mientras espera que sigas.',
        hoja: 'glitch',
        clases: 'pong-paused',
    },
    {
        id: 'tube-on',
        donde: 'capa',
        nombre: 'Encendido del tubo',
        que: 'Un punto se abre en raya y la raya en imagen, y se desvanece dejando ver lo que hay detrás.',
        cuando: 'Al volver la corriente: el botón de reinicio, //reboot y la puerta del arranque.',
        hoja: 'terminal',
        clases: 'tube-on',
    },
    {
        id: 'phantom-open',
        relleno: 'ventana',
        donde: 'capa',
        nombre: 'Ventana fantasma',
        que: 'La ventana de error aparece en dos saltos, sin crecer.',
        cuando: 'Cada ventana de error del bloqueo.',
        hoja: 'glitch',
        clases: 'phantom-error',
    },
    {
        id: 'loose-slab-twitch',
        // `backdrop-filter`: filtra lo que hay DETRAS, asi que va encima.
        donde: 'capa',
        nombre: 'Tic del pedazo',
        que: 'Cada once segundos la zona suelta se invierte un instante. Es lo ÚNICO que la delata.',
        cuando: 'Con la pared aún entera, antes de tocarla · y en el pong, sólo mientras se dibuja con caracteres: ahí ya se rompió algo y el tic es de la misma avería.',
        hoja: 'glitch',
        clases: 'loose-slab',
        necesitaFondo: true,
    },
    {
        id: 'loose-slab-fall',
        donde: 'pantalla',
        nombre: 'La caída',
        que: 'El pedazo gira y cae fuera de la pantalla.',
        cuando: 'Cuando la pared cede, tras los golpes.',
        hoja: 'glitch',
        clases: 'loose-slab loose-slab--cae',
    },
    {
        id: 'loose-slab-scan',
        donde: 'capa',
        nombre: 'Barrido del pedazo',
        que: 'El trozo se lleva su propio barrido puesto mientras da vueltas.',
        cuando: 'Sólo mientras cae. Es lo que lo hace un trozo de PANTALLA y no una ficha.',
        hoja: 'glitch',
        clases: 'loose-slab loose-slab--cae',
    },
    {
        id: 'wall-grain-boil',
        donde: 'capa',
        nombre: 'Grano hirviendo',
        que: 'La estática del hueco se remueve, a saltos.',
        cuando: 'Por el agujero de la pared, detrás y delante de la lluvia · y en el pong en pausa: con la pelota quieta la pantalla se queda demasiado limpia, y una pantalla limpia y quieta parece apagada.',
        hoja: 'glitch',
        clases: 'wall-grain',
    },
    {
        id: 'wall-vhold',
        donde: 'capa',
        nombre: 'Sincronismo de la lluvia',
        que: 'La señal del agujero se descuadra cada tanto.',
        cuando: 'Sobre la lluvia binaria. ⚠ Nunca sobre el agujero: lo que se descuadra es la señal, no la pared.',
        hoja: 'glitch',
        clases: 'wall-rain',
    },
    {
        id: 'wall-scar-twitch',
        donde: 'capa',
        nombre: 'Tic de la cicatriz',
        que: 'La marca que quedó parpadea un instante cada veintitrés segundos.',
        cuando: 'Después del reinicio, para siempre. La pared no vuelve a estar entera.',
        hoja: 'glitch',
        clases: 'wall-scar',
    },

    // ── v02.css · la versión vieja ──────────────────────────────────────────
    {
        id: 'v02-vhold',
        donde: 'pantalla',
        // Sólo existe con la versión vieja puesta: es la forma en que falla UN
        // APARATO, y la 1.0 falla como una señal.
        estado: 'data-v02',
        nombre: 'Sincronismo perdido',
        que: 'La imagen se escapa hacia arriba a saltos y vuelve a engancharse.',
        cuando: 'Con la avería de señal, y SÓLO en la v0.2: es la forma en que falla un aparato viejo, no una señal.',
        hoja: 'v02',
        clases: 'chromatic-failure',
    },
    {
        id: 'v02-indeciso',
        estado: 'data-v02',
        donde: 'pantalla',
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
