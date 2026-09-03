// tests/lib/system/requestLog.test.ts
import {
    LOG_CAPACITY,
    record,
    entries,
    clear,
    formatEntry,
} from '@/lib/system/requestLog';

const AT = new Date('2026-09-01T14:52:03.000Z');

beforeEach(() => {
    clear();
    jest.useFakeTimers();
    jest.setSystemTime(AT);
});

afterEach(() => {
    jest.useRealTimers();
});

describe('requestLog - registro', () => {
    test('guarda una petición y la devuelve', () => {
        record({ method: 'GET', path: '/health', status: 200, durationMs: 19 });

        expect(entries()).toHaveLength(1);
        expect(entries()[0]).toMatchObject({
            method: 'GET',
            path: '/health',
            status: 200,
            durationMs: 19,
        });
    });

    test('sella la hora en que ocurrió la petición', () => {
        record({ method: 'GET', path: '/health', status: 200, durationMs: 19 });

        expect(entries()[0].at.getTime()).toBe(AT.getTime());
    });

    test('devuelve primero la más reciente', () => {
        record({ method: 'GET', path: '/primera', status: 200, durationMs: 1 });
        record({ method: 'GET', path: '/segunda', status: 200, durationMs: 1 });

        expect(entries().map((e) => e.path)).toEqual(['/segunda', '/primera']);
    });

    test('clear vacía el registro', () => {
        record({ method: 'GET', path: '/health', status: 200, durationMs: 19 });
        clear();

        expect(entries()).toHaveLength(0);
    });
});

describe('requestLog - búfer circular', () => {
    test('nunca supera la capacidad', () => {
        for (let i = 0; i < LOG_CAPACITY + 25; i += 1) {
            record({ method: 'GET', path: `/n${i}`, status: 200, durationMs: 1 });
        }

        expect(entries()).toHaveLength(LOG_CAPACITY);
    });

    test('descarta las más viejas al desbordar', () => {
        for (let i = 0; i < LOG_CAPACITY + 1; i += 1) {
            record({ method: 'GET', path: `/n${i}`, status: 200, durationMs: 1 });
        }

        const rutas = entries().map((e) => e.path);
        expect(rutas).not.toContain('/n0');
        expect(rutas[0]).toBe(`/n${LOG_CAPACITY}`);
    });
});

describe('requestLog - no guarda contenido', () => {
    // La regla del proyecto: lo que escribís no se lee. Tampoco acá.
    test('descarta el cuerpo aunque se lo pasen', () => {
        record({
            method: 'PATCH',
            path: '/notes/x',
            status: 200,
            durationMs: 5,
            // @ts-expect-error el tipo no admite cuerpo: esto lo fija en runtime
            body: { content: 'texto privado de la nota' },
        });

        expect(JSON.stringify(entries()[0])).not.toContain('texto privado');
    });
});

describe('requestLog - formato', () => {
    test('imita el formato del log del servidor', () => {
        record({ method: 'GET', path: '/health', status: 200, durationMs: 19 });

        // hora  MÉTODO  ruta  código  duración
        expect(formatEntry(entries()[0])).toMatch(
            /^\d{2}:\d{2}:\d{2}\s+GET\s+\/health\s+200\s+19ms$/
        );
    });

    test('acorta los identificadores de nota a cuatro caracteres', () => {
        record({
            method: 'PATCH',
            path: '/notes/6f2a9c21b4e8d7a3f0c15e92',
            status: 200,
            durationMs: 112,
        });

        expect(formatEntry(entries()[0])).toContain('/notes/6f2a…');
    });

    test('acorta el identificador aunque la ruta siga después', () => {
        record({
            method: 'PATCH',
            path: '/notes/6f2a9c21b4e8d7a3f0c15e92/undo',
            status: 200,
            durationMs: 84,
        });

        expect(formatEntry(entries()[0])).toContain('/notes/6f2a…/undo');
    });

    test('deja intactas las rutas sin identificador', () => {
        record({ method: 'GET', path: '/notes/trash', status: 200, durationMs: 30 });

        expect(formatEntry(entries()[0])).toContain('/notes/trash');
    });
});
