// src/components/ui/LanguageToggle.tsx
'use client';

import { useLang, toggleLang, useT } from '@/i18n';

/**
 * Cambia el idioma de toda la interfaz: español ⇄ inglés.
 *
 * Muestra el idioma en el que ESTÁS, no al que irías — la misma regla que sigue
 * `ThemeToggle` al lado y que siguen las pestañas de la cabecera, que marcan la
 * vista actual y no la siguiente. Un control que anuncia su destino en vez de su
 * estado obliga a leerlo dos veces.
 *
 * El rótulo va `aria-hidden` y el nombre accesible lo pone `aria-label`, igual
 * que en el resto de la app: `[ES]` leído en voz alta no dice nada.
 */
export default function LanguageToggle() {
    const lang = useLang();
    const t = useT();

    return (
        <button
            type="button"
            onClick={toggleLang}
            className="nav-tab"
            title={t('lang.switchTo')}
            aria-label={t('lang.status')}
            lang={lang}
        >
            <span aria-hidden="true">[{t('lang.code')}]</span>
        </button>
    );
}
