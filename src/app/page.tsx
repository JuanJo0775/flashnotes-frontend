// src/app/page.tsx
'use client';

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import StatusBar from '@/components/layout/StatusBar';
import NoteEditor from '@/components/notes/NoteEditor';
import NotesList from '@/components/notes/NotesList';
import { trashV02Note } from '@/lib/system/v02Notes';
import { notesApi } from '@/lib/api/notes.api';
import TrashView from '@/components/notes/TrashView';
import WipeScreen from '@/components/effects/WipeScreen';
import BootScreen from '@/components/effects/BootScreen';
import type { BootPhase } from '@/lib/system/boot';
import V02TrashView from '@/components/notes/V02TrashView';
import DiagnosticPanel from '@/components/system/DiagnosticPanel';
import GlitchLayer from '@/components/effects/GlitchLayer';
import SystemCollapse from '@/components/effects/SystemCollapse';
import ChromaticFailure from '@/components/effects/ChromaticFailure';
import PhantomError from '@/components/effects/PhantomError';
import { LooseWall } from '@/components/effects/LooseWall';
import SystemLockout from '@/components/effects/SystemLockout';
import PongOverlay from '@/components/effects/PongOverlay';
import DeadPage from '@/components/effects/DeadPage';
import V02Skin from '@/components/effects/V02Skin';
import V02Glitches from '@/components/effects/V02Glitches';
import CollectionView from '@/components/notes/CollectionView';
import { awardFrom, readRevealed } from '@/lib/system/asciiArt';
import { markSecretFound, resetEverything } from '@/hooks/useSystemState';
import { createV02Note, saveV02Note } from '@/lib/system/v02Notes';
import { useV02Notes } from '@/hooks/useV02Notes';
import V02Box from '@/components/notes/V02Box';
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
import { LIMITS } from '@/config/limits';
import { markActivity } from '@/lib/system/idle';
import { useT } from '@/i18n';
import type { Note, SaveState, View } from '@/types/note.types';

/** Referencia constante: una lista nueva en cada render remontaría todo. */
const VACIO: never[] = [];

/**
 * Cuánto hay que llevar en la misma sesión para que salga el arbusto.
 *
 * ⚠ ANTES SE MEDÍA EN CARACTERES ESCRITOS, y era la misma cuenta que la de la
 * pluma. Dos piezas midiendo lo mismo con dos umbrales distintos es una sola
 * pieza contada dos veces: se ganaban juntas y ninguna significaba nada. Ahora
 * el arbusto mide el RATO y la pluma el VOLUMEN.
 *
 * Media hora: no sale por probar la app, y sale sin proponérselo la primera
 * vez que alguien se sienta a escribir de verdad. Y encaja con el dibujo: una
 * planta que creció mientras estabas.
 */
const ARBUSTO_TRAS_MS = 30 * 60_000;

/**
 * Cuántas notas hay que juntar para la biblioteca.
 *
 * Doce: bastantes para que no salgan de una tarde, pocas para que salgan de usar
 * la app un tiempo. Es la cuenta de quien VUELVE, no la de quien escribe mucho
 * de golpe — de eso ya se ocupa el arbusto.
 */
const BIBLIOTECA_DESDE = 12;

