// src/components/effects/WipeScreen.tsx
'use client';

import { useEffect, useState } from 'react';
import { wipeAt, wipeDuration, wipeLine } from '@/lib/system/wipe';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useT } from '@/i18n';
import { BOOT_BARS } from '@/lib/system/boot';

/**
 * El borrado, de principio a fin.
 *
 * Cuatro tramos, y cada uno hace algo distinto:
 *
 *   1 · La pantalla de notas SE DESVANECE hasta quedar vacía.
 *   2 · Pantalla aparte, contando lo que se va yendo.
 *   3 · Pum: el tubo se apaga, como al cortarle la corriente.
 *   4 · Y el monitor vuelve a arrancar, que lo pone la página.
 *
 * El desvanecido es lo que lo hace funcionar. Sin él, la pantalla de borrado
 * aparecía de golpe sobre las notas y se leía como un diálogo; con él, lo que se
 * ve es a la app IRSE, y sólo después empieza a contarse.
 *
 * ⚠ EL BORRADO YA OCURRIÓ ANTES DE QUE ESTO SE MONTE.
 *
 * Esto es una animación, no un proceso: si los datos se fueran al ritmo de los
 * fotogramas, cerrar la pestaña a mitad dejaría medio limpio y medio no. Se
 * borra de golpe y luego se cuenta — que es, además, lo que hace un `rm` de
 * verdad frente a lo que enseña una pantalla de carga.
 *
 * `prefers-reduced-motion` se salta el desfile y va directo al final (REGLAS ·
 * A3). Quien lo tiene puesto no se pierde nada: el resultado es el mismo.
 */

interface Props {
    /** Se llama al terminar. Es quien devuelve al arranque. */
    onDone: () => void;
    /** Si es teatro: recorre lo mismo y al final confiesa, sin haber tocado nada. */
    prank?: boolean;
}

export default function WipeScreen({ onDone, prank = false }: Props) {
    const quieto = usePrefersReducedMotion();
    const t = useT();
    const [step, setStep] = useState(0);

    useEffect(() => {
        if (quieto) {
            onDone();
            return;
        }

        const fase = wipeAt(step, prank);

        if (fase.kind === 'done') {
            onDone();
            return;
        }

        const id = setTimeout(
            () => setStep((n) => n + 1),
            wipeDuration(step, prank)
        );
        return () => clearTimeout(id);
    }, [step, prank, quieto, onDone]);

    /*
     * EL DESVANECIDO SE APLICA AL DOCUMENTO, no acá dentro.
     *
     * Lo que tiene que irse es la app ENTERA, y ésta vive fuera de este árbol.
     * Un atributo en `<html>` es lo que ya usan la avería cromática y la v0.2, y
     * por el mismo motivo: es el único sitio desde el que se alcanza todo.
     */
    useEffect(() => {
        document.documentElement.setAttribute('data-wiping', '');
        return () => document.documentElement.removeAttribute('data-wiping');
    }, []);

    if (quieto) return null;

    const fase = wipeAt(step, prank);

    // Mientras se desvanece no hay nada que enseñar: lo que se está viendo es la
    // app yéndose, y ponerle algo encima la taparía justo cuando importa.
    if (fase.kind === 'fading' || fase.kind === 'done') return null;

    return (
        <div className="wipe-screen">
            {/* EL APAGÓN ES EL MISMO ELEMENTO QUE EL DEL FALLO CRÍTICO.
                Animar esta pantalla entera daba otra cosa: el contenido se
                aplastaba con ella y se veía al revés. `.collapse-dying` es una
                capa aparte que se cierra sobre lo que haya debajo, que es lo que
                hace un tubo al que le cortan la corriente. Un gesto, una
                animación. */}
            {fase.kind === 'off' && <div className="collapse-dying" />}

            {/* Las franjas, con el equipo ya vacío: entre el apagón y el
                encendido hay un monitor sin señal, que es lo que hay cuando ya
                no queda nada dentro. */}
            {fase.kind === 'bars' && (
                <div className="wipe-bars" aria-hidden="true">
                    {BOOT_BARS.map((c) => (
                        <span key={c} style={{ background: c }} />
                    ))}
                </div>
            )}

            {fase.kind === 'erasing' && (
                <pre className="wipe-list" aria-hidden="true">
                    {fase.lines.map((l, i) => wipeLine(l, i < fase.eaten)).join('\n')}
                </pre>
            )}

            {fase.kind === 'joke' && (
                <div className="wipe-joke">
                    <pre className="wipe-face" aria-hidden="true">
                        {':)'}
                    </pre>
                    <p className="wipe-footer mono">{t('reset.prank')}</p>
                </div>
            )}

            {/* Quien escucha no necesita catorce nombres de fichero tachándose. */}
            <span className="sr-only" role="status">
                {fase.kind === 'joke' ? t('reset.prank') : t('reset.wiping')}
            </span>
        </div>
    );
}
