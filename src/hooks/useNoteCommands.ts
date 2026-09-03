// src/hooks/useNoteCommands.ts
'use client';

import { useCallback, useState } from 'react';
import { notesApi } from '@/lib/api/notes.api';
import { formatLog } from '@/lib/system/requestLog';
import { startDrift } from '@/lib/system/timeDrift';

import { formatFileSize, formatTime } from '@/lib/utils/formatters';
import {
    isExecutable,
    isGreetingLine,
    isChatLine,
    run as runCommand,
    type CommandContext,
    type ReplyRow,
} from '@/lib/system/commands';
import {
    getSystemState,
    markSecretFound,
    registerGreeting,
    registerChat,
    registerKick,
    registerV02Toggle,
    kickCount,
    resetEverything,
    setEffectsEnabled,
} from '@/hooks/useSystemState';
import { useTheme } from '@/hooks/useTheme';
import type { NoteHistory } from '@/types/note.types';
import { getLang } from '@/i18n';
import type { Localized } from '@/i18n';

// `Localized` y no ternarios: al añadir un idioma dejan de compilar en vez
// de servir inglés en silencio. Ver `i18n/types.ts`.
const SIN_VERSIONES: Localized = {
    es: 'SIN VERSIONES GUARDADAS TODAVÍA.',
    en: 'NO VERSIONS SAVED YET.',
};

const HISTORIAL_ILEGIBLE: Localized = {
    es: 'NO SE PUDO LEER EL HISTORIAL DE ESTA NOTA.',
    en: "COULDN'T READ THIS NOTE'S HISTORY.",
};

/**
 * Ejecuta los comandos del editor.
 *
 * Vive en un hook y no en el componente por la regla de siempre: los componentes
 * pintan y reciben props, los hooks tienen el estado y hablan con `lib/api`.
 * `//history` sale a la red, así que le toca estar de este lado.
 *
 * La decisión de SI algo es un comando es puramente sintáctica y está en
 * `lib/system/commands` (`isCommandLine`): el editor la consulta él mismo, de
 * forma síncrona, porque necesita saberlo a tiempo de llamar a preventDefault
 * sobre el Enter.
 */

interface UseNoteCommandsOptions {
    /** Las notas de la sesión, para `//ls` y `//df`. */
    notes: readonly { title: string; chars: number }[];
    onOpenDiagnostics: () => void;
    onCollapse: () => void;
    onClearNote: () => void;
    /** Abre el `vsync-test`. Sólo lo dispara `//attach_6`. */
    onPlayPong: () => void;
    /** `//hi` insistido de más: te saca de la nota. */
    onLeaveNote: () => void;
    /** `//keep`: deja el dibujo escrito en la nota abierta. */
    onWriteNote: (text: string, title?: string) => void;
    /** Insististe hasta que te echó tres veces: la página se queda muerta. */
    onKillPage: () => void;
    /**
     * Enseña la pantalla de borrado.
     *
     * `prank` distingue las dos: con `false` ya se borró todo y esto lo cuenta;
     * con `true` no se tocó nada y es teatro.
     */
    onWipe: (prank: boolean) => void;
}

interface UseNoteCommandsReturn {
    /** La respuesta que hay que mostrar ahora mismo, o null. */
    response: string | null;
    /** La respuesta por filas, cuando alguna no es texto. */
    rows: ReplyRow[] | null;
    /** Ejecuta el contenido si es un comando. Devuelve si lo era. */
    run: (content: string, noteId: string) => Promise<boolean>;
    dismiss: () => void;
}

/** Las versiones que guarda el backend, como una pila legible. */
function formatHistory(history: NoteHistory): string {
    if (history.versions.length === 0) {
        return SIN_VERSIONES[getLang()];
    }

    // La más reciente arriba: es el orden en que uno busca en un historial.
    return [...history.versions]
        .map((version, i) => {
            const etiqueta = `v${i + 1}`.padEnd(4);
            const cuando = version.editedAt ? formatTime(version.editedAt) : '--:--:--';
            const tamano = formatFileSize(version.content.length);
            const puntos = '·'.repeat(Math.max(1, 18 - tamano.length));
            return `> ${etiqueta} ${cuando} ${puntos} ${tamano}`;
        })
        .reverse()
        .join('\n');
}

