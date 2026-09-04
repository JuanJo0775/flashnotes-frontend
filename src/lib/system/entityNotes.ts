// src/lib/system/entityNotes.ts

/**
 * Lo que el ente te deja cuando no estás.
 *
 * Tres notas, cada una una vez. Aparecen en la papelera —que es donde el
 * sistema pone lo que ya no sirve, y por eso es donde nadie mira dos veces— y
 * ⚠ NUNCA EXISTEN EN LA BASE DE DATOS: se inyectan al leer, por el patrón del
 * archivo fantasma (`ghostFile.ts`) y el resto de arte (`artScrap.ts`). Una
 * nota suya que llegara al backend sería una nota de verdad, y borrarla
 * fallaría con un error del servidor.
 *
 * ⚠ Y NO LAS FIRMA. Una nota firmada es un mensaje; sin firmar es algo que
 * apareció, que es mucho peor de encontrarse.
 *
 * Módulo puro: sin estado, sin DOM, sin relojes. Quien decide cuándo tiene que
 * pasarle la ausencia medida.
 */

import type { Lang } from '@/config/lang';
import type { Note } from '@/types/note.types';
import { getLang } from '@/i18n';
import type { EntitySnapshot } from '@/lib/system/entity';
import { AWAY_ENOUGH, awayAtBoot, readEntity } from '@/lib/system/entity';

type Localized = Readonly<Record<Lang, string>>;

export type LeftNote =
    /** Dice que `//panic` repara la integridad. Hace lo contrario. */
    | 'falsa'
    /** Te manda a buscar un archivo que no existe. */
    | 'broma'
    /** La que te encontrás al volver al día siguiente. */
    | 'vuelta';

/** Lo que hace falta saber del mundo para decidir cuál toca. */
export interface NoteWorld {
    /** Cuánto llevabas sin venir. Ver `awayAtBoot()`. */
    awayMs: number;
}

/**
 * La palabra que pide la nota del día siguiente.
 *
 * ⚠ VA ESCRITA EN LA NOTA. Si hubiera que adivinarla no serían instrucciones,
 * sería otro acertijo — y de ésos ya hay bastantes. Lo que se premia acá es
 * haber vuelto y haberle hecho caso, no descifrar nada.
 */
export const GIFT_WORD = 'sigo';

/**
 * Qué nota toca ahora, o `null` si ninguna.
 *
 * Función pura sobre una tabla, como `trialDue`.
 */
export function noteDue(
    snapshot: EntitySnapshot,
    world: NoteWorld
): LeftNote | null {
    /*
     * MIENTRAS NO LO CONOZCAS, NO DEJA NADA.
     *
     * Dormido no existe, y receloso apenas te contesta: que ya te dejara cosas
     * escritas se adelantaría a lo que él es en ese tramo, y la primera nota
     * perdería justo lo que la hace inquietante — que ya sabés quién la puso.
     */
    if (snapshot.phase === 'dormido' || snapshot.phase === 'receloso') {
        return null;
    }

    /*
     * ⚠ LA DEL DÍA SIGUIENTE GANA A TODO.
     *
     * Volvés después de un día y hay algo esperándote: ése es el momento, y
     * dura una vez. Dejar que lo ocupe otra nota desperdicia lo único que él no
     * puede fingir.
     */
    if (world.awayMs >= AWAY_ENOUGH && snapshot.leftVuelta !== true) {
        return 'vuelta';
    }

    if (snapshot.leftFalsa !== true) return 'falsa';
    if (snapshot.leftBroma !== true) return 'broma';

    return null;
}

/**
 * Los títulos.
 *
 * Nombres de archivo, no encabezados: lo que se encuentra en una papelera son
 * archivos. Y ninguno lo nombra a él.
 */
