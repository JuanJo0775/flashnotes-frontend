// tests/components/artTab.test.tsx

/**
 * LA PESTAÑA ASOMA, PERO NO DEJA ENTRAR.
 *
 * Es la primera de las tres pistas que llevan a `//art`. Al ganar una pieza la
 * pestaña de colección aparece con el nombre REVUELTO y ahí se queda hasta que
 * teclees `//art`.
 *
 * ⚠ SE QUEDA. La primera versión la enseñaba 1,2 segundos y la escondía, y eso
 * no era una pista: era un parpadeo que se perdía si mirabas a otro lado. Una
 * pista que hay que ver en el instante justo no es una pista, es un examen de
 * reflejos.
 *
 * Y NO DEJA ENTRAR: pulsarla y que no pasara nada sería un botón roto.
 * Deshabilitada se lee como lo que es — algo que todavía no está disponible.
 */

import { render, screen } from '@testing-library/react';
import Header from '@/components/layout/Header';
import { awardPiece, clearFound, revealArt } from '@/lib/system/asciiArt';
import { clearHints } from '@/lib/system/artHints';

const pintar = (props: Partial<Parameters<typeof Header>[0]> = {}) =>
    render(
        <Header
            currentView="notes"
            onViewChange={() => {}}
            collectionCount={0}
            {...props}
        />
    );

beforeEach(() => {
    localStorage.clear();
    clearFound();
    clearHints();
});

describe('sin piezas', () => {
    it('la pestaña NO existe', () => {
        // Enseñarla vacía anunciaría que hay una colección que llenar, y
        // encontrar la primera pieza es parte de lo que se descubre.
        pintar();

        expect(screen.queryByText(/COLECCI/i)).toBeNull();
        expect(screen.queryByTestId('scramble')).toBeNull();
    });
});

describe('con una pieza ganada y sin mirar el catálogo', () => {
    it('la pestaña asoma, revuelta', () => {
        awardPiece('moth');
        pintar();

        expect(screen.getByTestId('scramble')).toBeInTheDocument();
    });

    it('y NO deja entrar', () => {
        awardPiece('moth');
        pintar();

        const boton = screen.getByTestId('scramble').closest('button')!;
        expect(boton).toBeDisabled();
    });

    it('el nombre no se lee: si se leyera sería un cartel', () => {
        awardPiece('moth');
        pintar();

        expect(screen.queryByText(/COLECCI/i)).toBeNull();
    });
});

describe('después de teclear //art', () => {
    it('la pestaña se estabiliza y deja entrar', () => {
        awardPiece('moth');
        revealArt();

        pintar({ collectionCount: 1 });

        expect(screen.queryByTestId('scramble')).toBeNull();
        const boton = screen.getByRole('button', { name: /COLECCI/i });
        expect(boton).toBeEnabled();
    });
});
