// tests/components/effects/BootGate.test.tsx

/**
 * LA PUERTA DEL ARRANQUE: primero se apaga, después «PULSE UNA TECLA».
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
 * ⚠ Y EL ORDEN IMPORTA, que es lo que se corrigió. La puerta era lo primero y la
 * máquina se apagaba DESPUÉS de que pulsaras para encenderla — al revés de como
 * pasa. Recargar es apagar y volver a encender: el tubo se cierra, la pantalla
 * queda muerta pidiendo una tecla, y al pulsarla arrancan las barras.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BootGate from '@/components/effects/BootGate';
import { BOOT_OFF_MS } from '@/lib/system/boot';
import { SOUND_STORAGE_KEY } from '@/lib/system/audio/context';

beforeEach(() => {
    localStorage.clear();
});

/** Lo que tarda el tubo en cerrarse, con margen para una suite cargada. */
const TRAS_EL_APAGON = BOOT_OFF_MS + 300;

describe('cuando hay sonido que desbloquear', () => {
    it('⚠ lo PRIMERO es el tubo apagándose, no la tecla', () => {
        /*
         * REPORTADO: «cuando le damos refrescar debe salir la animación de
         * apagado, ANTES de la pantalla de darle a una tecla».
         *
         * Y tiene razón de sobra: recargar es apagar y encender. Pedir la tecla
         * primero contaba que la máquina se apagaba después de que la
         * encendieras.
         */
        render(<BootGate onReady={() => {}} />);

        expect(document.querySelector('.collapse-dying')).toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('⚠ y pinta la marca COMPARTIDA, que es lo que la hace sonar', () => {
        /*
         * `.collapse-dying` ya la pintan el arranque, el colapso y el barrido:
         * las tres cierran la imagen a un punto. La tabla de `screens.ts` la
         * reconoce, así que este componente suena sin saber nada de sonido.
         *
         * Si alguien le pusiera una clase propia «porque es otra pantalla», se
         * quedaría muda sin que nada fallara.
         */
        render(<BootGate onReady={() => {}} />);

        expect(document.querySelector('.collapse-dying')).toBeInTheDocument();
    });

    it('y cuando el tubo termina de cerrarse, pide la tecla', async () => {
        render(<BootGate onReady={() => {}} />);

        await waitFor(() => expect(screen.getByRole('button')).toBeInTheDocument(), {
            timeout: TRAS_EL_APAGON,
        });
    });

    it('⚠ una tecla la abre, y el arranque sigue DESDE LAS BARRAS', async () => {
        /*
         * Si siguiera desde el apagón, la máquina se apagaría otra vez justo
         * después de que la encendieras — el apagón ya lo enseñó esta pantalla.
         */
        const abierta = jest.fn();
        render(<BootGate onReady={abierta} />);

        await waitFor(() => screen.getByRole('button'), { timeout: TRAS_EL_APAGON });
        fireEvent.keyDown(document, { key: 'a' });

        await waitFor(() => expect(abierta).toHaveBeenCalledWith('bars'));
    });

    it('y un clic también, porque no todo el mundo llega por teclado', async () => {
        const abierta = jest.fn();
        render(<BootGate onReady={abierta} />);

        await waitFor(() => screen.getByRole('button'), { timeout: TRAS_EL_APAGON });
        fireEvent.click(screen.getByRole('button'));

        await waitFor(() => expect(abierta).toHaveBeenCalledTimes(1));
    });

    it('⚠ pero sólo avisa UNA vez, aunque se aporree', async () => {
        /*
         * Quien encuentra una pantalla que dice «pulse una tecla» pulsa varias.
         * Si cada una avisara, el arranque se relanzaría encima de sí mismo y
         * sonaría en capas.
         */
        const abierta = jest.fn();
        render(<BootGate onReady={abierta} />);

        await waitFor(() => screen.getByRole('button'), { timeout: TRAS_EL_APAGON });

        fireEvent.keyDown(document, { key: 'a' });
        fireEvent.keyDown(document, { key: 'b' });
        fireEvent.click(screen.getByRole('button'));

        await waitFor(() => expect(abierta).toHaveBeenCalledTimes(1));
    });

    it('⚠ adelantarse durante el apagón no lo corta, y tampoco se pierde', async () => {
        /*
         * Las dos mitades importan. Cortar el apagón dejaría a medias justo lo
         * que se pidió ver; ignorar la tecla obligaría a pulsar dos veces sin
         * decir por qué. Se apunta el gesto y se abre al terminar.
         */
        const abierta = jest.fn();
        render(<BootGate onReady={abierta} />);

        fireEvent.keyDown(document, { key: 'a' });

        // Todavía no: el tubo sigue cerrándose.
        expect(abierta).not.toHaveBeenCalled();
        expect(document.querySelector('.collapse-dying')).toBeInTheDocument();

        await waitFor(() => expect(abierta).toHaveBeenCalledWith('bars'), {
            timeout: TRAS_EL_APAGON,
        });

        // Y sin pasar por la pantalla de la tecla: ya la pulsaste.
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('tapa lo que haya debajo: es lo primero que se ve', () => {
        render(<BootGate onReady={() => {}} />);

        expect(document.querySelector('.boot-screen')).toBeInTheDocument();
    });

    it('⚠ y apaga el barrido, porque un tubo apagado no refresca', () => {
        /*
         * El barrido es el refresco del tubo. Dejar la línea cruzando mientras
         * la imagen se cierra a un punto contaría que la pantalla sigue
         * encendida justo cuando se está apagando.
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
