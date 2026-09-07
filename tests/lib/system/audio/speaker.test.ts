// tests/lib/system/audio/speaker.test.ts

/**
 * MODELAR EL PARLANTE, NO EL SONIDO.
 *
 * La razón por la que las máquinas viejas suenan así no es que emitieran
 * sonidos raros: es que el altavoz era malo y la caja era de plástico. Un
 * altavoz de cinco centímetros no baja de 200 Hz ni sube de 6 kHz, y saturaba
 * en cuanto se le pedía volumen.
 *
 * Ésa es la jugada más rentable de todo el sistema: modelado el parlante UNA
 * VEZ sobre el bus entero, cualquier cosa que se le meta ya sale de época. No
 * hay que hacer «sonar viejo» a cada voz por separado.
 *
 * La curva es un `Float32Array` que se le da a un `WaveShaperNode`, o sea una
 * tabla de números. Se comprueba acá, sin sonar.
 */

import {
    BAND_HIGH_HZ,
    BAND_LOW_HZ,
    SATURATION,
    saturationCurve,
} from '@/lib/system/audio/speaker';

describe('la banda que deja pasar el altavoz', () => {
    it('recorta los graves, porque un cono pequeño no los da', () => {
        // Sin este corte el zumbido del chasis suena a subwoofer, que es
        // justo lo que una carcasa de plástico NO puede hacer.
        expect(BAND_LOW_HZ).toBeGreaterThanOrEqual(150);
        expect(BAND_LOW_HZ).toBeLessThanOrEqual(300);
    });

    it('y recorta los agudos, que es lo que quita el brillo digital', () => {
        expect(BAND_HIGH_HZ).toBeGreaterThanOrEqual(4_000);
        expect(BAND_HIGH_HZ).toBeLessThanOrEqual(8_000);
    });

    it('la banda tiene sentido: el grave por debajo del agudo', () => {
        expect(BAND_LOW_HZ).toBeLessThan(BAND_HIGH_HZ);
    });
});

describe('la curva de saturación', () => {
    it('deja el silencio en silencio', () => {
        // El centro exacto de la tabla es la entrada 0. Si ahí no sale 0, todo
        // el bus lleva una corriente continua encima y los altavoces del que
        // escucha se quedan empujados hacia un lado.
        const curva = saturationCurve(SATURATION, 4_097);

        expect(curva[(curva.length - 1) / 2]).toBeCloseTo(0, 6);
    });

    it('es impar: lo que sube por arriba baja igual por abajo', () => {
        /*
         * ⚠ LA SIMETRÍA ES LO QUE HACE QUE SUENE CÁLIDO Y NO ROTO.
         *
         * Una curva impar genera armónicos IMPARES, que es la distorsión que el
         * oído lee como «con cuerpo». Una curva asimétrica genera armónicos
         * pares y suena a avería, además de meter continua.
         */
        const n = 4_097;
        const curva = saturationCurve(SATURATION, n);

        for (let i = 0; i < 20; i += 1) {
            const desde = Math.floor((i / 20) * ((n - 1) / 2));
            const arriba = curva[(n - 1) / 2 + desde];
            const abajo = curva[(n - 1) / 2 - desde];

            expect(arriba).toBeCloseTo(-abajo, 6);
        }
    });

    it('no se da la vuelta en ningún punto', () => {
        // Una curva que baja donde debería subir no distorsiona: deforma. Es la
        // diferencia entre saturar y romper la onda.
        const curva = saturationCurve(SATURATION, 2_048);

        for (let i = 1; i < curva.length; i += 1) {
            expect(curva[i]).toBeGreaterThanOrEqual(curva[i - 1] - 1e-9);
        }
    });

    it('aplasta los picos: la pendiente cae segun sube la senal', () => {
        /*
         * ⚠ ESTO ES LO QUE «SATURAR» SIGNIFICA DE VERDAD, y la primera version
         * de este test lo decia mal. Pedia que la salida fuese menor que la
         * entrada, y eso es imposible en cualquier curva que mande ±1 a ±1: si
         * los picos se aplastan, los valores medios TIENEN que subir.
         *
         * Lo que define a un saturador es que la pendiente sea maxima en el
         * centro y vaya cayendo hacia los extremos. Ahi es donde se pierde
         * margen y donde nacen los armonicos.
         */
        const n = 2_049;
        const curva = saturationCurve(SATURATION, n);
        const centro = (n - 1) / 2;
        const paso = 128;

        const pendiente = (i: number) => curva[i + paso] - curva[i];

        const enElCentro = pendiente(centro);
        const aMedioCamino = pendiente(centro + Math.floor(centro / 2));
        const enElBorde = pendiente(n - 1 - paso);

        expect(aMedioCamino).toBeLessThan(enElCentro);
        expect(enElBorde).toBeLessThan(aMedioCamino);
    });

    it('y nunca se pasa de la escala completa', () => {
        // El bus va detras de esto. Un valor por encima de 1 recorta de verdad,
        // que es el ruido feo que esta curva existe para evitar.
        const curva = saturationCurve(SATURATION, 1_025);

        for (const v of curva) {
            expect(Math.abs(v)).toBeLessThanOrEqual(1 + 1e-9);
        }
    });

    it('y con saturación cero no hace nada, para poder apagarla y comparar', () => {
        // El banco de pruebas necesita oír el parlante en on y en off. Si el
        // cero no fuera la identidad, «off» seguiría coloreando.
        const n = 513;
        const curva = saturationCurve(0, n);

        for (let i = 0; i < n; i += 1) {
            expect(curva[i]).toBeCloseTo((i / (n - 1)) * 2 - 1, 6);
        }
    });
});
