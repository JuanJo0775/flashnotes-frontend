// tests/lib/system/artCommands.test.ts
import { clearUsed } from '@/lib/system/commandUnlock';
import { run, type CommandContext } from '@/lib/system/commands';
import { ART_TOTAL, clearFound } from '@/lib/system/asciiArt';

const ctx = (): CommandContext => ({
    now: new Date('2026-09-02T14:52:12.000Z'),
    sessionStart: new Date('2026-09-02T14:05:00.000Z'),
    notes: [],
    integrity: 100,
    theme: 'light',
    effectsEnabled: true,
    secretsFound: 0,
    secretsTotal: 18,
    log: '',
    greetings: 0,
    whoareu: 0,
    kicks: 0,
    lang: 'es' as const,
});

const corre = (linea: string, random = () => 0) => run(linea, ctx(), random)!;

beforeEach(() => {
    localStorage.clear();
    clearFound();
    // Usar un comando escondido lo desbloquea, y eso persiste: sin limpiarlo,
    // un test contamina al siguiente.
    clearUsed();
});

describe('//art · las piezas', () => {
    test('devuelve un dibujo con su pie', () => {
        const salida = corre('//art').output;

        expect(salida.split('\n').length).toBeGreaterThan(4);
        expect(salida).toContain('--');
    });

    test('dice cuántas van', () => {
        expect(corre('//art').output).toMatch(new RegExp(`1/${ART_TOTAL}`));
    });

    test('cuenta como secreto', () => {
        expect(corre('//art').secretId).toBe('art');
    });

    test('la primera avisa de que se puede guardar', () => {
        // Sólo la primera: repetirlo en cada tirada sería un tutorial.
        expect(corre('//art').output).toContain('//keep');
    });

    test('la segunda ya no lo repite', () => {
        corre('//art');

        expect(corre('//art').output).not.toContain('//keep');
    });

    test('al completarlas lo dice', () => {
        for (let i = 0; i < ART_TOTAL - 1; i += 1) corre('//art');

        expect(corre('//art').output).toMatch(/NO QUEDA NINGUNA MÁS/);
    });

    test('no sale en la ayuda', () => {
        expect(corre('//help', () => 0.5).output).not.toContain('//art');
    });
});

describe('//keep · quedarse una', () => {
    test('sin ninguna vista, no hay nada que guardar', () => {
        const r = corre('//keep');

        expect(r.effect.kind).toBe('none');
        expect(r.output).toMatch(/NADA QUE GUARDAR/);
    });

    test('después de ver una, la escribe en la nota', () => {
        corre('//art');
        const r = corre('//keep');

        expect(r.effect.kind).toBe('write-note');
    });

    test('lo que escribe es el dibujo con su pie', () => {
        const dibujo = corre('//art').output;
        const r = corre('//keep');

        if (r.effect.kind !== 'write-note') throw new Error('no escribió nada');
        // La primera línea del dibujo tiene que estar en la nota.
        expect(r.effect.text).toContain(dibujo.split('\n')[0]);
    });

    test('guarda la ÚLTIMA que salió, no una cualquiera', () => {
        corre('//art');
        const segunda = corre('//art').output.split('\n')[0];
        const r = corre('//keep');

        if (r.effect.kind !== 'write-note') throw new Error('no escribió nada');
        expect(r.effect.text).toContain(segunda);
    });

    test('cuenta como secreto aparte', () => {
        corre('//art');

        expect(corre('//keep').secretId).toBe('art-keep');
    });

    test('tampoco sale en la ayuda', () => {
        expect(corre('//help', () => 0.5).output).not.toContain('//keep');
    });
});
