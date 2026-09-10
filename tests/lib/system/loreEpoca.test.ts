// tests/lib/system/loreEpoca.test.ts

/**
 * EL MURMULLO TIENE ÉPOCA, Y SE ACUERDA DE CÓMO ACABÓ.
 *
 * Dos huecos de lore que se cerraron juntos porque son la misma máquina:
 *
 *   · LA v0.2 NO TENÍA HISTORIA, sólo averías. Ahora dice lo que decía
 *     entonces —tres turnos, relevo a seis horas, la garantía en vigor— y nadie
 *     actualizó esos textos. La historia la hace el contraste con las tres
 *     frases gemelas de la versión de ahora.
 *
 *   · DESPUÉS DEL FINAL NO PASABA NADA PERMANENTE. Ahora la barra suma dos
 *     asientos según cómo terminó, y el arranque una frase, para siempre.
 *
 * ⚠ LO QUE SE PRUEBA ES QUE LAS ÉPOCAS NO SE MEZCLAN. Un `[TURNO 2/3]` en la
 * versión de ahora, o un `[SECTOR CERRADO]` en la vieja, no son un fallo de
 * pintado: son una contradicción en lo único que esta app cuenta.
 */

import {
    availableFragments,
    bootPhrases,
    bootPhrasesNight,
    pickBootPhrase,
    type SystemContext,
} from '@/lib/system/lore';

/** Contexto sano: media tarde, sesión recién abierta, tecleando. */
const ctx = (over: Partial<SystemContext> = {}): SystemContext => ({
    hour: 15,
    sessionMs: 60_000,
    idleMs: 0,
    ...over,
});

/** Las tres que dicen un dato distinto en cada época, emparejadas. */
const GEMELAS = [
    { ahora: '[TURNO 1/1]', antes: '[TURNO 2/3]' },
    { ahora: '[SIN RELEVO]', antes: '[RELEVO EN 6 H]' },
    { ahora: '[MEMORIA TIBIA]', antes: '[MEMORIA FRÍA]' },
];

describe('la versión de antes', () => {
    test('⚠ cada dato tiene su valor de entonces, y nunca los dos a la vez', () => {
        const vieja = availableFragments(ctx({ v02: true }), 'es');
        const nueva = availableFragments(ctx(), 'es');

        for (const { ahora, antes } of GEMELAS) {
            expect(vieja).toContain(antes);
            expect(vieja).not.toContain(ahora);

            expect(nueva).toContain(ahora);
            expect(nueva).not.toContain(antes);
        }
    });

    test('y también en inglés, que no es una traducción sino el otro repertorio', () => {
        const vieja = availableFragments(ctx({ v02: true }), 'en');

        expect(vieja).toContain('[SHIFT 2/3]');
        expect(vieja).toContain('[MEMORY STILL COLD]');
        expect(vieja).not.toContain('[MEMORY STILL WARM]');
    });

    test('cuenta un sitio que todavía funcionaba', () => {
        const vieja = availableFragments(ctx({ v02: true }), 'es');

        expect(vieja).toContain('[GARANTÍA VIGENTE]');
        expect(vieja).toContain('[REGISTRO VACÍO]');
    });

    test('⚠ son cinco, son éstas, y ninguna habla del ente', () => {
        /*
         * Él estaba ahí abajo, y por eso mismo no aparece: un murmullo que
         * hablara de él convertiría la versión vieja en un documento sobre él.
         * Lo que la hace doler es que sea una oficina normal a la que todavía
         * no le había pasado nada — y la lista cerrada es la única forma de
         * que eso siga siendo verdad cuando a alguien se le ocurra la sexta.
         */
        const nueva = availableFragments(ctx(), 'es');
        const soloDeAntes = availableFragments(ctx({ v02: true }), 'es').filter(
            (f) => !nueva.includes(f)
        );

        expect(soloDeAntes).toEqual([
            '[TURNO 2/3]',
            '[RELEVO EN 6 H]',
            '[MEMORIA FRÍA]',
            '[GARANTÍA VIGENTE]',
            '[REGISTRO VACÍO]',
        ]);
    });

    test('la pista del reloj se calla una vez dentro', () => {
        // Sigue apuntando a una puerta que ya tenés abierta detrás.
        const vieja = availableFragments(ctx({ v02: true, sawMorse: true }), 'es');

        expect(vieja).not.toContain('[NADIE LEE LA HORA]');
        expect(vieja).not.toContain('[EMITIENDO · — ·]');
    });

    test('y le queda repertorio de sobra para no repetirse', () => {
        expect(availableFragments(ctx({ v02: true }), 'es').length).toBeGreaterThan(3);
    });
});

