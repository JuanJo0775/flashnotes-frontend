import { render, screen, fireEvent } from '@testing-library/react';
import LanguageToggle from '@/components/ui/LanguageToggle';
import { LANG_STORAGE_KEY } from '@/config/lang';

function mockBrowserLanguage(value: string) {
    Object.defineProperty(window.navigator, 'language', {
        value,
        configurable: true,
    });
}

describe('LanguageToggle', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.removeAttribute('lang');
        mockBrowserLanguage('es-AR');
    });

    test('muestra el idioma en el que estás, como las pestañas de al lado', () => {
        render(<LanguageToggle />);

        expect(screen.getByRole('button')).toHaveTextContent('ES');
    });

    test('sin elección guardada sigue al navegador', () => {
        mockBrowserLanguage('en-US');

        render(<LanguageToggle />);

        expect(screen.getByRole('button')).toHaveTextContent('EN');
    });

    test('la elección guardada gana sobre la del navegador', () => {
        mockBrowserLanguage('en-US');
        localStorage.setItem(LANG_STORAGE_KEY, 'es');

        render(<LanguageToggle />);

        expect(screen.getByRole('button')).toHaveTextContent('ES');
    });

    test('al pulsarlo cambia el idioma, lo estampa y lo recuerda', () => {
        render(<LanguageToggle />);

        fireEvent.click(screen.getByRole('button'));

        expect(screen.getByRole('button')).toHaveTextContent('EN');
        expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('en');
        expect(document.documentElement.getAttribute('lang')).toBe('en');
    });

    test('se anuncia en el idioma que está mostrando', () => {
        render(<LanguageToggle />);

        const boton = screen.getByRole('button');
        expect(boton).toHaveAccessibleName(/español/i);

        fireEvent.click(boton);

        expect(screen.getByRole('button')).toHaveAccessibleName(/english/i);
    });
});
