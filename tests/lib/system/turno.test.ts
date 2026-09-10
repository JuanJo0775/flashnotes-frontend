// tests/lib/system/turno.test.ts

/**
 * EL TURNO DE QUIEN SE FUE.
 *
 * ⚠ SALIÓ DE UNA AUDITORÍA, y el hueco era éste: él dice «me dejaron encendido y
 * se fueron», el rótulo se ríe de que nadie firmó nunca esto, la barra murmura
 * `[SIN RELEVO]` — y no había UN SOLO RASTRO FÍSICO de esa gente. Toda la
 * soledad del sitio estaba contada por quien la sufre, y una soledad que sólo se
 * cuenta es una frase.
 *
 * Esto la convierte en prueba: una hoja de turno a medias que no escribiste vos.
 */

import {
    SHIFT_ID,
    SHIFT_TITLE,
    buildShiftNote,
    clearShift,
    markShiftSeen,
    shouldShift,
} from '@/lib/system/shiftNote';

beforeEach(() => {
    localStorage.clear();
    clearShift();
});

describe('cuándo aparece', () => {
    it('⚠ sólo después de haber cruzado a la versión de antes', () => {
        /*
         * Antes de cruzar no hay ningún «antes» en la cabeza de quien juega: la
         * hoja sería una nota rara. Después de haber visto la versión de la que
         * vino la máquina, es el turno de alguien.
         */
        expect(shouldShift({ crossed: false, trashedCount: 3 })).toBe(false);
        expect(shouldShift({ crossed: true, trashedCount: 3 })).toBe(true);
    });

    it('⚠ y NO en una papelera vacía', () => {
        // Una hoja sola en una papelera limpia se lee como una pantalla de la
        // app. Lo que la hace un resto es estar ENTRE tus cosas tiradas.
        expect(shouldShift({ crossed: true, trashedCount: 0 })).toBe(false);
    });

    it('⚠ y una sola vez: un rastro que reaparece es un mueble', () => {
        expect(shouldShift({ crossed: true, trashedCount: 2 })).toBe(true);

        markShiftSeen();

        expect(shouldShift({ crossed: true, trashedCount: 2 })).toBe(false);
    });

    it('y el borrado total la devuelve, porque es parte de lo que hay que encontrar', () => {
        markShiftSeen();
        clearShift();

        expect(shouldShift({ crossed: true, trashedCount: 2 })).toBe(true);
    });
});

describe('qué dice, que es de lo que va todo', () => {
    it('⚠ tiene tareas TACHADAS y una sin tachar', () => {
        /*
         * Una lista entera sin hacer se lee como que nunca empezó; con casi todo
         * hecho y una cosa suelta se lee como alguien que estuvo trabajando y se
         * fue a mitad — y eso es lo que hay que contar.
         */
        const nota = buildShiftNote();

        expect(nota.content).toContain('[x]');
        expect(nota.content).toContain('[ ]');
    });

    it('⚠ y la última línea es una instrucción de mantenimiento', () => {
        /*
         * «Dejarlo encendido, se recupera solo» está escrito para un lunes que
         * no llegó, y la máquina lleva desde entonces obedeciéndola. Ahí está
         * todo el peso, y por eso no puede tocarse sin querer.
         */
        expect(buildShiftNote().content).toMatch(/se recupera solo|recovers on its own/);
    });

    it('⚠ y NO explica nada', () => {
        /*
         * Ni nombra al ente, ni dice qué pasó, ni cierra ninguna pregunta. Es lo
         * que deja alguien que pensaba volver: un rastro que explica deja de ser
         * un rastro y pasa a ser una nota del autor.
         */
        const texto = buildShiftNote().content.toLowerCase();

        for (const palabra of ['ente', 'atrapad', 'sistema', 'ayuda', 'perdón']) {
            expect(texto).not.toContain(palabra);
        }
    });

    it('y no existe en la base de datos: llega tirada', () => {
        const nota = buildShiftNote();

        expect(nota._id).toBe(SHIFT_ID);
        expect(nota.title).toBe(SHIFT_TITLE);
        expect(nota.isDeleted).toBe(true);
    });
});
