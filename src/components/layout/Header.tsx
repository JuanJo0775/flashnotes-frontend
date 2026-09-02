// src/components/layout/Header.tsx
'use client';

import ThemeToggle from '@/components/ui/ThemeToggle';
import { useToday } from '@/hooks/useToday';
import { useSystemState } from '@/hooks/useSystemState';
import { reversedDate } from '@/lib/system/v02Chrome';
import SystemLabel from '@/components/layout/SystemLabel';
import LanguageToggle from '@/components/ui/LanguageToggle';
import { useT, type TranslationKey } from '@/i18n';
import type { View } from '@/types/note.types';

interface HeaderProps {
    currentView: View;
    onViewChange: (view: View) => void;
    trashCount?: number;
    /** Cuántas piezas llevás. Sin ninguna, la pestaña ni aparece. */
    collectionCount?: number;
    /** Lo pide el rótulo cuando alguien insiste nueve veces (§5). */
    onCollapse?: () => void;
}

// Las pestañas guardan la CLAVE, no el rótulo: el texto se resuelve en el
// render, que es cuando se sabe el idioma. Una constante de módulo con el texto
// ya traducido se congelaría en el idioma que hubiera al importar el archivo.
const TABS: { view: View; labelKey: TranslationKey }[] = [
    { view: 'notes', labelKey: 'nav.notes' },
    { view: 'trash', labelKey: 'nav.trash' },
    // La colección va la última y con estrella: es lo que se GANA, no una parte
    // de la app que estuviera ahí desde el principio.
    { view: 'collection', labelKey: 'nav.collection' },
];

export default function Header({
    currentView,
    onViewChange,
    trashCount,
    collectionCount,
    onCollapse,
}: HeaderProps) {
    const t = useT();

    // La fecha se pinta sólo en el cliente (ver useToday).
    const { v02 } = useSystemState();
    const today = useToday();

    // LA FECHA DE LA v0.2 SALE DEL REVÉS: `2026.09.02` se lee `20.90.6202`.
    //
    // Se le da la vuelta a la CADENA ENTERA, que es el error de verdad — alguien
    // creyó que eso cambiaba el formato. Invertir el orden de los campos daría
    // `02.09.2026`, que es otro formato correcto, y lo que hace falta acá es uno
    // roto del que se vea enseguida qué le pasó.
    const fecha = today === null ? null : v02 ? reversedDate(today) : today;

    // El editor es una sub-vista de las notas: se marca "Notas" como activa.
    const activeTab: View = currentView === 'trash' ? 'trash' : 'notes';

    return (
        <header className="terminal-header">
            <SystemLabel onCollapse={onCollapse ?? (() => {})} />

            <nav aria-label={t('nav.viewsLabel')} className="flex items-center gap-1">
                {TABS.filter(
                    // Sin ninguna pieza la pestaña NO APARECE. Enseñarla vacía
                    // anunciaría que hay una colección que llenar, y encontrar
                    // la primera pieza es parte de lo que se descubre.
                    ({ view }) => view !== 'collection' || Boolean(collectionCount)
                ).map(({ view, labelKey }) => (
                    <button
                        key={view}
                        type="button"
                        onClick={() => onViewChange(view)}
                        className="nav-tab"
                        aria-current={activeTab === view ? 'page' : undefined}
                    >
                        [{view === 'collection' ? '★ ' : ''}
                        {t(labelKey)}
                        {view === 'trash' && trashCount ? ` ${trashCount}` : ''}
                        {view === 'collection' && collectionCount
                            ? ` ${collectionCount}`
                            : ''}
                        ]
                    </button>
                ))}
            </nav>

            <div className="flex items-center gap-3">
                <LanguageToggle />
                <ThemeToggle />
                <span className="mono text-xs dim" suppressHydrationWarning>
                    [{t('nav.dateLabel')}: {fecha ?? t('nav.datePlaceholder')}]
                </span>
            </div>
        </header>
    );
}
