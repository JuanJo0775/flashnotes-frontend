// src/components/ui/ThemeToggle.tsx
'use client';

import { useTheme, toggleTheme } from '@/hooks/useTheme';
import { useSystemState, registerThemeToggle } from '@/hooks/useSystemState';
import { useT } from '@/i18n';

/**
 * Invierte el tema: papel claro ⇄ cuarto oscuro.
 *
 * Muestra el modo en el que estás, igual que las pestañas de al lado muestran la
 * vista en la que estás. El semicírculo cambia de lado al invertir el tema.
 *
 * (Antes usaba el par de bloques ▓░; a 11px los caracteres de sombreado se
 * renderizan como un damero ilegible.)
 *
 * Y si insistís, se rompe. Siete pulsaciones seguidas rápidas y la señal se cae:
 * la interfaz entera pasa a verse con aberración cromática y el interruptor
 * queda inservible hasta que recargues. Nadie llega ahí sin querer — hay que
 * ensañarse con el botón, que es justo el gesto que el secreto premia.
 */
export default function ThemeToggle() {
    const theme = useTheme();
    const t = useT();
    const { chromaticFailure } = useSystemState();
    const isDark = theme === 'dark';

    // Con la señal caída el botón no hace nada, y lo dice: un control que no
    // responde y no se explica se lee como un bug, no como una avería.
    if (chromaticFailure) {
        return (
            <button
                type="button"
                disabled
                className="nav-tab"
                title={t('theme.signalLostTitle')}
                aria-label={t('theme.signalLostStatus')}
            >
                <span aria-hidden="true">{t('theme.signalLost')}</span>
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={() => {
                // Si ESTE toque es el que rompe la señal, no se cambia el tema
                // además: la pantalla ya tiene bastante con lo que le pasó.
                if (registerThemeToggle()) return;
                toggleTheme();
            }}
            className="nav-tab"
            title={t('theme.switchTo', { mode: t(isDark ? 'theme.modeLight' : 'theme.modeDark') })}
            aria-label={t('theme.status', {
                mode: t(isDark ? 'theme.modeDark' : 'theme.modeLight'),
                other: t(isDark ? 'theme.modeLight' : 'theme.modeDark'),
            })}
        >
            <span aria-hidden="true">
                [{isDark ? '◑' : '◐'} {t(isDark ? 'theme.dark' : 'theme.light')}]
            </span>
        </button>
    );
}
