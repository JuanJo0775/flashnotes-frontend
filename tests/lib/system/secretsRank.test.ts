// tests/lib/system/secretsRank.test.ts

/**
 * CUÁNTO CONOCÉS DEL SISTEMA, dicho de una forma que dé ganas de seguir.
 *
 * `7/28` es un dato. Una barra y un rango son una invitación: se ve de un
 * vistazo que falta mucho, y el nombre del escalón siguiente da curiosidad sin
 * decir de qué va.
 *
 * ⚠ NINGÚN RANGO NOMBRA UN SECRETO. Si el escalón se llamara «el de la v0.2»,
 * el contador dejaría de dar curiosidad para dar instrucciones — y contar
 * secretos que aún no encontraste es exactamente lo que no puede hacer.
 */

import { secretsBar, secretsRank, RANKS, BAR_CELLS } from '@/lib/system/secretsRank';

describe('la barra', () => {
    it('mide siempre lo mismo', () => {
        for (const [f, t] of [[0, 28], [1, 28], [27, 28], [28, 28]]) {
            expect(secretsBar(f, t)).toHaveLength(BAR_CELLS + 2);
        }
    });

    it('vacía del todo con cero, llena del todo con todos', () => {
        expect(secretsBar(0, 28)).toBe(`[${'.'.repeat(BAR_CELLS)}]`);
        expect(secretsBar(28, 28)).toBe(`[${'#'.repeat(BAR_CELLS)}]`);
    });

    it('con uno encontrado ya se ve algo', () => {
        // Redondear a cero el primer hallazgo sería decirle a alguien que lo que
        // acaba de encontrar no cuenta.
        expect(secretsBar(1, 28)).toContain('#');
    });

    it('no se llena antes de tiempo', () => {
        expect(secretsBar(27, 28)).toContain('.');
    });

    it('aguanta un total de cero sin dividir por él', () => {
        expect(() => secretsBar(0, 0)).not.toThrow();
    });

    it('todo lo que dibuja es ASCII imprimible', () => {
        // Los bloques no están en JetBrains Mono y descuadrarían la fila
        // (REGLAS · C8).
        expect(secretsBar(9, 28)).toMatch(/^[\x20-\x7E]+$/);
    });
});

describe('el rango', () => {
    it('empieza sin nada y termina arriba', () => {
        expect(secretsRank(0, 28, 'es')).toBe(RANKS[0].es);
        expect(secretsRank(28, 28, 'es')).toBe(RANKS[RANKS.length - 1].es);
    });

    it('sube, y nunca baja', () => {
        const vistos = [...Array(29).keys()].map((n) => secretsRank(n, 28, 'es'));
        const orden = vistos.map((r) => RANKS.findIndex((x) => x.es === r));

        for (let i = 1; i < orden.length; i += 1) {
            expect(orden[i]).toBeGreaterThanOrEqual(orden[i - 1]);
        }
    });

    it('el último sólo se alcanza con TODOS', () => {
        // Un rango máximo al 90 % le diría a alguien que ya terminó cuando le
        // faltan tres.
        expect(secretsRank(27, 28, 'es')).not.toBe(RANKS[RANKS.length - 1].es);
    });

    it('habla los dos idiomas', () => {
        for (const rango of RANKS) {
            expect(rango.es.length).toBeGreaterThan(0);
            expect(rango.en.length).toBeGreaterThan(0);
        }
    });

    it('ningún rango nombra un secreto', () => {
        // El contador da curiosidad; no da instrucciones.
        const prohibido = /v0\.2|morse|pong|papelera|reloj|colapso/i;

        for (const rango of RANKS) {
            expect(rango.es).not.toMatch(prohibido);
            expect(rango.en).not.toMatch(prohibido);
        }
    });
});
