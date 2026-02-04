// src/components/layout/StatusBar.tsx

'use client';

import ProgressBar from '@/components/ui/ProgressBar';
import { APP_CONSTANTS } from '@/config/constants';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

interface StatusBarProps {
    notesCount: number;
    isLoading: boolean;
    error: string | null;
}

export default function StatusBar({ notesCount, isLoading, error }: StatusBarProps) {
    const { isOnline, backendReachable, isFullyOperational } = useNetworkStatus();
    
    // memory ahora es solo un contador de archivos activos (no bytes)
    const maxFiles = APP_CONSTANTS.MAX_FILES || 10;
    const memoryPercent = Math.round(Math.min(100, (notesCount / maxFiles) * 100));

    // Determinar estado del sistema
    const getSystemStatus = () => {
        if (error) {
            return <span className="text-red-500">[ERROR: {error}]</span>;
        }
        if (!isOnline) {
            return <span className="text-red-500">⚠ SIN CONEXIÓN A RED</span>;
        }
        if (!backendReachable) {
            return <span className="text-yellow-500">⚠ BACKEND NO DISPONIBLE</span>;
        }
        if (isLoading) {
            return <span className="loading-dots">[LOADING</span>;
        }
        if (isFullyOperational) {
            return <span className="text-green-400">[SYSTEM_OK]</span>;
        }
        return <span>[CHECKING...]</span>;
    };

    return (
        <footer className="status-bar">
            <div className="flex items-center gap-4">
                {getSystemStatus()}

                <span className="text-meta">
                    SESSION: ANON
                </span>
            </div>

            <div className="flex items-center gap-4">
                <span>FILES: {notesCount}</span>

                <ProgressBar
                    current={memoryPercent}
                    max={100}
                    label="FILES"
                    unit="%"
                />

                <span className="text-meta">{memoryPercent}%</span>
            </div>
        </footer>
    );
}