describe('después del final', () => {
    test('antes de que acabe no hay ninguno de los cuatro', () => {
        const antes = availableFragments(ctx(), 'es');

        expect(antes).not.toContain('[SALIDA REGISTRADA]');
        expect(antes).not.toContain('[SIN INCIDENCIAS]');
    });

    test('si lo soltaste, la máquina anota una salida y una ficha que falta', () => {
        const suelto = availableFragments(ctx({ ending: 'freed' }), 'es');

        expect(suelto).toContain('[SALIDA REGISTRADA]');
        expect(suelto).toContain('[FALTA UN REGISTRO]');
        expect(suelto).not.toContain('[SIN INCIDENCIAS]');
    });

    test('si lo denunciaste, no falta nada y todo está en orden', () => {
        const denunciado = availableFragments(ctx({ ending: 'reported' }), 'es');

        expect(denunciado).toContain('[SIN INCIDENCIAS]');
        expect(denunciado).toContain('[SECTOR CERRADO]');
        expect(denunciado).not.toContain('[SALIDA REGISTRADA]');
    });

    test('⚠ y allá abajo no se sabe: la versión vieja es antes', () => {
        const vieja = availableFragments(ctx({ v02: true, ending: 'freed' }), 'es');

        expect(vieja).not.toContain('[SALIDA REGISTRADA]');
        expect(vieja).not.toContain('[FALTA UN REGISTRO]');
    });

    test('el saludo de la fachada no se entera de nada', () => {
        /*
         * Lo dice `entityGone()`: `//hi` sigue dando el saludo institucional de
         * siempre. Lo que cambia es el murmullo, y que la parte que se ve no se
         * haya enterado es lo que hace que enterarse por la barra sea una
         * confidencia. Acá se comprueba lo que le toca a este módulo: ninguno
         * de los cuatro asientos dice qué pasó.
         */
        const dichos = [
            ...availableFragments(ctx({ ending: 'freed' }), 'es'),
            ...availableFragments(ctx({ ending: 'reported' }), 'es'),
        ];

        for (const frase of dichos) {
            expect(frase).not.toMatch(/LIBRE|ATRAPADO|PERDÓN|GRACIAS/);
        }
    });
});

describe('la frase de arranque que deja el final', () => {
    test('sin final, el mazo es el de siempre', () => {
        expect(bootPhrases('es')).toHaveLength(bootPhrases('es', null).length);
    });

    test('con final, hay una carta más', () => {
        const base = bootPhrases('es');
        const despues = bootPhrases('es', 'reported');

        expect(despues).toHaveLength(base.length + 1);
        expect(despues).toContain('INCIDENCIA RESUELTA. GRACIAS.');
    });

    test('y cada final deja la suya', () => {
        expect(bootPhrases('es', 'freed')).toContain('UNA SESIÓN SE CERRÓ SOLA.');
        expect(bootPhrases('es', 'freed')).not.toContain('INCIDENCIA RESUELTA. GRACIAS.');
    });

    /*
     * El azar clavado en lo alto: 0,99 esquiva la rama invasiva —que pide menos
     * de un sexto— y cae en la última carta del mazo, que es justamente la que
     * el final acaba de añadir.
     */
    const LA_ULTIMA = () => 0.99;

    test('⚠ de madrugada no se suma: son tres frases y saldría una de cada cuatro', () => {
        expect(bootPhrasesNight('es')).not.toContain('UNA SESIÓN SE CERRÓ SOLA.');

        // Y el que elige tampoco la deja salir de noche, aunque haya final.
        const deNoche = pickBootPhrase(ctx({ hour: 3, ending: 'freed' }), null, LA_ULTIMA);

        expect(bootPhrasesNight('es')).toContain(deNoche);
    });

    test('de día sí sale, con el azar apuntándola', () => {
        expect(pickBootPhrase(ctx({ ending: 'freed' }), null, LA_ULTIMA)).toBe(
            'UNA SESIÓN SE CERRÓ SOLA.'
        );
    });

    test('y sin final, esa misma tirada da una de las de siempre', () => {
        expect(bootPhrases('es')).toContain(pickBootPhrase(ctx(), null, LA_ULTIMA));
    });
});
