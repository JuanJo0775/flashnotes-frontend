// tests/components/system/BancoSonido.test.tsx

/**
 * EL BANCO ENSEÑA TODOS LOS SONIDOS, Y CON QUE SUCESO VAN.
 *
 * ⚠ POR QUE HAY UN TEST PARA UNA PAGINA DE DOCUMENTACION. Porque es
 * documentacion, y la documentacion escrita a mano envejece en silencio: alguien
 * añade una voz, la enchufa, y la pagina de identidad sigue diciendo que el
 * sistema tiene una menos. Nadie se entera hasta que alguien la usa para decidir
 * algo y decide con datos viejos.
 *
 * Se pidio jugando: «documenta todos esos sonidos en el banco y su asociacion a
 * que evento». Un catalogo que se puede quedar corto no documenta: tranquiliza,
 * que es peor.
 *
 * Este test recorre las MISMAS listas que la app usa para sonar, asi que no puede
 * quedarse corto sin que se vea.
 */

import { render, screen } from '@testing-library/react';
import Banco from '@/components/system/Banco';
import { EVENT_SOUNDS, INTERNAL_VOICES } from '@/lib/system/audio/events';
import { SCREEN_SOUNDS } from '@/lib/system/audio/screens';

beforeEach(() => {
    localStorage.clear();
});

describe('la pagina de identidad cuenta el sonido entero', () => {
    it.each(SCREEN_SOUNDS.map((s) => [s.mark, s.what]))(
        'enseña la pantalla «%s» y lo que suena en ella',
        (mark, what) => {
            render(<Banco />);

            expect(screen.getByText(what)).toBeInTheDocument();
            // Y la marca, que es el enganche real: sin ella la fila no explica
            // POR QUE suena, solo que suena.
            expect(screen.getByText(`.${mark}`)).toBeInTheDocument();
        }
    );

    it.each(EVENT_SOUNDS.map((e) => [e.voice, e.what]))(
        'y el suceso de «%s», que no se ve en ninguna pantalla',
        (voice, what) => {
            render(<Banco />);

            expect(screen.getByText(what)).toBeInTheDocument();
        }
    );

    it('⚠ y dice cuales son piezas de otras voces', () => {
        /*
         * Sin esta linea, `whine` seria una voz que el sistema declara y que no
         * aparece en ningun suceso — y quien leyera el catalogo buscaria un
         * agujero que no existe. La usan por dentro el encendido y el apagado.
         */
        render(<Banco />);

        for (const v of INTERNAL_VOICES) {
            expect(screen.getByText(new RegExp(v as string))).toBeInTheDocument();
        }
    });

    it('⚠ y lo pendiente se ve como pendiente', () => {
        /*
         * Una voz construida y todavia sin enchufar es una decision a medias.
         * Enseñarla como si sonara seria mentir en la unica pagina cuyo trabajo
         * es no mentir.
         */
        render(<Banco />);

        const pendientes = EVENT_SOUNDS.filter((e) => e.pending);
        expect(pendientes.length).toBeGreaterThan(0);

        expect(screen.getAllByText(/SIN ENCHUFAR/).length).toBe(pendientes.length);
    });
});
