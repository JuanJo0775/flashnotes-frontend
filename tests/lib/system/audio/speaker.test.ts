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
    bandpassMakeup,
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

    it('⚠ NO CAMBIA EL NIVEL: ganancia unidad en senal pequena', () => {
        /*
         * ESTE ES EL TEST QUE FALTABA Y COSTO QUE NO SE OYERA NADA.
         *
         * Un saturador tiene que DEFORMAR los picos sin tocar el nivel. Si la
         * curva se normaliza para que ±1 caiga en ±1, las senales pequenas
         * salen multiplicadas por `k/tanh(k)` — o sea que la cantidad de
         * saturacion se convierte, sin que nadie lo escriba, en un control de
         * volumen escondido.
         *
         * Con dos caminos que saturan distinto (la bocinita a 2,2 y el aire a
         * 0,6) eso son SEIS DECIBELIOS de desequilibrio invisible, encima de
         * los que el §8 reparte a proposito. Medido en el navegador: la tecla
         * salia a −33 dBFS y el bip la tapaba entera.
         *
         * La unica forma de que el presupuesto de `mix.ts` signifique algo es
         * que nada por debajo lo altere en secreto.
         */
        const pequena = 0.02;

        for (const cantidad of [0.6, 1.2, 2.2, 4]) {
            const n = 40_001;
            const curva = saturationCurve(cantidad, n);
            const centro = (n - 1) / 2;
            const i = Math.round(centro + pequena * centro);
            const entrada = (i / (n - 1)) * 2 - 1;

            // Sale practicamente lo que entra, sature lo que sature.
            expect(curva[i] / entrada).toBeCloseTo(1, 2);
        }
    });

    it('y nunca devuelve mas de lo que se le da', () => {
        // La consecuencia de lo anterior: si en algun punto la salida superara
        // a la entrada, la curva estaria amplificando y volveria a ser un
        // control de volumen disfrazado.
        const n = 1_025;
        const curva = saturationCurve(SATURATION, n);

        for (let i = 0; i < n; i += 1) {
            const entrada = (i / (n - 1)) * 2 - 1;
            expect(Math.abs(curva[i])).toBeLessThanOrEqual(Math.abs(entrada) + 1e-9);
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

describe('lo que un pasabanda estrecho se lleva, y hay que devolver', () => {
    /*
     * ⚠ ESTA ES LA SEGUNDA CAUSA DE QUE NO SE OYERA NADA, Y LA GORDA.
     *
     * Las voces fisicas son ruido de banda ancha metido por pasabandas
     * estrechos: asi se consigue que suenen a plastico y a metal en vez de a
     * siseo. Pero un pasabanda a 310 Hz con Q=6,5 deja pasar unos 48 Hz de los
     * 24 000 disponibles — TIRA EL 99,8% DE LA ENERGIA.
     *
     * El error de modelo fue tratar el numero de la envolvente como el NIVEL DE
     * SALIDA. No lo es: es un multiplicador sobre lo que el filtro deja pasar,
     * que ya viene diezmado. El bip no cruza ningun filtro estrecho y sale
     * entero, y por eso tapaba a la tecla por 28 dB medidos en el navegador.
     *
     * La compensacion no es un numero a ojo: para ruido blanco la amplitud que
     * sobrevive va con la RAIZ de la fraccion de espectro que el filtro
     * conserva, y esa fraccion es (f0/Q) sobre la mitad del muestreo.
     */

    it('devuelve 1 cuando el filtro no quita nada', () => {
        // Un ancho de banda igual a todo el espectro no tiene que compensar.
        expect(bandpassMakeup(24_000, 1, 48_000)).toBeCloseTo(1, 3);
    });

    it('cuanto mas estrecho, mas hay que devolver', () => {
        const ancho = bandpassMakeup(1_000, 1, 48_000);
        const estrecho = bandpassMakeup(1_000, 8, 48_000);

        expect(estrecho).toBeGreaterThan(ancho);
    });

    it('y cuanto mas grave a igual Q, tambien: la banda es mas angosta', () => {
        // Q es un ancho RELATIVO, asi que a 300 Hz cubre mucho menos hertzios
        // que a 3 kHz. Es la razon de que el cuerpo de la tecla sea el que mas
        // pierde de todas las capas.
        expect(bandpassMakeup(300, 6.5, 48_000)).toBeGreaterThan(
            bandpassMakeup(3_000, 6.5, 48_000)
        );
    });

    it('el cuerpo de la tecla necesita del orden de veinte veces', () => {
        // 310 Hz con Q 6,5 son unos 48 Hz de banda sobre 24 000.
        const m = bandpassMakeup(310, 6.5, 48_000);

        expect(m).toBeGreaterThan(15);
        expect(m).toBeLessThan(30);
    });

    it('⚠ pero nunca se dispara: hay tope', () => {
        /*
         * Sin tope, un Q alto a frecuencia baja pide multiplicar por cientos y
         * lo que sale es el ruido de cuantizacion amplificado, no un sonido.
         * El tope convierte un fallo silencioso en uno acotado.
         */
        expect(bandpassMakeup(20, 40, 48_000)).toBeLessThanOrEqual(40);
        expect(bandpassMakeup(1, 1_000, 48_000)).toBeLessThanOrEqual(40);
    });

    it('nunca atenua, aunque la banda sea mas ancha que el espectro', () => {
        expect(bandpassMakeup(20_000, 0.2, 48_000)).toBeGreaterThanOrEqual(1);
    });
});
