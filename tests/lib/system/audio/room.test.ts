// tests/lib/system/audio/room.test.ts

/**
 * LA SALA, QUE ES EL SALTO DE CALIDAD MÁS GRANDE QUE HAY DISPONIBLE.
 *
 * Un bip seco suena a navegador. El mismo bip dentro de una habitación suena a
 * que está pasando de verdad, y además mete TODO en el mismo sitio: la tecla,
 * el relé y el zumbido dejan de ser tres sonidos sueltos para ser tres cosas
 * que ocurren en el mismo cuarto.
 *
 * ⚠ Y LA RESPUESTA AL IMPULSO SE GENERA CON CÓDIGO, NO SE DESCARGA. Es un
 * `Float32Array` de ruido que decae, así que es aritmética pura y se comprueba
 * acá sin `AudioContext` — que es lo que además la deja fuera del presupuesto
 * de 600 KB de muestras.
 */

import {
    ROOM_DECAY,
    ROOM_SECONDS,
    impulseResponse,
} from '@/lib/system/audio/room';

/** Azar de mentira, determinista, para no tener un test que flakea. */
function azar(semilla: number): () => number {
    let s = semilla;
    return () => {
        s = (s * 1_103_515_245 + 12_345) % 2_147_483_648;
        return s / 2_147_483_648;
    };
}

const SR = 44_100;

describe('la respuesta al impulso', () => {
    it('dura lo que se le pide, muestra por muestra', () => {
        const [izq] = impulseResponse(SR, 0.25, ROOM_DECAY, azar(1));

        expect(izq).toHaveLength(Math.floor(SR * 0.25));
    });

    it('trae dos canales, y son DISTINTOS', () => {
        /*
         * ⚠ UNA IR MONO COLAPSA LA SALA A UN PUNTO.
         *
         * Con los dos canales idénticos, el cuarto deja de tener anchura y todo
         * suena saliendo de un solo sitio dentro de la cabeza. Que los dos lados
         * decaigan con ruido distinto es lo único que convierte esto en una
         * habitación en vez de en un eco.
         */
        const [izq, der] = impulseResponse(SR, 0.1, ROOM_DECAY, azar(7));

        expect(der).toHaveLength(izq.length);
        expect([...izq]).not.toEqual([...der]);
    });

    it('decae: el final es mucho más callado que el principio', () => {
        const [izq] = impulseResponse(SR, 0.3, ROOM_DECAY, azar(3));

        const energia = (desde: number, hasta: number) => {
            let suma = 0;
            for (let i = desde; i < hasta; i += 1) suma += izq[i] * izq[i];
            return suma / (hasta - desde);
        };

        const principio = energia(0, 500);
        const final = energia(izq.length - 500, izq.length);

        // Sin decaimiento esto sería una lata, no un cuarto.
        expect(final).toBeLessThan(principio / 100);
    });

    it('nunca se sale de la escala, o el convolver satura', () => {
        const [izq, der] = impulseResponse(SR, 0.2, ROOM_DECAY, azar(11));

        for (const canal of [izq, der]) {
            for (const v of canal) {
                expect(Math.abs(v)).toBeLessThanOrEqual(1);
            }
        }
    });

    it('es determinista: el mismo azar da la misma sala', () => {
        const a = impulseResponse(SR, 0.05, ROOM_DECAY, azar(5))[0];
        const b = impulseResponse(SR, 0.05, ROOM_DECAY, azar(5))[0];

        expect([...a]).toEqual([...b]);
    });
});

describe('el cuarto que describe el §3', () => {
    it('es corto y apagado, nunca una catedral', () => {
        /*
         * Medio segundo es el límite. Pasado eso deja de leerse como «un cuarto
         * pequeño con cosas dentro» y empieza a leerse como una iglesia, que es
         * el error clásico de la reverberación y el que más rápido delata que
         * alguien puso un efecto en vez de un sitio.
         */
        expect(ROOM_SECONDS).toBeLessThanOrEqual(0.5);
        expect(ROOM_SECONDS).toBeGreaterThan(0);
    });

    it('y decae rápido', () => {
        expect(ROOM_DECAY).toBeGreaterThan(1);
    });
});
