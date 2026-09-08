// tests/components/effects/BootGate.test.tsx

/**
 * LA PUERTA DEL ARRANQUE: «PULSE UNA TECLA», y luego el ciclo entero.
 *
 * ⚠ POR QUÉ EXISTE, QUE NO ES POR ESTÉTICA.
 *
 * Todo navegador crea el audio en estado suspendido y NO lo deja arrancar hasta
 * que hay un gesto del usuario. Es una política contra la publicidad con sonido,
 * y no tiene vuelta: cualquier cosa que se programe antes queda muda. Por eso el
 * arranque —las barras, el logo, la comprobación— sonaba en silencio y se
 * reportó una y otra vez.
 *
 * La única salida honesta es que el producto PIDA el gesto. Y da la casualidad
 * de que las máquinas de esa época hacían exactamente eso, así que lo que
 * empezó siendo una limitación del navegador entra en la ficción sin forzarla.
 *
 * ⚠ Y EL ORDEN SE CORRIGIÓ DOS VECES. Primero el apagón iba delante, porque
 * recargar es apagar y encender y ése es el orden de los hechos. Pero delante de
 * la tecla NO HAY PERMISO PARA SONAR, y se reportó exactamente eso: «la de apagar
 * cuando se reinicia no suena, pero cuando se reinicia luego de darle al cromo
 * esa sí».
 *
 * Un apagado que se VE pero no se OYE es peor que uno que llega un segundo tarde,
 * así que la imagen se movió a donde el sonido puede acompañarla. La pantalla
 * está muerta, pulsás, y la máquina hace su ciclo entero: se corta, zumba a
 * oscuras, y vuelve.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BootGate from '@/components/effects/BootGate';
import { BOOT_OFF_MS, BOOT_WAKE_MS } from '@/lib/system/boot';
import { SOUND_STORAGE_KEY } from '@/lib/system/audio/context';

beforeEach(() => {
    localStorage.clear();
});

/** El ciclo entero tras la tecla, con margen para una suite cargada. */
const TRAS_EL_CICLO = BOOT_OFF_MS + BOOT_WAKE_MS + 600;

