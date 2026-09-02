// src/components/ui/MetaTag.tsx
'use client';

import type { ReactNode } from 'react';

type Variant = 'neutral' | 'error' | 'warning';

interface MetaTagProps {
    children: ReactNode;
    variant?: Variant;
}

/*
 * No hay variante de "éxito" a propósito: en esta interfaz el color sólo aparece
 * cuando algo requiere atención. Que todo vaya bien se comunica en el mismo
 * negro o blanco que el resto del texto.
 */
const VARIANT_CLASS: Record<Variant, string> = {
    neutral: 'meta-tag',
    error: 'meta-tag status-error',
    warning: 'meta-tag status-warn',
};

/** Etiqueta de metadato: hora, tamaño, estado. */
export default function MetaTag({ children, variant = 'neutral' }: MetaTagProps) {
    return <span className={VARIANT_CLASS[variant]}>{children}</span>;
}
