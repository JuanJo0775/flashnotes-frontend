// src/components/effects/GlitchEffect.tsx

'use client';

import { ReactNode, useState, useEffect } from 'react';

interface GlitchEffectProps {
    children: ReactNode;
    trigger?: boolean;
}

export default function GlitchEffect({ children, trigger = false }: GlitchEffectProps) {
    const [isGlitching, setIsGlitching] = useState(false);

    useEffect(() => {
        if (trigger) {
            setIsGlitching(true);
            const timeout = setTimeout(() => setIsGlitching(false), 300);
            return () => clearTimeout(timeout);
        }
    }, [trigger]);

    return (
        <div className={isGlitching ? 'glitch' : ''}>
            {children}
        </div>
    );
}
