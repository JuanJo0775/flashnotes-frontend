// tests/lib/system/audio/screens.test.ts

/**
 * LA TABLA QUE ATA CADA PANTALLA A SU SONIDO.
 *
 * ⚠ POR QUÉ ES UNA TABLA Y NO CÓDIGO. Antes cada momento de la máquina estaba
 * cableado a mano dentro del suscriptor: cinco bloques casi iguales, y cada
 * pantalla nueva obligaba a acordarse de ir a tocarlos. Es el mismo camino por
 * el que `awardFrom` acabó llamado desde nueve sitios distintos.
 *
 * Con la asociación convertida en dato, una pantalla nueva que pinte una marca
 * conocida suena bien sin tocar una línea de sonido. Pero eso sólo se sostiene
 * si las marcas existen de verdad, y de eso van estos tests: una fila que no
 * corresponda a ninguna pantalla es una promesa muerta que nadie oiría fallar.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { CATEGORY_OF } from '@/lib/system/audio/voices';
import { SCREEN_SELECTOR, SCREEN_SOUNDS } from '@/lib/system/audio/screens';

/** Todo el código de componentes, en una sola cuerda. */
function fuentes(dir: string): string {
    let texto = '';

    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
        const ruta = join(dir, entrada.name);

        if (entrada.isDirectory()) texto += fuentes(ruta);
        else if (entrada.name.endsWith('.tsx')) texto += readFileSync(ruta, 'utf8');
    }

    return texto;
}

const COMPONENTES = fuentes('src/components');

describe('cada marca la pinta una pantalla de verdad', () => {
    it.each(SCREEN_SOUNDS.map((s) => [s.mark, s.what]))(
        '«%s» — %s',
        (mark) => {
            /*
             * ⚠ SE BUSCA EN EL CÓDIGO DE LOS COMPONENTES Y NO EN EL DOM. Un test
             * que montara las pantallas comprobaría que HOY se pintan; éste
             * comprueba que la marca SIGUE existiendo, que es lo que se rompe
             * cuando alguien renombra una clase por limpieza. El sonido se
             * quedaría mudo sin que nada fallara.
             */
            expect(COMPONENTES).toContain(mark);
        }
    );
});

describe('la tabla está bien formada', () => {
    it('⚠ toda voz que nombra existe y declara familia', () => {
        /*
         * Una voz sin familia se salta el presupuesto Y la compuerta a la vez:
         * suena a volumen completo y sin límite de repetición. `CATEGORY_OF` es
         * la lista de todo lo que suena, y esta tabla no puede nombrar nada que
         * no esté ahí.
         */
        for (const s of SCREEN_SOUNDS) {
            if (s.shot) expect(CATEGORY_OF).toHaveProperty(s.shot.voice);
            if (s.then) expect(CATEGORY_OF).toHaveProperty(s.then.voice);
        }
    });

    it('⚠ y lo que se repite tiene algo que repetir', () => {
        // Un `repeat` sin `shot` es un temporizador que se arma cada vez que la
        // pantalla aparece y no suena nunca: coste sin sonido, y no se nota.
        for (const s of SCREEN_SOUNDS) {
            if (s.repeat) expect(s.shot).toBeDefined();
        }
    });

    it('no hay dos filas para la misma marca', () => {
        // Dos filas para una marca sonarían las dos a la vez, y la compuerta
        // dejaría pasar sólo una de las dos según cuál llegara antes.
        const marcas = SCREEN_SOUNDS.map((s) => s.mark);

        expect(new Set(marcas).size).toBe(marcas.length);
    });

    it('el selector las busca todas de una pasada', () => {
        /*
         * Es lo que permite una sola consulta al documento por mutación en vez
         * de una por marca. El colapso reescribe su manta de estática doce veces
         * por segundo, así que la diferencia se paga en el peor momento.
         */
        for (const s of SCREEN_SOUNDS) expect(SCREEN_SELECTOR).toContain(`.${s.mark}`);
    });
});
