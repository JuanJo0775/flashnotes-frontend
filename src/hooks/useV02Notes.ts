// src/hooks/useV02Notes.ts
'use client';

import { useSyncExternalStore } from 'react';
import {
    subscribeV02Notes,
    getV02NotesSnapshot,
    getV02NotesServerSnapshot,
} from '@/lib/system/v02Notes';
import type { Note } from '@/types/note.types';

/**
 * Los archivos de la v0.2, suscritos.
 *
 * Devuelve la lista vacía en el servidor: viven en `localStorage`, así que
 * pintarlos en el primer render daría un desajuste de hidratación (REGLAS · C1).
 */
export function useV02Notes(): Note[] {
    return useSyncExternalStore(
        subscribeV02Notes,
        getV02NotesSnapshot,
        getV02NotesServerSnapshot
    );
}
