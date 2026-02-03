'use client';

import { useEffect, useState } from 'react';

/**
 * Hook para detectar cambios de sesión en el navegador
 * Valida que la cookie de sesión siga siendo la misma
 * 
 * Uso: En app.tsx o layout.tsx para monitorear a nivel global
 */
export const useSessionValidation = (onSessionChanged?: () => void) => {
    const [sessionStatus, setSessionStatus] = useState<'valid' | 'expired' | 'unknown'>('valid');
    const [showSessionWarning, setShowSessionWarning] = useState(false);

    useEffect(() => {
        // Intentar obtener el sessionId de la cookie leyendo desde una API dummy
        // o verificando cambios en documento.cookie
        
        const checkSession = async () => {
            try {
                // Hacer un pequeño request para verificar que la sesión siga activa
                // Si el servidor devuelve un error de sesión inválida, significa que cambió
                const response = await fetch('/api/notes', {
                    method: 'GET',
                    credentials: 'include', // Incluir cookies
                });

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
                console.error('Error checking session:', error);
                setSessionStatus('unknown');
            }
        };

        // Verificar al montar
        checkSession();

        // Verificar periódicamente cada 5 minutos
        const interval = setInterval(checkSession, 5 * 60 * 1000);

        // También verificar cuando el usuario vuelve a la pestaña
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkSession();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [onSessionChanged]);

    const dismissWarning = () => {
        setShowSessionWarning(false);
    };

    const reloadPage = () => {
        window.location.reload();
    };

    return {
        sessionStatus,
        showSessionWarning,
        dismissWarning,
        reloadPage,
    };
};
