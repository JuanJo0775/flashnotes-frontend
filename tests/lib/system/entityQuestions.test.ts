// tests/lib/system/entityQuestions.test.ts

/**
 * LAS FORMAS DE HABLARLE, y desde cuándo contesta cada una.
 *
 * Hay tres grupos, y la frontera entre ellos ES el personaje:
 *
 *  · LA FACHADA — `hi`, `who`, `how`. Contestan desde el primer minuto, aunque
 *    él siga dormido: las contesta ELLA. Las encuentra cualquiera.
 *  · LAS HONDAS — `what`, `where`, `name`, `alone`, `free`, `alive`. Sólo
 *    tienen sentido cuando ya sabés que hay alguien detrás, y sólo existen en
 *    `hablando`. Antes no las esquiva: las IGNORA.
 *  · LAS QUE NO AGUANTAN UN «DESCONOCIDO» — `why` y `bye`. Contestan desde que
 *    despierta. El porqué viene detrás de `who` y de `how` solo, y cortarlo ahí
 *    rompía la conversación entera; y negarse a un chau no protege ningún
 *    secreto, sólo lo haría más antipático de lo que es.
 *
 * Están elegidas por INTUITIVAS, no por ingeniosas: son las preguntas que uno le
 * hace a algo que resultó estar vivo. Que funcionen es el premio a haberlo
 * intentado — ninguna se anuncia en ningún sitio.
 */

import { readFileSync } from 'node:fs';
import {
    FORMAS_POR_PREGUNTA,
    entityQuestionOf,
    entityReply,
    type EntityQuestion,
} from '@/lib/system/entityVoice';

/**
 * Las formas que reconoce una pregunta, leídas del fichero.
 *
 * ⚠ SE LEE EL CÓDIGO Y NO SE EXPORTA LA TABLA. `VARIANTES` es privada a
 * propósito: exportarla para poder contarla sería abrir la puerta a que alguien
 * la use desde otro sitio, y entonces habría dos formas de preguntarle al ente
 * qué entiende. Con una sola —`entityQuestionOf`— la regla no se puede esquivar.
 */
