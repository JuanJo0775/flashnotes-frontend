// src/components/effects/SystemLockout.tsx
'use client';

import { useEffect, useState } from 'react';
import { clearLockout } from '@/hooks/useSystemState';
import { awardFrom } from '@/lib/system/asciiArt';
import { useGlitch } from '@/hooks/useGlitch';
import { DUMP_COLS, buildDump, isTheOddOne } from '@/lib/system/lockoutPuzzle';
import { ChromaSplitFilters } from '@/components/effects/ChromaticFailure';

/**
 * La pantalla que aparece cuando el sistema deja de reiniciarse.
 *
 * A los diez colapsos seguidos dentro de cinco minutos, el rearranque ya no
 * llega: en su lugar queda esto. Es lo único de toda la app que **sobrevive a
 * recargar la página** — recargar es la salida fácil de cualquier otro efecto, y
 * acá justamente no la hay.
 *
 * DOS SALIDAS, y sólo una se cuenta. Encontrar el byte que rompe el patrón del
 * volcado es la que el usuario puede accionar. La otra —que a los cinco minutos
 * se levanta solo— existe para que nadie quede encerrado de verdad, pero NO SE
 * ANUNCIA: decirlo convierte el puzzle en opcional y el estado en una cuenta
 * atrás. Que la salida exista y no se sepa es lo que mantiene la tensión sin
 * crear una trampa.
 *
 * NO ROBA EL TECLADO. La capa captura clics (hacen falta para el puzzle) pero no
 * enfoca nada: el editor sigue montado debajo y lo que teclees sigue llegando y
 * guardándose. La pantalla está tapada; el trabajo, no.
 */

export default function SystemLockout() {
    const [wrong, setWrong] = useState(false);
    const [tries, setTries] = useState(0);

    // El cuadro se sacude con los mismos tirones que el resto del sistema. Un
    // puzzle quieto en mitad de una pantalla que falla se lee como si estuviera
    // en otra capa de realidad; temblando, es parte de la misma avería.
    const glitch = useGlitch();

    // El volcado se arma al montar y SE REHACE CON CADA FALLO.
    //
    // Si no cambiara, errar sólo tacharía una celda y el puzzle se resolvería
    // por descarte: sesenta clics y listo. Rehaciéndolo, cada intento vuelve a
    // ser una búsqueda. Lo que no hace es regenerarse en cada render — ahí el
    // byte roto saltaría de sitio mientras lo estás mirando, que sería tramposo
    // en vez de difícil.
    const [dump, setDump] = useState(() => buildDump());

    // El aviso de fallo se borra solo: dejarlo fijo convertiría el puzzle en una
    // lista de tachados en vez de en una búsqueda.
    useEffect(() => {
        if (!wrong) return;
        const id = setTimeout(() => setWrong(false), 600);
        return () => clearTimeout(id);
    }, [wrong]);

    const filas: string[][] = [];
    for (let i = 0; i < dump.cells.length; i += DUMP_COLS) {
        filas.push(dump.cells.slice(i, i + DUMP_COLS));
    }

    return (
        <div className="lockout-layer" role="presentation">
            {/* El filtro tiene que estar publicado en el DOM: con la señal sana
                nadie lo puso, y esta pantalla puede aparecer sin que el fallo
                cromático haya ocurrido nunca. */}
            <ChromaSplitFilters />

            <div
                className={[
                    'lockout-window',
                    glitch.active ? 'glitch-jolt' : '',
                    glitch.active ? `is-${glitch.severity}` : '',
                ]
                    .filter(Boolean)
                    .join(' ')}
                style={
                    glitch.active
                        ? ({ '--glitch-amp': `${glitch.amplitudePx}px` } as React.CSSProperties)
                        : undefined
                }
            >
                <div className="lockout-title">
                    <span>
                        <span className="lockout-title-mark">⚠</span> FALLO CRÍTICO
                    </span>
                    <span className="lockout-code">0xDEAD</span>
                </div>

                <div className="lockout-body mono">
                    <p>EL NÚCLEO NO PUDO REINICIARSE.</p>

                    {/* Las lecturas del fallo, con el mismo filete y las mismas
                        etiquetas que el panel de diagnóstico: es la misma casa
                        informando, aunque esté rota. */}
                    <div className="lockout-readings">
                        <div className="diag-row">
                            <span className="diag-label">SUBSISTEMA</span>
                            <span className="diag-value">NÚCLEO / MEMORIA</span>
                        </div>
                        <div className="diag-row">
                            <span className="diag-label">ESTADO</span>
                            <span className="diag-value lockout-tries">SIN RESPUESTA</span>
                        </div>
                        <div className="diag-row">
                            <span className="diag-label">INTENTOS</span>
                            <span
                                className="diag-value lockout-tries"
                                data-testid="lockout-tries"
                            >
                                {String(tries).padStart(2, '0')}
                            </span>
                        </div>
                    </div>
                    <p className="lockout-hint">
                        LA MEMORIA ESTÁ CORRUPTA EN UNA POSICIÓN.
                        {wrong && (
                            <span className="lockout-wrong"> ESA NO. RELEYENDO…</span>
                        )}
                    </p>

                    {/* El puzzle no lleva instrucciones a propósito. Una rejilla
                        que repite un patrón con una celda distinta se resuelve
                        mirando; explicarlo lo convertiría en un formulario. */}
                    <div className="lockout-dump">
                        <div className="lockout-dump-head">
                            <span>OFFSET</span>
                            <span>VOLCADO 0x0000–0x003B</span>
                        </div>

                        {filas.map((fila, y) => (
                            <div key={y} className="lockout-dump-row">
                                <span className="lockout-offset">
                                    {(y * DUMP_COLS).toString(16).toUpperCase().padStart(4, '0')}
                                </span>
                                {fila.map((celda, x) => {
                                    const i = y * DUMP_COLS + x;
                                    return (
                                        <button
                                            key={x}
                                            type="button"
                                            className="lockout-cell"
                                            onClick={() => {
                                                if (isTheOddOne(dump, i)) {
                                                    // RESOLVERLO DA LA LLAVE,
                                                    // y va acá y no en
                                                    // `clearLockout`: el
                                                    // bloqueo también se
                                                    // levanta al vencer el
                                                    // plazo, y esperar no es
                                                    // resolver. Una llave que
                                                    // se gana esperando no
                                                    // abre nada.
                                                    awardFrom('blackout-puzzle');
                                                    clearLockout();
                                                    return;
                                                }
                                                setWrong(true);
                                                setTries((n) => n + 1);
                                                setDump(buildDump());
                                            }}
                                        >
                                            {celda}
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                </div>
            </div>
        </div>
    );
}
