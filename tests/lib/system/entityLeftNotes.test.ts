// tests/lib/system/entityLeftNotes.test.ts

/**
 * LAS NOTAS QUE APARECEN EN LA PAPELERA.
 *
 * ⚠ NUNCA EXISTEN EN LA BASE DE DATOS. Se inyectan al leer, como el archivo
 * fantasma y el resto de arte. Una nota suya que llegara al backend sería una
 * nota de verdad, y borrarla fallaría con un error del servidor.
 *
 * Y aparecen en la papelera y no entre tus notas por una razón que no es
 * técnica: la papelera es donde el sistema pone lo que ya no sirve, y por eso
 * es donde nadie mira dos veces. Es el único sitio donde algo puede llevar días
 * esperándote.
 */

import { buildLeftNote, LEFT_ID, LEFT_TITLE } from '@/lib/system/entityNotes';
import {
    AWAY_ENOUGH,
    clearEntity,
    forgetBootAway,
    markSeen,
    setPhase,
} from '@/lib/system/entity';

beforeEach(() => {
    localStorage.clear();
    clearEntity();
    forgetBootAway();
});

describe('mientras no lo conozcas', () => {
    it('no hay ninguna nota que enseñar', () => {
        expect(buildLeftNote('es')).toBeNull();
    });
});

describe('la primera que deja', () => {
    it('sale marcada como borrada, con su id fijo', () => {
        setPhase('burlon');

        const nota = buildLeftNote('es')!;

        // `isDeleted` porque vive en la papelera; el id fijo para que la
        // papelera pueda reconocerla sin salir a la red.
        expect(nota._id).toBe(LEFT_ID);
        expect(nota.isDeleted).toBe(true);
    });

    it('y es la falsa, la del //panic', () => {
        setPhase('burlon');

        expect(buildLeftNote('es')!.content).toContain('//panic');
        expect(buildLeftNote('es')!.title).toBe(LEFT_TITLE.falsa.es);
    });

    it('en el idioma en el que estás leyendo', () => {
        // El mismo fallo que tuvo `RECUPERADO.bin`: una palabra española suelta
        // en una interfaz en inglés se lee como un descuido de traducción.
        setPhase('burlon');

        expect(buildLeftNote('en')!.title).toBe(LEFT_TITLE.falsa.en);
        expect(buildLeftNote('en')!.content).not.toBe(
            buildLeftNote('es')!.content
        );
    });
});

describe('al volver al día siguiente', () => {
    it('es esa la que te encontrás, y no la que tocaba', () => {
        setPhase('burlon');
        markSeen(0);

        const nota = buildLeftNote('es', AWAY_ENOUGH + 1)!;

        expect(nota.title).toBe(LEFT_TITLE.vuelta.es);
        expect(nota.content).toContain('//');
    });
});
