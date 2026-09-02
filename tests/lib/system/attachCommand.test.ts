// tests/lib/system/attachCommand.test.ts
import { run, type CommandContext } from '@/lib/system/commands';

const ctx = (over: Partial<CommandContext> = {}): CommandContext => ({
    now: new Date('2026-09-02T14:52:12.000Z'),
    sessionStart: new Date('2026-09-02T14:05:00.000Z'),
    notes: [],
    integrity: 100,
    theme: 'light',
    effectsEnabled: true,
    secretsFound: 3,
    secretsTotal: 15,
    log: '',
    greetings: 0,
    lang: 'es' as const,
    ...over,
});

/** `run` devuelve null si la línea no era un comando; acá siempre lo es. */
// El azar en 0,5 esquiva las ramas aleatorias de `//help`.
const corre = (linea: string) => run(linea, ctx(), () => 0.5)!;

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
