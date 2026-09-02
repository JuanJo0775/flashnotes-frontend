// src/components/layout/SystemLabel.tsx
'use client';

import { V02_LABEL } from '@/lib/system/v02';
import { useEffect, useState } from 'react';
import { useSystemState, registerLogoClick } from '@/hooks/useSystemState';
import { fireGlitch, severityForIntegrity } from '@/hooks/useGlitch';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

/**
 * El rótulo de la cabecera. Dos secretos viven en él.
 *
 * ARRANQUE EN VÍDEO INVERSO (§4). Una de cada doce cargas, el rótulo arranca
 * mal y se corrige solo en tres fotogramas duros. La cabecera YA es tinta con
 * texto inverso, así que el vídeo inverso es al revés de lo que uno supone: un
 * bloque de papel con letra de tinta. Sale de dos tokens que ya existen.
 *
 * Primero se arregla el orden y DESPUÉS el vídeo. Corregir las dos cosas a la
 * vez daría un solo parpadeo y el efecto se perdería; el fotograma intermedio es
 * lo que lo vuelve legible como "la máquina se dio cuenta".
 *
 * EL BOTÓN SECRETO (§5). Nueve clics rompen el sistema, con el contador
 * reiniciándose a los cuatro segundos de inactividad. No parece un botón y no
 * debe parecerlo: no es un <button>, no tiene tabindex y no entra en el orden
 * de tabulación. El nombre real de la app se queda siempre en `.sr-only`, así
 * que ni el texto corrupto ni los clics le quitan a nadie la información.
 */

const LABEL = '[FLASH-NOTES v1.0]';
const LABEL_PATCHED = '[FLASH-NOTES v1.0.1]';

/**
 * Las formas en que el rotulo puede salir mal.
 *
 * SE ELIGE UNA POR SESION, no una por arranque. La variante se sortea al cargar
 * la pagina y se queda: mientras no refresques, si el rotulo vuelve a fallar
 * falla IGUAL. Es lo que lo convierte en una propiedad de esta sesion —"hoy la
 * maquina arranca al reves"— en vez de en un sorteo suelto cada vez.
 */
export const LABEL_VARIANTS: readonly string[] = [
    // Invertido caracter a caracter: mantiene la silueta y los corchetes saltan
    // de lado, asi que se lee como "algo esta mal" sin volverse un jeroglifico.
    [...LABEL].reverse().join(''),
    // Boca abajo. Es la mas agresiva de las tres y la que mas parece una
    // pantalla montada del reves.
    '[0\u02D91\u028C S\u018E\uA4F1ON-HS\u2C60\uA4F6\u2132]',
    // Con la mitad de los caracteres caidos a su bloque: la memoria de video
    // perdio la mitad del mapa de la fuente.
    '[FL\u2588SH-N\u2588TES \u25881.\u25880]',
    // Corrida una celda: el buffer arranco desalineado.
    ']FLASH-NOTES v1.0[',
    // Los caracteres estan, el orden de las palabras no.
    '[v1.0 FLASH-NOTES]',
];

/** Una de cada N cargas arranca mal. */
const REVERSE_BOOT_ODDS = 12;

/** Los tres fotogramas del arranque roto. */
const FIX_ORDER_MS = 380;
const FIX_VIDEO_MS = 560;

/** Cuánto dura el parpadeo de la versión en el tercer clic. */
const FLICKER_MS = 90;

type BootPhase = 'reversed' | 'inverted' | 'normal';

interface SystemLabelProps {
    onCollapse: () => void;
}

export default function SystemLabel({ onCollapse }: SystemLabelProps) {
    const reducedMotion = usePrefersReducedMotion();

    // EL PRIMER RENDER ES SIEMPRE EL NORMAL, y no es un detalle.
    //
    // Sorteando en el inicializador del estado, el servidor pinta el rótulo bien
    // y el cliente —si le toca el 1 de 12— lo pinta invertido: React detecta el
    // desajuste de hidratación y REGENERA EL ÁRBOL ENTERO en cada carga con
    // suerte. Es la misma trampa que documenta DISENO.md para la fecha de la
    // cabecera, y sólo se ve corriendo la app: en los tests, donde no hay render
    // de servidor, no aparece nunca.
    //
    // El dado se tira después de montar, en un temporizador a 0 ms. Además de
    // arreglar la hidratación queda mejor: el rótulo se rompe un fotograma
    // DESPUÉS de aparecer, que es como se rompe una señal de verdad.
    const [phase, setPhase] = useState<BootPhase>('normal');
    const [flickering, setFlickering] = useState(false);

    // La variante de ESTA sesion. Se sortea una vez y no cambia hasta que
    // refresques: si el rotulo vuelve a fallar, falla igual.
    const [variant] = useState(
        () => LABEL_VARIANTS[Math.floor(Math.random() * LABEL_VARIANTS.length)]
    );

    useEffect(() => {
        // Con movimiento reducido no ocurre en absoluto: no se degrada a una
        // versión quieta, porque un rótulo mal escrito sin corrección visible
        // sería sencillamente un error.
        if (reducedMotion) return;

        const timers: ReturnType<typeof setTimeout>[] = [];

        timers.push(
            setTimeout(() => {
                if (Math.random() >= 1 / REVERSE_BOOT_ODDS) return;

                setPhase('reversed');
                timers.push(setTimeout(() => setPhase('inverted'), FIX_ORDER_MS));
                timers.push(setTimeout(() => setPhase('normal'), FIX_VIDEO_MS));
            }, 0)
        );

        return () => timers.forEach(clearTimeout);
    }, [reducedMotion]);

    useEffect(() => {
        if (!flickering) return;
        const id = setTimeout(() => setFlickering(false), FLICKER_MS);
        return () => clearTimeout(id);
    }, [flickering]);

    const { v02 } = useSystemState();

    const handleClick = () => {
        const outcome = registerLogoClick();

        switch (outcome.kind) {
            case 'version-flicker':
                // La única invitación que da esta pieza. Sin ella, un curioso
                // que toca el logo dos veces y para no se entera de que hay algo.
                setFlickering(true);
                break;
            case 'integrity':
                // El nivel se fuerza según la integridad a la que acaba de
                // quedar, en vez de sortearlo: con el sorteo, el clic 7 —el que
                // más se nota— salía flojo siete de cada diez veces.
                fireGlitch(Math.random, severityForIntegrity(outcome.value));
                break;
            case 'collapse':
                onCollapse();
                break;
            default:
                break;
        }
    };

    const visible =
        // En la v0.2 el rótulo dice la versión que es. No es un adorno: es lo
        // primero que mira alguien que sospecha que la app cambió, y verlo
        // confirma que no se lo imaginó.
        v02
            ? `[${V02_LABEL}]`
            : phase === 'reversed'
              ? variant
              : flickering
                ? LABEL_PATCHED
                : LABEL;

    return (
        <span className="system-label" onClick={handleClick}>
            <span
                aria-hidden="true"
                className={`pixel${phase !== 'normal' ? ' reverse-video' : ''}`}
            >
                {visible}
            </span>
            <span className="sr-only">{v02 ? V02_LABEL : LABEL}</span>
        </span>
    );
}
