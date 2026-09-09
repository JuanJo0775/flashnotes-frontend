// src/hooks/useTrash.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { notesApi } from '@/lib/api/notes.api';
import { getErrorInfo } from '@/lib/api/client';
import type { Message } from '@/i18n';
import { Note } from '@/types/note.types';
import { withIdValidation } from '@/lib/utils/validators';
import {
    GHOST_ID,
    buildGhostNote,
    shouldHaunt,
} from '@/lib/system/ghostFile';
import { SCRAP_ID, buildScrapNote, shouldScrap } from '@/lib/system/artScrap';
import { LEFT_ID, buildLeftNote, shownLeftNote } from '@/lib/system/entityNotes';
import {
    markLeft,
    markLooked,
    markSawBroma,
    readEntity,
} from '@/lib/system/entity';
import { formatLog } from '@/lib/system/requestLog';
import { getSystemState, markSecretFound } from '@/hooks/useSystemState';

interface UseTrashReturn {
    trashedNotes: Note[];
    isLoading: boolean;
    error: Message | null;

    restoreNote: (id: string) => Promise<boolean>;
    deletePermanently: (id: string) => Promise<boolean>;
    refreshTrash: () => Promise<void>;
    clearError: () => void;
}

/**
 * Cuándo se descartó el archivo fantasma. A nivel de módulo y no de estado
 * porque la papelera se monta y se desmonta al cambiar de vista: en un `useRef`
 * se olvidaría en cuanto salís, y el fantasma volvería en el acto.
 */
let ghostDismissedAt: number | null = null;

/**
 * Y cuándo se descartó el resto de la pieza.
 *
 * Mismo motivo que el del fantasma: a nivel de módulo, porque la papelera se
 * monta y se desmonta al cambiar de vista.
 *
 * ⚠ PERO ÉSTE NO VUELVE. El fantasma reaparece pasado un rato —es un archivo que
 * el sistema regenera—; el resto es una pista, y una pista que insiste después
 * de que la tiraste deja de ser una pista para ser un pesado.
 */
let scrapDismissed = false;

