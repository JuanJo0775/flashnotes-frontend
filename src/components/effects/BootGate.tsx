// src/components/effects/BootGate.tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BOOT_VENDOR } from '@/lib/system/boot';
import { isSoundOn } from '@/lib/system/audio/context';
import { useT } from '@/i18n';

/**
 * «PULSE UNA TECLA PARA CONTINUAR», antes de que arranque nada.
 *
 * ⚠ ESTO EXISTE POR UNA LEY DEL NAVEGADOR, NO POR ESTÉTICA — y la estética sale
 * gratis, que es lo bonito del asunto.
 *
 * Todo navegador crea el audio en estado suspendido y no lo deja arrancar hasta
 * que hay un gesto del usuario. Es una política contra la publicidad con sonido
 * y no tiene vuelta: cualquier cosa que se programe antes queda muda. Por eso el
 * arranque —las barras, el logo, la comprobación de memoria— transcurría en
 * silencio, y no había forma de arreglarlo desde el código del sonido.
 *
 * La única salida honesta es que el producto PIDA el gesto. Y da la casualidad
 * de que las máquinas de esa época hacían exactamente eso, así que la limitación
 * entra en la ficción sin forzar nada: lo que era un impedimento técnico pasa a
 * ser el primer gesto de encender la máquina.
 *
 * ⚠ SÓLO APARECE SI HAY SONIDO QUE DESBLOQUEAR. Con el sonido apagado no serviría
 * de nada y sería un paso más entre alguien y sus notas, que es justo lo que
 * prohíbe la regla A2.
 */
export default function BootGate({ onReady }: { onReady: () => void }) {
    const t = useT();

    /*
     * Se decide UNA vez, al montar, y no en cada render.
     *
     * Si se consultara el interruptor al pintar, apagar el sonido a mitad de la
     * espera haría desaparecer la puerta de golpe — y quien estuviera mirándola
     * vería la pantalla saltar sin haber tocado nada.
     */
    const [hacefalta] = useState(() => {
        try {
            return isSoundOn();
        } catch {
            return false;
        }
    });

    // Aporrear una pantalla que dice «pulse una tecla» es lo normal. Si cada
    // tecla avisara, el arranque se relanzaría encima de sí mismo.
    const abierta = useRef(false);

    const abrir = useCallback(() => {
        if (abierta.current) return;

        abierta.current = true;
        onReady();
    }, [onReady]);

    useEffect(() => {
        if (!hacefalta) {
            abrir();
            return;
        }

        /*
         * En el documento y no sólo en el botón: la pantalla dice «cualquier
         * tecla», así que cualquier tecla tiene que valer aunque el foco esté en
         * otra parte. Y el clic igual — quien llega con el ratón hace clic donde
         * mira, no necesariamente encima del texto.
         */
        document.addEventListener('keydown', abrir);
        document.addEventListener('click', abrir);

        return () => {
            document.removeEventListener('keydown', abrir);
            document.removeEventListener('click', abrir);
        };
    }, [hacefalta, abrir]);

    if (!hacefalta) return null;

    return (
        <div className="boot-screen">
            {/*
                ⚠ LA MISMA COLUMNA QUE USA EL ARRANQUE DE VERDAD. La primera
                versión ponía el botón en `position: absolute` y el pie como
                hermano centrado, así que se pintaban UNO ENCIMA DEL OTRO. La
                pantalla de arranque es una fila centrada: lo que se apila va
                dentro de una columna, no suelto.
            */}
            <div className="boot-logo">
                {/*
                    Un botón de verdad y no un `div` con `onClick`: esta pantalla
                    es lo único que hay entre alguien y su cuaderno, así que tiene
                    que poder activarse con el teclado, anunciarse a un lector de
                    pantalla y recibir el foco.
                */}
                <button
                    type="button"
                    autoFocus
                    onClick={abrir}
                    className="boot-gate"
                    aria-label={t('boot.pressKey')}
                >
                    <span className="pixel">{t('boot.pressKey')}</span>
                    <span className="cursor-block" aria-hidden="true" />
                </button>

                <p className="boot-vendor">{BOOT_VENDOR}</p>
            </div>
        </div>
    );
}
