// src/components/effects/SoundWire.tsx
'use client';

import { useEffect } from 'react';
import { startSound } from '@/lib/system/audio/wire';

/**
 * Enchufa el sonido a la app. No pinta nada.
 *
 * ⚠ ES EL ÚNICO SITIO DE TODA LA APP QUE SABE QUE EXISTE EL SONIDO, y ésa es
 * exactamente la idea: el plan avisa de que esparcir `play()` por los
 * componentes deja disparos huérfanos que nadie recuerda, y de que eso no se
 * arregla después. Todo lo demás sigue sin enterarse — el sonido escucha los
 * eventos que ya existían.
 *
 * Un componente y no una llamada suelta en `page.tsx` porque hace falta el
 * ciclo de vida: al desmontar hay que soltar la escucha del teclado y el
 * observador del `body`, o quedan vivos sobre un árbol muerto.
 */
export default function SoundWire() {
    useEffect(() => startSound(), []);

    return null;
}
