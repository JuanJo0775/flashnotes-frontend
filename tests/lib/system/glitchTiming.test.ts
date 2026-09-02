// tests/lib/system/glitchTiming.test.ts
import {
    glitchIntervalMs,
    glitchAmplitudePx,
    rollsNegative,
    rollsFragment,
    NEGATIVE_ODDS,
    FRAGMENT_ODDS,
    rollSeverity,
    sliceCount,
    buildSlices,
} from '@/lib/system/glitchTiming';

const MINUTO = 60_000;

describe('glitchTiming - la máquina se cansa', () => {
    // El intervalo no es aleatorio a secas: se acorta con el turno. Es lore
    // expresado como número, y es honesto porque la app de verdad lleva la
    // cuenta de tu sesión.
    test('recién abierta, los glitches son raros', () => {
        expect(glitchIntervalMs(2 * MINUTO, () => 0.5)).toBeGreaterThan(3 * MINUTO);
    });

    test('el intervalo se acorta a medida que avanza el turno', () => {
        const temprano = glitchIntervalMs(2 * MINUTO, () => 0.5);
        const medio = glitchIntervalMs(30 * MINUTO, () => 0.5);
        const tarde = glitchIntervalMs(60 * MINUTO, () => 0.5);
        const muyTarde = glitchIntervalMs(120 * MINUTO, () => 0.5);

        expect(medio).toBeLessThan(temprano);
        expect(tarde).toBeLessThan(medio);
        expect(muyTarde).toBeLessThan(tarde);
    });

    test('nunca baja de un minuto, por largo que sea el turno', () => {
        expect(glitchIntervalMs(24 * 60 * MINUTO, () => 0)).toBeGreaterThanOrEqual(MINUTO);
    });

    test('el azar mueve el intervalo dentro de su franja', () => {
        const bajo = glitchIntervalMs(2 * MINUTO, () => 0);
        const alto = glitchIntervalMs(2 * MINUTO, () => 1);

        expect(alto).toBeGreaterThan(bajo);
    });

    test('una sesión imposible no devuelve basura', () => {
        expect(glitchIntervalMs(-5000, () => 0.5)).toBeGreaterThan(0);
    });
});

describe('glitchTiming - la amplitud sigue a la integridad', () => {
    test('con el sistema sano, el temblor es el de reposo', () => {
        expect(glitchAmplitudePx(100)).toBe(3);
    });

    test('cuanto más rota, más fuerte', () => {
        expect(glitchAmplitudePx(60)).toBeGreaterThan(glitchAmplitudePx(80));
        expect(glitchAmplitudePx(20)).toBeGreaterThan(glitchAmplitudePx(40));
    });

    test('nunca deja de temblar del todo', () => {
        expect(glitchAmplitudePx(0)).toBeGreaterThan(0);
    });
});

describe('glitchTiming - las tiradas', () => {
    test('el negativo sale una de cada cuatro veces', () => {
        expect(NEGATIVE_ODDS).toBe(4);
        expect(rollsNegative(() => 0)).toBe(true);
        expect(rollsNegative(() => 0.99)).toBe(false);
    });

    test('el fragmento acompaña una de cada cinco', () => {
        expect(FRAGMENT_ODDS).toBe(5);
        expect(rollsFragment(() => 0)).toBe(true);
        expect(rollsFragment(() => 0.99)).toBe(false);
    });
});

describe('glitchTiming - la gravedad del fallo', () => {
    // Un glitch que siempre es igual se convierte en un bucle y deja de
    // asustar. La mayoría son un parpadeo; los graves son raros, y por raros
    // valen.
    test('casi siempre el fallo es leve', () => {
        expect(rollSeverity(() => 0.5)).toBe('minor');
    });

    test('a veces es de los serios', () => {
        expect(rollSeverity(() => 0.8)).toBe('major');
    });

    test('muy de vez en cuando la señal se cae del todo', () => {
        expect(rollSeverity(() => 0.99)).toBe('severe');
    });

    test('los tres niveles son alcanzables y no hay un cuarto', () => {
        const vistos = new Set(
            [0, 0.25, 0.5, 0.75, 0.9, 0.99].map((r) => rollSeverity(() => r))
        );

        expect([...vistos].sort()).toEqual(['major', 'minor', 'severe']);
    });
});

describe('glitchTiming - las rebanadas desplazadas', () => {
    test('un fallo leve no rebana la pantalla', () => {
        expect(sliceCount('minor')).toBe(0);
    });

    test('uno serio la parte en varias', () => {
        expect(sliceCount('major')).toBeGreaterThan(0);
    });

    test('uno grave la parte en más', () => {
        expect(sliceCount('severe')).toBeGreaterThan(sliceCount('major'));
    });

    test('cada rebanada cae dentro de la pantalla', () => {
        const rebanadas = buildSlices('severe', () => 0.5);

        for (const r of rebanadas) {
            expect(r.topPct).toBeGreaterThanOrEqual(0);
            expect(r.topPct).toBeLessThan(100);
            expect(r.heightPct).toBeGreaterThan(0);
        }
    });

    test('las rebanadas se desplazan a los dos lados', () => {
        const izquierda = buildSlices('severe', () => 0);
        const derecha = buildSlices('severe', () => 0.99);

        expect(izquierda[0].shiftPx).toBeLessThan(0);
        expect(derecha[0].shiftPx).toBeGreaterThan(0);
    });
});
