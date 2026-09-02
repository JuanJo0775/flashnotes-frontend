import { AxiosError, AxiosHeaders } from 'axios';
import { getErrorMessage, getErrorInfo } from '@/lib/api/client';
import { setLang, translateMessage } from '@/i18n';
import type { ApiResponse } from '@/types/api.types';

/** Un error de axios con respuesta del servidor, como el que llega de verdad. */
function httpError(status: number, body: Partial<ApiResponse<unknown>>): AxiosError {
    const error = new AxiosError('Request failed');
    error.response = {
        status,
        statusText: '',
        headers: new AxiosHeaders(),
        config: { headers: new AxiosHeaders() },
        data: { success: false, statusCode: status, ...body },
    };
    return error;
}

/** Sin respuesta: el servidor no contestó. */
function networkError(): AxiosError {
    return new AxiosError('Network Error');
}

describe('getErrorMessage · mapea por código, no por mensaje', () => {
    beforeEach(() => {
        localStorage.clear();
        setLang('es');
    });

    test('el mensaje en español del backend NUNCA se enseña', () => {
        // Esto es lo que arregla el bug: el backend manda `message` siempre en
        // español, y antes se pintaba tal cual aunque la app estuviera en inglés.
        setLang('en');

        const message = getErrorMessage(
            httpError(400, {
                error: 'VALIDATION_FAILED',
                message: 'Validación de datos fallida',
            })
        );

        expect(message).toBe("The data sent isn't valid.");
        expect(message).not.toContain('Validación');
    });

    test('el mismo código da el mismo mensaje en cada idioma', () => {
        const error = httpError(403, { error: 'INVALID_CSRF_TOKEN' });

        setLang('es');
        expect(getErrorMessage(error)).toBe('Tu sesión de seguridad expiró. Recargá la página.');

        setLang('en');
        expect(getErrorMessage(error)).toBe('Your security session expired. Reload the page.');
    });

    test.each([
        ['VALIDATION_FAILED', 400],
        ['INVALID_ID_FORMAT', 400],
        ['PAYLOAD_TOO_LARGE', 413],
        ['INVALID_CSRF_TOKEN', 403],
        ['TOO_MANY_REQUESTS', 429],
        ['UNSUPPORTED_MEDIA_TYPE', 415],
        ['NOT_FOUND', 404],
        ['NO_HISTORY', 400],
        ['NO_REDO', 400],
        ['CONFIGURATION_ERROR', 500],
        ['INTERNAL_SERVER_ERROR', 500],
    ])('conoce el código %s que manda el backend', (code, status) => {
        const message = getErrorMessage(httpError(status, { error: code }));

        // Ni la clave cruda ni el genérico: cada código tiene su texto propio.
        expect(message).not.toContain('error.');
        expect(message).not.toBe('Algo salió mal.');
        expect(message.length).toBeGreaterThan(0);
    });

    test('sin respuesta del servidor lo dice claro', () => {
        expect(getErrorMessage(networkError())).toBe(
            'No se pudo contactar el servidor. Revisá que el backend esté corriendo.'
        );
    });

    test('un código desconocido cae al estado HTTP, no a la clave cruda', () => {
        // Un backend más nuevo puede mandar un código que este frontend no
        // conoce. No se pinta `error.ALGO_NUEVO` en pantalla.
        const message = getErrorMessage(
            httpError(418, { error: 'ALGO_QUE_NO_EXISTE', message: 'soy una tetera' })
        );

        expect(message).toBe('Error 418');
        expect(message).not.toContain('tetera');
    });

    test('los details en español tampoco se cuelan', () => {
        setLang('en');

        const message = getErrorMessage(
            httpError(400, {
                error: 'VALIDATION_FAILED',
                message: 'Validación de datos fallida',
                details: ['El historial no puede superar 20'],
            })
        );

        expect(message).not.toContain('historial');
    });

    test('un Error de JavaScript no enseña su mensaje técnico', () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});

        expect(getErrorMessage(new Error('Cannot read properties of undefined'))).toBe(
            'Algo salió mal.'
        );

        jest.restoreAllMocks();
    });

    test('algo que no es un error tampoco rompe', () => {
        expect(getErrorMessage(null)).toBe('Algo salió mal.');
        expect(getErrorMessage('un string suelto')).toBe('Algo salió mal.');
    });
});

describe('getErrorInfo · devuelve la clave, no el texto', () => {
    // Este bloque existe por un fallo que se vio en pantalla: con la app en
    // español, el error de abajo seguía en inglés. La causa era que el texto se
    // traducía al ocurrir el fallo y se guardaba YA RESUELTO en el estado de
    // React, donde nadie lo volvía a mirar. Guardando la clave, el texto se
    // resuelve en cada render y sigue al idioma.

    test('el mismo error rinde los dos idiomas sin volver a pedirlo', () => {
        const info = getErrorInfo(networkError());

        setLang('es');
        expect(translateMessage('es', info)).toBe(
            'No se pudo contactar el servidor. Revisá que el backend esté corriendo.'
        );

        setLang('en');
        expect(translateMessage('en', info)).toBe(
            "Couldn't reach the server. Check that the backend is running."
        );
    });

    test('lo que se guarda es una clave del diccionario, no una frase', () => {
        const info = getErrorInfo(httpError(403, { error: 'INVALID_CSRF_TOKEN' }));

        expect(info).toEqual({ key: 'error.INVALID_CSRF_TOKEN' });
    });

    test('un código desconocido conserva el estado como variable', () => {
        // La variable viaja con la clave: sin ella, "Error 418" tampoco podría
        // reconstruirse en el otro idioma.
        expect(getErrorInfo(httpError(418, { error: 'NO_EXISTE' }))).toEqual({
            key: 'error.withStatus',
            vars: { status: 418 },
        });
    });
});
