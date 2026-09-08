// tests/components/effects/BootGate.test.tsx

/**
 * LA PUERTA DEL ARRANQUE: «PULSE UNA TECLA».
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
 * ⚠ Y SÓLO APARECE SI HAY SONIDO QUE DESBLOQUEAR. Con el sonido apagado la
 * puerta no serviría para nada y sólo añadiría un paso entre el usuario y sus
 * notas.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import BootGate from '@/components/effects/BootGate';
import { SOUND_STORAGE_KEY } from '@/lib/system/audio/context';

beforeEach(() => {
    localStorage.clear();
});

describe('cuando hay sonido que desbloquear', () => {
    it('se enseña y pide una tecla', () => {
        render(<BootGate onReady={() => {}} />);

        expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('una tecla la abre', () => {
        const abierta = jest.fn();
        render(<BootGate onReady={abierta} />);

        fireEvent.keyDown(document, { key: 'a' });

        expect(abierta).toHaveBeenCalledTimes(1);
    });

    it('y un clic también, porque no todo el mundo llega por teclado', () => {
        const abierta = jest.fn();
        render(<BootGate onReady={abierta} />);

        fireEvent.click(screen.getByRole('button'));

        expect(abierta).toHaveBeenCalledTimes(1);
    });

    it('⚠ pero sólo avisa UNA vez, aunque se aporree', () => {
        /*
         * Quien encuentra una pantalla que dice «pulse una tecla» pulsa varias.
         * Si cada una avisara, el arranque se relanzaría encima de sí mismo y
         * sonaría en capas.
         */
        const abierta = jest.fn();
        render(<BootGate onReady={abierta} />);

        fireEvent.keyDown(document, { key: 'a' });
        fireEvent.keyDown(document, { key: 'b' });
        fireEvent.click(screen.getByRole('button'));

        expect(abierta).toHaveBeenCalledTimes(1);
    });

    it('tapa lo que haya debajo: es lo primero que se ve', () => {
        render(<BootGate onReady={() => {}} />);

        expect(document.querySelector('.boot-screen')).toBeInTheDocument();
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
});
