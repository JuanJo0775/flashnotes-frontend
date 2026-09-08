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
 * ⚠ EL APAGÓN VA DELANTE. Recargar es apagar y encender, y ése es el orden de los
 * hechos: el tubo se cierra a un punto, la pantalla queda muerta pidiendo una
 * tecla, y al pulsarla vuelve la corriente.
 *
 * ⚠ Y AHÍ HAY UNA RENUNCIA CONSCIENTE. Ese apagón SE VE PERO NO SE OYE en la
 * primera carga, y no hay código que lo arregle: pasa antes del primer gesto, y
 * ningún navegador deja sonar antes de eso. Se probó lo contrario —mover la
 * imagen detrás de la tecla para que sonara— y era peor: rompe el orden de los
 * hechos, que es lo único que esta pantalla tiene que contar.
 *
 * Lo que SÍ se puede es que la VUELTA se oiga entera, y de eso se encarga el acto
 * `on`.
 *
 * ⚠ NINGUNO DE LOS DOS PINTA UNA CLASE INVENTADA PARA EL SONIDO. El apagón pinta
 * `.collapse-dying`, la misma que ya pintan el arranque, el colapso y el barrido.
 * El encendido pinta `.tube-on`, que es esa misma figura al revés. Por eso los
 * dos suenan sin que este archivo sepa nada de sonido — la tabla de `screens.ts`
 * los reconoce. Lo que se comparte no es una llamada, es la marca.
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
     * `off` es el tubo cerrándose; `tecla`, la pantalla muerta que espera;
     * `on`, la corriente volviendo — la misma figura del apagón al revés.
     */
    const [acto, setActo] = useState<'off' | 'tecla' | 'on'>('off');

    // Aporrear una pantalla que dice «pulse una tecla» es lo normal. Si cada
    // tecla avisara, el arranque se relanzaría encima de sí mismo.
    const abierta = useRef(false);

    /*
     * Quien se adelanta durante el apagón NO lo interrumpe.
     *
     * ⚠ Y tampoco pierde su gesto. Cortar el apagón dejaría a medias justo lo
     * que hay que ver; ignorar la tecla obligaría a pulsar dos veces sin decir
     * por qué. Se apunta y se abre en cuanto el tubo termina de cerrarse.
     */
    const adelantado = useRef(false);

    const abrir = useCallback(() => {
        if (abierta.current) return;
        abierta.current = true;

        /*
         * ⚠ SE ESPERA A QUE EL AUDIO ESTÉ DESPIERTO DE VERDAD ANTES DE SEGUIR.
         * `resume()` no es instantáneo, y desde que un golpe no se programa con
         * el contexto dormido, encender en el mismo instante que el gesto
         * perdería justo el encendido. Cuando el tubo se abre, la corriente ya
         * tiene que estar puesta.
         */
        void resumeAudio().then(() => setActo('on'));
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
        const pulsar = () => {
            if (acto === 'off') adelantado.current = true;
            else abrir();
        };

        document.addEventListener('keydown', pulsar);
        document.addEventListener('click', pulsar);

        return () => {
            document.removeEventListener('keydown', pulsar);
            document.removeEventListener('click', pulsar);
        };
    }, [hacefalta, acto, abrir, onReady]);

    /*
     * LOS DOS TRAMOS QUE TARDAN LO SUYO.
     *
     * El tubo se cierra, y después espera. Y cuando vuelve la corriente el tubo
     * se abre — y ahí también hay que esperar: es el hueco donde el encendido y
     * el zumbido de la máquina entran SOLOS, antes de que haya carta de ajuste.
     * Sin él sólo podían sonar encima de ella, que es lo que se reportó.
     */
    useEffect(() => {
        if (!hacefalta) return;

        if (acto === 'off') {
            const id = setTimeout(() => {
                if (adelantado.current) abrir();
                else setActo('tecla');
            }, BOOT_OFF_MS);

            return () => clearTimeout(id);
        }

        if (acto === 'on') {
            const id = setTimeout(() => onReady('bars'), BOOT_WAKE_MS);
            return () => clearTimeout(id);
        }
    }, [hacefalta, acto, abrir, onReady]);

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

    // El tubo cerrándose sobre lo que hubiera, y el tubo abriéndose cuando vuelve
    // la corriente. La misma figura en los dos sentidos.
    if (acto !== 'tecla') {
        return (
            <div className="boot-screen" aria-hidden="true">
                <div className={acto === 'off' ? 'collapse-dying' : 'tube-on'} />
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
