// tests/lib/system/artEnLaVieja.test.ts

/**
 * `//art_<n>` Y `//keep` EN LA VERSIÓN VIEJA: existen, y funcionan mal.
 *
 * ⚠ POR QUÉ EXISTEN, si la regla de esa versión es que no tiene lo que todavía
 * no se había escrito. Porque la PESTAÑA de la colección se ve ahí — siempre se
 * vio— y un sitio que se puede abrir con unos comandos que contestan «comando
 * desconocido» son dos versiones de la misma máquina discutiendo. Es el mismo
 * argumento que ya dejó a `//reboot` dentro, escrito en su propia ficha.
 *
 * Lo que cambia es que ahí abajo la colección está EMPEZADA, no terminada: lee
 * lo que puede y guarda lo que leyó.
 *
 * ⚠ Y LO QUE SE PRUEBA ES QUE LOS TRES CAMINOS DIGAN LO MISMO. Si la pestaña
 * enseña una pieza comida, `//art_<n>` la dibuja comida y `//keep` la guarda
 * comida. Con una copia de la regla en cada sitio, la única parte que
 * funcionaría bien sería justo la que deja rastro en tu archivo.
 */

import { ART, awardPiece, artOf, asNote } from '@/lib/system/asciiArt';
import { run, type CommandContext } from '@/lib/system/commands';
import { clearUsed } from '@/lib/system/commandUnlock';
import { enterV02, leaveV02, v02ArtMode, v02Reading } from '@/lib/system/v02';

const ctx = (over: Partial<CommandContext> = {}): CommandContext => ({
    now: new Date('2026-09-01T14:52:12.000Z'),
    sessionStart: new Date('2026-09-01T14:05:00.000Z'),
    notes: [],
    integrity: 100,
    theme: 'light',
    effectsEnabled: true,
    soundEnabled: true,
    secretsFound: 3,
    secretsTotal: 12,
    log: '',
    greetings: 0,
    chat: 0,
    kicks: 0,
    lang: 'es' as const,
    ...over,
});

/** El número de catálogo de una pieza que le sale de esa manera a la v0.2. */
function numeroCon(modo: string): number {
    const i = ART.findIndex((p) => v02ArtMode(p.id) === modo);
    if (i < 0) throw new Error(`ninguna pieza sale ${modo}`);

    awardPiece(ART[i].id);
    return i + 1;
}

beforeEach(() => {
    localStorage.clear();
    clearUsed();
    leaveV02();
});

afterEach(() => leaveV02());

describe('la que esta versión no sabe leer', () => {
    test('⚠ contesta que no puede, y NO dice que no exista', () => {
        /*
         * La diferencia importa: «no existe» se lee como que la perdiste. La
         * pieza es tuya y la v1.0 la enseña entera — lo que falla es esta
         * versión leyendo un formato que llegó después.
         */
        const n = numeroCon('ilegible');
        enterV02('NIDO');

        const salida = run(`//art_${n}`, ctx())?.output ?? '';

        expect(salida).toContain('ILEGIBLE');
        expect(salida).toContain('FORMATO');
    });

    test('⚠ y no cuenta como abierta', () => {
        /*
         * Abrir una pieza es VERLA. Marcarla desde una versión que no la sabe
         * pintar regalaría la estrella de abrirlas todas sin haber visto
         * ninguna.
         */
        const n = numeroCon('ilegible');
        enterV02('NIDO');
        run(`//art_${n}`, ctx());

        // Y sin nada dibujado, `//keep` no tiene qué guardar: contesta que
        // no hay nada y NO escribe en la nota abierta.
        expect(run('//keep', ctx())?.effect?.kind).not.toBe('write-note');
    });

    test('pero en la v1.0 esa misma pieza se dibuja entera', () => {
        const n = numeroCon('ilegible');

        const salida = run(`//art_${n}`, ctx())?.output ?? '';

        expect(salida).not.toContain('ILEGIBLE');
        expect(salida).toContain(artOf(ART[n - 1]).split('\n')[1]);
    });
});

describe('`//keep` guarda lo que se pudo leer', () => {
    test('⚠ en la v0.2 la nota lleva el dibujo comido, no el bueno', () => {
        const n = numeroCon('corrupta');
        const pieza = ART[n - 1];
        enterV02('NIDO');
        run(`//art_${n}`, ctx());

        const guardado = run('//keep', ctx())?.effect;

        expect(guardado).toBeDefined();
        if (guardado?.kind !== 'write-note') throw new Error('no escribió nota');

        expect(guardado.text).toBe(
            asNote(pieza, 'es', v02Reading(artOf(pieza), pieza.id).art)
        );
        expect(guardado.text).not.toBe(asNote(pieza, 'es'));
    });

    test('y lo avisa: guardado como se pudo leer', () => {
        const n = numeroCon('corrupta');
        enterV02('NIDO');
        run(`//art_${n}`, ctx());

        expect(run('//keep', ctx())?.output).toContain('COMO SE PUDO LEER');
    });

    test('⚠ y en la v1.0 guarda la pieza entera, como siempre', () => {
        const n = numeroCon('corrupta');
        const pieza = ART[n - 1];
        run(`//art_${n}`, ctx());

        const guardado = run('//keep', ctx())?.effect;
        if (guardado?.kind !== 'write-note') throw new Error('no escribió nota');

        expect(guardado.text).toBe(asNote(pieza, 'es'));
    });
});

describe('los tres caminos dicen lo mismo', () => {
    test('⚠ lo que dibuja `//art_<n>` es lo que guarda `//keep`', () => {
        // Con una copia de la regla en cada sitio, la única parte del camino
        // que funcionaría bien sería justo la que deja rastro en tu archivo.
        const n = numeroCon('parcial');
        const pieza = ART[n - 1];
        enterV02('NIDO');

        const dibujado = run(`//art_${n}`, ctx())?.output ?? '';
        const guardado = run('//keep', ctx())?.effect;
        if (guardado?.kind !== 'write-note') throw new Error('no escribió nota');

        const leido = v02Reading(artOf(pieza), pieza.id).art;

        expect(dibujado).toContain(leido);
        expect(guardado.text).toContain(leido);
    });
});
