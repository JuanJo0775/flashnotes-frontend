// tests/lib/system/artHints.test.ts

/**
 * LAS TRES PISTAS QUE LLEVAN A `//art`.
 *
 * Ganar una pieza dejaba un premio en la mano y ninguna indicación de dónde
 * mirarlo. Ahora hay tres empujones de intensidad creciente —el parpadeo de la
 * pestaña, el resto en la papelera, y la barra presumiendo— y ninguno dice
 * «tecleá esto».
 *
 * ⚠ LO QUE MÁS IMPORTA ES QUE SE APAGUEN. Una pista que sigue insistiendo
 * después de haber servido deja de ser una pista y pasa a ser un pesado, y en
 * una app cuyo tono es una máquina cansada eso además desafina.
 */

import {
    BRAG,
    BRAG_MS,
    GLIMPSE_MS,
    clearHints,
    hintEarned,
    isBragging,
    isGlimpsing,
    subscribeHints,
} from '@/lib/system/artHints';
import { awardPiece, clearFound, revealArt } from '@/lib/system/asciiArt';

const T0 = 1_000_000;

beforeEach(() => {
    localStorage.clear();
    clearFound();
    clearHints();
});

describe('el parpadeo de la pestaña', () => {
    it('se enciende al ganar y se apaga solo', () => {
        awardPiece('moth');
        hintEarned(T0);

        expect(isGlimpsing(T0)).toBe(true);
        expect(isGlimpsing(T0 + GLIMPSE_MS - 1)).toBe(true);
        expect(isGlimpsing(T0 + GLIMPSE_MS)).toBe(false);
    });

    it('dura MENOS que el alarde: es el primer empujón, no el último', () => {
        expect(GLIMPSE_MS).toBeLessThan(BRAG_MS);
    });
});

describe('la barra presumiendo', () => {
    it('se enciende al ganar y vuelve sola', () => {
        awardPiece('moth');
        hintEarned(T0);

        expect(isBragging(T0)).toBe(true);
        expect(isBragging(T0 + BRAG_MS)).toBe(false);
    });

    it('no menciona el comando', () => {
        // Dice que hay algo que le gusta, no dónde mirarlo. Es la voz naíf del
        // `LINDO` del panel: la máquina no sabe qué son, sólo que son bonitos.
        for (const texto of Object.values(BRAG)) {
            expect(texto).not.toContain('//');
        }
    });

    it('y no es la misma frase en los dos idiomas', () => {
        expect(BRAG.es).not.toBe(BRAG.en);
    });
});

describe('se apagan cuando ya no hacen falta', () => {
    it('mirar el catálogo las calla todas', () => {
        awardPiece('moth');
        hintEarned(T0);

        revealArt();

        expect(isGlimpsing(T0)).toBe(false);
        expect(isBragging(T0)).toBe(false);
    });

    it('y ganar otra pieza después ya no enciende nada', () => {
        // Ésta es la que de verdad importa: la regla vive en `awardPiece`, así
        // que hay que probarla POR AHÍ y no llamando a `hintEarned` a mano.
        awardPiece('moth');
        revealArt();

        awardPiece('crt');

        expect(isGlimpsing()).toBe(false);
        expect(isBragging()).toBe(false);
    });

    it('pero ganar la primera SÍ las enciende, sin llamar a nadie', () => {
        awardPiece('moth');

        expect(isGlimpsing()).toBe(true);
        expect(isBragging()).toBe(true);
    });
});

describe('quien mira, se entera', () => {
    it('avisa a los suscritos al encenderse', () => {
        let avisos = 0;
        const cortar = subscribeHints(() => {
            avisos += 1;
        });

        // Ganar la pieza ya enciende las pistas por su cuenta: ése es UN aviso.
        awardPiece('moth');
        expect(avisos).toBe(1);

        cortar();
        hintEarned(T0);
        expect(avisos).toBe(1);
    });

    it('y también al apagarse: la pestaña tiene que enterarse de que vuelve', () => {
        awardPiece('moth');

        let avisos = 0;
        subscribeHints(() => {
            avisos += 1;
        });

        revealArt();

        expect(avisos).toBe(1);
    });
});
