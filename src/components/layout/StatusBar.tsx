// src/components/layout/StatusBar.tsx
'use client';

import ProgressBar from '@/components/ui/ProgressBar';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { LIMITS } from '@/config/limits';
import type { SaveState } from '@/types/note.types';

interface StatusBarProps {
    notesCount: number;
    isLoading: boolean;
    error: string | null;
    saveState: SaveState;
}

/**
 * Estado del sistema en una línea.
 *
 * La barra ahora dice la verdad sobre el guardado: antes los fallos del
 * auto-guardado sólo iban a console.error, así que si el servidor rechazaba un
 * PATCH el usuario seguía escribiendo sobre datos que no se estaban guardando
 * sin enterarse de nada.
 */
export default function StatusBar({
    notesCount,
    isLoading,
    error,
    saveState,
}: StatusBarProps) {
    const { isOnline, backendReachable, isChecking } = useNetworkStatus();

    const capacity = Math.min(100, Math.round((notesCount / LIMITS.HISTORY_MAX) * 100));

    const systemStatus = () => {
        if (!isOnline) return <span className="text-danger">[SIN_RED]</span>;
        if (!backendReachable && !isChecking)
            return <span className="text-warn">[SERVIDOR_NO_RESPONDE]</span>;
        if (error) return <span className="text-danger">[ERROR]</span>;
        if (isLoading) return <span className="loading-dots">[CARGANDO</span>;
        return <span className="text-ok">[SYSTEM_OK]</span>;
    };

    const saveStatus = () => {
        switch (saveState) {
            case 'saving':
                return <span className="loading-dots dim">[GUARDANDO</span>;
            case 'saved':
                return <span className="text-ok">[GUARDADO]</span>;
            case 'error':
                return <span className="text-danger">[NO_GUARDADO]</span>;
            default:
                return null;
        }
    };

    return (
        <footer className="status-bar" role="status" aria-live="polite">
            <div className="flex items-center gap-4 min-w-0">
                {systemStatus()}
                {saveStatus()}
                {error && (
                    <span className="truncate dim" title={error}>
                        {error}
                    </span>
                )}
            </div>

            <div className="flex items-center gap-4 shrink-0">
                <span className="tabular-nums">FILES: {notesCount}</span>
                <ProgressBar value={capacity} />
                <span className="dim tabular-nums">{capacity}%</span>
            </div>
        </footer>
    );
}
