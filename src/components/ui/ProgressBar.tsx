// src/components/ui/ProgressBar.tsx
'use client';

interface ProgressBarProps {
    /** Porcentaje de llenado, de 0 a 100. */
    value: number;
    segments?: number;
    /** Texto visible antes de la barra. Opcional. */
    label?: string;
    /** Nombre accesible. Describe QUÉ se está midiendo. */
    name: string;
}

/**
 * Barra de progreso ASCII, como la de la referencia: ▮▮▮▮▮▯▯▯▯▯
 * Hereda el color del contenedor, así que funciona igual dentro de una barra
 * invertida que sobre el lienzo.
 */
export default function ProgressBar({
    value,
    segments = 10,
    label,
    name,
}: ProgressBarProps) {
    const clamped = Math.min(100, Math.max(0, value));
    const filled = Math.round((clamped / 100) * segments);

    return (
        <div
            className="progress-bar"
            role="progressbar"
            aria-valuenow={clamped}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={name}
        >
            {label && <span>{label}:</span>}
            <span className="progress-fill" aria-hidden="true">
                {Array.from({ length: segments }, (_, i) => (
                    <span
                        key={i}
                        className={`progress-segment${i < filled ? '' : ' empty'}`}
                    />
                ))}
            </span>
        </div>
    );
}
