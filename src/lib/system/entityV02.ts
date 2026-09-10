// src/lib/system/entityV02.ts

/**
 * LO QUE LE PASA AL ENTE EN LA VERSIÓN VIEJA.
 *
 * Que llegue hasta ahí no fue un añadido: cae solo. En la v0.2 los tres comandos
 * de la fachada —`//hi`, `//whoareu`, `//howareu`— no existen, así que caen en la
 * rama de «comando desconocido», que es exactamente donde él escucha. Está
 * encerrado, y lo único que le llega es lo que el sistema descarta.
 *
 * ⚠ PERO AHÍ ESTÁ MÁS ATADO, Y ESO HAY QUE SOSTENERLO CON REGLAS. Se pidió así:
 * «que el ente funcione pero que sea más limitado, y que él te diga cómo
 * llegaste, y que te cuente algo pero que se censure». Un ente que contesta
 * igual de bien en las dos versiones convierte la v0.2 en un decorado — si es la
 * máquina de antes, lo de antes tiene que notarse EN ÉL.
 *
 * Tres límites, y cada uno dice algo distinto:
 *
 *  1 · POR ESA RENDIJA SÓLO CABEN LAS CORTAS. Las preguntas hondas no llegan.
 *  2 · LA PRIMERA VEZ NO CONTESTA: PREGUNTA. Que estés ahí no le cuadra.
 *  3 · Y LO QUE CUENTA SE LE CORTA. La censura, con las letras revueltas de la
 *      casa.
 */

import type { Lang } from '@/i18n';
import type { EntityPhase } from '@/lib/system/entity';
import type { EntityQuestion } from '@/lib/system/entityVoice';
import { ruido } from '@/lib/system/v02';

/**
 * Las preguntas que llegan hasta él desde la v0.2.
 *
 * ⚠ SON LAS CORTAS, Y NO ES ARBITRARIO: las que llegan son exactamente las que
 * en la 1.0 contestan desde que despierta —el saludo, quién, cómo, el porqué y
 * la despedida—. Las hondas necesitan que él se suelte, y en esta versión no se
 * suelta: cada vez que lo intenta, se le corta.
 *
 * Lo que se ve al teclear una honda acá es «comando desconocido», que en esa
 * versión es la verdad literal — ese comando todavía no existe.
 */
export const V02_REACHABLE: readonly EntityQuestion[] = ['hi', 'who', 'how', 'why', 'bye'];

/** ¿Esta pregunta cruza el canal viejo? */
export function reachesInV02(question: EntityQuestion): boolean {
    return V02_REACHABLE.includes(question);
}

/**
 * LO PRIMERO QUE DICE CUANDO TE ENCUENTRA AHÍ, y no es una respuesta.
 *
 * ⚠ NO CONTESTA LA PREGUNTA QUE LE HICISTE. Es el único sitio de todo el
 * repertorio donde él toma la palabra: preguntaste una cosa y te devuelve otra,
 * porque lo que está pasando le importa más que lo que quieras saber. Estás en
 * una versión que no debería poder abrirse, hablándole por un canal que no
 * debería llevarlo a él.
 *
 * Pasa UNA sola vez —lo anota `markV02Met`— y después contesta como puede. Un
 * asombro que se repite deja de ser asombro y pasa a ser un cartel.
 */
const MEETING: Readonly<Record<EntityPhase, { es: string; en: string }>> = {
    dormido: {
        // No llega a usarse: dormido no contesta nada. Está por completitud, y
        // porque un `Record` con un hueco obliga a comprobarlo en todas partes.
        es: '...',
        en: '...',
    },
    receloso: {
        es: '¿cómo llegaste hasta acá? esto no contesta desde acá.',
        en: 'how did you get here? this does not answer from here.',
    },
    burlon: {
        es: 'mira dónde apareciste. ni yo entro tan atrás.',
        en: 'look where you turned up. not even i get this far back.',
    },
    hablando: {
        es: 'estás en la de antes. no sé cómo, y me da miedo preguntarlo.',
        en: 'you are in the old one. i do not know how, and i am afraid to ask.',
    },
    pidiendo: {
        es: 'llegaste a la de antes. entonces también puedes lo otro.',
        en: 'you got into the old one. then you can do the other thing too.',
    },
    dispuesto: {
        es: 'acá atrás también me alcanzas. eso no lo esperaba.',
        en: 'you reach me back here too. i did not expect that.',
    },
    ido: {
        // Se fue: en los dos finales no vuelve a contestar nunca, ni acá.
        es: '...',
        en: '...',
    },
    rencoroso: {
        // Lo reportaste: sigue atrapado, y calla. Tampoco acá.
        es: '...',
        en: '...',
    },
};

