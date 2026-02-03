// src/components/layout/StatusBar.tsx

'use client';

import ProgressBar from '@/components/ui/ProgressBar';

interface StatusBarProps {
    notesCount: number;
    browserId: string;
    isLoading: boolean;
    error: string | null;
}

export default function StatusBar({ notesCount, browserId, isLoading, error }: StatusBarProps) {
    // Simular uso de memoria basado en cantidad de notas
    const memoryUsed = Math.min(100, notesCount * 10 + 20);
    const maxMemory = 100;

    const shortId = browserId.slice(0, 8);

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
                    SESSION: {shortId}
                </span>
            </div>

            <div className="flex items-center gap-4">
                <span>FILES: {notesCount}</span>

                <ProgressBar
                    current={memoryUsed}
                    max={maxMemory}
                    label="MEMORY"
                    unit="g"
                />

                <span className="text-meta">60%</span>
            </div>
        </footer>
    );
}
