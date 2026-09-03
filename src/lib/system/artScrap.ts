// src/lib/system/artScrap.ts

/**
 * Lo que el sistema archivó mal.
 *
 * Ganás una pieza y en la papelera aparece un resto de lo que recuperó, comido.
 * No es una nota tuya: es la máquina guardando algo que encontró, en el único
 * sitio donde guarda lo que ya no sirve.
 *
 * ⚠ POR QUÉ EXISTE. Sin esto, ganar una pieza te dejaba un premio en la mano y
 * ninguna indicación de dónde mirarlo: el aviso no dice el nombre —a propósito— y
 * `//art` sólo se descubría por la fuga de `//help`, que es azar. Se podían juntar
 * cinco piezas sin enterarse nunca de que había una colección.
 *
 * Entre la basura del resto están las letras de `//art`, PARTIDAS. Ver el
 * comando entero sería un cartel; hay que juntar los trozos, y hasta que los
 * juntás no sabés si es un comando o ruido. Ver `artCorruption.ts`.
 *
 * ⚠ Y SE VA SOLO cuando tecleás `//art`. Es una pista, no un mueble: quedarse
 * después de haber servido lo convertiría en basura de verdad.
 *
 * Sigue el patrón del archivo fantasma (`ghostFile.ts`): una nota que se inyecta
 * en la papelera del lado del cliente y que NUNCA existe en la base de datos.
 */

import type { Note } from '@/types/note.types';
import type { Lang } from '@/config/lang';
import { getLang } from '@/i18n';
import { corruptArt } from '@/lib/system/artCorruption';
import { ART, readFound, readRevealed } from '@/lib/system/asciiArt';

export const SCRAP_ID = 'art-scrap-recovered';

/**
 * El nombre del archivo, EN EL IDIOMA EN QUE ESTÁS LEYENDO.
 *
 * ⚠ ESTABA SIN TRADUCIR, copiando a `SYSTEM.LOG`, y ahí el razonamiento falló:
 * `SYSTEM.LOG` se deja igual porque es un nombre técnico que se reconoce en
 * cualquier idioma, mientras que `RECUPERADO` es una palabra española suelta en
 * una interfaz en inglés. Se leía como un descuido de traducción, que es
 * exactamente lo contrario de lo que tiene que parecer.
 *
 * La extensión `.bin` sí se queda: dice que lo de dentro no es texto, que es
 * justo lo que parece al abrirlo.
 */
export const SCRAP_TITLE: Readonly<Record<Lang, string>> = {
    es: 'RECUPERADO.bin',
    en: 'RECOVERED.bin',
};

const CABECERA: Readonly<Record<Lang, string>> = {
    es: '-- BLOQUE RECUPERADO. INTEGRIDAD PARCIAL.',
    en: '-- RECOVERED BLOCK. PARTIAL INTEGRITY.',
};

const PIE: Readonly<Record<Lang, string>> = {
    es: '-- FIN DEL BLOQUE. NO SE PUDO IDENTIFICAR LA FUENTE.',
    en: '-- END OF BLOCK. SOURCE COULD NOT BE IDENTIFIED.',
};

/**
 * ¿Hay un resto que enseñar?
 *
 * Sólo mientras tengas piezas ganadas y NO hayas mirado el catálogo. En cuanto
 * tecleás `//art` deja de aparecer: ya cumplió.
 */
export function shouldScrap(): boolean {
    return readFound().size > 0 && readRevealed().size === 0;
}

/**
 * La pieza cuyo resto se enseña: la PRIMERA que ganaste, por orden del catálogo.
 *
 * Que sea siempre la misma importa. Si rotara, quien vuelva a la papelera vería
 * otro dibujo y leería que hay varios restos —o que el sistema está peor de lo
 * que está—, cuando lo que hay es uno solo mal archivado.
 */
export function scrapPiece() {
    const tengo = readFound();
    return ART.find((p) => tengo.has(p.id)) ?? null;
}

/** Arma la nota con el resto dentro, o `null` si no hay nada que enseñar. */
export function buildScrapNote(lang: Lang = getLang()): Note | null {
    const pieza = scrapPiece();
    if (pieza === null) return null;

    return {
        _id: SCRAP_ID,
        title: SCRAP_TITLE[lang],
        content: [
            CABECERA[lang],
            '',
            corruptArt(pieza.art, pieza.id),
            '',
            PIE[lang],
        ].join('\n'),
        isDeleted: true,
        versions: [],
        redoStack: [],
    };
}
