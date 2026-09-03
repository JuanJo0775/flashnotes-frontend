// tests/lib/system/artCorruption.test.ts

/**
 * LA PIEZA QUE APARECE EN LA PAPELERA, ROTA.
 *
 * Ganás una pieza y el sistema la archiva mal: en la papelera queda un resto de
 * lo que recuperó, comido. Entre la basura están las letras de `//art`, y ése es
 * el camino para descubrir el catálogo.
 *
 * ⚠ EL COMANDO VA PARTIDO, y esa es toda la gracia. Si apareciera entero se lee
 * como un cartel —«acá tenés el comando»— y deja de ser un hallazgo. Repartido en
 * trozos por el dibujo hay que juntarlo con la vista, y hasta que lo juntás no
 * sabés si es un comando o ruido. Eso es lo que da lugar a especular.
 *
 * Y se corrompe AL VUELO desde el dibujo bueno, no con una segunda versión
 * dibujada a mano: dieciséis dibujos gemelos serían dieciséis sitios más donde
 * las dos copias pueden separarse, y cada pieza nueva obligaría a dibujar dos.
 */

import { corruptArt, COMMAND_SHARDS } from '@/lib/system/artCorruption';
import { ART } from '@/lib/system/asciiArt';

const polilla = ART.find((p) => p.id === 'moth')!.art;

describe('la rejilla se respeta', () => {
    it('mismo alto y mismo ancho que el original', () => {
        // Una fila más corta descoloca el dibujo entero, y un resto descuadrado
        // no se lee como algo roto: se lee como algo mal hecho.
        for (const pieza of ART) {
            const roto = corruptArt(pieza.art, pieza.id).split('\n');
            const bueno = pieza.art.split('\n');

            expect(roto).toHaveLength(bueno.length);
            roto.forEach((fila, i) => expect(fila).toHaveLength(bueno[i].length));
        }
    });

    it('sin nada que la monoespaciada no tenga', () => {
        // Misma regla que los dibujos: ni bloques ni marcos de caja (REGLAS · C8).
        for (const pieza of ART) {
            expect(corruptArt(pieza.art, pieza.id)).not.toMatch(/[▀-▟─-╿]/);
        }
    });
});

describe('el comando, en columna', () => {
    it('se lee HACIA ABAJO, una letra por fila', () => {
        /*
         * Un dibujo en caracteres se lee en horizontal: los ojos barren de
         * izquierda a derecha y nadie va leyendo columnas. Así que una columna de
         * letras entre el destrozo no se LEE — se ve como restos alineados de
         * casualidad. Hasta que un día no.
         *
         * Es el punto que costó encontrar. Repartido en trozos horizontales
         * quedaba invisible; entero y en horizontal era un cartel.
         */
        for (const pieza of ART) {
            const filas = corruptArt(pieza.art, pieza.id).split('\n');

            const y = filas.findIndex((f) => f.includes('A'));
            expect(y).toBeGreaterThanOrEqual(0);

            const x = filas[y].indexOf('A');
            expect(filas[y + 1][x]).toBe('R');
            expect(filas[y + 2][x]).toBe('T');
            expect(filas[y - 1][x]).toBe('/');
            expect(filas[y - 2][x]).toBe('/');
        }
    });

    it('y NUNCA entero y seguido en una fila', () => {
        // Ésta es la mitad importante: en horizontal es un cartel, no un
        // hallazgo.
        for (const pieza of ART) {
            expect(corruptArt(pieza.art, pieza.id).toLowerCase()).not.toContain('//art');
        }
    });

    it('en mayúsculas, que entre el ruido se distinguen mejor', () => {
        // Y da igual para teclearlo: el comando se normaliza a minúsculas, así
        // que `//ART` y `//art` son el mismo.
        expect(COMMAND_SHARDS.join('')).toBe('//ART');
    });
});

describe('las únicas letras del bloque', () => {
    it('son las del comando, y ninguna más', () => {
        /*
         * ⚠ ESTO ES LO QUE HACE QUE SE ENCUENTRE.
         *
         * Los dibujos llevan letras propias —el `oo` de la polilla, la `A` y el
         * `3 min` del casete, el `v 0 . 2` del disquete— y mientras sobreviva
         * cualquiera de ellas, las del comando son cinco letras más entre otras y
         * no destacan en nada. Comiéndoselas todas, lo único alfabético que queda
         * en el bloque entero es el comando.
         */
        for (const pieza of ART) {
            const letras = [...corruptArt(pieza.art, pieza.id)]
                .filter((c) => /[a-zA-Z]/.test(c))
                .join('');

            expect(letras).toBe('ART');
        }
    });

    it('pero los dígitos NO se borran por ser dígitos', () => {
        /*
         * ⚠ MATIZ QUE ESTE TEST TUVO MAL AL PRINCIPIO: exigía que el disquete
         * conservara los suyos, y no es eso. Las letras se van SIEMPRE, por regla;
         * los dígitos sólo corren la misma suerte que el resto de la tinta, así
         * que en una pieza concreta pueden desaparecer por sorteo.
         *
         * Lo que se fija es la regla, no el resultado en un dibujo: en el conjunto
         * sobreviven dígitos, porque nadie los persigue. Parecen datos, y un
         * bloque de datos con dígitos sueltos es lo que dice ser.
         */
        const conDigitos = ART.filter((p) =>
            /[0-9]/.test(corruptArt(p.art, p.id))
        );

        expect(conDigitos.length).toBeGreaterThan(0);
    });
});

describe('la corrupción', () => {
    it('rompe, pero deja reconocer la pieza', () => {
        // Si se come todo, cualquier pieza da el mismo amasijo y el resto deja de
        // ser TU pieza para ser ruido. Tiene que sobrevivir más de la mitad.
        const roto = corruptArt(polilla, 'moth');
        const iguales = [...roto].filter((c, i) => c === polilla[i]).length;

        expect(iguales).toBeGreaterThan(polilla.length * 0.5);
        expect(iguales).toBeLessThan(polilla.length * 0.95);
    });

    it('es la misma cada vez para la misma pieza', () => {
        // El resto vive en la papelera: si cambiara en cada repintado sería un
        // cartel de neón parpadeando, no algo que alguien tiró ahí.
        expect(corruptArt(polilla, 'moth')).toBe(corruptArt(polilla, 'moth'));
    });

    it('y distinta entre piezas', () => {
        const a = corruptArt(polilla, 'moth');
        const b = corruptArt(polilla, 'crt');

        expect(a).not.toBe(b);
    });
});
