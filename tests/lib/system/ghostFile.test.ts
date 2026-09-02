// tests/lib/system/ghostFile.test.ts
import {
    GHOST_ID,
    GHOST_TITLE,
    shouldHaunt,
    buildGhostNote,
    GHOST_MIN_SESSION_MS,
    GHOST_MIN_NOTES,
    GHOST_RETURN_MS,
} from '@/lib/system/ghostFile';

const ctx = (over = {}) => ({
    sessionMs: GHOST_MIN_SESSION_MS + 1000,
    notesCount: GHOST_MIN_NOTES,
    dismissedAt: null as number | null,
    now: 1_000_000,
    ...over,
});

describe('ghostFile - cuándo aparece', () => {
    test('con la sesión recién abierta, no', () => {
        expect(shouldHaunt(ctx({ sessionMs: 60_000 }))).toBe(false);
    });

    test('con pocas notas, tampoco', () => {
        expect(shouldHaunt(ctx({ notesCount: GHOST_MIN_NOTES - 1 }))).toBe(false);
    });

    test('con tiempo y notas suficientes, aparece', () => {
        expect(shouldHaunt(ctx())).toBe(true);
    });
});

describe('ghostFile - cuándo vuelve', () => {
    // La primera versión decía "entre 5 y 15 minutos después", y eso no se cobra
    // nunca: entrás a la papelera, borrás, salís, y no volvés en toda la sesión.
    // Ahora vuelve la próxima vez que ENTRÁS, si pasó el tiempo.
    test('recién borrado no está', () => {
        expect(shouldHaunt(ctx({ dismissedAt: 999_000, now: 1_000_000 }))).toBe(false);
    });

    test('pasado el rato, vuelve', () => {
        expect(
            shouldHaunt(ctx({ dismissedAt: 0, now: GHOST_RETURN_MS + 1000 }))
        ).toBe(true);
    });

    test('vuelve por visita, no por reloj: se decide al preguntarlo', () => {
        const borrado = 0;
        expect(shouldHaunt(ctx({ dismissedAt: borrado, now: 1000 }))).toBe(false);
        expect(shouldHaunt(ctx({ dismissedAt: borrado, now: GHOST_RETURN_MS + 1 }))).toBe(true);
    });
});

describe('ghostFile - qué es', () => {
    test('se llama como un archivo de sistema', () => {
        expect(buildGhostNote('').title).toBe(GHOST_TITLE);
    });

    test('lleva un id propio, imposible de confundir con uno real', () => {
        // Los ids reales son ObjectId de 24 hexadecimales. Este no lo es, así
        // que ninguna llamada a la API puede salir con él por accidente.
        expect(buildGhostNote('')._id).toBe(GHOST_ID);
        expect(GHOST_ID).not.toMatch(/^[0-9a-f]{24}$/i);
    });

    test('su contenido es el registro real de peticiones', () => {
        const log = '14:52:03  GET  /health  200  19ms';

        expect(buildGhostNote(log).content).toContain(log);
    });

    test('sin peticiones que mostrar, sigue diciendo algo', () => {
        expect(buildGhostNote('').content.length).toBeGreaterThan(0);
    });

    test('viene marcada como borrada, para que caiga en la papelera', () => {
        expect(buildGhostNote('').isDeleted).toBe(true);
    });
});
