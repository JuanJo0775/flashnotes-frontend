// src/components/layout/StatusBar.tsx

'use client';

import ProgressBar from '@/components/ui/ProgressBar';
import { APP_CONSTANTS } from '@/config/constants';

interface StatusBarProps {
    notesCount: number;
    isLoading: boolean;
    error: string | null;
}

export default function StatusBar({ notesCount, isLoading, error }: StatusBarProps) {
    // memory ahora es solo un contador de archivos activos (no bytes)
    const maxFiles = APP_CONSTANTS.MAX_FILES || 10;
    const memoryPercent = Math.round(Math.min(100, (notesCount / maxFiles) * 100));

    return (
        <footer className="status-bar">
            <div className="flex items-center gap-4">
                {error ? (
                    <span className="text-red-500">[ERROR: {error}]</span>
                ) : isLoading ? (
                    <span className="loading-dots">[LOADING</span>
                ) : (
                    <span>[SYSTEM_OK]</span>
                )}

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
