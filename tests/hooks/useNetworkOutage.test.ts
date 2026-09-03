// tests/hooks/useNetworkOutage.test.ts

// Sin ningún `import`/`export` estático, TypeScript trata este archivo como un
// script global y su `freshStore` choca con el de otro test. Esto lo declara
// módulo, que es lo que evita la colisión.
export {};
jest.mock('@/lib/api/client', () => ({
    apiClient: { get: jest.fn() },
}));

/**
 * Cada test arranca con un almacén nuevo: el de módulo recuerda la caída.
 *
 * El mock del cliente sale del MISMO registro aislado. Con `jest.resetModules()`
 * la fábrica del mock se vuelve a ejecutar, así que el almacén recién importado
 * habla con un `jest.fn()` distinto del que se ve desde fuera: configurar el de
 * fuera no tenía ningún efecto y todas las comprobaciones salían caídas.
 */
async function freshStore() {
    jest.resetModules();
    const [store, { apiClient }] = await Promise.all([
        import('@/hooks/useNetworkStatus'),
        import('@/lib/api/client'),
    ]);
    const get = apiClient.get as jest.Mock;

    return {
        ...store,
        sano: () => get.mockResolvedValue({ data: { success: true } }),
        caido: () => get.mockRejectedValue(new Error('sin servidor')),
    };
}

beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
});

afterEach(() => {
    jest.useRealTimers();
});

describe('useNetworkStatus - cuánto estuvo a oscuras', () => {
    test('con todo sano no hay ninguna caída que contar', async () => {
        const { checkBackendHealth, getNetworkStatus, sano } = await freshStore();

        sano();
        await checkBackendHealth();

        expect(getNetworkStatus().lastOutageMs).toBeNull();
    });

    test('mientras está caído todavía no hay nada que contar', async () => {
        const { checkBackendHealth, getNetworkStatus, caido } = await freshStore();

        caido();
        await checkBackendHealth();

        expect(getNetworkStatus().lastOutageMs).toBeNull();
    });

    test('al volver, informa cuánto duró la caída', async () => {
        const { checkBackendHealth, getNetworkStatus, sano, caido } = await freshStore();

        caido();
        await checkBackendHealth();

        jest.advanceTimersByTime(134_000);

        sano();
        await checkBackendHealth();

        expect(getNetworkStatus().lastOutageMs).toBe(134_000);
    });

    test('dos comprobaciones seguidas caído no reinician el cronómetro', async () => {
        const { checkBackendHealth, getNetworkStatus, sano, caido } = await freshStore();

        caido();
        await checkBackendHealth();
        jest.advanceTimersByTime(60_000);
        await checkBackendHealth();
        jest.advanceTimersByTime(60_000);

        sano();
        await checkBackendHealth();

        expect(getNetworkStatus().lastOutageMs).toBe(120_000);
    });

    test('una segunda caída cuenta desde cero', async () => {
        const { checkBackendHealth, getNetworkStatus, sano, caido } = await freshStore();

        caido();
        await checkBackendHealth();
        jest.advanceTimersByTime(10_000);
        sano();
        await checkBackendHealth();

        caido();
        await checkBackendHealth();
        jest.advanceTimersByTime(5_000);
        sano();
        await checkBackendHealth();

        expect(getNetworkStatus().lastOutageMs).toBe(5_000);
    });

    test('el aviso se puede descartar cuando ya se mostró', async () => {
        const { checkBackendHealth, getNetworkStatus, clearLastOutage, sano, caido } =
            await freshStore();

        caido();
        await checkBackendHealth();
        jest.advanceTimersByTime(1000);
        sano();
        await checkBackendHealth();

        clearLastOutage();

        expect(getNetworkStatus().lastOutageMs).toBeNull();
    });
});
