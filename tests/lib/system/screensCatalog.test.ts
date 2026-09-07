// tests/lib/system/screensCatalog.test.ts

/**
 * NINGUNA PANTALLA SE QUEDA FUERA DEL CATÁLOGO.
 *
 * ⚠ POR QUÉ ESTE TEST ES DISTINTO DE LOS OTROS DOS.
 *
 * El de efectos y el de tokens comparan dos listas: lo declarado contra lo que
 * el CSS declara. Acá la fuente no es un fichero, es un DIRECTORIO — y un
 * componente nuevo aparece sin avisar a nadie.
 *
 * Por eso la comprobación es por exhaustividad: cada fichero de
 * `components/effects` tiene que estar catalogado como pantalla O declarado
 * explícitamente como «no es una pantalla». Uno que no esté en ninguna de las
 * dos listas falla, y obliga a decidir. Sin esto, el catálogo envejece en la
 * primera semana: es exactamente lo que ya pasó cuando se construyó sobre
 * `@keyframes` y se quedaron fuera el barrido, el arranque y el colapso.
 */

import { readdirSync } from 'node:fs';
import {
    NOT_SCREENS,
    SYSTEM_SCREENS,
    SYSTEM_SCREENS_TOTAL,
} from '@/lib/system/screensCatalog';

const DIR = 'src/components/effects';

/** Los componentes que existen de verdad. */
function componentes(): string[] {
    return readdirSync(DIR)
        .filter((f) => f.endsWith('.tsx'))
        .map((f) => f.replace(/\.tsx$/, ''))
        .sort();
}

describe('el catálogo cubre el directorio entero', () => {
    it('cada componente está catalogado o declarado como que no es pantalla', () => {
        const cubiertos = new Set([...SYSTEM_SCREENS.map((s) => s.componente), ...NOT_SCREENS]);
        const huerfanos = componentes().filter((c) => !cubiertos.has(c));

        // Se listan todos de una vez: cuando alguien añade una tanda, arreglarlos
        // de uno en uno obliga a correr el test una vez por componente.
        expect(huerfanos).toEqual([]);
    });

    it('y no se cataloga nada que no exista', () => {
        // Un componente borrado que sigue en el catálogo es peor que uno
        // ausente: alguien lo busca para arreglarlo y arregla un fantasma.
        const existen = new Set(componentes());

        for (const s of SYSTEM_SCREENS) expect(existen.has(s.componente)).toBe(true);
        for (const n of NOT_SCREENS) expect(existen.has(n)).toBe(true);
    });

    it('ninguna aparece en las dos listas a la vez', () => {
        const enPantallas = new Set(SYSTEM_SCREENS.map((s) => s.componente));

        for (const n of NOT_SCREENS) expect(enPantallas.has(n)).toBe(false);
    });
});

describe('cada ficha sirve', () => {
    it('tiene nombre, explicación y momento', () => {
        for (const s of SYSTEM_SCREENS) {
            expect(s.nombre.length).toBeGreaterThan(3);
            expect(s.que.length).toBeGreaterThan(20);
            expect(s.cuando.length).toBeGreaterThan(15);
        }
    });

    it('no hay dos con el mismo identificador', () => {
        const ids = SYSTEM_SCREENS.map((s) => s.id);

        expect(new Set(ids).size).toBe(ids.length);
    });

    it('el total sale de la lista', () => {
        expect(SYSTEM_SCREENS_TOTAL).toBe(SYSTEM_SCREENS.length);
    });
});
