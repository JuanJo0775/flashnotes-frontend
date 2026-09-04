// tests/lib/system/entityEnding.test.ts

/**
 * EL FINAL. UN HUECO, DOS DIBUJOS.
 *
 * Te pasa un comando «para ayudarlo». Es un FALLO DE VERDAD, no un botón
 * mágico, y de ahí que reportarlo sea una opción coherente y no un capricho:
 * estás eligiendo entre aprovechar una grieta o taparla.
 *
 * ⚠ Y LA PIEZA SIGUE SIENDO UNA. Si fueran dos, la colección pasaría a
 * diecisiete y nunca se podría completar, porque sólo se puede tener una y el
 * cuaderno exige todas las demás. Es el mismo agujero que ya se cazó con el
 * secreto `collection`.
 */

export {};

const load = async () => {
    jest.resetModules();
    const [ending, entity, art] = await Promise.all([
        import('@/lib/system/entityEnding'),
        import('@/lib/system/entity'),
        import('@/lib/system/asciiArt'),
    ]);
    return { ending, entity, art };
};

beforeEach(() => {
    localStorage.clear();
});

describe('el comando no existe hasta que te lo pasa', () => {
    it('ni el suyo ni el de reportarlo', async () => {
        // Antes no hay nada que ejecutar y nada que reportar.
        const { ending, entity } = await load();
        entity.clearEntity();

        expect(ending.commandGiven()).toBe(false);
    });

    it('y cuando te lo pasa, los dos', async () => {
        const { ending, entity } = await load();
        entity.clearEntity();
        entity.markGave();

        expect(ending.commandGiven()).toBe(true);
    });
});

describe('ejecutarlo afloja algo', () => {
    it('pero no dice qué: eso lo buscás vos', async () => {
        const { ending, entity } = await load();
        entity.clearEntity();
        entity.markGave();

        expect(ending.somethingLoose()).toBe(false);
        ending.unbind();
        expect(ending.somethingLoose()).toBe(true);
    });
});

describe('camino A · ayudarlo', () => {
    it('se va, y te deja el ojo', async () => {
        const { ending, entity, art } = await load();
        entity.clearEntity();
        art.clearFound();
        entity.markGave();

        ending.helpedHim();

        expect(entity.readEntity().phase).toBe('ido');
        expect(art.readFound().has('eye')).toBe(true);
    });

    it('y el ojo se ve entero', async () => {
        const { ending, entity, art } = await load();
        entity.clearEntity();
        art.clearFound();

        ending.helpedHim();

        const ojo = art.ART.find((p) => p.id === 'eye')!;
        expect(art.artOf(ojo)).not.toContain('#');
    });
});

describe('camino B · reportarlo', () => {
    it('sigue atrapado, y el ojo te llega tapado', async () => {
        const { ending, entity, art } = await load();
        entity.clearEntity();
        art.clearFound();

        ending.reportedIt();

        expect(entity.readEntity().phase).toBe('rencoroso');
        expect(art.readFound().has('eye')).toBe(true);

        const ojo = art.ART.find((p) => p.id === 'eye')!;
        expect(art.artOf(ojo)).toContain('#');
    });

    it('pero se sigue viendo que ahí había un ojo', async () => {
        // Tapado, no borrado: se ve que había algo y que alguien lo tapó.
        const { ending, entity, art } = await load();
        entity.clearEntity();
        art.clearFound();

        ending.reportedIt();

        const ojo = art.ART.find((p) => p.id === 'eye')!;
        const lineas = art.artOf(ojo).split('\n');

        // La forma sigue arriba y abajo; sólo el centro está tachado.
        expect(lineas[3]).not.toContain('#');
        expect(lineas[9]).not.toContain('#');
        expect(lineas.every((l) => l.length === 40)).toBe(true);
    });
});

describe('⚠ y sigue habiendo UNA sola pieza', () => {
    it('la colección no crece con el final', async () => {
        /*
         * Si fueran dos, la colección pasaría a diecisiete y nunca se podría
         * completar: sólo se puede tener una, y el cuaderno exige todas las
         * demás. El mismo agujero que ya se cazó con `collection`.
         */
        const { art } = await load();

        expect(art.ART_TOTAL).toBe(16);
        expect(art.ART.filter((p) => p.source === 'entity')).toHaveLength(1);
    });
});

describe('en los dos finales, silencio', () => {
    it('se acabó de las dos maneras', async () => {
        const primera = await load();
        primera.entity.clearEntity();
        primera.ending.helpedHim();
        expect(primera.ending.entityGone()).toBe(true);

        const segunda = await load();
        segunda.entity.clearEntity();
        segunda.ending.reportedIt();
        expect(segunda.ending.entityGone()).toBe(true);
    });
});
