// src/components/effects/SystemCollapse.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { resetIntegrity, registerRecovery } from '@/hooks/useSystemState';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { noiseFrame } from '@/lib/system/asciiNoise';
import { fireGlitch } from '@/hooks/useGlitch';
import type { CollapseLevel } from '@/lib/system/collapseEscalation';

/**
 * El colapso del sistema. El clímax.
 *
 * Se dispara con la integridad a 0 (nueve clics en el rótulo) o con `>panic`.
 *
 * LO QUE MÁS IMPORTA NO SE VE: esto ocurre entero en una capa POR ENCIMA de la
 * app. Debajo, el editor sigue montado, el auto-guardado sigue su curso y el
 * foco NO se mueve — la capa lleva `pointer-events: none` y no enfoca nada, así
 * que se puede seguir escribiendo a ciegas y todo lo tecleado llega. Que se
 * pueda seguir escribiendo es la regla; el espectáculo es lo secundario.
 *
 * ESCALA SI INSISTÍS. Las tres primeras veces se reproduce igual. A partir de la
 * cuarta el rearranque tarda más y los fallos pegan más fuerte, y a la décima
 * seguida el sistema deja de volver solo: se queda una pantalla de error que
 * sólo se levanta resolviendo su puzzle o esperando cinco minutos
 * (ver `collapseEscalation` y `SystemLockout`).
 */

/** La secuencia previa al rearranque, en ms desde el disparo. */
const CUT_MS = 150; // corte a tinta plana
const STATIC_MS = 2200; // fin de la estática
const DYING_MS = 2600; // fin del apagado del tubo

/** Con movimiento reducido: un corte a negro y el texto ya escrito. */
const REDUCED_MS = 400;

/** 12 fps, no 60: una señal rota no titila suave. */
const NOISE_FPS = 12;

/** Tamaño de una celda de la rejilla de basura, en píxeles. */
const CELL_W = 8;
const CELL_H = 15;

/**
 * Cada cuánto falla la PROPIA pantalla de carga, según la intensidad del nivel.
 *
 * Al principio no falla nada: el rearranque es una pantalla de carga y punto.
 * A partir del tercer colapso empiezan a caer tirones sueltos, y en el nivel más
 * alto la pantalla que debería estar arreglando el sistema falla ella misma sin
 * parar. Es la escalada contada donde más se nota — no en un número, sino en que
 * ni la pantalla de recuperación aguanta.
 *
 * `null` significa que no falla.
 */
const FAILURE_CADENCE_MS: Record<number, number | null> = {
    1: null,
    1.5: 4200,
    2: 2100,
    3: 900,
};

type Phase = 'cut' | 'static' | 'dying' | 'reboot' | 'stalled';

/** Dónde se traba la barra cuando el sistema ya no va a volver. */
const STALL_MIN = 0.52;
const STALL_SPREAD = 0.31;

/** Cuánto se queda la barra congelada antes de admitir el fallo. */
const STALL_HOLD_MS = 1600;

/** Y cuánto dura el mensaje de fallo antes de ceder a la pantalla de error. */
const STALL_ERROR_MS = 1400;

interface SystemCollapseProps {
    /** Cuántas notas tenés. El rearranque las cuenta de verdad. */
    notesCount: number;
    /**
     * Con qué fuerza toca reproducirlo.
     *
     * Lo calcula QUIEN DISPARA el colapso, no este componente: `registerCollapse`
     * muta el almacén, y llamarlo desde el render —aunque fuera en un
     * inicializador perezoso— lo dejaría a merced de cuántas veces React decida
     * renderizar. En un manejador de evento, en cambio, ocurre exactamente una
     * vez por colapso.
     */
    level: CollapseLevel;
    onDone: () => void;
}

