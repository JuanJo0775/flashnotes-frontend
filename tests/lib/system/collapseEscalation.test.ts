// tests/lib/system/collapseEscalation.test.ts
import {
    ESCALATION_WINDOW_MS,
    LOCKOUT_AT,
    LOCKOUT_MS,
    levelFor,
    countAfter,
} from '@/lib/system/collapseEscalation';

const MINUTO = 60_000;

describe('collapseEscalation - la cuenta dentro de la ventana', () => {
    // La ventana se mide desde que el sistema SE RECUPERÓ, no desde el colapso
    // anterior: los rearranques ocurren dentro de la ventana, y contarlos te
    // castiga porque la máquina es lenta en vez de porque insististe.
    test('el primer colapso empieza la cuenta', () => {
        expect(countAfter(null, null, 1000)).toBe(1);
    });

    test('romperlo otra vez ANTES de que vuelva sigue la racha', () => {
        // Es el caso más insistente que hay: cortarle la racha ahí sería
        // exactamente al revés de lo que la escalada quiere castigar.
        expect(countAfter(3, null, 999_999)).toBe(4);
    });

    test('otro dentro de la ventana suma', () => {
        expect(countAfter(3, 0, MINUTO)).toBe(4);
    });

    test('pasada la ventana, la cuenta vuelve a empezar', () => {
        expect(countAfter(5, 0, ESCALATION_WINDOW_MS + 1000)).toBe(1);
    });

    test('justo en el borde todavía cuenta', () => {
        expect(countAfter(2, 0, ESCALATION_WINDOW_MS - 1)).toBe(3);
    });
});

describe('collapseEscalation - los escalones', () => {
    test('las dos primeras veces se reproducen igual', () => {
        for (const n of [1, 2]) {
            const nivel = levelFor(n, () => 0.5);
            expect(nivel.intensity).toBe(1);
            expect(nivel.lockout).toBe(false);
        }
    });

    test('el rearranque tarda entre 8 y 25 segundos', () => {
        const corto = levelFor(1, () => 0);
        const largo = levelFor(1, () => 0.999);

        expect(corto.rebootMs).toBe(8000);
        expect(largo.rebootMs).toBeLessThanOrEqual(25_000);
        expect(largo.rebootMs).toBeGreaterThan(24_000);
    });

    test('insistiendo, el rearranque tarda más', () => {
        const temprano = levelFor(1, () => 0.5).rebootMs;
        const medio = levelFor(3, () => 0.5).rebootMs;
        const tarde = levelFor(5, () => 0.5).rebootMs;

        expect(medio).toBeGreaterThan(temprano);
        expect(tarde).toBeGreaterThan(medio);
    });

    test('y los fallos se vuelven más fuertes', () => {
        expect(levelFor(3, () => 0.5).intensity).toBeGreaterThan(
            levelFor(1, () => 0.5).intensity
        );
        expect(levelFor(5, () => 0.5).intensity).toBeGreaterThan(
            levelFor(3, () => 0.5).intensity
        );
    });

    test('el bloqueo se puede alcanzar dentro de la ventana', () => {
        // ESTE ES EL TEST QUE FALTABA. Con el umbral en diez y rearranques de
        // hasta cuarenta segundos, llegar al bloqueo consumía más de seis
        // minutos SÓLO en pantallas de carga: la ventana de cinco se cerraba
        // antes y el escalón era inalcanzable. Se comprueba que el peor caso
        // —todos los rearranques al máximo— cabe con margen.
        let total = 0;
        for (let n = 1; n < LOCKOUT_AT; n += 1) {
            total += levelFor(n, () => 0.999).rebootMs;
        }

        expect(total).toBeLessThan(ESCALATION_WINDOW_MS * 0.6);
    });
});

describe('collapseEscalation - el bloqueo', () => {
    test('el umbral es alcanzable a mano, no teórico', () => {
        // Cinco no daba margen a que la escalada se sintiera; doce era una
        // prueba de resistencia. Seis deja dos reproducciones limpias, dos
        // escalones intermedios y el bloqueo.
        expect(LOCKOUT_AT).toBe(6);
    });

    test('al llegar al umbral el sistema deja de reiniciarse', () => {
        expect(levelFor(LOCKOUT_AT, () => 0.5).lockout).toBe(true);
    });

    test('una menos todavía reinicia', () => {
        expect(levelFor(LOCKOUT_AT - 1, () => 0.5).lockout).toBe(false);
    });

    test('pasado el bloqueo sigue bloqueado, no se relaja', () => {
        expect(levelFor(LOCKOUT_AT + 5, () => 0.5).lockout).toBe(true);
    });

    test('el bloqueo dura cinco minutos si no lo resolvés', () => {
        expect(LOCKOUT_MS).toBe(5 * MINUTO);
    });

    test('los fallos del bloqueo son los más fuertes de todos', () => {
        expect(levelFor(LOCKOUT_AT, () => 0.5).intensity).toBeGreaterThan(
            levelFor(LOCKOUT_AT - 1, () => 0.5).intensity
        );
    });
});
