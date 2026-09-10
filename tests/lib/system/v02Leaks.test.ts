// tests/lib/system/v02Leaks.test.ts

/**
 * NINGUNA FUGA SUELTA UN COMANDO QUE NO EXISTE DONDE ESTÁS.
 *
 * Las ventanas de error del fallo cromático nombran de vez en cuando un comando
 * escondido, en lugar de quejarse del vídeo. Es la fuga que menos se parece a
 * una pista: parece que al sistema se le escapó.
 *
 * Pero la lista era **fija**, calculada una vez al cargar el módulo, y no sabía
 * de versiones. Dentro de la v0.2 soltaba comandos de la v1.0 — que ahí no
 * existen y contestan «desconocido». Una pista que no lleva a ninguna parte es
 * peor que ninguna pista: enseña que las pistas no valen.
 */

export {};

const load = async () => {
    jest.resetModules();
    const [commands, v02] = await Promise.all([
        import('@/lib/system/commands'),
        import('@/lib/system/v02'),
    ]);
    return { ...commands, v02 };
};

beforeEach(() => localStorage.clear());

describe('lo que sueltan las ventanas de error', () => {
    it('en la v1.0 no nombra los exclusivos de la v0.2', async () => {
        const { hiddenCommandNames } = await load();

        // `//recover` y `//todo` sólo existen en la versión vieja: nombrarlos
        // acá manda a alguien a teclear algo que va a fallar.
        expect(hiddenCommandNames()).not.toContain('//recover');
        expect(hiddenCommandNames()).not.toContain('//todo');
    });

    it('en la v0.2 no nombra los que esa versión no tiene', async () => {
        const { hiddenCommandNames, v02 } = await load();
        v02.enterV02('NIDO');

        const sueltos = hiddenCommandNames();

        for (const nombre of ['//hi', '//date_off', '//reset']) {
            expect(sueltos).not.toContain(nombre);
        }
    });

    it('⚠ pero los de la colección sí, porque ahí SÍ existen', async () => {
        /*
         * `//art` estaba en la lista de arriba y salió de ella el día que la
         * colección pasó a existir en la v0.2 — a medio escribir, que es otra
         * cosa. Es el mismo caso que `//reboot`: la pestaña de la colección se
         * VE en esa versión, así que un comando que conteste «comando
         * desconocido» son dos versiones de la misma máquina discutiendo.
         *
         * Lo que la fuga no puede hacer es mandar a alguien a teclear algo que
         * va a fallar, y acá no falla: contesta, y contesta mal a propósito.
         */
        const { hiddenCommandNames, v02 } = await load();
        v02.enterV02('NIDO');

        const sueltos = hiddenCommandNames();

        expect(sueltos).toContain('//art');
        expect(sueltos).toContain('//keep');
    });

    it('en la v0.2 sí puede nombrar los suyos', async () => {
        const { hiddenCommandNames, v02 } = await load();
        v02.enterV02('NIDO');

        // La fuga tiene que seguir sirviendo para algo: si en la v0.2 se quedara
        // sin nada que soltar, sus dos comandos exclusivos dependerían sólo de
        // la basura de la papelera y del marcador de la nota vacía.
        expect(hiddenCommandNames()).toContain('//recover');
        expect(hiddenCommandNames()).toContain('//todo');
    });

    it('nunca se queda vacía en ninguna de las dos versiones', async () => {
        const { hiddenCommandNames, v02 } = await load();

        expect(hiddenCommandNames().length).toBeGreaterThan(0);
        v02.enterV02('NIDO');
        expect(hiddenCommandNames().length).toBeGreaterThan(0);
    });
});

describe('⚠ y el reinicio, que sí existe en las dos', () => {
    /*
     * Era la incoherencia más vieja de esa versión: el BOTÓN de reinicio se ve y
     * funciona en el panel de abajo, y el comando contestaba «comando
     * desconocido». Dos versiones de la misma máquina discutiendo entre ellas.
     *
     * Se arregló añadiendo el comando y no quitando el botón: apagar y encender
     * es lo más viejo que sabe hacer un equipo, y es lo último que se le
     * quitaría. Lo que cambia entre versiones no es que exista — es lo que se VE
     * mientras vuelve, y de eso va `bootScript` con sus dos repartos.
     */
    /** Lo mínimo que `//reboot` mira del contexto: nada. */
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
            kicks: 0,
            lang: 'es' as const,
        }) as never;

    it('se puede teclear dentro de la v0.2', async () => {
        const { run, v02 } = await load();
        v02.enterV02('NIDO');

        const r = run('//reboot', ctx());

        expect(r).not.toBeNull();
        expect(r!.effect).toEqual({ kind: 'reboot' });
    });

    it('y sigue existiendo en la 1.0, igual que siempre', async () => {
        const { run } = await load();

        expect(run('//reboot', ctx())!.effect).toEqual({ kind: 'reboot' });
    });
});
