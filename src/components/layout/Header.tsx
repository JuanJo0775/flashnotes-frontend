// src/components/layout/Header.tsx
'use client';

import { useSyncExternalStore } from 'react';
import { formatDate } from '@/lib/utils/formatters';
import ThemeToggle from '@/components/ui/ThemeToggle';
import SystemLabel from '@/components/layout/SystemLabel';
import LanguageToggle from '@/components/ui/LanguageToggle';
import { useT, type TranslationKey } from '@/i18n';
import type { View } from '@/types/note.types';

interface HeaderProps {
    currentView: View;
    onViewChange: (view: View) => void;
    trashCount?: number;
    /** Lo pide el rótulo cuando alguien insiste nueve veces (§5). */
    onCollapse?: () => void;
}

// La fecha no cambia mientras la pestaña está abierta: no hay nada a lo que
// suscribirse, sólo la diferencia entre el render del servidor y el del cliente.
const subscribeToNothing = () => () => {};
const getToday = () => formatDate(new Date());
const getNoDate = () => null;

// Las pestañas guardan la CLAVE, no el rótulo: el texto se resuelve en el
// render, que es cuando se sabe el idioma. Una constante de módulo con el texto
// ya traducido se congelaría en el idioma que hubiera al importar el archivo.
const TABS: { view: View; labelKey: TranslationKey }[] = [
    { view: 'notes', labelKey: 'nav.notes' },
    { view: 'trash', labelKey: 'nav.trash' },
];

export default function Header({
    currentView,
    onViewChange,
    trashCount,
    onCollapse,
}: HeaderProps) {
    const t = useT();

    // La fecha se pinta sólo en el cliente.
    //
    // Antes era `formatDate(new Date())` directo en el render: Next lo evaluaba
    // en el servidor y otra vez en el cliente, con instantes distintos, y React
    // tiraba un error de hidratación en cada carga.
    //
    // useSyncExternalStore con un snapshot de servidor distinto es la forma que
    // React ofrece para esto: el servidor pinta el marcador de posición, el
    // cliente pinta la fecha, y no hay desajuste ni setState en un efecto.
    const today = useSyncExternalStore(subscribeToNothing, getToday, getNoDate);

    // El editor es una sub-vista de las notas: se marca "Notas" como activa.
    const activeTab: View = currentView === 'trash' ? 'trash' : 'notes';

    return (
        <header className="terminal-header">
            <SystemLabel onCollapse={onCollapse ?? (() => {})} />

            <nav aria-label={t('nav.viewsLabel')} className="flex items-center gap-1">
                {TABS.map(({ view, labelKey }) => (
                    <button
                        key={view}
                        type="button"
                        onClick={() => onViewChange(view)}
                        className="nav-tab"
                        aria-current={activeTab === view ? 'page' : undefined}
                    >
                        [{t(labelKey)}
                        {view === 'trash' && trashCount ? ` ${trashCount}` : ''}]
                    </button>
                ))}
            </nav>

            <div className="flex items-center gap-3">
                <LanguageToggle />
                <ThemeToggle />
                <span className="mono text-xs dim" suppressHydrationWarning>
                    [{t('nav.dateLabel')}: {today ?? t('nav.datePlaceholder')}]
                </span>
            </div>
        </header>
    );
}
