// tests/lib/system/v02Restore.test.ts

/**
 * RESTAURAR EN LA v0.2 SALE MAL LA MITAD DE LAS VECES.
 *
 * La papelera existe y funciona — pero no del todo, que es lo que significa una
 * versión a medio hacer. Una de cada dos notas vuelve CORROMPIDA: con basura
 * metida entre las líneas, cosas que no son texto, restos de otra cosa.
 *
 * Y de vez en cuando, entre esa basura, aparece un COMANDO. Ésa es la gracia:
 * los comandos exclusivos de la v0.2 no están en ninguna lista ni en ninguna
 * ayuda. Se encuentran leyendo lo que devolvió mal una nota rota.
 *
 * ⚠ LA REGLA QUE NO SE ROMPE: la corrupción AÑADE, nunca quita. El texto que
 * escribiste sigue entero ahí dentro, sucio pero completo. Perder trabajo de
 * verdad no es una gracia de versión vieja, es una app que borra cosas.
 */

import {
    restoreOutcome,
    corrupt,
    V02_SECRETS,
    CORRUPT_ODDS,
    LEAK_ODDS,
} from '@/lib/system/v02Restore';

/** Un `Math.random` que devuelve lo que se le diga, en orden. */
function dados(...valores: number[]) {
    let i = 0;
    return () => valores[Math.min(i++, valores.length - 1)];
}

describe('cuándo sale mal', () => {
    it('con suerte, la nota vuelve tal cual', () => {
        const salida = restoreOutcome('hola', dados(0.99));
        expect(salida.corrupted).toBe(false);
        expect(salida.text).toBe('hola');
        expect(salida.leaked).toBeNull();
    });

    it('sin suerte, vuelve corrompida', () => {
        const salida = restoreOutcome('hola', dados(0.01, 0.99));
        expect(salida.corrupted).toBe(true);
        expect(salida.text).not.toBe('hola');
    });

    it('sale mal más o menos la mitad de las veces', () => {
        expect(CORRUPT_ODDS).toBeGreaterThan(0.4);
        expect(CORRUPT_ODDS).toBeLessThan(0.6);
    });
});

describe('lo que la corrupción NO hace', () => {
    it('deja el texto original entero, línea por línea', () => {
        const original = 'primera linea\nsegunda linea\ntercera';
        const sucio = corrupt(original, dados(0.01, 0.99), null);

        for (const linea of original.split('\n')) {
            expect(sucio).toContain(linea);
        }
    });

    it('vale también para la nota vacía, sin reventar', () => {
        expect(() => corrupt('', dados(0.5), null)).not.toThrow();
    });

    it('siempre ensucia algo: una corrupción invisible no es una corrupción', () => {
        for (let i = 0; i < 20; i += 1) {
            const sucio = corrupt('texto', () => i / 20, null);
            expect(sucio.length).toBeGreaterThan('texto'.length);
        }
    });
});

describe('el comando escondido en la basura', () => {
    it('aparece de vez en cuando, y es raro', () => {
        expect(LEAK_ODDS).toBeGreaterThan(0);
        expect(LEAK_ODDS).toBeLessThan(0.25);
    });

    it('sólo puede salir si la nota vino corrompida', () => {
        // Una nota que volvió bien no esconde nada: la basura ES el escondite.
        const limpia = restoreOutcome('hola', dados(0.99, 0.01));
        expect(limpia.leaked).toBeNull();
    });

    it('cuando sale, el comando está LEGIBLE dentro del texto', () => {
        const salida = restoreOutcome('hola', dados(0.01, 0.01, 0));

        expect(salida.leaked).not.toBeNull();

        // De nada sirve esconderlo si queda ilegible: hay que poder teclearlo
        // tal cual se lee.
        expect(salida.text).toContain(salida.leaked as string);
        expect(V02_SECRETS).toContain(salida.leaked);
    });

    it('todos los secretos son alcanzables, no sólo el primero', () => {
        const vistos = new Set<string>();

        for (let i = 0; i < V02_SECRETS.length; i += 1) {
            const salida = restoreOutcome(
                'hola',
                dados(0.01, 0.01, i / V02_SECRETS.length)
            );
            if (salida.leaked) vistos.add(salida.leaked);
        }

        expect(vistos.size).toBe(V02_SECRETS.length);
    });
});
