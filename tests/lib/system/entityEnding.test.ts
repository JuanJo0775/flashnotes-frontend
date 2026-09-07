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

        /*
         * ⚠ SE COMPARA CONTRA EL DIBUJO, NO CONTRA UN CARÁCTER. Esto miraba que
         * no hubiera almohadillas, que era la marca del tachón de entonces. La
         * marca cambió a una equis — y la equis YA EXISTE en la rampa de tonos
         * del propio dibujo, así que buscar el carácter dejó de distinguir
         * nada. Lo que importa es cuál de las dos caras te tocó.
         */
        const ojo = art.ART.find((p) => p.id === 'eye')!;
        expect(art.artOf(ojo)).toBe(ojo.art);
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
        expect(art.artOf(ojo)).not.toBe(ojo.art);
    });

    it('pero se sigue viendo que ahí había un ojo', async () => {
        const { ending, entity, art } = await load();
        entity.clearEntity();
        art.clearFound();

        ending.reportedIt();

        const ojo = art.ART.find((p) => p.id === 'eye')!;
        const tachado = art.artOf(ojo);

        /*
         * ⚠ TACHADO NO ES BORRADO, y eso es lo único que hay que probar acá.
         *
         * Sin números de fila escritos a mano ni carácter concreto: los dos se
         * quedaron viejos en cuanto el dibujo se rehizo — uno señalaba una fila
         * que acabó bajo el aspa, y el otro buscaba una almohadilla que ya no
         * existe. Lo que importa es que la equis ANULA sin borrar: debajo sigue
         * estando el mismo dibujo y se reconoce.
         */
        const limpio = [...ojo.art];
        const marcado = [...tachado];

        expect(marcado).toHaveLength(limpio.length);

        const iguales = marcado.filter((ch, i) => ch === limpio[i]).length;

        expect(iguales / limpio.length).toBeGreaterThan(0.6);
        expect(iguales / limpio.length).toBeLessThan(1);

        // Y el campo sigue entero: cuarenta columnas en todas.
        expect(tachado.split('\n').every((l) => l.length === 40)).toBe(true);
    });
});

describe('⚠ y el ojo tapado tampoco se llama igual', () => {
    /*
     * La pieza es una y el hueco es uno, pero el final decide sus DOS caras: el
     * dibujo y el nombre. Con el pie fijo, el ojo censurado salía rotulado «te
     * estoy viendo» — justo la frase que ese final acaba de tachar.
     *
     * Y cambia la voz: el pie de siempre lo dice ÉL, de tú. Reportado, él calla
     * para siempre y quien rotula es la máquina, que trata de usted.
     */

    it('ayudarlo deja el pie de siempre, que lo dice él', async () => {
        const { ending, entity, art } = await load();
        entity.clearEntity();
        art.clearFound();

        ending.helpedHim();
        art.markOpened('eye');

        const ojo = art.ART.find((p) => p.id === 'eye')!;
        expect(art.captionOf(ojo, 'es')).toBe(ojo.caption.es);
    });

    it('y reportarlo lo rotula otro, y de usted', async () => {
        const { ending, entity, art } = await load();
        entity.clearEntity();
        art.clearFound();

        ending.reportedIt();
        art.markOpened('eye');

        const ojo = art.ART.find((p) => p.id === 'eye')!;
        const pie = art.captionOf(ojo, 'es');

        expect(pie).not.toBe(ojo.caption.es);
        expect(pie).toContain('USTED');
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

describe('⚠ LA CICATRIZ', () => {
    /*
     * Después del reinicio la pared está de vuelta como si no hubiera pasado
     * nada — pero esa zona tiembla de vez en cuando. Nadie te lo cuenta y no se
     * puede volver a tirar. Sólo vos sabés por qué pasa.
     */

    it('la deja el final en que se fue', async () => {
        const { ending, entity } = await load();
        entity.clearEntity();
        entity.markGave();
        ending.unbind();

        ending.helpedHim();

        expect(ending.hasScar()).toBe(true);
    });

    it('pero reportarlo no deja marca: ese fallo se arregló de verdad', async () => {
        // Y es lo que hace ese final más limpio, y más frío.
        const { ending, entity } = await load();
        entity.clearEntity();
        entity.markGave();

        ending.reportedIt();

        expect(ending.hasScar()).toBe(false);
    });

    it('y no se puede volver a tirar, de ninguna de las dos maneras', async () => {
        // Que no se pueda es parte de que la decisión pese: se elige una vez.
        for (const acabar of ['helpedHim', 'reportedIt'] as const) {
            localStorage.clear();
            const { ending, entity } = await load();
            entity.clearEntity();
            entity.markGave();
            ending.unbind();
            expect(ending.somethingLoose()).toBe(true);

            ending[acabar]();

            expect(ending.somethingLoose()).toBe(false);
        }
    });
});
