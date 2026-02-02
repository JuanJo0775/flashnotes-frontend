export const APP_CONFIG = {
    name: 'FlashNotes',
    version: '1.0.0',
    description: 'Tu cuaderno del momento, en este navegador',
} as const;

export const STORAGE_KEYS = {
    BROWSER_ID: 'flashnotes_browser_id',
    NOTES_CACHE: 'flashnotes_notes_cache',
    LAST_SYNC: 'flashnotes_last_sync',
} as const;

export const API_CONFIG = {
    BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
    TIMEOUT: 10000,
} as const;

export const EDITOR_CONFIG = {
    AUTO_SAVE_DELAY: 1000, // 1 segundo
    MAX_UNDO_STEPS: 50,
    DEBOUNCE_DELAY: 300,
} as const;