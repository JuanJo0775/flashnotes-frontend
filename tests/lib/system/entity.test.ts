// tests/lib/system/entity.test.ts

/**
 * EL ÚNICO ESTADO PROPIO DEL ENTE.
 *
 * ⚠ NO GUARDA MEMORIA NUEVA DE LA APP. Lo que sabe de vos —secretos, piezas, si
 * cruzaste a la v0.2, si te echó— lo lee de donde ya vive. Si llevara su propio
 * registro habría dos verdades sobre lo mismo, y la que se queda vieja es
 * siempre la que nadie mira.
 *
 * Lo suyo es sólo DÓNDE ESTÁ y CUÁNTO lleva ahí. La cuenta de intercambios no es
 * un marcador: es lo que hace que el tono se mueva DENTRO de una fase, para que
 * el salto a la siguiente no se note.
 */

import {
    clearEntity,
    countExchange,
    readEntity,
    setPhase,
} from '@/lib/system/entity';

beforeEach(() => {
    localStorage.clear();
    clearEntity();
});

describe('al principio', () => {
    it('está dormido y sin intercambios', () => {
        expect(readEntity()).toEqual({ phase: 'dormido', exchanges: 0 });
    });
});

describe('la fase', () => {
    it('se guarda y sobrevive a recargar', () => {
        // Vive en `localStorage` como el bloqueo y la v0.2: un ente que se
        // reinicia al refrescar no es un ente, es un efecto.
        setPhase('receloso');

        expect(readEntity().phase).toBe('receloso');
        expect(readEntity().phase).toBe('receloso');
    });

    it('al cambiar de fase, la cuenta vuelve a cero', () => {
        // La cuenta mide cuánto llevás DENTRO de la fase actual. Arrastrarla
        // haría que la primera respuesta de una fase nueva saliera del final de
        // su repertorio, que es justo el salto de tono que hay que evitar.
        setPhase('receloso');
        countExchange();
        countExchange();

        setPhase('burlon');

        expect(readEntity().exchanges).toBe(0);
    });

    it('volver a poner la MISMA fase no reinicia la cuenta', () => {
        setPhase('receloso');
        countExchange();

        setPhase('receloso');

        expect(readEntity().exchanges).toBe(1);
    });
});

describe('los intercambios', () => {
    it('suman de uno en uno y devuelven el nuevo total', () => {
        expect(countExchange()).toBe(1);
        expect(countExchange()).toBe(2);
        expect(readEntity().exchanges).toBe(2);
    });
});

describe('cuando el almacenamiento falla', () => {
    it('un valor corrupto no rompe nada: vuelve al principio', () => {
        localStorage.setItem('flashnotes:entity', 'no soy json');

        expect(readEntity()).toEqual({ phase: 'dormido', exchanges: 0 });
    });

    it('una fase que ya no existe se ignora', () => {
        // Renombrar una fase no puede dejar a nadie atrapado en una que el
        // código ya no conoce.
        localStorage.setItem(
            'flashnotes:entity',
            JSON.stringify({ phase: 'inventada', exchanges: 3 })
        );

        expect(readEntity().phase).toBe('dormido');
    });
});
