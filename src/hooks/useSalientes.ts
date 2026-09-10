// src/hooks/useSalientes.ts
'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * LO QUE YA NO ESTÁ, para poder enseñarlo IRSE.
 *
 * ⚠ UNA FILA NO PUEDE ANIMAR SU SALIDA SI YA NO EXISTE. Cuando tirás una nota
 * —o la recuperás, o la borrás del todo— desaparece de los datos en el mismo
 * instante, así que React la desmonta y no queda nada que mover. Para enseñar
 * que se va hay que seguir pintándola un rato después de que deje de existir.
 *
 * Se guarda la lista anterior y se compara: lo que estaba y ya no, se devuelve
 * durante `ms` y después se suelta. Nada de esto toca los datos — son filas
 * fantasma, y quien las pinta tiene que pintarlas sin puntero, sin foco y
 * `aria-hidden`: para quien usa lector de pantalla esa nota ya no existe.
 *
 * ⚠ ESTO VIVE ACÁ Y NO EN CADA VISTA porque lo usan dos —el lateral y la
 * papelera— y era exactamente el mismo cuerpo de código en las dos. Dos copias
 * de un mecanismo se separan el día que alguien ajusta una (REGLAS · B5), y acá
 * la que se quedaría vieja es la que nadie está mirando.
 */
export function useSalientes<T extends { _id: string }>(items: T[], ms: number): T[] {
    const [saliendo, setSaliendo] = useState<T[]>([]);
    const anteriores = useRef<T[]>(items);

    useEffect(() => {
        const ahora = new Set(items.map((i) => i._id));
        const idas = anteriores.current.filter((i) => !ahora.has(i._id));
        anteriores.current = items;

        if (idas.length === 0) return;

        setSaliendo((previas) => [...previas, ...idas]);

        /*
         * ⚠ EL RELOJ TIENE QUE DURAR LO QUE LA ANIMACIÓN, ni más ni menos. Menos
         * la corta a media salida; más deja un hueco fantasma ocupando sitio en
         * una lista donde ya no hay nada, y eso se ve como un fallo de maquetado
         * en vez de como algo que se fue.
         */
        const id = setTimeout(() => {
            const idasIds = new Set(idas.map((i) => i._id));
            setSaliendo((previas) => previas.filter((i) => !idasIds.has(i._id)));
        }, ms);

        return () => clearTimeout(id);
    }, [items, ms]);

    return saliendo;
}

/**
 * Cuánto se sigue pintando una fila que ya no está.
 *
 * Es lo que dura `.row-pull` en `animations.css`, y por eso vive al lado de
 * quien la usa y no repartido por las vistas.
 */
export const SALIDA_MS = 180;
