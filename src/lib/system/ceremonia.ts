// src/lib/system/ceremonia.ts

/**
 * EL MOMENTO DE LA DIECISÉIS: cuándo empieza, cuánto dura y cuándo cae el acuse.
 *
 * ⚠ POR QUÉ ESTOS TRES NÚMEROS VIVEN SOLOS Y NO EN QUIEN LOS USA. La ceremonia
 * la reparten dos módulos que no se conocen: el sonido —que calla la sala y
 * suelta el acuse dentro del hueco— y la imagen —que baja el nivel y cruza el
 * barrido una vez—. Son la MISMA cosa vista por dos sentidos, y si cada uno se
 * escribe sus milisegundos, el día que alguien ajuste uno, el otro se queda
 * corto o largo: la línea seguiría bajando con la sala ya encendida, o el acuse
 * caería sobre una pantalla que ya volvió. Nadie lo notaría leyendo el código —
 * son dos ficheros lejanos— y se notaría muchísimo jugando.
 *
 * Es la regla de la casa (REGLAS · B5): no se copia, se comparte.
 */

/**
 * Lo que se espera antes de empezar.
 *
 * ⚠ NO ES CERO, Y ESO ES LA MITAD DEL EFECTO. Primero suena el cajón —la pieza
 * entrando, igual que las quince anteriores— y sólo DESPUÉS pasa lo raro. Sin
 * esa pausa, la última se anuncia antes de haber llegado y se lee como un
 * premio; con ella, se lee como que la máquina tardó un momento en darse cuenta.
 */
export const CEREMONIA_ESPERA_MS = 360;

/**
 * Y lo que dura el hueco: sala callada y nivel bajo.
 *
 * Segundo y medio. Menos es un parpadeo —se confunde con un fallo, y de fallos
 * esta app va sobrada—; más y quien está jugando cree que algo se rompió.
 */
export const CEREMONIA_MS = 1_500;

/**
 * Cuándo cae el acuse, contado desde que llegó la pieza.
 *
 * ⚠ VA DENTRO DEL HUECO, ni antes ni después: empieza a los 360 y dura hasta
 * los 1860, así que a los 760 la sala está en su punto más callado y la línea a
 * un cuarto de camino. Un acuse sobre el silencio es una confidencia; el mismo
 * acuse sobre el cuarto encendido es una notificación.
 */
export const CEREMONIA_ACUSE_MS = 760;
