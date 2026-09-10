// tests/components/layout/SidebarRespira.test.tsx

/**
 * LA LISTA RESPIRA: el papel entrando y el papel saliendo.
 *
 * ⚠ SALIÓ DE UNA AUDITORÍA, y el hallazgo era éste: la app es espectacular
 * cuando se rompe y está INERTE cuando funciona. Veintiuna animaciones de avería
 * contra cuatro normales, y la lista —la pantalla donde más tiempo pasa
 * cualquiera— no se movía ni al entrar ni al salir.
 *
 * ⚠ Y VA EN EL LATERAL Y NO EN LA LISTA GRANDE, que es lo que hay que entender
 * para no moverlo de sitio: tirás una nota DESDE EL EDITOR, y al volver la lista
 * grande ya no la tiene. Nunca se vería irse. El lateral, en cambio, está
 * delante mientras escribís: ahí la fila desaparecía de golpe, en el mismo
 * instante, sin que nada contara que se fue.
 */

import { act, render } from '@testing-library/react';
import Sidebar from '@/components/layout/Sidebar';
import type { Note } from '@/types/note.types';

const nota = (id: string, title: string): Note =>
    ({
        _id: id,
        title,
        content: 'x'.repeat(120),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }) as Note;

/** Lo demás que el lateral pide y a estos tests no les dice nada. */
const RESTO = {
    selectedNote: null,
    onSelectNote: () => {},
    onNewNote: () => {},
    total: 2,
    hasMore: false,
    isLoadingMore: false,
    onLoadMore: () => {},
} as const;

const lateral = (notes: Note[]) => <Sidebar notes={notes} {...RESTO} />;

const pintar = (notes: Note[]) => render(lateral(notes));

beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
});

afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
});

describe('el papel entrando', () => {
    it('cada fila llega con su clase', () => {
        const { container } = pintar([nota('1', 'una'), nota('2', 'otra')]);

        expect(container.querySelectorAll('.file-row.row-feed')).toHaveLength(2);
    });

    it('⚠ y escalonada: cada una sabe qué número de fila es', () => {
        /*
         * El escalonado es lo que lo convierte en una TIRADA de papel en vez de
         * en dos cosas moviéndose a la vez. Sin el índice, el CSS no tiene de
         * dónde sacar el retardo.
         */
        const { container } = pintar([nota('1', 'una'), nota('2', 'otra')]);
        const filas = [...container.querySelectorAll<HTMLElement>('.row-feed')];

        expect(filas[0].style.getPropertyValue('--fila')).toBe('0');
        expect(filas[1].style.getPropertyValue('--fila')).toBe('1');
    });
});

describe('⚠ el papel saliendo', () => {
    it('la fila que ya no está se sigue pintando un rato', () => {
        /*
         * Una fila no puede animar su salida si ya no está: cuando tirás una
         * nota desaparece de los datos en el mismo instante y React la desmonta.
         * Para enseñar que se va hay que seguir pintándola después de que deje
         * de existir.
         */
        const { container, rerender } = pintar([nota('1', 'una'), nota('2', 'otra')]);

        rerender(lateral([nota('1', 'una')]));

        expect(container.querySelectorAll('.row-pull')).toHaveLength(1);
        expect(container.textContent).toContain('otra');
    });

    it('y se suelta cuando termina de irse', () => {
        // Más tiempo del que dura la animación dejaría un hueco fantasma
        // ocupando sitio, y eso se ve como un fallo de maquetado.
        const { container, rerender } = pintar([nota('1', 'una'), nota('2', 'otra')]);

        rerender(lateral([nota('1', 'una')]));

        // ⚠ Dentro de `act`: el temporizador cambia estado, y sin esto React no
        // llega a repintar antes de que el test mire.
        act(() => {
            jest.advanceTimersByTime(400);
        });

        expect(container.querySelectorAll('.row-pull')).toHaveLength(0);
        expect(container.textContent).not.toContain('otra');
    });

    it('⚠ y para un lector de pantalla esa nota YA no existe', () => {
        /*
         * Volver a anunciarla —o dejar algo que pueda enfocarse— sería decirle a
         * quien usa lector que la nota sigue ahí. Lo que se está viendo es el
         * hueco cerrándose, y eso no se lee: se mira.
         */
        const { container, rerender } = pintar([nota('1', 'una'), nota('2', 'otra')]);

        rerender(lateral([nota('1', 'una')]));

        const fantasma = container.querySelector('.row-pull')!;
        expect(fantasma.closest('[aria-hidden="true"]')).not.toBeNull();
        expect(fantasma.tagName).not.toBe('BUTTON');
        expect(fantasma.querySelector('button')).toBeNull();
    });
});
