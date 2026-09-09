// tests/components/effects/NoSeCongela.test.tsx

/**
 * NADA SE CONGELA PORQUE EL PADRE REPINTE.
 *
 * ⚠ EL MISMO FALLO APARECIO CUATRO VECES, y la cuarta ya no era mala suerte. Se
 * reporto jugando dos veces seguidas: «la barra que sube de reiniciar se queda
 * pegada» y «la animacion de reiniciar queda congelada en algunos momentos».
 *
 * El patron es siempre el mismo. Un componente arma un temporizador en un efecto
 * y pone `onDone` en las dependencias, que es lo que el linter pide. El padre le
 * pasa una funcion nueva en cada render —una flecha escrita en el JSX, que es lo
 * normal— y la pagina repinta sola por lo menos una vez por segundo, porque hay
 * un reloj en la barra de estado.
 *
 * Cada repintado desarma el temporizador y lo vuelve a armar desde cero, asi que
 * un tramo mas largo que el intervalo de repintado NO TERMINA NUNCA.
 *
 * Por eso pasaba «a veces»: el arranque sortea su duracion. Un arranque largo
 * reparte cuatro segundos al rotulo — ese no llegaba jamas.
 *
 * Este test es la reproduccion exacta: un padre que repinta cada 900 ms mientras
 * corre la secuencia. Sin `useEvent`, ninguno de los tres termina.
 */

import { act, render } from '@testing-library/react';
import BootScreen from '@/components/effects/BootScreen';
import WipeScreen from '@/components/effects/WipeScreen';
import CommandRows from '@/components/effects/CommandRows';
import { BOOT_MAX_MS } from '@/lib/system/boot';

beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
});

afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
});

/**
 * Corre el reloj repintando por el camino, como hace la pagina de verdad.
 *
 * ⚠ El repintado es lo que se esta midiendo: sin el, todos estos componentes
 * terminan igual y el test no dice nada.
 */
function correrRepintando(total: number, repintar: () => void) {
    const PASO = 900;

    for (let ido = 0; ido < total; ido += PASO) {
        act(() => {
            jest.advanceTimersByTime(PASO);
        });
        act(() => {
            repintar();
        });
    }
}

describe('⚠ el arranque termina aunque la pagina repinte', () => {
    it('llega hasta el final y avisa', () => {
        const listo = jest.fn();
        const { rerender } = render(<BootScreen onDone={() => listo()} />);

        correrRepintando(BOOT_MAX_MS * 2, () =>
            rerender(<BootScreen onDone={() => listo()} />)
        );

        expect(listo).toHaveBeenCalled();
    });
});

describe('⚠ el barrido tambien', () => {
    it('llega hasta el final y avisa', () => {
        const listo = jest.fn();
        const { rerender } = render(<WipeScreen onDone={() => listo()} />);

        correrRepintando(30_000, () => rerender(<WipeScreen onDone={() => listo()} />));

        expect(listo).toHaveBeenCalled();
    });
});

describe('⚠ y la respuesta de un comando se retira sola', () => {
    it('no se queda puesta para siempre', () => {
        /*
         * Aca el sintoma seria otro y igual de raro: la lista de `//help`
         * quedandose en pantalla hasta que la cierres a mano, cuando el diseño
         * dice que TODAS se van solas.
         */
        const listo = jest.fn();
        const filas = [{ text: 'UNO' }, { text: 'DOS' }];

        const { rerender } = render(
            <CommandRows rows={filas} holdMs={4_000} onDone={() => listo()} />
        );

        correrRepintando(20_000, () =>
            rerender(<CommandRows rows={filas} holdMs={4_000} onDone={() => listo()} />)
        );

        expect(listo).toHaveBeenCalled();
    });
});
