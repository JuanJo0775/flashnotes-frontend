// tests/lib/utils/formatters.test.ts
import {
    formatDate,
    formatTime,
    formatDateTime,
    formatFileSize,
    formatRelativeTime,
    truncateText,
    shortId,
} from '@/lib/utils/formatters';

// Fecha fija para tests consistentes
const testDate = new Date('2026-02-04T14:30:45.000Z');

describe('formatters - formatDate', () => {
    test('debe formatear fecha correctamente desde Date object', () => {
        const date = new Date('2026-02-04');
        expect(formatDate(date)).toMatch(/\d{4}\.\d{2}\.\d{2}/);
    });

    test('debe formatear fecha correctamente desde string', () => {
        expect(formatDate('2026-02-04')).toMatch(/\d{4}\.\d{2}\.\d{2}/);
    });

    test('debe rellenar con ceros', () => {
        // Se construye en hora LOCAL, no desde una cadena UTC: `new Date('2026-01-05')`
        // se interpreta como medianoche UTC, que en UTC-3 es el día 4 por la
        // noche. Con las fechas ya en la hora del dispositivo, el test tenía que
        // dejar de depender del huso de quien lo corre.
        const date = new Date(2026, 0, 5);
        expect(formatDate(date)).toBe('2026.01.05');
    });

    test('usa la fecha del dispositivo, no la UTC', () => {
        // El caso que motivó el cambio: a alguien en UTC-3, a las 22:00 la app
        // le mostraba la fecha de MAÑANA. Una app de notas que se equivoca de
        // día no tiene ninguna gracia.
        const casiMedianoche = new Date(2026, 1, 4, 22, 30);
        expect(formatDate(casiMedianoche)).toBe('2026.02.04');
    });
});

describe('formatters - formatTime', () => {
    test('debe formatear hora correctamente', () => {
        expect(formatTime(testDate)).toMatch(/\d{2}:\d{2}:\d{2}/);
    });

    test('debe rellenar con ceros', () => {
        const date = new Date(2026, 1, 4, 1, 5, 9);
        expect(formatTime(date)).toBe('01:05:09');
    });

    test('debe manejar medianoche', () => {
        const date = new Date(2026, 1, 4, 0, 0, 0);
        expect(formatTime(date)).toBe('00:00:00');
    });

    test('usa la hora del dispositivo', () => {
        // Una nota guardada a las 22:00 tiene que decir 22:00, no 01:00 del día
        // siguiente.
        expect(formatTime(new Date(2026, 1, 4, 22, 0, 0))).toBe('22:00:00');
    });
});

describe('formatters - formatDateTime', () => {
    test('debe combinar fecha y hora', () => {
        const result = formatDateTime(testDate);
        expect(result).toMatch(/\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2}/);
        expect(result).toContain(' ');
    });
});

describe('formatters - formatFileSize', () => {
    test('debe formatear bytes', () => {
        expect(formatFileSize(0)).toBe('0b');
        expect(formatFileSize(1)).toBe('1b');
        expect(formatFileSize(512)).toBe('512b');
    });

    test('debe formatear kilobytes', () => {
        expect(formatFileSize(1024)).toBe('1.0kb');
        expect(formatFileSize(2048)).toBe('2.0kb');
        expect(formatFileSize(1536)).toBe('1.5kb');
    });

    test('debe formatear megabytes', () => {
        expect(formatFileSize(1024 * 1024)).toBe('1.0mb');
        expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5mb');
    });

    test('debe formatear gigabytes', () => {
        expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.0gb');
        expect(formatFileSize(2.5 * 1024 * 1024 * 1024)).toBe('2.5gb');
    });
});

describe('formatters - formatRelativeTime', () => {
    test('debe retornar "ahora" para tiempos muy recientes', () => {
        const recent = new Date(Date.now() - 5000); // 5 segundos atrás
        expect(formatRelativeTime(recent)).toBe('ahora');
    });

    test('debe retornar segundos', () => {
        const past = new Date(Date.now() - 30000); // 30 segundos atrás
        const result = formatRelativeTime(past);
        expect(result).toMatch(/\d+s/);
    });

    test('debe retornar minutos', () => {
        const past = new Date(Date.now() - 5 * 60 * 1000); // 5 minutos atrás
        const result = formatRelativeTime(past);
        expect(result).toMatch(/\d+m/);
    });

    test('debe retornar horas', () => {
        const past = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3 horas atrás
        const result = formatRelativeTime(past);
        expect(result).toMatch(/\d+h/);
    });

    test('debe retornar días', () => {
        const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 días atrás
        const result = formatRelativeTime(past);
        expect(result).toMatch(/\d+d/);
    });

    test('debe retornar fecha completa para fechas antiguas', () => {
        const past = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000); // 40 días atrás
        const result = formatRelativeTime(past);
        expect(result).toMatch(/\d{4}\.\d{2}\.\d{2}/);
    });

    test('debe aceptar string date', () => {
        const result = formatRelativeTime('2026-02-04T14:30:45.000Z');
        expect(typeof result).toBe('string');
    });
});

describe('formatters - truncateText', () => {
    test('no debe truncar si está dentro del límite', () => {
        expect(truncateText('Hola', 10)).toBe('Hola');
        expect(truncateText('Hola mundo', 10)).toBe('Hola mundo');
    });

    test('debe truncar y agregar ellipsis si excede', () => {
        const result = truncateText('Hola mundo de prueba', 11);
        expect(result).toBe('Hola mun...');
        expect(result.endsWith('...')).toBe(true);
    });

    test('debe manejar longitud exacta', () => {
        expect(truncateText('12345', 5)).toBe('12345');
        expect(truncateText('123456', 5)).toBe('12...');
    });

    test('debe manejar texto vacío', () => {
        expect(truncateText('', 10)).toBe('');
    });

    test('debe manejar longitud mínima', () => {
        const result = truncateText('Hola mundo', 1);
        expect(result).toBe('H...');
    });
});

describe('formatters - shortId', () => {
    test('debe retornar primeros 8 caracteres por defecto', () => {
        expect(shortId('507f1f77bcf86cd799439011')).toBe('507f1f77');
    });

    test('debe respetar longitud personalizada', () => {
        expect(shortId('507f1f77bcf86cd799439011', 4)).toBe('507f');
        expect(shortId('507f1f77bcf86cd799439011', 12)).toBe('507f1f77bcf8');
    });

    test('debe manejar IDs cortos', () => {
        expect(shortId('abc', 8)).toBe('abc');
    });
});
