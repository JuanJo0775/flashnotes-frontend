// src/components/notes/TrashView.tsx
'use client';

import { useState } from 'react';
import { useTrash } from '@/hooks/useTrash';
import MetaTag from '@/components/ui/MetaTag';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { formatFileSize, formatRelativeTime } from '@/lib/utils/formatters';
import { permanentDeleteMessage } from '@/lib/system/lore';
import { GHOST_ID } from '@/lib/system/ghostFile';
import { useSystemState, registerPermanentDelete } from '@/hooks/useSystemState';
import { useT } from '@/i18n';

interface TrashViewProps {
    onCountChange?: (count: number) => void;
}

export default function TrashView({ onCountChange }: TrashViewProps) {
    const { trashedNotes, isLoading, error, restoreNote, deletePermanently, clearError } =
        useTrash();

    // El sistema lleva la cuenta de los borrados definitivos de esta sesión: a
    // partir del quinto, el diálogo deja de ser genérico.
    const { permanentDeletes } = useSystemState();
    const t = useT();

    const [busyId, setBusyId] = useState<string | null>(null);
    // Nota marcada para borrado definitivo. Es la única acción irreversible de
    // la app, y antes se confirmaba con el confirm() nativo del navegador.
    const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(
        null
    );

    const handleRestore = async (id: string) => {
        setBusyId(id);
        const ok = await restoreNote(id);
        setBusyId(null);
        if (ok) onCountChange?.(trashedNotes.length - 1);
    };

    const handleDeleteConfirm = async () => {
        if (!pendingDelete) return;

        setBusyId(pendingDelete.id);
        const ok = await deletePermanently(pendingDelete.id);
        setBusyId(null);
        setPendingDelete(null);

        if (ok) {
            registerPermanentDelete();
            onCountChange?.(trashedNotes.length - 1);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="mono text-lg loading-dots">{t('status.loading')}</p>
            </div>
        );
    }

    return (
        <div className="p-6">
            <ConfirmDialog
                open={pendingDelete !== null}
                title={t('dialog.deleteTitle')}
                message={permanentDeleteMessage(
                    pendingDelete?.title ?? '',
                    permanentDeletes
                )}
                confirmLabel={t('dialog.deleteConfirm')}
                danger
                busy={busyId !== null}
                onConfirm={handleDeleteConfirm}
                onCancel={() => setPendingDelete(null)}
            />

            <h2 className="section-header flex items-baseline justify-between gap-4">
                <span>{t('nav.trash')}</span>
                <span className="mono text-xs text-meta tabular-nums">
                    {trashedNotes.length}
                </span>
            </h2>

            {error && (
                <div className="notice mb-4" role="alert">
                    <span>{t(error.key, error.vars)}</span>
                    <button
                        type="button"
                        onClick={clearError}
                        className="btn-terminal"
                        aria-label={t('error.dismiss')}
                    >
                        [X]
                    </button>
                </div>
            )}

            {trashedNotes.length === 0 ? (
                <p className="text-center text-meta mono text-sm py-10">
                    {t('trash.empty')}
                </p>
            ) : (
                <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {trashedNotes.map((note) => {
                        const busy = busyId === note._id;

                        return (
                            <li
                                key={note._id}
                                className="border border-line bg-tertiary p-4 flex flex-col gap-3"
                            >
                                <p className="mono text-base font-medium truncate">
                                    {note.title || t('common.untitled')}
                                </p>

                                <p className="mono text-xs text-meta leading-relaxed h-14 overflow-hidden whitespace-pre-wrap">
                                    {note.content?.slice(0, 140) || t('common.empty')}
                                    {(note.content?.length ?? 0) > 140 && '…'}
                                </p>

                                <div className="flex items-center gap-2 flex-wrap">
                                    <MetaTag>
                                        {note.updatedAt
                                            ? formatRelativeTime(note.updatedAt)
                                            : t('common.dash')}
                                    </MetaTag>
                                    <MetaTag>
                                        {formatFileSize(note.content?.length ?? 0)}
                                    </MetaTag>
                                    {/* El archivo fantasma se distingue SIEMPRE:
                                        lleva [SISTEMA] en vez de [ELIMINADA].
                                        Es un chiste, no una trampa — nadie debe
                                        poder confundirlo con una nota suya. */}
                                    {note._id === GHOST_ID ? (
                                        <MetaTag variant="warning">{t('trash.systemFile')}</MetaTag>
                                    ) : (
                                        <MetaTag variant="error">{t('trash.deleted')}</MetaTag>
                                    )}
                                </div>

                                <div className="flex gap-2 pt-3 border-t border-line-soft">
                                    <button
                                        type="button"
                                        onClick={() => handleRestore(note._id)}
                                        disabled={busy}
                                        className="btn-terminal flex-1"
                                    >
                                        {busy ? t('trash.busy') : t('trash.restore')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setPendingDelete({
                                                id: note._id,
                                                title: note.title || t('common.untitled'),
                                            })
                                        }
                                        disabled={busy}
                                        className="btn-terminal is-danger flex-1"
                                    >
                                        {t('trash.delete')}
                                    </button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
