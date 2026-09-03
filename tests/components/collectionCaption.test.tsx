// tests/components/collectionCaption.test.tsx

/**
 * EL PIE SÓLO LLEGA AL ABRIR LA PIEZA, TAMBIÉN EN LA COLECCIÓN.
 *
 * ⚠ EL FALLO QUE ESTO ARREGLA. La lista de `//art` respetaba los tres estados
 * —ganada, revelada, abierta— y la pestaña de colección no: enseñaba el pie de
 * TODO lo revelado. Con eso, un solo `//art` te decía qué era cada pieza y
 * `//art_<n>` se quedaba sin nada que dar, que es exactamente el sistema que el
 * tercer estado existe para sostener.
 *
 * Es el mismo desajuste que ya se cazó con el DIBUJO —la colección lo pintaba
 * entero mientras el catálogo lo tapaba— y por eso la decisión vive ahora en un
 * solo sitio, `captionOf`, igual que `artOf`. Dos sitios que deciden lo mismo
 * dejan de decir lo mismo (REGLAS · B5).
 */

import { render, screen } from '@testing-library/react';
import CollectionView from '@/components/notes/CollectionView';
import { awardPiece, clearFound, revealArt, markOpened } from '@/lib/system/asciiArt';
import { setLang } from '@/i18n';

const pintar = () => render(<CollectionView />);

beforeEach(() => {
    localStorage.clear();
    clearFound();
    setLang('es');
});

describe('revelada pero sin abrir', () => {
    it('NO enseña el pie', () => {
        awardPiece('moth');
        revealArt();
        pintar();

        expect(screen.queryByText(/POLILLA/)).toBeNull();
    });

    it('dice que está sin abrir, que es otra cosa que no tener nombre', () => {
        awardPiece('moth');
        revealArt();
        pintar();

        expect(screen.getByText('[ SIN ABRIR ]')).toBeInTheDocument();
    });

    it('pero el dibujo SÍ se ve: es lo que hace que sea una colección', () => {
        awardPiece('moth');
        revealArt();
        const { container } = pintar();

        expect(container.querySelector('.collection-art')).not.toBeNull();
    });
});

describe('abierta con //art_<n>', () => {
    it('ahora sí enseña el pie', () => {
        awardPiece('moth');
        revealArt();
        markOpened('moth');
        pintar();

        expect(screen.getByText(/POLILLA/)).toBeInTheDocument();
    });
});

describe('abierta pero con el nombre por ganar', () => {
    it('sigue sin identificar: abrirla no es haberla entendido', () => {
        // El manipulador se gana viendo el morse; su nombre, usando el código
        // para entrar en la v0.2 y para salir.
        awardPiece('telegraph');
        revealArt();
        markOpened('telegraph');
        pintar();

        expect(screen.getByText('[ SIN IDENTIFICAR ]')).toBeInTheDocument();
        expect(screen.queryByText(/MANIPULADOR/)).toBeNull();
    });
});

describe('y los dos rótulos hablan tu idioma', () => {
    it('en inglés no se cuela una palabra en español', () => {
        setLang('en');
        awardPiece('moth');
        revealArt();
        pintar();

        expect(screen.getByText('[ UNOPENED ]')).toBeInTheDocument();
        expect(screen.queryByText(/SIN ABRIR/)).toBeNull();
    });
});
