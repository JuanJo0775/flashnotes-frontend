// src/app/page.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import PongOverlay from '@/components/effects/PongOverlay';
import DeadPage from '@/components/effects/DeadPage';
import V02Skin from '@/components/effects/V02Skin';
import V02Glitches from '@/components/effects/V02Glitches';
import CollectionView from '@/components/notes/CollectionView';
import { splitCollectibles, markCollectible } from '@/lib/system/collectibles';
import { createV02Note, saveV02Note } from '@/lib/system/v02Notes';
import { useV02Notes } from '@/hooks/useV02Notes';
import { isV02 } from '@/lib/system/v02';
import { LOCKOUT_BOOT_ATTR } from '@/config/lockout';
import { useNotes } from '@/hooks/useNotes';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
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

/** Referencia constante: una lista nueva en cada render remontaría todo. */
const VACIO: never[] = [];

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
    const { chromaticFailure, lockedOut, v02 } = useSystemState();
    const glitch = useGlitch();

    // La línea de barrido se traba cada tantas pasadas. Es la firma de la app:
    // "la máquina vieja se atasca" se lee mejor en algo que el usuario ya
    // conoce que en una textura nueva. Se elige por pasada, no por reloj.
    const [scanlineStutters, setScanlineStutters] = useState(false);
    // El nivel del colapso se calcula al DISPARARLO, en el manejador, no dentro
    // del componente: `registerCollapse` muta el almacén y tiene que ocurrir
    // exactamente una vez por colapso.
    const [collapse, setCollapse] = useState<CollapseLevel | null>(null);
    /**
     * El `vsync-test`, abierto o no.
     *
     * Vive acá y no dentro del editor porque el juego se pinta sobre la app
     * entera: dentro del editor quedaría recortado por su caja.
     */
    const [playingPong, setPlayingPong] = useState(false);
    /** La página muerta: sólo se llega insistiendo con `//hi` hasta el final. */
    const [dead, setDead] = useState(false);

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
        const newNote = isV02()
            ? createV02Note(t('editor.newNoteTitle'))
            : await createNote({ title: t('editor.newNoteTitle'), content: '' });

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

    /**
     * Las clases de la avería, calculadas UNA vez y repartidas.
     *
     * Las llevan el envoltorio de la app Y la capa del vsync-test, que es
     * hermana suya y no descendiente. Se comparte la lista en vez de repetirla
     * porque la regla del proyecto es que durante el fallo cromático NO HAY
     * EXCEPCIONES: todo lo visible se ve roto. Duplicando la lista, cualquier
     * animación que se añada mañana entraría en un sitio y no en el otro, y la
     * excepción aparecería sola.
     */
    const glitchClassName = [
        chromaticFailure || lockedOut ? 'chromatic-failure' : '',
        glitch.active ? 'glitch-jolt' : '',
        // El fantasma monocromo y la pérdida de vertical viven en el mismo
        // elemento que el tirón: así los `transform` se componen en vez de
        // pelearse por la propiedad.
        glitch.active && glitch.severity !== 'minor' ? 'glitch-ghost' : '',
        glitch.active ? `is-${glitch.severity}` : '',
        // La ráfaga: la MISMA aberración del fallo del tema, pero transitoria y
        // sin romper nada. Es lo que emparenta al botón secreto con el fallo
        // cromático — los dos son pánico.
        glitch.chromaBurst ? 'chroma-burst' : '',
    ]
        .filter(Boolean)
        .join(' ');

    const glitchStyle = glitch.active
        ? ({ '--glitch-amp': `${glitch.amplitudePx}px` } as React.CSSProperties)
        : undefined;

    /**
     * Retira el velo del arranque bloqueado.
     *
     * Va acá y NO dentro de la capa de bloqueo: si el bloqueo venció entre el
     * script en línea y este momento, esa capa no se monta nunca y el velo se
     * quedaría puesto para siempre. Esto corre pase lo que pase.
     *
     * Agendado a la siguiente vuelta porque `useSyncExternalStore` devuelve el
     * estado del SERVIDOR en el primer render: cuando este temporizador dispara,
     * el bloqueo ya está leído y la capa —si toca— ya está pintada.
     */
    useEffect(() => {
        const id = setTimeout(() => {
            document.documentElement.removeAttribute(LOCKOUT_BOOT_ATTR);
        }, 0);
        return () => clearTimeout(id);
    }, []);

    /**
     * Las piezas viven en la misma colección del backend que tus notas —no hay
     * otro sitio— pero se separan acá: no son notas y no se tratan como notas.
     * La marca vive en el navegador porque el backend no se toca para un efecto.
     */
    const { notes: misNotas, collectibles } = splitCollectibles(notes);

    /**
     * LOS ARCHIVOS DE LA v0.2 SON OTROS.
     *
     * Entrar por primera vez encuentra la versión vacía, y lo que escribas ahí
     * no aparece en la v1.0 ni al revés: son dos versiones distintas del mismo
     * programa. Viven en el navegador porque el backend no se toca para un
     * efecto — y además es lo que cuenta la historia: la v0.2 guardaba en otro
     * sitio y nadie migró nada.
     */
    const todosV02 = useV02Notes();
    const notasV02 = v02 ? todosV02 : VACIO;

    const enV02 = v02;
    const notasVisibles = enV02 ? notasV02 : misNotas;
    const totalVisible = enV02 ? notasV02.length : total - collectibles.length;

    /** Guardar, en la versión que toque. */
    const guardar = useCallback(
        async (id: string, data: { title?: string; content?: string }) => {
            if (!enV02) return updateNote(id, data);

            return saveV02Note(id, data);
        },
        [enV02, updateNote]
    );

    /** `//keep` crea la pieza y la marca. Así no pisa la nota donde estabas. */
    const guardarPieza = useCallback(
        async (title: string, content: string) => {
            const creada = await createNote({ title, content });
            if (creada) markCollectible(creada._id);
        },
        [createNote]
    );

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
                className={`container-terminal ${glitchClassName}`}
                style={glitchStyle}
            >
                <Header
                    currentView={view}
                    onViewChange={handleViewChange}
                    onCollapse={() => setCollapse(registerCollapse())}
                    collectionCount={collectibles.length}
                />

                <div className="flex flex-1 min-h-0">
                    {/* Las piezas NO salen en la barra lateral: no son notas y
                        no se abren en el editor. Filtrarlas sólo de la lista
                        principal las dejaba asomando por el lado. */}
                    <Sidebar
                        notes={notasVisibles}
                        selectedNote={selectedNote}
                        total={totalVisible}
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
                                onSave={guardar}
                                onBack={handleBackToList}
                                onUndo={undo}
                                onRedo={redo}
                                onMoveToTrash={handleMoveToTrash}
                                onSaveStateChange={setSaveState}
                                onLengthChange={setOpenNoteLength}
                                notes={noteSummaries}
                                onOpenDiagnostics={() => setShowDiagnostics(true)}
                                onCollapse={() => setCollapse(registerCollapse())}
                                onPlayPong={() => setPlayingPong(true)}
                                onKillPage={() => setDead(true)}
                                onKeepArt={guardarPieza}
                            />
                        ) : view === 'trash' ? (
                            <TrashView />
                        ) : view === 'collection' ? (
                            <CollectionView pieces={collectibles} />
                        ) : (
                            <NotesList
                                notes={notasVisibles}
                                isLoading={isLoading}
                                hasMore={hasMore}
                                isLoadingMore={isLoadingMore}
                                total={totalVisible}
                                onSelectNote={handleSelectNote}
                                onNewNote={handleNewNote}
                                onLoadMore={loadMore}
                            />
                        )}
                    </main>
                </div>

                <StatusBar
                    notesCount={totalVisible}
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

            <V02Skin />
            <V02Glitches />

            {dead && <DeadPage />}

            <PongOverlay
                open={playingPong}
                onClose={() => setPlayingPong(false)}
                glitchClassName={glitchClassName}
                glitchStyle={glitchStyle}
            />

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
