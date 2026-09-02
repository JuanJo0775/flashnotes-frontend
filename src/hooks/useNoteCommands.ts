// src/hooks/useNoteCommands.ts
'use client';

import { useCallback, useState } from 'react';
import { notesApi } from '@/lib/api/notes.api';
import { formatLog } from '@/lib/system/requestLog';
import { formatFileSize, formatTime } from '@/lib/utils/formatters';
import {
    isCommandLine,
    run as runCommand,
    type CommandContext,
} from '@/lib/system/commands';
import {
    getSystemState,
    markSecretFound,
    setEffectsEnabled,
} from '@/hooks/useSystemState';
import { useTheme } from '@/hooks/useTheme';
import type { NoteHistory } from '@/types/note.types';
import { getLang } from '@/i18n';

/**
 * Ejecuta los comandos del editor.
 *
 * Vive en un hook y no en el componente por la regla de siempre: los componentes
 * pintan y reciben props, los hooks tienen el estado y hablan con `lib/api`.
 * `>history` sale a la red, así que le toca estar de este lado.
 *
 * La decisión de SI algo es un comando es puramente sintáctica y está en
 * `lib/system/commands` (`isCommandLine`): el editor la consulta él mismo, de
 * forma síncrona, porque necesita saberlo a tiempo de llamar a preventDefault
 * sobre el Enter.
 */

interface UseNoteCommandsOptions {
    /** Las notas de la sesión, para `>ls` y `>df`. */
    notes: readonly { title: string; chars: number }[];
    onOpenDiagnostics: () => void;
    onCollapse: () => void;
    onClearNote: () => void;
}

interface UseNoteCommandsReturn {
    /** La respuesta que hay que mostrar ahora mismo, o null. */
    response: string | null;
    /** Ejecuta el contenido si es un comando. Devuelve si lo era. */
    run: (content: string, noteId: string) => Promise<boolean>;
    dismiss: () => void;
}

/** Las versiones que guarda el backend, como una pila legible. */
function formatHistory(history: NoteHistory): string {
    if (history.versions.length === 0) {
        return getLang() === 'es'
            ? 'SIN VERSIONES GUARDADAS TODAVÍA.'
            : 'NO VERSIONS SAVED YET.';
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
}: UseNoteCommandsOptions): UseNoteCommandsReturn {
    const [response, setResponse] = useState<string | null>(null);
    const theme = useTheme();

    const run = useCallback(
        async (content: string, noteId: string): Promise<boolean> => {
            if (!isCommandLine(content)) return false;

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
            };

            const result = runCommand(content, ctx);
            if (!result) return false;

            if (result.secretId) markSecretFound(result.secretId);

            setResponse(result.output || null);

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
                case 'set-effects':
                    setEffectsEnabled(result.effect.enabled);
                    break;
                case 'fetch-history':
                    // `>history` deja primero un "CONSULTANDO ACTAS…" y lo
                    // reemplaza al volver. Si falla, lo dice: quedarse con el
                    // mensaje de espera parecería que la app se colgó.
                    try {
                        setResponse(formatHistory(await notesApi.history(noteId)));
                    } catch {
                        setResponse(
                            getLang() === 'es'
                                ? 'NO SE PUDO LEER EL HISTORIAL DE ESTA NOTA.'
                                : "COULDN'T READ THIS NOTE'S HISTORY."
                        );
                    }
                    break;
                default:
                    break;
            }

            return true;
        },
        [notes, theme, onOpenDiagnostics, onCollapse, onClearNote]
    );

    const dismiss = useCallback(() => setResponse(null), []);

    return { response, run, dismiss };
}
