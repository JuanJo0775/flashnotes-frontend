// src/components/layout/Header.tsx

'use client';

import { formatDate } from '@/lib/utils/formatters';

interface HeaderProps {
    currentView: 'notes' | 'editor' | 'trash';
    onViewChange: (view: 'notes' | 'editor' | 'trash') => void;
}

export default function Header({ currentView, onViewChange }: HeaderProps) {
    const now = new Date();
    const formattedDate = formatDate(now);

    return (
        <header className="terminal-header">
            <div className="flex items-center gap-4">
                <span className="pixel text-xl">[FLASH-NOTES v1.0]</span>
            </div>

            <div className="flex items-center gap-4">
                <span className="mono text-sm">[DATE: {formattedDate}]</span>
            </div>
        </header>
    );
}
