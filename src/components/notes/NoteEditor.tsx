// src/components/notes/NoteEditor.tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Note, SaveState } from '@/types/note.types';
import MetaTag from '@/components/ui/MetaTag';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { formatFileSize } from '@/lib/utils/formatters';
import { isValidObjectId } from '@/lib/utils/validators';
import { LIMITS } from '@/config/limits';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useT, useLang } from '@/i18n';
import BootPrompt from '@/components/effects/BootPrompt';
import CommandRows from '@/components/effects/CommandRows';
import { replyTimings } from '@/lib/system/replyTiming';
import LinePrompts from '@/components/notes/LinePrompts';
import { isCommandLine } from '@/lib/system/commands';
import { useNoteCommands } from '@/hooks/useNoteCommands';
import { pickBootPhrase } from '@/lib/system/lore';
import { getSystemState } from '@/hooks/useSystemState';

/**
 * Cadencia del auto-guardado.
 *
 * Eran 1000 ms, y como el backend crea un punto de historial por cada PATCH con
 * cambios, veinte segundos de escritura llenaban las 20 ranuras de historial con
 * estados separados por un segundo: "deshacer" retrocedía un segundo en vez de
 * un cambio, y la versión de hace cinco minutos ya se había perdido.
 *
 * 2,5 s agrupa una ráfaga de tecleo en un solo punto de historial. Además se
 * fuerza el guardado al salir del campo y al cerrar el editor, así que subir el
 * intervalo no significa perder trabajo.
 */
const AUTOSAVE_DELAY_MS = 2500;


/** Referencia estable, para no recrear callbacks cuando el padre no los pasa. */
const noop = () => {};

interface NoteEditorProps {
    note: Note;
    onSave: (id: string, data: { title?: string; content?: string }) => Promise<Note | null>;
    onBack: () => void;
    onUndo: (id: string) => Promise<Note | null>;
    onRedo: (id: string) => Promise<Note | null>;
    onMoveToTrash: (id: string) => Promise<boolean>;
    onSaveStateChange: (state: SaveState) => void;
    /** Informa al padre de cuántos caracteres tiene la nota abierta. */
    onLengthChange?: (length: number) => void;
    /** Las notas de la sesión, para que `//ls` y `//df` puedan contarlas. */
    notes?: readonly { title: string; chars: number }[];
    onOpenDiagnostics?: () => void;
    onCollapse?: () => void;
    /** Abre el `vsync-test`: sólo lo pide `//attach_6`. */
    onPlayPong?: () => void;
    /** Insististe hasta que te echó tres veces. */
    onKillPage?: () => void;
}

