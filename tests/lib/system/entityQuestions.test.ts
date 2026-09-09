// tests/lib/system/entityQuestions.test.ts

/**
 * LAS OCHO FORMAS DE HABLARLE.
 *
 * ⚠ DOS SON VIEJAS Y SEIS SON SUYAS. `who` y `how` existían como fachada desde
 * antes —el espejo de `//whoami`— y por eso las encuentra cualquiera. Las otras
 * seis sólo tienen sentido cuando ya sabés que hay alguien detrás.
 *
 * Están elegidas por INTUITIVAS, no por ingeniosas: son las preguntas que uno le
 * hace a algo que resultó estar vivo. Que funcionen es el premio a haberlo
 * intentado — ninguna se anuncia en ningún sitio.
 */

import {
    entityQuestionOf,
    entityReply,
    type EntityQuestion,
} from '@/lib/system/entityVoice';

const HONDAS: readonly EntityQuestion[] = [
    'what',
    'why',
    'where',
    'name',
    'alone',
    'free',
];
const TODAS: readonly EntityQuestion[] = ['who', 'how', ...HONDAS];
const LENGUAS = ['es', 'en'] as const;

describe('se escriben como uno las escribiría', () => {
    it('en inglés y en español, y con guión bajo o sin él', () => {
        expect(entityQuestionOf('why')).toBe('why');
        expect(entityQuestionOf('porque')).toBe('why');
        expect(entityQuestionOf('por_que')).toBe('why');

        expect(entityQuestionOf('where')).toBe('where');
        expect(entityQuestionOf('donde_estas')).toBe('where');

        expect(entityQuestionOf('nombre')).toBe('name');
        expect(entityQuestionOf('como_te_llamas')).toBe('name');

        expect(entityQuestionOf('solo')).toBe('alone');
        expect(entityQuestionOf('libre')).toBe('free');
        expect(entityQuestionOf('que_es_esto')).toBe('what');
    });

    it('y el repertorio sigue siendo CERRADO', () => {
        // Si entendiera cualquier cosa dejaría de estar atrapado.
        /*
         * ⚠ `hola` YA NO SIRVE DE EJEMPLO, y el cambio es correcto: desde que
         * el saludo es una de sus preguntas, `hola` es la forma castellana de
         * `hi` — igual que `quien` lo es de `who` y `donde` de `where`. Lo que
         * este test vigila es que el repertorio sea CERRADO, no que una palabra
         * concreta quede fuera para siempre.
         */
        for (const v of ['gracias', 'ayuda', 'cuando', 'cuanto', '']) {
            expect(entityQuestionOf(v)).toBeNull();
        }
    });
});

