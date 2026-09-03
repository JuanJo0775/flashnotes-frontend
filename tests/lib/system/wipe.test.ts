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
    wipeDuration,
    wipeLine,
    isPrank,
    WIPE_STEPS,
    PRANK_ODDS,
} from '@/lib/system/wipe';

describe('las fases, en orden', () => {
    it('empieza DESVANECIENDO la app, no contando', () => {
        // Sin esto, la pantalla de borrado aparecía de golpe sobre las notas y
        // se leía como un diálogo. Con el desvanecido, lo que se ve es a la app
        // irse — y sólo después empieza a contarse.
        expect(wipeAt(0).kind).toBe('fading');
    });

    it('luego come una línea por paso', () => {
        for (let i = 0; i < WIPE_STEPS; i += 1) {
            const f = wipeAt(i + 1);
            expect(f.kind).toBe('erasing');
            expect(f.kind === 'erasing' && f.eaten).toBe(i);
        }
    });

    it('la lista NO encoge: se queda entera y se va marcando', () => {
        // Una lista que sólo encoge se lee como una lista más corta. Lo que da
        // el escalofrío es ver las que ya no están, en su sitio.
        const a = wipeAt(1);
        const b = wipeAt(WIPE_STEPS);

        expect(a.kind === 'erasing' && a.lines.length).toBe(
            b.kind === 'erasing' && b.lines.length
        );
    });

    it('las notas van LAS PRIMERAS de la lista', () => {
        // Son lo que de verdad importa, y verlas encabezar es el aviso final.
        const f = wipeAt(1);
        expect(f.kind === 'erasing' && f.lines[0]).toMatch(/notas/);
    });

    it('luego el tubo se apaga, y después las franjas', () => {
        // Las franjas van DESPUÉS del apagón: es la diferencia entre «se apagó» y
        // «se apagó y volvió a encenderse desde cero». Lo que se ve entre las dos
        // cosas es un equipo sin señal, que es lo que hay cuando ya no queda nada
        // dentro.
        expect(wipeAt(WIPE_STEPS + 1).kind).toBe('off');
        expect(wipeAt(WIPE_STEPS + 2).kind).toBe('bars');
        expect(wipeAt(WIPE_STEPS + 3).kind).toBe('done');
    });

    it('pasado el final se queda en «done», no se sale de la lista', () => {
        expect(wipeAt(999).kind).toBe('done');
    });

    it('un paso negativo no rompe nada', () => {
        expect(wipeAt(-3).kind).toBe('fading');
    });
});

describe('la salida de la broma', () => {
    it('recorre lo mismo hasta el final', () => {
        // El susto tiene que ser IDÉNTICO, o deja de ser un susto: quien la ve no
        // puede notar por dónde va a salir.
        for (let i = 0; i <= WIPE_STEPS; i += 1) {
            expect(wipeAt(i, true).kind).toBe(wipeAt(i, false).kind);
        }
    });

    it('pero en vez de apagarse, confiesa', () => {
        expect(wipeAt(WIPE_STEPS + 1, true).kind).toBe('joke');
    });

    it('y también termina', () => {
        expect(wipeAt(WIPE_STEPS + 2, true).kind).toBe('done');
    });
});

describe('cuánto dura cada tramo', () => {
    it('todos duran algo, menos el final', () => {
        for (let i = 0; i <= WIPE_STEPS + 2; i += 1) {
            expect(wipeDuration(i)).toBeGreaterThan(0);
        }
        expect(wipeDuration(WIPE_STEPS + 3)).toBe(0);
    });

    it('la confesión dura más que comerse una línea', () => {
        // Hay que poder leerla. Un «era broma» que pasa en doscientos
        // milisegundos no se lee, se sospecha.
        expect(wipeDuration(WIPE_STEPS + 1, true)).toBeGreaterThan(
            wipeDuration(2)
        );
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
