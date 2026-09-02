// src/lib/system/v02TrashLine.ts

/**
 * Una línea de la papelera de la v0.2.
 *
 * El nombre, unos puntos que rellenan hasta el borde, y los bytes CRUDOS.
 * Ni rejilla, ni vista previa, ni «hace 2 minutos», ni `1.4 KB` — todo eso es
 * trabajo que esta versión todavía no había hecho. Alinear dos cosas en
 * extremos opuestos con puntos es lo que se hacía cuando no había con qué.
 *
 * Pura y probada carácter a carácter, como el resto de los dibujos.
 */

/** Lo ancho que se dibuja, en caracteres. */
export const TRASH_COLS = 46;

const SIN_NOMBRE = 'SIN_NOMBRE';

export function renderTrashLine(title: string, bytes: number): string {
    const nombre = title.trim() || SIN_NOMBRE;
    const dato = `${bytes}B`;

    // Se reserva primero el sitio del dato y luego se recorta el nombre: al
    // revés, un título largo empujaría el tamaño fuera del cuadro.
    const paraNombre = TRASH_COLS - dato.length - 4;
    const corto =
        nombre.length > paraNombre
            ? `${nombre.slice(0, Math.max(0, paraNombre - 1))}>`
            : nombre;

    const puntos = TRASH_COLS - corto.length - dato.length - 2;

    return `${corto} ${'.'.repeat(Math.max(1, puntos))} ${dato}`;
}
