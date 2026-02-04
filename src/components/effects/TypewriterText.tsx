// src/components/effects/TypewriterText.tsx

'use client';

import { useState, useEffect, useRef } from 'react';

interface TypewriterTextProps {
    text: string;
    speed?: number; // ms por carácter
    onComplete?: () => void;
}

export default function TypewriterText({
                                           text,
                                           speed = 50,
                                           onComplete
                                       }: TypewriterTextProps) {
    const [displayedText, setDisplayedText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);
    const onCompleteRef = useRef(onComplete);

    // ✅ Actualizar ref sin causar re-render
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    // ✅ Resetear estado cuando cambie el texto
    useEffect(() => {
        setDisplayedText('');
        setCurrentIndex(0);
    }, [text]);

    // ✅ Animación sin onComplete en dependencias
    useEffect(() => {
        if (currentIndex < text.length) {
            const timeout = setTimeout(() => {
                setDisplayedText((prev) => prev + text[currentIndex]);
                setCurrentIndex((prev) => prev + 1);
            }, speed);

            return () => clearTimeout(timeout);
        }
    }, [currentIndex, text, speed]);

    // ✅ Ejecutar onComplete cuando se complete
    useEffect(() => {
        if (currentIndex >= text.length && currentIndex > 0 && onCompleteRef.current) {
            onCompleteRef.current();
        }
    }, [currentIndex, text.length]);

    return (
        <span className="mono">
            {displayedText}
            {currentIndex < text.length && <span className="cursor-blink">█</span>}
        </span>
    );
}
