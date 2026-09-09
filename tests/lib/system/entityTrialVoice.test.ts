// tests/lib/system/entityTrialVoice.test.ts

/**
 * CÓMO SUENAN LAS TRAMPAS.
 *
 * El contrato del tono no cambia porque ahora mida: calculador, sarcástico, con
 * humor. Si una suena a amenaza está mal escrita.
 *
 * ⚠ Y HAY UNA QUE IMPORTA MÁS QUE LAS DEMÁS: contestar mal la pregunta NO puede
 * decirte que fallaste. Tiene que decirte algo peor — que ya lo sabía.
 */

import { entityReply, trialLine, TRIAL_REPLY } from '@/lib/system/entityVoice';

const TRAMPAS = ['word', 'lie', 'offer', 'dare'] as const;
const LENGUAS = ['es', 'en'] as const;

describe('cada trampa tiene su frase', () => {
    it('en los dos idiomas, y el inglés no es calca', () => {
        for (const t of TRAMPAS) {
            expect(trialLine(t, 'es')).toBeTruthy();
            expect(trialLine(t, 'en')).toBeTruthy();
            expect(trialLine(t, 'es')).not.toBe(trialLine(t, 'en'));
        }
    });

    it('todas en minúsculas: sigue siendo él', () => {
        for (const t of TRAMPAS) {
            for (const lang of LENGUAS) {
                const linea = trialLine(t, lang);
                expect(linea).toBe(linea.toLowerCase());
            }
        }
    });
});

describe('la oferta pregunta de verdad', () => {
    it('lleva el [s/n] para que se vea que espera respuesta', () => {
        // Sin él la oferta parecería retórica y nadie contestaría — y es el
        // mismo mecanismo de `//reset`, que ya enseña sus letras.
        expect(trialLine('offer', 'es')).toContain('[s/n]');
        expect(trialLine('offer', 'en')).toContain('[y/n]');
    });
});

describe('el reto NO dice qué vas a descubrir', () => {
    it('nombra //reset y no promete nada concreto', () => {
        // Si dijera qué pasa dejaría de ser un reto y sería una instrucción.
        for (const lang of LENGUAS) {
            const linea = trialLine('dare', lang);
            expect(linea).toContain('//reset');
            expect(linea).not.toMatch(/broma|carita|pieza|joke|prank|piece/i);
        }
    });
});

describe('⚠ contestar mal no te dice que fallaste', () => {
    it('te dice que ya lo sabía', () => {
        /*
         * «Incorrecto» es un formulario corrigiéndote. Él no corrige: te
         * informa de que nunca esperó otra cosa, y eso duele en un sitio
         * distinto. Es la frase más importante de la etapa.
         */
        for (const lang of LENGUAS) {
            const mal = TRIAL_REPLY.wordBad[lang];
            expect(mal).toBe(mal.toLowerCase());
            expect(mal).not.toMatch(/incorrect|error|\bmal\b|wrong|fail/i);
        }
    });
});

describe('las respuestas a cada salida existen y son suyas', () => {
    it('en los dos idiomas, en minúsculas, y sin calcar', () => {
        const salidas = [
            'wordOk',
            'wordBad',
            'lieProved',
            'offerTaken',
            'offerRefused',
            'dareLater',
        ] as const;

        for (const s of salidas) {
            for (const lang of LENGUAS) {
                const linea = TRIAL_REPLY[s][lang];
                expect(linea).toBeTruthy();
                expect(linea).toBe(linea.toLowerCase());
            }
            expect(TRIAL_REPLY[s].es).not.toBe(TRIAL_REPLY[s].en);
        }
    });
});

