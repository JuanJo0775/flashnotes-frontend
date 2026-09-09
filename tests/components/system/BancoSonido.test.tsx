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
import { EVENT_SOUNDS, INTERNAL_VOICES, sampleArgs } from '@/lib/system/audio/events';
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

describe('\u26a0 y TODAS se dejan oir', () => {
    /*
     * REPORTADO JUGANDO: «el banco tiene sonidos que no se dejan reproducir».
     *
     * Era cierto por dos motivos distintos, y los dos hacian lo mismo: dejar el
     * boton apagado. Las voces que piden datos —hercios, amplitud— no tenian de
     * donde sacarlos, y tres filas no disparan un golpe sino que encienden un
     * tono sostenido o AGACHAN la sala.
     *
     * Un catalogo donde la mitad no se deja oir no es un catalogo: tranquiliza,
     * que es peor. Este test cuenta los botones y exige que ninguno este muerto,
     * asi que la proxima voz rara tampoco va a poder colarse apagada.
     */
    function botonesDelCatalogo(): HTMLButtonElement[] {
        return screen.getAllByRole('button', { name: '[OÍR]' }) as HTMLButtonElement[];
    }

    it('hay un boton por fila, ni uno menos', () => {
        render(<Banco />);

        expect(botonesDelCatalogo()).toHaveLength(
            SCREEN_SOUNDS.length + EVENT_SOUNDS.length
        );
    });

    it('y ninguno esta apagado', () => {
        render(<Banco />);

        for (const b of botonesDelCatalogo()) expect(b).toBeEnabled();
    });

    it('⚠ las voces que piden datos traen con que', () => {
        /*
         * El tipo de `SAMPLE_ARGS` ya lo exige al compilar; esto ata el otro
         * lado: que lo que sale del ayudante sea lo que `play` espera, y no un
         * objeto vacio que dispararia un sonido distinto del de la app.
         */
        expect(sampleArgs('beep')).toEqual({ hz: 1_050, ms: 110 });
        expect(sampleArgs('tear')).toEqual({ amplitudePx: 9 });

        // Y las que no llevan datos devuelven nada, no un objeto de relleno.
        expect(sampleArgs('key')).toBeUndefined();
    });
});

describe('⚠ y ninguna fila se confunde con otra', () => {
    /*
     * REPORTADO JUGANDO: «se repite el de power up».
     *
     * Y se repetia: el boton llevaba escrito el nombre de la VOZ, y varias filas
     * comparten voz — el apagado suena en el tubo cortandose Y en la pagina
     * muerta, el barrido en el pedazo Y en el bloqueo. La lista salia con
     * etiquetas identicas y no habia forma de saber cual era cual.
     *
     * Lo que distingue una fila de otra es el SUCESO, no la voz. Ahora el boton
     * dice lo que hace y la fila dice de que es.
     */
    it('el suceso de cada fila aparece una sola vez', () => {
        render(<Banco />);

        for (const s of SCREEN_SOUNDS) {
            expect(screen.getAllByText(s.what)).toHaveLength(1);
        }
    });

    it('y las voces repetidas se ven como lo que son: la misma voz en dos sitios', () => {
        // No es un defecto que `powerDown` este dos veces: es economia. El
        // defecto era que no se supiera en que dos sitios.
        render(<Banco />);

        const enDosSitios = SCREEN_SOUNDS.filter((s) => s.shot?.voice === 'powerDown');
        expect(enDosSitios).toHaveLength(2);

        for (const s of enDosSitios) {
            expect(screen.getByText(`.${s.mark}`)).toBeInTheDocument();
        }
    });
});
