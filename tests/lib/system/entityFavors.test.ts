// tests/lib/system/entityFavors.test.ts

/**
 * LOS FAVORES.
 *
 * ⚠ NO SON TAREAS Y NO HAY CONTADOR. Sólo te pide algo cuando notó que sabés lo
 * que no deberías, y lo que cambia al cumplirlo no es un número: es lo que él
 * sabe de vos.
 *
 * ⚠ Y NO CONDUCEN A SECRETOS: ACERCAN. Uno que desbloquea algo es una misión, y
 * entonces él pasa a ser un dispensador de contenido. Uno que te deja mirando en
 * la dirección correcta sigue siendo un favor.
 *
 * Los tres se comprueban contra estado QUE YA EXISTE —la papelera de la v0.2, el
 * reloj de inactividad, la pieza que se gana llenando una nota— y los tres
 * suenan a que le sirven a él. Eso último es lo que hace que ayudarlo se sienta
 * como ayudarlo.
 */

import {
    favorDone,
    favorDue,
    favorLine,
    PIDE_CON,
    PIDE_TRAS,
    QUIET_MS,
    type AskWorld,
    type Favor,
    type FavorWorld,
} from '@/lib/system/entityFavors';
import type { EntityPhase, EntitySnapshot } from '@/lib/system/entity';

const TODOS: readonly Favor[] = ['v02trash', 'quiet', 'fullnote'];
const LENGUAS = ['es', 'en'] as const;

const mundo = (parcial: Partial<FavorWorld> = {}): FavorWorld => ({
    sawV02Trash: false,
    idleMs: 0,
    filledNote: false,
    ...parcial,
});

const en = (
    phase: EntityPhase,
    extra: Partial<EntitySnapshot> = {}
): EntitySnapshot => ({ phase, exchanges: 0, ...extra });

/** Alguien que cruzó a la v0.2 y por tanto sabe qué es. */
const cruzo = (): AskWorld => ({ sawTooMuch: true, knowsV02: true });

/** Y alguien que lo despertó insistiendo, sin haber cruzado nunca. */
const insistio = (): AskWorld => ({ sawTooMuch: true, knowsV02: false });

/** Ya hablado lo bastante para que empiece a querer algo. */
const hablado = (extra: Partial<EntitySnapshot> = {}) =>
    en('hablando', { exchanges: PIDE_TRAS, ...extra });

describe('⚠ PIDIENDO no se abre por hablar', () => {
    it('hablar mucho no basta si no viste nada', () => {
        /*
         * Se abre porque él nota que sabés lo que no deberías. Los secretos por
         * su cuenta dicen «buscaste mucho»; lo que le interesa es que llegaste a
         * un sitio donde no se llega solo.
         */
        expect(
            favorDue(hablado({ exchanges: 99 }), 99, {
                sawTooMuch: false,
                knowsV02: false,
            })
        ).toBeNull();
    });

    it('⚠ ni tampoco basta con haber visto, si acaba de soltarse', () => {
        /*
         * Pasar de contestarte de lado a pedirte favores en cuatro frases se lee
         * como que lo reemplazaron. `hablando` tiene que ser un tramo en que
         * simplemente habla antes de querer algo a cambio.
         */
        expect(favorDue(en('hablando'), PIDE_CON, cruzo())).toBeNull();
    });

    it('con las dos cosas, y después de un rato, sí', () => {
        expect(favorDue(hablado(), PIDE_CON, cruzo())).toBe('v02trash');
    });

    it('y antes de hablando no pide nada, sepas lo que sepas', () => {
        // No le pide favores a alguien con quien todavía no habla.
        expect(favorDue(en('burlon', { exchanges: 99 }), 99, cruzo())).toBeNull();
        expect(favorDue(en('receloso', { exchanges: 99 }), 99, cruzo())).toBeNull();
    });
});

