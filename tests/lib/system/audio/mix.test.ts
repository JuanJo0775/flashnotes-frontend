// tests/lib/system/audio/mix.test.ts

/**
 * LA MEZCLA, QUE ES LO QUE EVITA QUE ATURDA.
 *
 * Este módulo es la respuesta concreta a «para no ser aturdidor» y hace dos
 * cosas, las dos puras: reparte el presupuesto de volumen por categoría y
 * cierra la puerta cuando algo quiere sonar dos veces demasiado seguidas.
 *
 * ⚠ POR QUÉ ES PURO Y SE TESTEA ACÁ. Es la única parte del sonido que se puede
 * equivocar EN SILENCIO: un nivel mal puesto no rompe nada, no tira ningún
 * error y no se nota hasta que alguien se lleva un susto con los auriculares
 * puestos. Sin nodos ni `AudioContext` de por medio, la escalera de volúmenes
 * se comprueba como cualquier otra tabla del proyecto.
 */

import {
    GATE_MS,
    MASTER_DB,
    PEAK_DBFS,
    allow,
    dbToGain,
    gainFor,
    resetGate,
    type SoundCategory,
} from '@/lib/system/audio/mix';

beforeEach(() => {
    resetGate();
});

describe('de decibelios a ganancia', () => {
    it('0 dBFS es la unidad, que es el techo', () => {
        expect(dbToGain(0)).toBeCloseTo(1, 6);
    });

    it('cada −6 dB es la mitad de amplitud', () => {
        // La media potencia de toda la vida. Si alguien mete un 10 en vez de un
        // 20 en la fórmula, este número se va al doble y el test lo caza.
        expect(dbToGain(-6)).toBeCloseTo(0.5012, 3);
        expect(dbToGain(-12)).toBeCloseTo(0.2512, 3);
    });

    it('y el silencio de verdad es cero, no un número muy pequeño', () => {
        // Importa para el derrumbe del §6: 200 ms de silencio ABSOLUTO. Un
        // -Infinity que devolviera NaN dejaría el nodo en un estado inválido.
        expect(dbToGain(-Infinity)).toBe(0);
    });
});

describe('el presupuesto del §8', () => {
    it('da un pico a cada categoría y ninguna se queda sin él', () => {
        const categorias: SoundCategory[] = [
            'ambience',
            'keys',
            'confirm',
            'glitch',
            'failure',
        ];

        for (const c of categorias) {
            expect(typeof PEAK_DBFS[c]).toBe('number');
        }

        // Ninguna de más: una categoría huérfana es un sonido que nadie mezcló.
        expect(Object.keys(PEAK_DBFS).sort()).toEqual([...categorias].sort());
    });

    it('todo va por debajo del techo', () => {
        // Nada puede pedir 0 dBFS: el bus maestro tiene que tener sitio para
        // sumar dos cosas a la vez sin recortar.
        for (const db of Object.values(PEAK_DBFS)) {
            expect(db).toBeLessThan(0);
        }
    });

    it('y la escalera va del ambiente al fallo total, en ese orden', () => {
        /*
         * ⚠ ÉSTE ES EL TEST QUE IMPORTA DE VERDAD.
         *
         * El orden no es decorativo: es la jerarquía de atención del producto.
         * El ambiente tiene que ser lo más callado porque suena siempre, y el
         * fallo total lo más fuerte porque pasa una vez. Si alguien sube las
         * teclas «para oírlas mejor» y se pasan a los confirms, la máquina
         * grita al escribir y susurra cuando algo se rompe — que es
         * exactamente al revés.
         */
        expect(PEAK_DBFS.ambience).toBeLessThan(PEAK_DBFS.keys);
        expect(PEAK_DBFS.keys).toBeLessThan(PEAK_DBFS.confirm);
        expect(PEAK_DBFS.confirm).toBeLessThan(PEAK_DBFS.glitch);
        expect(PEAK_DBFS.glitch).toBeLessThan(PEAK_DBFS.failure);
    });

    it('el ambiente es el más callado de todos, y por mucho', () => {
        // 10 dB por debajo de las teclas es la diferencia entre «hay algo» y
        // «se oye». Si se acercan, el zumbido empieza a enmascarar el resto.
        expect(PEAK_DBFS.keys - PEAK_DBFS.ambience).toBeGreaterThanOrEqual(10);
    });

    it('y `gainFor` es el pico de la categoría ya convertido', () => {
        expect(gainFor('ambience')).toBeCloseTo(dbToGain(PEAK_DBFS.ambience), 9);
    });
});

