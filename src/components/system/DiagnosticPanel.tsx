// src/components/system/DiagnosticPanel.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import ProgressBar from '@/components/ui/ProgressBar';
import { useTheme } from '@/hooks/useTheme';
import { useLang } from '@/i18n';
import {
    useSystemState,
    setEffectsEnabled,
    markSecretFound,
} from '@/hooks/useSystemState';
import { coreTemperature, CORE_MAX_C, CORE_MIN_C } from '@/lib/system/diagnostics';
import { strainedCore, strainedIntegrity } from '@/lib/system/strain';
import { useGlitch } from '@/hooks/useGlitch';
import { secretsBar, secretsRank } from '@/lib/system/secretsRank';
import { ART_TOTAL, readFound } from '@/lib/system/asciiArt';
import { formatDuration, formatFileSize } from '@/lib/utils/formatters';
import { readScores, type Board, type Scores } from '@/lib/system/pongScores';
import { useT } from '@/i18n';

/**
 * El panel de diagnóstico: un listado de lecturas del sistema.
 *
 * Se abre con el comando `//diag` o con Alt+clic (⌥+clic) sobre `[SYSTEM_OK]`.
 * NO con Ctrl+clic: en macOS Ctrl+clic es el clic secundario y abre el menú
 * contextual.
 *
 * Usa la misma piel que ConfirmDialog —barra de título en tinta, cuerpo en
 * papel, sin curvas— y el mismo <dialog> nativo, que da trampa de foco, cierre
 * con Escape y capa superior sin ninguna librería.
 *
 * Todas las lecturas son ciertas salvo NÚCLEO, que es decoración honesta y se
 * deriva del ritmo de escritura. SESIÓN dice NO LEGIBLE porque la cookie es
 * httpOnly y de verdad no se puede leer: el panel no inventa lo que no tiene.
 */

interface DiagnosticPanelProps {
    open: boolean;
    onClose: () => void;
    notesCount: number;
    /** Total de caracteres escritos en todas las notas. */
    bytesWritten: number;
    /** Ritmo de escritura reciente, para la lectura del núcleo. */
    charsPerMinute: number;
}

/** Una fila del listado: etiqueta a la izquierda, lectura a la derecha. */
function Reading({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="diag-row">
            <span className="diag-label">{label}</span>
            <span className="diag-value tabular-nums">{children}</span>
        </div>
    );
}

