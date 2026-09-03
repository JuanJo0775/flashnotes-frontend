// tests/lib/system/artScrap.test.ts

/**
 * EL RESTO QUE APARECE EN LA PAPELERA.
 *
 * Es el camino que arregla el agujero grande de la colección: ganar una pieza
 * dejaba un premio en la mano y ninguna indicación de dónde mirarlo. El aviso no
 * dice el nombre —a propósito— y `//art` sólo salía por la fuga de `//help`, que
 * es azar puro: se podían juntar cinco piezas sin saber que había una colección.
 */

import {
    SCRAP_ID,
    buildScrapNote,
    scrapPiece,
    shouldScrap,
} from '@/lib/system/artScrap';
import { COMMAND_SHARDS } from '@/lib/system/artCorruption';
import { ART, awardPiece, clearFound, revealArt } from '@/lib/system/asciiArt';

beforeEach(() => {
    localStorage.clear();
    clearFound();
});

describe('cuándo aparece', () => {
    it('sin ninguna pieza, no hay nada que archivar', () => {
        expect(shouldScrap()).toBe(false);
        expect(buildScrapNote('es')).toBeNull();
    });

    it('con una pieza ganada, sí', () => {
        awardPiece('moth');
        expect(shouldScrap()).toBe(true);
    });

    it('y se va en cuanto mirás el catálogo', () => {
        // Es una pista, no un mueble: quedarse después de haber servido lo
        // convertiría en basura de verdad.
        awardPiece('moth');
        revealArt();

        expect(shouldScrap()).toBe(false);
    });
});

describe('qué enseña', () => {
    it('siempre la MISMA pieza, la primera del catálogo que tengas', () => {
        // Si rotara, volver a la papelera enseñaría otro dibujo y se leería que
        // hay varios restos, cuando hay uno solo mal archivado.
        awardPiece('crt');
        awardPiece('moth');

        expect(scrapPiece()?.id).toBe('moth');
        expect(buildScrapNote('es')).toEqual(buildScrapNote('es'));
    });

    it('el dibujo va roto, no entero', () => {
        awardPiece('moth');
        const polilla = ART.find((p) => p.id === 'moth')!;

        expect(buildScrapNote('es')!.content).not.toContain(polilla.art);
    });

    it('y lleva los trozos del comando entre la basura', () => {
        awardPiece('moth');
        const cuerpo = buildScrapNote('es')!.content.replace(/\n/g, '');

        let desde = 0;
        for (const trozo of COMMAND_SHARDS) {
            const i = cuerpo.indexOf(trozo, desde);
            expect(i).toBeGreaterThanOrEqual(0);
            desde = i + trozo.length;
        }
    });

    it('pero NUNCA el comando entero y seguido', () => {
        awardPiece('moth');
        expect(buildScrapNote('es')!.content).not.toContain('//art');
    });
});

describe('la nota', () => {
    it('nace en la papelera y con su identificador propio', () => {
        // Nunca existe en la base de datos: se inyecta del lado del cliente,
        // igual que el archivo fantasma.
        awardPiece('moth');
        const nota = buildScrapNote('es')!;

        expect(nota._id).toBe(SCRAP_ID);
        expect(nota.isDeleted).toBe(true);
        expect(nota.versions).toEqual([]);
    });

    it('habla en el idioma en que la estás leyendo', () => {
        awardPiece('moth');

        expect(buildScrapNote('es')!.content).toContain('RECUPERADO');
        expect(buildScrapNote('en')!.content).toContain('RECOVERED');
    });
});
