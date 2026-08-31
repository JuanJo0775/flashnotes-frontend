// src/components/ui/ThemeToggle.tsx
'use client';

import { useTheme, toggleTheme } from '@/hooks/useTheme';

/**
 * Invierte el tema: papel claro ⇄ cuarto oscuro.
 *
 * Muestra el modo en el que estás, igual que las pestañas de al lado muestran la
 * vista en la que estás. El semicírculo cambia de lado al invertir el tema.
 *
 * (Antes usaba el par de bloques ▓░; a 11px los caracteres de sombreado se
 * renderizan como un damero ilegible.)
 */
export default function ThemeToggle() {
    const theme = useTheme();
    const isDark = theme === 'dark';

    return (
        <button
            type="button"
            onClick={toggleTheme}
            className="nav-tab"
            title={`Cambiar a tema ${isDark ? 'claro' : 'oscuro'}`}
            aria-label={`Tema ${isDark ? 'oscuro' : 'claro'}. Pulsá para cambiar a ${isDark ? 'claro' : 'oscuro'}.`}
        >
            <span aria-hidden="true">[{isDark ? '◑' : '◐'} {isDark ? 'OSCURO' : 'CLARO'}]</span>
        </button>
    );
}
