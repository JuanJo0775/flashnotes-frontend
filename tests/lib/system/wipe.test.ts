// tests/lib/system/wipe.test.ts

/**
 * EL GUION DEL BORRADO.
 *
 * Una pantalla que se come a sí misma: las líneas se van tachando, el hueco se
 * queda vacío, salen tres puntos, y vuelve el inicio.
 *
 * Se prueba el guion entero sin montar nada, que es de lo que sirve tenerlo
 * aparte del componente.
 */

import {
    wipeAt,
    wipeLine,
    isPrank,
    WIPE_STEPS,
    PRANK_ODDS,
} from '@/lib/system/wipe';

describe('las fases, en orden', () => {
    it('empieza comiendo, sin haberse comido nada', () => {
        const f = wipeAt(0);
        expect(f.kind).toBe('eating');
        expect(f.kind === 'eating' && f.eaten).toBe(0);
    });

    it('come una por paso', () => {
        for (let i = 0; i < WIPE_STEPS; i += 1) {
            const f = wipeAt(i);
            expect(f.kind === 'eating' && f.eaten).toBe(i);
        }
    });

    it('la lista NO encoge: se queda entera y se va marcando', () => {
        // Una lista que sólo encoge se lee como una lista más corta. Lo que da
        // el escalofrío es ver las que ya no están, en su sitio.
        const a = wipeAt(0);
        const b = wipeAt(WIPE_STEPS - 1);

        expect(a.kind === 'eating' && a.lines.length).toBe(
            b.kind === 'eating' && b.lines.length
        );
    });

    it('después se queda en blanco, luego tres puntos, luego se acabó', () => {
        expect(wipeAt(WIPE_STEPS).kind).toBe('blank');
        expect(wipeAt(WIPE_STEPS + 1).kind).toBe('dots');
        expect(wipeAt(WIPE_STEPS + 2).kind).toBe('done');
    });

    it('pasado el final se queda en «done», no se sale de la lista', () => {
        expect(wipeAt(999).kind).toBe('done');
    });

    it('un paso negativo no rompe nada', () => {
        expect(wipeAt(-3).kind).toBe('eating');
    });
});

describe('cómo se ve una línea', () => {
    it('intacta lleva su nombre', () => {
        expect(wipeLine('secrets.idx', false)).toContain('secrets.idx');
    });

    it('comida se sustituye por ruido, no por un hueco', () => {
        const comida = wipeLine('secrets.idx', true);

        expect(comida).not.toContain('secrets.idx');
        expect(comida).toMatch(/#/);
    });

    it('y ocupa lo mismo: la lista no se mueve al comerse una', () => {
        // Si el ruido midiera otra cosa, cada paso empujaría las de abajo y el
        // borrado parecería un fallo de maquetación.
        expect(wipeLine('secrets.idx', true)).toHaveLength(
            wipeLine('secrets.idx', false).length
        );
    });

    it('todo lo que dibuja es ASCII imprimible', () => {
        expect(wipeLine('pong/scores', true)).toMatch(/^[\x20-\x7E]+$/);
    });
});

describe('la broma del «no»', () => {
    it('pasa de vez en cuando, y es rara', () => {
        expect(PRANK_ODDS).toBeGreaterThan(0);
        expect(PRANK_ODDS).toBeLessThan(0.35);
    });

    it('con el dado a favor, es broma', () => {
        expect(isPrank(() => 0)).toBe(true);
    });

    it('con el dado en contra, no', () => {
        expect(isPrank(() => 0.99)).toBe(false);
    });
});
