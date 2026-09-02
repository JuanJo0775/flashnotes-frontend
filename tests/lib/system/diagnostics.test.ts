// tests/lib/system/diagnostics.test.ts
import { formatDuration } from '@/lib/utils/formatters';
import { coreTemperature, CORE_MIN_C, CORE_MAX_C } from '@/lib/system/diagnostics';

describe('formatDuration', () => {
    // La comparte `>uptime` y la fila TIEMPO ACTIVO del panel: una sola función
    // para que las dos digan exactamente lo mismo.
    test('cuenta horas, minutos y segundos', () => {
        expect(formatDuration(47 * 60_000 + 12_000)).toBe('00:47:12');
    });

    test('rellena con ceros', () => {
        expect(formatDuration(5_000)).toBe('00:00:05');
    });

    test('pasa de la hora sin reiniciarse', () => {
        expect(formatDuration(3 * 3_600_000 + 61_000)).toBe('03:01:01');
    });

    test('una duración negativa se lee como cero, no como basura', () => {
        expect(formatDuration(-5000)).toBe('00:00:00');
    });
});

describe('coreTemperature', () => {
    // Decoración honesta: no mide nada real, se deriva del ritmo de escritura.
    // Lo que sí tiene que cumplir es no salirse nunca de su escala.
    test('sin escribir, el núcleo está en reposo', () => {
        expect(coreTemperature(0)).toBe(CORE_MIN_C);
    });

    test('escribir lo calienta', () => {
        expect(coreTemperature(200)).toBeGreaterThan(coreTemperature(0));
    });

    test('nunca pasa del máximo por mucho que teclees', () => {
        expect(coreTemperature(100_000)).toBe(CORE_MAX_C);
    });

    test('un ritmo negativo no lo enfría por debajo del reposo', () => {
        expect(coreTemperature(-50)).toBe(CORE_MIN_C);
    });

    test('devuelve grados enteros', () => {
        expect(Number.isInteger(coreTemperature(137))).toBe(true);
    });
});
