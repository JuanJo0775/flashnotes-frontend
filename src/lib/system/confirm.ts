// src/lib/system/confirm.ts

/**
 * La pregunta de una terminal: `¿SEGURO? [y/n]`.
 *
 * La usa `//reset`, que es el único comando que destruye algo tuyo —secretos,
 * piezas, marcadores, el progreso entero— y estaba a un solo Enter de distancia.
 *
 * POR QUÉ ASÍ Y NO CON UN DIÁLOGO. Porque esto es una terminal, y una terminal
 * pregunta en la misma línea. Un modal del navegador rompería la ficción justo
 * en el momento en que más hace falta creerla, y encima roba el foco.
 *
 * LO QUE LA HACE SEGURA no es que la `y` sea difícil de teclear —no lo es— sino
 * que hay que **volver a escribir** después de haber leído el aviso. Un comando
 * copiado y pegado, o dejado escrito en una nota, se queda en la pregunta.
 *
 * Vive en memoria a propósito: una pregunta pendiente al recargar sería una
 * trampa esperando a que alguien teclee una `y` por otra cosa.
 */

/**
 * Qué se está preguntando.
 *
 * `entity-clean` es la oferta del ente: «puedo limpiar todo esto». Comparte
 * mecanismo con `reset` —la misma letra, la misma línea— y justamente por eso
 * ⚠ QUIEN LEA LA RESPUESTA TIENE QUE MIRAR CUÁL DE LAS DOS ERA. Confundirlas
 * convierte un «sí, limpiá la papelera» en un borrado del progreso entero.
 */
export type ConfirmId = 'reset' | 'entity-clean';

let pendiente: ConfirmId | null = null;

/** Deja una pregunta en el aire. */
export function askConfirm(id: ConfirmId) {
    pendiente = id;
}

/** Qué se está preguntando ahora mismo, si es que se pregunta algo. */
export function pendingConfirm(): ConfirmId | null {
    return pendiente;
}

/** La retira sin contestarla: cualquier otro comando cancela la pregunta. */
export function clearConfirm() {
    pendiente = null;
}

export type ConfirmAnswer = 'yes' | 'no';

/**
 * Lee una respuesta.
 *
 * Acepta `y`, `s` y `n` sueltas —`s` porque en español se contesta «sí» y
 * teclear `y` no es lo primero que sale— y nada más. Cualquier otra cosa
 * devuelve `null` y **no cuenta como un no**: quien escribió otra cosa no está
 * contestando, está haciendo otra cosa, y su texto tiene que seguir su camino.
 */
export function readAnswer(texto: string): ConfirmAnswer | null {
    const limpio = texto.trim().toLowerCase();

    if (limpio === 'y' || limpio === 's') return 'yes';
    if (limpio === 'n') return 'no';

    return null;
}
