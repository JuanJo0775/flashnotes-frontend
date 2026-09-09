// tests/lib/system/audio/events.test.ts

/**
 * NINGUNA VOZ SE QUEDA SIN SUCESO DOCUMENTADO.
 *
 * ⚠ ES LA PROPIEDAD QUE HACE QUE EL CATALOGO SIRVA. Dos tablas cubren de donde
 * sale cada sonido: `SCREEN_SOUNDS` para lo que se VE y `EVENT_SOUNDS` para lo
 * que no. Sin este test, la segunda seria una lista escrita a mano — o sea, una
 * que envejece en silencio en cuanto alguien añada una voz.
 *
 * Se pidio jugando: «documenta todos esos sonidos en el banco y su asociacion a
 * que evento». Un catalogo que se pueda quedar corto no documenta: tranquiliza,
 * que es peor.
 */

import { CATEGORY_OF } from '@/lib/system/audio/voices';
import { EVENT_SOUNDS, INTERNAL_VOICES } from '@/lib/system/audio/events';
import { SCREEN_SOUNDS } from '@/lib/system/audio/screens';

/** Toda voz nombrada por las dos tablas, venga de donde venga. */
function documentadas(): Set<string> {
    const vistas = new Set<string>();

    for (const s of SCREEN_SOUNDS) {
        if (s.shot) vistas.add(s.shot.voice);
        if (s.then) vistas.add(s.then.voice);
        if (s.onGone) vistas.add(s.onGone.voice);
    }

    for (const e of EVENT_SOUNDS) vistas.add(e.voice);
    for (const v of INTERNAL_VOICES) vistas.add(v);

    return vistas;
}

describe('el catalogo de sonidos esta completo', () => {
    it('⚠ toda voz que declara familia tiene su suceso escrito', () => {
        /*
         * `CATEGORY_OF` es la lista de todo lo que suena: una voz que no este
         * ahi se salta el presupuesto y la compuerta. Y una que este ahi pero no
         * en el catalogo es un sonido que la app puede hacer sin que nadie sepa
         * cuando ni por que.
         */
        const sinSuceso = Object.keys(CATEGORY_OF).filter((v) => !documentadas().has(v));

        expect(sinSuceso).toEqual([]);
    });

    it('⚠ y el catalogo no inventa voces que no existen', () => {
        // Una fila que nombre una voz borrada manda a buscar un fantasma, y en
        // una pagina de identidad eso es peor que no tener la fila.
        for (const v of documentadas()) expect(CATEGORY_OF).toHaveProperty(v);
    });

    it('las internas declaran por que no tienen suceso propio', () => {
        /*
         * No es una lista de excepciones para que el test calle: es la
         * diferencia entre una voz y una PIEZA de una voz. `whine` no se dispara
         * nunca sola — la usan por dentro el encendido y el apagado.
         */
        expect(INTERNAL_VOICES.length).toBeGreaterThan(0);

        for (const v of INTERNAL_VOICES) {
            expect(EVENT_SOUNDS.some((e) => e.voice === (v as string))).toBe(false);
        }
    });
});

describe('las filas estan bien formadas', () => {
    it('no hay dos sucesos para la misma voz', () => {
        // Dos filas para una voz cuentan dos historias distintas del mismo
        // sonido, y quien lea el catalogo se queda con la primera.
        const voces = EVENT_SOUNDS.map((e) => e.voice);

        expect(new Set(voces).size).toBe(voces.length);
    });

    it('⚠ y lo pendiente dice que lo esta, en vez de esconderse', () => {
        /*
         * Una voz construida y todavia sin enchufar es una decision a medias.
         * Omitirla la haria parecer inexistente, y quien buscara por que no
         * suena no encontraria ni el hueco.
         */
        for (const e of EVENT_SOUNDS) {
            if (e.pending) expect(e.where).toContain('ninguna parte');
            else expect(e.where).not.toContain('ninguna parte');
        }
    });

    it('cada fila dice el suceso y de donde se entera', () => {
        for (const e of EVENT_SOUNDS) {
            expect(e.what.length).toBeGreaterThan(10);
            expect(e.where.length).toBeGreaterThan(5);
        }
    });
});
