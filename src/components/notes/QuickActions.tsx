// src/components/notes/QuickActions.tsx

'use client';

interface QuickActionsProps {
    noteId: string;
    canUndo: boolean;
    canRedo: boolean;
    onUndo?: () => void;
    onRedo?: () => void;
    onMoveToTrash?: (id: string) => void;
}

export default function QuickActions({
                                         noteId,
                                         canUndo,
                                         canRedo,
                                         onUndo,
                                         onRedo,
                                         onMoveToTrash
                                     }: QuickActionsProps) {
    return (
        <div className="border-t border-t-primary bg-secondary p-4">
            <div className="flex items-center justify-between">
                <div className="comment">ACCIONES_RÁPIDAS:</div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={onUndo}
                        disabled={!canUndo}
                        className="btn-terminal text-xs"
                        title="Deshacer (Ctrl+Z)"
                    >
                        [↶] UNDO
                    </button>

                    <button
                        onClick={onRedo}
                        disabled={!canRedo}
                        className="btn-terminal text-xs"
                        title="Rehacer (Ctrl+Y)"
                    >
                        [↷] REDO
                    </button>

                    <div className="border-l border-l-primary h-6 mx-2" />

                    <button
                        className="btn-terminal text-xs"
                        title="Ver historial"
                    >
                        [◷] HISTORY
                    </button>

                    <button
                        onClick={() => onMoveToTrash && onMoveToTrash(noteId)}
                        className="btn-terminal text-xs"
                        title="Mover a papelera"
                        disabled={!noteId}
                    >
                        [🗑] TRASH
                    </button>
                </div>
            </div>
        </div>
    );
}
