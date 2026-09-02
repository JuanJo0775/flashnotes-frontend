// src/app/page.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import StatusBar from '@/components/layout/StatusBar';
import NoteEditor from '@/components/notes/NoteEditor';
import NotesList from '@/components/notes/NotesList';
import TrashView from '@/components/notes/TrashView';
import DiagnosticPanel from '@/components/system/DiagnosticPanel';
import GlitchLayer from '@/components/effects/GlitchLayer';
import SystemCollapse from '@/components/effects/SystemCollapse';
import ChromaticFailure from '@/components/effects/ChromaticFailure';
import PhantomError from '@/components/effects/PhantomError';
import SystemLockout from '@/components/effects/SystemLockout';
import { useNotes } from '@/hooks/useNotes';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useMemo } from 'react';
import {
    markNoteTrashed,
    registerCollapse,
    useSystemState,
    type CollapseLevel,
} from '@/hooks/useSystemState';
import { useGlitch } from '@/hooks/useGlitch';
import { initializeCsrfToken } from '@/lib/api/client';
import { useT } from '@/i18n';
import type { Note, SaveState, View } from '@/types/note.types';

export default function Home() {
    const [view, setView] = useState<View>('notes');
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [saveState, setSaveState] = useState<SaveState>('idle');
    // Tamaño de la nota abierta, para el medidor de la barra de estado.
    const [openNoteLength, setOpenNoteLength] = useState<number | undefined>(undefined);
    const [showFlash, setShowFlash] = useState(true);
    const [showDiagnostics, setShowDiagnostics] = useState(false);
    const t = useT();

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
    const { chromaticFailure, lockedOut } = useSystemState();
    const glitch = useGlitch();

    // La línea de barrido se traba cada tantas pasadas. Es la firma de la app:
    // "la máquina vieja se atasca" se lee mejor en algo que el usuario ya
    // conoce que en una textura nueva. Se elige por pasada, no por reloj.
    const [scanlineStutters, setScanlineStutters] = useState(false);
    // El nivel del colapso se calcula al DISPARARLO, en el manejador, no dentro
    // del componente: `registerCollapse` muta el almacén y tiene que ocurrir
    // exactamente una vez por colapso.
    const [collapse, setCollapse] = useState<CollapseLevel | null>(null);

    // Lo mínimo que los comandos y el panel necesitan saber de las notas: nombre
    // y tamaño. No se les pasa el contenido — lo que escribís no se lee.
    const noteSummaries = useMemo(
        () => notes.map((n) => ({ title: n.title, chars: n.content.length })),
        [notes]
    );
    const bytesWritten = useMemo(
        () => noteSummaries.reduce((suma, n) => suma + n.chars, 0),
        [noteSummaries]
    );

    useEffect(() => {
        void initializeCsrfToken();
    }, []);

    useEffect(() => {
        const t = setTimeout(() => setShowFlash(false), 240);
        return () => clearTimeout(t);
    }, []);

    const handleNewNote = useCallback(async () => {
        // El título por defecto sigue al idioma: una nota creada en inglés no
        // debería llamarse "Nueva nota".
        const newNote = await createNote({ title: t('editor.newNoteTitle'), content: '' });
        if (newNote) {
            setSelectedNote(newNote);
            setSaveState('idle');
            setView('editor');
        }
    }, [createNote, t]);

    const handleSelectNote = useCallback((note: Note) => {
        setSelectedNote(note);
        setSaveState('idle');
        setView('editor');
    }, []);

    const handleBackToList = useCallback(() => {
        setSelectedNote(null);
        setSaveState('idle');
        setOpenNoteLength(undefined);
        setView('notes');
        void refreshNotes();
    }, [refreshNotes]);

    const handleViewChange = useCallback(
        (next: View) => {
            setSelectedNote(null);
            setSaveState('idle');
            setOpenNoteLength(undefined);
            setView(next);
            if (next === 'notes') void refreshNotes();
        },
        [refreshNotes]
    );

    const handleMoveToTrash = useCallback(
        async (id: string) => {
            const ok = await moveToTrash(id);
            if (ok) {
                // El sistema se acuerda: si abrís una nota nueva en el minuto
                // siguiente, el arranque no dice lo de siempre.
                markNoteTrashed();
                setSelectedNote(null);
                setOpenNoteLength(undefined);
                setView('notes');
            }
            return ok;
        },
        [moveToTrash]
    );

    // Ctrl+N funciona en cualquier vista. Los atajos del editor (Ctrl+S, Ctrl+Z,
    // Ctrl+Y) los registra el propio NoteEditor, que es quien tiene el borrador.
    //
    // Escape lo registran los DOS, y cada uno atiende lo suyo: el editor guarda
    // y vuelve a la lista; acá sólo se atiende la papelera. Por eso la guarda
    // por vista — sin ella, con el editor abierto Escape se procesaría dos veces.
    useKeyboardShortcuts({
        onNewNote: () => void handleNewNote(),
        onEscape: () => {
            if (view === 'trash') handleViewChange('notes');
        },
    });

    const isEditing = view === 'editor' && selectedNote !== null;

    return (
        <>
            {showFlash && <div className="flash-transition" />}
            <div
                className={`scanline-effect${scanlineStutters ? ' is-stuttering' : ''}`}
                aria-hidden="true"
                onAnimationIteration={() => setScanlineStutters(Math.random() < 0.25)}
            />
            <GlitchLayer />
            <ChromaticFailure />
            <PhantomError />

            {/* El fallo va sobre el contenedor y NUNCA sobre <body> ni sobre un
                ancestro de los elementos fijos: el grano, el barrido y el flash
                son hermanos de esto, no descendientes, así que no se convierten
                en hijos posicionados de un elemento animado. */}
            {/* El tirón lo da el contenedor: es lo que tiene que moverse. La
                amplitud llega por variable, así que el mismo fotograma sirve
                para el temblor de reposo y para el de un sistema medio roto. */}
            <div
                className={[
                    'container-terminal',
                    chromaticFailure || lockedOut ? 'chromatic-failure' : '',
                    glitch.active ? 'glitch-jolt' : '',
                    // El fantasma monocromo y la pérdida de vertical viven en el
                    // mismo elemento que el tirón: así los `transform` se
                    // componen en vez de pelearse por la propiedad.
                    glitch.active && glitch.severity !== 'minor' ? 'glitch-ghost' : '',
                    glitch.active ? `is-${glitch.severity}` : '',
                    // La ráfaga: la MISMA aberración del fallo del tema, pero
                    // transitoria y sin romper nada. Es lo que emparenta al
                    // botón secreto con el fallo cromático — los dos son pánico.
                    glitch.chromaBurst ? 'chroma-burst' : '',
                ]
                    .filter(Boolean)
                    .join(' ')}
                style={
                    glitch.active
                        ? ({ '--glitch-amp': `${glitch.amplitudePx}px` } as React.CSSProperties)
                        : undefined
                }
            >
                <Header
                    currentView={view}
                    onViewChange={handleViewChange}
                    onCollapse={() => setCollapse(registerCollapse())}
                />

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
                                onLengthChange={setOpenNoteLength}
                                notes={noteSummaries}
                                onOpenDiagnostics={() => setShowDiagnostics(true)}
                                onCollapse={() => setCollapse(registerCollapse())}
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
                    openNoteLength={isEditing ? openNoteLength : undefined}
                    onOpenDiagnostics={() => setShowDiagnostics(true)}
                />
            </div>

            {/* El colapso va FUERA del contenedor y por encima de todo. El
                editor sigue montado debajo: se puede seguir escribiendo a
                ciegas durante los 4,2 s y todo lo tecleado llega. */}
            {collapse && (
                <SystemCollapse
                    notesCount={total}
                    level={collapse}
                    onDone={() => setCollapse(null)}
                />
            )}

            {/* La pantalla de bloqueo va por encima de todo, incluido el
                colapso: es lo que queda cuando el rearranque ya no llega. */}
            {/* La pantalla de error espera a que el colapso TERMINE.

                `registerCollapse` activa el bloqueo de forma síncrona, así que
                sin esta condición la pantalla de error (z-index 10001) se
                pintaba en el mismo instante y tapaba el colapso (10000) antes de
                que empezara: no se llegaba a ver ni la estática ni la barra
                trabándose. Justo la secuencia que da sentido al desenlace. */}
            {lockedOut && !collapse && <SystemLockout />}

            <DiagnosticPanel
                open={showDiagnostics}
                onClose={() => setShowDiagnostics(false)}
                notesCount={total}
                bytesWritten={bytesWritten}
                charsPerMinute={0}
            />
        </>
    );
}
