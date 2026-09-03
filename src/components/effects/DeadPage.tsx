// src/components/effects/DeadPage.tsx
'use client';

import { useEffect } from 'react';

/**
 * La página muerta.
 *
 * `//hi` te saca de la nota a la octava. Si volvés e insistís hasta que te eche
 * tres veces, esto: negro, vacío, sin interfaz. Como una pestaña que se cerró y
 * quedó el hueco.
 *
 * ⚠ NO SE PUEDE CERRAR LA PESTAÑA. Los navegadores sólo permiten `window.close()`
 * en pestañas que abrió un script; la que abrió el usuario está protegida. Se
 * intenta igual —por si acaso corre en una ventana emergente— y si no, queda
 * esto.
 *
 * Y esto es MEJOR que cerrarla de verdad: una pestaña cerrada no cuenta nada,
 * porque ya no está. Un rectángulo negro donde estaba tu bloc de notas se queda
 * mirándote.
 *
 * NO SE PIERDE NADA: la nota se guardó antes de echarte, igual que con Escape.
 * Recargar devuelve la app entera.
 */
export default function DeadPage() {
    useEffect(() => {
        // Por si acaso: en una pestaña normal no hace nada y el navegador avisa
        // por consola. Es el único intento y no se insiste.
        try {
            window.close();
        } catch {
            // Bloqueado, como se esperaba.
        }
    }, []);

    return (
        <div
            className="dead-page"
            data-testid="dead-page"
            role="presentation"
            aria-hidden="true"
        />
    );
}
