// src/components/ui/ConfirmDialog.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useT } from '@/i18n';

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    /** Por defecto, el [✗] Cancelar del idioma actual. */
    cancelLabel?: string;
    /** Marca la acción como irreversible: cambia el color y a quién se da el foco. */
    danger?: boolean;
    busy?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * Diálogo de confirmación único de la app.
 *
 * ORDEN DE LOS BOTONES: cancelar primero, confirmar después.
 *
 * Es la misma regla que siguen los demás grupos de botones de la app —la acción
 * que retrocede o es más segura va primero, la que avanza o destruye va última—
 * y por eso en la papelera se lee "Restaurar · Eliminar" y en el editor
 * "Undo · Redo · Papelera". Este diálogo era el único al revés.
 *
 * EL FOCO va a cancelar cuando la acción es irreversible, y a confirmar cuando
 * se puede deshacer. Así, pulsar Enter sin leer nunca borra nada para siempre,
 * pero tampoco estorba en una confirmación de trámite.
 *
 * Se aplica a mano DESPUÉS de showModal(), no con `autoFocus`: React implementa
 * autoFocus llamando a .focus() al montar, y en ese momento el <dialog> todavía
 * está cerrado, así que no surte efecto. Al abrirse, el navegador aplica su
 * propio algoritmo y enfoca el primer elemento enfocable — con el atributo
 * autoFocus puesto, el foco caía siempre en el primer botón.
 *
 * Se apoya en <dialog> nativo con showModal(), que da trampa de foco, cierre con
 * Escape y capa superior sin ninguna librería.
 */
export default function ConfirmDialog({
    open,
    title,
    message,
    confirmLabel,
    cancelLabel,
    danger = false,
    busy = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const t = useT();
    // El valor por defecto no puede ir en la firma: depende del idioma, que
    // sólo se conoce dentro del componente.
    const cancelText = cancelLabel ?? t('dialog.cancel');

    const ref = useRef<HTMLDialogElement>(null);
    const confirmRef = useRef<HTMLButtonElement>(null);
    const cancelRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;

        if (open && !dialog.open) {
            dialog.showModal();
            (danger ? cancelRef : confirmRef).current?.focus();
        } else if (!open && dialog.open) {
            dialog.close();
        }
    }, [open, danger]);

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
                        ref={cancelRef}
                        type="button"
                        onClick={onCancel}
                        disabled={busy}
                        className="btn-terminal"
                    >
                        {cancelText}
                    </button>
                    <button
                        ref={confirmRef}
                        type="button"
                        onClick={onConfirm}
                        disabled={busy}
                        className={`btn-terminal${danger ? ' is-danger' : ''}`}
                    >
                        {busy ? '[...] Procesando' : confirmLabel}
                    </button>
                </div>
            </div>
        </dialog>
    );
}
