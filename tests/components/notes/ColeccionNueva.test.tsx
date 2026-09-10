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
import {
    ART,
    awardPiece,
    clearFound,
    markOpened,
    revealArt,
} from '@/lib/system/asciiArt';

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

describe('⚠ el indicio de que ya es tuya', () => {
    /*
     * SE PIDIÓ JUGANDO, y venía de una confusión razonable: «si ganaste la 2/16
     * no te sale sólo 2/16, sino algo como que hay arte en camino».
     *
     * Ganar no revela —eso sigue pidiendo `//art`, que es lo que hace que el
     * comando sirva para algo— pero la casilla puede decir que ahí hay algo TUYO
     * sin enseñar qué es. La diferencia entre «no tengo la 2» y «tengo la 2 y no
     * la miré» es información que ya te ganaste, y esconderla dejaba el premio
     * detrás de un comando que no sabías que había que teclear.
     */
    it('una casilla ganada y sin revelar lo dice', () => {
        awardPiece(ART[1].id);

        render(<CollectionView />);

        expect(screen.getAllByTestId('collection-waiting')).toHaveLength(1);
    });

    it('⚠ pero NO enseña cuál es: sigue haciendo falta `//art`', () => {
        // Si brotara sola, el comando no serviría para nada — sabrías lo que
        // tenés sin preguntar.
        awardPiece(ART[1].id);

        render(<CollectionView />);

        expect(screen.queryAllByTestId('collection-new')).toHaveLength(0);
        expect(screen.getByTestId('collection-count').textContent).toBe('0/16');
    });

    it('y en cuanto la revelás, el indicio se va', () => {
        awardPiece(ART[1].id);
        revealArt();

        render(<CollectionView />);

        expect(screen.queryAllByTestId('collection-waiting')).toHaveLength(0);
    });

    it('lo que no tenés no dice nada', () => {
        render(<CollectionView />);

        expect(screen.queryAllByTestId('collection-waiting')).toHaveLength(0);
    });
});

describe('⚠ la estrella de haberlas ABIERTO todas', () => {
    /*
     * Abrirlas todas no es tenerlas todas: ganar una pieza es tropezarse con
     * ella, revelarla es ir a mirar, y abrirla con `//art_<n>` es lo único que
     * hay que hacer UNA POR UNA — quien las abrió todas es el único que sabe
     * cómo se llaman las dieciséis.
     */
    it('con todas ganadas y reveladas todavía NO sale', () => {
        for (const pieza of ART) awardPiece(pieza.id);
        revealArt();

        render(<CollectionView />);

        expect(screen.queryByTestId('collection-all-open')).toBeNull();
    });

    it('⚠ y sale cuando se abre la última', () => {
        for (const pieza of ART) awardPiece(pieza.id);
        revealArt();
        for (const pieza of ART) markOpened(pieza.id);

        render(<CollectionView />);

        expect(screen.getByTestId('collection-all-open')).toBeInTheDocument();
    });

    it('con una sin abrir, no', () => {
        for (const pieza of ART) awardPiece(pieza.id);
        revealArt();
        for (const pieza of ART.slice(0, -1)) markOpened(pieza.id);

        render(<CollectionView />);

        expect(screen.queryByTestId('collection-all-open')).toBeNull();
    });

    it('⚠ y abrir la última DEVUELVE que era la última', () => {
        /*
         * El aviso del secreto no puede vivir en `asciiArt` —ese módulo no
         * importa de `hooks`—, así que lo dice devolviéndolo y el comando lo
         * convierte en `secretId`. Acá se fija el contrato.
         */
        for (const pieza of ART) awardPiece(pieza.id);

        const ultima = ART[ART.length - 1];
        for (const pieza of ART.slice(0, -1)) expect(markOpened(pieza.id)).toBe(false);

        expect(markOpened(ultima.id)).toBe(true);
        // Y no dos veces: abrir lo ya abierto no vuelve a premiar.
        expect(markOpened(ultima.id)).toBe(false);
    });
});
