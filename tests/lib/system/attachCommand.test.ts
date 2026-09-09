// tests/lib/system/attachCommand.test.ts
import { clearUsed } from '@/lib/system/commandUnlock';
import { run, type CommandContext } from '@/lib/system/commands';

const ctx = (over: Partial<CommandContext> = {}): CommandContext => ({
    now: new Date('2026-09-02T14:52:12.000Z'),
    sessionStart: new Date('2026-09-02T14:05:00.000Z'),
    notes: [],
    integrity: 100,
    theme: 'light',
    effectsEnabled: true,
    soundEnabled: true,
    secretsFound: 3,
    secretsTotal: 15,
    log: '',
    greetings: 0,
    chat: 0,
    kicks: 0,
    lang: 'es' as const,
    ...over,
});

/** `run` devuelve null si la línea no era un comando; acá siempre lo es. */
// El azar en 0,5 esquiva las ramas aleatorias de `//help`.
const corre = (linea: string) => run(linea, ctx(), () => 0.5)!;

beforeEach(() => {
    // Usar un comando escondido lo desbloquea, y eso persiste en
    // `localStorage`: sin limpiarlo, un test contamina al siguiente.
    localStorage.clear();
    clearUsed();
});

describe('//ps · la única puerta al vsync-test', () => {
    // `//ps` era decoración pura: listaba cinco procesos y ya. Ahora es lo único
    // que delata que hay un juego, así que la tabla tiene que ganarse la lectura.
    test('lista el sexto proceso', () => {
        expect(corre('//ps').output).toContain('vsync-test');
    });

    test('el sexto corre a velocidad de fotograma', () => {
        // 16 ms son 60 fps: no hay nada más en la app que dibuje tan seguido, y
        // ÉSA es la pista. El más rápido de los otros cinco va a 250 ms.
        expect(corre('//ps').output).toMatch(/vsync-test\s+16ms/);
    });

    test('sigue listando los cinco de siempre', () => {
        const salida = corre('//ps').output;

        for (const p of [
            'autosave',
            'network-poll',
            'scanline',
            'meter-batch',
            'glitch-ambient',
        ]) {
            expect(salida).toContain(p);
        }
    });

    test('da el verbo para adjuntarse', () => {
        expect(corre('//ps').output).toContain('//attach_');
    });

    test('pero NO regala qué PID es el bueno', () => {
        // El reparto es deliberado: la pista se entrega, la observación es tuya.
        // Adivinar «attach» a ciegas sería imposible; darte el 6 sería regalarte
        // el hallazgo.
        expect(corre('//ps').output).not.toContain('//attach_6');
    });

    test('sigue siendo un listado y no un lanzador', () => {
        expect(corre('//ps').effect.kind).toBe('none');
    });
});

describe('//attach_6 · abre el juego', () => {
    /*
     * ⚠ HAY QUE HABER PASADO POR `//ps`.
     *
     * Estos tests daban por hecho que `//attach_6` resolvía a secas, y por eso
     * no cazaron que la puerta estaba abierta de par en par: el comando existía
     * lo hubieras leído o no, y quien probara `//attach_1` a ciegas se topaba
     * con la lista de procesos sin haberla pedido. Lo que se está probando acá
     * es la segunda mitad del camino; la primera la cubre `attachGate`.
     */
    beforeEach(() => {
        corre('//ps');
    });

    test('arranca el pong', () => {
        expect(corre('//attach_6').effect).toEqual({ kind: 'play-pong' });
    });

    test('cuenta como secreto encontrado', () => {
        expect(corre('//attach_6').secretId).toBe('pong');
    });

    test('no dice «comando desconocido»', () => {
        expect(corre('//attach_6').output).not.toMatch(/DESCONOCIDO/i);
    });
});

