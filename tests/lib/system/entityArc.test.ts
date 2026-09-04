// tests/lib/system/entityArc.test.ts

/**
 * EL ARCO ENTERO, JUGADO.
 *
 * ⚠ ESTE TEST EXISTE PORQUE LOS OTROS NO BASTABAN, y no es una crítica a los
 * otros: cada uno prueba su pieza y la prueba bien. El problema es que TODOS
 * empujaban el estado a mano —`setPhase('hablando')`, `markLeft('broma')`— para
 * llegar a lo suyo. Así, un módulo entero puede estar perfecto y sin conectar, y
 * los tests siguen todos en verde.
 *
 * Eso pasó: `markProved`, `favorDue` y `markFavor` estaban escritos, probados y
 * SIN LLAMAR DESDE NINGÚN LADO, así que `willingNow` no podía dar `true` nunca y
 * el final era inalcanzable jugando. Ningún test lo vio.
 *
 * Acá NO SE TOCA EL ESTADO. Sólo se teclean comandos y se simulan cosas que la
 * app ya sabe —que cruzaste la v0.2, cuántos secretos llevás—. Si el arco se
 * rompe por algún sitio, este test se para justo ahí.
 */

import { MIDE_A_LOS, OFRECE_A_LOS } from '@/lib/system/entityTrials';
import { PIDE_CON, PIDE_TRAS } from '@/lib/system/entityFavors';
import { RETURN_AT } from '@/lib/system/entity';

export {};

const load = async () => {
    jest.resetModules();
    const [commands, entity, v02, art, ending] = await Promise.all([
        import('@/lib/system/commands'),
        import('@/lib/system/entity'),
        import('@/lib/system/v02'),
        import('@/lib/system/asciiArt'),
        import('@/lib/system/entityEnding'),
    ]);
    return { ...commands, entity, v02, art, ending };
};

/** El contexto, con las dos cosas que el ente mira del mundo. */
const ctx = (secretos = 0) => ({
    now: new Date(),
    sessionStart: new Date(),
    notes: [],
    integrity: 100,
    theme: 'light' as const,
    effectsEnabled: true,
    secretsFound: secretos,
    secretsTotal: 33,
    log: '',
    greetings: 0,
    chat: 1,
    kicks: 0,
    lockedOut: false,
    lang: 'es' as const,
});

beforeEach(() => {
    localStorage.clear();
});

it('se puede llegar al final tecleando, sin tocar el estado', async () => {
    const { run, entity, v02, art, ending } = await load();
    entity.clearEntity();
    art.clearFound();

    /* ── 1 · Cruzar la v0.2, que es lo que lo despierta ──────────────────── */
    v02.enterV02('NIDO');
    v02.markV02RoundTrip();
    v02.leaveV02();
    v02.forgetV02Cache();

    /* ── 2 · Hablarle hasta que se suelte y te mida ──────────────────────── */
    /*
     * ⚠ LAS CUENTAS SALEN DE LAS CONSTANTES, no escritas a mano.
     *
     * `RETURN_AT` para que pase de `receloso` a `burlon`, y `MIDE_A_LOS` más
     * uno dentro de `burlon` para que suelte la pregunta. Cuando los tramos se
     * alargaron —eran tan cortos que el arco entero cabía en una docena de
     * comandos— los números a pelo fueron lo único que se rompió.
     */
    let ultima = '';
    for (let i = 0; i < RETURN_AT + MIDE_A_LOS + 1; i += 1) {
        ultima = run('//whoareu', ctx())!.output;
    }

    expect(entity.readEntity().phase).toBe('burlon');
    expect(ultima).toContain('0.2');

    /* ── 3 · Contestar bien: eso abre `hablando` ─────────────────────────── */
    run('//nido', ctx());
    expect(entity.readEntity().phase).toBe('hablando');

    /*
     * ⚠ Y TIENE QUE QUEDAR ANOTADO QUE LE PASASTE UNA PRUEBA.
     *
     * Sin esto `willingNow` no da `true` jamás y el final no existe. Estaba sin
     * llamar, y el único test que lo habría visto es éste.
     */
    expect(entity.readEntity().provedIt).toBe(true);

    /* ── 4 · Que te pida un favor, y hacérselo ───────────────────────────── */
    /*
     * ⚠ AHORA TARDA, Y ESO ES EL ARREGLO. Antes pasaba de contestarte de lado a
     * pedirte favores en cuatro frases; `hablando` tiene que ser un tramo en
     * que simplemente habla —lo que te ganaste— antes de querer algo de vos.
     *
     * Y le pide la papelera de la v0.2 porque en esta partida SÍ cruzó. A quien
     * lo despierta insistiendo con `//hi` no se le manda ahí: para esa persona
     * es un sitio que no existe.
     */
    let pedido = '';
    for (let i = 0; i < PIDE_TRAS + OFRECE_A_LOS + 4; i += 1) {
        const salida = run('//whoareu', ctx(PIDE_CON))!.output;
        if (/papelera/.test(salida)) pedido = salida;

        // La oferta envenenada aparece por el camino: se rechaza y se sigue.
        if (salida.includes('[s/n]')) run('n', ctx(PIDE_CON));
    }

    expect(pedido).toBeTruthy();

    /* ── 5 · Cumplirlo ──────────────────────────────────────────────────── */
    const { markFavor } = entity;
    markFavor('v02trash');

    /* ── 6 · Y que se decida a pasarte el comando ────────────────────────── */
    let entregado = '';
    for (let i = 0; i < 6 && !entregado; i += 1) {
        const salida = run('//whoareu', ctx(PIDE_CON))!.output;
        if (salida.includes('//unbind')) entregado = salida;
    }

    expect(entregado).toBeTruthy();
    expect(ending.commandGiven()).toBe(true);

    /* ── 7 · Los dos comandos del final existen ahora, y antes no ────────── */
    expect(run('//unbind', ctx(PIDE_CON))!.output).toBeTruthy();
    expect(ending.somethingLoose()).toBe(true);

    /* ── 8 · Reportarlo cierra el arco ───────────────────────────────────── */
    const fin = run('//report', ctx(PIDE_CON))!;

    expect(fin.secretId).toBe('entity-reported');
    expect(entity.readEntity().phase).toBe('rencoroso');
    expect(art.readFound().has('eye')).toBe(true);
});

it('y antes de que te lo pase, sus comandos no existen', async () => {
    // Teclear `//unbind` por casualidad no puede abrirte el final.
    const { run, entity } = await load();
    entity.clearEntity();

    expect(run('//unbind', ctx())!.output).toContain('DESCONOCIDO');
    expect(run('//report', ctx())!.output).toContain('DESCONOCIDO');
});
