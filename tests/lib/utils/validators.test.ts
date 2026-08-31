// tests/lib/utils/validators.test.ts
import {
    isValidObjectId,
    validateTitle,
    validateContent,
    sanitizeInput,
    withIdValidation,
} from '@/lib/utils/validators';

describe('validators - isValidObjectId', () => {
    test('debe aceptar ObjectId válido (24 caracteres hex)', () => {
        expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true);
        expect(isValidObjectId('507f1f77bcf86cd799439012')).toBe(true);
        expect(isValidObjectId('ABCDEF0123456789ABCDEF01')).toBe(true);
        expect(isValidObjectId('abcdef0123456789abcdef01')).toBe(true);
    });

    test('debe rechazar ObjectId inválido', () => {
        expect(isValidObjectId('invalid')).toBe(false);
        expect(isValidObjectId('507f1f77bcf86cd79943901')).toBe(false); // 23 caracteres
        expect(isValidObjectId('507f1f77bcf86cd7994390111')).toBe(false); // 25 caracteres
        expect(isValidObjectId('507f1f77bcf86cd799439G11')).toBe(false); // caracteres no-hex
        expect(isValidObjectId('')).toBe(false);
        expect(isValidObjectId(null)).toBe(false);
        expect(isValidObjectId(undefined)).toBe(false);
        expect(isValidObjectId(123)).toBe(false);
    });
});

describe('validators - validateTitle', () => {
    test('debe aceptar títulos válidos', () => {
        expect(validateTitle('Mi nota')).toEqual({ valid: true });
        expect(validateTitle('Compras - Supermercado')).toEqual({ valid: true });
        expect(validateTitle('TODO: Llamar a Juan')).toEqual({ valid: true });
        expect(validateTitle('Meeting with PM (urgent!)')).toEqual({ valid: true });
        expect(validateTitle('123 números y letras áéíóú')).toEqual({ valid: true });
    });

    test('debe rechazar títulos vacíos o solo espacios', () => {
        const resultEmpty = validateTitle('');
        expect(resultEmpty.valid).toBe(false);
        expect(resultEmpty.error).toContain('no puede estar vacío');

        const resultSpaces = validateTitle('   ');
        expect(resultSpaces.valid).toBe(false);
        expect(resultSpaces.error).toContain('no puede estar vacío');
    });

    test('debe rechazar títulos que exceden 100 caracteres', () => {
        const longTitle = 'a'.repeat(101);
        const result = validateTitle(longTitle);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('100 caracteres');
    });

    test('debe aceptar títulos con exactamente 100 caracteres', () => {
        const exactlyHundred = 'a'.repeat(100);
        expect(validateTitle(exactlyHundred)).toEqual({ valid: true });
    });

    test('debe rechazar no-strings', () => {
        const result = validateTitle(123 as unknown);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('debe ser un texto');
    });

    test('debe rechazar caracteres inválidos (HTML, caracteres de control)', () => {
        const resultHTML = validateTitle('<script>alert("xss")</script>');
        expect(resultHTML.valid).toBe(false);

        const resultControl = validateTitle('Nota\x00maliciosa');
        expect(resultControl.valid).toBe(false);
    });

    test('debe permitir puntuación segura', () => {
        expect(validateTitle('¿Qué hacer hoy?')).toEqual({ valid: true });
        expect(validateTitle('Items: A, B, C')).toEqual({ valid: true });
        expect(validateTitle('50€ - 100$')).toEqual({ valid: true });
    });
});

describe('validators - validateContent', () => {
    test('debe aceptar contenido válido', () => {
        expect(validateContent('Contenido de prueba')).toEqual({ valid: true });
        expect(validateContent('')).toEqual({ valid: true }); // Puede estar vacío
        expect(validateContent('Multi\nlínea\ncontenido')).toEqual({ valid: true });
    });

    test('debe rechazar contenido que excede 10,000 caracteres', () => {
        const tooLong = 'a'.repeat(10001);
        const result = validateContent(tooLong);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('10.000 caracteres');
    });

    test('debe aceptar contenido con exactamente 10,000 caracteres', () => {
        const exactlyTenThousand = 'a'.repeat(10000);
        expect(validateContent(exactlyTenThousand)).toEqual({ valid: true });
    });

    test('debe rechazar no-strings', () => {
        const result = validateContent(123 as unknown);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('debe ser un texto');
    });
});

describe('validators - sanitizeInput', () => {
    test('debe extraer solo campos permitidos', () => {
        const input = {
            title: '  Mi nota  ',
            content: 'Contenido',
            malicious: 'esto no debería estar',
            another: 'tampoco',
        };

        const result = sanitizeInput(input, ['title', 'content']);

        expect(result).toEqual({
            title: 'Mi nota',
            content: 'Contenido',
        });
        expect('malicious' in result).toBe(false);
        expect('another' in result).toBe(false);
    });

    test('debe hacer trim de strings', () => {
        const input = { title: '  espacios  ', content: '  contenido  ' };
        const result = sanitizeInput(input, ['title', 'content']);

        expect(result.title).toBe('espacios');
        expect(result.content).toBe('contenido');
    });

    test('debe manejar input null', () => {
        const result = sanitizeInput(null, ['title']);
        expect(result).toEqual({});
    });

    test('debe manejar campos faltantes', () => {
        const input = { title: 'Mi nota' };
        const result = sanitizeInput(input, ['title', 'content']);

        expect(result).toEqual({ title: 'Mi nota' });
        expect('content' in result).toBe(false);
    });

    test('debe preservar valores no-string', () => {
        const input = {
            title: '  nota  ',
            count: 42,
            active: true,
        };

        const result = sanitizeInput(input, ['title', 'count', 'active']);

        expect(result.title).toBe('nota');
        expect(result.count).toBe(42);
        expect(result.active).toBe(true);
    });
});

describe('validators - withIdValidation', () => {
    test('debe ejecutar operación si el ID es válido', async () => {
        const operation = jest.fn().mockResolvedValue('ok');
        const result = await withIdValidation('507f1f77bcf86cd799439011', operation);

        expect(result).toBe('ok');
        expect(operation).toHaveBeenCalledTimes(1);
    });

    test('debe lanzar error si el ID es inválido', async () => {
        const operation = jest.fn();

        await expect(withIdValidation('invalid-id', operation)).rejects.toThrow('ID inválido');
        expect(operation).not.toHaveBeenCalled();
    });
});
