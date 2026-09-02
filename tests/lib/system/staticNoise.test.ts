// tests/lib/system/staticNoise.test.ts
import {
    NOISE_W,
    NOISE_H,
    LEVELS,
    paintNoise,
} from '@/lib/system/staticNoise';

/** Un búfer RGBA del tamaño del ruido, como el de createImageData. */
function buffer(): Uint8ClampedArray {
    return new Uint8ClampedArray(NOISE_W * NOISE_H * 4);
}

/** Los valores de gris presentes, sin repetir. */
function levels(data: Uint8ClampedArray): number[] {
    const vistos = new Set<number>();
    for (let i = 0; i < data.length; i += 4) vistos.add(data[i]);
    return [...vistos].sort((a, b) => a - b);
}

describe('staticNoise - la forma del ruido', () => {
    test('llena el búfer entero', () => {
        const data = buffer();

        paintNoise(data, 0, () => 0.5);

        // Sin píxeles transparentes: un hueco se vería como un agujero negro.
        for (let i = 3; i < data.length; i += 4) expect(data[i]).toBe(255);
    });

    test('es monocroma: los tres canales valen lo mismo', () => {
        const data = buffer();

        paintNoise(data, 0, Math.random);

        for (let i = 0; i < data.length; i += 4) {
            expect(data[i + 1]).toBe(data[i]);
            expect(data[i + 2]).toBe(data[i]);
        }
    });

    test('tiene varios niveles de gris, no sólo blanco y negro', () => {
        // Con dos valores el ruido se ve digital y plano. La estática de una tele
        // tiene grano con profundidad.
        const data = buffer();

        paintNoise(data, 0, Math.random);

        expect(levels(data).length).toBeGreaterThan(2);
        expect(levels(data).length).toBeLessThanOrEqual(LEVELS);
    });

    test('cada fotograma sale distinto', () => {
        const a = buffer();
        const b = buffer();

        paintNoise(a, 0, Math.random);
        paintNoise(b, 1, Math.random);

        expect(Buffer.from(a)).not.toEqual(Buffer.from(b));
    });
});

describe('staticNoise - estructura horizontal', () => {
    // Una tele no hace sal y pimienta pura: el ruido se correlaciona por línea,
    // porque la señal se lee fila a fila. Sin eso parece grano de papel.
    test('las filas tienen brillo propio', () => {
        const data = buffer();
        paintNoise(data, 0, Math.random);

        const mediaDeFila = (y: number) => {
            let suma = 0;
            for (let x = 0; x < NOISE_W; x += 1) suma += data[(y * NOISE_W + x) * 4];
            return suma / NOISE_W;
        };

        const medias = Array.from({ length: NOISE_H }, (_, y) => mediaDeFila(y));
        const min = Math.min(...medias);
        const max = Math.max(...medias);

        // Sin sesgo por fila, todas las medias caerían casi en el mismo valor.
        expect(max - min).toBeGreaterThan(20);
    });

    test('la barra de sincronismo baja con los fotogramas', () => {
        const a = buffer();
        const b = buffer();

        paintNoise(a, 0, () => 0.5);
        paintNoise(b, 10, () => 0.5);

        expect(Buffer.from(a)).not.toEqual(Buffer.from(b));
    });
});
