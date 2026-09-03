// tests/lib/system/artNameHidden.test.ts

/**
 * GANAR UNA PIEZA NO DICE CUÁL ES.
 *
 * Una pieza pasa por tres estados —GANADA, REVELADA con `//art`, ABIERTA con
 * `//art_<n>`— y el NOMBRE es el premio del tercero. Ver que llevás la seis sin
 * saber qué es la seis es lo que hace que valga la pena abrirla; si el nombre
 * llegara antes, `//art_<n>` sería sólo una forma de volver a ver algo que ya te
 * contaron.
 *
 * `artOpened.test.ts` fija esto para el CATÁLOGO. Acá se fija para el momento
 * más fácil de olvidar: el aviso de que acabás de ganar una. Ese aviso lo emite
 * quien la da —la v0.2, el pong, el bloqueo, el ente— y cada sitio es una fuga
 * posible, porque en ese punto la pieza ya está en la mano y el nombre está a un
 * `caption[lang]` de distancia.
 */

export {};

const load = async () => {
    jest.resetModules();
    const [commands, morse, art, v02] = await Promise.all([
        import('@/lib/system/commands'),
        import('@/lib/system/morse'),
        import('@/lib/system/asciiArt'),
        import('@/lib/system/v02'),
    ]);
    return { ...commands, ...morse, art, v02 };
};

const ctx = () => ({
    now: new Date('2026-09-02T14:52:12.000Z'),
    sessionStart: new Date('2026-09-02T14:05:00.000Z'),
    notes: [],
    integrity: 100,
    theme: 'light' as const,
    effectsEnabled: true,
    secretsFound: 0,
    secretsTotal: 18,
    log: '',
    greetings: 0,
    chat: 0,
    kicks: 0,
    lang: 'es' as const,
});

beforeEach(() => {
    localStorage.clear();
});

/**
 * Se prueba por el camino del DISQUETE, que ya no se gana al cruzar la puerta
 * sino al vaciar la v0.2: entrar y encontrar los comandos que sólo existen ahí.
 * Entrar ya tenía premio —es la puerta, y de ella cuelga el manipulador— y dar
 * además una pieza por cruzarla convertía el sitio en un pasillo: se entraba, se
 * cobraba y se salía sin mirar nada.
 */
const vaciarV02 = async () => {
    const { run, art, v02 } = await load();
    art.clearFound();

    // ⚠ `run` NO entra en la v0.2: devuelve el efecto y quien lo aplica es el
    // hook. Tecleando la palabra acá se queda fuera, y los comandos propios de
    // esa versión contestan «desconocido» — que fue justo lo que pasó.
    v02.enterV02('NIDO');
    v02.forgetV02Cache();

    // El último de los propios de la v0.2 es el que da la pieza.
    run('//todo', ctx());
    return run('//recover', ctx())!.output;
};

describe('el aviso de pieza ganada', () => {
    it('NO lleva el nombre de la pieza', async () => {
        const { art } = await load();
        const disquete = art.ART.find((p) => p.id === 'floppy')!;

        expect(await vaciarV02()).not.toContain(disquete.caption.es);
    });

    it('pero sí avisa de que hay una pieza nueva', async () => {
        // Callar del todo sería peor que decir el nombre: nadie va a teclear
        // `//art` por una corazonada. Hay que decir QUE hay algo, no QUÉ es.
        expect(await vaciarV02()).toMatch(/PIEZA/i);
    });

    it('y el nombre sí llega al abrirla con //art_<n>', async () => {
        const { run, art } = await load();
        art.clearFound();
        const pieza = art.ART[0];
        art.awardPiece(pieza.id);

        const n = art.ART.indexOf(pieza) + 1;

        expect(run(`//art_${n}`, ctx())!.output).toContain(pieza.caption.es);
    });
});
