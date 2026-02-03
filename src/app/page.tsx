'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import StatusBar from '@/components/layout/StatusBar';
import NoteEditor from '@/components/notes/NoteEditor';
import NotesList from '@/components/notes/NotesList';
import { useNotes } from '@/hooks/useNotes';
import { useLocalIdentity } from '@/hooks/useLocalIdentity';
import type { Note } from '@/types/note.types';

export default function Home() {
    const [currentView, setCurrentView] = useState<'notes' | 'editor' | 'trash'>('notes');
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [showFlash, setShowFlash] = useState(true);

    const { browserId } = useLocalIdentity();
    const { notes, isLoading, error, createNote, updateNote, deleteNote } = useNotes();

    // Flash inicial al cargar
    useEffect(() => {
        const timer = setTimeout(() => setShowFlash(false), 200);
        return () => clearTimeout(timer);
    }, []);

    const handleNewNote = async () => {
        const newNote = await createNote({
            title: 'Untitled.txt',
            content: '',
        });
        setSelectedNote(newNote);
        setCurrentView('editor');
    };

    const handleSelectNote = (note: Note) => {
        setSelectedNote(note);
        setCurrentView('editor');
    };

    const handleBackToList = () => {
        setSelectedNote(null);
        setCurrentView('notes');
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
                                onUpdate={updateNote}
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
                            <div className="p-8">
                                <div className="comment">TRASH VIEW</div>
                                <p className="mt-4 mono text-sm">
                                    Esta vista mostrará las notas eliminadas.
                                </p>
                            </div>
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