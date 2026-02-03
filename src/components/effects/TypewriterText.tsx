// src/components/effects/TypewriterText.tsx

'use client';

import { useState, useEffect } from 'react';

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

    useEffect(() => {
        if (currentIndex < text.length) {
            const timeout = setTimeout(() => {
                setDisplayedText((prev) => prev + text[currentIndex]);
                setCurrentIndex((prev) => prev + 1);
            }, speed);

            return () => clearTimeout(timeout);
        } else if (onComplete) {
            onComplete();
        }
    }, [currentIndex, text, speed, onComplete]);

    return (
        <span className="mono">
            {displayedText}
            {currentIndex < text.length && <span className="cursor-blink">█</span>}
        </span>
    );
}
