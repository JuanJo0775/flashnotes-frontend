// UBICACIÓN: src/lib/utils/formatters.ts
// ACCIÓN: REEMPLAZAR COMPLETO

import { getLang, translate } from '@/i18n';

/**
 * Formatea una fecha al estilo terminal: YYYY.MM.DD
 *
 * EN LA HORA DEL DISPOSITIVO, no en UTC.
 *
 * Usaba `getUTC*`, y eso no era una decisión de diseño sino un descuido con
 * consecuencias reales: a alguien en UTC-3, a partir de las nueve de la noche la
 * app le mostraba la fecha de MAÑANA en la cabecera y en cada nota. Una app de
 * notas que se equivoca de día no tiene ninguna gracia.
 *
 * El chiste del huso (`//date`) no se pierde: sigue enseñando tu hora, la del
 * sistema y el desfase. Al revés — ahora dice algo mejor. La máquina te traduce
 * la hora, pero por dentro nunca se mudó.
 */
export function formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
}

/**
 * Formatea una hora al estilo terminal: HH:MM:SS
 *
 * También en la hora del dispositivo, por el mismo motivo que `formatDate`: una
 * nota guardada a las 22:00 tiene que decir 22:00, no 01:00 del día siguiente.
 */
export function formatTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

/**
 * Formatea fecha y hora completa
 */
export function formatDateTime(date: Date | string): string {
    return `${formatDate(date)} ${formatTime(date)}`;
}

/**
 * Formatea una duración como HH:MM:SS.
 *
 * A diferencia del resto de este archivo, esto NO es una fecha: es un intervalo,
 * así que no le afecta el huso. La comparten el comando `//uptime` y la fila
 * TIEMPO ACTIVO del panel de diagnóstico, y viven juntas justamente para que las
 * dos no puedan divergir.
 */
export function formatDuration(ms: number): string {
    const total = Math.max(0, Math.floor(ms / 1000));
    const hours = String(Math.floor(total / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const seconds = String(total % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
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
 * Formatea tiempo relativo (ej: "5m", "3h").
 *
 * Sólo el tramo más reciente lleva palabra —"ahora" / "now"—; el resto son
 * cifras con su unidad, que se escriben igual en los dos idiomas. Por eso este
 * módulo no depende de React: lee el idioma del almacén directamente, como hace
 * `getErrorMessage`.
 */
export function formatRelativeTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diff = now.getTime() - d.getTime();

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 10) return translate(getLang(), 'time.now');
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