export default function DiagnosticPanel({
    open,
    onClose,
    notesCount,
    bytesWritten,
    charsPerMinute,
}: DiagnosticPanelProps) {
    const ref = useRef<HTMLDialogElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);
    const system = useSystemState();
    const theme = useTheme();
    const t = useT();
    const lang = useLang();
    const glitch = useGlitch();

    /*
     * Lo que cuesta lo que está pasando.
     *
     * La integridad BAJA y el núcleo SUBE, a propósito: una dice cuánto queda
     * sano, el otro cuánto se está gastando en sostenerlo. Con una sola lectura
     * no se distinguiría «roto» de «forzado».
     */
    const desgaste = {
        chromaticFailure: system.chromaticFailure,
        glitching: glitch.active,
        clicks: system.labelClicks,
    };

    const integridad = strainedIntegrity(system.integrity, desgaste);

    // El tiempo activo tiene que correr mientras el panel está abierto: un
    // diagnóstico con el reloj congelado se nota enseguida. Sólo tictaquea con
    // el panel visible, así que no hay temporizador colgando de fondo.
    //
    // ARRANCA EN EL INICIO DE LA SESIÓN, no en `Date.now()`. Con `Date.now()`,
    // el servidor y el cliente lo evaluaban en instantes distintos y React
    // tiraba un error de hidratación en CADA carga: el servidor pintaba
    // `496754:16:04` y el cliente `496754:16:08`. Partiendo del arranque de la
    // sesión, el primer render vale 00:00:00 en los dos lados y el efecto lo
    // pone al día enseguida.
    const [now, setNow] = useState(() => system.sessionStart);

    useEffect(() => {
        if (!open) return;

        const tick = () => setNow(Date.now());

        // El primer refresco va agendado, no llamado en el acto: el panel puede
        // llevar montado mucho rato con `now` viejo, así que al abrirse hay que
        // ponerlo al día — pero hacerlo de forma síncrona dentro del efecto
        // encadena un render durante el commit, que es justo lo que este
        // proyecto evita en todos lados.
        const primero = setTimeout(tick, 0);
        const id = setInterval(tick, 1000);

        return () => {
            clearTimeout(primero);
            clearInterval(id);
        };
    }, [open]);

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;

        if (open && !dialog.open) {
            dialog.showModal();
            closeRef.current?.focus();
            // Llegar hasta acá ES el hallazgo. Por eso el contador nunca puede
            // verse en 0: para leerlo ya tuviste que encontrar el panel.
            markSecretFound('diagnostics');
        } else if (!open && dialog.open) {
            dialog.close();
        }
    }, [open]);

    const uptime = formatDuration(now - system.sessionStart);

    // Cuántas piezas llevás recuperadas. Se lee acá y no de `system` porque la
    // colección vive en `localStorage` y no pasa por el estado del sistema.
    const piezas = readFound().size;
    // El ritmo de escritura lo calienta, y las averías también: forzar la
    // máquina cuesta, y el núcleo es donde se lee ese coste.
    const temp = strainedCore(coreTemperature(charsPerMinute), desgaste);

    /**
     * Los marcadores del `vsync-test`.
     *
     * SE LEEN EN UN EFECTO, NO AL PINTAR, y no es un rodeo. Viven en
     * `localStorage`, que en el servidor no existe: leerlos durante el render
     * daba «SIN DATOS» en el servidor y el marcador de verdad en el cliente, y
     * React tiraba el árbol entero y lo regeneraba en cada carga. Es el mismo
     * desajuste de hidratación que ya se cazó una vez en el rótulo de la
     * cabecera, y como aquél, sólo se ve abriendo la app.
     *
     * Arranca en `null` —lo mismo que pinta el servidor— y se rellena tras
     * montar. Se relee en cada apertura, así que el panel siempre trae lo
     * último.
     *
     * Sin partidas dice SIN DATOS en vez de un cero: un cero parecería un
     * récord malísimo en vez de un hueco.
     */
    const [scores, setScores] = useState<Scores | null>(null);

    useEffect(() => {
        if (!open) return;

        // Agendado: un `setState` síncrono dentro de un efecto encadena un
        // render durante el commit.
        const id = setTimeout(() => setScores(readScores()), 0);
        return () => clearTimeout(id);
    }, [open]);

    const pong = (board: Board) => {
        const marcador = scores?.[board];
        return !marcador || marcador.games === 0
            ? t('diag.pongNever')
            : t('diag.pongLine', {
                  best: marcador.best,
                  games: marcador.games,
              });
    };

    return (
        <dialog
            ref={ref}
            className="dialog-terminal"
            aria-labelledby="diag-title"
            onCancel={(e) => {
                e.preventDefault();
                onClose();
            }}
        >
            <h2 id="diag-title" className="dialog-title">
                {t('diag.title')}
            </h2>

            <div className="dialog-body">
                <div className="diag-readings mono text-sm">
                    <Reading label={t('diag.session')}>{t('diag.unreadable')}</Reading>
                    <Reading label={t('diag.uptime')}>{uptime}</Reading>
                    <Reading label={t('diag.notesCreated')}>{notesCount}</Reading>
                    <Reading label={t('diag.bytesWritten')}>{formatFileSize(bytesWritten)}</Reading>
                    {/* LOS INSTRUMENTOS SE MUEVEN. Decían 100 % y 38 °C con la
                        señal rota y el rótulo aporreado: un panel que marca lo
                        mismo pase lo que pase no es un instrumento, es un adorno
                        con números. Y es el único sitio donde la avería queda
                        registrada. */}
                    <Reading label={t('diag.integrity')}>{integridad}%</Reading>
                    <Reading label={t('diag.theme')}>
                        {t(theme === 'dark' ? 'theme.dark' : 'theme.light')}
                    </Reading>
                    {/* No es un dato más: es lo que le dice a alguien cuánto
                        conoce del sistema, y por eso lleva barra y escalón. Un
                        `7/28` seco se lee y se olvida; una barra a un cuarto da
                        ganas de saber qué hay en los otros tres. */}
                    <Reading label={t('diag.secrets')}>
                        <span className="flex items-center gap-2">
                            <span aria-hidden="true">
                                {secretsBar(system.secretsFound, system.secretsTotal)}
                            </span>
                            <span>
                                {system.secretsFound}/{system.secretsTotal}
                            </span>
                            <span className="dim">
                                ·{' '}
                                {secretsRank(
                                    system.secretsFound,
                                    system.secretsTotal,
                                    lang
                                )}
                            </span>
                        </span>
                    </Reading>
                    {/* LAS PIEZAS VAN AL LADO DE LOS SECRETOS y con la misma
                        barra, porque son la misma pregunta contada de otra
                        forma: cuánto del sistema conocés. Separarlas en dos
                        lenguajes distintos haría parecer que una de las dos
                        colecciones importa menos.

                        Se lee del almacenamiento en el render, como hace la
                        pestaña de la colección: este panel sólo existe
                        después de un alt+clic, así que nunca lo pinta el
                        servidor y no hay desajuste que temer (REGLAS · C1). */}
                    <Reading label={t('diag.pieces')}>
                        <span className="flex items-center gap-2">
                            <span aria-hidden="true">
                                {secretsBar(piezas, ART_TOTAL)}
                            </span>
                            <span data-testid="diag-pieces">
                                {piezas}/{ART_TOTAL}
                            </span>
                        </span>
                    </Reading>
                    <Reading label={t('diag.pongClean')}>
                        <span data-testid="diag-pong-clean">{pong('clean')}</span>
                    </Reading>
                    <Reading label={t('diag.pongDegraded')}>
                        <span data-testid="diag-pong-degraded">
                            {pong('degraded')}
                        </span>
                    </Reading>
                    <Reading label={t('diag.core')}>
                        <span className="flex items-center gap-2">
                            <span>{temp}°C</span>
                            <ProgressBar
                                // La barra se dibuja contra la temperatura que
                                // se ENSEÑA, no contra el ritmo pelado: si no,
                                // el número subía con la avería y la barra se
                                // quedaba donde estaba.
                                value={
                                    ((temp - CORE_MIN_C) /
                                        (CORE_MAX_C - CORE_MIN_C)) *
                                    100
                                }
                                name={t('diag.coreMeter', { temp, max: CORE_MAX_C })}
                            />
                        </span>
                    </Reading>
                </div>

                <div className="dialog-actions">
                    <button
                        type="button"
                        onClick={() => setEffectsEnabled(!system.effectsEnabled)}
                        className="btn-terminal"
                    >
                        {t('diag.effects', {
                            state: system.effectsEnabled ? 'ON' : 'OFF',
                        })}
                    </button>
                    <button
                        ref={closeRef}
                        type="button"
                        onClick={onClose}
                        className="btn-terminal"
                    >
                        {t('diag.close')}
                    </button>
                </div>
            </div>
        </dialog>
    );
}
