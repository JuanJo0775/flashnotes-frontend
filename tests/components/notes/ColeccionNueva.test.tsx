// tests/components/notes/ColeccionNueva.test.tsx

/**
 * LA PIEZA RECIÉN DESTAPADA SE DISTINGUE DE LA DE HACE TRES DÍAS.
 *
 * ⚠ EL PROBLEMA NO ERA QUE LA REJILLA ESTUVIERA QUIETA, y por eso la solución no
 * es animarla entera: una pieza recién ganada se veía EXACTAMENTE IGUAL que una
 * vieja, y el trabajo de conseguirla se perdía en una cuadrícula donde todas
 * pesan lo mismo.
 *
 * Con todo moviéndose, lo nuevo deja de distinguirse otra vez — sólo que con más
 * ruido. **Lo que hace que algo destaque no es que se mueva: es que sea lo ÚNICO
 * que se mueve.**
 */

import { render, screen } from '@testing-library/react';
import CollectionView from '@/components/notes/CollectionView';
import { ART, awardPiece, clearFound, revealArt } from '@/lib/system/asciiArt';

beforeEach(() => {
    localStorage.clear();
    clearFound();
});

describe('lo que acaba de destaparse', () => {
    it('⚠ se marca, y lo que ya estaba NO', () => {
        // Primero una, revelada y ya vista. Después otra, recién destapada.
        awardPiece(ART[0].id);
        revealArt();

        awardPiece(ART[1].id);
        revealArt();

        render(<CollectionView />);

        const nuevas = screen.getAllByTestId('collection-new');
        expect(nuevas).toHaveLength(1);
    });

    it('y lleva su turno, para que las varias lleguen una detrás de otra', () => {
        /*
         * ⚠ EL ÍNDICE ES ENTRE LAS NUEVAS, no en la rejilla: si fuera el de la
         * cuadrícula, una pieza nueva en la casilla catorce esperaría a que
         * pasaran catorce turnos que nadie está mirando.
         */
        awardPiece(ART[6].id);
        awardPiece(ART[9].id);
        revealArt();

        render(<CollectionView />);

        const turnos = screen
            .getAllByTestId('collection-new')
            .map((el) => el.style.getPropertyValue('--pieza'));

        expect(turnos).toEqual(['0', '1']);
    });

    it('⚠ y a la segunda visita ya no hay nada nuevo', () => {
        /*
         * «Recién revelada» es una cosa de ESTE momento. Si sobreviviera, una
         * pieza seguiría pareciendo nueva tres días después — que es justo lo
         * contrario de lo que la palabra significa.
         *
         * Vive en memoria por eso: no es un dato del jugador, es de la pantalla.
         */
        awardPiece(ART[0].id);
        revealArt();

        const { unmount } = render(<CollectionView />);
        expect(screen.getAllByTestId('collection-new')).toHaveLength(1);
        unmount();

        // Volver a mirar la colección no destapa nada: no hubo `//art`.
        render(<CollectionView />);

        expect(screen.queryAllByTestId('collection-new')).toHaveLength(0);
    });

    it('sin nada ganado no marca nada', () => {
        revealArt();
        render(<CollectionView />);

        expect(screen.queryAllByTestId('collection-new')).toHaveLength(0);
    });
});
