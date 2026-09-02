// src/components/layout/StatusBar.tsx
'use client';

import { useEffect } from 'react';
import ProgressBar from '@/components/ui/ProgressBar';
import { useNetworkStatus, clearLastOutage } from '@/hooks/useNetworkStatus';
import { formatDuration } from '@/lib/utils/formatters';
import { useSystemFragment } from '@/hooks/useSystemFragment';
import { useSystemState } from '@/hooks/useSystemState';
import { MAX_FRAGMENT_LENGTH } from '@/lib/system/lore';
import { LIMITS } from '@/config/limits';
import { useT } from '@/i18n';
import type { Message } from '@/i18n';
import type { SaveState } from '@/types/note.types';

interface StatusBarProps {
    notesCount: number;
    isLoading: boolean;
    /** Sin traducir: se resuelve acá, para que siga al idioma. */
    error: Message | null;
    saveState: SaveState;
    /** Caracteres de la nota abierta, o undefined si no hay ninguna. */
    openNoteLength?: number;
    /** Atajo escondido: Alt+clic sobre [SYSTEM_OK]. */
    onOpenDiagnostics?: () => void;
}

/** Cuánto se muestra el aviso de reconexión antes de retirarse solo. */
const RECONNECT_NOTICE_MS = 3000;

/** 1234 -> "1.2k", 10000 -> "10k". Mantiene el contador corto y estable. */
function compact(n: number): string {
    if (n < 1000) return String(n);
    const miles = n / 1000;
    return `${Number.isInteger(miles) ? miles : miles.toFixed(1)}k`;
}

/**
 * Estado del sistema en una línea.
 *
 * Sobre el color: sólo aparece cuando algo requiere atención. Que la app esté
 * bien o que la nota se haya guardado se dice en el mismo negro o blanco que el
 * resto del texto; el ámbar y el rojo quedan reservados para lo que hay que
 * mirar. Un [SYSTEM_OK] verde permanente es ruido, no información.
 *
 * Sobre el medidor: mide los caracteres de la nota abierta contra CONTENT_MAX,
 * que es el único tope que un usuario puede alcanzar de verdad. Antes dividía el
 * número de notas entre HISTORY_MAX —las versiones de deshacer por nota— así que
 * a las 20 notas marcaba 100% y no medía absolutamente nada. No hay ningún
 * límite de cantidad de notas por sesión.
 */
