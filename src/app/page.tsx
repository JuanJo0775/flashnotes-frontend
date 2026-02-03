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
import { useLocalIdentity } from '@/hooks/useLocalIdentity';
import type { Note } from '@/types/note.types';

export default function Home() {
    const [currentView, setCurrentView] = useState<'notes' | 'editor' | 'trash'>('notes');
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [showFlash, setShowFlash] = useState(true);

    const { browserId } = useLocalIdentity();
    const { notes, isLoading, error, createNote, updateNote, deleteNote, refetch } = useNotes();

    // Flash inicial al cargar
    useEffect(() => {
        const timer = setTimeout(() => setShowFlash(false), 200);
        return () => clearTimeout(timer);
    }, []);

    const handleNewNote = async () => {
        try {
            const newNote = await createNote({
                title: 'Untitled.txt',
                content: '',
            });

            if (newNote) {
                setSelectedNote(newNote);
                setCurrentView('editor');
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
        refetch(); // Recargar lista al volver
    };

    const handleUpdateNote = async (id: string, data: { title?: string; content?: string }) => {
        try {
            const updated = await updateNote(id, data);
            if (updated) {
                setSelectedNote(updated);
            }
            return updated;
        } catch (error) {
            console.error('Error updating note:', error);
            throw error;
        }
    };

    return (
        <>
            {/* Flash de transición */}
            {showFlash && <div className="flash-transition" />}

            {/* Efecto de líneas de escaneo CRT */}
            <div className="scanline-effect" />

            <div className="container-terminal">
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
                    />

                    {/* Área de trabajo */}
                    <main className="flex-1 overflow-auto border-l border-l-primary">
                        {currentView === 'editor' && selectedNote ? (
                            <NoteEditor
                                note={selectedNote}
                                onUpdate={handleUpdateNote}
                                onBack={handleBackToList}
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
                    browserId={browserId}
                    isLoading={isLoading}
                    error={error}
                />
            </div>
        </>
    );
}
