// src/components/layout/PowerButton.tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useT } from '@/i18n';

/**
 * EL BOTÓN DE ENCENDIDO. Hay que MANTENERLO, como en una máquina de verdad.
 *
 * ⚠ NO ES UN CLIC, Y ÉSA ES LA DECISIÓN. Un toque suelto costaría el ciclo
 * entero —ocho segundos de apagado y arranque, sin forma de cancelar— y está
 * pegado a la barra de estado, o sea al alcance de cualquier roce. Ninguna
 * máquina se reinicia de un roce: hay que apretar y sostener.
 *
 * Y sale gratis en el idioma del producto. Lo que en una interfaz normal sería
 * un diálogo de confirmación —«¿seguro?»— acá es el gesto físico que ya existe,
 * sin preguntarle nada a nadie.
 *
 * ⚠ ES UN `nav-tab`, COMO LOS MANDOS DE ARRIBA. Tuvo un estilo propio y se
 * reportó al verlo: un control que se comporta como los demás y se pinta
 * distinto obliga a aprenderlo dos veces. El relleno usa los MISMOS colores con
 * los que esta app dice «esto está activo»: fondo invertido y tinta al revés.
 *
 * ⚠ CON TECLADO SE ACTIVA DIRECTO, y no es una excepción a la regla. Sostener
 * una tecla no es un gesto que un lector de pantalla pueda anunciar ni que todo
 * el mundo pueda hacer, y la intención ya está probada de otra forma: llegar
 * hasta acá con el tabulador es deliberado, mientras que rozarlo con el ratón no.
 * La protección es contra el accidente, y por teclado no hay accidente.
 */

/** Cuánto hay que sostenerlo. */
export const HOLD_MS = 800;

/**
 * Cuánto tarda en vaciarse al soltar.
 *
 * Más rápido que llenarse a propósito: llenar cuesta —es lo que se te está
 * pidiendo— y vaciarse no cuesta nada.
 */
export const RELEASE_MS = 240;

/**
 * Cada cuánto avanza la cuenta.
 *
 * ⚠ VA A PASOS Y NO CON UNA TRANSICIÓN DE CSS, y no es una preferencia: la
 * transición NO CORRÍA. Se midió en el navegador —con el movimiento reducido
 * apagado y en un elemento aislado— y `clip-path` se quedaba clavado en el valor
 * inicial, así que el botón se sostenía y no se veía nada. Se reportó tal cual:
 * «no se ve la animación de que el botón se va oprimiendo».
 *
 * A pasos no puede fallar, y encima es más de la casa: un terminal llena de a
 * bloques, no con suavizado. Es el mismo idioma que la barra de tamaño de la
 * nota, que también avanza a saltos.
 *
 * Y hay un premio: el dibujo y la cuenta salen del MISMO contador, así que no
 * pueden desincronizarse. Antes eran dos números —uno en TypeScript y otro en
 * CSS— y hacía falta un test para atarlos.
 */
const PASO_MS = 40;

