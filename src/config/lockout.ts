// src/config/lockout.ts

/**
 * Lo que hace falta saber del bloqueo ANTES del primer pintado.
 *
 * El bloqueo es lo único de la app que sobrevive a recargar, y se lee en un
 * efecto para no romper la hidratación: el servidor no tiene `localStorage`, así
 * que si se leyera al pintar, el servidor diría «sano» y el cliente «bloqueado»
 * y React tiraría el árbol entero.
 *
 * Pero leerlo después de montar tiene su propio precio: durante un fotograma se
 * pinta la app NORMAL, y al recargar en pleno fallo crítico se veía la pantalla
 * de inicio un segundo antes de volver al error. Recargar parecía funcionar, que
 * es justo lo que este estado niega.
 *
 * La solución es el mismo patrón que ya usan el tema y el idioma: un script en
 * línea y síncrono que marca `<html>` antes de pintar. React sigue hidratando lo
 * mismo que el servidor —el atributo lo pone el navegador, no el árbol— y el CSS
 * tapa la app hasta que la capa de bloqueo se monta de verdad.
 */

export const LOCKOUT_STORAGE_KEY = 'flashnotes:lockout';

/** Mientras esté puesto, el CSS tapa la app. Lo quita la propia capa al montar. */
export const LOCKOUT_BOOT_ATTR = 'data-booting-locked';

export const LOCKOUT_BOOT_SCRIPT = `(function(){try{var r=localStorage.getItem(${JSON.stringify(
    LOCKOUT_STORAGE_KEY
)});if(!r)return;var v=JSON.parse(r);var u=typeof v==="number"?v:(v&&v.until);if(typeof u==="number"&&u>Date.now()){document.documentElement.setAttribute(${JSON.stringify(
    LOCKOUT_BOOT_ATTR
)},"1")}}catch(e){}})()`;
