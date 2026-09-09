// src/components/effects/AsciiStatic.tsx
'use client';

import { useEffect, useRef } from 'react';
import { noiseFrame } from '@/lib/system/asciiNoise';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

/**
 * La estática de la casa: una rejilla de caracteres que no significan nada.
 *
 * ⚠ ESTO ESTABA ESCRITO DENTRO DEL COLAPSO Y AHORA LO USAN DOS. Cuando la v0.2
 * estrenó su arranque —que enseña estática donde la 1.0 enseña una carta de
 * ajuste— lo que hacía falta era exactamente este bloque: el mismo `<pre>`, el
 * mismo intervalo, el mismo cálculo de celdas. Copiarlo habría dejado dos
 * estáticas que se separan el día que alguien ajuste una (REGLAS · B5).
 *
 * ⚠ SE PINTA POR REF Y NO POR ESTADO, y ése es el motivo de que exista como
 * componente en vez de como hook. Un `setState` por fotograma repintaría el
 * árbol entero cada 83 ms, y esto puede estar a pantalla completa por encima de
 * la app.
 *
 * ⚠ Y NO ES RUIDO DE PÍXELES. Ver `asciiNoise`: el ruido de píxeles es la
 * estática de una TELEVISIÓN, y esto es una terminal. Una terminal no hace
 * estática, hace basura — la misma rejilla de celdas llena de glifos sueltos.
 */

/** 12 fps, no 60: una señal rota no titila suave. */
const NOISE_FPS = 12;

/** Tamaño de una celda de la rejilla de basura, en píxeles. */
const CELL_W = 8;
const CELL_H = 15;

interface Props {
    /**
     * Con qué clase se pinta.
     *
     * ⚠ CADA SITIO TRAE LA SUYA Y NO HAY UNA POR DEFECTO: la clase es también la
     * MARCA por la que el sonido reconoce la pantalla, así que una compartida
     * haría sonar al colapso como a un arranque de la v0.2.
     */
    className: string;
}

export default function AsciiStatic({ className }: Props) {
    const ref = useRef<HTMLPreElement>(null);
    const reducedMotion = usePrefersReducedMotion();

    useEffect(() => {
        const pre = ref.current;
        if (!pre) return;

        const cols = Math.ceil(window.innerWidth / CELL_W);
        const rows = Math.ceil(window.innerHeight / CELL_H);
        let frame = 0;

        const pintar = () => {
            pre.textContent = noiseFrame(cols, rows, frame);
            frame += 1;
        };

        pintar();

        /*
         * ⚠ CON MOVIMIENTO REDUCIDO SE PINTA UN FOTOGRAMA Y SE PARA, no se
         * devuelve una pantalla vacía. Quien pide menos movimiento pide no
         * marearse, no perderse lo que está pasando (REGLAS · A3): sin señal
         * sigue siendo sin señal, quieta.
         */
        if (reducedMotion) return;

        const id = setInterval(pintar, 1000 / NOISE_FPS);
        return () => clearInterval(id);
    }, [reducedMotion]);

    return <pre ref={ref} className={className} aria-hidden="true" />;
}
