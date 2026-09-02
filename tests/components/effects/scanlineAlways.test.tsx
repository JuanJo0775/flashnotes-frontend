// tests/components/effects/scanlineAlways.test.tsx

/**
 * EL BARRIDO ESTÁ EN TODAS LAS PANTALLAS, SIN EXCEPCIÓN.
 *
 * Es la regla más fácil de romper del proyecto y ya se rompió dos veces, las dos
 * en silencio y las dos por lo mismo: alguien declaró `animation` sobre un
 * selector que también alcanzaba al barrido, y `animation` no se suma —
 * sustituye.
 *
 * El barrido no es un adorno de la pantalla de inicio: es el REFRESCO DEL TUBO,
 * o sea una propiedad de la pantalla, no de lo que se esté pintando en ella. Si
 * se para, la app deja de ser un monitor y pasa a ser una página web con un
 * efecto encima.
 *
 * Este test lee el CSS y prohíbe el patrón que lo mató. No comprueba que se vea
 * —eso es del navegador— comprueba que nadie pueda volver a apagarlo sin darse
 * cuenta.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(process.cwd(), 'src', 'styles');

const CSS = readdirSync(DIR)
    .filter((f) => f.endsWith('.css'))
    .map((f) => `\n/* ${f} */\n${readFileSync(join(DIR, f), 'utf8')}`)
    .join('\n');

/** Las reglas, troceadas en bloques `selector { cuerpo }`. */
const REGLAS = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
    selector: m[1].trim(),
    cuerpo: m[2],
}));

describe('nadie puede pararlo sin querer', () => {
    it('ninguna regla que alcance a body > * declara `animation`', () => {
        /*
         * EL PATRÓN QUE LO MATÓ, dos veces.
         *
         * `body > * { animation: ... }` alcanza al barrido, que es hijo directo
         * de body, y le sustituye la suya. Para desvanecer la app hay que usar
         * `transition`, que no toca `animation`.
         */
        const culpables = REGLAS.filter(
            (r) =>
                /body\s*>\s*\*/.test(r.selector) &&
                /(^|[\s;])animation\s*:/.test(r.cuerpo) &&
                !/animation\s*:\s*none/.test(r.cuerpo)
        );

        expect(culpables.map((c) => c.selector)).toEqual([]);
    });

    it('toda regla que le declare `animation` incluye la suya', () => {
        // Teñirlo, sí. Detenerlo, no. `[data-failing]` lo paraba durante toda la
        // avería cromática: se quedaba clavado a media pantalla cambiando de
        // color.
        const suyas = REGLAS.filter(
            (r) =>
                r.selector.includes('.scanline-effect') &&
                /(^|[\s;])animation\s*:/.test(r.cuerpo) &&
                !/animation\s*:\s*none/.test(r.cuerpo)
        );

        expect(suyas.length).toBeGreaterThan(0);

        for (const regla of suyas) {
            expect(regla.cuerpo).toMatch(/\bscanline\b/);
        }
    });

    it('vive por encima de todas las capas que tapan la app', () => {
        // Colapso 10000, bloqueo 10001, arranque y borrado por debajo. Si el
        // barrido no estuviera arriba del todo, desaparecería justo en las
        // pantallas donde más sentido tiene.
        const base = REGLAS.find(
            (r) => r.selector === '.scanline-effect'
        );

        const z = Number(base?.cuerpo.match(/z-index:\s*(\d+)/)?.[1] ?? 0);

        expect(z).toBeGreaterThan(10001);
    });
});