/**
 * Las líneas del rearranque, cada una con el punto de la barra en que aparece.
 *
 * NO salen todas de golpe: van saliendo A MEDIDA QUE CARGA. Con las tres puestas
 * desde el primer fotograma, la barra era decorativa — ya sabías el final antes
 * de que empezara. Apareciendo por etapas, la barra cuenta algo: cada tramo que
 * avanza recupera una pieza más.
 *
 * Y la última es la que importa: que la máquina te diga que tus notas están
 * enteras JUSTO AL FINAL, después de haberte hecho esperar, es lo que hace que
 * el chiste no dé miedo.
 */
function rebootLines(notesCount: number): { at: number; text: string }[] {
    return [
        { at: 0.05, text: '> REINICIANDO NÚCLEO...' },
        { at: 0.32, text: '> VERIFICANDO MEMORIA...' },
        { at: 0.58, text: '> MEMORIA: OK' },
        { at: 0.78, text: '> RECUPERANDO ARCHIVOS...' },
        { at: 0.95, text: `> NOTAS: ${notesCount} RECUPERADAS` },
    ];
}

/**
 * Y las del rearranque que no llega.
 *
 * Empiezan igual y se van torciendo: la máquina intenta lo mismo de siempre y
 * cada paso le sale peor. Es más incómodo que un error de golpe, porque durante
 * los primeros dos tramos parece que va a salir bien.
 */
function failingLines(): { at: number; text: string }[] {
    return [
        { at: 0.05, text: '> REINICIANDO NÚCLEO...' },
        { at: 0.3, text: '> VERIFICANDO MEMORIA...' },
        { at: 0.52, text: '> MEMORIA: ERROR DE PARIDAD' },
        { at: 0.7, text: '> REINTENTANDO...' },
        { at: 0.85, text: '> REINTENTANDO...' },
    ];
}

