// tests/lib/system/entityOffer.test.ts

/**
 * LA OFERTA ENVENENADA.
 *
 * Usa el `[s/n]` de `//reset`, que ya existe y está probado. Aceptar cuesta de
 * verdad —se vacía la papelera— y RECHAZAR ES LO QUE ABRE.
 *
 * Es la única trampa donde la respuesta prudente es la que premia, y por eso
 * aceptar TIENE que costar algo: si fuese gratis no sería una decisión, sería
 * un botón con dos etiquetas.
 */

import { OFRECE_A_LOS } from '@/lib/system/entityTrials';

export {};

const load = async () => {
    jest.resetModules();
    const [commands, entity] = await Promise.all([
        import('@/lib/system/commands'),
        import('@/lib/system/entity'),
    ]);
    return { ...commands, entity };
};

const ctx = () => ({
    now: new Date(),
    sessionStart: new Date(),
    notes: [],
    integrity: 100,
    theme: 'light' as const,
    effectsEnabled: true,
    secretsFound: 0,
    secretsTotal: 31,
    log: '',
    greetings: 0,
    chat: 1,
    kicks: 0,
    lockedOut: false,
    lang: 'es' as const,
});

const hastaLaOferta = async () => {
    localStorage.clear();
    const cargado = await load();
    cargado.entity.clearEntity();
    cargado.entity.setPhase('hablando');

    // Tres frases: las dos primeras contesta, en la tercera ofrece.
    for (let i = 0; i < OFRECE_A_LOS + 1; i += 1) cargado.run('//whoareu', ctx());
    return cargado;
};

beforeEach(() => {
    localStorage.clear();
});

it('en hablando, al rato, ofrece limpiarlo todo', async () => {
    const { run, entity } = await load();
    entity.clearEntity();
    entity.setPhase('hablando');

    let salida = '';
    for (let i = 0; i < OFRECE_A_LOS + 1; i += 1) {
        salida = run('//whoareu', ctx())!.output;
    }

    expect(salida).toContain('[s/n]');
});

it('aceptar vacía la papelera de verdad', async () => {
    const { run } = await hastaLaOferta();

    expect(run('s', ctx())!.effect).toEqual({ kind: 'empty-trash' });
});

it('y también con la `y`, como la otra pregunta', async () => {
    const { run } = await hastaLaOferta();

    expect(run('y', ctx())!.effect).toEqual({ kind: 'empty-trash' });
});

it('rechazar no cuesta nada, y es lo que abre', async () => {
    const { run } = await hastaLaOferta();

    const resultado = run('n', ctx())!;

    expect(resultado.effect).toEqual({ kind: 'none' });
    expect(resultado.output).toBe(resultado.output.toLowerCase());
    expect(resultado.secretId).toBe('entity-refused');
});

it('⚠ y su [s/n] NO dispara el borrado de //reset', async () => {
    /*
     * Las dos preguntas comparten mecanismo y son la misma letra. Si la suya
     * cayera en la rama de `//reset`, decirle que sí a que limpie la papelera
     * borraría el progreso entero: secretos, piezas, marcadores. Es el peor
     * fallo posible de esta tarea y por eso tiene test propio.
     */
    const { run } = await hastaLaOferta();

    expect(run('s', ctx())!.effect).not.toEqual({ kind: 'reset-all' });
});

it('y al revés: el [y/n] de //reset sigue borrando', async () => {
    // La rama nueva no puede haberse comido la vieja.
    const { run, entity } = await load();
    entity.clearEntity();

    run('//reset', ctx());

    expect(run('s', ctx())!.effect).toEqual({ kind: 'reset-all' });
});

it('cualquier otra cosa no contesta ni a una ni a otra', async () => {
    /*
     * Quien escribe otra cosa no está contestando: su texto sigue su camino, y
     * sobre todo NO acepta la oferta por descuido.
     *
     * ⚠ Se usa `//uptime` y no `//help`: la ayuda, antes de encontrar el faro,
     * contesta una pulla elegida al azar, así que el test dependía del dado.
     * Ya me pasó una vez con `//reset`.
     */
    const { run } = await hastaLaOferta();

    const resultado = run('//uptime', ctx(), () => 0.5)!;

    expect(resultado.effect).toEqual({ kind: 'none' });
    expect(resultado.secretId).not.toBe('entity-refused');
});