describe('⚠ SÓLO PIDE LO QUE PODÉS ENTENDER', () => {
    it('a quien nunca cruzó no lo manda a la v0.2', () => {
        /*
         * Para esa persona la 0.2 es un sitio que no existe, y «andá a la 0.2 y
         * mirá qué hay en la papelera» se lee como un error del juego, no como
         * un favor. Se salta y le pide otra cosa.
         *
         * Pasaba de verdad: quien lo despertaba insistiendo con `//hi` nunca ha
         * cruzado, y le llegaba igual.
         */
        expect(favorDue(hablado(), PIDE_CON, insistio())).toBe('quiet');
    });

    it('y aun así llega al final: el resto de favores sirve igual', () => {
        // Saltarse uno no puede dejar a nadie sin final.
        expect(
            favorDue(hablado({ didQuiet: true }), PIDE_CON, insistio())
        ).toBe('fullnote');
    });
});

describe('los pide en orden, uno por uno', () => {
    it('primero el de la v0.2, que es el que él no puede hacer', () => {
        expect(favorDue(hablado(), PIDE_CON, cruzo())).toBe('v02trash');
    });

    it('después el silencio', () => {
        expect(
            favorDue(hablado({ didV02Trash: true }), PIDE_CON, cruzo())
        ).toBe('quiet');
    });

    it('y por último la nota llena', () => {
        expect(
            favorDue(
                hablado({ didV02Trash: true, didQuiet: true }),
                PIDE_CON,
                cruzo()
            )
        ).toBe('fullnote');
    });

    it('cuando ya te pidió los tres, para', () => {
        // No inventa un cuarto. Lo que quería saber de vos ya lo sabe.
        expect(
            favorDue(
                hablado({
                    didV02Trash: true,
                    didQuiet: true,
                    didFullNote: true,
                }),
                PIDE_CON,
                cruzo()
            )
        ).toBeNull();
    });
});

describe('cada uno se comprueba contra algo que ya existe', () => {
    it('el de la v0.2, contra haber abierto su papelera', () => {
        expect(favorDone('v02trash', mundo())).toBe(false);
        expect(favorDone('v02trash', mundo({ sawV02Trash: true }))).toBe(true);
    });

    it('el silencio, contra el reloj de inactividad', () => {
        expect(favorDone('quiet', mundo({ idleMs: QUIET_MS - 1 }))).toBe(false);
        expect(favorDone('quiet', mundo({ idleMs: QUIET_MS }))).toBe(true);
    });

    it('la nota llena, contra la pieza que ya se gana llenándola', () => {
        // No hace falta un registro nuevo: llenar una nota hasta el tope ya
        // tiene premio en el juego, y ese premio es la prueba.
        expect(favorDone('fullnote', mundo())).toBe(false);
        expect(favorDone('fullnote', mundo({ filledNote: true }))).toBe(true);
    });
});

describe('diez minutos de silencio', () => {
    it('son diez, no dos', () => {
        // Corto sería un trámite; largo de más, un castigo. Diez minutos es lo
        // que tarda alguien en irse a hacer otra cosa y volver.
        expect(QUIET_MS).toBe(10 * 60 * 1000);
    });
});

describe('cómo lo pide', () => {
    it('en minúsculas, en los dos idiomas, sin calcar', () => {
        for (const f of TODOS) {
            for (const lang of LENGUAS) {
                const linea = favorLine(f, lang);
                expect(linea).toBeTruthy();
                expect(linea).toBe(linea.toLowerCase());
            }
            expect(favorLine(f, 'es')).not.toBe(favorLine(f, 'en'));
        }
    });

    it('y suena a que le sirve a él, no a que te manda', () => {
        /*
         * «Yo no puedo» no es una excusa de diseño: es cierto, está encerrado.
         * Un favor que suena a tarea asignada convierte al ente en un tablero
         * de misiones, y ahí se acaba el personaje.
         */
        expect(favorLine('v02trash', 'es')).toMatch(/no puedo/);
        expect(favorLine('v02trash', 'en')).toMatch(/cannot|can not/);
    });

    it('sin usted, como todo lo suyo', () => {
        const USTED = /\busted(es)?\b|\bvaya\b|\bmire\b|\bdeje\b/;
        for (const f of TODOS) {
            expect(favorLine(f, 'es')).not.toMatch(USTED);
        }
    });
});
