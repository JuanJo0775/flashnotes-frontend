// tests/lib/system/eyeStatic.test.ts

/**
 * EL OJO DETRÁS DE LA PARED: LLUVIA DE DÍGITOS, Y EL OJO POR AUSENCIA.
 *
 * ⚠ NO ESTÁ DIBUJADO: ESTÁ RECORTADO. El campo se llena de unos y ceros y la
 * forma del ojo es donde los dígitos NO están.
 *
 * Antes era una silueta vectorial encima del ruido y se leía como un emoji
 * pegado sobre una textura. El problema no era el dibujo: era que el ojo y el
 * fondo estaban hechos de cosas distintas, así que uno se veía ENCIMA del otro
 * en vez de DENTRO. Con la ausencia hay una sola capa, con un agujero con forma.
 *
 * ⚠ ESTOS TESTS NO LLEVAN NINGUNA FILA ESCRITA A MANO, y es a propósito.
 *
 * Una versión anterior comparaba «la fila 13» contra «las filas 16 a 22», y en
 * cuanto la geometría se ajustó esos números dejaron de señalar lo que decían
 * señalar. Lo que hay que comprobar no es dónde cae el ojo: es que TENGA FORMA
 * DE OJO, que se resuelva del ruido, y que el arco empiece y acabe donde dice.
 */

import {
    CELL_ASPECT,
    COLS,
    EYE_ARC_FRAMES,
    ROWS,
    eyeAt,
    rainFrame,
} from '@/lib/system/eyeStatic';

/** Un dado repetible, para que los fotogramas se puedan comparar. */
const dado = () => {
    let n = 7;
    return () => {
        n = (n * 1103515245 + 12345) % 2147483648;
        return n / 2147483648;
    };
};

/** El ojo entero y abierto, que es el estado del que habla casi todo esto. */
const ABIERTO = { look: 0, lid: 0, presence: 1 };

const filas = (shape = ABIERTO, random = dado()) =>
    rainFrame(shape, random).split('\n');

/** Cuántos huecos tiene una fila. Es lo que dibuja el ojo. */
const huecos = (fila: string) => [...fila].filter((c) => c === ' ').length;

/** Y cuántos en el fotograma entero. */
const total = (s: string) => [...s].filter((c) => c === ' ').length;

describe('el campo', () => {
    it('tiene la forma que dice tener', () => {
        const f = filas();

        expect(f).toHaveLength(ROWS);
        expect(f.every((l) => l.length === COLS)).toBe(true);
    });

    it('está lleno de unos y ceros, y de nada más', () => {
        // Sólo dígitos y huecos: cualquier otro carácter delataría un dibujo.
        expect(rainFrame(ABIERTO, dado())).toMatch(/^[01 \n]+$/);
    });

    it('y llueve: cada fotograma es distinto', () => {
        const uno = rainFrame(ABIERTO, () => 0.1);
        const otro = rainFrame(ABIERTO, () => 0.9);

        expect(uno).not.toBe(otro);
    });
});

describe('⚠ pero el ojo NO se mueve con la lluvia', () => {
    it('los huecos caen en el mismo sitio con cualquier dado', () => {
        /*
         * Es lo que hace que el ojo MIRE. Todo el campo hierve y la forma se
         * queda exactamente donde está — si se movieran también los huecos
         * sería ruido, y lo que inquieta es que el ruido cambie y el ojo no.
         *
         * ⚠ LOS DOS DADOS TIENEN QUE LLENAR EL CAMPO. Cada columna saca su
         * propia densidad del mismo dado, así que uno alto —`0.99`— deja el
         * campo entero en blanco y la comparación no prueba nada. Con `0.1` y
         * `0.4` todas las columnas quedan tupidas, y entonces el único hueco
         * que puede quedar es el del ojo.
         */
        const conUno = rainFrame(ABIERTO, () => 0.1).split('\n');
        const conOtro = rainFrame(ABIERTO, () => 0.4).split('\n');

        for (let r = 0; r < ROWS; r += 1) {
            for (let c = 0; c < COLS; c += 1) {
                expect(conUno[r][c] === ' ').toBe(conOtro[r][c] === ' ');
            }
        }
    });
});