export default function PowerButton({ onReboot }: { onReboot: () => void }) {
    const t = useT();

    /**
     * Milisegundos sostenidos. Manda el dibujo Y el disparo: un solo contador.
     *
     * ⚠ EN MILISEGUNDOS ENTEROS Y NO EN UNA FRACCIÓN DE 0 A 1. Sumando 1/20
     * veinte veces no se llega a 1 exacto —los flotantes no cierran— y el
     * reinicio se quedaba esperando un paso de más. Contando lo que de verdad se
     * cuenta, el tope se alcanza cuando tiene que alcanzarse.
     */
    const [sostenido, setSostenido] = useState(0);

    const sosteniendo = useRef(false);
    const reloj = useRef<ReturnType<typeof setInterval> | null>(null);
    /*
     * ⚠ EL REINICIO SE GUARDA EN UN REF Y SE SINCRONIZA EN UN EFECTO, no al
     * pintar: escribir un ref durante el render está prohibido y con razón —el
     * render tiene que poder repetirse sin dejar rastro.
     *
     * El ref existe para que el contador no dependa de la función: si el
     * intervalo se recreara cada vez que el padre pinta, la cuenta se reiniciaría
     * sola y sostener no llegaría nunca al final.
     */
    const reiniciar = useRef(onReboot);

    useEffect(() => {
        reiniciar.current = onReboot;
    }, [onReboot]);

    const parar = useCallback(() => {
        if (reloj.current) clearInterval(reloj.current);
        reloj.current = null;
    }, []);

    /** Arranca el contador, que sube mientras se sostiene y baja al soltar. */
    const correr = useCallback(() => {
        parar();

        reloj.current = setInterval(() => {
            setSostenido((antes) => {
                if (sosteniendo.current) {
                    const ahora = antes + PASO_MS;

                    if (ahora < HOLD_MS) return ahora;

                    // Llegó arriba: se suelta solo y se reinicia.
                    sosteniendo.current = false;
                    parar();
                    reiniciar.current();
                    return 0;
                }

                // Al bajar recorre lo mismo en menos tiempo, así que cada paso
                // se lleva más por delante.
                const ahora = antes - PASO_MS * (HOLD_MS / RELEASE_MS);

                if (ahora > 0) return ahora;

                parar();
                return 0;
            });
        }, PASO_MS);
    }, [parar]);

    const apretar = useCallback(() => {
        sosteniendo.current = true;
        correr();
    }, [correr]);

    const soltar = useCallback(() => {
        if (!sosteniendo.current) return;

        // No se corta de golpe: se deja BAJAR, que es lo que hace un depósito
        // que deja de llenarse.
        sosteniendo.current = false;
        correr();
    }, [correr]);

    // Soltar el ratón FUERA del botón también suelta: si no, arrastrar el
    // puntero a otro sitio dejaría la cuenta corriendo y la máquina se
    // reiniciaría sola un rato después.
    useEffect(() => {
        window.addEventListener('pointerup', soltar);
        window.addEventListener('pointercancel', soltar);

        return () => {
            window.removeEventListener('pointerup', soltar);
            window.removeEventListener('pointercancel', soltar);
        };
    }, [soltar]);

    // Y si el botón se va a mitad de la cuenta —el arranque lo tapa todo— el
    // contador se va con él.
    useEffect(() => () => parar(), [parar]);

    /*
     * ⚠ TEXTO Y NO UN SÍMBOLO, Y ESTO SE MIDIÓ. Acá había un `⏻` (U+23FB, POWER
     * SYMBOL) y el botón salía VACÍO: JetBrains Mono no lo trae. Medido en el
     * navegador, ese carácter ocupaba 14 px mientras los glifos de verdad ocupan
     * 8,4 — o sea que caía al sustituto y se pintaba en blanco. Nada fallaba;
     * simplemente no había botón.
     *
     * No es mala suerte de un carácter suelto: esta app se escribe entera en una
     * monoespaciada y en ASCII, y un símbolo bonito fuera de esa reja es una
     * apuesta a que la fuente lo tenga. Hay un test que lo exige.
     */
    const rotulo = t('power.label');

    return (
        <button
            type="button"
            className="nav-tab power-button"
            /*
             * ⚠ SIN `aria-label`: el texto visible YA es el nombre del botón, y
             * ponerle uno encima lo taparía — quien lo oye y quien lo lee
             * dejarían de estar hablando de lo mismo. El gesto va en `title`,
             * que es una descripción y no un nombre.
             */
            title={t('power.hint')}
            onPointerDown={apretar}
            onPointerLeave={soltar}
            /*
             * ⚠ EL CLIC NO HACE NADA A PROPÓSITO. El puntero ya se atiende por
             * `pointerdown`/`pointerup`; dejar además un `onClick` lo dispararía
             * al soltar aunque no se hubiera sostenido, que es exactamente el
             * accidente que este botón evita.
             */
            onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;

                // Sin repetición: mantener la tecla no vale por diez reinicios.
                if (e.repeat) return;

                e.preventDefault();
                onReboot();
            }}
        >
            {rotulo}

            {/*
                LA CUENTA, en la misma cara y con los colores del «activo».

                ⚠ SON DOS COPIAS DEL RÓTULO, UNA ENCIMA DE OTRA, y es lo que hace
                que se lea. La de arriba se destapa desde abajo: donde la carga
                ya llegó, el texto está invertido; donde no, sigue como estaba.
                Un velo por encima habría tapado las letras justo cuando hay que
                mirarlas.

                ⚠ Y EL RECORTE VA EN LÍNEA, calculado acá. Nació como una
                transición de CSS y no corría: se midió y `clip-path` se quedaba
                clavado en el valor inicial. Puesto a pasos desde el mismo
                contador que dispara el reinicio, el dibujo no puede mentir sobre
                cuánto falta.
            */}
            <span
                className="power-fill"
                aria-hidden="true"
                style={{ clipPath: `inset(${100 - (sostenido / HOLD_MS) * 100}% 0% 0% 0%)` }}
            >
                {rotulo}
            </span>
        </button>
    );
}
