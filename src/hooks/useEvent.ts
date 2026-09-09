// src/hooks/useEvent.ts
'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * Una función que NO cambia de identidad, aunque el padre la vuelva a crear.
 *
 * ⚠ ESTO EXISTE POR UN FALLO QUE APARECIÓ CUATRO VECES, y la cuarta ya no era
 * mala suerte. Se reportó jugando dos veces seguidas: «la barra que sube de
 * reiniciar se queda pegada» y «la animación de reiniciar queda congelada en
 * algunos momentos».
 *
 * El patrón es siempre el mismo. Un componente arma un temporizador en un efecto
 * y pone `onDone` en las dependencias, que es lo que el linter pide. El padre le
 * pasa una función nueva en cada render —una flecha escrita en el JSX, que es lo
 * normal— y la página repinta sola, por lo menos una vez por segundo, porque hay
 * un reloj en la barra de estado.
 *
 * Resultado: cada repintado desarma el temporizador y lo vuelve a armar desde
 * cero. Un tramo que dure MÁS que el intervalo de repintado no termina NUNCA.
 *
 * Por eso pasaba «a veces»: el arranque sortea su duración, y sólo se congelaba
 * cuando el tramo salía más largo que un segundo. Un arranque largo reparte
 * cuatro segundos al rótulo — ése no llegaba jamás.
 *
 * ⚠ Y NO SE ARREGLA MEMOIZANDO EN EL PADRE. Se puede, y funciona hasta que
 * alguien escriba la siguiente flecha en el JSX: el componente quedaría a merced
 * de cómo lo llamen. Un componente que se rompe según quién lo use está roto él.
 * Acá la identidad se fija DENTRO, donde importa.
 *
 * Lo llama todo lo que avisa cuando termina: el arranque, el barrido, el
 * colapso, las respuestas de comando.
 */
export function useEvent<A extends unknown[]>(fn: (...args: A) => void): (...args: A) => void {
    const ultima = useRef(fn);

    /*
     * Se sincroniza en un EFECTO y no al pintar: escribir un ref durante el
     * render está prohibido, y con razón — el render tiene que poder repetirse
     * sin dejar rastro.
     */
    useEffect(() => {
        ultima.current = fn;
    }, [fn]);

    // Esta sí es estable para siempre, que es todo el punto.
    return useCallback((...args: A) => ultima.current(...args), []);
}
