// src/components/system/EffectViewer.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import type { VisualEffect } from '@/lib/system/effectsCatalog';

/**
 * UN EFECTO, A PANTALLA COMPLETA, SOBRE UNA PANTALLA DE VERDAD.
 *
 * ⚠ POR QUÉ NO SIRVE UNA MINIATURA, que fue el primer intento y salió mal.
 *
 * Estos efectos NO están diseñados para un recuadro: están diseñados para la
 * pantalla entera. El barrido tarda nueve segundos en cruzarla, el salto de
 * sincronismo mueve la imagen catorce píxeles, las franjas barren de arriba
 * abajo. Metidos en una caja de 132 píxeles, la mitad son imperceptibles — se
 * dispara el efecto, no se nota nada, y el catálogo miente por omisión.
 *
 * Acá el efecto ocupa todo, encima de una maqueta de la app hecha con las
 * clases de verdad: los efectos deforman una interfaz, así que enseñarlos sobre
 * un fondo liso tampoco diría qué hacen.
 *
 * ⚠ Y NO ES UN `<dialog>`, aunque la regla 3 del sistema de diseño diga que los
 * diálogos son nativos. Es una excepción razonada: la capa superior del
 * navegador NO HEREDA los filtros del documento (REGLAS · C5), y media docena de
 * estos efectos son exactamente eso — `filter` y `backdrop-filter`. Dentro de un
 * `showModal()` se verían distinto de como se ven en la app, que es lo único que
 * este visor existe para mostrar. El foco y el Escape se atienden a mano.
 */

/** Lo que se pinta debajo: la app, con sus clases de verdad. */
function Maqueta() {
    return (
        <div className="container-terminal" aria-hidden="true">
            <header className="terminal-header">
                <span className="pixel">FLASH-NOTES v1.0</span>
                <span className="comment">12 archivos</span>
            </header>

            <div className="file-container" style={{ flex: 1, overflow: 'hidden' }}>
                <div className="section-header">ARCHIVOS_DISPONIBLES</div>

                {[
                    ['Sin_titulo.txt', '2 KB'],
                    ['notas_del_jueves.txt', '7 KB'],
                    ['lista_de_la_compra.txt', '1 KB'],
                    ['no_borrar_esto.txt', '14 KB'],
                    ['borrador_carta.txt', '3 KB'],
                    ['ideas_sueltas.txt', '9 KB'],
                ].map(([nombre, peso]) => (
                    <div className="file-row" key={nombre}>
                        <span className="file-row-name">{nombre}</span>
                        <span className="file-row-leader" />
                        <span className="file-row-status">{peso}</span>
                    </div>
                ))}

                <p className="comment" style={{ marginTop: '1rem' }}>
                    el cursor sigue ahi, esperando
                </p>
                <p className="mono">
                    &gt; <span className="cursor-block" />
                </p>
            </div>

            <footer className="status-bar">
                <span>[TODO_BIEN]</span>
                <span className="tabular-nums">01001100 01001111 01010010</span>
            </footer>
        </div>
    );
}

export default function EffectViewer({
    efecto,
    onClose,
}: {
    efecto: VisualEffect;
    onClose: () => void;
}) {
    const [pase, setPase] = useState(0);
    const [bucle, setBucle] = useState(false);
    const cerrarRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        // Escape cierra, como en cualquier capa de esta app (regla A4: de
        // cualquier estado se sale).
        const alPulsar = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('keydown', alPulsar);
        cerrarRef.current?.focus();

        return () => document.removeEventListener('keydown', alPulsar);
    }, [onClose]);

    useEffect(() => {
        if (!bucle) return;

        /*
         * Casi todos estos efectos duran menos de medio segundo y no se repiten
         * solos: en la app son un accidente, no una animación. Para ESTUDIAR uno
         * hace falta verlo veinte veces seguidas, y eso es lo que hace el bucle.
         */
        const id = setInterval(() => setPase((p) => p + 1), 900);

        return () => clearInterval(id);
    }, [bucle]);

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={`Efecto ${efecto.nombre}`}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                background: 'var(--color-primary)',
                overflow: 'hidden',
            }}
        >
            <Maqueta />

            {/* La capa del efecto, encima de todo y ocupando todo. */}
            <div
                key={pase}
                className={efecto.clases}
                // Por encima de la maqueta (`z-index: 2`), o el efecto se
                // pintaría DEBAJO de la pantalla que tiene que deformar.
                style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}
            >
                {efecto.necesitaTexto ? (
                    <span
                        style={{
                            position: 'absolute',
                            top: '45%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            fontSize: 'var(--text-2xl)',
                        }}
                    >
                        SISTEMA
                    </span>
                ) : null}
            </div>

            {/*
                Los mandos, por delante de TODO.

                ⚠ El z-index es 3 y no 1 por una razón concreta: `.container-terminal`
                —la maqueta de debajo— declara `z-index: 2` en la capa base, así
                que con 1 la maqueta los tapaba enteros y sólo se podía salir con
                Escape. Es la regla C7 en acción: un z-index alto no es «arriba
                del todo», lo es respecto de quien comparte contexto de apilado.
            */}
            <div
                style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 3,
                    padding: '1rem',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '1rem',
                    background: 'var(--color-secondary)',
                    borderTop: '1px solid var(--color-line)',
                }}
            >
                <div style={{ flex: '1 1 20rem', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                        <strong className="pixel" style={{ fontSize: 'var(--text-lg)' }}>
                            {efecto.nombre}
                        </strong>
                        <span className="comment">{efecto.id}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 'var(--text-sm)' }}>{efecto.que}</p>
                    <p className="comment" style={{ margin: 0 }}>
                        {efecto.cuando}
                    </p>
                </div>

                <button type="button" className="btn-terminal" onClick={() => setPase((p) => p + 1)}>
                    [OTRA VEZ]
                </button>
                <button
                    type="button"
                    className="btn-terminal"
                    aria-pressed={bucle}
                    onClick={() => setBucle((b) => !b)}
                >
                    [BUCLE: {bucle ? 'ON' : 'OFF'}]
                </button>
                <button ref={cerrarRef} type="button" className="btn-terminal" onClick={onClose}>
                    [CERRAR · ESC]
                </button>
            </div>
        </div>
    );
}
