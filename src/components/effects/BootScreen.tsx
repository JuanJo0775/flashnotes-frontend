// src/components/effects/BootScreen.tsx
'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useEvent } from '@/hooks/useEvent';
import {
    type BootPhase,
    bootAt,
    bootDuration,
    bootScript,
    bootCheckLines,
    BOOT_BARS,
    BOOT_LOGO,
    BOOT_VENDOR,
} from '@/lib/system/boot';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { isLockedOutNow } from '@/hooks/useSystemState';
import { isV02 } from '@/lib/system/v02';
import AsciiStatic from '@/components/effects/AsciiStatic';
import V02Bar from '@/components/effects/V02Bar';

/**
 * El monitor encendiéndose.
 *
 * Salen las barras de color, el rótulo del fabricante, la comprobación de
 * memoria, y a trabajar. Sin animación de encendido propia: el apagón del tubo
 * ya existe —el del fallo crítico— y su inverso inventado se veía como una
 * pantalla ajena abriéndose. Lo que abre el arranque son las barras. Sale ANTES de la app, cada vez que se
 * carga.
 *
 * POR QUÉ SIEMPRE. Un arranque que sale una vez es una pantalla de bienvenida, y
 * una pantalla de bienvenida se salta. Uno que sale siempre es cómo ES la
 * máquina. Es lo que convierte «una app con estética de terminal» en «un equipo
 * que se enciende».
 *
 * Y TARDA DISTINTO CADA VEZ, entre dos y ocho segundos. Un equipo de verdad no
 * tarda siempre lo mismo. Un arranque cronometrado se siente como una animación;
 * uno que unas veces vuela y otras se hace de rogar se siente como una máquina.
 *
 * ⚠ NO BLOQUEA NADA. La app se monta por detrás mientras esto se ve: cuando el
 * arranque termina, ya está todo listo. Si esperara a que acabe para empezar a
 * cargar sería un peaje de verdad y no un adorno.
 *
 * `prefers-reduced-motion` lo salta entero (REGLAS · A3): detrás está exactamente
 * la misma app.
 */

/** No hay a qué suscribirse: sólo interesa el salto de servidor a cliente. */
const SIN_CAMBIOS = () => () => {};

interface Props {
    onDone: () => void;
    /**
     * Desde qué tramo arranca.
     *
     * Lo pasan quienes YA hicieron parte del recorrido: el borrado de `//reset`
     * (que apaga y enseña las barras) y el colapso (que apaga con su `dying`).
     * Sin esto, el arranque repetía lo que acababa de verse.
     */
    from?: BootPhase;
}

