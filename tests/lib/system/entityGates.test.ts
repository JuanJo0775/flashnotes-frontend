// tests/lib/system/entityGates.test.ts

/**
 * QUÉ ABRE CADA PUERTA.
 *
 * `phaseAfter` es una función PURA: recibe dónde está el ente y qué sabe del
 * mundo, y devuelve dónde debería estar. No lee almacenamiento ni escribe nada.
 * Así las transiciones se prueban como una tabla, que es lo que son.
 */

import { phaseAfter, RETURN_AT, type EntityWorld } from '@/lib/system/entity';

const mundo = (parcial: Partial<EntityWorld> = {}): EntityWorld => ({
    trespassed: false,
    kicked: false,
    ...parcial,
});

describe('dormido', () => {
    it('sin nada, sigue dormido', () => {
        expect(phaseAfter({ phase: 'dormido', exchanges: 9 }, mundo())).toBe(
            'dormido'
        );
    });

    it('despierta por haber estado donde no se podía', () => {
        // La v0.2, el fallo total, el morse. Cada uno es un sitio al que no
        // deberías haber llegado.
        expect(
            phaseAfter({ phase: 'dormido', exchanges: 0 }, mundo({ trespassed: true }))
        ).toBe('receloso');
    });

    it('y también por insistir hasta que te echó', () => {
        // El otro camino: no por lo que sabés, sino por no irte.
        expect(
            phaseAfter({ phase: 'dormido', exchanges: 0 }, mundo({ kicked: true }))
        ).toBe('receloso');
    });
});

describe('receloso', () => {
    it('con pocos intercambios, se queda', () => {
        expect(
            phaseAfter({ phase: 'receloso', exchanges: RETURN_AT - 1 }, mundo())
        ).toBe('receloso');
    });

    it('se abre por VOLVER, no por descubrir más', () => {
        // La primera vez fue curiosidad; a la tercera ya sos alguien que
        // insiste, y eso le interesa.
        expect(
            phaseAfter({ phase: 'receloso', exchanges: RETURN_AT }, mundo())
        ).toBe('burlon');
    });
});

describe('las fases nunca retroceden', () => {
    it('sin haber estado en ningún sitio, sigue burlón', () => {
        // Una fachada que se recompone no da miedo: da desconfianza en el
        // código.
        expect(phaseAfter({ phase: 'burlon', exchanges: 0 }, mundo())).toBe(
            'burlon'
        );
    });
});

describe('lo que esta etapa NO abre', () => {
    it('burlón no avanza: lo que abre `hablando` es una trampa', () => {
        // Y las trampas son la etapa 2. Meter `hablando` ahora dejaría una fase
        // inalcanzable en producción, que es peor que no tenerla.
        expect(
            phaseAfter({ phase: 'burlon', exchanges: 99 }, mundo({ trespassed: true }))
        ).toBe('burlon');
    });
});
