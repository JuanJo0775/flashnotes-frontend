import { render, screen, fireEvent } from '@testing-library/react';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { THEME_STORAGE_KEY, THEME_BOOT_SCRIPT } from '@/config/theme';

/**
 * jsdom no implementa matchMedia. Se simula para poder controlar la preferencia
 * del sistema, que es la que manda cuando no hay elección guardada.
 */
function mockSystemPrefersDark(prefersDark: boolean) {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation((query: string) => ({
            matches: prefersDark && query.includes('dark'),
            media: query,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
        })),
    });
}

describe('ThemeToggle', () => {
    beforeEach(() => {
        jest.resetModules();
        localStorage.clear();
        document.documentElement.removeAttribute('data-theme');
        mockSystemPrefersDark(false);
    });

    test('sin elección guardada, refleja la preferencia del sistema', () => {
        mockSystemPrefersDark(true);
        render(<ThemeToggle />);

        expect(screen.getByRole('button')).toHaveTextContent('OSCURO');
    });

    test('la elección guardada gana sobre la del sistema', () => {
        mockSystemPrefersDark(true);
        localStorage.setItem(THEME_STORAGE_KEY, 'light');

        render(<ThemeToggle />);

        expect(screen.getByRole('button')).toHaveTextContent('CLARO');
    });

    test('al pulsarlo invierte el tema, lo estampa y lo recuerda', () => {
        render(<ThemeToggle />);
        const boton = screen.getByRole('button');

        expect(boton).toHaveTextContent('CLARO');

        fireEvent.click(boton);

        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
        expect(boton).toHaveTextContent('OSCURO');

        fireEvent.click(boton);

        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
        expect(boton).toHaveTextContent('CLARO');
    });

    test('describe la acción para lectores de pantalla', () => {
        render(<ThemeToggle />);

        expect(screen.getByRole('button')).toHaveAccessibleName(
            /tema claro.*cambiar a oscuro/i
        );
    });
});

describe('Script de arranque del tema', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.removeAttribute('data-theme');
    });

    /**
     * Regresión: `layout.tsx` es un Server Component e importaba la clave desde
     * un módulo marcado `'use client'`. El servidor recibía una referencia al
     * cliente en lugar del valor, así que el script salía al HTML como
     * `localStorage.getItem(undefined)` y el tema guardado no se aplicaba nunca:
     * la página cargaba con el tema del sistema y el botón decía otra cosa.
     */
    test('lleva la clave de verdad, no undefined', () => {
        expect(THEME_BOOT_SCRIPT).toContain(`"${THEME_STORAGE_KEY}"`);
        expect(THEME_BOOT_SCRIPT).not.toContain('undefined');
    });

    test('aplica el tema guardado sobre el documento', () => {
        localStorage.setItem(THEME_STORAGE_KEY, 'dark');

        // Se ejecuta el mismo cuerpo que se sirve en el HTML, para probar el
        // script de verdad y no una copia que pueda quedar desincronizada.
        (0, eval)(THEME_BOOT_SCRIPT);

        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    test('no estampa nada si no hay elección guardada', () => {
        // Se ejecuta el mismo cuerpo que se sirve en el HTML, para probar el
        // script de verdad y no una copia que pueda quedar desincronizada.
        (0, eval)(THEME_BOOT_SCRIPT);

        // Sin atributo, manda prefers-color-scheme, que es lo que se busca.
        expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    });
});
