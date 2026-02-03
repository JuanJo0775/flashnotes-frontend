// UBICACIÓN: src/app/page.tsx
// ACCIÓN: REEMPLAZAR COMPLETO

'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import StatusBar from '@/components/layout/StatusBar';
import NoteEditor from '@/components/notes/NoteEditor';
import NotesList from '@/components/notes/NotesList';
import TrashView from '@/components/notes/TrashView';
import { useNotes } from '@/hooks/useNotes';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useSessionValidation } from '@/hooks/useSessionValidation';
import type { Note } from '../types/note.types';
import { isValidObjectId } from '@/lib/utils/validators';

export default function Home() {
    const [currentView, setCurrentView] = useState<'notes' | 'editor' | 'trash'>('notes');
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [showFlash, setShowFlash] = useState(true);
    const { notes, isLoading, error, createNote, updateNote, deleteNote, refreshNotes, refetch } = useNotes();
    const { undo, redo } = useUndoRedo();
    const { sessionStatus, showSessionWarning, dismissWarning, reloadPage } = useSessionValidation();

    // Flash inicial al cargar
    useEffect(() => {
        const timer = setTimeout(() => setShowFlash(false), 200);
        return () => clearTimeout(timer);
    }, []);

    const handleNewNote = async () => {
        try {
            const newNote = await createNote({
                title: 'Nueva nota',
                content: '',
            });

            // Asegurarse de usar únicamente la nota retornada por el backend
            if (newNote && isValidObjectId(newNote._id)) {
                setSelectedNote(newNote);
                setCurrentView('editor');
            } else {
                console.error('La nota no fue creada correctamente en el backend:', newNote);
            }
        } catch (error) {
            console.error('Error creating note:', error);
        }
    };

    const handleSelectNote = (note: Note) => {
        setSelectedNote(note);
        setCurrentView('editor');
    };

    const handleBackToList = () => {
        setSelectedNote(null);
        setCurrentView('notes');
        // usar refreshNotes si existe
        (refetch || refreshNotes)();
    };

    const handleUpdateNote = async (id: string, data: { title?: string; content?: string }) => {
        try {
            const updated = await updateNote(id, data);
            if (updated && isValidObjectId(updated._id)) {
                setSelectedNote(updated);
            }
            return updated;
        } catch (error) {
            console.error('Error updating note:', error);
            throw error;
        }
    };

    const handleUndo = async (id: string) => {
        const updated = await undo(id);
        if (updated) {
            setSelectedNote(updated);
            // sincronizar lista
            (refetch || refreshNotes)();
        }
        return updated;
    };

    const handleRedo = async (id: string) => {
        const updated = await redo(id);
        if (updated) {
            setSelectedNote(updated);
            (refetch || refreshNotes)();
        }
        return updated;
    };

    const handleMoveToTrash = async (id: string) => {
        if (!isValidObjectId(id)) {
            console.error('Intentando mover a papelera una nota sin id válido:', id);
            return false;
        }

        const success = await deleteNote(id);
        if (success) {
            setSelectedNote(null);
            setCurrentView('notes');
        }
        return success;
    };

    return (
        <>
            {/* Flash de transición */}
            {showFlash && <div className="flash-transition" />}

            {/* Efecto de líneas de escaneo CRT */}
            <div className="scanline-effect" />

            {/* Warning de sesión expirada o cambio */}
            {showSessionWarning && (
                <div className="fixed top-0 left-0 right-0 z-40 bg-red-900 bg-opacity-90 border-b-2 border-red-500 p-4">
                    <div className="max-w-4xl mx-auto flex items-center justify-between">
                        <div>
                            <p className="mono text-red-300 font-bold">
                                ⚠ SESIÓN INVÁLIDA O EXPIRADA
                            </p>
                            <p className="mono text-xs text-red-200 mt-1">
                                Tu sesión ha cambiado. Por favor, recarga la página para continuar.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={dismissWarning}
                                className="btn-terminal text-xs"
                            >
                                [X] DESCARTAR
                            </button>
                            <button
                                onClick={reloadPage}
                                className="btn-terminal text-xs bg-red-900"
                            >
                                [↻] RECARGAR
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="container-terminal" style={{ paddingTop: showSessionWarning ? '80px' : '0' }}>
                {/* Header */}
                <Header
                    currentView={currentView}
                    onViewChange={setCurrentView}
                />

                {/* Contenido principal */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <Sidebar
                        notes={notes}
                        onSelectNote={handleSelectNote}
                        selectedNote={selectedNote}
                        onNewNote={handleNewNote}
                        onOpenTrash={() => setCurrentView('trash')}
                    />

                    {/* Área de trabajo */}
                    <main className="flex-1 overflow-auto border-l border-l-primary">
                        {currentView === 'editor' && selectedNote ? (
                            <NoteEditor
                                note={selectedNote}
                                onSave={handleUpdateNote}
                                onBack={handleBackToList}
                                onUndo={handleUndo}
                                onRedo={handleRedo}
                                onMoveToTrash={handleMoveToTrash}
                            />
                        ) : currentView === 'notes' ? (
                            <NotesList
                                notes={notes}
                                isLoading={isLoading}
                                onSelectNote={handleSelectNote}
                                onNewNote={handleNewNote}
                            />
                        ) : (
                            <TrashView />
                        )}
                    </main>
                </div>

                {/* Status bar */}
                <StatusBar
                    notesCount={notes.length}
                    isLoading={isLoading}
                    error={error}
                />
            </div>
        </>
    );
}
