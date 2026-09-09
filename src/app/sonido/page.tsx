// src/app/sonido/page.tsx

import { redirect } from 'next/navigation';

/**
 * El banco empezó siendo sólo de sonido y creció hasta cubrir también los
 * efectos visuales, así que vive en `/banco`.
 *
 * Esta ruta se queda porque la dirección vieja está en manos de gente y en
 * notas de sesión: un 404 ahí se leería como «lo quitaron», que es justo la
 * confusión que ya costó una vuelta con los efectos apagados.
 */
export default function Page() {
    redirect('/banco');
}
