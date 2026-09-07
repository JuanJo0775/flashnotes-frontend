// src/lib/system/screensCatalog.ts

/**
 * Las PANTALLAS del sistema: los momentos completos, no las animaciones sueltas.
 *
 * ⚠ POR QUÉ NO BASTABA CON EL CATÁLOGO DE EFECTOS.
 *
 * Aquél se construyó sobre `@keyframes`, y esa frontera —que es exacta y
 * comprobable— deja fuera todo lo que no es una animación. El barrido, el
 * arranque, el colapso, el bloqueo, la página muerta y el pong son
 * COMPONENTES: pantallas enteras con su lógica, su texto y su ritmo. Ninguna
 * aparecía, y son justo las que más se recuerdan.
 *
 * Y hay un segundo problema que el catálogo de efectos no podía resolver: la
 * avería de señal se veía partida en tres piezas (`chroma-swap`, `chroma-drift`,
 * `chroma-jolt`) cuando quien la usa la conoce como UNA cosa. Documentar los
 * engranajes no es documentar el efecto.
 *
 * ⚠ TODAS SE MONTAN INERTES. Estas pantallas hacen cosas de verdad: el barrido
 * devuelve al arranque, el colapso recarga la página, la muerta intenta cerrar
 * la pestaña y el bloqueo persiste en `localStorage` aunque recargues. Un
 * catálogo que te secuestra la sesión al consultarlo deja de ser un catálogo,
 * así que acá se ven y no tocan nada.
 */

/** Qué hace falta preparar para que la pantalla se vea. */
export type ScreenSetup =
    /** Se monta y ya. */
    | 'directo'
    /** Necesita una clase sobre el contenido. */
    | 'clase'
    /** Necesita un atributo en el documento. */
    | 'atributo';

export interface SystemScreen {
    /** Identidad, y lo que ata el test contra los componentes que existen. */
    id: string;
    /** El fichero de `src/components/effects/`, sin extensión. */
    componente: string;
    nombre: string;
    /** Qué es, en una línea. */
    que: string;
    /** Cuándo la ve alguien jugando. */
    cuando: string;
    como: ScreenSetup;
    /**
     * Lo que esta pantalla haría de verdad, y que acá está desactivado.
     *
     * Se escribe para que quien lea el catálogo sepa que lo que ve es una
     * demostración y no el suceso: si dice que recarga, es que recarga.
     */
    inerte?: string;
}

export const SYSTEM_SCREENS: readonly SystemScreen[] = [
    {
        id: 'boot',
        componente: 'BootScreen',
        nombre: 'Arranque',
        que: 'Barras de ajuste, el logo y la comprobación de memoria, en ese orden.',
        cuando: 'Al abrir, y después de cada reinicio del sistema.',
        como: 'directo',
        inerte: 'al terminar devolvería a la app',
    },
    {
        id: 'wipe',
        componente: 'WipeScreen',
        nombre: 'El barrido',
        que: 'El borrado paso a paso, con su cuenta y su confirmación final.',
        cuando: 'Con `//reset`, cuando decidís borrarlo todo. Y su versión en broma.',
        como: 'directo',
        inerte: 'al terminar devolvería al arranque',
    },
    {
        id: 'collapse',
        componente: 'SystemCollapse',
        nombre: 'Fallo total',
        que: 'El sistema se cae: barras que arrastran, cuenta atrás y rearranque.',
        cuando: 'Cuando la integridad llega a cero. Cuanto más insistís, peor vuelve.',
        como: 'directo',
        inerte: 'recargaría la página al acabar',
    },
    {
        id: 'lockout',
        componente: 'SystemLockout',
        nombre: 'Memoria corrupta',
        que: 'La pantalla de la que no se sale recargando: o resolvés el puzzle o esperás.',
        cuando: 'Si te ensañás con el colapso. Es lo ÚNICO que sobrevive a un F5.',
        como: 'directo',
        inerte: 'acá no encierra: el bloqueo de verdad persiste en el navegador',
    },
    {
        id: 'dead',
        componente: 'DeadPage',
        nombre: 'La página muerta',
        que: 'Lo que queda cuando ya no queda nada.',
        cuando: 'El final de la escalada.',
        como: 'directo',
        inerte: 'intentaría cerrar la pestaña',
    },
    {
        id: 'pong',
        componente: 'PongOverlay',
        nombre: 'Prueba de sincronismo',
        que: 'Un pong entero, escondido detrás de un nombre de diagnóstico.',
        cuando: 'Con el comando de la prueba de vsync.',
        como: 'directo',
    },
    {
        id: 'chromatic',
        componente: 'ChromaticFailure',
        nombre: 'Avería de señal',
        que: 'La separación de canales sobre TODO: bordes, fondos, botones y medidores.',
        cuando: 'Ensañándose con el interruptor de tema: diez pulsaciones seguidas y rápidas.',
        como: 'clase',
    },
    {
        id: 'v02',
        componente: 'V02Skin',
        nombre: 'La versión vieja',
        que: 'La piel de la v0.2, con sus marcos de caracteres y sus esquinas.',
        cuando: 'Cuando conseguís volver a la versión anterior.',
        como: 'atributo',
    },
];

export const SYSTEM_SCREENS_TOTAL = SYSTEM_SCREENS.length;

/**
 * Los componentes de `src/components/effects/` que NO son pantallas.
 *
 * ⚠ ESTA LISTA EXISTE PARA QUE NADIE PUEDA AÑADIR UNA PANTALLA SIN CATALOGARLA.
 * Un test compara el directorio con la suma de las dos listas: un componente
 * nuevo no encaja en ninguna y falla, y entonces hay que decidir si es una
 * pantalla o no. Sin esto el catálogo envejece en la primera semana.
 */
export const NOT_SCREENS: readonly string[] = [
    // Piezas que viven DENTRO de otra pantalla, no por su cuenta.
    'BootPrompt',
    'CommandRows',
    'ScrambleLine',
    'TypewriterText',
    // Capas ambientales: no son un momento, son el fondo permanente.
    'GlitchLayer',
    'V02Glitches',
    // No pinta NADA: es el enchufe del sonido, y el único sitio de la app que
    // sabe que el sonido existe. Documentado en la sección de sonido.
    'SoundWire',
    // Ventanas sueltas, ya documentadas como efecto.
    'PhantomError',
    // La escena del final: se documenta aparte porque exige su propio estado.
    'LooseWall',
];