export default function StatusBar({
    notesCount,
    isLoading,
    error,
    saveState,
    openNoteLength,
    onOpenDiagnostics,
}: StatusBarProps) {
    const { isOnline, backendReachable, isChecking, lastOutageMs } = useNetworkStatus();
    const fragment = useSystemFragment();
    const t = useT();

    // Cuando el servidor vuelve, se dice cuánto estuvo caído y se retira solo.
    //
    // El dato se pinta DIRECTAMENTE del almacén en vez de copiarse a estado
    // local: copiarlo obligaría a un setState dentro del efecto, que encadena un
    // render durante el commit. Acá el efecto sólo agenda el borrado.
    //
    // Este aviso SÍ pasa por la región viva y se anuncia: es información real
    // sobre el estado del sistema, que es exactamente para lo que la región
    // existe. Los fragmentos ambientales son otra cosa y van aria-hidden.
    useEffect(() => {
        if (!lastOutageMs) return;

        const id = setTimeout(clearLastOutage, RECONNECT_NOTICE_MS);
        return () => clearTimeout(id);
    }, [lastOutageMs]);

    /**
     * El estado del sistema.
     *
     * EL ESTADO REAL GANA SIEMPRE. Si hay algo que informar —sin red, servidor
     * caído, error, cargando— el fragmento ambiental no llega a pintarse. Esta
     * barra es lo que le dice al usuario si su trabajo está a salvo; eso no se
     * toca ni en broma.
     *
     * Devuelve además si lo que se muestra es un fragmento, porque eso cambia
     * cómo se expone al lector de pantalla.
     */
    // Suscrito, y NO leído con `isSystemFailing()`: esa función lee el almacén
    // sin suscribirse, así que el rótulo se habría quedado en [TODO_BIEN] hasta
    // que otra cosa provocara un repintado.
    const { chromaticFailure, lockedOut } = useSystemState();
    const senalRota = chromaticFailure || lockedOut;

    const systemStatus = (): { node: React.ReactNode; isFragment: boolean } => {
        if (!isOnline)
            return {
                node: <span className="text-danger">{t('status.noNet')}</span>,
                isFragment: false,
            };
        // Truthy y no `!== null`: así una caída de 0 ms —que no es una caída—
        // no imprime "00:00:00 A OSCURAS", y un valor ausente no se cuela como
        // NaN si alguien construye el estado a mano.
        if (lastOutageMs)
            return {
                node: (
                    <span>
                        {t('status.reconnected', {
                            duration: formatDuration(lastOutageMs),
                        })}
                    </span>
                ),
                isFragment: false,
            };
        if (!backendReachable && !isChecking)
            return {
                node: <span className="text-warn">{t('status.serverDown')}</span>,
                isFragment: false,
            };
        if (error)
            return {
                node: <span className="text-danger">{t('status.error')}</span>,
                isFragment: false,
            };
        if (isLoading)
            return {
                node: <span className="loading-dots">{t('status.loading')}</span>,
                isFragment: false,
            };

        // Con la señal rota el rótulo se da vuelta: [TODO_BIEN] pasa a
        // [TODO_MAL]. Va ANTES del fragmento a propósito — mientras la avería
        // dura, el sistema no está para dejar caer frases sueltas sobre lo solo
        // que se siente; sólo puede decir que algo va mal.
        //
        // Es la única pieza del lore que se CONTRADICE a sí misma, y por eso
        // funciona: doce piezas insistiendo en que todo va bien hacen que este
        // rótulo, la primera vez, se lea como una confesión.
        if (senalRota)
            return {
                node: <span className="text-danger">{t('status.broken')}</span>,
                isFragment: false,
            };

        if (fragment) return { node: <span>{fragment}</span>, isFragment: true };

        return { node: <span>{t('status.ok')}</span>, isFragment: false };
    };

    const saveStatus = () => {
        switch (saveState) {
            case 'saving':
                return <span className="loading-dots dim">{t('status.saving')}</span>;
            case 'saved':
                return <span>{t('status.saved')}</span>;
            case 'error':
                return <span className="text-danger">{t('status.notSaved')}</span>;
            default:
                return null;
        }
    };

    const estado = systemStatus();

    const usage =
        openNoteLength === undefined
            ? null
            : Math.min(100, Math.round((openNoteLength / LIMITS.CONTENT_MAX) * 100));

    return (
        <footer className="status-bar" role="status" aria-live="polite">
            {/* El atajo del panel va SOLO en el hueco del estado del sistema, no
                en toda la barra: antes, un Alt+clic sobre [GUARDADO] o sobre el
                mensaje de error también lo abría, y el secreto tiene que estar
                donde dice que está.
                [SYSTEM_OK] se queda como texto plano —sin role ni tabindex—
                porque esta barra es una región viva: un objetivo enfocable aquí
                dentro es incómodo con lector de pantalla, y el panel ya tiene su
                vía accesible por teclado con el comando >diag.

                Es Alt+clic y no Ctrl+clic a propósito: en macOS Ctrl+clic ES el
                clic secundario y abre el menú contextual. */}
            <div className="flex items-center gap-4 min-w-0">
                {/* El hueco reserva el ancho del fragmento más largo, en `ch`.
                    En monoespaciada 1ch es el avance exacto de un carácter, así
                    que se cuenta en vez de medirse — el mismo principio que
                    alinea los prompts del editor. Sin esto, un fragmento ancho
                    empujaría [GUARDADO] y todo lo que sigue cada tres minutos, y
                    un secreto que descoloca la interfaz deja de ser un secreto y
                    pasa a ser un defecto. */}
                <span
                    className="status-slot"
                    style={{ minWidth: `${MAX_FRAGMENT_LENGTH}ch` }}
                    onClick={(e) => {
                        if (e.altKey) onOpenDiagnostics?.();
                    }}
                >
                    {estado.isFragment ? (
                        <>
                            {/* El fragmento se ve pero NO se anuncia: esta barra
                                es una región viva, y una voz que interrumpe al
                                usuario cada tres minutos con SIN RELEVO no es
                                encantadora, es hostil. El estado real se queda
                                en el árbol de accesibilidad. */}
                            <span aria-hidden="true">{estado.node}</span>
                            <span className="sr-only">{t('status.ok')}</span>
                        </>
                    ) : (
                        estado.node
                    )}
                </span>
                {saveStatus()}
                {error && (
                    <span className="truncate dim" title={t(error.key, error.vars)}>
                        {t(error.key, error.vars)}
                    </span>
                )}
            </div>

            <div className="flex items-center gap-4 shrink-0">
                <span className="tabular-nums">{t('status.files', { n: notesCount })}</span>

                {usage !== null && openNoteLength !== undefined && (
                    <>
                        <span className="dim tabular-nums">
                            {t('status.noteSize', {
                                used: compact(openNoteLength),
                                max: compact(LIMITS.CONTENT_MAX),
                            })}
                        </span>
                        <ProgressBar value={usage} name={t('status.noteUsage')} />
                    </>
                )}
            </div>
        </footer>
    );
}