export default function SystemCollapse({
    notesCount,
    level,
    onDone,
}: SystemCollapseProps) {
    const reducedMotion = usePrefersReducedMotion();
    const [phase, setPhase] = useState<Phase>(reducedMotion ? 'reboot' : 'cut');
    // Con movimiento reducido no hay barra que mirar, así que las líneas salen
    // enteras desde el principio.
    const [progress, setProgress] = useState(reducedMotion ? 1 : 0);
    const noiseRef = useRef<HTMLPreElement>(null);

    const lineas = level.lockout ? failingLines() : rebootLines(notesCount);

    // La secuencia hasta el rearranque.
    useEffect(() => {
        const timers: ReturnType<typeof setTimeout>[] = [];
        const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

        if (reducedMotion) {
            at(REDUCED_MS, () => {
                registerRecovery();
                onDone();
            });
        } else if (level.lockout) {
            // El rearranque ARRANCA y se traba. Saltárselo era peor: la barra
            // que empieza a subir y se queda clavada cuenta el fallo mucho mejor
            // que no intentarlo — primero te hace creer que vuelve.
            at(CUT_MS, () => setPhase('static'));
            at(STATIC_MS, () => setPhase('dying'));
            at(DYING_MS, () => setPhase('reboot'));
            at(DYING_MS + STALL_HOLD_MS, () => setPhase('stalled'));
            at(DYING_MS + STALL_HOLD_MS + STALL_ERROR_MS, onDone);
        } else {
            at(CUT_MS, () => setPhase('static'));
            at(STATIC_MS, () => setPhase('dying'));
            at(DYING_MS, () => setPhase('reboot'));
        }

        return () => timers.forEach(clearTimeout);
        // Se arma una sola vez: la secuencia es fija desde que empieza.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * El rearranque, con su barra.
     *
     * Tarda entre diez y cuarenta segundos, y más cuanto más hayas insistido.
     * La barra no es decoración: sin ella, medio minuto de pantalla negra se lee
     * como que la app se colgó. Con ella, se lee como que está trabajando.
     */
    useEffect(() => {
        if (phase !== 'reboot' || reducedMotion) return;

        // Con el bloqueo, la barra sube deprisa hasta donde se va a trabar y ahí
        // se queda: el tope se sortea para que no siempre falle en el mismo
        // punto, que es lo que delataría que estaba guionado.
        const tope = level.lockout ? STALL_MIN + Math.random() * STALL_SPREAD : 1;
        const duracion = level.lockout ? STALL_HOLD_MS : level.rebootMs;

        const inicio = Date.now();
        const id = setInterval(() => {
            const t = Math.min(tope, ((Date.now() - inicio) / duracion) * tope);
            setProgress(t);
            if (!level.lockout && t >= 1) {
                clearInterval(id);
                resetIntegrity();
                // La ventana de la escalada empieza a correr ACÁ, cuando el
                // sistema volvió — no cuando se rompió.
                registerRecovery();
                onDone();
            }
        }, 100);

        return () => clearInterval(id);
    }, [phase, reducedMotion, level.rebootMs, level.lockout, onDone]);

    /**
     * La pantalla de carga que también falla.
     *
     * A más colapsos encima, más seguido. En el nivel crítico cae casi cada
     * segundo: la pantalla que debería estar recuperando el sistema no consigue
     * ni sostenerse a sí misma.
     */
    useEffect(() => {
        if (reducedMotion) return;
        if (phase !== 'reboot' && phase !== 'stalled') return;

        const cada = FAILURE_CADENCE_MS[level.intensity] ?? null;
        if (cada === null) return;

        const id = setInterval(() => fireGlitch(), cada);
        return () => clearInterval(id);
    }, [phase, reducedMotion, level.intensity]);

    /**
     * La basura.
     *
     * Se escribe directamente sobre el nodo, sin pasar por el estado de React:
     * son miles de caracteres doce veces por segundo, y un `setState` por
     * fotograma repintaría el árbol entero cada 83 ms.
     */
    useEffect(() => {
        if (phase !== 'static' || reducedMotion) return;

        const pre = noiseRef.current;
        if (!pre) return;

        const cols = Math.ceil(window.innerWidth / CELL_W);
        const rows = Math.ceil(window.innerHeight / CELL_H);
        let frame = 0;

        const draw = () => {
            pre.textContent = noiseFrame(cols, rows, frame);
            frame += 1;
        };

        draw();
        const id = setInterval(draw, 1000 / NOISE_FPS);

        return () => clearInterval(id);
    }, [phase, reducedMotion]);

    const segundosRestantes = Math.ceil((level.rebootMs * (1 - progress)) / 1000);

    return (
        <div
            className="collapse-layer"
            data-phase={phase}
            data-intensity={level.intensity}
            aria-hidden="true"
            style={{ pointerEvents: 'none' }}
        >
            {phase === 'static' && (
                <>
                    <pre ref={noiseRef} className="collapse-noise mono" />
                    <div className="collapse-drag" />
                    <div className="collapse-drag is-second" />
                </>
            )}

            {phase === 'dying' && <div className="collapse-dying" />}

            {(phase === 'reboot' || phase === 'stalled') && (
                <div className="collapse-reboot mono">
                    <pre className="collapse-reboot-lines">
                        {lineas
                            .filter((l) => progress >= l.at)
                            .map((l) => l.text)
                            .join('\n')}
                    </pre>

                    {/* La barra usa el mismo vocabulario ASCII que el medidor de
                        la barra de estado: bloques llenos y vacíos. Es la app
                        contándote algo con sus propios caracteres, no un widget
                        de otra familia. */}
                    <p className="collapse-progress">
                        [{'▮'.repeat(Math.round(progress * 24))}
                        {'▯'.repeat(24 - Math.round(progress * 24))}]{' '}
                        {Math.round(progress * 100)}%
                    </p>
                    {phase === 'stalled' ? (
                        <p className="collapse-failed">
                            &gt; FALLO EN LA VERIFICACIÓN DE MEMORIA
                            <br />
                            &gt; EL NÚCLEO NO RESPONDE
                        </p>
                    ) : (
                        <p className="collapse-eta">
                            {level.lockout
                                ? 'TIEMPO ESTIMADO: --'
                                : `TIEMPO ESTIMADO: ${segundosRestantes}s`}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
