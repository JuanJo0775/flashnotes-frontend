// tests/lib/system/helpLeak.test.ts

/**
 * LA FUGA DE `//help` SÓLO SUELTA CALLEJONES SIN SALIDA.
 *
 * `//help` es la red de seguridad del proyecto: insistiendo, todo acaba
 * encontrándose. Pero soltaba CUALQUIER comando escondido, y eso tenía tres
 * problemas de distinta gravedad:
 *
 *   · `//reset` BORRA TU PROGRESO, y la fuga te lo ponía delante sin contexto.
 *     Es el único comando destructivo de la app y llegaba de regalo.
 *   · Los ESLABONES INTERMEDIOS salían sueltos: `//attach_6` antes que `//ps`,
 *     `//art_1` antes que `//art`. Se niegan a existir fuera de orden, así que la
 *     fuga regalaba un nombre que todavía no servía para nada.
 *   · Las PUERTAS —`//hi`, `//diag`, `//art`, `//history`, `//panic`— abren capas
 *     enteras. Regalarlas es regalar el juego, y además cada una ya tiene su
 *     propio camino para descubrirse.
 *
 * Queda lo que es curioso y no abre nada: se lee, se sonríe, y ahí termina.
 */

import { LEAKABLE, leakableCommands } from '@/lib/system/commands';

describe('qué puede filtrarse', () => {
    it('sólo los callejones sin salida', () => {
        expect([...LEAKABLE].sort()).toEqual(
            ['//uptime', '//sudo', '//log', '//diag', '//date_off', '//history'].sort()
        );
    });

    it('NUNCA el que borra todo', () => {
        // Es la razón por la que existe la lista blanca.
        expect(LEAKABLE).not.toContain('//reset');
    });

    it('ni las puertas que abren una capa entera', () => {
        for (const puerta of ['//hi', '//art', '//panic', '//ps']) {
            expect(LEAKABLE).not.toContain(puerta);
        }
    });

    it('ni los eslabones que no sirven fuera de orden', () => {
        for (const eslabon of ['//attach_6', '//art_1', '//keep']) {
            expect(LEAKABLE).not.toContain(eslabon);
        }
    });

    it('ni los CUATRO DEL ENTE, que estan reservados', () => {
        // Son la cadena del lore profundo: un nombre suelto no significa nada
        // hasta que sabes a quien le estas hablando.
        for (const ente of ['//hi', '//whoareu', '//howareu', '//whoami']) {
            expect(LEAKABLE).not.toContain(ente);
        }
    });

    it('y todos los de la lista existen de verdad', () => {
        // Un nombre mal escrito acá deja la fuga muda sin que nada falle.
        expect(leakableCommands().sort()).toEqual([...LEAKABLE].sort());
    });
});
