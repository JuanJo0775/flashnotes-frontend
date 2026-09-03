// tests/lib/system/timeDrift.test.ts
import {
    driftedMs,
    isDrifting,
    startDrift,
    stopDrift,
    driftStartedAt,
} from '@/lib/system/timeDrift';

const REAL = Date.UTC(2026, 8, 2, 15, 0, 0);

beforeEach(() => {
    stopDrift();
});

describe('timeDrift · encenderlo y apagarlo', () => {
    // Arranca APAGADO, y eso importa más de lo que parece: `formatters` lo
    // consulta al pintar, y el servidor y el cliente tienen que coincidir en el
    // primer render o React tira el árbol entero. Apagado en los dos, coinciden.
    test('arranca apagado', () => {
        expect(isDrifting()).toBe(false);
    });

    test('apagado no toca la hora', () => {
        expect(driftedMs(REAL)).toBe(REAL);
    });

    test('encendido, sí la toca', () => {
        startDrift(REAL);

        expect(driftedMs(REAL + 5000)).not.toBe(REAL + 5000);
    });

    test('recuerda cuándo se encendió', () => {
        startDrift(REAL);

        expect(driftStartedAt()).toBe(REAL);
    });

    test('encenderlo dos veces no reinicia la cuenta', () => {
        // `//date_off` dos veces no es «apagar y volver a empezar»: el comando
        // no tiene marcha atrás, sólo la recarga.
        startDrift(REAL);
        startDrift(REAL + 60_000);

        expect(driftStartedAt()).toBe(REAL);
    });
});

describe('timeDrift · el reloj se vuelve loco', () => {
    beforeEach(() => startDrift(REAL));

    test('en el instante de encenderlo todavía no se movió', () => {
        // Si saltara en el mismo momento del comando, el salto se leería como
        // parte del comando. Empieza a irse enseguida, pero no de golpe.
        expect(driftedMs(REAL)).toBe(REAL);
    });

    test('a veces va hacia adelante', () => {
        const adelante = Array.from({ length: 400 }, (_, i) =>
            driftedMs(REAL + i * 250)
        ).some((t, i) => t > REAL + i * 250);

        expect(adelante).toBe(true);
    });

    test('y a veces hacia atrás', () => {
        // Sólo adelante sería un reloj adelantado, que no tiene gracia. Que
        // RETROCEDA es lo que no puede pasar en un reloj que funciona.
        const atras = Array.from({ length: 400 }, (_, i) =>
            driftedMs(REAL + i * 250)
        ).some((t, i) => t < REAL + i * 250);

        expect(atras).toBe(true);
    });

    test('da saltos, no se desliza', () => {
        // Un desfase que crece suave se lee como un reloj mal puesto; que la
        // fecha salte de golpe se lee como una avería.
        //
        // Se BUSCA el salto en vez de fijar dos instantes a mano: dos instantes
        // cualesquiera pueden caer dentro del mismo tramo, y entonces el test
        // mediría el paso del tiempo real y no el salto. Lo que se afirma es que
        // en algún momento la hora pintada pega un tirón de más de un minuto
        // mientras la real avanza sólo una décima.
        const muestras = Array.from({ length: 200 }, (_, i) =>
            driftedMs(REAL + i * 100)
        );

        const saltos = muestras.filter(
            (t, i) => i > 0 && Math.abs(t - muestras[i - 1]) > 60_000
        );

        expect(saltos.length).toBeGreaterThan(0);
    });

    test('y entre salto y salto se queda quieto', () => {
        // Si cambiara en cada repintado, la pantalla temblaría de números y se
        // leería como parpadeo en vez de como un reloj roto.
        const muestras = Array.from({ length: 200 }, (_, i) =>
            driftedMs(REAL + i * 100)
        );

        const quietos = muestras.filter(
            (t, i) => i > 0 && Math.abs(t - muestras[i - 1]) < 1000
        );

        expect(quietos.length).toBeGreaterThan(muestras.length / 2);
    });

    test('llega a moverse años, no minutos', () => {
        const AÑO = 365 * 24 * 3600_000;
        const extremos = Array.from({ length: 600 }, (_, i) =>
            Math.abs(driftedMs(REAL + i * 200) - (REAL + i * 200))
        );

        expect(Math.max(...extremos)).toBeGreaterThan(AÑO);
    });

    test('es determinista: el mismo instante da el mismo disparate', () => {
        // Sin esto, cada repintado movería la fecha y la pantalla entera
        // temblaría de números. Se va de loco, pero no parpadea.
        expect(driftedMs(REAL + 3333)).toBe(driftedMs(REAL + 3333));
    });

    test('sigue siendo una fecha válida', () => {
        for (let i = 0; i < 500; i += 1) {
            const t = driftedMs(REAL + i * 137);
            expect(Number.isFinite(t)).toBe(true);
            expect(new Date(t).getFullYear()).toBeGreaterThan(1900);
        }
    });
});

describe('timeDrift · apagarlo devuelve la cordura', () => {
    // Sólo lo apaga recargar la página. `stopDrift` existe para los tests y para
    // el arranque del módulo, no hay comando que lo llame.
    test('apagado vuelve a devolver la hora real', () => {
        startDrift(REAL);
        stopDrift();

        expect(driftedMs(REAL + 9999)).toBe(REAL + 9999);
    });
});
