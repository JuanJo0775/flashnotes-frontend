// src/components/notes/NotesList.tsx
'use client';

import type { Note } from '@/types/note.types';
import NoteCard from './NoteCard';
import TypewriterText from '@/components/effects/TypewriterText';
import { useT } from '@/i18n';

interface NotesListProps {
    notes: Note[];
    isLoading: boolean;
    hasMore: boolean;
    isLoadingMore: boolean;
    total: number;
    onSelectNote: (note: Note) => void;
    onNewNote: () => void;
    onLoadMore: () => void;
}

export default function NotesList({
    notes,
    isLoading,
    hasMore,
    isLoadingMore,
    total,
    onSelectNote,
    onNewNote,
    onLoadMore,
}: NotesListProps) {
    const t = useT();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center flex flex-col gap-3">
                    <p className="mono text-lg loading-dots">{t('list.loading')}</p>
                    <p className="text-meta text-xs mono">
                        {t('list.loadingDetail')}
                    </p>
                </div>
            </div>
        );
    }

    if (notes.length === 0) {
        return (
            <div className="flex items-center justify-center h-full p-6">
                <div className="text-center max-w-sm flex flex-col gap-5 items-center">
                    <p className="pixel text-3xl">
                        <TypewriterText text={t('list.emptyBanner')} speed={45} />
                    </p>
                    <p className="mono text-sm text-meta">
                        {t('list.emptyLine1')}
                        <br />
                        {t('list.emptyLine2')}
                    </p>
                    <button type="button" onClick={onNewNote} className="btn-terminal">
                        {t('list.createFirst')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <h2 className="section-header flex items-baseline justify-between gap-4">
                <span>{t('list.available')}</span>
                <span className="mono text-xs text-meta tabular-nums">
                    {notes.length}
                    {total > notes.length ? ` / ${total}` : ''}
                </span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {notes.map((note) => (
                    <NoteCard
                        key={note._id}
                        note={note}
                        onClick={() => onSelectNote(note)}
                    />
                ))}
            </div>

            <hr className="rule-dashed my-6" />

            <div className="flex items-center gap-2">
                <button type="button" onClick={onNewNote} className="btn-terminal">
                    {t('list.newFile')}
                </button>

                {hasMore && (
                    <button
                        type="button"
                        onClick={onLoadMore}
                        disabled={isLoadingMore}
                        className="btn-terminal"
                    >
                        {isLoadingMore
                            ? t('common.loading')
                            : t('list.loadMore', { n: total - notes.length })}
                    </button>
                )}
            </div>
        </div>
    );
}
