// tests/lib/system/pistaDelReloj.test.ts

/**
 * LA PISTA DEL RELOJ, QUE ES LA QUE SOSTIENE MEDIO JUEGO.
 *
 * ⚠ SIN ELLA, LA v0.2 NO EXISTE. La palabra en morse de la hora es su puerta, y
 * detrás está todo lo demás: el ente despertando, sus trampas, los dos finales.
 * El documento de pendientes lo tenía escrito como riesgo desde el principio
 * —«si nadie sospecha que eso es morse, la v0.2 no existe»— y era literal: no
 * había una sola cosa en toda la app que apuntara al reloj.
 *
 * Es el mismo error del umbral de diez colapsos: contenido construido detrás de
 * una puerta que nadie sabe que es una puerta.
 *
 * ⚠ Y LA PISTA NO PUEDE NOMBRAR LA SOLUCIÓN. Una que diga «morse» o «mirá el
 * reloj» no es una pista, es un tutorial con acento. Estas dos dicen algo que la
 * máquina diría de todos modos —se queja de que nadie la lee— y la sospecha la
 * pone quien escucha. De eso van estos tests: de que la pista EXISTA y de que
 * siga sin regalar nada.
 */

import { MAX_FRAGMENT_LENGTH, availableFragments } from '@/lib/system/lore';

/** Un contexto de uso normal: media tarde, recién abierto, tecleando. */
const ctx = (over: Partial<Parameters<typeof availableFragments>[0]> = {}) => ({
    hour: 15,
    sessionMs: 60_000,
    idleMs: 0,
    ...over,
});

describe('la duda, para cualquiera', () => {
    it('⚠ el sistema se queja de que nadie lee la hora', () => {
        // Un reloj no se «lee»: se mira. Decir que nadie lo lee es decir que hay
        // algo escrito, sin decirlo.
        expect(availableFragments(ctx(), 'es')).toContain('[NADIE LEE LA HORA]');
        expect(availableFragments(ctx(), 'en')).toContain('[THE HOUR UNREAD]');
    });

    it('y sale desde el primer minuto, sin nada que haber hecho antes', () => {
        /*
         * Es la única de la lista que sirve para algo, así que no puede estar
         * detrás de ninguna condición: quien todavía no encontró nada es
         * exactamente quien la necesita.
         */
        const recienLlegado = availableFragments(
            { hour: 11, sessionMs: 0, idleMs: 0 },
            'es'
        );

        expect(recienLlegado).toContain('[NADIE LEE LA HORA]');
    });

    it('⚠ y no nombra la solución', () => {
        // Ni «morse», ni «clic», ni «tres veces». La sospecha la pone quien
        // escucha, o deja de ser un hallazgo y pasa a ser un encargo.
        for (const lang of ['es', 'en'] as const) {
            for (const frase of availableFragments(ctx(), lang)) {
                expect(frase.toLowerCase()).not.toContain('morse');
                expect(frase.toLowerCase()).not.toMatch(/clic|click|pulsa|tap/);
            }
        }
    });
});

describe('la confirmación, sólo para quien ya vio los puntos y las rayas', () => {
    it('antes de verlos no existe', () => {
        // Sin haberlos visto la frase no significa nada, y gastaría una
        // aparición de las pocas que hay.
        expect(availableFragments(ctx(), 'es')).not.toContain('[· — ·  SIN ACUSE]');
    });

    it('⚠ y después sí: la máquina admite que emite y nadie contesta', () => {
        const visto = availableFragments(ctx({ sawMorse: true }), 'es');

        expect(visto).toContain('[· — ·  SIN ACUSE]');
    });

    it('la duda sigue estando después: las dos conviven', () => {
        // La primera no se apaga al ganar la segunda. Quien vio el morse y no
        // lo descifró necesita las dos.
        const visto = availableFragments(ctx({ sawMorse: true }), 'es');

        expect(visto).toContain('[NADIE LEE LA HORA]');
    });

    it('y trae puntos y rayas de verdad', () => {
        // Es la mitad del trabajo: enseñar el alfabeto en el sitio donde se
        // habla del reloj, para que las dos cosas se aten solas.
        expect(availableFragments(ctx({ sawMorse: true }), 'es').join(' ')).toMatch(
            /[·—]/
        );
    });
});

describe('⚠ y la maqueta no se mueve por esto', () => {
    it('ninguna de las dos pasa del ancho reservado', () => {
        /*
         * `MAX_FRAGMENT_LENGTH` es lo que la barra de estado RESERVA para que el
         * rótulo no empuje al resto cuando cambia. La versión inglesa de la
         * primera pista medía 24 y hubo que acortarla: ensanchar el hueco por
         * una frase mueve la barra entera, para siempre y en todas las pantallas.
         */
        for (const lang of ['es', 'en'] as const) {
            for (const frase of availableFragments(ctx({ sawMorse: true }), lang)) {
                expect(frase.length).toBeLessThanOrEqual(MAX_FRAGMENT_LENGTH);
            }
        }
    });
});
