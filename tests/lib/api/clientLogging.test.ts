// tests/lib/api/clientLogging.test.ts
import type { AxiosAdapter } from 'axios';
import { apiClient } from '@/lib/api/client';
import { entries, clear } from '@/lib/system/requestLog';

/**
 * Se prueba a través del cliente real, con el adaptador de axios sustituido:
 * así pasa por la cadena de interceptores de verdad en lugar de por una copia.
 */
function respondWith(status: number): AxiosAdapter {
    return async (config) => {
        const response = {
            data: { success: status < 400 },
            status,
            statusText: '',
            headers: {},
            config,
        };

        if (status >= 400) {
            return Promise.reject(
                Object.assign(new Error('fallo'), { config, response, isAxiosError: true })
            );
        }

        return response;
    };
}

const originalAdapter = apiClient.defaults.adapter;

beforeEach(() => {
    clear();
});

afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
});

describe('client - alimenta el registro de peticiones', () => {
    test('una petición correcta queda anotada', async () => {
        apiClient.defaults.adapter = respondWith(200);

        await apiClient.get('/notes');

        expect(entries()).toHaveLength(1);
        expect(entries()[0]).toMatchObject({
            method: 'GET',
            path: '/notes',
            status: 200,
        });
    });

    test('anota la duración de la petición', async () => {
        apiClient.defaults.adapter = respondWith(200);

        await apiClient.get('/health');

        expect(entries()[0].durationMs).toBeGreaterThanOrEqual(0);
    });

    test('una petición fallida también queda anotada, con su código', async () => {
        apiClient.defaults.adapter = respondWith(404);

        await expect(apiClient.get('/notes/nope')).rejects.toBeDefined();

        expect(entries()[0]).toMatchObject({ path: '/notes/nope', status: 404 });
    });

    test('anota el método real de cada petición', async () => {
        apiClient.defaults.adapter = respondWith(200);

        await apiClient.patch('/notes/abc', { title: 'x' });

        expect(entries()[0].method).toBe('PATCH');
    });

    test('no guarda el cuerpo que se envió', async () => {
        apiClient.defaults.adapter = respondWith(200);

        await apiClient.patch('/notes/abc', { content: 'texto privado de la nota' });

        expect(JSON.stringify(entries())).not.toContain('texto privado');
    });
});
