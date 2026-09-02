// src/components/effects/PongOverlay.tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useT } from '@/i18n';
import { useSystemState } from '@/hooks/useSystemState';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import {
    createGame,
    step,
    render,
    renderField,
    PADDLE_H,
    COURT_W,
    WIN_SCORE,
    GLYPH,
    GLYPH_FAULT,
    type Inputs,
    type PongMode,
    type PongState,
} from '@/lib/system/pong';
import { recordRally, SYSTEM_RECORD, type Board } from '@/lib/system/pongScores';
import ThemeToggle from '@/components/ui/ThemeToggle';
import LanguageToggle from '@/components/ui/LanguageToggle';
import { useToday } from '@/hooks/useToday';
import { speedFactor } from '@/lib/system/pong';

/**
 * El proceso `vsync-test`, jugable.
 *
 * Se abre con `//attach_6`, que sólo se encuentra leyendo `//ps`. Es lo que la
 * máquina hace cuando nadie la mira: un turno sin relevo y una pelota contra la
 * pared.
 *
 * ESTA ES LA ÚNICA PIEZA QUE BLOQUEA LA ESCRITURA, y rompe a propósito una de
 * las tres reglas del proyecto. Lo que la justifica es el consentimiento: todos
 * los demás efectos TE PASAN, y éste LO PEDISTE tecleando el comando. Escape
 * devuelve el teclado, y la nota sigue guardándose debajo igual que durante el
 * colapso.
 *
 * DOS FORMAS DE PINTARLO, y la diferencia entre las dos ES el efecto:
 *
 *   · SANO — el campo va en un `<pre>` y la pelota y las paletas encima, con
 *     desplazamiento decimal. Se mueven de forma continua.
 *   · AVERIADO — todo vuelve a la rejilla, redondeado a celda, y se mueve a
 *     tirones porque a 0,3 celdas por fotograma sólo avanza una vez cada tres.
 *
 * O sea: el juego no va a saltos porque la rejilla no dé para más. Va a saltos
 * CUANDO el vídeo falla, y va fluido cuando no. El tirón dejó de ser una
 * limitación para pasar a ser el síntoma.
 */

/** Las teclas que gobiernan paletas. El resto pasa de largo. */
const TECLAS_DE_JUEGO = new Set(['ArrowUp', 'ArrowDown', 'w', 'W', 's', 'S']);

/**
 * El paso más largo que se admite entre dos fotogramas.
 *
 * Chrome frena los temporizadores de las pestañas ocultas: al volver, el primer
 * fotograma traería el hueco entero y la pelota aparecería del otro lado del
 * corte. Con el tope, volver de otra pestaña se siente como una pausa.
 */
const DT_MAX_MS = 100;

/**
 * Cada cuánto se cae la tabla de glifos, y cuánto dura.
 *
 * Unas décimas, de tanto en tanto: el tiempo justo para que lo veas y dudes de
 * si lo viste. Seguido dejaría de ser una avería para ser el aspecto del juego.
 */
const FAULT_MIN_GAP_MS = 7000;
const FAULT_MAX_GAP_MS = 17_000;
const FAULT_MIN_MS = 220;
const FAULT_MAX_MS = 700;

const entre = (min: number, max: number) => min + Math.random() * (max - min);

interface Props {
    open: boolean;
    onClose: () => void;
    /**
     * Las clases de la avería, tal cual las lleva el envoltorio de la app.
     *
     * Llegan por prop y no se recalculan acá porque la regla del proyecto es
     * que durante el fallo cromático NO HAY EXCEPCIONES: todo lo visible se ve
     * roto. Compartiendo la lista, cualquier animación que se añada mañana
     * entra en los dos sitios a la vez; recalculándola, entraría en uno solo y
     * la excepción aparecería sola.
     */
    glitchClassName?: string;
    glitchStyle?: React.CSSProperties;
}

