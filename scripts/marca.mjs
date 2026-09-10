// scripts/marca.mjs
//
// EL `.ico` DE LA MARCA, dibujado a partir del `.svg`.
//
// ⚠ POR QUÉ HAY DOS ARCHIVOS PARA UN MISMO ICONO. El `.svg` es el bueno: pesa
// nada, es nítido a cualquier tamaño y se da vuelta con el tema. Safari no lo
// admite, y sin `.ico` deja la pestaña EN BLANCO — que es peor que el logo de
// Next, porque parece que la página está rota.
//
// ⚠ Y NO SE DIBUJA DOS VECES. Este script LEE `src/app/icon.svg` —los siete
// rectángulos, tal como los escribió `markSvg()`— y los pinta píxel a píxel. La
// geometría vive en un solo sitio, `src/lib/system/mark.ts`; acá sólo se
// rasteriza. Un test comprueba que el `.ico` del disco sigue siendo el que sale
// de esa tabla, así que si alguien mueve un rectángulo y no vuelve a correr
// esto, la suite lo dice.
//
//   node scripts/marca.mjs
//
// ⚠ EL `.ico` VA EN TEMA CLARO Y NO HAY ALTERNATIVA. El formato no tiene
// consultas de medios: son píxeles y ya. Se elige el claro porque es el tema
// por defecto de la app.

import { readFileSync, writeFileSync } from 'node:fs';

const SVG = 'src/app/icon.svg';
const ICO = 'src/app/favicon.ico';

/** Los tamaños que se guardan dentro del `.ico`. */
const TAMANOS = [16, 32];

// ── Leer el dibujo ──────────────────────────────────────────────────────────

const svg = readFileSync(SVG, 'utf8');

const rejilla = Number(/viewBox="0 0 ([0-9]+) \1"/.exec(svg)?.[1]);
const colores = {
    g: /\.g \{ fill: (#[0-9a-f]{6}) \}/.exec(svg)?.[1],
    i: /\.i \{ fill: (#[0-9a-f]{6}) \}/.exec(svg)?.[1],
};
if (!rejilla || !colores.g || !colores.i) {
    throw new Error(`no entiendo ${SVG}: ¿cambió el formato de markSvg()?`);
}

/** Cada `<rect>`, con su clase. Los que no llevan `x`/`y` empiezan en cero. */
const rects = [...svg.matchAll(/<rect class="([gi])"([^/]*)\/>/g)].map(([, clase, attrs]) => {
    const num = (nombre) => Number(new RegExp(`${nombre}="([0-9]+)"`).exec(attrs)?.[1] ?? 0);
    return { clase, x: num('x'), y: num('y'), w: num('width'), h: num('height') };
});

// ── Pintarlo ────────────────────────────────────────────────────────────────

const rgb = (hex) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
];

/**
 * Devuelve el mapa de píxeles a ese lado.
 *
 * ⚠ SIN SUAVIZADO, A PROPÓSITO. Todas las medidas son pares sobre 32, así que a
 * 16 y a 32 cada borde cae en un píxel entero y no hace falta interpolar nada.
 * Suavizar aquí sería inventarse grises que la marca no tiene.
 */
function pintar(lado) {
    const escala = lado / rejilla;
    const px = new Uint8Array(lado * lado * 3);

    for (const r of rects) {
        const [R, G, B] = rgb(colores[r.clase]);
        const x0 = Math.round(r.x * escala);
        const y0 = Math.round(r.y * escala);
        const x1 = Math.round((r.x + r.w) * escala);
        const y1 = Math.round((r.y + r.h) * escala);

        for (let y = y0; y < y1; y++) {
            for (let x = x0; x < x1; x++) {
                const o = (y * lado + x) * 3;
                px[o] = R;
                px[o + 1] = G;
                px[o + 2] = B;
            }
        }
    }
    return px;
}

// ── Empaquetarlo ────────────────────────────────────────────────────────────

/**
 * Una imagen del `.ico`: cabecera BMP, píxeles en BGRA y máscara.
 *
 * ⚠ LA ALTURA DE LA CABECERA VA AL DOBLE. No es un error de cálculo: el formato
 * guarda el dibujo y una máscara de transparencia de 1 bit pegada debajo, y el
 * alto declarado cuenta las dos. La máscara va toda a cero —opaco— porque el
 * icono lleva su propio lienzo; se escribe igual porque hay lectores viejos que
 * la leen aunque el dibujo traiga canal alfa.
 *
 * ⚠ Y LAS FILAS VAN DE ABAJO ARRIBA, que es como guarda las cosas BMP.
 */
function bmp(lado, px) {
    const cab = Buffer.alloc(40);
    cab.writeUInt32LE(40, 0);
    cab.writeInt32LE(lado, 4);
    cab.writeInt32LE(lado * 2, 8);
    cab.writeUInt16LE(1, 12);
    cab.writeUInt16LE(32, 14);

    const datos = Buffer.alloc(lado * lado * 4);
    for (let y = 0; y < lado; y++) {
        for (let x = 0; x < lado; x++) {
            const origen = ((lado - 1 - y) * lado + x) * 3;
            const destino = (y * lado + x) * 4;
            datos[destino] = px[origen + 2];
            datos[destino + 1] = px[origen + 1];
            datos[destino + 2] = px[origen];
            datos[destino + 3] = 255;
        }
    }

    // Máscara: una fila de bits por línea, rellenada a múltiplo de cuatro bytes.
    const mascara = Buffer.alloc(Math.ceil(lado / 32) * 4 * lado);
    return Buffer.concat([cab, datos, mascara]);
}

const imagenes = TAMANOS.map((lado) => ({ lado, cuerpo: bmp(lado, pintar(lado)) }));

const dir = Buffer.alloc(6 + 16 * imagenes.length);
dir.writeUInt16LE(0, 0);
dir.writeUInt16LE(1, 2);
dir.writeUInt16LE(imagenes.length, 4);

let offset = dir.length;
imagenes.forEach((img, n) => {
    const e = 6 + 16 * n;
    dir.writeUInt8(img.lado, e);
    dir.writeUInt8(img.lado, e + 1);
    dir.writeUInt8(0, e + 2);
    dir.writeUInt8(0, e + 3);
    dir.writeUInt16LE(1, e + 4);
    dir.writeUInt16LE(32, e + 6);
    dir.writeUInt32LE(img.cuerpo.length, e + 8);
    dir.writeUInt32LE(offset, e + 12);
    offset += img.cuerpo.length;
});

writeFileSync(ICO, Buffer.concat([dir, ...imagenes.map((i) => i.cuerpo)]));
console.log(`${ICO} · ${TAMANOS.join(' + ')} px · ${offset} bytes`);

// ── Y una mirada, que es lo que de verdad dice si se entiende ───────────────

if (process.argv.includes('--ver')) {
    const lado = 16;
    const px = pintar(lado);
    const tinta = rgb(colores.i).join();
    for (let y = 0; y < lado; y++) {
        let fila = '';
        for (let x = 0; x < lado; x++) {
            const o = (y * lado + x) * 3;
            fila += [px[o], px[o + 1], px[o + 2]].join() === tinta ? '#' : '.';
        }
        console.log(fila);
    }
}
