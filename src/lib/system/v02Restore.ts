// src/lib/system/v02Restore.ts

/**
 * Lo que pasa cuando la v0.2 saca una nota de la papelera.
 *
 * La papelera existe y restaura — pero **no del todo**, que es lo que significa
 * una versión a medio hacer. Una de cada dos notas vuelve con basura metida
 * entre las líneas: restos de otra cosa, bytes sueltos, trozos de una tabla que
 * nadie terminó de escribir.
 *
 * Y muy de vez en cuando, entre esa basura, aparece un COMANDO.
 *
 * ⚠ ÉSTA ES LA PUERTA DE LOS COMANDOS EXCLUSIVOS. No están en `//help`, no
 * están en ninguna lista y no se pueden adivinar: se encuentran LEYENDO lo que
 * devolvió mal una nota rota. Es el único sitio donde asoman, y por eso la
 * corrupción tiene que ser algo que dé ganas de leer en vez de algo que se
 * cierre de un manotazo.
 *
 * ⚠ LA REGLA QUE NO SE ROMPE: la corrupción AÑADE, nunca quita. Cada línea que
 * escribiste sigue entera ahí dentro, sucia pero completa — y un test lo fija
 * carácter a carácter. Perder trabajo de verdad no es una gracia de versión
 * vieja: es una app que borra cosas.
 *
 * TODO ESTO ES PURO. Se le pasa el dado en vez de llamar a `Math.random()`
 * dentro, así que se prueba entero sin montar nada y sin sorteos que espiar.
 */

/** Cuántas vuelven mal. La mitad: bastante para que asuste, no tanto como para
 *  que la papelera deje de servir. */
export const CORRUPT_ODDS = 0.5;

/** Y de ésas, cuántas sueltan un comando. Raro a propósito: si saliera siempre
 *  dejaría de ser un hallazgo y sería un tutorial. */
export const LEAK_ODDS = 0.14;

/**
 * Los comandos que sólo existen en la v0.2, y sólo se encuentran así.
 *
 * Se declaran acá y no en la lista de comandos porque acá es donde se
 * DESCUBREN. La lista sabe ejecutarlos; este archivo sabe enseñarlos.
 */
export const V02_SECRETS = ['//todo', '//recover'] as const;

/** Restos de cosas que la máquina tenía a mano. Ninguno es texto de verdad: son
 *  trozos de volcado, que es lo que sale cuando algo se lee de donde no era. */
const BASURA = [
    '~~~~ 00 4F 5C 21 ~~~~',
    '[[ERR:2]] ....... ??',
    '<<< 011010 001110 >>>',
    '?? ?? ?? ?? ?? ?? ?? ??',
    '=== FIN? === === === ==',
    '\\ 0x00 0x00 0x7F //',
    '|||| ---- |||| ---- ||',
    '.....recuperado?.....',
];

/** Mete `trozo` en un sitio cualquiera de las líneas, sin tocar ninguna. */
function entremete(lineas: string[], trozo: string, dado: number): string[] {
    const donde = Math.floor(dado * (lineas.length + 1));
    const copia = [...lineas];
    copia.splice(Math.min(donde, lineas.length), 0, trozo);
    return copia;
}

/**
 * Ensucia el texto SIN quitarle nada.
 *
 * `secreto`, si viene, se cuela dentro de una línea de basura: rodeado de
 * ruido, pero entero y tecleable tal cual se lee. Esconderlo de forma ilegible
 * sería esconderlo para nadie.
 */
export function corrupt(
    texto: string,
    rand: () => number,
    secreto: string | null
): string {
    let lineas = texto.split('\n');

    // Siempre al menos una: una corrupción que no se ve no es una corrupción.
    const cuantas = 1 + Math.floor(rand() * 3);

    for (let i = 0; i < cuantas; i += 1) {
        const trozo = BASURA[Math.floor(rand() * BASURA.length) % BASURA.length];
        lineas = entremete(lineas, trozo, rand());
    }

    if (secreto) {
        lineas = entremete(lineas, `?? 5C ${secreto} 00 ??`, rand());
    }

    return lineas.join('\n');
}

export interface RestoreOutcome {
    text: string;
    corrupted: boolean;
    /** El comando que asomó entre la basura, o `null`. */
    leaked: string | null;
}

/**
 * Qué sale de la papelera.
 *
 * El orden de los dados importa: primero si se corrompe, y SÓLO si se corrompió
 * se sortea el secreto. Una nota que volvió limpia no esconde nada, porque la
 * basura es el escondite.
 */
export function restoreOutcome(
    texto: string,
    rand: () => number = Math.random
): RestoreOutcome {
    if (rand() >= CORRUPT_ODDS) {
        return { text: texto, corrupted: false, leaked: null };
    }

    const suelta = rand() < LEAK_ODDS;
    const leaked = suelta
        ? V02_SECRETS[
              Math.min(
                  Math.floor(rand() * V02_SECRETS.length),
                  V02_SECRETS.length - 1
              )
          ]
        : null;

    return { text: corrupt(texto, rand, leaked), corrupted: true, leaked };
}