describe('la forma es un ojo, no una mancha', () => {
    /** Cuántos huecos por fila. Es el perfil del dibujo. */
    const perfil = () => filas().map(huecos);

    it('es una lente: se ensancha hacia el centro y se cierra en las puntas', () => {
        // Una caja tendría el mismo hueco en todas las filas.
        const p = perfil();
        const ancha = p.indexOf(Math.max(...p));

        expect(p[ancha - 3]).toBeLessThan(p[ancha]);
        expect(p[ancha + 3]).toBeLessThan(p[ancha]);
    });

    it('y tiene pliegue: dos vacíos separados por una franja con dígitos', () => {
        /*
         * Sin él, una almendra con un círculo es un icono. El pliegue —la
         * sombra del párpado barriendo por encima— es lo que la vuelve una cara
         * mirándote.
         *
         * Se comprueba contando los TRAMOS de filas con hueco: tiene que haber
         * más de uno, o sea un vacío arriba, dígitos en medio, y el ojo debajo.
         */
        const p = perfil();
        const umbral = Math.max(...p) * 0.25;

        let tramos = 0;
        let dentro = false;

        for (const n of p) {
            if (n > umbral && !dentro) tramos += 1;
            dentro = n > umbral;
        }

        expect(tramos).toBeGreaterThanOrEqual(2);
    });

    it('⚠ y el iris sale REDONDO, no aplastado', () => {
        /*
         * ESTO SE HIZO MAL DOS VECES Y LAS DOS SE VIO EN PANTALLA. El factor
         * que compensa que las celdas sean más altas que anchas estuvo puesto
         * a ojo, y después «corregido» DADO VUELTA: con él, el anillo del iris
         * salía 1,6 veces más chato de lo que debía y se leía como una rendija.
         *
         * El anillo son los dígitos que quedan DENTRO del vacío del ojo — o
         * sea, los que tienen hueco a un lado y al otro en su misma fila. Su
         * caja, medida en PÍXELES y no en celdas, tiene que ser cuadrada: es un
         * círculo. La tolerancia es ancha porque el párpado de abajo le come un
         * trozo, que es justo lo que hace un párpado.
         */
        /*
         * ⚠ CON EL CAMPO LLENO DEL TODO. Con un dado de verdad quedan claros
         * sueltos por todas partes, y entonces «lo que está entre el primer y
         * el último hueco de la fila» es casi la fila entera: se mediría el
         * campo en lugar del anillo. Con el dado a la mitad ninguna columna
         * deja claros, así que el único hueco es la forma.
         */
        const f = filas(ABIERTO, () => 0.5);
        const dentro: { r: number; c: number }[] = [];

        f.forEach((fila, r) => {
            const primero = fila.indexOf(' ');
            const ultimo = fila.lastIndexOf(' ');
            if (primero < 0) return;

            for (let c = primero + 1; c < ultimo; c += 1) {
                if (fila[c] !== ' ') dentro.push({ r, c });
            }
        });

        expect(dentro.length).toBeGreaterThan(8);

        const cs = dentro.map((p) => p.c);
        const rs = dentro.map((p) => p.r);
        const ancho = Math.max(...cs) - Math.min(...cs) + 1;
        const alto = (Math.max(...rs) - Math.min(...rs) + 1) * CELL_ASPECT;

        expect(alto / ancho).toBeGreaterThan(0.75);
        expect(alto / ancho).toBeLessThan(1.35);
    });
});

describe('mira, y se cierra', () => {
    it('mirar mueve el iris pero no el párpado', () => {
        /*
         * Un ojo que se desplaza entero no mira: se traslada. Así que el total
         * de huecos apenas cambia —la almendra es la misma— pero el dibujo sí.
         */
        const centro = rainFrame(ABIERTO, () => 0.5);
        const lado = rainFrame({ ...ABIERTO, look: -1 }, () => 0.5);

        expect(centro).not.toBe(lado);
        expect(Math.abs(total(centro) - total(lado))).toBeLessThan(
            total(centro) * 0.2
        );
    });

    it('y cerrarlo lo deja en una costura, no en nada', () => {
        /*
         * ⚠ UN OJO CERRADO TIENE QUE SEGUIR ESTANDO. Medía exactamente cero, y
         * entonces desaparecía del campo durante el tramo en que se está
         * resolviendo — que es el único momento en que hace falta verlo.
         */
        const abierto = total(rainFrame(ABIERTO, () => 0.5));
        const cerrado = total(rainFrame({ ...ABIERTO, lid: 1 }, () => 0.5));

        expect(cerrado).toBeGreaterThan(0);
        expect(cerrado).toBeLessThan(abierto / 3);
    });
});

