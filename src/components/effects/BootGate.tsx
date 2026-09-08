// src/components/effects/BootGate.tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BOOT_OFF_MS, BOOT_VENDOR, BOOT_WAKE_MS, type BootPhase } from '@/lib/system/boot';
import { isSoundOn, resumeAudio } from '@/lib/system/audio/context';
import { useT } from '@/i18n';

/**
 * RECARGAR ES APAGAR Y ENCENDER. Primero se apaga; después pide la tecla.
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
 * entra en la ficción sin forzar nada.
 *
 * ⚠ EL APAGÓN VA DESPUÉS DE LA TECLA, Y ESTO SE CORRIGIÓ DOS VECES.
 *
 * Primero iba delante, porque recargar es apagar y encender y ése es el orden de
 * los hechos. Pero delante de la tecla NO HAY PERMISO PARA SONAR, y se reportó
 * exactamente eso: «la de apagar cuando se reinicia no suena, pero cuando se
 * reinicia luego de darle al cromo esa sí suena». La misma pantalla, el mismo
 * sonido en la tabla, y uno llegaba mudo.
 *
 * Un apagado que se VE pero no se OYE es peor que uno que llega un segundo tarde,
 * así que la imagen se mueve a donde el sonido puede acompañarla. Y la lectura
 * sigue en pie: la pantalla está muerta, pulsás, y la máquina hace su ciclo
 * entero — se corta, zumba a oscuras, y vuelve.
 *
 * ⚠ EL APAGÓN NO PINTA UNA CLASE NUEVA: pinta `.collapse-dying`, la misma que ya
 * pintan el arranque, el colapso y el barrido. Por eso suena sin que este
 * archivo sepa nada de sonido — la tabla de `screens.ts` la reconoce. Lo que se
 * comparte no es una llamada, es la marca.
 *
 * ⚠ Y DESPUÉS HAY UN COMPÁS OSCURO, que tampoco es relleno. Es donde el zumbido
 * de la máquina tiene sitio para entrar: se pidió oírlo —«ese grave me gusta, que
 * suene al entrar»— y a la vez que no se solapara con las barras. Sin el hueco
 * sólo podía entrar encima de ellas. Ver `BOOT_WAKE_MS`.
 *
 * ⚠ SÓLO APARECE SI HAY SONIDO QUE DESBLOQUEAR. Con el sonido apagado no serviría
 * de nada y sería un paso más entre alguien y sus notas, que es justo lo que
 * prohíbe la regla A2 — y el arranque de siempre ya trae su propio apagón.
 */
export default function BootGate({ onReady }: { onReady: (desde: BootPhase) => void }) {
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

    /**
     * `tecla` es la pantalla muerta que espera; `off`, el tubo cerrándose;
     * `wake`, el compás oscuro en el que la máquina zumba sin imagen todavía.
     */
    const [acto, setActo] = useState<'tecla' | 'off' | 'wake'>('tecla');

    // Aporrear una pantalla que dice «pulse una tecla» es lo normal. Si cada
    // tecla avisara, el arranque se relanzaría encima de sí mismo.
    const abierta = useRef(false);

    const abrir = useCallback(() => {
        if (abierta.current) return;
        abierta.current = true;

        /*
         * ⚠ SE ESPERA A QUE EL AUDIO ESTÉ DESPIERTO DE VERDAD ANTES DE SEGUIR.
         * `resume()` no es instantáneo, y desde que un golpe no se programa con
         * el contexto dormido, empezar en el mismo instante que el gesto
         * perdería el apagado. Cuando la máquina se mueve, la corriente ya tiene
         * que estar puesta.
         */
        void resumeAudio().then(() => setActo('off'));
    }, []);

    useEffect(() => {
        if (!hacefalta) {
            /*
             * Sin sonido no hay puerta, y entonces el arranque hace su propio
             * apagón: se le pide desde `off` para que la recarga se vea igual
             * que con sonido. Lo único que cambia es que no se oye.
             */
            onReady('off');
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
    }, [hacefalta, abrir, onReady]);

    /*
     * EL CICLO, una vez pulsada la tecla: el tubo se cierra, la máquina zumba a
     * oscuras, y recién entonces empieza a haber imagen.
     *
     * Cada tramo dura lo suyo y NO se solapan, que es lo que se pidió: el
     * apagado tiene su instante, el zumbido el suyo, y las barras llegan con la
     * sala ya puesta en vez de con el fondo subíéndoles encima.
     */
    useEffect(() => {
        if (!hacefalta) return;

        if (acto === 'off') {
            const id = setTimeout(() => setActo('wake'), BOOT_OFF_MS);
            return () => clearTimeout(id);
        }

        if (acto === 'wake') {
            const id = setTimeout(() => onReady('bars'), BOOT_WAKE_MS);
            return () => clearTimeout(id);
        }
    }, [hacefalta, acto, onReady]);

    /*
     * CON EL TUBO APAGADO NO HAY BARRIDO.
     *
     * El barrido es el refresco del tubo, y un tubo apagado no refresca nada.
     * Dejar la línea cruzando mientras la imagen se cierra a un punto contaría
     * que la pantalla sigue encendida justo cuando se está apagando. Es lo mismo
     * que hace el arranque de verdad.
     */
    useEffect(() => {
        if (!hacefalta) return;

        const raiz = document.documentElement;
        raiz.setAttribute('data-tube-off', '');

        return () => raiz.removeAttribute('data-tube-off');
    }, [hacefalta]);

    if (!hacefalta) return null;

    // El tubo cerrándose sobre lo que hubiera, y después el negro en el que la
    // máquina zumba. Las dos tapan igual; lo que cambia es lo que suena.
    if (acto === 'off' || acto === 'wake') {
        return (
            <div className="boot-screen" aria-hidden="true">
                {acto === 'off' && <div className="collapse-dying" />}
            </div>
        );
    }

    return (
        <div className="boot-screen">
            {/*
                ⚠ LA MISMA COLUMNA QUE USA EL ARRANQUE, PERO NO SU CLASE. La
                primera versión ponía el botón en `position: absolute` y el pie
                como hermano centrado, así que se pintaban UNO ENCIMA DEL OTRO: la
                pantalla de arranque es una fila centrada, y lo que se apila va
                dentro de una columna.
                La columna se comparte por CSS y el nombre no, porque `.boot-logo`
                es además la MARCA del rótulo del fabricante — ahí suena el disco
                leyendo, y esta pantalla no enseña ningún rótulo.
            */}
            <div className="boot-gate-stack">
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