export default function NoteEditor({
    note,
    onSave,
    onBack,
    onUndo,
    onRedo,
    onMoveToTrash,
    onSaveStateChange,
    onLengthChange,
    notes = [],
    onOpenDiagnostics,
    onCollapse,
    onPlayPong,
    onKillPage,
}: NoteEditorProps) {
    const { isFullyOperational } = useNetworkStatus();
    const t = useT();
    const lang = useLang();

    const [title, setTitle] = useState(note.title);
    const [content, setContent] = useState(note.content);
    const [saveState, setSaveState] = useState<SaveState>('idle');
    const [canUndo, setCanUndo] = useState(Boolean(note.versions?.length));
    const [canRedo, setCanRedo] = useState(Boolean(note.redoStack?.length));
    const [showTrashConfirm, setShowTrashConfirm] = useState(false);
    const [isTrashing, setIsTrashing] = useState(false);

    // Secuencia de arranque: sólo en una nota que se abre vacía. Mientras dura,
    // el cursor real del textarea se oculta y el que se ve es el de la
    // animación, para que no haya dos a la vez. Termina en cuanto el usuario
    // escribe o sale del campo: él manda, no la animación.
    const [isBooting, setIsBooting] = useState(note.content === '');

    /**
     * Qué se teclea al abrir una nota vacía.
     *
     * Casi siempre el texto de ayuda de siempre. Una de cada treinta veces, otra
     * frase — y si acabás de mandar una nota a la papelera, la que reacciona a
     * eso, que gana a todas.
     *
     * Se calcula UNA vez al montar: el editor se remonta con `key` al cambiar de
     * nota, así que cada nota vacía tira su propio dado y ninguna cambia de
     * frase mientras la mirás.
     */
    const [bootText] = useState(() => {
        const system = getSystemState();
        const ahora = new Date();
        const msSinceTrash =
            system.noteTrashedAt === null ? null : Date.now() - system.noteTrashedAt;

        const ctx = {
            hour: ahora.getHours(),
            sessionMs: Date.now() - system.sessionStart,
            idleMs: 0,
            msSinceTrash,
        };

        const recienTirada = msSinceTrash !== null && msSinceTrash < 60_000;
        // El texto de siempre sale traducido; las frases raras vienen de
        // `lore.ts`, que todavía habla sólo español (ver el spec, fase 5).
        if (!recienTirada && Math.random() >= 1 / 30) return t('editor.bootPlaceholder');

        return pickBootPhrase(ctx, null);
    });

    // Comandos del editor. `onClearNote` y el vaciado tras ejecutar son la
    // misma cosa: el comando nunca queda escrito en la nota.
    const clearNote = useCallback(() => setContent(''), []);

    /** Salir de la nota, por referencia: `handleEscape` se declara más abajo. */
    const salirRef = useRef<() => void>(noop);
    const salir = useCallback(() => salirRef.current(), []);

    const commands = useNoteCommands({
        notes,
        onOpenDiagnostics: onOpenDiagnostics ?? noop,
        onCollapse: onCollapse ?? noop,
        onClearNote: clearNote,
        onPlayPong: onPlayPong ?? noop,
        // `//hi` insistido de más: la máquina te echa de la nota.
        //
        // Va por referencia porque `handleEscape` se declara más abajo y esto
        // se evalúa antes. El envoltorio es estable, así que no rehace el hook
        // en cada render.
        onLeaveNote: salir,
        // `//keep` deja el dibujo escrito donde estabas. Sólo puede pasar con la
        // nota en blanco —el comando ES todo el contenido— así que no pisa nada.
        onWriteNote: setContent,
        onKillPage: onKillPage ?? noop,
    });

    // Se sacan del objeto para poder declararlas como dependencias sin arrastrar
    // el objeto entero, que cambia de identidad en cada render.
    const { response: respuesta, rows, dismiss: descartar } = commands;

    const contentRef = useRef<HTMLTextAreaElement>(null);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Qué se envió al servidor por última vez. Es lo que decide si hay cambios
    // pendientes, sin necesidad de comparar contra la prop `note` (que cambia
    // de identidad en cada render del padre).
    const savedRef = useRef({ title: note.title, content: note.content });

    // Borrador actual, accesible desde callbacks sin recrearlos en cada tecla.
    // Se sincroniza en un efecto: escribir en una ref durante el render rompe
    // el render concurrente de React.
    const draftRef = useRef({ title: note.title, content: note.content });
    useEffect(() => {
        draftRef.current = { title, content };
    }, [title, content]);

    // El editor está montado para esta nota concreta: si cambia la nota
    // seleccionada, el padre lo remonta con `key`, así que no hace falta ningún
    // efecto de sincronización. El efecto anterior (que dependía de `note` y de
    // su propio estado) era el que disparaba los falsos "conflicto detectado".
    const noteId = note._id;

    const applyServerNote = useCallback((updated: Note) => {
        savedRef.current = { title: updated.title, content: updated.content };
        setCanUndo(Boolean(updated.versions?.length));
        setCanRedo(Boolean(updated.redoStack?.length));
    }, []);

    const reportState = useCallback(
        (state: SaveState) => {
            setSaveState(state);
            onSaveStateChange(state);
        },
        [onSaveStateChange]
    );

    /**
     * Envía los cambios pendientes.
     *
     * A diferencia de la versión anterior, NO reescribe el textarea con la
     * respuesta del servidor. Antes hacía setContent(updated.content), así que
     * si seguías tecleando durante el viaje de ida y vuelta tus pulsaciones se
     * descartaban y el cursor saltaba. Mientras el editor está abierto, el
     * textarea es la fuente de verdad; del servidor sólo se toman los flags de
     * historial.
     */
    const flush = useCallback(async () => {
        if (!isValidObjectId(noteId)) return;

        const draft = draftRef.current;
        const saved = savedRef.current;

        const payload: { title?: string; content?: string } = {};
        if (draft.title !== saved.title) payload.title = draft.title;
        if (draft.content !== saved.content) payload.content = draft.content;

        if (Object.keys(payload).length === 0) return;

        // Sin red no se intenta: se avisa y se reintenta al volver la conexión.
        if (!isFullyOperational) {
            reportState('error');
            return;
        }

        reportState('saving');

        const updated = await onSave(noteId, payload);

        if (updated) {
            applyServerNote(updated);
            reportState('saved');
        } else {
            // useNotes ya publicó el mensaje concreto en el estado de error.
            reportState('error');
        }
    }, [noteId, isFullyOperational, onSave, applyServerNote, reportState]);

    // Auto-guardado con debounce sobre el borrador.
    useEffect(() => {
        const saved = savedRef.current;
        if (title === saved.title && content === saved.content) return;

        // Mientras lo escrito sea un comando, NO se programa nada.
        //
        // Sin esto, la promesa de que "ni el comando ni su respuesta llegan a la
        // base de datos" es falsa: el auto-guardado corre a los 2,5 s de la
        // última tecla, así que escribir `//help` y tardar tres segundos en
        // pulsar Enter bastaba para guardarlo Y gastar un punto de historial.
        if (isCommandLine(content)) return;

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => void flush(), AUTOSAVE_DELAY_MS);

        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [title, content, flush]);

    // Guardar lo pendiente al desmontar (volver a la lista, cambiar de nota).
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            void flush();
        };
    }, [flush]);

    // Reintentar cuando la conexión VUELVE, no mientras haya un error.
    //
    // Depender de `saveState` acá creaba un bucle: el reintento ponía el estado
    // en 'saving', luego en 'error', el efecto volvía a dispararse por el cambio
    // de estado y reintentaba otra vez, sin parar. Sólo interesa el flanco de
    // subida de la conectividad, así que se compara contra el valor anterior.
    const wasOperationalRef = useRef(isFullyOperational);
    useEffect(() => {
        const recovered = isFullyOperational && !wasOperationalRef.current;
        wasOperationalRef.current = isFullyOperational;

        // flush() sincroniza con un sistema externo (la API) y sólo publica el
        // estado resultante: es el caso que la regla contempla como válido, pero
        // no puede verlo a través de la llamada.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (recovered) void flush();
    }, [isFullyOperational, flush]);

    // Al abrir la nota, el cursor va al FINAL del texto, no al principio.
    //
    // `focus()` a secas deja el cursor en la posición cero, así que al volver a
    // una nota ya escrita aparecías al comienzo y tenías que bajar a mano hasta
    // donde ibas. Retomar la escritura donde la dejaste es lo que se espera de
    // un editor.
    useEffect(() => {
        const el = contentRef.current;
        if (!el) return;

        el.focus();
        const fin = el.value.length;
        el.setSelectionRange(fin, fin);
        el.scrollTop = el.scrollHeight;
    }, []);

    // El padre necesita el tamaño para el medidor de la barra de estado, pero
    // NO en cada tecla: avisar al padre re-renderiza la página entera —barra
    // lateral y barra de estado incluidas— y encadena una actualización más por
    // pulsación. Escribiendo rápido, esa cadena llegaba al límite de
    // actualizaciones anidadas de React ("Maximum update depth exceeded"), React
    // abortaba el ciclo y la interfaz se quedaba congelada: los prompts
    // desaparecían y no volvían hasta que otro render los rescataba.
    //
    // Un medidor no necesita precisión de carácter: se agrupa cada 250 ms.
    useEffect(() => {
        if (!onLengthChange) return;

        const id = setTimeout(() => onLengthChange(content.length), 250);
        return () => clearTimeout(id);
    }, [content, onLengthChange]);

    const runHistoryAction = useCallback(
        async (action: (id: string) => Promise<Note | null>) => {
            if (!isValidObjectId(noteId)) return;

            // Se vacía lo pendiente ANTES de tocar el historial: si no, el
            // auto-guardado en vuelo pisaba el resultado del undo/redo.
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            await flush();

            const updated = await action(noteId);
            if (!updated) return;

            setTitle(updated.title);
            setContent(updated.content);
            applyServerNote(updated);
            reportState('saved');
        },
        [noteId, flush, applyServerNote, reportState]
    );

    const handleUndo = useCallback(() => {
        if (canUndo) void runHistoryAction(onUndo);
    }, [canUndo, runHistoryAction, onUndo]);

    const handleRedo = useCallback(() => {
        if (canRedo) void runHistoryAction(onRedo);
    }, [canRedo, runHistoryAction, onRedo]);

    const handleTrashConfirm = useCallback(async () => {
        setIsTrashing(true);

        // Se cancela lo pendiente: la nota se va a la papelera, guardarla antes
        // sólo crearía un punto de historial inútil.
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        savedRef.current = draftRef.current;

        const moved = await onMoveToTrash(noteId);
        setIsTrashing(false);
        setShowTrashConfirm(false);

        if (moved) onBack();
    }, [noteId, onMoveToTrash, onBack]);

    /**
     * Escape sale del editor, guardando lo que haya pendiente.
     *
     * No pregunta. El editor ya autoguarda cada 2,5 s y al perder el foco, así
     * que "¿querés guardar?" sería una pregunta cuya respuesta el sistema ya
     * conoce. Escape GUARDA en vez de preguntar.
     *
     * El flush se espera antes de volver: `onBack` recarga la lista, y sin
     * esperar la lista se recargaría con el contenido anterior — la nota que
     * acabás de escribir aparecería con el tamaño viejo.
     */
    const handleEscape = useCallback(() => {
        // Con una respuesta abierta, Escape la cierra y se queda: salir de la
        // nota además de cerrarla serían dos cosas con una tecla, y la que no
        // pediste es la que duele.
        if (respuesta) {
            descartar();
            return;
        }

        void (async () => {
            await flush();
            onBack();
        })();
        // `descartar` es estable (useCallback sin dependencias) y `respuesta`
        // cambia poquísimo, así que declararlas no rehace este callback en cada
        // pulsación. Se desestructuran arriba en vez de leer `commands.x` acá
        // para no meter en las dependencias el objeto entero, que sí cambia de
        // identidad en cada render.
    }, [respuesta, descartar, flush, onBack]);

    // Guardar antes de irse: que te eche no es excusa para perder nada.
    useEffect(() => {
        salirRef.current = handleEscape;
    }, [handleEscape]);

    useKeyboardShortcuts({
        onSave: () => void flush(),
        onUndo: handleUndo,
        onRedo: handleRedo,
        onEscape: handleEscape,
    });

    /**
     * Enter sobre un comando lo ejecuta en lugar de insertar un salto.
     *
     * La comprobación es SÍNCRONA y puramente sintáctica a propósito:
     * preventDefault tiene que llamarse dentro del manejador, no después de un
     * await, o el salto de línea ya se insertó. Si no es un comando, no se toca
     * nada: a nadie que esté escribiendo de verdad se le roba el Enter.
     */
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key !== 'Enter' || e.shiftKey) return;
            if (!isCommandLine(content)) return;

            e.preventDefault();
            setIsBooting(false);
            setContent('');
            void commands.run(content, noteId);
        },
        [content, noteId, commands]
    );

    const overContentLimit = content.length > LIMITS.CONTENT_MAX;

    return (
        <div className="flex flex-col h-full">
            <ConfirmDialog
                open={showTrashConfirm}
                title={t('dialog.trashTitle')}
                message={t('dialog.trashMessage')}
                confirmLabel={t('dialog.trashConfirm')}
                busy={isTrashing}
                onConfirm={handleTrashConfirm}
                onCancel={() => setShowTrashConfirm(false)}
            />

            {/* --- Barra superior --- */}
            <div className="border-b border-line bg-secondary p-4 flex flex-col gap-3 shrink-0">
                <div className="flex items-center justify-between gap-4">
                    <button type="button" onClick={onBack} className="btn-terminal">
                        {t('editor.back')}
                    </button>

                    <div className="flex items-center gap-2">
                        {saveState === 'saving' && (
                            <MetaTag variant="neutral">{t('editor.saving')}</MetaTag>
                        )}
                        {saveState === 'saved' && (
                            <MetaTag>{t('editor.saved')}</MetaTag>
                        )}
                        {saveState === 'error' && (
                            <MetaTag variant="error">{t('editor.notSaved')}</MetaTag>
                        )}
                        <MetaTag variant={overContentLimit ? 'error' : 'neutral'}>
                            {formatFileSize(content.length)}
                        </MetaTag>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label htmlFor="note-title-input" className="comment">
                        {t('editor.core')}
                    </label>
                    <input
                        id="note-title-input"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={() => void flush()}
                        maxLength={LIMITS.TITLE_MAX}
                        className="input-terminal pixel text-xl"
                        placeholder={t('editor.titlePlaceholder')}
                    />
                </div>
            </div>

            {/* --- Área de escritura ---
                El relleno derecho es menor que el resto a propósito: iguala el
                de la barra del título, así el borde derecho de la caja del
                título hace de guía y la barra de desplazamiento cae justo sobre
                esa misma línea, sin dejar un hueco muerto al lado. */}
            <div className="flex-1 min-h-0 bg-tertiary">
                <div className="h-full py-6 pl-6 pr-4">
                    <div className="editor-canvas">
                    <LinePrompts textareaRef={contentRef} value={content} />
                    <label htmlFor="note-content-textarea" className="sr-only">
                        {t('editor.contentLabel')}
                    </label>
                    {isBooting && !commands.response && (
                        <p className="editor-placeholder" aria-hidden="true">
                            <BootPrompt text={bootText} />
                        </p>
                    )}
                    {/* La respuesta de un comando ocupa el mismo hueco que el
                        arranque y se teclea con el mismo motor, sólo que más
                        rápido. Se retira sola al cerrar su arco. */}
                    {commands.response && (
                        // Un clic la cierra y devuelve el cursor. La respuesta
                        // recibe el ratón para poder desplazarla cuando es
                        // larga, así que sin esto taparía el editor hasta que
                        // terminara de escribirse sola.
                        <p className="editor-placeholder editor-reply">
                            {/* El clic va en el CONTENIDO y no en el marco.
                                Puesto en el marco, arrastrar la barra de
                                desplazamiento contaba como clic y cerraba la
                                respuesta justo cuando querías bajarla. */}
                            <span
                                className="editor-reply-body"
                                onClick={() => {
                                    commands.dismiss();
                                    contentRef.current?.focus();
                                }}
                            >
                                {/* Con filas —sólo `//help` por ahora— la
                                    respuesta se revela línea a línea y las que
                                    no se dejan leer se revuelven en su sitio.
                                    Sin filas, se teclea letra a letra como
                                    siempre. */}
                                {rows ? (
                                    <CommandRows
                                        key={commands.response}
                                        rows={rows}
                                        holdMs={replyTimings(commands.response).holdMs}
                                        onDone={commands.dismiss}
                                    />
                                ) : (
                                    <BootPrompt
                                        key={commands.response}
                                        text={commands.response}
                                        wakeMs={0}
                                        {...replyTimings(commands.response)}
                                        onDone={commands.dismiss}
                                    />
                                )}
                            </span>
                        </p>
                    )}
                    <textarea
                        id="note-content-textarea"
                        ref={contentRef}
                        value={content}
                        onKeyDown={handleKeyDown}
                        onChange={(e) => {
                            setIsBooting(false);
                            commands.dismiss();
                            setContent(e.target.value);
                        }}
                        onBlur={() => {
                            setIsBooting(false);
                            void flush();
                        }}
                        className={`editor-textarea${isBooting ? ' is-booting' : ''}`}
                        spellCheck={false}
                    />
                    </div>
                </div>
            </div>

            {overContentLimit && (
                <p className="notice shrink-0" role="alert">
                    <span>
                        {t('editor.overLimit', {
                            max: LIMITS.CONTENT_MAX.toLocaleString(lang),
                            excess: (content.length - LIMITS.CONTENT_MAX).toLocaleString(lang),
                        })}
                    </span>
                </p>
            )}

            {/* --- Acciones --- */}
            <div className="panel-footer justify-between">
                <span className="comment">{t('editor.quickActions')}</span>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleUndo}
                        disabled={!canUndo}
                        className="btn-terminal"
                        title={t('editor.undoTitle')}
                    >
                        {t('editor.undo')}
                    </button>
                    <button
                        type="button"
                        onClick={handleRedo}
                        disabled={!canRedo}
                        className="btn-terminal"
                        title={t('editor.redoTitle')}
                    >
                        {t('editor.redo')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowTrashConfirm(true)}
                        className="btn-terminal"
                        title={t('editor.trashTitle')}
                    >
                        {t('editor.trash')}
                    </button>
                </div>
            </div>
        </div>
    );
}
