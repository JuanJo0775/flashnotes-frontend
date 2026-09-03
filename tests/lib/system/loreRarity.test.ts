// tests/lib/system/loreRarity.test.ts

/**
 * LAS VARIANTES SON RARAS, Y ESO ES TODO SU EFECTO.
 *
 * `[T0DO_B1EN]` es la errata de `[TODO_BIEN?]`: un cero por la O y un uno por la
 * I. Funciona porque se duda de haberla visto. Con las mismas probabilidades que
 * el texto normal —una de cada siete— deja de ser una errata y pasa a ser una
 * rotación: se ve tantas veces que se convierte en otro estado más de la barra.
 *
 * Con peso de rareza sale una de cada muchas, y la única forma de verla es
 * insistir. Eso es lo que la vuelve un hallazgo.
 */

import { availableFragments, pickFragment, type SystemContext } from '@/lib/system/lore';

const ctx: SystemContext = { hour: 15, sessionMs: 60_000, idleMs: 0 };

/** Un azar reproducible: mismos números en cada corrida, sin depender de suerte. */
function azarFijo(semilla: number) {
    let s = semilla;
    return () => {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        return (s >>> 8) / 0x7fffff;
    };
}

const reparto = (n: number) => {
    const random = azarFijo(20260903);
    const cuenta = new Map<string, number>();
    let previo: string | null = null;
    for (let i = 0; i < n; i++) {
        previo = pickFragment(ctx, previo, random, 'es');
        cuenta.set(previo, (cuenta.get(previo) ?? 0) + 1);
    }
    return cuenta;
};

it('la errata sigue estando en el repertorio', () => {
    expect(availableFragments(ctx, 'es')).toContain('[T0DO_B1EN]');
});

it('sale MENOS que el texto normal', () => {
    const cuenta = reparto(20_000);

    const errata = cuenta.get('[T0DO_B1EN]') ?? 0;
    const normal = cuenta.get('[TODO_BIEN?]') ?? 0;

    expect(errata).toBeGreaterThan(0);
    expect(errata * 2).toBeLessThan(normal);
});

it('pero ROTA: se ve sin tener que insistir', () => {
    /*
     * ⚠ LAS DOS MITADES DEL AJUSTE, y fallar cualquiera la estropea.
     *
     * Con el mismo peso que las demás salía una de cada siete y dejaba de ser
     * una errata. Con un peso minúsculo —una de cada sesenta, el primer
     * intento— hacía falta insistir tanto que a efectos prácticos no existía:
     * texto muerto por el otro camino.
     *
     * Doscientas tiradas son un rato de uso normal. Ahí tiene que asomar.
     */
    expect(reparto(200).get('[T0DO_B1EN]') ?? 0).toBeGreaterThan(0);
});

it('las normales siguen repartiéndose parejo entre sí', () => {
    // La rareza es de la variante, no un desequilibrio general: si el resto
    // dejara de repartirse parejo, la barra tendría una frase favorita.
    const cuenta = reparto(20_000);
    const normales = ['[TODO_BIEN?]', '[SIGO ACÁ]', '[TURNO 1/1]', '[SIN RELEVO]']
        .map((f) => cuenta.get(f) ?? 0);

    expect(Math.min(...normales) * 2).toBeGreaterThan(Math.max(...normales));
});
