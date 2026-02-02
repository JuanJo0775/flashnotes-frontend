import { v4 as uuidv4 } from 'uuid';
import { STORAGE_KEYS } from '@/config/constants';
import type { BrowserIdentity } from './storageTypes';

export const BrowserStorage = {
    // Obtener o crear identidad única del navegador
    getBrowserId(): string {
        if (typeof window === 'undefined') return '';

        const stored = localStorage.getItem(STORAGE_KEYS.BROWSER_ID);

        if (stored) {
            try {
                const identity: BrowserIdentity = JSON.parse(stored);
                // Actualizar última actividad
                identity.lastActive = new Date().toISOString();
                localStorage.setItem(STORAGE_KEYS.BROWSER_ID, JSON.stringify(identity));
                return identity.id;
            } catch {
                // Si hay error, crear nueva identidad
            }
        }

        // Crear nueva identidad
        const newIdentity: BrowserIdentity = {
            id: uuidv4(),
            createdAt: new Date().toISOString(),
            lastActive: new Date().toISOString(),
        };

        localStorage.setItem(STORAGE_KEYS.BROWSER_ID, JSON.stringify(newIdentity));
        return newIdentity.id;
    },

    // Limpiar todo (para debugging o reset)
    clearAll(): void {
        if (typeof window === 'undefined') return;
        Object.values(STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
    },

    // Guardar notas en caché
    cacheNotes(notes: any[]): void {
        if (typeof window === 'undefined') return;
        localStorage.setItem(STORAGE_KEYS.NOTES_CACHE, JSON.stringify(notes));
    },

    // Obtener notas del caché
    getCachedNotes(): any[] {
        if (typeof window === 'undefined') return [];
        const cached = localStorage.getItem(STORAGE_KEYS.NOTES_CACHE);
        return cached ? JSON.parse(cached) : [];
    },
};