describe('cuando hay sonido que desbloquear', () => {
    it('⚠ lo PRIMERO es la tecla, porque antes no se puede oir nada', () => {
        /*
         * ⚠ ESTE ORDEN SE CORRIGIO DOS VECES, Y LA SEGUNDA GANO EL SONIDO.
         *
         * El apagon iba delante, porque recargar es apagar y encender y ese es
         * el orden de los hechos. Pero delante de la tecla NO HAY PERMISO PARA
         * SONAR, y se reporto exactamente eso: «la de apagar cuando se reinicia
         * no suena, pero cuando se reinicia luego de darle al cromo esa si».
         *
         * Un apagado que se VE pero no se OYE es peor que uno que llega un
         * segundo tarde, asi que la imagen se mueve a donde el sonido puede
         * acompanarla.
         */
        render(<BootGate onReady={() => {}} />);

        expect(screen.getByRole('button')).toBeInTheDocument();
        expect(document.querySelector('.collapse-dying')).not.toBeInTheDocument();
    });

    it('⚠ y al pulsar, el tubo se cierra CON su marca compartida', async () => {
        /*
         * `.collapse-dying` ya la pintan el arranque, el colapso y el barrido:
         * las tres cierran la imagen a un punto. La tabla de `screens.ts` la
         * reconoce, asi que este componente suena sin saber nada de sonido.
         *
         * Si alguien le pusiera una clase propia «porque es otra pantalla», se
         * quedaria muda sin que nada fallara.
         */
        render(<BootGate onReady={() => {}} />);

        fireEvent.keyDown(document, { key: 'a' });

        await waitFor(() =>
            expect(document.querySelector('.collapse-dying')).toBeInTheDocument()
        );
    });

    it('⚠ y despues un compas OSCURO, donde el zumbido cabe sin tapar nada', async () => {
        /*
         * Se pidio oir el grave —«ese grave me gusta, que suene al entrar»— y a
         * la vez que no se solapara con las barras de colores. Sin este hueco
         * solo podia entrar encima de ellas, porque el navegador no deja sonar
         * hasta el primer gesto y a partir de ahi todo pasa a la vez.
         *
         * Se mide que el apagon YA TERMINO y que todavia no se avisa: eso es el
         * hueco.
         */
        const abierta = jest.fn();
        render(<BootGate onReady={abierta} />);

        fireEvent.keyDown(document, { key: 'a' });

        await waitFor(
            () => expect(document.querySelector('.collapse-dying')).not.toBeInTheDocument(),
            { timeout: BOOT_OFF_MS + 500 }
        );

        expect(document.querySelector('.boot-screen')).toBeInTheDocument();
        expect(abierta).not.toHaveBeenCalled();
    });

    it('⚠ y el arranque sigue DESDE LAS BARRAS', async () => {
        /*
         * Si siguiera desde el apagon, la maquina se apagaria otra vez justo
         * despues de que la encendieras — el apagon ya lo enseño esta pantalla.
         */
        const abierta = jest.fn();
        render(<BootGate onReady={abierta} />);

        fireEvent.keyDown(document, { key: 'a' });

        await waitFor(() => expect(abierta).toHaveBeenCalledWith('bars'), {
            timeout: TRAS_EL_CICLO,
        });
    });

    it('y un clic tambien, porque no todo el mundo llega por teclado', async () => {
        const abierta = jest.fn();
        render(<BootGate onReady={abierta} />);

        fireEvent.click(screen.getByRole('button'));

        await waitFor(() => expect(abierta).toHaveBeenCalledTimes(1), {
            timeout: TRAS_EL_CICLO,
        });
    });

    it('⚠ pero solo avisa UNA vez, aunque se aporree', async () => {
        /*
         * Quien encuentra una pantalla que dice «pulse una tecla» pulsa varias.
         * Si cada una avisara, el arranque se relanzaria encima de si mismo y
         * sonaria en capas.
         */
        const abierta = jest.fn();
        render(<BootGate onReady={abierta} />);

        fireEvent.keyDown(document, { key: 'a' });
        fireEvent.keyDown(document, { key: 'b' });
        fireEvent.click(screen.getByRole('button'));

        await waitFor(() => expect(abierta).toHaveBeenCalledTimes(1), {
            timeout: TRAS_EL_CICLO,
        });
    });

    it('tapa lo que haya debajo: es lo primero que se ve', () => {
        render(<BootGate onReady={() => {}} />);

        expect(document.querySelector('.boot-screen')).toBeInTheDocument();
    });

    it('⚠ y apaga el barrido, porque un tubo apagado no refresca', () => {
        /*
         * El barrido es el refresco del tubo. Dejar la linea cruzando mientras
         * la imagen se cierra a un punto contaria que la pantalla sigue
         * encendida justo cuando se esta apagando.
         */
        render(<BootGate onReady={() => {}} />);

        expect(document.documentElement).toHaveAttribute('data-tube-off');
    });
});

describe('⚠ con el sonido apagado no estorba', () => {
    it('no se enseña, y deja pasar de inmediato', () => {
        /*
         * La puerta existe SÓLO para desbloquear el audio. Sin audio que
         * desbloquear no pinta nada, y dejarla puesta sería un paso de más entre
         * alguien y sus notas — que es exactamente lo que la regla A2 prohíbe.
         */
        localStorage.setItem(SOUND_STORAGE_KEY, 'off');
        const abierta = jest.fn();

        render(<BootGate onReady={abierta} />);

        expect(screen.queryByRole('button')).not.toBeInTheDocument();
        expect(abierta).toHaveBeenCalledTimes(1);
    });

    it('⚠ y el arranque hace su PROPIO apagón, para que se vea igual', () => {
        /*
         * Sin puerta no hay quien enseñe el tubo cerrándose, así que el guion
         * tiene que empezar desde ahí. Si arrancara en las barras, apagar el
         * sonido cambiaría también lo que se VE al recargar, y no es eso lo que
         * el interruptor promete.
         */
        localStorage.setItem(SOUND_STORAGE_KEY, 'off');
        const abierta = jest.fn();

        render(<BootGate onReady={abierta} />);

        expect(abierta).toHaveBeenCalledWith('off');
    });
});
