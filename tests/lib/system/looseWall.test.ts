// tests/lib/system/looseWall.test.ts

/**
 * LA PARED QUE SE SAFA.
 *
 * Clic tras clic, como golpes y no como clics de interfaz. Cada uno la deja
 * peor, y eso se ve. ⚠ NADIE TE DICE CUÁNTOS FALTAN.
 */

import {
    HITS_TO_FALL,
    clearWall,
    hitWall,
    wallDown,
    wallHits,
    wallLean,
} from '@/lib/system/looseWall';

beforeEach(() => {
    clearWall();
});

describe('al principio está entera', () => {
    it('sin golpes y en pie', () => {
        expect(wallHits()).toBe(0);
        expect(wallDown()).toBe(false);
        expect(wallLean()).toBe(0);
    });
});

describe('los golpes', () => {
    it('suman de uno en uno y devuelven el total', () => {
        expect(hitWall()).toBe(1);
        expect(hitWall()).toBe(2);
        expect(wallHits()).toBe(2);
    });

    it('y a los suficientes, se cae', () => {
        for (let i = 0; i < HITS_TO_FALL - 1; i += 1) {
            hitWall();
            expect(wallDown()).toBe(false);
        }

        hitWall();
        expect(wallDown()).toBe(true);
    });
});

describe('⚠ cada golpe TIENE que verse', () => {
    it('la inclinación crece con todos, no a saltos', () => {
        /*
         * Si fueran tres estados fijos, los golpes de en medio no harían nada
         * visible y parecería que el cuadro aguanta a ratos — y entonces se
         * deja de pegar. Que sea una proporción es lo que hace el movimiento
         * continuo.
         */
        let anterior = wallLean();

        for (let i = 1; i <= HITS_TO_FALL; i += 1) {
            hitWall();
            const ahora = wallLean();
            expect(ahora).toBeGreaterThan(anterior);
            anterior = ahora;
        }
    });

    it('y llega a uno justo cuando cae, ni antes ni después', () => {
        for (let i = 0; i < HITS_TO_FALL; i += 1) hitWall();

        expect(wallLean()).toBe(1);
        expect(wallDown()).toBe(true);
    });

    it('seguir pegándole a algo caído no la inclina más', () => {
        for (let i = 0; i < HITS_TO_FALL + 5; i += 1) hitWall();

        expect(wallLean()).toBe(1);
    });
});

describe('⚠ los golpes no sobreviven a recargar', () => {
    it('no quedan escritos en ningún lado', () => {
        /*
         * Si sobrevivieran, alguien podría dejar el cuadro a un golpe de
         * caerse, cerrar la pestaña, y encontrárselo caído al volver sin haber
         * tocado nada. Lo que se derrumba tiene que derrumbarse MIENTRAS MIRÁS.
         */
        hitWall();
        hitWall();

        expect(localStorage.length).toBe(0);
    });
});

describe('el reinicio la deja como estaba', () => {
    it('entera otra vez', () => {
        for (let i = 0; i < HITS_TO_FALL; i += 1) hitWall();

        clearWall();

        expect(wallDown()).toBe(false);
        expect(wallHits()).toBe(0);
    });
});
