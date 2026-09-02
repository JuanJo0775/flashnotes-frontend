// tests/lib/system/collectibles.test.ts
import {
    clearCollectibles,
    forgetCollectible,
    isCollectible,
    markCollectible,
    readCollectibles,
    splitCollectibles,
} from '@/lib/system/collectibles';

beforeEach(() => {
    localStorage.clear();
    clearCollectibles();
});

const nota = (id: string) => ({ _id: id });

describe('collectibles · qué notas no son notas', () => {
    test('al principio ninguna', () => {
        expect(readCollectibles().size).toBe(0);
    });

    test('marcar una la separa', () => {
        markCollectible('abc');

        expect(isCollectible('abc')).toBe(true);
    });

    test('no arrastra a las demás', () => {
        markCollectible('abc');

        expect(isCollectible('otra')).toBe(false);
    });

    test('marcar dos veces no duplica', () => {
        markCollectible('abc');
        markCollectible('abc');

        expect(readCollectibles().size).toBe(1);
    });

    test('sobrevive a recargar', () => {
        markCollectible('abc');

        expect(readCollectibles().has('abc')).toBe(true);
        expect(readCollectibles().has('abc')).toBe(true);
    });

    test('un almacenamiento roto no rompe nada', () => {
        localStorage.setItem('flashnotes:collectibles', 'no soy json');
        clearCollectibles();

        expect(readCollectibles().size).toBe(0);
        expect(() => markCollectible('abc')).not.toThrow();
    });
});

describe('collectibles · repartir la lista', () => {
    const todas = [nota('a'), nota('b'), nota('c')];

    test('sin ninguna marcada, todas son notas tuyas', () => {
        const { notes, collectibles } = splitCollectibles(todas);

        expect(notes).toHaveLength(3);
        expect(collectibles).toHaveLength(0);
    });

    test('las marcadas salen de tus archivos', () => {
        markCollectible('b');

        const { notes, collectibles } = splitCollectibles(todas);

        expect(notes.map((n) => n._id)).toEqual(['a', 'c']);
        expect(collectibles.map((n) => n._id)).toEqual(['b']);
    });

    test('no se pierde ninguna por el camino', () => {
        // Repartir no es filtrar: la suma tiene que dar lo que había.
        markCollectible('b');

        const { notes, collectibles } = splitCollectibles(todas);

        expect(notes.length + collectibles.length).toBe(todas.length);
    });
});

describe('collectibles · tirarla la devuelve a ser una nota', () => {
    test('olvidarla la saca de la colección', () => {
        // Una vez en la papelera ya no está en la colección; si la restaurás,
        // vuelve como lo que es ahora: una nota.
        markCollectible('abc');

        forgetCollectible('abc');

        expect(isCollectible('abc')).toBe(false);
    });

    test('olvidar una que no estaba no rompe nada', () => {
        expect(() => forgetCollectible('nunca-existió')).not.toThrow();
    });
});
