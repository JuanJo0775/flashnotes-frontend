// src/components/ui/ConfirmDialog.tsx
'use client';

import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel?: string;
    /** Marca la acción como irreversible: cambia el color y el énfasis. */
    danger?: boolean;
    busy?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * Diálogo de confirmación único de la app.
 *
 * Antes había dos patrones distintos: el editor usaba un div posicionado (sin
 * trampa de foco, sin Escape, y se podía tabular por detrás hasta el editor) y
 * la papelera usaba el confirm() nativo del navegador — justo en la única
 * acción irreversible, y rompiendo el diseño.
 *
 * Se apoya en <dialog> nativo con showModal(), que da trampa de foco, cierre con
 * Escape y capa superior sin ninguna librería.
 */
export default function ConfirmDialog({
    open,
    title,
    message,
    confirmLabel,
    cancelLabel = '[✗] Cancelar',
    danger = false,
    busy = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const ref = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;

        if (open && !dialog.open) {
            dialog.showModal();
        } else if (!open && dialog.open) {
            dialog.close();
        }
    }, [open]);

    return (
        <dialog
            ref={ref}
            className="dialog-terminal"
            aria-labelledby="confirm-dialog-title"
            // Escape dispara `cancel`; se enruta al mismo camino que el botón
            // Cancelar para que el estado del padre no quede desincronizado.
            onCancel={(e) => {
                e.preventDefault();
                onCancel();
            }}
        >
            <h2 id="confirm-dialog-title" className="dialog-title">
                {title}
            </h2>

            <div className="dialog-body">
                <p className="mono text-sm">{message}</p>

                <div className="dialog-actions">
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={busy}
                        className={`btn-terminal${danger ? ' is-danger' : ''}`}
                        autoFocus
                    >
                        {busy ? '[...] Procesando' : confirmLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={busy}
                        className="btn-terminal"
                    >
                        {cancelLabel}
                    </button>
                </div>
            </div>
        </dialog>
    );
}
