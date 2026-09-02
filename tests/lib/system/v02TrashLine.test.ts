// tests/lib/system/v02TrashLine.test.ts

/**
 * Una línea de la papelera de la v0.2, dibujada.
 *
 * Sin rejilla de tres columnas, sin vista previa, sin «hace 2 minutos» y sin
 * `1.4 KB`: el nombre, unos puntos que rellenan hasta el borde, y los bytes
 * crudos. Alinear dos cosas en extremos opuestos con puntos es lo que se hacía
 * antes de que hubiera con qué, y es lo mismo que ya hace el pie de las
 * tarjetas.
 */

import { renderTrashLine, TRASH_COLS } from '@/lib/system/v02TrashLine';

describe('la línea de la papelera', () => {
    it('mide siempre lo mismo', () => {
        // En una rejilla de caracteres una línea más corta descuadra el dibujo
        // aunque los glifos alineen. Es la misma razón que en las tarjetas.
        const casos = [
            renderTrashLine('a', 1),
            renderTrashLine('apuntes de la reunion', 1482),
            renderTrashLine('x'.repeat(200), 999999),
            renderTrashLine('', 0),
        ];

        for (const linea of casos) expect(linea).toHaveLength(TRASH_COLS);
    });

    it('rellena con puntos hasta el dato', () => {
        expect(renderTrashLine('apuntes', 42)).toMatch(/^apuntes \.+ 42B$/);
    });

    it('enseña los bytes CRUDOS, sin formatear', () => {
        // Formatear un tamaño es trabajo que esta versión no había hecho.
        expect(renderTrashLine('n', 1482)).toContain('1482B');
        expect(renderTrashLine('n', 1482)).not.toContain('KB');
    });

    it('corta el título largo en vez de empujar el dato fuera', () => {
        const linea = renderTrashLine('x'.repeat(200), 7);
        expect(linea).toHaveLength(TRASH_COLS);
        expect(linea.endsWith('7B')).toBe(true);
    });

    it('a la nota sin nombre le deja el hueco a la vista', () => {
        expect(renderTrashLine('', 5)).toMatch(/^SIN_NOMBRE /);
    });

    it('todo lo que dibuja es ASCII imprimible', () => {
        // Los bloques y los marcos de caja no están en JetBrains Mono: los
        // pintaría una fuente de reserva con otras métricas y la línea dejaría
        // de medir lo que dice medir (REGLAS · C8).
        expect(renderTrashLine('apuntes', 1482)).toMatch(/^[\x20-\x7E]+$/);
    });
});