describe('⚠ EL PRONOMBRE ES EL ARCO', () => {
    /*
     * Empieza tratándote de USTED, igual que el resto de la máquina —«no te
     * tutea porque no sabe quién sos», dice `lore.ts`— y acaba tratándote de TÚ.
     * El cambio ocurre DENTRO de `burlon`, sin que nadie lo anuncie.
     *
     * ⚠ ESTE TEST YA ESTUVO MAL DOS VECES, en las dos direcciones. Primero
     * exigía usted en todo —y se coló en ocho frases del ente, que ya debía
     * tutear—; después exigía tuteo en todo, y con eso `receloso` perdía la
     * distancia que es justamente lo que hace que acercarse signifique algo.
     * Lo que hay que vigilar no es un pronombre: es el VIAJE.
     */

    /** Formas de usted que aparecen en el repertorio. */
    const USTED =
        /\busted\b|\bsigue\s|\bpregunte\b|\bdecirle\b|\bdijera\b|\bharía\b|\bdejó\s|\badivine\b|\bpuede\s/;

    /** Y de tuteo. Nunca voseo: es tú, no vos. */
    const TU = /\btú\b|\bsabes\b|\bpuedes\b|\bpreguntas\b|\bquieres\b|\bte\s/;

    /** Voseo, que no debe aparecer en ninguna parte. */
    const VOS =
        /\bvos\b|\bsabés\b|\bpodés\b|\bquerés\b|\bpreguntá\b|\bmirá\b|\bescribí\b|\bdejame\b|\bandá\b|\bllená\b/;

    it('en `receloso` te trata de usted', () => {
        // Todavía no sabe quién sos. Contesta como contestaría un formulario.
        const dichas = ['who', 'how'].flatMap((q) =>
            Array.from({ length: 6 }, (_, i) =>
                entityReply(q as never, 'receloso', i, 'es')
            )
        );

        expect(dichas.some((l) => l !== null && USTED.test(l))).toBe(true);
        expect(dichas.filter((l) => l !== null && TU.test(l))).toHaveLength(0);
    });

    it('en `burlon` cruza: empieza de usted y termina de tú', () => {
        // El arco entero en miniatura, y sin anunciarlo.
        const primera = entityReply('who', 'burlon', 0, 'es')!;
        const ultima = entityReply('who', 'burlon', 99, 'es')!;

        expect(primera).toMatch(USTED);
        expect(ultima).toMatch(TU);
    });

    it('en `hablando` te trata de tú, y ya no de usted', () => {
        for (const q of ['who', 'how'] as const) {
            for (let i = 0; i < 6; i += 1) {
                const linea = entityReply(q, 'hablando', i, 'es');
                if (linea === null) continue;
                expect(linea).not.toMatch(USTED);
            }
        }
    });

    it('⚠ y NUNCA vosea: es tú, no vos', () => {
        /*
         * El voseo es de otro sitio. Se coló entero una vez —«sabés», «podés»,
         * «preguntá»— y hubo que revertirlo frase por frase.
         */
        for (const fase of ['receloso', 'burlon', 'hablando'] as const) {
            for (const q of ['who', 'how'] as const) {
                for (let i = 0; i < 8; i += 1) {
                    const linea = entityReply(q, fase, i, 'es');
                    if (linea === null) continue;
                    expect(linea).not.toMatch(VOS);
                }
            }
        }
    });

    it('ni al tender una trampa ni al rematarla', () => {
        for (const t of TRAMPAS) expect(trialLine(t, 'es')).not.toMatch(VOS);

        for (const s of Object.keys(TRIAL_REPLY) as (keyof typeof TRIAL_REPLY)[]) {
            expect(TRIAL_REPLY[s].es).not.toMatch(VOS);
        }
    });
});

describe('hablando tiene voz propia', () => {
    it('contesta, en los dos idiomas y en minúsculas', () => {
        for (const q of ['who', 'how'] as const) {
            for (const lang of LENGUAS) {
                const linea = entityReply(q, 'hablando', 0, lang)!;
                expect(linea).toBeTruthy();
                expect(linea).toBe(linea.toLowerCase());
            }
        }
    });

    it('y la costura con burlón tampoco salta', () => {
        // La misma regla de la etapa 1, ahora sobre la juntura nueva.
        for (const q of ['who', 'how'] as const) {
            for (const lang of LENGUAS) {
                const ultima = entityReply(q, 'burlon', 99, lang)!;
                const primera = entityReply(q, 'hablando', 0, lang)!;

                const salto = Math.abs(primera.length - ultima.length);
                expect(salto).toBeLessThanOrEqual(Math.max(ultima.length, 20));
            }
        }
    });
});