describe('el nivel absoluto', () => {
    /*
     * REPORTADO JUGANDO: «el volumen esta muy bajo, me toca subirle mucho el
     * sonido al compu».
     *
     * ⚠ Y ERA UN AGUJERO DEL DISENO, no un ajuste olvidado. El presupuesto del
     * §8 es RELATIVO: dice quien suena mas que quien, y lo hace bien. Pero nadie
     * fijaba el nivel ABSOLUTO, asi que lo mas fuerte de todo el producto salia
     * a −8 dBFS y una tecla a −24 — correcto entre ellos, y bajisimo contra
     * cualquier otra pestana del navegador.
     *
     * Subir el equipo para oir la tecla convierte el zumbido del ambiente en un
     * tono de prueba: los dos sintomas reportados eran el mismo fallo.
     */

    it('el maestro SUBE, no baja', () => {
        expect(MASTER_DB).toBeGreaterThan(0);
    });

    it('y no tanto como para recortar de continuo', () => {
        // Con el maestro puesto, lo mas fuerte tiene que quedar cerca del techo
        // pero no clavado en el: ahi el limitador trabajaria siempre y todo
        // sonaria aplastado.
        const masFuerte = Math.max(...Object.values(PEAK_DBFS)) + MASTER_DB;

        expect(masFuerte).toBeLessThanOrEqual(0);
        expect(masFuerte).toBeGreaterThan(-6);
    });

    it('⚠ y no cambia el reparto: sube TODO por igual', () => {
        /*
         * Es lo que separa esto de «subirle a las teclas». La escalera del §8 es
         * la jerarquia de atencion; tocarla de a una la desarma. El maestro es un
         * solo numero al final de la cadena, y por eso no puede desordenar nada.
         */
        const distancia = PEAK_DBFS.failure - PEAK_DBFS.keys;

        expect(PEAK_DBFS.failure + MASTER_DB - (PEAK_DBFS.keys + MASTER_DB)).toBe(distancia);
    });
});

describe('la compuerta, que es lo que impide la ametralladora', () => {
    it('el primer disparo de una categoría siempre pasa', () => {
        expect(allow('keys', 1_000)).toBe(true);
    });

    it('el segundo dentro de la ventana NO pasa', () => {
        allow('keys', 1_000);

        // Escribir rápido son 40 ms entre teclas. Sin esto, una ráfaga.
        expect(allow('keys', 1_040)).toBe(false);
    });

    it('pero pasado el hueco vuelve a pasar', () => {
        allow('keys', 1_000);

        expect(allow('keys', 1_000 + GATE_MS)).toBe(true);
    });

    it('justo en el borde pasa, y un milisegundo antes no', () => {
        // El borde se fija a propósito: sin test, alguien cambia el `>=` por un
        // `>` en una limpieza y la compuerta se corre un milisegundo sin que
        // nadie se entere.
        allow('keys', 1_000);
        expect(allow('keys', 1_000 + GATE_MS - 1)).toBe(false);

        resetGate();

        allow('keys', 1_000);
        expect(allow('keys', 1_000 + GATE_MS)).toBe(true);
    });

    it('⚠ y cada categoría tiene su propia puerta', () => {
        /*
         * Una compuerta global sería un error de diseño, no un ajuste.
         *
         * El glitch y la tecla PASAN a la vez todo el tiempo: escribís, la
         * máquina falla encima. Con una sola puerta, el fallo se comería la
         * tecla o al revés, al azar según cuál llegó primero — y el glitch es
         * justo el que tiene que sonar sincronizado con la imagen.
         */
        expect(allow('keys', 1_000)).toBe(true);
        expect(allow('glitch', 1_000)).toBe(true);
        expect(allow('confirm', 1_000)).toBe(true);

        // Y siguen siendo independientes al cerrarse.
        expect(allow('keys', 1_010)).toBe(false);
        expect(allow('glitch', 1_010)).toBe(false);
    });

    it('un disparo rechazado no corre la ventana', () => {
        /*
         * ⚠ SI EL RECHAZO ADELANTARA EL RELOJ, TECLEAR RÁPIDO ENMUDECERÍA.
         *
         * Cada tecla rechazada empujaría la ventana otros 60 ms, así que
         * mientras no pares de escribir no volvería a sonar NADA. La tecla
         * sonaría sólo cuando dejaras de teclear, que es el peor resultado
         * posible: el sonido llegaría siempre tarde y desacoplado del gesto.
         */
        allow('keys', 1_000);
        allow('keys', 1_030); // rechazada
        allow('keys', 1_050); // rechazada

        expect(allow('keys', 1_060)).toBe(true);
    });
});