describe('⚠ LAS HONDAS NO EXISTEN HASTA QUE TE SUELTA EL LORE', () => {
    it('antes de `hablando` no las contesta: las ignora', () => {
        /*
         * Y no es lo mismo que esquivarlas. Una respuesta esquiva ya admite que
         * entendió la pregunta, y admitir eso en `receloso` sería regalar medio
         * personaje. Acá simplemente no hay nada, así que quien pruebe `//alone`
         * en la primera hora se lleva un «comando desconocido» — que en ese
         * momento es exactamente lo que es.
         */
        for (const q of HONDAS.filter((q) => q !== 'why')) {
            for (const fase of ['dormido', 'receloso', 'burlon'] as const) {
                expect(entityReply(q, fase, 0, 'es')).toBeNull();
            }
        }
    });

    it('⚠ EL PORQUÉ ES LA EXCEPCIÓN: se NIEGA, que no es lo mismo que ignorarte', () => {
        /*
         * REPORTADO JUGANDO: «el why me aparece como desconocido luego de hablar
         * con él y decirle hi, how, who».
         *
         * Venías de tres preguntas que sí contesta, seguías con la más natural
         * de todas, y la máquina te decía que ese comando no existe. El
         * razonamiento de la regla de arriba vale para `//alone` o `//free`, que
         * nadie teclea por casualidad; el porqué viene detrás de `who` y de
         * `how` solo, y cortarlo ahí no lo hacía más misterioso — rompía la
         * conversación entera.
         *
         * Lo que había que proteger no era el silencio, era el SECRETO: se niega
         * y no cuenta nada.
         */
        for (const fase of ['receloso', 'burlon'] as const) {
            for (const lang of LENGUAS) {
                expect(entityReply('why', fase, 0, lang)).toBeTruthy();
            }
        }

        // Dormido sigue sin contestar: ahí no hay nadie todavía, y eso no cambia.
        expect(entityReply('why', 'dormido', 0, 'es')).toBeNull();
    });

    it('y lo que dice antes NO adelanta la respuesta de después', () => {
        // Negarse cuenta que no quiere; contestar contaría por qué está. Si
        // alguien copiara acá una línea del repertorio hondo, esto lo dice.
        const antes = ['receloso', 'burlon'].map((f) =>
            entityReply('why', f as 'receloso', 0, 'es')
        );
        const despues = entityReply('why', 'hablando', 0, 'es');

        for (const linea of antes) expect(linea).not.toBe(despues);
    });

    it('y en `hablando` las contesta todas', () => {
        for (const q of HONDAS) {
            for (const lang of LENGUAS) {
                expect(entityReply(q, 'hablando', 0, lang)).toBeTruthy();
            }
        }
    });
});

describe('las dos de siempre sí están antes', () => {
    it('porque son la fachada, no él', () => {
        for (const q of ['who', 'how'] as const) {
            expect(entityReply(q, 'receloso', 0, 'es')).toBeTruthy();
            expect(entityReply(q, 'burlon', 0, 'es')).toBeTruthy();
        }
    });
});

describe('hay repertorio de verdad, no una frase por pregunta', () => {
    it('cada una tiene varias, y no se repiten entre sí', () => {
        /*
         * Con una sola línea por pregunta, la segunda vez que la tecleás ya
         * sabés que no hay nadie: es una respuesta enlatada. El repertorio es lo
         * que sostiene la ilusión de que contesta y no de que devuelve.
         */
        for (const q of TODAS) {
            const dichas = new Set(
                Array.from({ length: 4 }, (_, i) =>
                    entityReply(q, 'hablando', i, 'es')
                )
            );

            expect(dichas.size).toBeGreaterThanOrEqual(3);
        }
    });

    it('y ninguna pregunta contesta lo mismo que otra', () => {
        // Si dos preguntas distintas dan la misma frase, se nota que detrás hay
        // una tabla y no alguien.
        const primeras = TODAS.map((q) => entityReply(q, 'hablando', 0, 'es'));

        expect(new Set(primeras).size).toBe(TODAS.length);
    });
});

describe('todo lo suyo suena igual', () => {
    it('minúsculas, dos idiomas sin calcar, y voseo', () => {
        const USTED = /\busted(es)?\b|\bsigue\s|\bpuede\s|\bsabe\s/;

        for (const q of TODAS) {
            for (let i = 0; i < 5; i += 1) {
                const es = entityReply(q, 'hablando', i, 'es');
                const en = entityReply(q, 'hablando', i, 'en');
                if (es === null || en === null) continue;

                expect(es).toBe(es.toLowerCase());
                expect(en).toBe(en.toLowerCase());
                expect(es).not.toMatch(USTED);

                /*
                 * ⚠ LAS MUY CORTAS PUEDEN COINCIDIR, y no es una calca.
                 *
                 * La regla existe para cazar traducción perezosa. Pero a «¿podés
                 * irte?» él contesta «no.», y en inglés eso también se dice
                 * «no.» — es la misma palabra, no un descuido. Cambiarla sólo
                 * para satisfacer al test le quitaría lo único que tiene, que es
                 * ser tajante.
                 */
                if (es.length > 4) expect(es).not.toBe(en);
            }
        }
    });
});
