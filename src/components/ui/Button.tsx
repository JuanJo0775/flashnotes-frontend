// src/components/ui/Button.tsx

'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    variant?: 'default' | 'inverted';
    size?: 'sm' | 'md' | 'lg';
}

export default function Button({
                                   children,
                                   variant = 'default',
                                   size = 'md',
                                   className = '',
                                   ...props
                               }: ButtonProps) {
    const sizeClasses = {
        sm: 'text-xs px-3 py-1',
        md: 'text-sm px-4 py-2',
        lg: 'text-base px-6 py-3',
    };

    const variantClasses = {
        default: 'btn-terminal',
        inverted: 'btn-terminal inverted',
    };

    return (
        <button
            className={`${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}
