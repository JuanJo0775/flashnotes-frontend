// tests/lib/system/v02NotesTrash.test.ts

/**
 * LA PAPELERA DE LA v0.2, QUE ES SUYA Y FUNCIONA A MEDIAS.
 *
 * Existe, tira notas y las devuelve — pero no siempre. A veces tirar una nota
 * no hace nada, y a veces la que vuelve viene corrompida.
 *
 * Y sobre todo: **es SU papelera**. Hasta ahora la v0.2 enseñaba la papelera de
 * verdad, con notas de verdad dentro. Eso rompía lo único que sostiene la pieza
 * —que son dos versiones distintas con archivos distintos— y encima ponía notas
 * reales al alcance de una interfaz que presume de fallar.
 */

import {
    createV02Note,
    saveV02Note,
    readV02Notes,
    trashV02Note,
    readV02Trashed,
    restoreV02Note,
    purgeV02Note,
    clearV02Notes,
} from '@/lib/system/v02Notes';

beforeEach(() => {
    clearV02Notes();
    localStorage.clear();
});

/** Un dado fijo, para que «a veces» sea «siempre» o «nunca» mientras se prueba. */
const SIEMPRE = () => 0;
const NUNCA = () => 0.99;

describe('tirar a la papelera', () => {
    it('la saca de la lista y la deja en la papelera', () => {
        const nota = createV02Note('apuntes');

        expect(trashV02Note(nota._id, NUNCA)).toBe(true);

        expect(readV02Notes()).toHaveLength(0);
        expect(readV02Trashed().map((n) => n.title)).toEqual(['apuntes']);
    });

    it('a veces no hace NADA, y la nota se queda donde estaba', () => {
        const nota = createV02Note('apuntes');

        expect(trashV02Note(nota._id, SIEMPRE)).toBe(false);

        // Ésta es la mitad importante: falla hacia NO borrar. Una versión vieja
        // que se traga una nota no es un efecto, es una pérdida de trabajo.
        expect(readV02Notes().map((n) => n.title)).toEqual(['apuntes']);
        expect(readV02Trashed()).toHaveLength(0);
    });

    it('nunca hace desaparecer una nota de los dos sitios a la vez', () => {
        const nota = createV02Note('apuntes');

        for (let i = 0; i < 40; i += 1) {
            trashV02Note(nota._id);

            const viva = readV02Notes().some((n) => n._id === nota._id);
            const tirada = readV02Trashed().some((n) => n._id === nota._id);

            // LA INVARIANTE. Da igual cómo caiga el dado: la nota está en un
            // sitio o en el otro, siempre en uno.
            expect(viva || tirada).toBe(true);
        }
    });
});

describe('sacar de la papelera', () => {
    it('la devuelve a la lista', () => {
        const nota = createV02Note('apuntes');
        saveV02Note(nota._id, { content: 'una linea' });
        trashV02Note(nota._id, NUNCA);

        const salida = restoreV02Note(nota._id, NUNCA);

        expect(salida?.corrupted).toBe(false);
        expect(readV02Notes().map((n) => n.title)).toEqual(['apuntes']);
        expect(readV02Trashed()).toHaveLength(0);
    });

    it('a veces la devuelve corrompida, pero con el texto todavía dentro', () => {
        const nota = createV02Note('apuntes');
        saveV02Note(nota._id, { content: 'una linea\notra linea' });
        trashV02Note(nota._id, NUNCA);

        const salida = restoreV02Note(nota._id, SIEMPRE);

        expect(salida?.corrupted).toBe(true);

        const vuelta = readV02Notes()[0];
        expect(vuelta.content).toContain('una linea');
        expect(vuelta.content).toContain('otra linea');
        expect(vuelta.content).not.toBe('una linea\notra linea');
    });

    it('no inventa nada si la nota ya no está en la papelera', () => {
        expect(restoreV02Note('no-existe')).toBeNull();
    });
});

describe('borrar del todo', () => {
    it('la quita de la papelera y no vuelve', () => {
        const nota = createV02Note('apuntes');
        trashV02Note(nota._id, NUNCA);

        expect(purgeV02Note(nota._id)).toBe(true);
        expect(readV02Trashed()).toHaveLength(0);
        expect(readV02Notes()).toHaveLength(0);
    });
});
