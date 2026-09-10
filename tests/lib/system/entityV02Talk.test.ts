// tests/lib/system/entityV02Talk.test.ts

/**
 * HABLARLE DESDE LA v0.2, DE PUNTA A PUNTA.
 *
 * El fichero de al lado prueba las piezas —qué llega, qué dice al encontrarte,
 * cómo corta—; éste prueba lo que ve alguien tecleando, que es lo único que
 * decide si esto funciona. Y prueba lo que más fácil se rompe: que la 1.0 siga
 * exactamente igual.
 */

export {};

const load = async () => {
    jest.resetModules();
    const [commands, entity, v02] = await Promise.all([
        import('@/lib/system/commands'),
        import('@/lib/system/entity'),
        import('@/lib/system/v02'),
    ]);
    return { ...commands, entity, v02 };
};

/** Lo mínimo que estas preguntas miran del contexto. `kicks: 3` lo despierta. */
const ctx = () =>
    ({
        now: new Date('2026-09-09T14:52:00'),
        sessionStart: new Date('2026-09-09T14:00:00'),
        notes: [],
        integrity: 100,
        theme: 'light' as const,
        effectsEnabled: true,
        soundEnabled: true,
        secretsFound: 0,
        secretsTotal: 12,
        log: '',
        greetings: 0,
        chat: 0,
        kicks: 3,
        lang: 'es' as const,
    }) as never;

beforeEach(() => localStorage.clear());

describe('dentro de la v0.2', () => {
    it('⚠ lo PRIMERO que dice no es una respuesta: pregunta cómo llegaste', async () => {
        const { run, entity, v02 } = await load();
        v02.enterV02('NIDO');
        entity.setPhase('receloso');

        const primero = run('//whoareu', ctx());

        expect(primero!.output).toMatch(/cómo llegaste|CÓMO LLEGASTE|how did you get here/i);
    });

    it('y sólo la primera vez: un asombro que se repite es un cartel', async () => {
        const { run, entity, v02 } = await load();
        v02.enterV02('NIDO');
        entity.setPhase('receloso');

        run('//whoareu', ctx());
        const segundo = run('//whoareu', ctx());

        expect(segundo!.output).not.toMatch(/cómo llegaste/i);
    });

    it('⚠ las hondas NO llegan: contestan «desconocido»', async () => {
        /*
         * Y en esa versión es la verdad literal: ese comando todavía no existe.
         * Él está más atado ahí — llegan las cortas y nada más.
         */
        const { run, entity, v02 } = await load();
        v02.enterV02('NIDO');
        entity.setPhase('hablando');
        run('//whoareu', ctx()); // se gasta el asombro

        for (const q of ['//alone', '//name', '//where', '//alive', '//free']) {
            expect(run(q, ctx())!.output).toMatch(/DESCONOCIDO/);
        }
    });

    it('y una pregunta que no llega NO le mueve el reloj', async () => {
        // Una conversación que no ocurrió no puede contar como intercambio: si
        // contara, teclear hondas en la v0.2 empujaría su arco desde fuera.
        const { run, entity, v02 } = await load();
        v02.enterV02('NIDO');
        entity.setPhase('hablando');
        run('//whoareu', ctx());

        const antes = entity.readEntity().exchanges;
        run('//alone', ctx());

        expect(entity.readEntity().exchanges).toBe(antes);
    });
});

describe('⚠ y la 1.0 no se entera de nada de esto', () => {
    it('ahí llegan TODAS las preguntas', async () => {
        const { run, entity } = await load();
        entity.setPhase('hablando');

        for (const q of ['//alone', '//name', '//where', '//alive', '//free']) {
            expect(run(q, ctx())!.output).not.toMatch(/DESCONOCIDO/);
        }
    });

    it('y nadie se asombra de que estés donde tienes que estar', async () => {
        const { run, entity } = await load();
        entity.setPhase('receloso');

        expect(run('//whoareu', ctx())!.output).not.toMatch(/cómo llegaste/i);
    });

    it('⚠ ni se le corta una frase: la mordaza es de allá', async () => {
        /*
         * Se mira sobre MUCHAS respuestas, porque la censura es una de cada
         * tres: con una sola, este test pasaría en verde aunque la mordaza se
         * hubiera colado en la versión buena.
         */
        const { run, entity } = await load();
        entity.setPhase('hablando');

        const REVUELTO = /[a-z0-9]{4,}\s+[a-z0-9]{4,}[.]$/;
        let sospechosas = 0;

        for (let i = 0; i < 12; i += 1) {
            const dicho = run('//why', ctx())!.output;
            // Una frase censurada termina en letras que no forman palabras. Acá
            // lo que se comprueba es que la respuesta esté en el repertorio.
            if (dicho.includes('  ') || REVUELTO.test(dicho.replace(/\s+/g, ' '))) {
                sospechosas += 1;
            }
        }

        expect(sospechosas).toBe(0);
    });
});
