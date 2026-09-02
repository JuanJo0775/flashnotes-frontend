// src/components/system/DiagnosticPanel.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import ProgressBar from '@/components/ui/ProgressBar';
import { useTheme } from '@/hooks/useTheme';
import {
    useSystemState,
    setEffectsEnabled,
    markSecretFound,
} from '@/hooks/useSystemState';
import { coreTemperature, coreRatio, CORE_MAX_C } from '@/lib/system/diagnostics';
import { formatDuration, formatFileSize } from '@/lib/utils/formatters';
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
    const temp = coreTemperature(charsPerMinute);

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
                    <Reading label={t('diag.integrity')}>{system.integrity}%</Reading>
                    <Reading label={t('diag.theme')}>
                        {t(theme === 'dark' ? 'theme.dark' : 'theme.light')}
                    </Reading>
                    <Reading label={t('diag.secrets')}>
                        {system.secretsFound}/{system.secretsTotal}
                    </Reading>
                    <Reading label={t('diag.core')}>
                        <span className="flex items-center gap-2">
                            <span>{temp}°C</span>
                            <ProgressBar
                                value={coreRatio(charsPerMinute) * 100}
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
