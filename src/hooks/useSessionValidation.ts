'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { apiClient } from '@/lib/api/client';

/**
 * Hook para detectar cambios de sesión en el navegador
 * Valida que la cookie de sesión siga siendo la misma
 * 
 * Uso: En app.tsx o layout.tsx para monitorear a nivel global
 */
export const useSessionValidation = (onSessionChanged?: () => void) => {
    const [sessionStatus, setSessionStatus] = useState<'valid' | 'expired' | 'unknown'>('valid');
    const [showSessionWarning, setShowSessionWarning] = useState(false);
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

    useEffect(() => {
        // Intentar obtener el sessionId de la cookie leyendo desde una API dummy
        // o verificando cambios en documento.cookie
        
        const checkSession = async () => {
            try {
                // Hacer un pequeño request para verificar que la sesión siga activa
                // Si el servidor devuelve un error de sesión inválida, significa que cambió
                const response = await apiClient.get('/notes');

                if (response.status === 401 || response.status === 403) {
                    // Sesión expiró o no es válida
                    setSessionStatus('expired');
                    setShowSessionWarning(true);
                    if (onSessionChanged) {
                        onSessionChanged();
                    }
                } else {
                    setSessionStatus('valid');
                }
            } catch (error) {
                const status = axios.isAxiosError(error) ? error.response?.status : undefined;
                if (status === 401 || status === 403) {
                    setSessionStatus('expired');
                    setShowSessionWarning(true);
                    if (onSessionChanged) {
                        onSessionChanged();
                    }
                } else if (axios.isAxiosError(error) && !error.response) {
                    // Error de conexión (sin respuesta del servidor)
                    setIsOnline(false);
                    console.error('Pérdida de conectividad detectada:', error.message);
                } else {
                    console.error('Error checking session:', error);
                    setSessionStatus('unknown');
                }
            }
        };

        // Verificar al montar
        checkSession();

        // Verificar periódicamente cada 5 minutos
        const sessionInterval = setInterval(checkSession, 5 * 60 * 1000);

        // ========================================
        // 🔴 HEARTBEAT - Detectar conexión cada 30 segundos
        // ========================================
        const heartbeatCheck = async () => {
            // Si ya sabemos que estamos sin conexión, no hacer el check
            if (!isOnline) {
                return;
            }

            try {
                // Request ligero para verificar conectividad (ping)
                await apiClient.get('/csrf-token', { timeout: 5000 });
                // Si llegamos aquí, hay conexión
                setIsOnline(true);
            } catch (error) {
                // Si falla, probablemente no hay conexión
                if (axios.isAxiosError(error) && !error.response) {
                    setIsOnline(false);
                    console.warn('[Heartbeat] Pérdida de conexión con el servidor');
                }
            }
        };

        const heartbeatInterval = setInterval(heartbeatCheck, 30 * 1000);

        // ========================================
        // 🌐 Eventos del navegador para conectividad
        // ========================================
        const handleOnline = () => {
            console.log('[Connectivity] Usuario está en línea');
            setIsOnline(true);
            // Verificar sesión inmediatamente al reconectar
            checkSession();
        };

        const handleOffline = () => {
            console.log('[Connectivity] Usuario está sin línea');
            setIsOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // También verificar cuando el usuario vuelve a la pestaña
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('[Visibility] Pestaña visible - verificando sesión');
                checkSession();
                heartbeatCheck();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(sessionInterval);
            clearInterval(heartbeatInterval);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isOnline, onSessionChanged]);

    const dismissWarning = () => {
        setShowSessionWarning(false);
    };

    const reloadPage = () => {
        window.location.reload();
    };

    return {
        sessionStatus,
        showSessionWarning,
        isOnline,
        dismissWarning,
        reloadPage,
    };
};
