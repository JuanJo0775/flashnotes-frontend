// UBICACIÓN: src/lib/utils/formatters.ts
// ACCIÓN: REEMPLAZAR COMPLETO

/**
 * Formatea una fecha al estilo terminal: YYYY.MM.DD
 */
export function formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
}

/**
 * Formatea una hora al estilo terminal: HH:MM:SS
 */
export function formatTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const minutes = String(d.getUTCMinutes()).padStart(2, '0');
    const seconds = String(d.getUTCSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

/**
 * Formatea fecha y hora completa
 */
export function formatDateTime(date: Date | string): string {
    return `${formatDate(date)} ${formatTime(date)}`;
}

/**
 * Formatea el tamaño de archivo en bytes, KB, MB, etc.
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0b';
    if (bytes < 1024) return `${bytes}b`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}kb`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}mb`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}gb`;
}

/**
 * Formatea tiempo relativo (ej: "hace 5m")
 */
export function formatRelativeTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diff = now.getTime() - d.getTime();

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 10) return 'ahora';
    if (seconds < 60) return `${seconds}s`;
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 30) return `${days}d`;
    return formatDate(d);
}

/**
 * Trunca texto con elipsis
 */
export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    // Calcular cuántos caracteres podemos mostrar antes del ellipsis
    // Asegurar que siempre haya al menos 1 carácter antes del ellipsis si el texto es truncado
    const charsBeforeEllipsis = Math.max(1, maxLength - 3);
    return text.slice(0, charsBeforeEllipsis) + '...';
}

/**
 * Genera un ID corto para mostrar
 */
export function shortId(id: string, length: number = 8): string {
    return id.slice(0, length);
}
