// src/app/page.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import StatusBar from '@/components/layout/StatusBar';
import NoteEditor from '@/components/notes/NoteEditor';
import NotesList from '@/components/notes/NotesList';
import TrashView from '@/components/notes/TrashView';
import { useNotes } from '@/hooks/useNotes';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { initializeCsrfToken } from '@/lib/api/client';
import type { Note, SaveState, View } from '@/types/note.types';

export default function Home() {
    const [view, setView] = useState<View>('notes');
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [saveState, setSaveState] = useState<SaveState>('idle');
    const [showFlash, setShowFlash] = useState(true);

    const {
        notes,
        isLoading,
        isLoadingMore,
        hasMore,
        total,
        error,
        createNote,
        updateNote,
        moveToTrash,
        loadMore,
        refreshNotes,
    } = useNotes();

    const { undo, redo, error: historyError } = useUndoRedo();

    useEffect(() => {
        void initializeCsrfToken();
    }, []);

    useEffect(() => {
        const t = setTimeout(() => setShowFlash(false), 240);
        return () => clearTimeout(t);
    }, []);

    const handleNewNote = useCallback(async () => {
        const newNote = await createNote({ title: 'Nueva nota', content: '' });
        if (newNote) {
            setSelectedNote(newNote);
            setSaveState('idle');
            setView('editor');
        }
    }, [createNote]);

    const handleSelectNote = useCallback((note: Note) => {
        setSelectedNote(note);
        setSaveState('idle');
        setView('editor');
    }, []);

    const handleBackToList = useCallback(() => {
        setSelectedNote(null);
        setSaveState('idle');
        setView('notes');
        void refreshNotes();
    }, [refreshNotes]);

    const handleViewChange = useCallback(
        (next: View) => {
            setSelectedNote(null);
            setSaveState('idle');
            setView(next);
            if (next === 'notes') void refreshNotes();
        },
        [refreshNotes]
    );

    const handleMoveToTrash = useCallback(
        async (id: string) => {
            const ok = await moveToTrash(id);
            if (ok) {
                setSelectedNote(null);
                setView('notes');
            }
            return ok;
        },
        [moveToTrash]
    );

    // Ctrl+N funciona en cualquier vista. Los atajos del editor (Ctrl+S, Ctrl+Z,
    // Ctrl+Y) los registra el propio NoteEditor, que es quien tiene el borrador.
    useKeyboardShortcuts({ onNewNote: () => void handleNewNote() });

    const isEditing = view === 'editor' && selectedNote !== null;

    return (
        <>
            {showFlash && <div className="flash-transition" />}
            <div className="scanline-effect" aria-hidden="true" />

            <div className="container-terminal">
                <Header currentView={view} onViewChange={handleViewChange} />

                <div className="flex flex-1 min-h-0">
                    <Sidebar
                        notes={notes}
                        selectedNote={selectedNote}
                        total={total}
                        hasMore={hasMore}
                        isLoadingMore={isLoadingMore}
                        onSelectNote={handleSelectNote}
                        onNewNote={handleNewNote}
                        onLoadMore={loadMore}
                    />

                    <main className="flex-1 min-w-0 overflow-y-auto">
                        {isEditing ? (
                            <NoteEditor
                                // `key` remonta el editor al cambiar de nota, así
                                // que su estado local arranca limpio y no hace
                                // falta un efecto de sincronización — que era el
                                // que disparaba los falsos avisos de conflicto.
                                key={selectedNote._id}
                                note={selectedNote}
                                onSave={updateNote}
                                onBack={handleBackToList}
                                onUndo={undo}
                                onRedo={redo}
                                onMoveToTrash={handleMoveToTrash}
                                onSaveStateChange={setSaveState}
                            />
                        ) : view === 'trash' ? (
                            <TrashView />
                        ) : (
                            <NotesList
                                notes={notes}
                                isLoading={isLoading}
                                hasMore={hasMore}
                                isLoadingMore={isLoadingMore}
                                total={total}
                                onSelectNote={handleSelectNote}
                                onNewNote={handleNewNote}
                                onLoadMore={loadMore}
                            />
                        )}
                    </main>
                </div>

                <StatusBar
                    notesCount={total}
                    isLoading={isLoading}
                    error={error ?? historyError}
                    saveState={saveState}
                />
            </div>
        </>
    );
}
