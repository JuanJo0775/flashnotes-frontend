// tests/lib/system/entityMemory.test.ts

/**
 * LO POCO QUE ÉL RECUERDA.
 *
 * Sigue sin guardar memoria nueva de la app: la palabra de la v0.2, los
 * procesos y la papelera ya están y él los consulta. Lo que no está en ningún
 * lado es lo que pasó ENTRE USTEDES — qué te preguntó y sigue esperando, qué
 * mentira te tragaste, y a qué reto no te atreviste.
 *
 * Eso último es lo que le deja decirte «te dio miedo» tres pantallas después, y
 * es la razón de que esto exista.
 */

import {
    clearEntity,
    clearLie,
    markDared,
    markDodged,
    markLieStanding,
    markLieSwallowed,
    readEntity,
    setAsk,
    setPhase,
} from '@/lib/system/entity';

beforeEach(() => {
    localStorage.clear();
    clearEntity();
});

describe('la pregunta en el aire', () => {
    it('al principio no hay ninguna', () => {
        expect(readEntity().asking).toBeUndefined();
    });

    it('se pone y se quita', () => {
        setAsk('word');
        expect(readEntity().asking).toBe('word');

        setAsk(null);
        expect(readEntity().asking).toBeUndefined();
    });

    it('y sobrevive a recargar: te preguntó y sigue esperando', () => {
        setAsk('word');

        expect(readEntity().asking).toBe('word');
        expect(readEntity().asking).toBe('word');
    });
});

describe('lo que se te quedó', () => {
    it('la mentira en pie, y la mentira tragada', () => {
        // En pie es que la dijo y sigue sin desmentir. Tragada es que ya no la
        // vas a desmentir. La segunda cierra una puerta; la primera la tiene
        // abierta.
        expect(readEntity().lieStanding).toBeFalsy();

        markLieStanding();
        expect(readEntity().lieStanding).toBe(true);

        clearLie();
        expect(readEntity().lieStanding).toBeFalsy();

        markLieSwallowed();
        expect(readEntity().lieSwallowed).toBe(true);
    });

    it('el reto lanzado y el reto esquivado son dos cosas', () => {
        // Lanzarlo es que él lo dijo; esquivarlo es que vos no lo hiciste. Sin
        // separarlos no podría reprochártelo sin reprochárselo a sí mismo.
        markDared();
        expect(readEntity().dared).toBe(true);
        expect(readEntity().dodged).toBeFalsy();

        markDodged();
        expect(readEntity().dodged).toBe(true);
    });
});

describe('cambiar de fase no le borra lo que sabe', () => {
    it('sigue acordándose de que te tragaste la mentira', () => {
        // ⚠ `setPhase` pone la CUENTA a cero, que es su trabajo. Si además se
        // llevara por delante lo que recuerda, pasar a `hablando` sería una
        // amnistía — y él no perdona, sólo cambia de tono.
        markLieSwallowed();
        markDodged();

        setPhase('hablando');

        expect(readEntity().lieSwallowed).toBe(true);
        expect(readEntity().dodged).toBe(true);
        expect(readEntity().exchanges).toBe(0);
    });
});

describe('y lo olvida todo con //reset', () => {
    it('no queda ni la pregunta en el aire', () => {
        setAsk('word');
        markDared();

        clearEntity();

        expect(readEntity()).toEqual({ phase: 'dormido', exchanges: 0 });
    });
});
