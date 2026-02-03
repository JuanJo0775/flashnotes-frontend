// src/components/ui/MetaTag.tsx

'use client';

import { ReactNode } from 'react';

interface MetaTagProps {
    children: ReactNode;
    variant?: 'neutral' | 'success' | 'error' | 'warning';
    size?: 'xs' | 'sm' | 'md';
}

export default function MetaTag({
                                    children,
                                    variant = 'neutral',
                                    size = 'sm'
                                }: MetaTagProps) {
    const sizeClasses = {
        xs: 'text-[10px] px-1.5 py-0.5',
        sm: 'text-xs px-2 py-1',
        md: 'text-sm px-3 py-1.5',
    };

    const variantClasses = {
        neutral: 'meta-tag',
        success: 'meta-tag status-ok',
        error: 'meta-tag status-error',
        warning: 'meta-tag',
    };

    return (
        <span className={`${variantClasses[variant]} ${sizeClasses[size]}`}>
            {children}
        </span>
    );
}
