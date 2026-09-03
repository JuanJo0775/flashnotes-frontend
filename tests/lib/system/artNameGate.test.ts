// tests/lib/system/artNameGate.test.ts

/**
 * HAY PIEZAS QUE SE GANAN ANTES DE SABER QUÉ SON.
 *
 * El manipulador se gana al VER el morse del reloj — no al descifrarlo. En ese
 * momento la pieza ya es tuya y el dibujo se puede sacar, pero su nombre sigue
 * revuelto.
 *
 * Y ésa es toda la gracia: el DIBUJO ES LA PISTA. Ves un manipulador de
 * telégrafo y entendés de golpe qué clase de cosa era eso que parpadea en la
 * hora. Si el nombre viniera con la pieza, la pista llegaría ya resuelta y el
 * dibujo no serviría para nada.
 *
 * El nombre llega cuando usás el código para las dos cosas: ENTRAR en la v0.2 y
 * SALIR de ella. Ahí es cuando de verdad sabés qué era el aparato.
 *
 * ⚠ ES UN CUARTO ESTADO, Y SÓLO LO TIENE QUIEN LO DECLARA. Las otras quince
 * siguen con los tres de siempre —ganada, revelada, abierta— porque en ellas el
 * dibujo es el premio y no un acertijo. Una puerta extra en todas convertiría la
 * colección en dos colecciones.
 */

export {};

const load = async () => {
    jest.resetModules();
    const [art, v02] = await Promise.all([
        import('@/lib/system/asciiArt'),
        import('@/lib/system/v02'),
    ]);
    return { art, v02 };
};

beforeEach(() => {
    localStorage.clear();
});

describe('el manipulador, antes del viaje', () => {
    it('se gana y se puede abrir, pero su nombre NO se lee', async () => {
        const { art, v02 } = await load();
        v02.forgetV02Trip();
        art.awardPiece('telegraph');
        art.markOpened('telegraph');

        const fila = art.catalogRows('es')[art.ART.findIndex((p) => p.id === 'telegraph')];

        expect(fila.found).toBe(true);
        expect(fila.opened).toBe(true);
        expect(fila.named).toBe(false);
        expect(fila.label).toBe('');
    });

    it('y de la fila viaja el LARGO, que ya es una pista', async () => {
        // Lo mismo que con las que no tenés: lo que no se ha ganado no se puede
        // leer en el inspector, y el largo no lo regala.
        const { art, v02 } = await load();
        v02.forgetV02Trip();
        art.awardPiece('telegraph');
        art.markOpened('telegraph');

        const fila = art.catalogRows('es')[art.ART.findIndex((p) => p.id === 'telegraph')];

        expect(fila.length).toBeGreaterThan(0);
    });

    it('tampoco se cuela al guardarla con //keep', async () => {
        // `//keep` escribe una nota con el dibujo y su pie. Si el pie llevara el
        // nombre, la nota sería la respuesta escrita a mano.
        const { art, v02 } = await load();
        v02.forgetV02Trip();
        const pieza = art.ART.find((p) => p.id === 'telegraph')!;

        expect(art.asNote(pieza, 'es')).not.toContain(pieza.caption.es);
        expect(art.noteTitle(pieza, 'es')).not.toContain('MANIPULADOR');
    });
});

describe('el manipulador, después de entrar y salir', () => {
    it('ahí sí se lee su nombre', async () => {
        const { art, v02 } = await load();
        art.awardPiece('telegraph');
        art.markOpened('telegraph');

        v02.markV02RoundTrip();

        const fila = art.catalogRows('es')[art.ART.findIndex((p) => p.id === 'telegraph')];

        expect(fila.named).toBe(true);
        expect(fila.label).toBe(art.ART.find((p) => p.id === 'telegraph')!.caption.es);
    });

    it('y el viaje sobrevive a recargar', async () => {
        // Vive en `localStorage` como el bloqueo y la v0.2: un logro que se cae
        // al refrescar no es un logro.
        const { v02 } = await load();
        v02.markV02RoundTrip();

        const otra = await load();
        expect(otra.v02.didV02RoundTrip()).toBe(true);
    });
});

describe('las demás piezas no tienen esa puerta', () => {
    it('con abrirla basta para saber qué es', async () => {
        const { art, v02 } = await load();
        v02.forgetV02Trip();
        art.awardPiece('moth');
        art.markOpened('moth');

        const fila = art.catalogRows('es')[0];

        expect(fila.named).toBe(true);
        expect(fila.label).toBe(art.ART[0].caption.es);
    });

    it('y sólo una la declara: no es una regla general disfrazada', async () => {
        const { art } = await load();
        const conPuerta = art.ART.filter((p) => p.nameNeeds !== undefined);

        expect(conPuerta.map((p) => p.id)).toEqual(['telegraph']);
    });
});
