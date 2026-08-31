// src/components/ui/MetaTag.tsx
'use client';

import type { ReactNode } from 'react';

type Variant = 'neutral' | 'success' | 'error' | 'warning';

interface MetaTagProps {
    children: ReactNode;
    variant?: Variant;
}

const VARIANT_CLASS: Record<Variant, string> = {
    neutral: 'meta-tag',
    success: 'meta-tag status-ok',
    error: 'meta-tag status-error',
    warning: 'meta-tag status-warn',
};

/** Etiqueta de metadato: hora, tamaño, estado. */
export default function MetaTag({ children, variant = 'neutral' }: MetaTagProps) {
    return <span className={VARIANT_CLASS[variant]}>{children}</span>;
}
