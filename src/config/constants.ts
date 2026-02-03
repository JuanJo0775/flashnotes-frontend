export const API_CONFIG = {
    BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
    TIMEOUT: 10000,
} as const;

export const STORAGE_KEYS = {
    BROWSER_ID: 'flashnotes_browser_id',
    NOTES_CACHE: 'flashnotes_notes_cache',
    LAST_SYNC: 'flashnotes_last_sync',
} as const;

export const APP_CONSTANTS = {
    AUTO_SAVE_DELAY: 500,
    TOAST_DURATION: 3000,
    MAX_TITLE_LENGTH: 200,
    MAX_CONTENT_LENGTH: 100000,
} as const;