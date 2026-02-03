// src/components/ui/Input.tsx

'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, className = '', ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className="comment block mb-2">
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    className={`input-terminal ${className}`}
                    {...props}
                />
            </div>
        );
    }
);

Input.displayName = 'Input';

export default Input;