/** No hay a qué suscribirse: sólo interesa el salto de servidor a cliente. */
const SIN_CAMBIOS = () => () => {};

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

    /**
     * El monitor todavía se está encendiendo.
     *
     * Arranca en `true` SIEMPRE, no sólo la primera vez: un arranque que sale
     * una vez es una pantalla de bienvenida, y ésas se saltan. Uno que sale
     * siempre es cómo es la máquina.
     */
    /**
     * El encendido, y desde qué tramo.
     *
     * `'off'` es una recarga de verdad: el equipo se apaga y arranca entero.
     * Quien ya hizo parte del recorrido pide otro tramo — ver `bootScript`.
     */
    const [booting, setBooting] = useState<BootPhase | null>('off');

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

    /*
     * HABER ESCRITO DE VERDAD DA LA FLOR.
     *
     * Es la única pieza que no se gana hurgando: todas las demás premian buscar
     * secretos, y ésta premia haber USADO la app para lo que es. Puede
     * encontrarla alguien que no haya tecleado un comando en su vida, y eso es
     * exactamente lo que la hace valer.
     *
     * ⚠ EL TEMPORIZADOR NO SE REINICIA CON LA ACTIVIDAD, al revés que el de la
     * polilla. Aquél mide ESTAR AUSENTE y por eso cualquier tecla lo tumba;
     * éste mide HABERSE QUEDADO, así que corre entero desde que se abrió.
     */
    useEffect(() => {
        const id = setTimeout(() => awardFrom('long-session'), ARBUSTO_TRAS_MS);
        return () => clearTimeout(id);
    }, []);

    /*
     * LLENAR UNA NOTA HASTA EL TOPE DA LA PLUMA.
     *
     * El tope es el del contrato con el backend (`LIMITS.CONTENT_MAX`), no una
     * cifra inventada acá: la pieza premia haber llegado al borde DE VERDAD, al
     * sitio donde la app deja de aceptar más. Un umbral propio sería un premio
     * por llegar a un número que no significa nada.
     */
    useEffect(() => {
        if (bytesWritten >= LIMITS.CONTENT_MAX) awardFrom('full-note');
    }, [bytesWritten]);

    /*
     * QUIÉN MIDE LA INACTIVIDAD.
     *
     * Acá se DABA una pieza por estar quieto, y el premio se retiró: ese camino
     * pasó por tres dueños —el ojo, la polilla, la cinta— y cada mudanza dejaba
     * un pie contando algo que ya no pasaba, así que la cinta quedó reservada.
     *
     * ⚠ PERO LA MEDICIÓN SE QUEDA, y quitarla fue un error. No servía sólo para
     * el premio: `[SEGUÍS AHÍ]` la necesita, y ésa es la única frase del lore
     * que pregunta por la ausencia. Sin nadie que marque la actividad, el
     * contexto llegaba con `idleMs: 0` fijo y la frase no podía salir nunca.
     *
     * Cualquier tecla o clic reinicia el reloj: mide ESTAR AUSENTE, no tener la
     * app abierta.
     */
    useEffect(() => {
        markActivity();

        for (const evento of ['keydown', 'pointerdown'] as const) {
            window.addEventListener(evento, markActivity);
        }

        return () => {
            for (const evento of ['keydown', 'pointerdown'] as const) {
                window.removeEventListener(evento, markActivity);
            }
        };
    }, []);


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

            /*
             * ABRIR LA COLECCIÓN ES UN HALLAZGO APARTE.
             *
             * ⚠ ANTES COLGABA DE `//keep`: se marcaba al crear la nota de la pieza
             * guardada. Cuando `//keep` pasó a escribir en la nota abierta ya no
             * se creaba nada, y el secreto se quedaba sin marcar para siempre —el
             * contador nunca podía llegar a su total, así que el cuaderno se
             * volvía inalcanzable sin que nada fallara.
             *
             * Descubrir que las piezas tienen SITIO PROPIO es distinto de haber
             * sacado una con `//art`, y ese momento es exactamente éste.
             */
            if (next === 'collection') markSecretFound('collection');
        },
        [refreshNotes]
    );

    const handleMoveToTrash = useCallback(
        async (id: string) => {
            // LA v0.2 TIRA A SU PROPIA PAPELERA, y a veces no la tira.
            //
            // Falla hacia NO borrar siempre: si el dado sale mal la nota se
            // queda donde estaba, entera. Una versión vieja que se traga una
            // nota no es un efecto de época, es una pérdida de trabajo.
            const ok = v02 ? trashV02Note(id) : await moveToTrash(id);
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
        [moveToTrash, v02]
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

    /*
     * ⚠ ACÁ SE SEPARABAN LAS PIEZAS DE LAS NOTAS, Y YA NO HACE FALTA.
     *
     * `//keep` creaba una nota-pieza aparte, marcada para no contarla entre tus
     * archivos. Ahora escribe en la nota abierta: la pieza ES tu nota, con tu
     * título y tu texto alrededor, así que separarla sería esconder algo que
     * escribiste vos.
     *
     * Con eso `collectibles.ts` se quedó sin nadie que marcara nada —seguía
     * corriendo, seguía limpiándose en `//reset`, y no hacía absolutamente nada—
     * así que se fue entero.
     */
    const misNotas = notes;

    /*
     * Cuántas piezas hay en la colección.
     *
     * Sale de las PIEZAS REVELADAS, no de las notas guardadas: `//keep` es para
     * llevarse una copia a una nota y trastear con ella, y la colección no se
     * entera. Y sólo cuenta lo revelado —lo que ganaste y además fuiste a mirar
     * con `//art`— porque si brotara solo, el comando no serviría para nada.
     */
    const montado = useSyncExternalStore(
        SIN_CAMBIOS,
        () => true,
        () => false
    );

    // Se lee del almacenamiento y no del estado de React: `useSyncExternalStore`
    // devuelve el snapshot del servidor en el primer render del cliente, y ahí
    // no hay `localStorage` (REGLAS · C2).
    const piezasVistas = montado ? readRevealed().size : 0;

    /*
     * MUCHAS NOTAS DAN LA BIBLIOTECA.
     *
     * Es la hermana del arbusto: aquélla premia haber escrito mucho DE UNA VEZ,
     * ésta haber VUELTO muchas veces. Dos formas distintas de usar una libreta,
     * y ninguna se consigue haciendo lo de la otra.
     */
    useEffect(() => {
        if (misNotas.length >= BIBLIOTECA_DESDE) awardFrom('many-notes');
    }, [misNotas.length]);


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
    const totalVisible = enV02 ? notasV02.length : total;

    /** Guardar, en la versión que toque. */
    const guardar = useCallback(
        async (id: string, data: { title?: string; content?: string }) => {
            if (!enV02) return updateNote(id, data);

            return saveV02Note(id, data);
        },
        [enV02, updateNote]
    );

    /** `//keep` crea la pieza y la marca. Así no pisa la nota donde estabas. */
    /**
     * La pantalla de borrado, si está en marcha.
     *
     * `null` = no hay ninguna. `false` = borró de verdad y esto lo cuenta.
     * `true` = la broma: no se tocó nada.
     */
    const [wipe, setWipe] = useState<boolean | null>(null);

    /**
     * Borra TODO y luego lo cuenta.
     *
     * ⚠ LAS NOTAS TAMBIÉN. Es la única operación irreversible de la app, y por
     * eso el aviso lo dice antes y hay que contestar que sí.
     *
     * El orden importa: primero el servidor, después lo local. Si fuera al
     * revés y la red fallara a mitad, quedarían las notas sin los secretos —un
     * estado que no es ni lo de antes ni lo de después.
     */
    const alBorrar = useCallback(
        (prank: boolean) => {
            // La broma no borra nada: sólo enseña la película.
            if (prank) {
                setWipe(true);
                return;
            }

            void borrarTodo();
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    const borrarTodo = useCallback(async () => {
        try {
            await notesApi.wipeEverything();
        } catch {
            // Si el servidor no colabora, lo local se limpia igual: dejar las
            // dos mitades a medias sería peor que limpiar una.
        }

        resetEverything();
        setWipe(false);
    }, []);

    /**
     * Dibuja la caja alrededor, pero SÓLO en la v0.2.
     *
     * Fuera de ella devuelve el contenido tal cual: la v1.0 no tiene por qué
     * llevar un envoltorio de más ni pagar cuatro elementos absolutos por
     * región. Una sola función y el mismo árbol para las dos versiones.
     */
    const enCaja = (contenido: React.ReactNode, title?: string) =>
        enV02 ? <V02Box title={title}>{contenido}</V02Box> : contenido;

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
            {/* Lo que él aflojó. Ver `LooseWall`: es una ventana más, salvo
                que ésta responde. */}
            <LooseWall />

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
                {enCaja(
                    <Header
                    currentView={view}
                    onViewChange={handleViewChange}
                    onCollapse={() => setCollapse(registerCollapse())}
                        collectionCount={piezasVistas}
                    />,
                    'head'
                )}

                <div className="flex flex-1 min-h-0">
                    {/* Las piezas NO salen en la barra lateral: no son notas y
                        no se abren en el editor. Filtrarlas sólo de la lista
                        principal las dejaba asomando por el lado. */}
                    {enCaja(
                        <Sidebar
                        notes={notasVisibles}
                        selectedNote={selectedNote}
                        total={totalVisible}
                        hasMore={hasMore}
                        isLoadingMore={isLoadingMore}
                        onSelectNote={handleSelectNote}
                        onNewNote={handleNewNote}
                            onLoadMore={loadMore}
                        />,
                        'files'
                    )}

                    <main className="flex-1 min-w-0 overflow-y-auto v02-main">
                        {enCaja(
                            <>
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
                                onWipe={alBorrar}
                            />
                        ) : view === 'trash' ? (
                            // CADA VERSIÓN TIENE SU PAPELERA. La de la v0.2
                            // enseñaba las notas de verdad, y eso rompía lo
                            // único que sostiene la pieza: son dos versiones
                            // distintas, con archivos distintos.
                            v02 ? (
                                <V02TrashView />
                            ) : (
                                <TrashView />
                            )
                        ) : view === 'collection' ? (
                            <CollectionView />
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
                            </>,
                            view === 'trash'
                                ? 'trash'
                                : view === 'collection'
                                  ? 'coll'
                                  : 'main'
                        )}
                    </main>
                </div>

                {enCaja(
                    <StatusBar
                    notesCount={totalVisible}
                    isLoading={isLoading}
                    error={error ?? historyError}
                    saveState={saveState}
                    openNoteLength={isEditing ? openNoteLength : undefined}
                        onOpenDiagnostics={() => setShowDiagnostics(true)}
                    />,
                    'sys'
                )}
            </div>

            {/* El colapso va FUERA del contenedor y por encima de todo. El
                editor sigue montado debajo: se puede seguir escribiendo a
                ciegas durante los 4,2 s y todo lo tecleado llega. */}
            {collapse && (
                <SystemCollapse
                    notesCount={total}
                    level={collapse}
                    onDone={() => {
                        setCollapse(null);
                        /*
                         * Y EL EQUIPO TERMINA DE ARRANCAR: barras, rótulo,
                         * comprobación y a trabajar.
                         *
                         * Antes volvía de golpe a la app en cuanto la barra de
                         * carga llegaba al final, y eso contaba que el sistema
                         * se recuperó solo. Un equipo que se apagó arranca.
                         *
                         * ⚠ DESDE LAS BARRAS: el apagón ya lo hizo el colapso
                         * con su fase `dying`.
                         */
                        setBooting('bars');
                    }}
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

            {/* EL BORRADO TAPA TODO, y al acabar devuelve al inicio: es lo
                que convierte «se borró» en «empezás de nuevo». Va antes que la
                página muerta porque ésa no vuelve de ningún sitio. */}
            {wipe !== null && (
                <WipeScreen
                    prank={wipe}
                    onDone={() => {
                        const eraBroma = wipe;
                        setWipe(null);
                        setSelectedNote(null);
                        setView('notes');
                        void refreshNotes();

                        /*
                         * Después del borrado de verdad, el monitor VUELVE A
                         * ARRANCAR: es lo que convierte «se borró» en «esto
                         * acaba de encenderse por primera vez». La broma no
                         * arranca nada, porque no se apagó nada.
                         *
                         * ⚠ EMPIEZA POR EL RÓTULO, no por el apagón. La pantalla
                         * de borrado termina apagando el equipo y enseñando las
                         * barras; arrancar desde el principio repetía las dos
                         * cosas SEGUIDAS —dos apagones con sus dos juegos de
                         * barras— y eso no se lee como un encendido, se lee como
                         * un tartamudeo.
                         */
                        if (!eraBroma) setBooting('logo');
                    }}
                />
            )}

            {/* Encima de todo, hasta de la página muerta: es el encendido, y
                nada puede haber pasado todavía cuando el equipo arranca. */}
            {/* El bloqueo lo lee él del almacenamiento: pasárselo desde acá no
                servía, porque en el primer render del cliente todavía dice que
                no lo hay (REGLAS · C2). */}
            {booting !== null && (
                <BootScreen from={booting} onDone={() => setBooting(null)} />
            )}

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