export default function BootScreen({ onDone, from = 'off' }: Props) {
    /*
     * ⚠ LA IDENTIDAD SE FIJA ACÁ, y esto arregla un fallo reportado dos veces:
     * «la animación de reiniciar queda congelada en algunos momentos».
     *
     * El padre pasa una flecha escrita en el JSX —una función NUEVA en cada
     * render— y la página repinta sola por lo menos una vez por segundo, porque
     * hay un reloj en la barra de estado. Con `onDone` en las dependencias, cada
     * repintado desarmaba el temporizador del tramo y lo volvía a armar desde
     * cero: un tramo más largo que un segundo NO TERMINABA NUNCA.
     *
     * Por eso pasaba «a veces» — la duración se sortea, y sólo se congelaba
     * cuando el tramo salía largo. Ver `useEvent`.
     */
    const avisar = useEvent(onDone);

    const quieto = usePrefersReducedMotion();
    const [step, setStep] = useState(0);

    /*
     * ⚠ EL BLOQUEO SE LEE DEL ALMACENAMIENTO, NO DEL ESTADO DE REACT.
     *
     * `useSystemState` devuelve el snapshot del SERVIDOR en el primer render del
     * cliente (REGLAS · C2), y ahí el bloqueo siempre es `false`. El arranque
     * preguntaba, le decían que no, hacía el recorrido largo de ocho segundos,
     * terminaba enseñando el inicio, y sólo entonces aparecía el fallo. Se veía
     * la app un rato en mitad de un bloqueo.
     *
     * `null` = todavía no se sabe. Mientras tanto la pantalla tapa y no avanza:
     * un fotograma de espera es mucho menos que ocho segundos de app asomando.
     */
    const montado = useSyncExternalStore(
        SIN_CAMBIOS,
        () => true,
        () => false
    );

    // Derivado, no estado: `setLocked` dentro de un efecto encadena renders y el
    // compilador de React lo rechaza — con razón. Acá no hace falta guardar
    // nada, sólo saber si ya se puede leer el almacenamiento.
    const locked = montado ? isLockedOutNow() : null;

    /*
     * ⚠ SE LEE IGUAL QUE EL BLOQUEO: sin suscribirse y sólo una vez montado.
     * Nadie salta de versión con el arranque en pantalla —para eso habría que
     * teclear un comando, y debajo del arranque no se teclea— así que
     * suscribirse sólo serviría para repintar de más. Y leerlo antes de montar
     * daría un dibujo en el servidor y otro en el cliente.
     */
    const v02 = montado ? isV02() : false;

    // El dado se tira UNA vez por encendido. Sorteando en cada paso, cada tramo
    // duraría lo suyo y el arranque no tendría una duración, tendría varias.
    const guion = useMemo(
        () => (locked === null ? [] : bootScript(bootDuration(), locked, from, v02)),
        [locked, from, v02]
    );

    useEffect(() => {
        if (quieto) {
            avisar();
            return;
        }

        // Sin saber si hay bloqueo no se avanza: el guion todavía no existe.
        if (locked === null) return;

        const { phase, ms } = bootAt(guion, step);

        if (phase === 'done') {
            avisar();
            return;
        }

        const id = setTimeout(() => setStep((n) => n + 1), ms);
        return () => clearTimeout(id);
    }, [guion, locked, step, quieto, avisar]);

    /*
     * LA APP ENTRA DESVANECIÉNDOSE cuando esto acaba.
     *
     * Mientras esto vive, la app está a opacidad cero; al desmontarse, la
     * transición la trae. Aparecer de golpe después de un arranque de monitor
     * rompería justo lo que el arranque acaba de construir: lo que se enciende,
     * se enciende con una imagen que se asienta.
     */
    useEffect(() => {
        const raiz = document.documentElement;
        raiz.setAttribute('data-booting', '');

        return () => {
            raiz.removeAttribute('data-booting');
            raiz.removeAttribute('data-tube-off');
        };
    }, []);

    /*
     * CON EL TUBO APAGADO NO HAY BARRIDO.
     *
     * El barrido es el refresco del tubo, y un tubo apagado no refresca nada.
     * Dejar la línea cruzando mientras la imagen se cierra a un punto contaría
     * que la pantalla sigue encendida justo cuando se está apagando.
     */
    const apagandose = locked !== null && bootAt(guion, step).phase === 'off';

    useEffect(() => {
        const raiz = document.documentElement;

        if (apagandose) raiz.setAttribute('data-tube-off', '');
        else raiz.removeAttribute('data-tube-off');
    }, [apagandose]);

    // También en el propio render, antes del primer efecto: el arranque tiene que
    // tapar desde el PRIMER fotograma. Con sólo el efecto, había un instante en
    // el que la app ya estaba pintada debajo y se colaba.
    if (typeof document !== 'undefined' && !quieto) {
        document.documentElement.setAttribute('data-booting', '');
    }

    if (quieto) return null;

    // Mientras no se sepa, la pantalla está y tapa, pero no enseña nada.
    if (locked === null) return <div className="boot-screen" aria-hidden="true" />;

    const { phase } = bootAt(guion, step);
    if (phase === 'done') return null;

    return (
        <div className="boot-screen" aria-hidden="true">
            {/* RECARGAR ES APAGAR Y ENCENDER, así que lo primero que se ve es el
                equipo apagándose. Es el MISMO elemento del fallo crítico: una
                capa que se cierra sobre lo que haya debajo. */}
            {phase === 'off' && <div className="collapse-dying" />}

            {/* Y LA CORRIENTE VOLVIENDO, que es la misma figura al revés: un
                punto que se abre en línea y la línea en imagen. Comparte clase
                con la puerta del arranque, así que suena sola.

                ⚠ LA v0.2 ENCIENDE EL MISMO TUBO Y NO SUENA IGUAL, y por eso
                lleva su propia marca con el mismo dibujo. El cristal es el
                mismo —le cambiaron el programa, no el monitor— pero lo que se
                oye al darle corriente a una máquina más vieja no es un
                encendido limpio: es algo soltándose dentro de la caja. Ver
                `.v02-wake` en `screens.ts`. */}
            {phase === 'wake' && <div className={v02 ? 'v02-wake' : 'tube-on'} />}

            {phase === 'bars' && (
                <div className="boot-bars">
                    {/* Con CSS y no con caracteres: los bloques no están en la
                        monoespaciada de la casa y los pintaría una fuente de
                        reserva con otras métricas (REGLAS · C8). */}
                    {BOOT_BARS.map((c) => (
                        <span key={c} style={{ background: c }} />
                    ))}
                </div>
            )}

            {phase === 'logo' && (
                <div className="boot-logo">
                    <pre>{BOOT_LOGO.join('\n')}</pre>
                    <p className="boot-vendor">{BOOT_VENDOR}</p>
                </div>
            )}

            {phase === 'check' && (
                <pre className="boot-check">{bootCheckLines().join('\n')}</pre>
            )}

            {/*
                Y LO QUE ENSEÑA LA v0.2, que es la mitad y peor.

                ⚠ NO HAY CARTA DE AJUSTE, HAY ESTÁTICA. Una carta de ajuste es
                una señal que alguien EMITE para que la calibres; la estática es
                no tener nada enganchado. La 1.0 se presenta con la suya y su
                tono de 1 kHz. Ésta no tiene nada que emitir, y eso es lo que
                enseña.

                ⚠ Y NO HAY RÓTULO DEL FABRICANTE NI COMPROBACIÓN DE MEMORIA. No
                se le quitaron: no llegaron a escribirse. Nadie firmó esta
                versión —el rótulo de la 1.0 es la broma de que nadie firmó
                nunca nada— y una máquina que no sabe cuánta memoria tiene no la
                cuenta en voz alta.
            */}
            {phase === 'static' && <AsciiStatic className="v02-static mono" />}

            {/*
                La barra de 40 columnas, la MISMA que la v0.2 usa para cargar la
                lista: no se dibuja otra. Miente desde el primer número, pega
                saltos hacia atrás y se pasa de cien, que es lo que hace una
                barra cuyo total era una suposición.
            */}
            {phase === 'load' && <V02Bar className="v02-load" />}
        </div>
    );
}