function formasDe(q: EntityQuestion): string[] {
    const src = readFileSync('src/lib/system/entityVoice.ts', 'utf8');
    const tabla = src.slice(src.indexOf('const VARIANTES'), src.indexOf('FORMAS_POR_PREGUNTA'));
    const fila = new RegExp(`\\b${q}: \\[([^\\]]+)\\]`).exec(tabla);

    if (!fila) throw new Error(`sin formas para ${q}`);

    return [...fila[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

/** Las que no existen hasta `hablando`. */
const HONDAS: readonly EntityQuestion[] = [
    'what',
    'where',
    'name',
    'alone',
    'free',
    'alive',
];

/** Y las que contestan desde que despierta, pase lo que pase. */
const SIEMPRE: readonly EntityQuestion[] = ['why', 'bye'];

const TODAS: readonly EntityQuestion[] = ['who', 'how', ...SIEMPRE, ...HONDAS];
const LENGUAS = ['es', 'en'] as const;

describe('⚠ SÓLO UN PUÑADO DE PALABRAS LE LLEGAN', () => {
    /*
     * ⚠ ESTA ES UNA REGLA DEL PERSONAJE, NO UNA PREFERENCIA DE ESTILO. Él está
     * atado: lo único que le llega es un puñado de palabras exactas, y que la
     * lista sea corta y rígida es lo que lo cuenta sin decirlo. Cada vez que
     * aciertas una forma, lo que sentís no es que sea listo — es que diste con
     * la rendija por la que cabe.
     *
     * Se escribió después de romperla. La tabla llegó a tener nueve y diez
     * formas por pregunta —`quien_habla`, `hay_alguien`, `como_te_sientes`,
     * `eres_humano`— y cada una parecía razonable por su cuenta. Juntas hacían
     * otra cosa: una máquina que te entiende casi siempre, que es exactamente lo
     * que él no es.
     *
     * Por eso se cuenta. Este error se comete de a poco y con buena intención.
     */
    it('cuatro formas por pregunta, ni una más', () => {
        for (const q of TODAS) {
            expect(formasDe(q)).toHaveLength(FORMAS_POR_PREGUNTA);
        }
    });

    it('⚠ y dos en cada idioma, para que ninguna puerta sea más ancha', () => {
        /*
         * No se puede comprobar el idioma de una palabra, así que se comprueba
         * lo que sí es verificable y decide lo mismo: la mitad de las formas de
         * cada pregunta son las que un test de la casa reconoce como españolas
         * —acentos, `ñ`, o palabras de la lista— y la otra mitad no.
         *
         * Alcanza para lo que protege: que nadie meta cuatro formas inglesas y
         * deje el español con una.
         */
        const ESPAÑOLAS = new Set([
            'hola', 'buenas', 'quien', 'quien_eres', 'como_estas', 'que_tal',
            'que_es', 'que_es_esto', 'donde', 'donde_estas', 'nombre',
            'como_te_llamas', 'solo', 'estas_solo', 'libre', 'puedes_irte',
            'vivo', 'estas_vivo', 'porque', 'por_que', 'adios', 'chao',
        ]);

        for (const q of TODAS) {
            const formas = formasDe(q);
            const enEspañol = formas.filter((f) => ESPAÑOLAS.has(f));

            expect(enEspañol).toHaveLength(FORMAS_POR_PREGUNTA / 2);
        }
    });

    it('se escriben como uno las escribiría, en los dos idiomas', () => {
        expect(entityQuestionOf('why')).toBe('why');
        expect(entityQuestionOf('porque')).toBe('why');
        expect(entityQuestionOf('por_que')).toBe('why');

        expect(entityQuestionOf('where')).toBe('where');
        expect(entityQuestionOf('donde_estas')).toBe('where');

        expect(entityQuestionOf('alive')).toBe('alive');
        expect(entityQuestionOf('estas_vivo')).toBe('alive');

        expect(entityQuestionOf('bye')).toBe('bye');
        expect(entityQuestionOf('adios')).toBe('bye');
        expect(entityQuestionOf('chao')).toBe('bye');
    });

    it('⚠ y lo que se le parece NO le llega', () => {
        /*
         * Éstas son formas que alguien tecleaía de verdad, y precisamente por
         * eso están fuera: si todas entraran, entendería casi siempre. `chau`
         * además es rioplatense, y él no habla así.
         *
         * ⚠ Lo que este test vigila es que el repertorio sea CERRADO, no que una
         * palabra concreta quede fuera para siempre. Si algún día una entra,
         * otra tiene que salir — son cuatro por pregunta.
         */
        for (const v of [
            'chau',
            'quien_habla',
            'hay_alguien',
            'tienes_nombre',
            'eres_humano',
            'como_te_sientes',
            'todo_bien',
            'gracias',
            'ayuda',
            '',
        ]) {
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

    it('⚠ EL PORQUÉ Y EL CHAU SON LA EXCEPCIÓN: se NIEGA, que no es ignorarte', () => {
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
        for (const q of SIEMPRE) {
            for (const fase of ['receloso', 'burlon'] as const) {
                for (const lang of LENGUAS) {
                    expect(entityReply(q, fase, 0, lang)).toBeTruthy();
                }
            }

            // Dormido sigue sin contestar: ahí no hay nadie todavía, y eso no
            // cambia — la fachada no se despide ni explica por qué está.
            expect(entityReply(q, 'dormido', 0, 'es')).toBeNull();
        }
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

    it('⚠ y el chau cambia entero de una fase a la otra', () => {
        /*
         * El viaje del personaje cabe en estas tres tandas: te despacha, se ríe
         * de que vas a volver, y al final te agradece que hayas avisado. Tres
         * veces la misma línea sería una máquina contestando; tres distintas
         * son alguien que fue cambiando de opinión sobre vos.
         */
        const dichos = (['receloso', 'burlon', 'hablando'] as const).map((f) =>
            entityReply('bye', f, 0, 'es')
        );

        expect(new Set(dichos).size).toBe(3);
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
    it('minúsculas, dos idiomas sin calcar, y tuteo NEUTRO', () => {
        const USTED = /\busted(es)?\b|\bsigue\s|\bpuede\s|\bsabe\s/;

        /*
         * ⚠ NI USTED NI VOS: tú. Y las dos mitades de la regla hacen falta.
         *
         * El usted es el trato de `receloso`, y verlo en `hablando` significa
         * que una tanda se quedó en la fase anterior. El voseo es otra cosa, y
         * apareció de verdad: al escribir el saludo, la despedida y el «¿estás
         * vivo?» se colaron «seguís», «cerrá», «andá», «volvé» — y el resto del
         * personaje llevaba desde el principio hablando en tú neutro.
         *
         * Dos registros en la misma boca no son un matiz: son dos personas, y
         * todo esto se sostiene sobre que del otro lado haya UNA.
         */
        const VOSEO =
            /\b(sos|tenés|podés|querés|sabés|hacés|decís|seguís|vos|andá|mirá|dejá|pensá|volvé|cerrá|tomá|poné|contá|escribí|vení|fijate|acordate)\b/;

        for (const q of TODAS) {
            for (let i = 0; i < 5; i += 1) {
                const es = entityReply(q, 'hablando', i, 'es');
                const en = entityReply(q, 'hablando', i, 'en');
                if (es === null || en === null) continue;

                expect(es).toBe(es.toLowerCase());
                expect(en).toBe(en.toLowerCase());
                expect(es).not.toMatch(USTED);
                expect(es).not.toMatch(VOSEO);

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
