// tests/lib/system/relojDeVuelta.test.ts

/**
 * EL RELOJ VUELVE, Y MIENTRAS ESTÁ SUELTO NO QUEDA UN INSTRUMENTO FIABLE.
 *
 * Tres cosas que se pidieron jugando y son la misma:
 *
 *   · `//date_on` deshace `//date_off`. Existía la avería y no la salida —
 *     salvo recargar, que es la salida que la casa se niega a obligar a nadie
 *     a encontrar (REGLAS · A4).
 *
 *   · `//date` también delira mientras dura. Era el único sitio que no: la app
 *     entera pintaba años que no son y el comando que existe para DECIR la hora
 *     contestaba con una hora perfectamente correcta.
 *
 *   · Y el reinicio se lo lleva. `rebootSystem` promete limpiar lo que se lleva
 *     una recarga, ni más ni menos, y esto vive en una variable de módulo:
 *     sobrevivirle al reinicio lo convertía en teatro.
 */

import { clearUsed } from '@/lib/system/commandUnlock';
import { run, type CommandContext } from '@/lib/system/commands';
import { isDrifting, startDrift, stopDrift } from '@/lib/system/timeDrift';

const NOW = new Date('2026-09-01T14:52:12.000Z');

const ctx = (over: Partial<CommandContext> = {}): CommandContext => ({
    now: NOW,
    sessionStart: new Date('2026-09-01T14:05:00.000Z'),
    notes: [],
    integrity: 100,
    theme: 'light',
    effectsEnabled: true,
    soundEnabled: true,
    secretsFound: 3,
    secretsTotal: 12,
    log: '',
    greetings: 0,
    chat: 0,
    kicks: 0,
    lang: 'es' as const,
    ...over,
});

beforeEach(() => {
    localStorage.clear();
    clearUsed();
    stopDrift();
});

describe('//date_on · la vuelta', () => {
    test('existe, y contesta', () => {
        expect(run('//date_on', ctx())?.output).toBeTruthy();
    });

    test('⚠ no ocupa hueco en la ayuda', () => {
        /*
         * Misma regla que echó de ahí a `//whoareu`: un comando escondido es
         * algo que la máquina TIENE y no anuncia, y su tachado es un hueco que
         * se destapa al usarlo. Éste es el REVERSO de uno que ya está en la
         * lista, y darle tachado propio sería anunciar dos veces lo mismo.
         */
        const ayuda = run('//help', ctx())?.output ?? '';

        expect(ayuda).not.toContain('date_on');
    });

    test('con el reloj suelto, lo fija', () => {
        startDrift(NOW.getTime() - 10_000);

        const salida = run('//date_on', ctx());

        expect(salida?.effect).toEqual({ kind: 'time-drift', on: false });
        expect(salida?.output).toContain('VUELVO A SABER QUÉ DÍA ES');
    });

    test('y con el reloj en su sitio lo constata, sin corregirte', () => {
        expect(run('//date_on', ctx())?.output).toContain('YA ESTABA FIJA');
    });

    test('//date_off sigue soltándolo, ahora diciendo por dónde', () => {
        expect(run('//date_off', ctx())?.effect).toEqual({
            kind: 'time-drift',
            on: true,
        });
    });

    test('⚠ y el mensaje de la ida NO nombra la vuelta', () => {
        /*
         * Decir «escribí `//date_on` para arreglarlo» convierte la avería en un
         * aviso: sabés que es temporal y deja de sentirse como que el sistema
         * perdió algo. La salida existe y está a un paso del comando que
         * acabás de escribir, pero hay que dar con ella.
         */
        expect(run('//date_off', ctx())?.output).not.toContain('date_on');
    });
});

describe('//date · mientras el reloj está suelto', () => {
    /** Las tres líneas de `//date`. */
    const lineas = () => (run('//date', ctx())?.output ?? '').split('\n');

    test('con el reloj en su sitio dice la hora y la frase del huso', () => {
        const [local, sistema, frase] = lineas();

        expect(local).toMatch(/^LOCAL {5}\d\d:\d\d \(UTC[+-]\d\d\)$/);
        expect(sistema).toMatch(/^SISTEMA {3}\d\d:\d\d UTC$/);
        expect(frase).not.toBe('SIN REFERENCIA.');
    });

    test('⚠ suelto, saca la FECHA entera: lo que se perdió es el año', () => {
        // Con `HH:MM` a secas el desvarío pasa por un reloj mal puesto.
        startDrift(NOW.getTime() - 10_000);
        const [local, sistema] = lineas();

        expect(local).toMatch(/^LOCAL {5}\d{4}\.\d\d\.\d\d \d\d:\d\d \(UTC[+-]\d\d\)$/);
        expect(sistema).toMatch(/^SISTEMA {3}\d{4}\.\d\d\.\d\d \d\d:\d\d UTC$/);
    });

    test('y se queda sin la frase que se podía verificar', () => {
        startDrift(NOW.getTime() - 10_000);

        expect(lineas()[2]).toBe('SIN REFERENCIA.');
    });

    test('⚠ las dos lecturas se contradicen: no son del mismo instante', () => {
        /*
         * Primero mira tu reloj y después el suyo. Con la referencia suelta, un
         * instante de diferencia son once años — y un aparato que no se pone de
         * acuerdo consigo mismo asusta más que uno que da una hora rara.
         *
         * Se prueba sobre varios instantes porque el desvarío es determinista:
         * uno solo podría caer, por casualidad, en dos saltos parecidos.
         */
        const distintos = [0, 3_000, 7_500, 20_000].filter((cuanto) => {
            stopDrift();
            startDrift(NOW.getTime() - 30_000);

            const [local, sistema] = (
                run('//date', ctx({ now: new Date(NOW.getTime() + cuanto) }))?.output ?? ''
            ).split('\n');

            // El año de cada línea, que es donde el desvarío se ve.
            return local.slice(10, 14) !== sistema.slice(10, 14);
        });

        expect(distintos.length).toBeGreaterThan(0);
    });
});

describe('el reinicio se lleva el reloj suelto', () => {
    test('⚠ y sin esto el reinicio era teatro', async () => {
        /*
         * `rebootSystem` limpia lo que se lleva una recarga, ni más ni menos, y
         * el desvarío vive en una variable de módulo — o sea que una recarga lo
         * borra. Sobreviviéndole al reinicio, la máquina hacía el espectáculo
         * entero y volvía sin saber en qué año está.
         */
        const { rebootSystem } = await import('@/hooks/useSystemState');
        startDrift(NOW.getTime() - 10_000);
        expect(isDrifting()).toBe(true);

        rebootSystem();

        expect(isDrifting()).toBe(false);
    });
});