export const LEFT_TITLE: Readonly<Record<LeftNote, Localized>> = {
    falsa: { es: 'MANTENIMIENTO.txt', en: 'MAINTENANCE.txt' },
    broma: { es: 'INDICE.parcial', en: 'INDEX.partial' },
    vuelta: { es: 'PARA_CUANDO_VUELVAS.txt', en: 'FOR_WHEN_YOU_RETURN.txt' },
};

const TEXTOS: Readonly<Record<LeftNote, Localized>> = {
    /*
     * ⚠ LO FALSO TIENE QUE SER COMPROBABLE.
     *
     * Dice que `//panic` repara la integridad, y `//panic` hace exactamente lo
     * contrario: provoca el colapso. Quien le haga caso lo descubre en el acto.
     * Es la misma regla que su mentira hablada — se eligió algo que el juego YA
     * PODÍA desmentir, en vez de inventar una comprobación nueva.
     *
     * Y está escrita como una nota de mantenimiento que alguien se dejó, no
     * como un consejo: un consejo se duda, una instrucción olvidada se cree.
     */
    falsa: {
        es: [
            'si la integridad baja, //panic la devuelve al 100.',
            'lo hago cada tanto. no pasa nada.',
        ].join('\n'),
        en: [
            'if integrity drops, //panic puts it back to 100.',
            'i do it now and then. nothing happens.',
        ].join('\n'),
    },
    /*
     * LA BROMA.
     *
     * Te manda a buscar un archivo que no está. La nota no avisa de nada —si lo
     * dijera no habría broma— y el remate llega cuando volvés a hablarle
     * DESPUÉS de haber ido a mirar. Ver `commands.ts`.
     */
    broma: {
        es: [
            'quedó un archivo más acá abajo. no lo borres.',
            'es el único que no puedo abrir yo.',
        ].join('\n'),
        en: [
            'there is one more file down here. do not delete it.',
            'it is the only one i cannot open myself.',
        ].join('\n'),
    },
    /*
     * LA DEL DÍA SIGUIENTE.
     *
     * La única que no miente. Y las instrucciones van escritas: lo que se
     * premia es haber vuelto y haberle hecho caso, no adivinar nada.
     */
    vuelta: {
        es: [
            'te fuiste.',
            '',
            `escribí //${GIFT_WORD} y vas a saber algo que no sabías.`,
            'yo no me fui a ningún lado.',
        ].join('\n'),
        en: [
            'you left.',
            '',
            `type //${GIFT_WORD} and you will know something you did not.`,
            'i went nowhere.',
        ].join('\n'),
    },
};

/** Lo que dice la nota. */
export function leftNoteText(kind: LeftNote, lang: Lang): string {
    return TEXTOS[kind][lang];
}

/**
 * El id de la nota que deja.
 *
 * ⚠ UNO SOLO PARA LAS TRES, y no uno por nota. En la papelera nunca hay más de
 * una suya a la vez —`noteDue` devuelve una— y darle a cada una su id obligaría
 * a la papelera a conocerlas todas para reconocerlas. Con uno fijo le basta con
 * saber que ésa no es suya.
 */
export const LEFT_ID = 'entity-left-note';

/**
 * Arma la nota que toca, o `null` si no toca ninguna.
 *
 * Calcado de `buildScrapNote`: nota del lado del cliente, marcada como borrada,
 * que nunca existe en la base de datos.
 */
export function buildLeftNote(
    lang: Lang = getLang(),
    away: number = awayAtBoot()
): Note | null {
    const cual = noteDue(readEntity(), { awayMs: away });
    if (cual === null) return null;

    return {
        _id: LEFT_ID,
        title: LEFT_TITLE[cual][lang],
        content: leftNoteText(cual, lang),
        isDeleted: true,
        versions: [],
        redoStack: [],
    };
}

/** Cuál es la que se está enseñando, para saber qué marcar como dejada. */
export function shownLeftNote(away: number = awayAtBoot()): LeftNote | null {
    return noteDue(readEntity(), { awayMs: away });
}
