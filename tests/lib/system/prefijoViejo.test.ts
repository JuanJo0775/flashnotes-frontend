// tests/lib/system/prefijoViejo.test.ts

/**
 * NINGÚN TEXTO DEL SISTEMA MANDA A TECLEAR EL PREFIJO VIEJO.
 *
 * Los comandos se escribían con `>` y pasaron a `//` por una razón concreta: el
 * editor pinta un `>` al principio de cada línea, así que `>help` se veía en
 * pantalla como `> >help` — parecía un error de la app antes que un comando.
 *
 * ⚠ PERO UN MENSAJE SE QUEDÓ ATRÁS. `//chaos` seguía diciendo «USÁ >chaos on |
 * >chaos off» mucho después del cambio, y nadie lo vio porque NO ROMPE NADA:
 * simplemente le dice a quien lo lee que teclee algo que ya no existe. Los tests
 * comprueban lo que la app hace, y esto era lo que la app CUENTA.
 *
 * Éste barre los textos en vez de la conducta, que es la única forma de cazarlo.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { COMMAND_PREFIX } from '@/lib/system/commands';

/** Todos los `.ts`/`.tsx` de `src`, que es donde vive lo que se le enseña. */
function fuentes(dir: string): { ruta: string; texto: string }[] {
    const salida: { ruta: string; texto: string }[] = [];

    for (const nombre of readdirSync(dir)) {
        const ruta = join(dir, nombre);

        if (statSync(ruta).isDirectory()) salida.push(...fuentes(ruta));
        else if (/\.tsx?$/.test(nombre)) {
            salida.push({ ruta, texto: readFileSync(ruta, 'utf8') });
        }
    }

    return salida;
}

describe('el prefijo de los comandos', () => {
    it('sigue siendo el nuevo', () => {
        expect(COMMAND_PREFIX).toBe('//');
    });

    it('⚠ y ningún texto manda a teclear el viejo', () => {
        /*
         * Se busca `>` pegado al nombre de un comando conocido, que es la forma
         * exacta que tenía el prefijo viejo. Buscar `>` a secas sería inútil:
         * está en las flechas de función, en el JSX y en medio del código.
         *
         * Los comentarios se saltan — este mismo fichero habla del prefijo
         * viejo, y varios comentarios del código cuentan por qué se cambió.
         */
        const VIEJO =
            />(chaos|help|art|reset|diag|panic|hi|keep|ls|df|ps|log|sudo|date|uptime|whoami|history|clear)\b/;

        const culpables: string[] = [];

        for (const { ruta, texto } of fuentes('src')) {
            for (const linea of texto.split('\n')) {
                const limpia = linea.trim();

                // Comentarios fuera: hablar del prefijo viejo está permitido.
                if (limpia.startsWith('*') || limpia.startsWith('//')) continue;
                // Y las flechas de función tampoco cuentan.
                if (!VIEJO.test(limpia)) continue;

                culpables.push(`${ruta}: ${limpia}`);
            }
        }

        expect(culpables).toEqual([]);
    });
});