export function useNoteCommands({
    notes,
    onOpenDiagnostics,
    onCollapse,
    onClearNote,
    onPlayPong,
    onLeaveNote,
    onWriteNote,
    onKillPage,
    onWipe,
}: UseNoteCommandsOptions): UseNoteCommandsReturn {
    const [response, setResponse] = useState<string | null>(null);
    const [rows, setRows] = useState<ReplyRow[] | null>(null);
    const theme = useTheme();

    const run = useCallback(
        async (content: string, noteId: string): Promise<boolean> => {
            // `isExecutable` y no `isCommandLine`: la respuesta a un `[y/n]` no
            // lleva prefijo, porque una terminal que pregunta espera una letra y
            // no otro comando.
            if (!isExecutable(content)) return false;

            const system = getSystemState();

            const ctx: CommandContext = {
                now: new Date(),
                sessionStart: new Date(system.sessionStart),
                notes,
                integrity: system.integrity,
                theme,
                effectsEnabled: system.effectsEnabled,
                secretsFound: system.secretsFound,
                secretsTotal: system.secretsTotal,
                log: formatLog(),
                // Se cuenta ANTES de resolver: la respuesta depende de cuántas
                // van, incluida ésta. Cuenta aunque el comando no sea `//hi`
                // sólo si lo es — ver abajo.
                greetings: 0,
                chat: 0,
                kicks: 0,
            };

            // La cuenta sólo se toca cuando el comando es el saludo: contar en
            // cada comando haría que teclear `//help` seis veces te echara.
            if (isGreetingLine(content)) ctx.greetings = registerGreeting();
            // La conversación sólo existe justo después de un saludo. Fuera de
            // ahí `registerChat` devuelve 0 y los comandos no existen.
            if (isChatLine(content)) ctx.chat = registerChat();

            // La cuenta de expulsiones se lee ANTES de resolver, porque decide
            // si esta vez te echa o si ya no hay a dónde echarte.
            ctx.kicks = kickCount() + 1;

            const result = runCommand(content, ctx);
            if (!result) return false;

            if (result.secretId) markSecretFound(result.secretId);

            /*
             * ⚠ UN COMANDO QUE ESCRIBE EN LA NOTA NO DEJA RESPUESTA.
             *
             * La respuesta se pinta en el hueco del MARCADOR DE POSICIÓN, encima
             * del área de texto: funciona porque los comandos se ejecutan con la
             * nota vacía y ahí no tapa nada. Pero `//keep` y `//recover` escriben
             * contenido en esa misma nota, así que la respuesta caía justo encima
             * de la primera línea de lo que acababan de escribir — el dibujo salía
             * con el renglón de arriba pisado por un «AHÍ LA TIENE.».
             *
             * Y callar no pierde nada: en estos dos el resultado ES la respuesta.
             * Lo ejecutás y aparece el dibujo donde estabas mirando, que es
             * exactamente lo que se le pedía a `//keep`.
             */
            const escribeEnLaNota = result.effect.kind === 'write-note';

            setResponse(escribeEnLaNota ? null : result.output || null);
            setRows(escribeEnLaNota ? null : result.rows ?? null);

            switch (result.effect.kind) {
                case 'open-diagnostics':
                    onOpenDiagnostics();
                    break;
                case 'collapse':
                    onCollapse();
                    break;
                case 'clear-note':
                    onClearNote();
                    break;
                case 'play-pong':
                    onPlayPong();
                    break;
                case 'leave-note':
                    registerKick();
                    onLeaveNote();
                    break;
                case 'write-note':
                    onWriteNote(result.effect.text, result.effect.title);
                    break;
                case 'reset-all':
                    // Se borra AHORA y la pantalla lo cuenta después. Si los
                    // datos se fueran yendo al ritmo de los fotogramas, cerrar
                    // la pestaña a mitad dejaría medio limpio y medio no.
                    resetEverything();
                    onWipe(false);
                    break;
                case 'reset-prank':
                    onWipe(true);
                    break;
                case 'kill-page':
                    registerKick();
                    onKillPage();
                    break;
                case 'toggle-v02':
                    // Se le pasa la palabra: al entrar queda guardada, y es la
                    // que sacará mañana aunque el morse de mañana diga otra.
                    registerV02Toggle(result.effect.word);
                    break;
                case 'recover':
                    // Se devuelve al editor por la misma vía que `//keep`: es
                    // texto que va a la nota abierta.
                    onWriteNote(result.effect.text);
                    break;
                case 'time-drift':
                    startDrift(Date.now());
                    break;
                case 'set-effects':
                    setEffectsEnabled(result.effect.enabled);
                    break;
                case 'fetch-history':
                    // `//history` deja primero un "CONSULTANDO ACTAS…" y lo
                    // reemplaza al volver. Si falla, lo dice: quedarse con el
                    // mensaje de espera parecería que la app se colgó.
                    try {
                        setResponse(formatHistory(await notesApi.history(noteId)));
                    } catch {
                        setResponse(
                            HISTORIAL_ILEGIBLE[getLang()]
                        );
                    }
                    break;
                default:
                    break;
            }

            return true;
        },
        [
            notes,
            theme,
            onOpenDiagnostics,
            onCollapse,
            onClearNote,
            onPlayPong,
            onLeaveNote,
            onWriteNote,
            onKillPage,
            onWipe,
        ]
    );

    const dismiss = useCallback(() => {
        setResponse(null);
        setRows(null);
    }, []);

    return { response, rows, run, dismiss };
}