describe('//attach_N · el resto de procesos contesta', () => {
    // Una vez leída la lista, los procesos SON algo: negarse con su nombre es la
    // mitad de la gracia. Sin haberla leído callan todos igual (`attachGate`).
    beforeEach(() => {
        corre('//ps');
    });

    test('adjuntarse al auto-guardado recibe un reproche', () => {
        const r = corre('//attach_1');

        expect(r.effect.kind).toBe('none');
        expect(r.output).toMatch(/AUTO-GUARDADO/i);
    });

    test('los otros procesos del sistema tampoco se dejan', () => {
        for (const pid of [2, 3, 4, 5]) {
            expect(corre(`//attach_${pid}`).effect.kind).toBe('none');
        }
    });

    test('cada proceso contesta con su propio nombre', () => {
        expect(corre('//attach_3').output).toMatch(/scanline/i);
    });

    test('un PID que no existe lo dice', () => {
        const r = corre('//attach_99');

        expect(r.effect.kind).toBe('none');
        expect(r.output).toMatch(/99/);
    });

    test('sólo el 6 marca el secreto', () => {
        expect(corre('//attach_1').secretId).toBeUndefined();
    });
});

describe('//attach · el prefijo suelto', () => {
    // Es un token único a propósito: en terminal el guion bajo hace de espacio y
    // los espacios de verdad separan argumentos. Sin argumento que parsear, no
    // puede romperse por un espacio de más.
    test('sin PID no es un comando válido', () => {
        expect(corre('//attach').output).toMatch(/DESCONOCIDO/i);
    });

    test('con el PID separado por espacio tampoco', () => {
        expect(corre('//attach 6').output).toMatch(/DESCONOCIDO/i);
    });

    test('con letras en vez de número tampoco', () => {
        expect(corre('//attach_seis').output).toMatch(/DESCONOCIDO/i);
    });
});

describe('//help · no delata el juego', () => {
    // Que `//attach_*` no salga en la ayuda es lo que hace que `//ps` sea la
    // única puerta. Listarlo convertiría el hallazgo en una lectura.
    test('no lista attach', () => {
        expect(corre('//help').output).not.toContain('attach');
    });

    test('sigue listando lo básico', () => {
        // Los avanzados ya no salen —ver commands.test.ts— pero la puerta de
        // entrada tiene que seguir estando.
        const salida = corre('//help').output;

        for (const c of ['//help', '//version', '//ls']) {
            expect(salida).toContain(c);
        }
    });
});

describe('⚠ el token es UNO, no una familia', () => {
    /*
     * REPORTADO JUGANDO: «el //attach_06 se muestra en ventana, y no quiero eso».
     *
     * Con `\d+` a secas, `//attach_06` —y `//attach_006`, y los que quieras—
     * abrian el vsync-test igual que el token bueno, porque `Number('06')` es 6.
     *
     * No es quisquillosidad: la tabla de `//ps` escribe los PID SIN rellenar, asi
     * que `//attach_6` es lo unico que ahi se lee. Un token «unico» que acepta
     * infinitas escrituras deja de ser un token, y lo que se gana adivinando
     * ceros no es un hallazgo.
     */
    beforeEach(() => {
        // La puerta pide haber pasado por `//ps`.
        corre('//ps');
    });

    test('el PID tal como lo escribe la tabla abre el juego', () => {
        expect(corre('//attach_6').effect.kind).toBe('play-pong');
    });

    test.each([['//attach_06'], ['//attach_006'], ['//attach_0006']])(
        '⚠ pero «%s» no es ese PID, y no abre nada',
        (linea) => {
            const r = corre(linea);

            expect(r.effect.kind).not.toBe('play-pong');
        }
    );

    test('⚠ y contesta lo mismo que una palabra inventada', () => {
        /*
         * Un «casi» seria peor que nada: confirmaria que ahi hay algo y
         * convertiria la puerta cerrada en un cartel.
         */
        // Se tapa el nombre que la respuesta repite: lo que tiene que ser
        // identico es la FORMA, no el eco de lo que tecleaste.
        const sinNombre = (t: string) => t.replace(/: [^.]+\./, ': X.');

        const inventada = corre('//qwerty').output;
        const conCeros = corre('//attach_06').output;

        expect(sinNombre(conCeros)).toBe(sinNombre(inventada));
    });
});
