// tests/lib/system/pongScores.test.ts
import {
    SYSTEM_RECORD,
    readScores,
    recordRally,
    clearScores,
    type Board,
} from '@/lib/system/pongScores';

beforeEach(() => {
    localStorage.clear();
    clearScores();
});

describe('pongScores · el récord del sistema', () => {
    // Lleva jugando desde antes que vos y no tenía nada más que hacer. Que sea
    // absurdo es el chiste, y también la parte triste.
    test('es un número absurdo', () => {
        expect(SYSTEM_RECORD).toBeGreaterThan(100_000);
    });

    test('es fijo: no se toca ni se supera', () => {
        recordRally('clean', 999);

        expect(SYSTEM_RECORD).toBeGreaterThan(999);
    });
});

describe('pongScores · empezar de cero', () => {
    test('sin nada guardado, los dos marcadores están a cero', () => {
        const marcadores = readScores();

        expect(marcadores.clean.best).toBe(0);
        expect(marcadores.degraded.best).toBe(0);
    });

    test('sin nada guardado, no hay partidas jugadas', () => {
        expect(readScores().clean.games).toBe(0);
    });
});

describe('pongScores · los dos tableros son independientes', () => {
    // Jugar con la señal rota es el mismo juego a ciegas, no otro juego: la
    // física es idéntica. Por eso es un logro distinto y lleva marcador aparte.
    test('un peloteo limpio no toca el degradado', () => {
        recordRally('clean', 40);

        expect(readScores().degraded.best).toBe(0);
    });

    test('un peloteo degradado no toca el limpio', () => {
        recordRally('degraded', 12);

        expect(readScores().clean.best).toBe(0);
    });

    test('cada uno guarda el suyo', () => {
        recordRally('clean', 40);
        recordRally('degraded', 12);

        const m = readScores();
        expect(m.clean.best).toBe(40);
        expect(m.degraded.best).toBe(12);
    });
});

describe('pongScores · el mejor es el mejor', () => {
    test('el primer peloteo queda como mejor', () => {
        recordRally('clean', 7);

        expect(readScores().clean.best).toBe(7);
    });

    test('uno mejor lo reemplaza', () => {
        recordRally('clean', 7);
        recordRally('clean', 19);

        expect(readScores().clean.best).toBe(19);
    });

    test('uno peor no lo pisa', () => {
        recordRally('clean', 19);
        recordRally('clean', 3);

        expect(readScores().clean.best).toBe(19);
    });

    test('cada partida cuenta, gane o no el récord', () => {
        recordRally('clean', 19);
        recordRally('clean', 3);

        expect(readScores().clean.games).toBe(2);
    });
});

describe('pongScores · sobrevive a recargar', () => {
    // Se guardan como se guardan las notas: atados a este navegador. La app es
    // efímera, pero lo que conseguiste sigue ahí cuando volvés.
    test('lo guardado se relee de cero', () => {
        recordRally('clean', 33);
        clearScores();

        expect(readScores().clean.best).toBe(33);
    });

    test('borrar el almacenamiento lo devuelve a cero', () => {
        recordRally('clean', 33);
        localStorage.clear();
        clearScores();

        expect(readScores().clean.best).toBe(0);
    });
});

describe('pongScores · el almacenamiento roto no rompe la app', () => {
    // El mismo criterio que las ventanas fantasma y el bloqueo: si lo guardado
    // no se entiende, se empieza de cero. Nunca se lanza.
    test('un JSON inválido se ignora', () => {
        localStorage.setItem('flashnotes:pong', 'no soy json');
        clearScores();

        expect(readScores().clean.best).toBe(0);
    });

    test('un JSON válido pero con la forma equivocada se ignora', () => {
        localStorage.setItem('flashnotes:pong', '["una lista, no un objeto"]');
        clearScores();

        expect(readScores().clean.best).toBe(0);
    });

    test('un peloteo que no es número se ignora', () => {
        localStorage.setItem(
            'flashnotes:pong',
            JSON.stringify({ clean: { best: 'muchos', games: 1 } })
        );
        clearScores();

        expect(readScores().clean.best).toBe(0);
    });

    test('un tablero a medias conserva lo que sí se entiende', () => {
        localStorage.setItem(
            'flashnotes:pong',
            JSON.stringify({ clean: { best: 12, games: 3 } })
        );
        clearScores();

        const m = readScores();
        expect(m.clean.best).toBe(12);
        expect(m.degraded.best).toBe(0);
    });
});

describe('pongScores · nada de peloteos imposibles', () => {
    test('un peloteo negativo no se guarda', () => {
        recordRally('clean', -5);

        expect(readScores().clean.best).toBe(0);
    });

    test('un peloteo con decimales se guarda entero', () => {
        recordRally('clean', 7.9);

        expect(readScores().clean.best).toBe(7);
    });
});

describe('pongScores · el tipo del tablero', () => {
    test('los dos tableros existen siempre', () => {
        const tableros: Board[] = ['clean', 'degraded'];

        for (const t of tableros) expect(readScores()[t]).toBeDefined();
    });
});
