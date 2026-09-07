// tests/lib/system/identity.test.ts

/**
 * LOS MATERIALES DECLARADOS Y LOS QUE EXISTEN SON LOS MISMOS.
 *
 * Misma razón que el catálogo de efectos y que el test de `ARTE.md`: hay dos
 * copias de la misma verdad en sitios distintos, y se separan en silencio. Un
 * token que se renombra en `globals.css` deja aquí una entrada que apunta a
 * nada — y la página de identidad enseñaría un hueco sin decir por qué.
 *
 * ⚠ Se comprueban los NOMBRES, nunca los valores. Los valores los lee el
 * navegador del tema activo, que es la única forma de que un catálogo de color
 * no empiece a mentir al primer retoque.
 */

import { readFileSync } from 'node:fs';
import { COLOR_TOKENS, FONT_TOKENS, SYSTEM_ICONS, TEXT_TOKENS } from '@/lib/system/identity';

const CSS = readFileSync('src/app/globals.css', 'utf8');

/** Los nombres de variable que el CSS declara con un prefijo. */
function declarados(prefijo: string): string[] {
    const re = new RegExp(`--(${prefijo}[a-z0-9-]*)\\s*:`, 'g');

    return [...new Set([...CSS.matchAll(re)].map((m) => m[1]))].sort();
}

describe('el color', () => {
    it('declara exactamente los que el catálogo dice', () => {
        expect(COLOR_TOKENS.map((t) => t.id).sort()).toEqual(declarados('color-'));
    });

    it('y cada uno explica para qué es', () => {
        for (const t of COLOR_TOKENS) expect(t.para.length).toBeGreaterThan(15);
    });
});

describe('la escala de cuerpos', () => {
    it('declara exactamente los que el catálogo dice', () => {
        expect(TEXT_TOKENS.map((t) => t.id).sort()).toEqual(declarados('text-'));
    });

    it('⚠ y va de menor a mayor, que es lo que la hace una escala', () => {
        /*
         * El orden de la lista es el orden de lectura del catálogo. Si alguien
         * mete un cuerpo nuevo en medio sin respetarlo, la página de identidad
         * enseña una escala que sube y baja, y deja de servir para elegir.
         */
        const orden = TEXT_TOKENS.map((t) => t.id);

        expect(orden[0]).toBe('text-2xs');
        expect(orden[orden.length - 1]).toBe('text-3xl');
    });
});

describe('las familias', () => {
    it('son dos, y las dos existen', () => {
        // Dos y no tres: la tercera siempre es la que alguien mete «sólo para
        // este título» y acaba en media app.
        expect(FONT_TOKENS).toHaveLength(2);

        for (const f of FONT_TOKENS) expect(CSS).toContain(`--${f.id}:`);
    });
});

describe('los iconos', () => {
    /**
     * ⚠ SE COMPARAN CONTRA `DISENO.md` Y NO CONTRA EL CÓDIGO, y es a propósito:
     * los iconos son literales repartidos por el JSX —no hay una constante que
     * los reúna— así que la única lista que existe es la del documento. Atar el
     * catálogo a ella es lo que impide que se separen.
     */
    /*
     * ⚠ SÓLO EL PÁRRAFO DE LA LISTA, no la sección entera. Debajo, la prosa
     * cuenta que el botón de papelera ERA `[🗑]` y se quitó por pintarse a
     * color; leyendo la sección completa, el catálogo acababa exigiendo
     * justamente el icono que el documento dice que ya no existe.
     */
    const SECCION = /## Iconos\n\n(Todos entre corchetes[\s\S]*?)\n\n/.exec(
        readFileSync('docs/DISENO.md', 'utf8').replace(/\r/g, '')
    )?.[1];

    it('la sección existe en el documento', () => {
        // Si alguien la renombra, el test de abajo pasaría con una lista vacía y
        // diría que todo cuadra sin haber comparado nada.
        expect(SECCION).toBeDefined();
    });

    it('el catálogo y el documento dicen los mismos', () => {
        const enElDoc = [...SECCION!.matchAll(/`(\[[^\]]+\])`/g)].map((m) => m[1]);

        expect(SYSTEM_ICONS.map((i) => i.glifo).sort()).toEqual([...new Set(enElDoc)].sort());
    });

    it('y cada uno dice para qué es', () => {
        for (const i of SYSTEM_ICONS) expect(i.para.length).toBeGreaterThan(5);
    });
});
