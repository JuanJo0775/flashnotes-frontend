// src/components/layout/Header.tsx
'use client';

import { useSyncExternalStore } from 'react';
import { formatDate } from '@/lib/utils/formatters';
import ThemeToggle from '@/components/ui/ThemeToggle';
import type { View } from '@/types/note.types';

interface HeaderProps {
    currentView: View;
    onViewChange: (view: View) => void;
    trashCount?: number;
}

// La fecha no cambia mientras la pestaña está abierta: no hay nada a lo que
// suscribirse, sólo la diferencia entre el render del servidor y el del cliente.
const subscribeToNothing = () => () => {};
const getToday = () => formatDate(new Date());
const getNoDate = () => null;

const TABS: { view: View; label: string }[] = [
    { view: 'notes', label: 'Notas' },
    { view: 'trash', label: 'Papelera' },
];

export default function Header({ currentView, onViewChange, trashCount }: HeaderProps) {
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
            <span className="pixel">[FLASH-NOTES v1.0]</span>

            <nav aria-label="Vistas" className="flex items-center gap-1">
                {TABS.map(({ view, label }) => (
                    <button
                        key={view}
                        type="button"
                        onClick={() => onViewChange(view)}
                        className="nav-tab"
                        aria-current={activeTab === view ? 'page' : undefined}
                    >
                        [{label}
                        {view === 'trash' && trashCount ? ` ${trashCount}` : ''}]
                    </button>
                ))}
            </nav>

            <div className="flex items-center gap-3">
                <ThemeToggle />
                <span className="mono text-xs dim" suppressHydrationWarning>
                    [DATE: {today ?? '----.--.--'}]
                </span>
            </div>
        </header>
    );
}