export default function PongOverlay({
    open,
    onClose,
    glitchClassName = '',
    glitchStyle,
}: Props) {
    const t = useT();
    const today = useToday();
    const { chromaticFailure, lockedOut } = useSystemState();
    const reducedMotion = usePrefersReducedMotion();

    const [game, setGame] = useState<PongState>(() => createGame('wall'));
    const [fault, setFault] = useState(false);

    const teclasRef = useRef(new Set<string>());
    /** Para no anotar dos veces la misma derrota. */
    const anotadaRef = useRef(false);

    // Jugar con la señal rota es el MISMO juego a ciegas —la física es idéntica
    // byte por byte— así que es un logro distinto y lleva marcador aparte.
    const senalRota = chromaticFailure || lockedOut;
    const board: Board = senalRota ? 'degraded' : 'clean';

    /** Con el vídeo mal, el dibujo vuelve a la rejilla y se mueve a tirones. */
    const cuadriculado = senalRota || fault;
    const glyphs = fault ? GLYPH_FAULT : GLYPH;

    const empezar = useCallback((mode: PongMode) => {
        teclasRef.current.clear();
        anotadaRef.current = false;
        setGame(createGame(mode));
    }, []);

    // Al cerrar, la próxima apertura empieza de cero: dejar la partida a medias
    // esperando convertiría el juego en un estado más de la app.
    useEffect(() => {
        if (!open) {
            anotadaRef.current = false;
            teclasRef.current.clear();
        }
    }, [open]);

    /** El bucle. */
    useEffect(() => {
        if (!open) return;

        let raf = 0;
        let anterior = Date.now();

        const fotograma = () => {
            const ahora = Date.now();
            const dt = Math.min(ahora - anterior, DT_MAX_MS);
            anterior = ahora;

            if (dt > 0) {
                const teclas = teclasRef.current;
                const inputs: Inputs = {
                    rightUp: teclas.has('ArrowUp'),
                    rightDown: teclas.has('ArrowDown'),
                    leftUp: teclas.has('w') || teclas.has('W'),
                    leftDown: teclas.has('s') || teclas.has('S'),
                };

                setGame((actual) => step(actual, dt, inputs));
            }

            raf = requestAnimationFrame(fotograma);
        };

        raf = requestAnimationFrame(fotograma);
        return () => cancelAnimationFrame(raf);
    }, [open]);

    /** La caída de la tabla de glifos, cada tanto. */
    useEffect(() => {
        if (!open || reducedMotion) return;

        let timer: ReturnType<typeof setTimeout>;

        const ciclo = () => {
            timer = setTimeout(() => {
                setFault(true);
                timer = setTimeout(() => {
                    setFault(false);
                    ciclo();
                }, entre(FAULT_MIN_MS, FAULT_MAX_MS));
            }, entre(FAULT_MIN_GAP_MS, FAULT_MAX_GAP_MS));
        };

        ciclo();

        return () => {
            clearTimeout(timer);
            setFault(false);
        };
    }, [open, reducedMotion]);

    /** El teclado. */
    useEffect(() => {
        if (!open) return;

        const abajo = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
                return;
            }
            if (e.key === '1') {
                empezar('wall');
                return;
            }
            if (e.key === '2') {
                empezar('versus');
                return;
            }
            if (e.key === 'Enter') {
                setGame((actual) => {
                    if (!actual.over) return actual;
                    anotadaRef.current = false;
                    return createGame(actual.mode);
                });
                return;
            }
            if (TECLAS_DE_JUEGO.has(e.key)) {
                // Sin esto, las flechas desplazarían la página debajo del juego.
                e.preventDefault();
                teclasRef.current.add(e.key);
            }
        };

        const arriba = (e: KeyboardEvent) => {
            teclasRef.current.delete(e.key);
        };

        window.addEventListener('keydown', abajo);
        window.addEventListener('keyup', arriba);

        return () => {
            window.removeEventListener('keydown', abajo);
            window.removeEventListener('keyup', arriba);
        };
    }, [open, onClose, empezar]);

    /** Anotar la derrota, una sola vez y sólo en modo pared. */
    useEffect(() => {
        if (!open || !game.over || anotadaRef.current) return;
        if (game.mode !== 'wall') return;

        anotadaRef.current = true;
        recordRally(board, game.rally);
    }, [open, game.over, game.mode, game.rally, board]);

    if (!open) return null;

    const filas = cuadriculado ? render(game, glyphs) : renderField(game, glyphs);

    const marcador =
        game.mode === 'wall'
            ? `${t('pong.rally')} ${game.rally}`
            : `${game.scoreLeft} · ${game.scoreRight}`;

    /** Una paleta como pieza suelta, colocada con precisión decimal. */
    const paleta = (columna: number, fila: number, lado: string) => (
        <span
            className="pong-sprite pong-paddle"
            data-testid={`pong-paddle-${lado}`}
            style={
                {
                    '--x': columna,
                    '--y': fila,
                } as React.CSSProperties
            }
        >
            {Array.from({ length: PADDLE_H }, () => glyphs.paddle).join('\n')}
        </span>
    );

    return (
        <div
            className={`pong-layer ${glitchClassName}`.trimEnd()}
            style={glitchStyle}
            role="application"
            aria-label={t('pong.title')}
            data-render={cuadriculado ? 'quantised' : 'fluid'}
        >
            {/* El mismo cromo de la app, con el contenido del juego.
                No es decoración: los conmutadores son los DE VERDAD, así que
                desde aquí se puede cambiar de idioma, de tema — y romper la
                señal a fuerza de insistir con el tema, que es lo que hace que
                este juego tenga su propio marcador degradado. */}
            <header className="terminal-header">
                <span className="mono text-sm" data-testid="pong-logo">
                    [VSYNC-TEST v0.1]
                </span>

                <nav aria-label={t('pong.modesLabel')} className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => empezar('wall')}
                        className="nav-tab"
                        aria-current={game.mode === 'wall' ? 'page' : undefined}
                    >
                        [{t('pong.modeWall')}]
                    </button>
                    <button
                        type="button"
                        onClick={() => empezar('versus')}
                        className="nav-tab"
                        aria-current={game.mode === 'versus' ? 'page' : undefined}
                    >
                        [{t('pong.modeVersus')}]
                    </button>
                </nav>

                <div className="flex items-center gap-3">
                    <LanguageToggle />
                    <ThemeToggle />
                    <span className="mono text-xs dim" suppressHydrationWarning>
                        [{t('nav.dateLabel')}: {today ?? t('nav.datePlaceholder')}]
                    </span>
                </div>
            </header>

            <div className="pong-frame">
                <div className="pong-hud pong-hud-top">
                    <span data-testid="pong-score">{marcador}</span>
                    <span className="pong-proc">vsync-test · {game.mode}</span>
                </div>

                <div className="pong-stage">
                    {/*
                     * Decorativo para quien escucha: un lector de pantalla
                     * deletreando 1.728 caracteres de rejilla no informa de
                     * nada. El estado va en el marcador, que sí se lee.
                     */}
                    <pre
                        className="pong-court"
                        data-testid="pong-court"
                        aria-hidden="true"
                    >
                        {filas.join('\n')}
                    </pre>

                    {/* Con el vídeo sano, lo que se mueve va encima del campo y
                        con desplazamiento decimal. Con el vídeo roto ya está
                        dentro de la rejilla, a tirones, y aquí no va nada. */}
                    {!cuadriculado && (
                        <>
                            <span
                                className="pong-sprite pong-ball"
                                data-testid="pong-ball"
                                style={
                                    {
                                        '--x': game.ball.x,
                                        '--y': game.ball.y,
                                    } as React.CSSProperties
                                }
                            >
                                {glyphs.ball}
                            </span>
                            {paleta(COURT_W - 1, game.right, 'right')}
                            {game.mode === 'versus' &&
                                paleta(0, game.left, 'left')}
                        </>
                    )}

                </div>

                <div className="pong-hud pong-hud-bottom">
                    <span data-testid="pong-record">
                        {t('pong.systemRecord')} {SYSTEM_RECORD.toLocaleString()}
                    </span>
                    <span data-testid="pong-hint" className="pong-hint">
                        {game.mode === 'wall'
                            ? t('pong.hintVersus')
                            : t('pong.hintWall', { score: WIN_SCORE })}
                    </span>
                </div>

                {game.over && (
                    <div className="pong-over" data-testid="pong-over">
                        <p className="pong-over-title">
                            {game.mode === 'wall'
                                ? t('pong.lost', { rally: game.rally })
                                : t('pong.won', {
                                      side:
                                          game.scoreLeft > game.scoreRight
                                              ? 'W/S'
                                              : '↑/↓',
                                  })}
                        </p>
                        <p className="pong-over-hint">{t('pong.again')}</p>
                    </div>
                )}
            </div>

            {/* Y el pie, con el estado del sistema donde siempre. En vez del
                recuento de archivos va la velocidad, que es lo que de verdad
                importa acá: sube sola y no tiene tope. */}
            <footer className="status-bar" role="status" aria-live="off">
                <div className="flex items-center gap-4 min-w-0">
                    <span
                        className={`status-slot${senalRota ? ' text-danger' : ''}`}
                        data-testid="pong-status"
                    >
                        {t(senalRota ? 'status.broken' : 'status.ok')}
                    </span>
                </div>
                <span className="mono text-xs dim" data-testid="pong-speed">
                    {t('pong.speed')}: ×{speedFactor(game.elapsedMs).toFixed(2)}
                </span>
            </footer>
        </div>
    );
}