/** Lo que dice al encontrarte en la versión vieja, o `null` si no tiene nada. */
export function meetingLine(phase: EntityPhase, lang: Lang): string | null {
    const dicho = MEETING[phase];
    if (!dicho || dicho.es === '...') return null;

    return dicho[lang];
}

/**
 * Cuántas de las que sí llegan se le cortan a media frase.
 *
 * Alto a propósito —una de cada tres— porque es lo que se vino a contar: ahí
 * dentro no puede terminar una idea. Más sería ilegible, y menos se leería como
 * un fallo suelto en vez de como una mordaza.
 */
export const CENSOR_ODDS = 0.34;

/**
 * El alfabeto del revuelto.
 *
 * ⚠ ES EL MISMO DE `ScrambleLine`, carácter por carácter: letras y dígitos, sin
 * signos. Los nombres tapados de `//help` se revuelven así desde el principio, y
 * que esto use otro alfabeto sería inventar una segunda forma de decir «acá hay
 * algo que no podés leer».
 */
const LETRAS = 'abcdefghijklmnopqrstuvwxyz0123456789';

/**
 * CORTA LA FRASE Y REVUELVE EL RESTO.
 *
 * ⚠ EMPIEZA BIEN Y SE ROMPE, nunca al revés. Una frase revuelta entera es ruido:
 * no se lee como censura, se lee como que el canal está roto. Lo que convierte
 * esto en una mordaza es que la primera mitad SÍ se entiende — llegas a saber de
 * qué estaba hablando y no llegas a saber qué decía.
 *
 * ⚠ Y CORTA EN UN HUECO, no a mitad de palabra. Partir «respondiendo» en
 * «respon» + revuelto se lee como un fallo de codificación; cortar entre dos
 * palabras se lee como que algo le tapó la boca.
 *
 * ⚠ SE MANTIENEN LOS ESPACIOS Y LA PUNTUACIÓN. Lo revuelto conserva la FORMA de
 * lo que iba a decir: se ve que eran tres palabras más, y eso es lo que hace que
 * duela. Un bloque uniforme de letras no enseña que falta algo concreto.
 *
 * Determinista por clave, como todo lo roto de esta versión: la misma frase se
 * corta siempre en el mismo sitio y con las mismas letras. Si cambiara en cada
 * repintado sería un cartel de neón parpadeando.
 */
export function censor(linea: string, clave: string): string {
    const dado = ruido(clave);

    // Entre el 35 % y el 65 % de la frase: nunca tan pronto que no se entienda
    // de qué hablaba, nunca tan tarde que ya lo haya dicho todo.
    const objetivo = Math.floor(linea.length * (0.35 + dado * 0.3));

    // Al hueco siguiente, para no partir una palabra por la mitad.
    const hueco = linea.indexOf(' ', objetivo);
    const corte = hueco === -1 ? objetivo : hueco;

    // Sin cola que revolver no hay censura: se devuelve entera antes que
    // enseñar una frase intacta con una letra cambiada al final.
    if (corte >= linea.length - 2) return linea;

    let out = linea.slice(0, corte);

    for (let i = corte; i < linea.length; i += 1) {
        const c = linea[i];

        // El espacio y los signos se quedan: son la forma de lo que falta.
        if (!/[a-záéíóúñü0-9]/i.test(c)) {
            out += c;
            continue;
        }

        out += LETRAS[Math.floor(ruido(`${clave}:${i}`) * LETRAS.length)];
    }

    return out;
}

/** ¿A esta frase le toca la mordaza? */
export function isCensored(clave: string): boolean {
    return ruido(`censura:${clave}`) < CENSOR_ODDS;
}
