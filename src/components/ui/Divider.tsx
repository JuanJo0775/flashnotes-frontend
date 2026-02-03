// src/components/ui/Divider.tsx

'use client';

interface DividerProps {
    variant?: 'solid' | 'dashed' | 'dotted';
}

export default function Divider({ variant = 'solid' }: DividerProps) {
    const variantClasses = {
        solid: 'divider-horizontal',
        dashed: 'divider-dashed',
        dotted: 'border-t border-t-dotted',
    };

    return <div className={variantClasses[variant]} />;
}
