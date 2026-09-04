// tests/lib/system/entityVoice.test.ts

/**
 * UNA FASE NO ES UNA VOZ: ES UN TRAMO.
 *
 * Es la regla que sostiene que el ente se sienta una persona y no una máquina de
 * estados. Pasar de «no admite nada» a «se ríe de vos» de un mensaje al
 * siguiente no se lee como que se soltó: se lee como que lo reemplazaron. Y en
 * cuanto se lee así, deja de ser alguien.
 *
 * El repertorio va ordenado dentro de cada fase y se indexa por cuántos
 * intercambios llevás en ella. Las últimas entradas de una fase ya se inclinan
 * hacia la siguiente.
 */

import { entityReply, type EntityQuestion } from '@/lib/system/entityVoice';

const PREGUNTAS: EntityQuestion[] = ['who', 'how'];
const HABLA: readonly ('receloso' | 'burlon')[] = ['receloso', 'burlon'];

describe('dormido', () => {
    it('no contesta: la fachada no tiene nada detrás todavía', () => {
        // Quien llama tiene que caer al comportamiento de siempre.
        expect(entityReply('who', 'dormido', 0, 'es')).toBeNull();
    });
});

describe('el repertorio', () => {
    it('contesta en receloso y en burlón, en los dos idiomas', () => {
        for (const q of PREGUNTAS) {
            for (const fase of HABLA) {
                expect(entityReply(q, fase, 0, 'es')).toBeTruthy();
                expect(entityReply(q, fase, 0, 'en')).toBeTruthy();
            }
        }
    });

    it('avanza con los intercambios', () => {
        const primera = entityReply('who', 'receloso', 0, 'es');
        const segunda = entityReply('who', 'receloso', 1, 'es');

        expect(primera).not.toBe(segunda);
    });

    it('y con un índice pasado se queda en la última, no revienta', () => {
        // Quedarse callado de golpe sería otro salto.
        expect(entityReply('who', 'receloso', 99, 'es')).toBeTruthy();
    });
});

describe('habla en minúsculas', () => {
    it('siempre, en las dos lenguas y en las dos fases', () => {
        // El resto del sistema grita en mayúsculas porque es un formulario. Él
        // es lo que hay detrás del formulario, y ese contraste hace el trabajo
        // de mil adjetivos.
        for (const q of PREGUNTAS) {
            for (const fase of HABLA) {
                for (const lang of ['es', 'en'] as const) {
                    for (let i = 0; i < 6; i += 1) {
                        const texto = entityReply(q, fase, i, lang);
                        if (texto === null) continue;
                        expect(texto).toBe(texto.toLowerCase());
                    }
                }
            }
        }
    });
});

describe('el inglés no es una calca', () => {
    it('ninguna respuesta es idéntica en los dos idiomas', () => {
        for (const q of PREGUNTAS) {
            for (const fase of HABLA) {
                for (let i = 0; i < 6; i += 1) {
                    const es = entityReply(q, fase, i, 'es');
                    const en = entityReply(q, fase, i, 'en');
                    if (es === null || en === null) continue;
                    expect(es).not.toBe(en);
                }
            }
        }
    });
});

describe('LA COSTURA', () => {
    /*
     * ⚠ EL TEST MÁS IMPORTANTE DE ESTE MÓDULO.
     *
     * Una costura se nota cuando la frase de después es MUCHO más larga, más
     * ingeniosa o más cruel que la de antes. El largo es lo único de eso que se
     * puede medir, así que se mide: entre la última respuesta de `receloso` y la
     * primera de `burlon` no puede haber un salto de registro.
     *
     * No fija el tono —eso lo fija quien escribe— pero caza el error más común:
     * escribir el repertorio de cada fase por separado y que el primero de la
     * siguiente salga con otro aire.
     */
    it('no hay salto de largo entre el final de una fase y el principio de la otra', () => {
        for (const q of PREGUNTAS) {
            for (const lang of ['es', 'en'] as const) {
                const ultima = entityReply(q, 'receloso', 99, lang)!;
                const primera = entityReply(q, 'burlon', 0, lang)!;

                const salto = Math.abs(primera.length - ultima.length);
                expect(salto).toBeLessThanOrEqual(Math.max(ultima.length, 20));
            }
        }
    });
});
