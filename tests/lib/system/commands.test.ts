// tests/lib/system/commands.test.ts
import {
    isCommandLine,
    run,
    describeOffset,
    COMMAND_NAMES,
    type CommandContext,
} from '@/lib/system/commands';

const SESSION_START = new Date('2026-09-01T14:05:00.000Z');
const NOW = new Date('2026-09-01T14:52:12.000Z');

const ctx = (over: Partial<CommandContext> = {}): CommandContext => ({
    now: NOW,
    sessionStart: SESSION_START,
    notes: [
        { title: 'Ideas_Proyecto.txt', chars: 1400 },
        { title: 'Lista.txt', chars: 240 },
    ],
    integrity: 100,
    theme: 'light',
    effectsEnabled: true,
    secretsFound: 3,
    secretsTotal: 12,
    log: '14:52:03  GET     /health  200  19ms',
    greetings: 0,
    // El idioma se fija a mano: `commands` lo acepta en el contexto justamente
    // para que estas pruebas sigan siendo puras y no dependan de qué idioma
    // tenga configurado quien las corre.
    lang: 'es' as const,
    ...over,
});

describe('commands - la condición de activación', () => {
    // Esto NO es "la nota está vacía": al pulsar Enter la nota contiene el
    // comando. La regla real es: el contenido entero es UNA línea que empieza
    // por `>`. Si no, no se le roba el Enter a nadie que esté escribiendo.
    test('una sola línea que empieza por > es un comando', () => {
        expect(isCommandLine('//help')).toBe(true);
    });

    test('con una segunda línea ya no lo es', () => {
        expect(isCommandLine('//help\notra cosa')).toBe(false);
    });

    test('una línea que no empieza por > no lo es', () => {
        expect(isCommandLine('help')).toBe(false);
    });

    test('texto antes del > no lo es', () => {
        expect(isCommandLine('hola //help')).toBe(false);
    });

    test('un > suelto no es un comando', () => {
        expect(isCommandLine('>')).toBe(false);
    });

    test('un > con espacios tampoco', () => {
        expect(isCommandLine('>   ')).toBe(false);
    });

    test('la nota vacía no es un comando', () => {
        expect(isCommandLine('')).toBe(false);
    });

    test('tolera espacios al final', () => {
        expect(isCommandLine('//help  ')).toBe(true);
    });

    test('un salto de línea final todavía es una sola línea', () => {
        expect(isCommandLine('//help\n')).toBe(true);
    });

    test('una nota que empieza por > pero sigue escribiéndose no lo es', () => {
        expect(isCommandLine('> mis ideas\n- una\n- otra')).toBe(false);
    });
});

describe('commands - comandos que responden texto', () => {
    test('//help lista los comandos disponibles', () => {
        const salida = run('//help', ctx())!.output;

        for (const nombre of COMMAND_NAMES) {
            expect(salida).toContain(nombre);
        }
    });

    test('//version se identifica', () => {
        expect(run('//version', ctx())!.output).toContain('FLASH-NOTES v1.0');
    });

    test('//whoami admite que no puede leer la cookie', () => {
        const salida = run('//whoami', ctx())!.output;

        expect(salida).toContain('httpOnly');
        expect(salida).toContain('NAVEGADOR');
    });

    test('//sudo no tiene a quién ascender', () => {
        expect(run('//sudo', ctx())!.output).toContain('NO HAY SUPERUSUARIO');
    });

    test('//uptime cuenta desde que se abrió la pestaña', () => {
        expect(run('//uptime', ctx())!.output).toContain('00:47:12');
    });

    test('//ls lista tus notas con su tamaño', () => {
        const salida = run('//ls', ctx())!.output;

        expect(salida).toContain('Ideas_Proyecto.txt');
        expect(salida).toContain('Lista.txt');
    });

    test('//ls sin notas lo dice en vez de devolver nada', () => {
        expect(run('//ls', ctx({ notes: [] }))!.output.length).toBeGreaterThan(0);
    });

    test('//df mide el total escrito con el medidor ASCII', () => {
        const salida = run('//df', ctx())!.output;

        expect(salida).toContain('1640');
        expect(salida).toMatch(/[▮▯]{10}/);
    });

    test('//ps lista procesos con sus intervalos reales', () => {
        const salida = run('//ps', ctx())!.output;

        expect(salida).toContain('autosave');
        expect(salida).toContain('2500ms');
        expect(salida).toContain('network-poll');
        expect(salida).toContain('60000ms');
    });

    test('//log muestra el registro de peticiones', () => {
        expect(run('//log', ctx())!.output).toContain('/health');
    });
});

