// src/components/notes/NoteCard.tsx
'use client';

import type { Note } from '@/types/note.types';
import MetaTag from '@/components/ui/MetaTag';
import { formatFileSize, formatRelativeTime } from '@/lib/utils/formatters';

const PREVIEW_LENGTH = 140;

interface NoteCardProps {
    note: Note;
    onClick: () => void;
}

export default function NoteCard({ note, onClick }: NoteCardProps) {
    const preview = note.content.slice(0, PREVIEW_LENGTH);
    const truncated = note.content.length > PREVIEW_LENGTH;

    return (
        <button type="button" onClick={onClick} className="file-container text-left">
            <span className="block mono text-base font-medium truncate mb-2">
                {note.title || 'Sin_titulo.txt'}
            </span>

            <span className="block mono text-xs dim leading-relaxed mb-3 h-14 overflow-hidden whitespace-pre-wrap">
                {preview || '(vacío)'}
                {truncated && '…'}
            </span>

            <span className="flex items-center gap-2 flex-wrap">
                <MetaTag>
                    {note.updatedAt ? formatRelativeTime(note.updatedAt) : '—'}
                </MetaTag>
                <MetaTag>{formatFileSize(note.content.length)}</MetaTag>
            </span>

            <span className="flex justify-end mt-3 pt-2 border-t border-line-soft text-2xs mono dim uppercase tracking-wider">
                [Abrir →]
            </span>
        </button>
    );
}
