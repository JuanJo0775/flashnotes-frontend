// tests/lib/system/artReveal.test.ts

/**
 * GANARLA Y VERLA SON DOS COSAS.
 *
 * Una pieza ganada no aparece sola en la colección: hay que haber tecleado
 * `//art` para que se revele. Y eso no es un trámite de más — es lo que convierte
 * el catálogo en algo que se CONSULTA.
 *
 * Si la pieza brotara sola en la pestaña, `//art` no serviría para nada: sabrías
 * lo que tenés sin preguntar. Con la revelación, el comando es la forma de
 * revisar el inventario, y encontrar una pieza deja una pregunta abierta —«¿cuál
 * me habrá tocado?»— hasta que vas a mirar.
 */

import {
    ART,
    awardPiece,
    revealArt,
    readRevealed,
    readFound,
    clearFound,
} from '@/lib/system/asciiArt';

beforeEach(() => {
    clearFound();
    localStorage.clear();
});

describe('ganada pero sin revelar', () => {
    it('cuenta como ganada', () => {
        awardPiece('moth');
        expect(readFound().has('moth')).toBe(true);
    });

    it('pero NO está en la colección', () => {
        awardPiece('moth');
        expect(readRevealed().size).toBe(0);
    });
});

describe('revelar', () => {
    it('pasa a la colección lo que tengas ganado', () => {
        awardPiece('moth');
        revealArt();

        expect(readRevealed().has('moth')).toBe(true);
    });

    it('revela TODO lo ganado de una vez, no de a una', () => {
        // Consultar el inventario enseña el inventario. Ir revelando una por
        // consulta sería un trámite, y el trámite no es la gracia.
        awardPiece('moth');
        awardPiece('floppy');
        revealArt();

        expect(readRevealed().size).toBe(2);
    });

    it('no revela lo que no tenés', () => {
        awardPiece('moth');
        revealArt();

        expect(readRevealed().has('floppy')).toBe(false);
    });

    it('lo ganado DESPUÉS necesita otra consulta', () => {
        awardPiece('moth');
        revealArt();

        awardPiece('floppy');
        expect(readRevealed().has('floppy')).toBe(false);

        revealArt();
        expect(readRevealed().has('floppy')).toBe(true);
    });

    it('sin nada ganado, no revela nada', () => {
        revealArt();
        expect(readRevealed().size).toBe(0);
    });
});

describe('lo revelado aguanta', () => {
    it('sobrevive a recargar', () => {
        awardPiece('crt');
        revealArt();

        expect(readRevealed().size).toBe(1);
        expect(readRevealed().size).toBe(1);
    });

    it('un almacenamiento roto no rompe nada', () => {
        localStorage.setItem('flashnotes:artSeen', 'no soy json');

        expect(readRevealed().size).toBe(0);
        expect(() => revealArt()).not.toThrow();
    });

    it('un identificador que ya no existe se ignora', () => {
        localStorage.setItem(
            'flashnotes:artSeen',
            JSON.stringify(['pieza-borrada'])
        );

        expect(readRevealed().size).toBe(0);
    });

    it('se borra con todo lo demás', () => {
        awardPiece(ART[0].id);
        revealArt();

        clearFound();

        expect(readRevealed().size).toBe(0);
    });
});
