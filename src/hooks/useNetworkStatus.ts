// src/hooks/useNetworkStatus.ts

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';

/**
 * Hook para detectar estado de conexión a Internet y backend
 * 
 * Detecta:
 * - window.online/offline events (conexión de red)
 * - Polling a /api/health cada 30s para verificar backend disponible
 * - Fallos de requests API
 * 
 * @returns {object} Estado de conexión y funciones de control
 */
export function useNetworkStatus() {
    const [isOnline, setIsOnline] = useState<boolean>(
        typeof window !== 'undefined' ? window.navigator.onLine : true
    );
    const [backendReachable, setBackendReachable] = useState<boolean>(true);
    const [lastChecked, setLastChecked] = useState<Date>(new Date());

    /**
     * Verifica si el backend está disponible
     */
    const checkBackendHealth = useCallback(async () => {
        try {
            const response = await apiClient.get('/health', {
                timeout: 5000, // 5s timeout
            });
            
            const isHealthy = response.data?.success === true;
            setBackendReachable(isHealthy);
            setLastChecked(new Date());
            
            return isHealthy;
        } catch (error) {
            console.warn('[useNetworkStatus] Backend health check failed:', error);
            setBackendReachable(false);
            setLastChecked(new Date());
            return false;
        }
    }, []);

    /**
     * Handler para cambio de conexión online/offline
     */
    useEffect(() => {
        const handleOnline = () => {
            console.log('[useNetworkStatus] Network connection restored');
            setIsOnline(true);
            // Verificar backend inmediatamente cuando la red vuelve
            checkBackendHealth();
        };

        const handleOffline = () => {
            console.warn('[useNetworkStatus] Network connection lost');
            setIsOnline(false);
            setBackendReachable(false);
        };

        // Registrar listeners
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Cleanup
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [checkBackendHealth]);

    /**
     * Polling periódico al backend cada 30s
     */
    useEffect(() => {
        // Check inicial
        checkBackendHealth();

        // Polling cada 30s
        const intervalId = setInterval(() => {
            // Solo hacer polling si la red está online
            if (isOnline) {
                checkBackendHealth();
            }
        }, 30000); // 30s

        return () => clearInterval(intervalId);
    }, [isOnline, checkBackendHealth]);

    /**
     * Determina si el sistema está completamente operativo
     */
    const isFullyOperational = isOnline && backendReachable;

    return {
        isOnline,           // Red del navegador disponible
        backendReachable,   // Backend responde a health checks
        isFullyOperational, // Ambos están OK
        lastChecked,        // Timestamp del último check
        checkBackendHealth, // Función para forzar un check manual
    };
}
