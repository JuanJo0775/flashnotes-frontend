// tests/hooks/reinicioComoRecarga.test.ts

/**
 * REINICIAR TIENE QUE DEJAR LA MÁQUINA COMO LA DEJA RECARGAR.
 *
 * `rebootSystem` lo promete en su propio comentario —«lo que se limpia es lo que
 * una recarga se lleva, ni más ni menos»— y durante meses no fue verdad para
 * cinco cosas. La primera la encontró alguien jugando (el reloj de `//date_off`);
 * las otras cuatro salieron comparando, una por una, el estado de módulo del
 * proyecto contra lo que el reinicio tocaba.
 *
 * ⚠ POR QUÉ ESTE TEST Y NO CONFIAR EN LA LISTA. Todo esto vive en memoria en
 * módulos distintos, y añadir el sexto es escribir un `let` en un fichero que no
 * sabe que el reinicio existe. Lo único que lo caza es preguntar por cada cosa
 * DESPUÉS de reiniciar.
 *
 * ⚠ Y HAY UNA EXCEPCIÓN QUE TAMBIÉN SE PRUEBA: lo que la v0.2 no llegó a guardar
 * NO se limpia. Una recarga sí se lo lleva, así que por la letra de la regla
 * tocaría borrarlo — y sería borrar texto del usuario que espera a `//recover`.
 * Se prueba para que nadie «arregle» la excepción.
 */

import { rebootSystem, resetEverything } from '@/hooks/useSystemState';
import { hitWall, wallHits } from '@/lib/system/looseWall';
import { entries, record } from '@/lib/system/requestLog';
import { isDrifting, startDrift } from '@/lib/system/timeDrift';
import { ART, justRevealed, lastDrawn, rememberDrawn } from '@/lib/system/asciiArt';
import { allDropped, rememberDropped } from '@/lib/system/dropped';

/** Deja la sesión sucia: una de cada cosa que el reinicio tiene que llevarse. */
function ensuciar() {
    startDrift(Date.now() - 10_000);
    hitWall();
    hitWall();
    record({ method: 'GET', path: '/api/notes', status: 200, durationMs: 12 });
    rememberDrawn(ART[0]);
}

beforeEach(() => {
    localStorage.clear();
    // Cada test empieza de cero: esto vive en memoria y se pega entre pruebas.
    rebootSystem();
});

describe('reiniciar deja la máquina como la deja recargar', () => {
    test('⚠ los golpes a la pared se van', () => {
        /*
         * La peor de las cinco. `looseWall` dice que los golpes no pueden
         * sobrevivir a una recarga —«lo que se derrumba tiene que derrumbarse
         * mientras mirás»— y sobrevivían al reinicio: se podía dejar el cuadro a
         * un golpe de caerse, reiniciar, y encontrarlo igual de suelto.
         */
        ensuciar();
        expect(wallHits()).toBe(2);

        rebootSystem();

        expect(wallHits()).toBe(0);
    });

    test('el reloj suelto vuelve a su sitio', () => {
        ensuciar();
        expect(isDrifting()).toBe(true);

        rebootSystem();

        expect(isDrifting()).toBe(false);
    });

    test('el registro de peticiones queda vacío', () => {
        // Si no, `//log` después de reiniciar enseña peticiones de antes.
        ensuciar();
        expect(entries().length).toBeGreaterThan(0);

        rebootSystem();

        expect(entries()).toHaveLength(0);
    });

    test('y la colección suelta lo que tenía en la mano', () => {
        // La última dibujada es la que `//keep` guardaría, y las recién
        // destapadas son las que vuelven a sintonizarse al pintar la rejilla.
        ensuciar();
        expect(lastDrawn()).not.toBeNull();

        rebootSystem();

        expect(lastDrawn()).toBeNull();
        expect(justRevealed().size).toBe(0);
    });
});

describe('la excepción, que es la primera regla del proyecto', () => {
    test('⚠ lo que la v0.2 no llegó a guardar NO se limpia al reiniciar', () => {
        /*
         * Una recarga sí se lo lleva, así que por la letra de la regla tocaría
         * borrarlo. Es texto del usuario esperando a `//recover`: la primera
         * regla del proyecto gana a ésta, y por eso se prueba — para que nadie
         * complete la lista sin leer el comentario.
         */
        rememberDropped('n1', 'Nota.txt', 'lo que estaba escribiendo');

        rebootSystem();

        expect(allDropped()).toHaveLength(1);
    });

    test('pero el borrado total sí, porque eso sí lo pediste', () => {
        rememberDropped('n1', 'Nota.txt', 'lo que estaba escribiendo');

        resetEverything();

        expect(allDropped()).toHaveLength(0);
    });
});

describe('el borrado total es, como mínimo, un reinicio', () => {
    test('se lleva lo mismo que el reinicio', () => {
        // Sin esto la pared se quedaba con los golpes de antes, y el día que
        // alguien volviera a aflojarla la encontraría medio caída.
        ensuciar();

        resetEverything();

        expect(wallHits()).toBe(0);
        expect(isDrifting()).toBe(false);
        expect(entries()).toHaveLength(0);
        expect(lastDrawn()).toBeNull();
    });
});
