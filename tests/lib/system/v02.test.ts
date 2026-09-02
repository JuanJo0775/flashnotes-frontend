// tests/lib/system/v02.test.ts
import {
    DROP_ODDS,
    LIE_ODDS,
    TRASH_FAIL_ODDS,
    V02_LABEL,
    enterV02,
    forgetV02Cache,
    halfBaked,
    isV02,
    leaveV02,
    saveOutcome,
    toggleV02,
    trashFails,
} from '@/lib/system/v02';

beforeEach(() => {
    localStorage.clear();
    forgetV02Cache();
});

describe('v02 · entrar y salir', () => {
    test('de entrada estás en la de siempre', () => {
        expect(isV02()).toBe(false);
    });

    test('se puede entrar', () => {
        enterV02();

        expect(isV02()).toBe(true);
    });

    test('SIEMPRE se puede salir', () => {
        // Un estado del que no se puede salir sería una app rota, no un secreto.
        enterV02();

        leaveV02();

        expect(isV02()).toBe(false);
    });

    test('la palabra entra y sale: es un interruptor', () => {
        expect(toggleV02()).toBe(true);
        expect(toggleV02()).toBe(false);
    });

    test('sobrevive a recargar', () => {
        // Una versión que se cae al refrescar no es una versión, es un efecto.
        enterV02();
        forgetV02Cache();

        expect(isV02()).toBe(true);
    });

    test('salir también se recuerda', () => {
        enterV02();
        leaveV02();
        forgetV02Cache();

        expect(isV02()).toBe(false);
    });

    test('un almacenamiento raro no te mete dentro', () => {
        // Ante la duda, la app de siempre: es la que funciona.
        localStorage.setItem('flashnotes:v02', 'cualquier cosa');
        forgetV02Cache();

        expect(isV02()).toBe(false);
    });

    test('dice ser otra versión', () => {
        expect(V02_LABEL).toContain('0.2');
        expect(V02_LABEL).not.toContain('1.0');
    });
});

describe('v02 · guardar, o decir que no', () => {
    /** Un azar que devuelve estos valores en orden. */
    const dados = (...valores: number[]) => {
        let i = 0;
        return () => valores[Math.min(i++, valores.length - 1)];
    };

    test('casi siempre guarda y lo dice', () => {
        expect(saveOutcome(dados(0.99, 0.99))).toBe('ok');
    });

    test('a veces MIENTE: dice que no guardó, y guardó', () => {
        // La pieza central. La v0.2 no es poco fiable con tus datos: es poco
        // fiable hablando de sí misma.
        expect(saveOutcome(dados(0.99, 0))).toBe('lied');
    });

    test('y muy de vez en cuando no guarda de verdad', () => {
        expect(saveOutcome(dados(0))).toBe('dropped');
    });

    test('mentir es MÁS probable que perder', () => {
        // Al revés, la v0.2 sería una app que pierde tu trabajo con un chiste
        // encima. Así es un chiste que a veces muerde.
        expect(LIE_ODDS).toBeGreaterThan(DROP_ODDS);
    });

    test('perder es raro de verdad', () => {
        expect(DROP_ODDS).toBeLessThan(0.1);
    });

    test('la mayoría de las veces no pasa nada', () => {
        // Si fallara la mitad de las veces sería inusable, no vieja.
        expect(LIE_ODDS + DROP_ODDS).toBeLessThan(0.35);
    });

    test('se mira primero la pérdida y después la mentira', () => {
        // Al revés, una mentira taparía una pérdida: el aviso saldría igual pero
        // por el motivo equivocado, y lo guardado no coincidiría con lo dicho.
        expect(saveOutcome(dados(0, 0))).toBe('dropped');
    });
});

describe('v02 · la papelera falla a ratos', () => {
    test('a veces no hace nada', () => {
        expect(trashFails(() => 0)).toBe(true);
    });

    test('casi siempre sí', () => {
        expect(trashFails(() => 0.99)).toBe(false);
    });

    test('falla menos de una de cada cuatro', () => {
        expect(TRASH_FAIL_ODDS).toBeLessThan(0.25);
    });
});

