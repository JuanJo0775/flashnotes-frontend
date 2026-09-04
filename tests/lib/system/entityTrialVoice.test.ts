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

describe('⚠ TE HABLA DE VOS, NUNCA DE USTED', () => {
    /*
     * No es un detalle de estilo. El usted lo pone a distancia, y él no está
     * lejos: está justo detrás de la pantalla y te ha estado mirando. Además es
     * como habla el resto de la app —«PROBÁ //help»—, así que el usted sonaría
     * a que contesta otro programa.
     *
     * Se vigila porque ya se coló en OCHO frases de una sola tacada: «lo mismo
     * que le dije», «sigue preguntando», «usted guarda cosas».
     *
     * ⚠ El test caza el pronombre y las formas verbales que se colaron. No caza
     * cualquier usted imaginable —para eso haría falta conjugar— así que al
     * escribir frases nuevas hay que releerlas igual.
     */
    const USTED = /\busted(es)?\b|\bsigue\s|\bdejó\s|\bpuede\s|\bharía\s|\bsabe\s|\badivine\b/;

    it('ni en el repertorio de ninguna fase', () => {
        for (const fase of ['receloso', 'burlon', 'hablando'] as const) {
            for (const q of ['who', 'how'] as const) {
                for (let i = 0; i < 6; i += 1) {
                    expect(entityReply(q, fase, i, 'es')!).not.toMatch(USTED);
                }
            }
        }
    });

    it('ni al tender una trampa', () => {
        for (const t of TRAMPAS) {
            expect(trialLine(t, 'es')).not.toMatch(USTED);
        }
    });

    it('ni al decirte cómo saliste de ella', () => {
        for (const s of Object.keys(TRIAL_REPLY) as (keyof typeof TRIAL_REPLY)[]) {
            expect(TRIAL_REPLY[s].es).not.toMatch(USTED);
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
