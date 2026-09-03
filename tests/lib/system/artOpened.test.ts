// tests/lib/system/artOpened.test.ts

/**
 * TENERLA NO ES SABER QUÉ ES.
 *
 * Una pieza pasa por TRES estados, y cada uno tiene su gesto:
 *
 *   1 · GANADA   — la conseguiste por su camino. No la has visto.
 *   2 · REVELADA — tecleaste `//art`. Ocupa su hueco, pero sin nombre.
 *   3 · ABIERTA  — tecleaste `//art_<n>`. Ahora sabés qué es.
 *
 * El pie no llega hasta el tercero, y ésa es la gracia: en el catálogo ves que
 * tenés la seis, y no sabés qué es la seis hasta abrirla. Sin esto, `//art_<n>`
 * sería sólo una forma de volver a ver algo que el catálogo ya te contó.
 */

import {
    ART,
    awardPiece,
    revealArt,
    readRevealed,
    markOpened,
    readOpened,
    catalogRows,
    clearFound,
} from '@/lib/system/asciiArt';

beforeEach(() => {
    clearFound();
    localStorage.clear();
});

describe('los tres estados', () => {
    it('ganada y sin revelar: no está en la colección', () => {
        // En el CATÁLOGO no se puede comprobar, y no es un descuido: al catálogo
        // sólo se llega tecleando `//art`, y eso revela. El estado «ganada y sin
        // revelar» sólo se ve desde fuera — en la pestaña de la colección.
        awardPiece('moth');
        expect(readRevealed().size).toBe(0);
    });

    it('revelada: ocupa su hueco, pero SIN nombre', () => {
        awardPiece('moth');
        revealArt();

        const fila = catalogRows()[0];

        expect(fila.found).toBe(true);
        expect(fila.opened).toBe(false);
        expect(fila.label).toBe('');
    });

    it('abierta: ahora sí lleva su pie', () => {
        awardPiece('moth');
        revealArt();
        markOpened('moth');

        const fila = catalogRows('es')[0];

        expect(fila.opened).toBe(true);
        expect(fila.label).toBe(ART[0].caption.es);
    });
});

describe('abrir', () => {
    it('sólo cuenta lo que se abrió, no todo lo ganado', () => {
        awardPiece('moth');
        awardPiece('floppy');
        revealArt();
        markOpened('moth');

        expect(readOpened().size).toBe(1);
        expect(readOpened().has('floppy')).toBe(false);
    });

    it('no abre lo que no tenés', () => {
        markOpened('moth');
        expect(readOpened().size).toBe(0);
    });

    it('abrir dos veces no rompe nada', () => {
        awardPiece('moth');
        markOpened('moth');
        markOpened('moth');

        expect(readOpened().size).toBe(1);
    });

    it('aguanta y sobrevive a recargar', () => {
        awardPiece('crt');
        markOpened('crt');

        expect(readOpened().size).toBe(1);
        expect(readOpened().size).toBe(1);
    });

    it('un almacenamiento roto no rompe nada', () => {
        localStorage.setItem('flashnotes:artOpen', 'no soy json');

        expect(readOpened().size).toBe(0);
        expect(() => markOpened('moth')).not.toThrow();
    });

    it('se borra con todo lo demás', () => {
        awardPiece(ART[0].id);
        markOpened(ART[0].id);

        clearFound();

        expect(readOpened().size).toBe(0);
    });
});
