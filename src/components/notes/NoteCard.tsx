// src/components/notes/NoteCard.tsx

'use client';

import type { Note } from '../../types/note.types';
import MetaTag from '@/components/ui/MetaTag';
import { formatFileSize, formatTime } from '@/lib/utils/formatters';

interface NoteCardProps {
    note: Note;
    onClick: () => void;
}

export default function NoteCard({ note, onClick }: NoteCardProps) {
    const preview = note.content.slice(0, 120);
    const hasMore = note.content.length > 120;

    return (
        <button
            onClick={onClick}
            className="file-container text-left hover-dotted w-full p-4 transition-none"
        >
            {/* Título */}
            <div className="mono text-base font-medium mb-2 truncate">
                {note.title || 'Untitled.txt'}
            </div>

            {/* Preview del contenido */}
            <div className="mono text-xs text-meta leading-relaxed mb-3 h-16 overflow-hidden">
                {preview || '(vacío)'}
                {hasMore && '...'}
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-2 flex-wrap">
                <MetaTag size="xs" variant="neutral">
                    {note.updatedAt ? formatTime(note.updatedAt) : '-'}
                </MetaTag>
                <MetaTag size="xs" variant="neutral">
                    {formatFileSize(note.content.length)}
                </MetaTag>
                <MetaTag size="xs" variant="success">
                    [SYNCED]
                </MetaTag>
            </div>

            {/* Borde inferior */}
            <div className="mt-3 pt-2 border-t border-t-dotted flex justify-end">
                <span className="text-xs mono text-meta">[OPEN →]</span>
            </div>
        </button>
    );
}
