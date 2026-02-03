// src/components/ui/ProgressBar.tsx

'use client';

interface ProgressBarProps {
    current: number;
    max: number;
    label?: string;
    unit?: string;
    segments?: number;
}

export default function ProgressBar({
                                        current,
                                        max,
                                        label,
                                        unit = '',
                                        segments = 10
                                    }: ProgressBarProps) {
    const percentage = Math.min(100, Math.max(0, (current / max) * 100));
    const filledSegments = Math.round((percentage / 100) * segments);

    return (
        <div className="progress-bar">
            {label && <span className="text-xs">{label}:</span>}

            <div className="progress-fill">
                {Array.from({ length: segments }).map((_, i) => (
                    <div
                        key={i}
                        className={`progress-segment ${
                            i < filledSegments ? '' : 'empty'
                        }`}
                    />
                ))}
            </div>

            <span className="text-xs">
                {current}/{max}{unit}
            </span>
        </div>
    );
}
