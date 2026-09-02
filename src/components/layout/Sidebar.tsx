// src/components/layout/Sidebar.tsx
'use client';

import type { Note } from '@/types/note.types';
import { formatFileSize, formatTime } from '@/lib/utils/formatters';
import { useT } from '@/i18n';

interface SidebarProps {
    notes: Note[];
    selectedNote: Note | null;
    total: number;
    hasMore: boolean;
    isLoadingMore: boolean;
    onSelectNote: (note: Note) => void;
    onNewNote: () => void;
    onLoadMore: () => void;
}

export default function Sidebar({
    notes,
    selectedNote,
    total,
    hasMore,
    isLoadingMore,
    onSelectNote,
    onNewNote,
    onLoadMore,
}: SidebarProps) {
    const t = useT();

    return (
        <aside className="w-72 shrink-0 border-r border-line bg-secondary flex flex-col">
            <div className="border-b border-line p-4 flex flex-col gap-3">
                <span className="comment">{t('sidebar.selectFile')}</span>
                <button type="button" onClick={onNewNote} className="btn-terminal w-full">
                    {t('sidebar.newNote')}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                {notes.length === 0 ? (
                    <p className="text-center text-meta text-xs mono py-8">
                        {t('sidebar.empty')}
                    </p>
                ) : (
                    <ul className="flex flex-col">
                        {notes.map((note) => {
                            const isActive = selectedNote?._id === note._id;

                            return (
                                <li key={note._id}>
                                    <button
                                        type="button"
                                        onClick={() => onSelectNote(note)}
                                        className="file-row"
                                        aria-current={isActive}
                                    >
                                        {/* Nombre · guía de puntos · estado.
                                            La guía crece para llenar el hueco,
                                            como en el listado de la referencia. */}
                                        <span className="file-row-name">
                                            {note.title || t('common.untitled')}
                                        </span>
                                        <span className="file-row-leader" aria-hidden="true" />
                                        <span className="file-row-status">
                                            {formatFileSize(note.content.length)}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}

                {hasMore && (
                    <button
                        type="button"
                        onClick={onLoadMore}
                        disabled={isLoadingMore}
                        className="btn-terminal w-full mt-2"
                    >
                        {isLoadingMore
                            ? t('common.loading')
                            : t('sidebar.loadMore', { n: total - notes.length })}
                    </button>
                )}
            </div>

            <div className="panel-footer justify-between text-2xs mono text-meta uppercase tracking-wider">
                <span>
                    {notes.length}
                    {total > notes.length ? `/${total}` : ''}{' '}
                    {/* El plural concuerda con lo que hay CARGADO, que es el
                        número que está pegado a la palabra: "1/6 archivos" sería
                        raro, pero "1 archivo" y "6 archivos" son lo correcto. */}
                    {t.plural('sidebar.files', total > notes.length ? total : notes.length)}
                </span>
                <span>
                    {selectedNote?.updatedAt ? formatTime(selectedNote.updatedAt) : t('sidebar.noTime')}
                </span>
            </div>
        </aside>
    );
}
