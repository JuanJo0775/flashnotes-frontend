// tests/hooks/useSound.test.tsx

/**
 * EL INTERRUPTOR DEL SONIDO, VISTO DESDE REACT.
 *
 * Hermano de `usePrefersReducedMotion` y con el mismo motivo: lo miran varios
 * sitios a la vez —el panel de diagnóstico, el banco de pruebas, y mañana lo
 * que sea— y con un `useState` por componente cada uno tendría su propia idea
 * de si el sonido está encendido.
 *
 * ⚠ Y NO SE PUEDE LEER AL PINTAR (regla C1): vive en `localStorage`. El
 * almacén con `useSyncExternalStore` es la respuesta del proyecto a eso, y
 * evita además el `setState` dentro de un efecto que React ya rechaza.
 */

import { act, render, screen } from '@testing-library/react';
import { setSoundOn, SOUND_STORAGE_KEY } from '@/lib/system/audio/context';
import { useSound } from '@/hooks/useSound';

function Sonda() {
    const on = useSound();
    return <span data-testid="estado">{on ? 'ON' : 'OFF'}</span>;
}

beforeEach(() => {
    localStorage.clear();
});

describe('el hook', () => {
    it('arranca encendido, igual que los efectos', () => {
        render(<Sonda />);

        expect(screen.getByTestId('estado')).toHaveTextContent('ON');
    });

    it('lee lo que hubiera guardado', () => {
        localStorage.setItem(SOUND_STORAGE_KEY, 'off');

        render(<Sonda />);

        expect(screen.getByTestId('estado')).toHaveTextContent('OFF');
    });

    it('⚠ y se entera cuando lo apagan desde OTRO sitio', () => {
        /*
         * Ésta es la razón de que sea un almacén y no un estado local. El
         * interruptor se toca desde el panel de diagnóstico Y desde `//sound`,
         * y quien esté pintando el rótulo tiene que enterarse aunque el cambio
         * no haya salido de él. Sin esto, el panel diría ON con el sonido ya
         * apagado hasta que algo lo obligara a repintarse.
         */
        render(<Sonda />);
        expect(screen.getByTestId('estado')).toHaveTextContent('ON');

        act(() => setSoundOn(false));

        expect(screen.getByTestId('estado')).toHaveTextContent('OFF');
    });

    it('y vuelve a encenderse igual', () => {
        localStorage.setItem(SOUND_STORAGE_KEY, 'off');
        render(<Sonda />);

        act(() => setSoundOn(true));

        expect(screen.getByTestId('estado')).toHaveTextContent('ON');
    });

    it('deja de escuchar al desmontarse', () => {
        // Un oyente que sobrevive al componente es una fuga, y en este caso
        // ademas mantiene vivo un arbol de React ya muerto.
        const { unmount } = render(<Sonda />);

        unmount();

        expect(() => act(() => setSoundOn(false))).not.toThrow();
    });
});