export const useTrash = (): UseTrashReturn => {
    const [trashedNotes, setTrashedNotes] = useState<Note[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Message | null>(null);

    /**
     * Carga las notas en papelera
     */
    const loadTrash = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const { notes } = await notesApi.listTrash(1, 100);

            // El archivo fantasma se inyecta acá y sólo acá: nunca existe en la
            // base de datos. Su contenido es el registro real de peticiones de
            // esta pestaña, así que es coherente que muera con ella.
            const system = getSystemState();
            const haunted = shouldHaunt({
                sessionMs: Date.now() - system.sessionStart,
                notesCount: notes.length + system.permanentDeletes,
                dismissedAt: ghostDismissedAt,
                now: Date.now(),
            });

            /*
             * Y EL RESTO DE LA PIEZA, por el mismo camino.
             *
             * Ganás una pieza y el sistema la archiva mal: acá queda lo que
             * recuperó, comido, con las letras de `//art` repartidas entre la
             * basura. Es lo que impide que alguien junte cinco piezas sin
             * enterarse nunca de que hay una colección.
             *
             * Va DESPUÉS del fantasma en la lista —o sea debajo— porque el
             * fantasma lleva más tiempo ahí: el orden cuenta quién llegó antes.
             */
            const resto = !scrapDismissed && shouldScrap() ? buildScrapNote() : null;

            /*
             * Y LO QUE DEJÓ EL ENTE, por el mismo camino que los otros dos.
             *
             * Va ARRIBA DEL TODO, y es lo único que rompe el orden de «quien
             * llegó antes va debajo»: lo suyo apareció mientras no estabas, así
             * que es lo más nuevo que hay acá. Y la del día siguiente sólo
             * funciona si se ve al entrar — una nota que te espera enterrada
             * bajo el registro del sistema no te espera, se esconde.
             *
             * ⚠ SE MUESTRA, PERO NO SE DA POR DEJADA TODAVÍA. Marcarla acá
             * haría que abrir la papelera dos veces enseñara dos notas
             * distintas, y la primera desaparecería sin que hicieras nada. Se
             * da por dejada cuando VOS la quitás —restaurándola o borrándola—,
             * que es cuando de verdad la viste. Ver abajo.
             */
            const suya = buildLeftNote();

            /*
             * ⚠ QUE FUISTE A BUSCAR EL ARCHIVO QUE TE DIJO.
             *
             * La broma te manda a mirar acá abajo. Se cuenta como «fuiste» en
             * la SEGUNDA lectura de la papelera con la broma ya dicha, no en la
             * primera: en la primera es cuando la leés, y contarla ahí sería
             * darte por buscado antes de haber podido buscar.
             *
             * Por eso se mira si YA la había visto antes de esta lectura.
             */
            const yaLaVio = readEntity().sawBroma === true;
            if (shownLeftNote() === 'broma') markSawBroma();
            if (yaLaVio) markLooked();

            const inyectadas = [
                ...(suya ? [suya] : []),
                ...(haunted ? [buildGhostNote(formatLog())] : []),
                ...(resto ? [resto] : []),
            ];

            if (haunted) markSecretFound('ghost-file');
            setTrashedNotes([...inyectadas, ...notes]);
        } catch (err) {
            const message = getErrorInfo(err);
            setError(message);
            setTrashedNotes([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Restaura una nota desde la papelera
     * Usa withIdValidation para validación centralizada
     */
    const restoreNote = useCallback(async (id: string): Promise<boolean> => {
        // Restaurarlo tampoco sale a la red: se descarta, igual que borrarlo.
        if (id === GHOST_ID) {
            ghostDismissedAt = Date.now();
            setTrashedNotes((prev) => prev.filter((note) => note._id !== GHOST_ID));
            return true;
        }

        /*
         * LA SUYA: restaurarla la convierte en una nota tuya de verdad, como el
         * resto de arte. La del día siguiente trae instrucciones, y quien la
         * restaura es porque quiere quedárselas a mano.
         *
         * Y acá SÍ se da por dejada: la próxima vez habrá otra.
         */
        if (id === LEFT_ID) {
            const suya = buildLeftNote();
            if (suya === null) return false;

            try {
                setError(null);
                await notesApi.create({
                    title: suya.title,
                    content: suya.content,
                });
            } catch (err) {
                setError(getErrorInfo(err));
                return false;
            }

            const cual = shownLeftNote();
            if (cual !== null) markLeft(cual);

            setTrashedNotes((prev) => prev.filter((note) => note._id !== LEFT_ID));
            return true;
        }

        /*
         * ⚠ RECUPERARLO LO CONVIERTE EN UNA NOTA DE VERDAD.
         *
         * Acá estaba copiado el comportamiento del fantasma —descartar y ya— y
         * era un fallo: en el fantasma «recuperar» significa «quitámelo de
         * encima», porque es un registro que se lee de un vistazo en la propia
         * tarjeta. El resto es un DIBUJO de cuarenta columnas, y la tarjeta sólo
         * enseña ciento cuarenta caracteres recortados: pulsar recuperar hacía
         * desaparecer justo lo que se quería mirar.
         *
         * Ahora se crea de verdad, con su contenido entero, y queda entre tus
         * notas para abrirla, leerla y quedártela. Es lo que «recuperar»
         * significa en cualquier papelera.
         */
        if (id === SCRAP_ID) {
            const resto = buildScrapNote();
            if (resto === null) return false;

            try {
                setError(null);
                await notesApi.create({
                    title: resto.title,
                    content: resto.content,
                });
            } catch (err) {
                setError(getErrorInfo(err));
                return false;
            }

            scrapDismissed = true;
            setTrashedNotes((prev) => prev.filter((note) => note._id !== SCRAP_ID));
            return true;
        }

        try {
            setError(null);

            // Usar wrapper centralizado para validación de ID
            await withIdValidation(id, () => notesApi.restore(id));

            // Remover del estado local
            setTrashedNotes((prev) => prev.filter((note) => note._id !== id));

            return true;
        } catch (err) {
            const message = getErrorInfo(err);
            setError(message);
            return false;
        }
    }, []);

    /**
     * Elimina permanentemente una nota
     * Usa withIdValidation para validación centralizada
     */
    const deletePermanently = useCallback(async (id: string): Promise<boolean> => {
        // El fantasma no existe en el servidor: borrarlo se simula. Sin esto, la
        // llamada saldría con un id inválido y además gastaría una de las diez
        // bajas que el backend permite cada quince minutos.
        if (id === GHOST_ID) {
            ghostDismissedAt = Date.now();
            setTrashedNotes((prev) => prev.filter((note) => note._id !== GHOST_ID));
            return true;
        }

        /*
         * LA SUYA: tirarla también es haberla visto.
         *
         * Se da por dejada acá y no al mostrarla, así que la próxima vez habrá
         * otra. Tampoco sale a la red: no existe en el servidor.
         */
        if (id === LEFT_ID) {
            const cual = shownLeftNote();
            if (cual !== null) markLeft(cual);
            setTrashedNotes((prev) => prev.filter((note) => note._id !== LEFT_ID));
            return true;
        }

        // Borrarlo sí es tirarlo, y no vuelve: ya dijo lo que tenía que decir.
        // Tampoco sale a la red, que no existe en el servidor.
        if (id === SCRAP_ID) {
            scrapDismissed = true;
            setTrashedNotes((prev) => prev.filter((note) => note._id !== SCRAP_ID));
            return true;
        }

        try {
            setError(null);

            // Usar wrapper centralizado para validación de ID
            await withIdValidation(id, () => notesApi.deletePermanently(id));

            // Remover del estado local
            setTrashedNotes((prev) => prev.filter((note) => note._id !== id));

            return true;
        } catch (err) {
            const message = getErrorInfo(err);
            setError(message);
            return false;
        }
    }, []);

    /**
     * Refresca la lista de papelera
     */
    const refreshTrash = useCallback(async () => {
        await loadTrash();
    }, [loadTrash]);

    /**
     * Limpia el error
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    /**
     * Carga inicial
     */
    useEffect(() => {
        void loadTrash();
    }, [loadTrash]);

    return {
        trashedNotes,
        isLoading,
        error,
        restoreNote,
        deletePermanently,
        refreshTrash,
        clearError,
    };
};