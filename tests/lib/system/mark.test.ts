// tests/lib/system/mark.test.ts

/**
 * LA MARCA DEL DISCO ES LA MARCA DE LA TABLA.
 *
 * Hay tres copias de un mismo dibujo: la tabla de rectángulos, el `.svg` que se
 * guarda al lado de la app y el `.ico` que se rasteriza para Safari. Las tres
 * se separan en silencio —nadie mira la pestaña— y el día que pase, el icono
 * bueno vive en el código y el que se ve es otro.
 *
 * ⚠ Y ACÁ SÍ SE COMPRUEBAN VALORES DE COLOR, al revés que en `identity.test.ts`.
 * Allá no se comprueban porque el banco los lee del navegador; el icono no
 * tiene navegador al que preguntarle y los lleva escritos, así que es el único
 * sitio del sistema donde un hex puede quedarse viejo sin que se note.
 */

import { readFileSync } from 'node:fs';
import { MARK_COLORS, MARK_GRID, MARK_RECTS, markSvg } from '@/lib/system/mark';

const CSS = readFileSync('src/app/globals.css', 'utf8');
const ICO = readFileSync('src/app/favicon.ico');

/*
 * ⚠ EL FINAL DE LÍNEA SE NORMALIZA ANTES DE COMPARAR, y no es un capricho de
 * Windows: git convierte los finales al sacar el árbol, así que el mismo archivo
 * llega con `\r\n` en una máquina y con `\n` en otra. Sin esto, la comparación
 * fallaría en la mitad de los sitios diciendo que el dibujo cambió — que es la
 * peor clase de test: uno que grita por algo que no es lo que vigila.
 */
const SVG = readFileSync('src/app/icon.svg', 'utf8').replace(/\r\n/g, '\n');

describe('el dibujo', () => {
    it('⚠ cae en píxeles enteros: todas las medidas son pares', () => {
        /*
         * La razón entera de la rejilla de 32. A la mitad —16 px, el tamaño de
         * una pestaña— un número impar cae entre dos píxeles y el navegador lo
         * pinta con antialias: la marca sale gris y borrosa en el único sitio
         * donde de verdad se la ve.
         */
        for (const r of MARK_RECTS) {
            expect([r.x % 2, r.y % 2, r.w % 2, r.h % 2]).toEqual([0, 0, 0, 0]);
        }
    });

    it('y cabe entero en la rejilla', () => {
        for (const r of MARK_RECTS) {
            expect(r.x + r.w).toBeLessThanOrEqual(MARK_GRID);
            expect(r.y + r.h).toBeLessThanOrEqual(MARK_GRID);
        }
    });
});

describe('el archivo que sirve el navegador', () => {
    it('es exactamente el que sale de la tabla', () => {
        expect(SVG).toBe(markSvg());
    });

    it('⚠ lleva su propio lienzo: no es tinta sobre transparente', () => {
        // Sin fondo, en una barra oscura la marca desaparecería.
        expect(SVG).toContain(`<rect class="g" width="${MARK_GRID}" height="${MARK_GRID}"/>`);
    });

    it('y se da vuelta con el tema del sistema', () => {
        expect(SVG).toContain('@media (prefers-color-scheme: dark)');
    });
});

describe('los colores escritos a mano', () => {
    /** Lo que `globals.css` declara para esa variable, en orden de aparición. */
    function declarado(nombre: string): string[] {
        const re = new RegExp(`--${nombre}: *(#[0-9a-f]{6})`, 'g');

        return [...CSS.matchAll(re)].map((m) => m[1]);
    }

    it('son los del tema claro', () => {
        // El primero de cada lista es el de `@theme`, que es el tema por defecto.
        expect(declarado('color-primary')[0]).toBe(MARK_COLORS.ground.light);
        expect(declarado('color-ink')[0]).toBe(MARK_COLORS.ink.light);
    });

    it('y los del oscuro', () => {
        // Los demás son los del cuarto oscuro, y son todos el mismo valor.
        for (const v of declarado('color-primary').slice(1)) {
            expect(v).toBe(MARK_COLORS.ground.dark);
        }
        for (const v of declarado('color-ink').slice(1)) {
            expect(v).toBe(MARK_COLORS.ink.dark);
        }
    });
});

/**
 * EL `.ico`, que es el mismo dibujo hecho píxeles.
 *
 * ⚠ SE MIRA EL CONTENIDO Y NO EL TAMAÑO DEL ARCHIVO. Un `.ico` con el peso
 * correcto y el logo de otra empresa dentro pasa cualquier comprobación de
 * bytes. Lo que se comprueba es que en el centro de cada rectángulo de la tabla
 * haya tinta y en los huecos haya lienzo: si alguien mueve la geometría y no
 * vuelve a correr `node scripts/marca.mjs`, esto se cae.
 */
describe('el .ico', () => {
    /** Devuelve el píxel (x, y) de la imagen de 32 del `.ico`, en RGB. */
    function pixel(x: number, y: number): string {
        const cuantas = ICO.readUInt16LE(4);
        let entrada = -1;
        for (let n = 0; n < cuantas; n++) {
            if (ICO.readUInt8(6 + 16 * n) === MARK_GRID) entrada = 6 + 16 * n;
        }
        if (entrada < 0) throw new Error(`el .ico no trae la imagen de ${MARK_GRID}`);

        const inicio = ICO.readUInt32LE(entrada + 12);
        const cabecera = ICO.readUInt32LE(inicio); // 40, el tamaño de BITMAPINFOHEADER
        const datos = inicio + cabecera;

        // BMP guarda las filas de abajo arriba.
        const o = datos + ((MARK_GRID - 1 - y) * MARK_GRID + x) * 4;
        const hex = (n: number) => n.toString(16).padStart(2, '0');

        return `#${hex(ICO[o + 2])}${hex(ICO[o + 1])}${hex(ICO[o])}`;
    }

    it('no es el que traía la plantilla', () => {
        // El de Next son 25 931 bytes y cuatro imágenes.
        expect(ICO.length).toBeLessThan(10_000);
        expect(ICO.readUInt16LE(0)).toBe(0); // reservado
        expect(ICO.readUInt16LE(2)).toBe(1); // tipo: icono
    });

    it('⚠ trae la de 16 además de la de 32', () => {
        /*
         * Que es donde se ve. Dejando sólo la de 32, el navegador la encoge él
         * mismo con suavizado y los palos de un píxel salen medio grises.
         */
        const lados = [...Array(ICO.readUInt16LE(4))].map((_, n) => ICO.readUInt8(6 + 16 * n));

        expect(lados).toContain(16);
        expect(lados).toContain(MARK_GRID);
    });

    it('tiene tinta en el centro de cada pieza', () => {
        for (const r of MARK_RECTS) {
            const punto = pixel(r.x + r.w / 2, r.y + r.h / 2);

            expect(punto).toBe(MARK_COLORS.ink.light);
        }
    });

    it('y lienzo en el aire que rodea al cursor', () => {
        const cursor = MARK_RECTS[MARK_RECTS.length - 1];

        // Justo a la izquierda del bloque y justo encima: si el bloque creciera
        // hasta tocar los corchetes, la marca dejaría de leerse.
        expect(pixel(cursor.x - 2, MARK_GRID / 2)).toBe(MARK_COLORS.ground.light);
        expect(pixel(MARK_GRID / 2, cursor.y - 2)).toBe(MARK_COLORS.ground.light);
    });
});