describe('v02 · lo que quedó a medio hacer', () => {
    test('deja ver el nombre de la variable', () => {
        // No es ruido al azar: es lo que habría si nadie hubiera escrito todavía
        // el texto.
        expect(halfBaked('titulo', () => 0)).toContain('TITULO');
    });

    test('con un número detrás, como un identificador sin resolver', () => {
        expect(halfBaked('titulo', () => 0)).toMatch(/^[A-Z_]+_\d{3}$/);
    });

    test('el número cambia', () => {
        expect(halfBaked('x', () => 0)).not.toBe(halfBaked('x', () => 0.9));
    });
});

describe('v02 · cambiar de versión AVISA', () => {
    // `toggleV02()` sólo cambia la bandera. Sin publicar, nadie se entera y el
    // rótulo se queda diciendo v1.0 con la v0.2 ya puesta — el mismo error que
    // dejó la barra de estado pillada en `[TODO_BIEN]` durante la avería.
    test('el almacén del sistema publica el cambio', async () => {
        jest.resetModules();
        const store = await import('@/hooks/useSystemState');

        expect(store.getSystemState().v02).toBe(false);

        store.registerV02Toggle();

        expect(store.getSystemState().v02).toBe(true);
    });

    test('y avisa a quien esté suscrito', async () => {
        jest.resetModules();
        const store = await import('@/hooks/useSystemState');

        let avisos = 0;
        const cancelar = store.subscribe(() => {
            avisos += 1;
        });

        store.registerV02Toggle();
        cancelar();

        expect(avisos).toBeGreaterThan(0);
    });
});

describe('v02 · el texto de una versión sin terminar', () => {
    // Determinista POR CLAVE: la misma etiqueta se rompe siempre igual. Si
    // cambiara en cada repintado, la interfaz sería un cartel de neón
    // parpadeando y dejaría de leerse como una versión vieja.
    test('la misma clave da siempre lo mismo', async () => {
        const { v02Label } = await import('@/lib/system/v02');
        const a = v02Label('titulo', { ok: 'Archivos', raw: 'Files' });
        const b = v02Label('titulo', { ok: 'Archivos', raw: 'Files' });

        expect(a).toBe(b);
    });

    test('la mayoría de las etiquetas salen bien', async () => {
        // Si fallaran todas sería ilegible, no vieja.
        const { v02Label } = await import('@/lib/system/v02');
        const claves = Array.from({ length: 60 }, (_, i) => `clave${i}`);
        const bien = claves.filter(
            (k) => v02Label(k, { ok: 'Texto', raw: 'Text' }) === 'Texto'
        );

        expect(bien.length).toBeGreaterThan(claves.length / 2);
    });

    test('pero algunas no', async () => {
        const { v02Label } = await import('@/lib/system/v02');
        const claves = Array.from({ length: 60 }, (_, i) => `clave${i}`);
        const rotas = claves.filter(
            (k) => v02Label(k, { ok: 'Texto', raw: 'Text' }) !== 'Texto'
        );

        expect(rotas.length).toBeGreaterThan(3);
    });

    test('nunca devuelve vacío: una etiqueta en blanco es un hueco, no un fallo', async () => {
        const { v02Label } = await import('@/lib/system/v02');

        for (let i = 0; i < 60; i += 1) {
            expect(v02Label(`k${i}`, { ok: 'Texto', raw: 'Text' }).length).toBeGreaterThan(0);
        }
    });

    test('sin versión en inglés, no se la inventa', async () => {
        const { v02Label } = await import('@/lib/system/v02');
        const salidas = Array.from({ length: 60 }, (_, i) =>
            v02Label(`k${i}`, { ok: 'Texto' })
        );

        expect(salidas.every((s) => s.length > 0)).toBe(true);
    });
});