describe('commands - //date y el huso del sistema', () => {
    test('muestra la hora local y la del sistema', () => {
        const salida = run('//date', ctx())!.output;

        expect(salida).toContain('LOCAL');
        expect(salida).toContain('SISTEMA');
    });

    test('con desfase, el sistema nunca se mudó', () => {
        // getTimezoneOffset devuelve minutos POR DETRÁS de UTC: 180 es UTC-03.
        expect(describeOffset(180)).toContain('NUNCA SE MUDÓ');
    });

    test('sin desfase, estás en la hora del sistema', () => {
        expect(describeOffset(0)).toContain('SIN DESFASE');
    });

    test('nombra el desfase con signo y dos dígitos', () => {
        expect(describeOffset(180)).toContain('UTC-03');
        expect(describeOffset(-120)).toContain('UTC+02');
        expect(describeOffset(0)).toContain('UTC+00');
    });
});

describe('commands - comandos con efecto', () => {
    test('//diag pide abrir el panel', () => {
        expect(run('//diag', ctx())!.effect).toEqual({ kind: 'open-diagnostics' });
    });

    test('//panic pide el colapso', () => {
        expect(run('//panic', ctx())!.effect).toEqual({ kind: 'collapse' });
    });

    test('//clear pide vaciar la nota', () => {
        expect(run('//clear', ctx())!.effect).toEqual({ kind: 'clear-note' });
    });

    test('//history pide las actas de la nota', () => {
        expect(run('//history', ctx())!.effect).toEqual({ kind: 'fetch-history' });
    });

    test('//chaos off apaga los efectos', () => {
        expect(run('//chaos off', ctx())!.effect).toEqual({
            kind: 'set-effects',
            enabled: false,
        });
    });

    test('//chaos on los enciende', () => {
        expect(run('//chaos on', ctx())!.effect).toEqual({
            kind: 'set-effects',
            enabled: true,
        });
    });

    test('//chaos sin argumento informa del estado y no cambia nada', () => {
        const resultado = run('//chaos', ctx({ effectsEnabled: true }))!;

        expect(resultado.effect).toEqual({ kind: 'none' });
        expect(resultado.output).toContain('ON');
    });

    test('un comando de texto no arrastra efectos', () => {
        expect(run('//version', ctx())!.effect).toEqual({ kind: 'none' });
    });
});

describe('commands - entradas que no son comandos', () => {
    test('un comando desconocido responde sin romperse', () => {
        const salida = run('//naoperandi', ctx())!.output;

        expect(salida).toContain('DESCONOCIDO');
        expect(salida).toContain('//help');
    });

    test('lo que no cumple la condición de activación devuelve null', () => {
        expect(run('hola', ctx())).toBeNull();
    });

    test('no distingue mayúsculas de minúsculas', () => {
        expect(run('//HELP', ctx())!.output).toBe(run('//help', ctx())!.output);
    });

    test('tolera espacio entre el prompt y el comando', () => {
        expect(run('// version', ctx())!.output).toContain('FLASH-NOTES v1.0');
    });
});

describe('commands - qué secreto marca cada uno', () => {
    test('//help marca que descubriste los comandos', () => {
        expect(run('//help', ctx())!.secretId).toBe('commands');
    });

    test('//sudo marca el suyo propio', () => {
        expect(run('//sudo', ctx())!.secretId).toBe('sudo');
    });

    test('un comando desconocido no marca nada', () => {
        expect(run('//naoperandi', ctx())!.secretId).toBeUndefined();
    });
});
