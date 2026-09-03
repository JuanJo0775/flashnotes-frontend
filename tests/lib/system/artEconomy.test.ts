// tests/lib/system/artEconomy.test.ts

/**
 * EL MAPA DE CAMINOS, Y LO QUE FALTA POR CABLEAR.
 *
 * `artEarned.test.ts` fija que cada pieza tiene SU camino y que no se repiten.
 * Acá se fija algo distinto y más frágil: que los caminos son LOS QUE SON, y que
 * los que todavía no existen están declarados como deuda y no como olvido.
 *
 * Sin este test, quitar un `awardFrom` de un componente no rompe nada: la pieza
 * simplemente deja de poder ganarse y nadie se entera hasta que alguien
 * intenta completar la colección.
 */

import { ART, ART_TOTAL, ART_SOURCES, awardPiece, clearFound, onlyMissing } from '@/lib/system/asciiArt';

beforeEach(() => {
    localStorage.clear();
    clearFound();
});

describe('quién da qué', () => {
    it('la polilla ES el bug, y el ojo el ente', () => {
        // La primera avería informática documentada fue un bicho dentro de un
        // relé: caer en el fallo total es ver uno de verdad.
        expect(ART_SOURCES.blackout).toBe('moth');
        expect(ART_SOURCES.entity).toBe('eye');
    });

    it('entrar en el fallo total y resolverlo son DOS logros', () => {
        // Caer ahí dentro le pasa a cualquiera; salir por la puerta buena, no.
        // Y el faro dejó de premiar «pasar por el bloqueo»: un tercer premio
        // por el mismo sitio era el mismo logro cobrado tres veces.
        expect(ART_SOURCES['blackout-puzzle']).toBe('key');
        expect(ART_SOURCES.guidance).toBe('lighthouse');
    });

    it('el arbusto mide el RATO y la pluma el VOLUMEN', () => {
        // Antes las dos miraban los caracteres escritos con dos umbrales
        // distintos, así que se ganaban casi juntas y ninguna significaba nada.
        expect(ART_SOURCES['long-session']).toBe('shrub');
        expect(ART_SOURCES['full-note']).toBe('quill');
    });

    it('el cuaderno firmado es el que cierra la caja', () => {
        expect(ART_SOURCES.everything).toBe('shelf');
    });
});

describe('la pieza que cierra la caja', () => {
    it('no cuenta mientras falte cualquier otra', () => {
        for (const p of ART.slice(0, ART_TOTAL - 3)) awardPiece(p.id);

        expect(onlyMissing('shelf')).toBe(false);
    });

    it('cuenta cuando ya no falta ninguna más que ella', () => {
        for (const p of ART) if (p.id !== 'shelf') awardPiece(p.id);

        expect(onlyMissing('shelf')).toBe(true);
    });

    it('y NO se exige a sí misma', () => {
        // Pedir «las dieciséis» dejaría el cuaderno inalcanzable para siempre:
        // haría falta tenerlo para poder ganarlo.
        for (const p of ART) awardPiece(p.id);

        expect(onlyMissing('shelf')).toBe(false);
    });
});

describe('lo que falta por cablear', () => {
    it('está declarado, y es exactamente esto', async () => {
        /*
         * ⚠ SI ESTE TEST FALLA, MIRÁ CUÁL LADO CAMBIÓ.
         *
         * Si cableaste un camino, quitalo de la lista y celebralo. Si un
         * `awardFrom` desapareció de un componente, acabás de dejar una pieza
         * inalcanzable sin querer — que es el fallo que este test existe para
         * cazar, porque no rompe nada visible.
         */
        const PENDIENTES = ['entity', 'reserved-tape'];

        const { readFileSync, readdirSync, statSync } = await import('node:fs');
        const { join } = await import('node:path');

        const fuentes: string[] = [];
        const recorrer = (dir: string) => {
            for (const nombre of readdirSync(dir)) {
                const ruta = join(dir, nombre);
                if (statSync(ruta).isDirectory()) recorrer(ruta);
                else if (/\.tsx?$/.test(nombre) && !ruta.endsWith('asciiArt.ts')) {
                    fuentes.push(readFileSync(ruta, 'utf8'));
                }
            }
        };
        recorrer('src');

        /*
         * Se toma TODO lo entrecomillado dentro de cada `awardFrom(...)`, no lo
         * que sigue al paréntesis.
         *
         * El pong elige con un ternario —`awardFrom(limpio ? 'pong' :
         * 'pong-degraded')`— y una expresión que sólo mire el primer literal
         * daba por no cableado el otro. Dos falsos positivos en un test que
         * existe para cazar olvidos son peor que no tenerlo.
         */
        const codigo = fuentes.join('\n');
        const cableadas = new Set<string>();
        for (const llamada of codigo.matchAll(/awardFrom\(([^)]*)\)/g)) {
            // ⚠ CON DÍGITOS: `'v02'` los lleva, y con `[a-z-]` a secas este
            // test daba por no cableada una pieza que sí lo estaba.
            for (const literal of llamada[1].matchAll(/'([a-z0-9-]+)'/g)) {
                cableadas.add(literal[1]);
            }
        }

        const sinCablear = ART.map((p) => p.source).filter((s) => !cableadas.has(s));

        expect(sinCablear.sort()).toEqual([...PENDIENTES].sort());
    });
});

describe('«todos los comandos» significa USADOS, no vistos', () => {
    /*
     * La terminal se gana cuando no queda ningún comando escondido por
     * descubrir — y descubrir es HABERLO TECLEADO, no haberlo leído en una
     * lista. `//help` los enseña revueltos y `//ps` menciona alguno: si eso
     * contara, la pieza se ganaría mirando.
     *
     * Quien lo garantiza es que `markUsed` corre DESPUÉS de resolver el comando
     * y sólo si no se negó a existir. Este test lo fija desde fuera, porque es
     * una condición que se afloja sin querer al mover una línea.
     */
    it('listarlos en //help no desbloquea ninguno', async () => {
        jest.resetModules();
        const { run } = await import('@/lib/system/commands');
        const { readUsed, clearUsed } = await import('@/lib/system/commandUnlock');
        clearUsed();

        run('//help', {
            now: new Date(),
            sessionStart: new Date(),
            notes: [],
            integrity: 100,
            theme: 'light',
            effectsEnabled: true,
            secretsFound: 0,
            secretsTotal: 18,
            log: '',
            greetings: 0,
            chat: 0,
            kicks: 0,
            lang: 'es',
        }, () => 0.5);

        expect(readUsed().size).toBe(0);
    });
});
