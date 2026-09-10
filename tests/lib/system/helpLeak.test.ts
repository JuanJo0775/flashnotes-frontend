// tests/lib/system/helpLeak.test.ts

/**
 * LA FUGA DE `//help` SÓLO SUELTA CALLEJONES SIN SALIDA.
 *
 * `//help` es la red de seguridad del proyecto: insistiendo, todo acaba
 * encontrándose. Pero soltaba CUALQUIER comando escondido, y eso tenía tres
 * problemas de distinta gravedad:
 *
 *   · `//reset` BORRA TU PROGRESO, y la fuga te lo ponía delante sin contexto.
 *     Es el único comando destructivo de la app y llegaba de regalo.
 *   · Los ESLABONES INTERMEDIOS salían sueltos: `//attach_6` antes que `//ps`,
 *     `//art_1` antes que `//art`. Se niegan a existir fuera de orden, así que la
 *     fuga regalaba un nombre que todavía no servía para nada.
 *   · Las PUERTAS —`//hi`, `//diag`, `//art`, `//history`, `//panic`— abren capas
 *     enteras. Regalarlas es regalar el juego, y además cada una ya tiene su
 *     propio camino para descubrirse.
 *
 * Queda lo que es curioso y no abre nada: se lee, se sonríe, y ahí termina.
 *
 * ⚠ `//reboot` ES LA EXCEPCIÓN QUE CONFIRMA EL CRITERIO. Hace algo grande —el
 * ciclo entero de apagado y encendido— y aun así cumple las tres reglas: no
 * destruye nada, no necesita ningún comando antes, y no abre ninguna capa. Lo
 * que ENSEÑA es el arranque, que ya viste al llegar.
 *
 * Lo que regala es OÍRLO. Una recarga del navegador tiene el mismo dibujo y
 * llega muda, porque destruye el documento y el nuevo nace sin permiso para
 * sonar. Este comando no navega a ninguna parte, así que el ciclo suena como se
 * ve — y eso vale la pena que se encuentre.
 */

import { LEAKABLE, leakableCommands } from '@/lib/system/commands';

/** El registro entero, recargado, para poder mirarlo desde los dos lados. */
const load = async () => {
    jest.resetModules();
    return import('@/lib/system/commands');
};

/** Lo mínimo que `//help` mira del contexto. */
const ctx = () =>
    ({
        now: new Date('2026-09-10T14:52:00'),
        sessionStart: new Date('2026-09-10T14:00:00'),
        notes: [],
        integrity: 100,
        theme: 'light' as const,
        effectsEnabled: true,
        soundEnabled: true,
        secretsFound: 0,
        secretsTotal: 33,
        log: '',
        greetings: 0,
        chat: 0,
        kicks: 0,
        lang: 'es' as const,
    }) as never;

describe('qué puede filtrarse', () => {
    it('sólo los callejones sin salida', () => {
        expect([...LEAKABLE].sort()).toEqual(
            [
                '//uptime',
                '//sudo',
                '//log',
                '//diag',
                '//date_off',
                '//reboot',
                '//history',
            ].sort()
        );
    });

    it('NUNCA el que borra todo', () => {
        // Es la razón por la que existe la lista blanca.
        expect(LEAKABLE).not.toContain('//reset');
    });

    it('ni las puertas que abren una capa entera', () => {
        for (const puerta of ['//hi', '//art', '//panic', '//ps']) {
            expect(LEAKABLE).not.toContain(puerta);
        }
    });

    it('ni los eslabones que no sirven fuera de orden', () => {
        for (const eslabon of ['//attach_6', '//art_1', '//keep']) {
            expect(LEAKABLE).not.toContain(eslabon);
        }
    });

    it('ni los CUATRO DEL ENTE, que estan reservados', () => {
        // Son la cadena del lore profundo: un nombre suelto no significa nada
        // hasta que sabes a quien le estas hablando.
        for (const ente of ['//hi', '//whoareu', '//howareu', '//whoami']) {
            expect(LEAKABLE).not.toContain(ente);
        }
    });

    it('y todos los de la lista existen de verdad', () => {
        // Un nombre mal escrito acá deja la fuga muda sin que nada falle.
        expect(leakableCommands().sort()).toEqual([...LEAKABLE].sort());
    });
});

