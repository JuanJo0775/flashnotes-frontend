// tests/lib/system/lore.test.ts
import {
    STATUS_FRAGMENTS,
    MAX_FRAGMENT_LENGTH,
    BOOT_PHRASES,
    BOOT_PHRASES_NIGHT,
    BOOT_PHRASE_AFTER_TRASH,
    isSmallHours,
    availableFragments,
    pickFragment,
    pickBootPhrase,
    bootPhrasesInvasive,
    permanentDeleteMessage,
    type SystemContext,
} from '@/lib/system/lore';

/** Contexto sano: media tarde, sesión recién abierta, tecleando. */
const ctx = (over: Partial<SystemContext> = {}): SystemContext => ({
    hour: 15,
    sessionMs: 60_000,
    idleMs: 0,
    ...over,
});

const MINUTO = 60_000;

describe('lore - la madrugada', () => {
    test('las 03:00 son madrugada', () => {
        expect(isSmallHours(3)).toBe(true);
    });

    test('las 02:00 ya son madrugada', () => {
        expect(isSmallHours(2)).toBe(true);
    });

    test('las 05:00 ya no lo son', () => {
        expect(isSmallHours(5)).toBe(false);
    });

    test('la una de la mañana todavía no lo es', () => {
        expect(isSmallHours(1)).toBe(false);
    });
});

describe('lore - qué fragmentos están disponibles', () => {
    test('de día no ofrece los de madrugada', () => {
        const disponibles = availableFragments(ctx({ hour: 15 }));

        expect(disponibles).not.toContain('[NADIE MÁS CONECTADO]');
        expect(disponibles).not.toContain('[SYSTEM_TIRED]');
    });

    test('de madrugada sí los ofrece', () => {
        const disponibles = availableFragments(ctx({ hour: 3 }));

        expect(disponibles).toContain('[NADIE MÁS CONECTADO]');
        expect(disponibles).toContain('[TURNO_PESADO]');
    });

    test('con la sesión recién abierta no ofrece los de turno largo', () => {
        const disponibles = availableFragments(ctx({ sessionMs: 5 * MINUTO }));

        expect(disponibles).not.toContain('[TURNO LARGO]');
    });

    test('pasados 45 minutos ofrece los de turno largo', () => {
        const disponibles = availableFragments(ctx({ sessionMs: 50 * MINUTO }));

        expect(disponibles).toContain('[TURNO LARGO]');
    });

    test('«seguís ahí» pide sesión larga y además silencio', () => {
        const tecleando = availableFragments(
            ctx({ sessionMs: 50 * MINUTO, idleMs: 0 })
        );
        const enSilencio = availableFragments(
            ctx({ sessionMs: 50 * MINUTO, idleMs: 6 * MINUTO })
        );

        expect(tecleando).not.toContain('[SEGUÍS AHÍ]');
        expect(enSilencio).toContain('[SEGUÍS AHÍ]');
    });

    test('siempre queda algo que decir, incluso en el contexto más pobre', () => {
        expect(availableFragments(ctx()).length).toBeGreaterThan(1);
    });
});

describe('lore - elegir un fragmento', () => {
    test('devuelve uno de los disponibles', () => {
        const elegido = pickFragment(ctx(), null, () => 0);

        expect(availableFragments(ctx())).toContain(elegido);
    });

    test('nunca repite el anterior', () => {
        const anterior = availableFragments(ctx())[0];

        // Con el azar clavado en 0 elegiría siempre el primero: si igual no
        // repite, es porque lo excluyó a propósito.
        expect(pickFragment(ctx(), anterior, () => 0)).not.toBe(anterior);
    });

    test('el azar recorre todo el repertorio disponible', () => {
        const disponibles = availableFragments(ctx({ hour: 3, sessionMs: 50 * MINUTO }));
        const primero = pickFragment(ctx({ hour: 3, sessionMs: 50 * MINUTO }), null, () => 0);
        const ultimo = pickFragment(
            ctx({ hour: 3, sessionMs: 50 * MINUTO }),
            null,
            () => 0.999
        );

        expect(primero).toBe(disponibles[0]);
        expect(ultimo).toBe(disponibles[disponibles.length - 1]);
    });
});

describe('lore - la maqueta no se mueve', () => {
    // La barra de estado es flex con gap: un fragmento más ancho que el hueco
    // empujaría [GUARDADO] de lado. El hueco se dimensiona en `ch` contra esta
    // constante, así que la constante tiene que ser de verdad la más larga.
    test('MAX_FRAGMENT_LENGTH es el largo del fragmento más largo', () => {
        const masLargo = Math.max(...STATUS_FRAGMENTS.map((f) => f.length));

        expect(MAX_FRAGMENT_LENGTH).toBe(masLargo);
    });

    test('ningún fragmento excede el largo máximo', () => {
        for (const fragmento of STATUS_FRAGMENTS) {
            expect(fragmento.length).toBeLessThanOrEqual(MAX_FRAGMENT_LENGTH);
        }
    });
});

describe('lore - vocabulario del sistema', () => {
    test('todo fragmento va entre corchetes', () => {
        for (const fragmento of STATUS_FRAGMENTS) {
            expect(fragmento).toMatch(/^\[.+\]$/);
        }
    });

    test('[SYSTEM_0K] lleva un cero, no una O', () => {
        expect(STATUS_FRAGMENTS).toContain('[T0DO_B1EN]');
    });
});

