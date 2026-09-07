// src/lib/system/identity.ts

/**
 * Los materiales del sistema: color, cuerpo de letra y familias.
 *
 * ⚠ QUÉ PROBLEMA RESUELVE. `DISENO.md` describe todo esto en prosa y en una
 * tabla escrita a mano, y una tabla a mano envejece: los valores de ahí ya
 * estuvieron desincronizados con el CSS más de una vez. Acá la lista de NOMBRES
 * vive en el código y un test la ata contra `globals.css` en las dos
 * direcciones, igual que se hizo con los efectos.
 *
 * ⚠ Y LOS VALORES NO SE COPIAN. El banco los lee del navegador con
 * `getComputedStyle`, así que enseña lo que el tema activo dice de verdad — no
 * lo que alguien escribió aquí hace tres meses. Un catálogo de color que copia
 * los hex a mano es exactamente el que empieza a mentir al primer retoque.
 */

export interface DesignToken {
    /** El nombre de la variable CSS, sin `--`. Es lo que ata el test. */
    id: string;
    /** Para qué sirve. */
    para: string;
}

/**
 * Los colores.
 *
 * ⚠ NINGUNO ES UN ACENTO DE MARCA. `ok`, `warn` y `danger` sólo comunican
 * estado, y que todo vaya bien NO SE PINTA: un indicador verde permanente es
 * ruido, no información. Por eso el sistema es monocromo salvo cuando algo
 * pide que lo mires.
 */
export const COLOR_TOKENS: readonly DesignToken[] = [
    { id: 'color-primary', para: 'El lienzo. El fondo de todo.' },
    { id: 'color-secondary', para: 'Barras de herramientas y paneles.' },
    { id: 'color-tertiary', para: 'El papel: fichas y área de escritura.' },
    { id: 'color-ink', para: 'La tinta. Se invierte con el tema.' },
    { id: 'color-body', para: 'El texto corriente.' },
    { id: 'color-soft', para: 'Texto secundario, un punto más apagado.' },
    { id: 'color-meta', para: 'Metadatos. Contraste medido: 6,1:1 sobre el papel.' },
    { id: 'color-inverse', para: 'Texto sobre tinta, en las barras invertidas.' },
    { id: 'color-line', para: 'Los filetes principales.' },
    { id: 'color-line-soft', para: 'Separadores internos, más callados.' },
    { id: 'color-ok', para: 'Estado correcto. Casi no se usa: que todo vaya bien no se pinta.' },
    { id: 'color-warn', para: 'Algo que hay que mirar: sin red, servidor caído, sin guardar.' },
    { id: 'color-danger', para: 'Error, y el único uso destructivo: el borrado definitivo.' },
    { id: 'color-scrim', para: 'El velo detrás de los diálogos. Token propio, no una mezcla.' },
];

/**
 * La escala de cuerpos.
 *
 * ⚠ `2xs` NO ES DECORATIVO. Existe por la lluvia binaria: a 6 px el navegador
 * pinta el texto con suavizado de SUBPÍXEL y los dígitos salen azules y
 * naranjas — color suelto en la única parte del producto que no puede llevar
 * ninguno. La escala arranca donde arranca por eso.
 */
export const TEXT_TOKENS: readonly DesignToken[] = [
    { id: 'text-2xs', para: 'Lo más pequeño que se lee: marcas y contadores.' },
    { id: 'text-xs', para: 'Metadatos y comentarios.' },
    { id: 'text-sm', para: 'Texto de apoyo.' },
    { id: 'text-base', para: 'El cuerpo. Lo que se lee de verdad.' },
    { id: 'text-lg', para: 'Títulos de sección.' },
    { id: 'text-xl', para: 'Títulos.' },
    { id: 'text-2xl', para: 'Cabeceras.' },
    { id: 'text-3xl', para: 'El rótulo del sistema.' },
];

/** Las dos familias, y sólo dos. */
export const FONT_TOKENS: readonly DesignToken[] = [
    {
        id: 'font-mono',
        para: 'JetBrains Mono. Todo el texto corriente: es una terminal, no un documento.',
    },
    {
        id: 'font-pixel',
        para: 'VT323. Sólo cabecera, títulos de sección y rótulos. Si se usa para leer, cansa.',
    },
];

/** Un icono y lo que quiere decir. */
export interface SystemIcon {
    /** El glifo, corchetes incluidos. Es su identidad y lo que ata el test. */
    glifo: string;
    para: string;
}

/**
 * Los iconos, todos entre corchetes y de trazo fino.
 *
 * ⚠ NADA DE EMOJI, y hay una historia detrás. El botón de papelera era `[🗑]` y
 * se pintaba A COLOR, con mucho más peso que las flechas de al lado: parecía una
 * calcomanía pegada encima de la interfaz. Es la misma razón por la que el
 * sistema es monocromo — un solo elemento con color se lleva toda la atención.
 *
 * Un test los ata a `DISENO.md`: el documento y esta lista tienen que decir lo
 * mismo, en las dos direcciones.
 */
export const SYSTEM_ICONS: readonly SystemIcon[] = [
    { glifo: '[+]', para: 'Crear. Nueva nota, nuevo archivo.' },
    { glifo: '[←]', para: 'Volver.' },
    { glifo: '[↶]', para: 'Deshacer.' },
    { glifo: '[↷]', para: 'Rehacer.' },
    { glifo: '[↧]', para: 'Mandar abajo: mover a la papelera. NO es borrar.' },
    { glifo: '[X]', para: 'Borrado definitivo. El único que va en rojo.' },
    { glifo: '[✓]', para: 'Confirmado.' },
    { glifo: '[✗]', para: 'Fallido, o señal perdida.' },
    { glifo: '[↓]', para: 'Descargar o desplegar.' },
    { glifo: '[◐]', para: 'El tema. El semicírculo cambia de lado al invertirlo.' },
];