describe('⚠ quién ocupa hueco en la ayuda, y quién no', () => {
    /*
     * Se pidió leyendo la lista: «el whoareu y howareu no deben estar, son
     * variaciones para hablar con el ente; el único del ente que aparecería es
     * el hi. Y el comando sigo no está, cuando se descubre debería aparecer».
     *
     * La frontera es de QUÉ CLASE de cosa son. Un comando escondido es algo que
     * la máquina TIENE y no anuncia: su tachado es un hueco que se destapa al
     * usarlo. Una variante de pregunta no es eso — es una manera de decirle algo
     * a alguien, y ésas no se anuncian en ninguna parte: se prueban.
     */
    /*
     * ⚠ EL DESBLOQUEO VIVE EN EL ALMACENAMIENTO Y SOBREVIVE AL CASO. Sin esto,
     * el test que descubre `//sigo` se lo deja descubierto al siguiente, y el
     * siguiente —que comprueba justo lo contrario— falla por un motivo que no
     * tiene nada que ver con lo que mide.
     */
    beforeEach(() => localStorage.clear());

    const ayuda = async (): Promise<string> => {
        const { run } = await load();
        // El desplante de una de cada seis se salta con azar fijo.
        return run('//help', ctx(), () => 0.9)!.rows!.map((r) => ('text' in r ? r.text : '')).join('\n');
    };

    it('⚠ el saludo sí, porque es una puerta', async () => {
        /*
         * La fachada contesta a `//hi` a gritos y acaba echándote: eso es algo
         * que la máquina TIENE, así que ocupa su hueco tachado y se destapa al
         * usarlo. Se mira por la fuga, que es la lista de los que se pueden
         * encontrar.
         */
        const { hiddenCommandNames } = await load();

        expect(hiddenCommandNames()).toContain('//hi');
    });

    it('así que no salen en la lista, ni tachadas', async () => {
        const lista = await ayuda();

        expect(lista).not.toContain('//whoareu');
        expect(lista).not.toContain('//howareu');
    });

    it('⚠ ni las sueltan las ventanas de error', async () => {
        // Una fuga que soltara una variante estaría enseñando el repertorio del
        // ente, que es justo lo que no se anuncia.
        const { hiddenCommandNames } = await load();

        expect(hiddenCommandNames()).not.toContain('//whoareu');
        expect(hiddenCommandNames()).not.toContain('//howareu');
    });

    it('⚠ y `//sigo` SÍ aparece al descubrirlo', async () => {
        /*
         * Estaba resuelto a mano dentro de `run`, así que no ocupaba hueco en la
         * ayuda y no había forma de que apareciera nunca. Se pidió al leer la
         * lista: «el comando sigo no está; cuando se descubre debería aparecer».
         *
         * Se comprueba por el camino de verdad: descubrirlo es HABERLO USADO.
         */
        const { run } = await load();
        const { markUsed } = await import('@/lib/system/commandUnlock');

        expect(await ayuda()).not.toContain('//sigo');

        markUsed('//sigo');

        expect(await ayuda()).toContain('//sigo');
        expect(run).toBeDefined();
    });

    it('pero se niega a existir sin la nota, y NO destapa su hueco', async () => {
        /*
         * Sin la nota la palabra no significa nada: teclearla por casualidad no
         * puede dar nada, porque el regalo es por haber vuelto y haberle hecho
         * caso. Es el mismo `denied` de `//attach_*`.
         */
        const { run } = await load();

        const r = run('//sigo', ctx());

        expect(r!.output).toMatch(/DESCONOCIDO|UNKNOWN/i);
        expect(await ayuda()).not.toContain('//sigo');
    });
});
