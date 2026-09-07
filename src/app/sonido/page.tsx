// src/app/sonido/page.tsx

import { notFound } from 'next/navigation';
import SoundLab from '@/components/system/SoundLab';

/**
 * EL BANCO DE PRUEBAS DEL SONIDO. No existe en producción.
 *
 * ⚠ POR QUÉ HACE FALTA UNA RUTA ENTERA PARA ESTO.
 *
 * El plan del sonido repite tres veces que las decisiones que quedan «se
 * resuelven escuchando»: cuál de las capas de la tecla falla, si la sala está
 * corta o larga, si el parlante ahoga el cuerpo, cuáles de los ocho huecos de
 * muestra hacen falta de verdad. Ninguna de esas preguntas se contesta leyendo
 * código ni mirando un test, y dentro de la app cada sonido llega mezclado con
 * otros diez y sólo cuando el juego quiere.
 *
 * Acá cada voz se dispara suelta, se repite, y sus capas se oyen por separado.
 *
 * Se corta con `notFound()` en producción y no con una variable de entorno
 * leída dentro del componente: así el segmento entero deja de renderizarse en
 * el servidor, en vez de enviar al navegador un componente que decide no
 * pintarse. La ruta existe en el build y devuelve 404, que es lo que se quiere.
 */
export default function Page() {
    if (process.env.NODE_ENV === 'production') notFound();

    return <SoundLab />;
}