describe('lore - frases de arranque', () => {
    // 0,5 esquiva la rama invasiva (1 de cada 6); 0 cae siempre en ella.
    const SIN_INVASIVA = () => 0.5;
    const CON_INVASIVA = () => 0;

    test('de día teclea una del repertorio base', () => {
        const frase = pickBootPhrase(ctx({ hour: 15 }), null, SIN_INVASIVA);

        expect(BOOT_PHRASES).toContain(frase);
    });

    test('de madrugada teclea una del repertorio nocturno', () => {
        const frase = pickBootPhrase(ctx({ hour: 3 }), null, SIN_INVASIVA);

        expect(BOOT_PHRASES_NIGHT).toContain(frase);
        expect(BOOT_PHRASES).not.toContain(frase);
    });

    test('el repertorio base creció: hay bastante donde elegir', () => {
        // Con cinco frases, quien abre notas seguido las ve todas en una tarde.
        expect(BOOT_PHRASES.length).toBeGreaterThanOrEqual(10);
    });

    test('de vez en cuando sale una invasiva', () => {
        const frase = pickBootPhrase(ctx({ hour: 15 }), null, CON_INVASIVA);

        expect(bootPhrasesInvasive('es')).toContain(frase);
    });

    test('las invasivas tutean, y por eso rompen', () => {
        // Todo el resto trata de usted: una máquina institucional que no te
        // tutea porque no sabe quién sos. Que estas sí lo hagan es el efecto.
        const invasivas = bootPhrasesInvasive('es').join(' ');

        expect(invasivas).toMatch(/BORRASTE|CERRÁS|ESCRIBISTE|CIERRES/);
    });

    test('las invasivas son más largas que las normales', () => {
        const medio = (xs: readonly string[]) =>
            xs.reduce((a, x) => a + x.length, 0) / xs.length;

        expect(medio(bootPhrasesInvasive('es'))).toBeGreaterThan(medio(BOOT_PHRASES));
    });

    test('si acabás de tirar una nota, gana la frase fija', () => {
        const frase = pickBootPhrase(
            ctx({ msSinceTrash: 20_000 }),
            null,
            () => 0
        );

        expect(frase).toBe(BOOT_PHRASE_AFTER_TRASH);
    });

    test('la frase fija gana incluso de madrugada', () => {
        const frase = pickBootPhrase(
            ctx({ hour: 3, msSinceTrash: 20_000 }),
            null,
            () => 0
        );

        expect(frase).toBe(BOOT_PHRASE_AFTER_TRASH);
    });

    test('pasado el minuto la papelera ya no manda', () => {
        const frase = pickBootPhrase(
            ctx({ msSinceTrash: 90_000 }),
            null,
            () => 0
        );

        expect(frase).not.toBe(BOOT_PHRASE_AFTER_TRASH);
    });

    test('nunca repite la frase anterior', () => {
        const anterior = BOOT_PHRASES[0];

        expect(pickBootPhrase(ctx(), anterior, () => 0)).not.toBe(anterior);
    });
});

describe('lore - la papelera lleva la cuenta', () => {
    const TITULO = 'Ideas_Proyecto.txt';

    test('los primeros borrados usan el mensaje de siempre', () => {
        const mensaje = permanentDeleteMessage(TITULO, 0);

        expect(mensaje).toContain(TITULO);
        expect(mensaje).toContain('no se puede deshacer');
        expect(mensaje).not.toMatch(/otro/i);
    });

    test('al quinto, el sistema menciona que estuvo contando', () => {
        const mensaje = permanentDeleteMessage(TITULO, 4);

        expect(mensaje).toContain('los otros cuatro');
    });

    test('sigue contando más allá del quinto', () => {
        expect(permanentDeleteMessage(TITULO, 5)).toContain('los otros cinco');
        expect(permanentDeleteMessage(TITULO, 7)).toContain('los otros siete');
    });

    test('pasados ocho, añade que ninguna vuelve', () => {
        const mensaje = permanentDeleteMessage(TITULO, 8);

        expect(mensaje).toContain('Van ocho');
        expect(mensaje).toContain('Ninguna vuelve');
    });

    test('pasados doce, admite que dejó de contarlas por sesión', () => {
        // El último escalón es el que más pesa: hasta acá el sistema hablaba de
        // ESTA sesión, y de golpe deja ver que lleva un registro aparte.
        expect(permanentDeleteMessage(TITULO, 12)).toContain(
            'Ya no las cuento por sesión'
        );
    });

    test('los cuatro escalones dicen cosas distintas', () => {
        const dichos = new Set(
            [0, 5, 9, 20].map((n) => permanentDeleteMessage(TITULO, n))
        );

        expect(dichos.size).toBe(4);
    });

    test('el nombre de la nota nunca se pierde', () => {
        expect(permanentDeleteMessage(TITULO, 9)).toContain(TITULO);
    });

    test('una nota sin título no deja un hueco vacío', () => {
        expect(permanentDeleteMessage('', 0).length).toBeGreaterThan(20);
    });
});
