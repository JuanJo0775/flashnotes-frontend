// src/components/ui/Input.tsx

'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, helperText, className = '', id, ...props }, ref) => {
        // Generar ID único si no se proporciona
        const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
        const errorId = error ? `${inputId}-error` : undefined;
        const helperId = helperText ? `${inputId}-helper` : undefined;

        return (
            <div className="w-full">
                {label && (
                    <label htmlFor={inputId} className="comment block mb-2">
                        {label}
                    </label>
                )}
                <input
                    id={inputId}
                    ref={ref}
                    className={`input-terminal ${error ? 'border-accent-red' : ''} ${className}`}
                    aria-invalid={error ? 'true' : 'false'}
                    aria-describedby={error ? errorId : helperId}
                    {...props}
                />
                {error && (
                    <div id={errorId} className="mono text-xs text-accent-red mt-1">
                        {error}
                    </div>
                )}
                {helperText && !error && (
                    <div id={helperId} className="comment text-xs mt-1">
                        {helperText}
                    </div>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

export default Input;
