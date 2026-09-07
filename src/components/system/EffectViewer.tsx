// src/components/system/EffectViewer.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { ChromaSplitFilters } from '@/components/effects/ChromaticFailure';
import { useTheme, toggleTheme } from '@/hooks/useTheme';
import type { VisualEffect } from '@/lib/system/effectsCatalog';

/**
 * UN EFECTO, A PANTALLA COMPLETA, COMPORTÁNDOSE COMO EN EL SISTEMA.
 *
 * ⚠ TRES COSAS QUE HAY QUE HACER BIEN O NO SE VE NADA. Las tres se aprendieron
 * fallando, y las tres son invisibles leyendo el código:
 *
 *  1 · LA CLASE NO VA SIEMPRE EN EL MISMO SITIO. Hay efectos de CAPA, que
 *      pintan algo propio encima, y de PANTALLA, que deforman el elemento en el
 *      que están. `.chromatic-failure` se aplica `filter` a sí mismo y
 *      `.glitch-jolt` un `transform`: puestos sobre una capa vacía por encima,
 *      filtran y mueven la NADA. El catálogo lo declara y un test lo verifica
 *      contra el CSS.
 *  2 · LOS FILTROS DEL CROMO TIENEN QUE ESTAR EN EL DOM. `chroma-swap` apunta a
 *      `url(#chroma-split-a)`. Sin esos `<defs>`, la animación corre y no pinta
 *      nada — el propio `LooseWall` lo avisa porque ya pasó allí.
 *  3 · HACE FALTA ALGO DEBAJO. Los que trabajan con `backdrop-filter` no pintan
 *      nada suyo: modifican lo que haya detrás.
 *
 * ⚠ Y NO ES UN `<dialog>`, aunque la regla 3 diga que los diálogos son nativos.
 * Excepción razonada: la capa superior del navegador NO HEREDA los filtros del
 * documento (REGLAS · C5), y media docena de estos efectos son exactamente eso.
 * Dentro de un `showModal()` se verían distinto de como se ven en la app, que es
 * lo único que este visor existe para enseñar. Foco y Escape, a mano.
 */

/**
 * La probeta: una pantalla GENÉRICA, no una imitación de la app.
 *
 * Es una página documental, así que lo que va debajo no debe distraer ni fingir
 * ser otra cosa. Pero tampoco puede ser un fondo liso: sobre un plano uniforme,
 * una inversión no se nota, un desplazamiento de canales no tiene bordes que
 * separar y un tirón no tiene nada que mover.
 *
 * Lleva a propósito las cuatro cosas que revelan a estas familias:
 *
 *   · TEXTO, para el fantasma y el cursor.
 *   · MASAS SÓLIDAS, para las inversiones y los cambios de brillo.
 *   · DETALLE FINO —los dígitos—, que es donde la separación de canales se ve.
 *   · FILETES rectos, que delatan cualquier desplazamiento por pequeño que sea.
 */
/**
 * Lo que va DENTRO del elemento del efecto, cuando hace falta.
 *
 * Sale del catálogo y no de un `if` escondido acá: es información sobre el
 * efecto —qué clase de cosa es— y por eso vive con el resto de su ficha.
 */
function Relleno({ efecto }: { efecto: VisualEffect }) {
    if (efecto.relleno === 'texto') {
        return <span className="mono">SISTEMA</span>;
    }

    if (efecto.relleno === 'ventana') {
        // Las clases de la ventana de verdad: la que sale en el bloqueo.
        return (
            <>
                <div className="phantom-error-title">
                    <span className="phantom-error-code">ERR_0x5A</span>
                </div>
                <div className="phantom-error-body">MEMORIA CORRUPTA EN EL SECTOR 0x1F40</div>
                <button type="button" className="phantom-error-close" tabIndex={-1}>
                    [X]
                </button>
            </>
        );
    }

    return null;
}