describe('⚠ el ojo no aparece: se resuelve', () => {
    /*
     * Un recorte que se enciende es una máscara. Una forma que se vacía desde
     * el centro hacia el borde es algo que se está asomando, y ésa es toda la
     * diferencia entre las dos versiones de esta escena.
     */

    it('sin presencia no hay ojo: sólo lluvia', () => {
        const sin = rainFrame({ ...ABIERTO, presence: 0 }, () => 0.5);

        // Con el dado a la mitad todas las columnas van tupidas, así que si
        // hubiera algún hueco sólo podría venir de la forma.
        expect(total(sin)).toBe(0);
    });

    it('y a media presencia hay menos hueco que del todo', () => {
        const medio = total(rainFrame({ ...ABIERTO, presence: 0.5 }, () => 0.5));
        const entero = total(rainFrame(ABIERTO, () => 0.5));

        expect(medio).toBeGreaterThan(0);
        expect(medio).toBeLessThan(entero);
    });

    it('⚠ y se vacía DESDE DENTRO: lo que ya es hueco a medias lo es del todo', () => {
        /*
         * Ésta es la prueba de que la forma se revela en vez de encenderse: el
         * hueco de media presencia tiene que ser un SUBCONJUNTO del hueco
         * entero. Si apareciera por opacidad o al azar, habría celdas vacías a
         * medias que están llenas del todo, y el ojo titilaría al llegar en
         * lugar de crecer.
         */
        const medio = rainFrame({ ...ABIERTO, presence: 0.5 }, () => 0.5).split(
            '\n'
        );
        const entero = filas(ABIERTO, () => 0.5);

        for (let r = 0; r < ROWS; r += 1) {
            for (let c = 0; c < COLS; c += 1) {
                if (medio[r][c] === ' ') expect(entero[r][c]).toBe(' ');
            }
        }
    });
});

describe('el arco, que lo decide él y no el reloj', () => {
    it('empieza sin nada: el hueco se abre y sólo hay ruido', () => {
        expect(eyeAt(0).presence).toBe(0);
    });

    it('se resuelve con el ojo todavía cerrado, y sólo después se abre', () => {
        const trazo = Array.from({ length: EYE_ARC_FRAMES }, (_, i) => eyeAt(i));

        const asoma = trazo.findIndex((e) => e.presence > 0);
        const entero = trazo.findIndex((e) => e.presence >= 1);
        const abre = trazo.findIndex((e) => e.lid < 1);

        expect(asoma).toBeGreaterThan(0);
        expect(entero).toBeGreaterThan(asoma);
        // Primero está del todo, y ENTONCES se abre. Al revés sería un ojo
        // abriéndose dentro de una mancha que todavía no es un ojo.
        expect(abre).toBeGreaterThanOrEqual(entero);
    });

    it('te mira antes de cerrarse: el último gesto es suyo', () => {
        /*
         * El remate no es que se acabe el tiempo: es que te mira de frente y
         * baja el párpado. Así que en el último fotograma con el ojo abierto la
         * mirada tiene que estar al centro.
         */
        const trazo = Array.from({ length: EYE_ARC_FRAMES }, (_, i) => eyeAt(i));
        const ultimoAbierto = trazo.map((e) => e.lid).lastIndexOf(0);

        expect(trazo[ultimoAbierto].look).toBe(0);
    });

    it('y al final se va: se cierra, se disuelve, y no queda nada', () => {
        const fin = eyeAt(EYE_ARC_FRAMES - 1);

        expect(fin.lid).toBe(1);
        expect(fin.presence).toBe(0);
    });

    it('no vuelve a abrirse después del cierre final', () => {
        const trazo = Array.from({ length: EYE_ARC_FRAMES }, (_, i) => eyeAt(i));
        const cerroDelTodo = trazo.map((e) => e.lid).lastIndexOf(0) + 1;

        for (let i = cerroDelTodo; i < EYE_ARC_FRAMES; i += 1) {
            expect(trazo[i].lid).toBeGreaterThan(0);
        }
    });

    it('⚠ y el parpadeo NUNCA cae donde cambia la mirada', () => {
        /*
         * En cuanto los dos ritmos van al mismo paso, el ojo deja de mirar y
         * pasa a repetirse: se vuelve un bucle, y un bucle no te está mirando a
         * vos. Se comprueba que ningún parpadeo empieza en el mismo fotograma
         * en que la mirada se mueve.
         */
        for (let i = 1; i < EYE_ARC_FRAMES; i += 1) {
            const antes = eyeAt(i - 1);
            const ahora = eyeAt(i);

            const empiezaParpadeo =
                antes.lid === 0 && ahora.lid > 0 && ahora.lid < 1;
            const cambiaMirada = antes.look !== ahora.look;

            expect(empiezaParpadeo && cambiaMirada).toBe(false);
        }
    });

    it('y parpadea de verdad: baja el párpado y vuelve a subirlo', () => {
        const trazo = Array.from({ length: EYE_ARC_FRAMES }, (_, i) => eyeAt(i));

        let parpadeos = 0;
        for (let i = 1; i < trazo.length; i += 1) {
            if (
                trazo[i - 1].lid === 0 &&
                trazo[i].lid > 0 &&
                trazo.slice(i).some((e) => e.lid === 0)
            ) {
                parpadeos += 1;
            }
        }

        expect(parpadeos).toBeGreaterThanOrEqual(2);
    });
});
