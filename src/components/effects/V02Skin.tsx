// src/components/effects/V02Skin.tsx
'use client';

import { useEffect } from 'react';
import { useSystemState } from '@/hooks/useSystemState';

/**
 * Marca `<html>` mientras estás en la v0.2.
 *
 * Va en `<html>` y no en el envoltorio de la app por el mismo motivo que
 * `data-failing`: los diálogos se pintan en la capa superior del navegador,
 * fuera del subárbol de la app, y una v0.2 con un diálogo impecable en medio se
 * delataría sola (REGLAS · C5).
 *
 * El componente no pinta nada: sólo pone y quita el atributo. Todo lo que se ve
 * está en `styles/v02.css`.
 */

export const V02_ATTR = 'data-v02';

export default function V02Skin() {
    const { v02 } = useSystemState();

    useEffect(() => {
        const raiz = document.documentElement;

        if (v02) raiz.setAttribute(V02_ATTR, '1');
        else raiz.removeAttribute(V02_ATTR);

        // Se limpia al desmontar: si la app se va con la marca puesta, cualquier
        // cosa que quede en la página se vería rota sin motivo.
        return () => raiz.removeAttribute(V02_ATTR);
    }, [v02]);

    return null;
}
