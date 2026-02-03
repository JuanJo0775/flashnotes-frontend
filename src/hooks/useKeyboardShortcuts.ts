import { useEffect } from 'react';

interface KeyboardShortcuts {
    onSave?: () => void;
    onUndo?: () => void;
    onRedo?: () => void;
    onNewNote?: () => void;
    onSearch?: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl/Cmd + S: Guardar
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                shortcuts.onSave?.();
            }

            // Ctrl/Cmd + Z: Undo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                shortcuts.onUndo?.();
            }

            // Ctrl/Cmd + Shift + Z o Ctrl/Cmd + Y: Redo
            if (
                ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') ||
                ((e.ctrlKey || e.metaKey) && e.key === 'y')
            ) {
                e.preventDefault();
                shortcuts.onRedo?.();
            }

            // Ctrl/Cmd + N: Nueva nota
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                shortcuts.onNewNote?.();
            }

            // Ctrl/Cmd + K: Buscar
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                shortcuts.onSearch?.();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shortcuts]);
}