function Probeta() {
    return (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                padding: 'clamp(1rem, 4vw, 3rem)',
                paddingBottom: '9rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                background: 'var(--color-primary)',
                overflow: 'hidden',
            }}
        >
            <div className="pixel" style={{ fontSize: 'var(--text-3xl)' }}>
                MUESTRA DE REFERENCIA
            </div>

            <p style={{ margin: 0, maxWidth: '46ch', fontSize: 'var(--text-base)' }}>
                Texto corriente, para que se vea qué le hace el efecto a una letra. El zorro veloz
                salta sobre el perro perezoso, y lo hace en un renglón lo bastante largo como para
                notar un desplazamiento.
            </p>

            {/* Masas sólidas: sin ellas una inversión no se nota. */}
            <div style={{ display: 'flex', gap: '0.75rem', height: '4.5rem' }}>
                <div style={{ flex: 2, background: 'var(--color-ink)' }} />
                <div style={{ flex: 1, background: 'var(--color-secondary)' }} />
                <div style={{ flex: 1, background: 'var(--color-tertiary)' }} />
                <div style={{ flex: 1, background: 'var(--color-meta)' }} />
            </div>

            <hr className="rule-dashed" style={{ margin: 0 }} />

            {/* Detalle fino: donde la separación de canales se lee de verdad. */}
            <div
                className="mono"
                style={{
                    fontSize: 'var(--text-xs)',
                    lineHeight: 1.35,
                    columnCount: 2,
                    columnGap: '2rem',
                    maxHeight: '9rem',
                    overflow: 'hidden',
                    color: 'var(--color-soft)',
                }}
            >
                {Array.from({ length: 10 }, (_, i) => (
                    <div key={i}>
                        01001100 01001111 01010010 01000101 01001101 00100000 01001001 01010000
                    </div>
                ))}
            </div>

            <div className="mono" style={{ fontSize: 'var(--text-lg)' }}>
                &gt; <span className="cursor-block" />
            </div>
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
    const tema = useTheme();
    const cerrarRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        // Escape cierra: de cualquier estado se sale (regla A4).
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
         * Casi todos duran menos de medio segundo y no se repiten solos: en la
         * app son un accidente, no una animación. Para ESTUDIAR uno hace falta
         * verlo veinte veces seguidas.
         */
        const id = setInterval(() => setPase((p) => p + 1), 1_100);

        return () => clearInterval(id);
    }, [bucle]);

    const enLaPantalla = efecto.donde === 'pantalla';

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
            {/* Los filtros del cromo. Sin esto, cinco efectos corren y no pintan. */}
            <ChromaSplitFilters />

            {/*
                La probeta. Si el efecto es de PANTALLA, la clase va acá: es el
                elemento que tiene que deformarse. `key` la remonta para volver a
                lanzar la animación desde cero, porque una animación terminada no
                empieza sola.
            */}
            <div
                key={`probeta-${pase}-${enLaPantalla}`}
                className={enLaPantalla ? efecto.clases : undefined}
                style={{ position: 'absolute', inset: 0 }}
            >
                <Probeta />
            </div>

            {/*
                Y si es de CAPA, va en una encima — que es lo que ese efecto es:
                algo que se pinta delante. Sólo se monta cuando toca; una capa
                vacía de más se comía los clics de los mandos.
            */}
            {!enLaPantalla && (
                <div
                    key={`capa-${pase}`}
                    style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}
                >
                    {/*
                        ⚠ EL ELEMENTO DE LA CLASE NO LLEVA NI UN ESTILO EN LÍNEA,
                        y eso costó verlo. Un `inset: 0` en línea GANA siempre
                        sobre la clase, así que pisaba la posición propia del
                        efecto: la ventana fantasma —que en la app es una
                        ventanita de 300 px— salía estirada a lo alto de la
                        pantalla, y dejaba de parecerse a lo que documenta.
                        El envoltorio da el contexto de posicionamiento; el CSS
                        del efecto decide dónde se pone y cuánto ocupa.
                    */}
                    <div className={efecto.clases}>
                        <Relleno efecto={efecto} />
                    </div>
                </div>
            )}

            {/*
                Los mandos, por delante de todo.

                ⚠ `z-index: 3` y no 1: la probeta y las capas comparten contexto
                de apilado, así que con 1 quedaban tapados y sólo se podía salir
                con Escape. Regla C7 — un z-index alto no es «arriba del todo».
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
                <div style={{ flex: '1 1 22rem', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                        <strong className="pixel" style={{ fontSize: 'var(--text-lg)' }}>
                            {efecto.nombre}
                        </strong>
                        <span className="comment">{efecto.id}</span>
                        <span className="comment">
                            {enLaPantalla ? 'deforma la pantalla' : 'capa por encima'}
                        </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 'var(--text-sm)' }}>{efecto.que}</p>
                    <p className="comment" style={{ margin: 0 }}>
                        {efecto.cuando}
                    </p>
                </div>

                {/*
                    El tema, ACÁ DENTRO. Estos efectos se comportan distinto en
                    claro y en oscuro —la inversión y las masas sólidas sobre
                    todo— y para eso hay que poder cambiarlo SIN cerrar el visor:
                    cerrar, cambiar y volver a abrir hacía que nadie comparara.
                */}
                <button type="button" className="btn-terminal" onClick={toggleTheme}>
                    [{tema === 'dark' ? '◑ OSCURO' : '◐ CLARO'}]
                </button>
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
