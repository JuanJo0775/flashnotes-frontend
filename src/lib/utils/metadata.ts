// src/lib/utils/metadata.ts

/**
 * Genera metadata del sistema para mostrar en UI
 */

export interface SystemMetadata {
    lat: string;
    long: string;
    size: string;
    status: 'SYNCED' | 'PENDING' | 'ERROR';
    timestamp: string;
}

/**
 * Obtiene coordenadas geográficas simuladas
 * (en producción podrías usar Geolocation API)
 */
export function getCoordinates(): { lat: string; long: string } {
    // Valores simulados para el diseño
    return {
        lat: '40.7128',
        long: '-74.0060'
    };
}

/**
 * Genera metadata para un documento
 */
export function generateDocumentMetadata(
    content: string,
    isSynced: boolean = true
): SystemMetadata {
    const coords = getCoordinates();
    const size = calculateSize(content.length);

    return {
        lat: coords.lat,
        long: coords.long,
        size,
        status: isSynced ? 'SYNCED' : 'PENDING',
        timestamp: new Date().toISOString()
    };
}

/**
 * Calcula el tamaño legible
 */
function calculateSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}b`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}kb`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}mb`;
}

/**
 * Genera info del sistema
 */
export function getSystemInfo() {
    return {
        version: 'v1.0',
        name: 'NOTES_OS',
        memory: {
            used: 70,
            total: 100,
            unit: 'g'
        }
    };
}
