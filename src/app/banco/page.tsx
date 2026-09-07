// src/app/banco/page.tsx

import { notFound } from 'next/navigation';
import Banco from '@/components/system/Banco';

/**
 * EL BANCO DEL SISTEMA. No existe en producción.
 *
 * Se corta con `notFound()` en el Server Component y no con una variable leída
 * dentro del componente: así el segmento entero deja de renderizarse en el
 * servidor, en vez de mandar al navegador un componente que decide no pintarse.
 *
 * ⚠ Y el motivo de cortarlo no es el peso. Este catálogo enseña de golpe el
 * repertorio COMPLETO de averías, y la mitad de ellas son cosas que hay que
 * ganarse jugando. Publicarlo sería repartir las respuestas.
 */
export default function Page() {
    if (process.env.NODE_ENV === 'production') notFound();

    return <Banco />;
}
