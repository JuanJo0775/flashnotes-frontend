// src/hooks/useKeyboardShortcuts.ts
'use client';

import { useEffect, useRef } from 'react';

interface KeyboardShortcuts {
    onSave?: () => void;
    onUndo?: () => void;
    onRedo?: () => void;
    onNewNote?: () => void;
    /** Escape: volver atrás. Ver la nota sobre los diálogos más abajo. */
    onEscape?: () => void;
}

/**
 * Atajos de teclado globales.
 *
 * Este hook existía pero no lo importaba nadie, mientras los botones anunciaban
 * "Deshacer (Ctrl+Z)" en su tooltip. Peor: Ctrl+Z dentro del textarea disparaba
 * el deshacer nativo del navegador, que no sabe nada del historial del servidor,
 * y los dos historiales se desincronizaban. Por eso se hace preventDefault.
 *
 * Los callbacks se guardan en una ref para que pasar funciones nuevas en cada
 * render no vuelva a registrar el listener.
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts) {
    const ref = useRef(shortcuts);

    // La ref se sincroniza en un efecto, no durante el render: escribir en una
    // ref mientras se renderiza rompe el render concurrente de React.
    useEffect(() => {
        ref.current = shortcuts;
    });

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const mod = e.ctrlKey || e.metaKey;
            const current = ref.current;

            // Escape va ANTES de la guarda del modificador: es el único atajo
            // que se pulsa solo.
            if (e.key === 'Escape') {
                if (!current.onEscape) return;

                // Ctrl+Escape y Cmd+Escape son del sistema operativo (en Windows
                // abre el menú de inicio). No se tocan.
                if (mod || e.altKey) return;

                // Si hay un <dialog> abierto, Escape es SUYO.
                //
                // ConfirmDialog y DiagnosticPanel usan <dialog> nativo con
                // showModal(), que cierra con Escape por su cuenta. Sin esta
                // guarda una sola pulsación haría las dos cosas: cerrar el
                // diálogo y además salir del editor que hay detrás.
                if (document.querySelector('dialog[open]')) return;

                e.preventDefault();
                current.onEscape();
                return;
            }

            if (!mod) return;

            const key = e.key.toLowerCase();

            // Ctrl/Cmd + Shift + Z, o Ctrl/Cmd + Y → rehacer
            if ((key === 'z' && e.shiftKey) || key === 'y') {
                if (!current.onRedo) return;
                e.preventDefault();
                current.onRedo();
                return;
            }

            switch (key) {
                case 's':
                    if (!current.onSave) return;
                    e.preventDefault();
                    current.onSave();
                    break;

                case 'z':
                    if (!current.onUndo) return;
                    e.preventDefault();
                    current.onUndo();
                    break;

                case 'n':
                    if (!current.onNewNote) return;
                    e.preventDefault();
                    current.onNewNote();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
}
