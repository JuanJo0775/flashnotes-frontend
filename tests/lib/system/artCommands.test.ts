// tests/lib/system/artCommands.test.ts
import { clearUsed } from '@/lib/system/commandUnlock';
import { run, type CommandContext } from '@/lib/system/commands';
import { ART, ART_TOTAL, awardPiece, clearFound } from '@/lib/system/asciiArt';

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
    chat: 0,
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

describe('//art · el catálogo, que no da nada', () => {
    /*
     * ⚠ ANTES DABA UNA PIEZA CADA VEZ. Eso convertía la colección en ocho
     * pulsaciones de Enter y hacía que la pestaña con estrella no significara
     * nada. Ahora cada pieza se gana por su camino y esto sólo dice cuáles
     * llevás — de ganárselas se ocupa `artEarned.test.ts`.
     */
    test('sin ninguna pieza, NO EXISTE', () => {
        // Un catálogo vacío anunciaría que hay una colección que llenar, y
        // encontrar la primera es parte de lo que se descubre. Contesta lo mismo
        // que una palabra inventada.
        expect(corre('//art').output).toMatch(/DESCONOCIDO/i);
    });

    test('y teclearlo a ciegas no lo desbloquea', () => {
        corre('//art');

        expect(corre('//help', () => 0.5).output).not.toContain('//art');
    });

    test('con una pieza, lista las OCHO filas', () => {
        awardPiece(ART[0].id);

        const filas = corre('//art').rows ?? [];
        const piezas = filas.filter(
            (f) => 'scramble' in f || /^\s+\d+\//.test('text' in f ? f.text : '')
        );

        expect(piezas).toHaveLength(ART_TOTAL);
    });

    test('la que tenés sale SIN ABRIR; las demás se revuelven', () => {
        // Su nombre no aparece hasta abrirla con `//art_<n>`. En el catálogo se
        // ve que la tenés y no qué es.
        awardPiece(ART[0].id);

        const filas = corre('//art').rows ?? [];

        expect(filas.filter((f) => 'scramble' in f)).toHaveLength(ART_TOTAL - 1);
        expect(corre('//art').output).toContain('SIN ABRIR');
        expect(corre('//art').output).not.toContain(ART[0].caption.es);
    });

    test('y una vez abierta, ya lleva su pie', () => {
        awardPiece(ART[0].id);
        corre('//art_1');

        expect(corre('//art').output).toContain(ART[0].caption.es);
    });

    test('dice cuántas llevás', () => {
        awardPiece(ART[0].id);

        expect(corre('//art').output).toMatch(new RegExp(`1 DE ${ART_TOTAL}`));
    });

    test('con todas, lo dice', () => {
        for (const p of ART) awardPiece(p.id);

        expect(corre('//art').output).toMatch(/NO QUEDA NINGUNA MÁS/);
    });

    test('no sale en la ayuda', () => {
        awardPiece(ART[0].id);

        expect(corre('//help', () => 0.5).output).not.toContain('//art');
    });
});

describe('//art_<n> · dibuja la que elijas', () => {
    test('con la que tenés, la dibuja', () => {
        awardPiece(ART[2].id);

        expect(corre('//art_3').output).toContain(ART[2].caption.es);
    });

    test('sin tenerla, contesta «desconocido»', () => {
        // Decir «esa existe pero no es tuya» sería un cartel. Mismo trato que
        // `//attach_*` con los PID.
        awardPiece(ART[0].id);

        expect(corre('//art_3').output).toMatch(/DESCONOCIDO/i);
    });

    test('con un número que no existe, lo mismo', () => {
        awardPiece(ART[0].id);

        expect(corre('//art_99').output).toMatch(/DESCONOCIDO/i);
    });

    test('y avisa de que se puede guardar', () => {
        awardPiece(ART[0].id);

        expect(corre('//art_1').output).toContain('//keep');
    });
});

describe('//keep · quedarse una', () => {
    /*
     * ⚠ AHORA SE ENCADENA A `//art_<n>`, no a `//art`.
     *
     * `//art` pasó a ser el catálogo y no dibuja nada, así que ya no deja
     * ninguna pieza «delante» que guardar. Quien dibuja es `//art_<n>`, y es de
     * ahí de donde `//keep` toma la suya.
     */
    test('sin ninguna vista, no hay nada que guardar', () => {
        const r = corre('//keep');

        expect(r.effect.kind).toBe('none');
        expect(r.output).toMatch(/NADA QUE GUARDAR/);
    });

    test('después de ver una, la guarda en la colección', () => {
        // CREA UNA PIEZA, no escribe en la nota abierta: escribir encima
        // obligaría a tener una nota en blanco a mano, y la pieza acabaría
        // mezclada entre tus archivos como una nota más.
        awardPiece(ART[0].id);
        corre('//art_1');
        const r = corre('//keep');

        expect(r.effect.kind).toBe('keep-art');
    });

    test('lo que guarda es el dibujo con su pie', () => {
        awardPiece(ART[0].id);
        const dibujo = corre('//art_1').output;
        const r = corre('//keep');

        if (r.effect.kind !== 'keep-art') throw new Error('no guardó nada');
        expect(r.effect.text).toContain(dibujo.split('\n')[0]);
    });

    test('el título es el nombre de la pieza y su número', () => {
        // `POLILLA · 1/8`, no «Nueva nota». Es una ficha de catálogo: dice qué
        // pieza es y cuántas hay.
        awardPiece(ART[0].id);
        corre('//art_1');
        const r = corre('//keep');

        if (r.effect.kind !== 'keep-art') throw new Error('no guardó nada');
        expect(r.effect.title).toContain(`/${ART_TOTAL}`);
        expect(r.effect.title).not.toMatch(/nueva nota/i);
    });

    test('guarda la ÚLTIMA que se dibujó, no una cualquiera', () => {
        awardPiece(ART[0].id);
        awardPiece(ART[3].id);

        corre('//art_1');
        const segunda = corre('//art_4').output.split('\n')[0];

        const r = corre('//keep');

        if (r.effect.kind !== 'keep-art') throw new Error('no guardó nada');
        expect(r.effect.text).toContain(segunda);
    });

    test('cuenta como secreto aparte', () => {
        awardPiece(ART[0].id);
        corre('//art_1');

        expect(corre('//keep').secretId).toBe('art-keep');
    });

    test('tampoco sale en la ayuda', () => {
        expect(corre('//help', () => 0.5).output).not.toContain('//keep');
    });
});
