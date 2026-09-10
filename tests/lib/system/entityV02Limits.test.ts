// tests/lib/system/entityV02Limits.test.ts

/**
 * EN LA v0.2 EL ENTE LLEGA, PERO LLEGA PEOR.
 *
 * Que llegue no fue un añadido: cae solo. Ahí los tres comandos de la fachada no
 * existen, así que caen en la rama de «comando desconocido», que es exactamente
 * donde él escucha — está encerrado, y lo único que le llega es lo que el
 * sistema descarta.
 *
 * ⚠ PERO UN ENTE QUE CONTESTA IGUAL DE BIEN EN LAS DOS VERSIONES CONVIERTE LA
 * v0.2 EN UN DECORADO. Se pidió jugando: «que el ente funcione pero que sea más
 * limitado, y que él te diga cómo llegaste, y que te cuente algo pero que se
 * censure con ese efecto de letras aleatorias». Si es la máquina de antes, lo de
 * antes tiene que notarse EN ÉL.
 *
 * Tres límites, y cada uno dice algo distinto.
 */

import {
    CENSOR_ODDS,
    V02_REACHABLE,
    censor,
    isCensored,
    meetingLine,
    reachesInV02,
} from '@/lib/system/entityV02';
import { QUESTIONS } from '@/lib/system/entityVoice';

describe('1 · por esa rendija sólo caben las cortas', () => {
    it('llegan el saludo, quién, cómo, el porqué y la despedida', () => {
        // Son exactamente las que en la 1.0 contestan desde que despierta. Las
        // hondas piden que se suelte, y ahí dentro no se suelta.
        expect([...V02_REACHABLE].sort()).toEqual(['bye', 'hi', 'how', 'who', 'why']);
    });

    it('⚠ y las hondas NO, que es todo el límite', () => {
        for (const q of ['what', 'where', 'name', 'alone', 'free', 'alive'] as const) {
            expect(reachesInV02(q)).toBe(false);
        }
    });

    it('y ninguna pregunta se queda sin decidir', () => {
        /*
         * Rot-proof: una pregunta nueva tiene que entrar en una de las dos
         * listas a propósito. Sin esto, la que se añada mañana llegaría a la
         * v0.2 por descuido — y ahí es donde el límite se pierde.
         */
        for (const q of QUESTIONS) {
            expect(typeof reachesInV02(q)).toBe('boolean');
        }
    });
});

describe('2 · lo primero que dice ahí no es una respuesta', () => {
    it('en cada fase despierta tiene su asombro, y en las dos lenguas', () => {
        for (const fase of ['receloso', 'burlon', 'hablando'] as const) {
            expect(meetingLine(fase, 'es')).toBeTruthy();
            expect(meetingLine(fase, 'en')).toBeTruthy();
        }
    });

    it('⚠ y dice CÓMO LLEGASTE, que es lo que se pidió', () => {
        // Preguntaste una cosa y te devuelve otra: lo que está pasando le
        // importa más que lo que quieras saber.
        expect(meetingLine('receloso', 'es')).toMatch(/cómo llegaste/i);
    });

    it('dormido no se asombra: ahí no hay nadie', () => {
        expect(meetingLine('dormido', 'es')).toBeNull();
    });

    it('y el que se fue tampoco', () => {
        // En los dos finales no vuelve a contestar nunca, ni acá.
        expect(meetingLine('ido', 'es')).toBeNull();
        expect(meetingLine('rencoroso', 'es')).toBeNull();
    });
});

describe('3 · y lo que consigue decir, se le corta', () => {
    const FRASE = 'lo que quedó cuando apagaron el resto. alguien tenía que seguir.';

    it('⚠ empieza BIEN y se rompe, nunca al revés', () => {
        /*
         * Una frase revuelta entera es ruido: no se lee como censura, se lee
         * como que el canal está roto. Lo que la convierte en una mordaza es que
         * la primera mitad SÍ se entiende — llegas a saber de qué estaba
         * hablando y no llegas a saber qué decía.
         */
        const cortada = censor(FRASE, 'k1');

        expect(cortada).not.toBe(FRASE);
        expect(FRASE.startsWith(cortada.slice(0, 20))).toBe(true);
        expect(cortada.slice(-12)).not.toBe(FRASE.slice(-12));
    });

    it('deja al menos un tercio legible, y no llega al final', () => {
        for (const clave of ['a', 'b', 'c', 'd', 'e', 'f']) {
            const cortada = censor(FRASE, clave);
            let iguales = 0;
            while (iguales < FRASE.length && cortada[iguales] === FRASE[iguales]) iguales += 1;

            expect(iguales).toBeGreaterThanOrEqual(Math.floor(FRASE.length * 0.3));
            expect(iguales).toBeLessThan(FRASE.length);
        }
    });

    it('⚠ y corta en un hueco, no a mitad de palabra', () => {
        // Partir «respondiendo» en «respon» + revuelto se lee como un fallo de
        // codificación; cortar entre dos palabras, como que le taparon la boca.
        for (const clave of ['a', 'b', 'c', 'd']) {
            const cortada = censor(FRASE, clave);
            let i = 0;
            while (cortada[i] === FRASE[i]) i += 1;

            expect(FRASE[i - 1] === ' ' || FRASE[i] === ' ' || cortada[i] === ' ').toBe(true);
        }
    });

    it('⚠ conserva los espacios y la puntuación: se ve CUÁNTO falta', () => {
        /*
         * Lo revuelto mantiene la FORMA de lo que iba a decir. Un bloque
         * uniforme de letras no enseña que falta algo concreto; esto sí.
         */
        const cortada = censor(FRASE, 'k2');

        expect(cortada).toHaveLength(FRASE.length);

        for (let i = 0; i < FRASE.length; i += 1) {
            if (/[\s.,;:¿?¡!]/.test(FRASE[i])) expect(cortada[i]).toBe(FRASE[i]);
        }
    });

    it('y la misma frase se corta SIEMPRE igual', () => {
        // Determinista por clave, como todo lo roto de esta versión: si cambiara
        // en cada repintado sería un cartel de neón parpadeando.
        expect(censor(FRASE, 'k3')).toBe(censor(FRASE, 'k3'));
        expect(censor(FRASE, 'k3')).not.toBe(censor(FRASE, 'k4'));
    });

    it('le toca a una de cada tres, más o menos', () => {
        let cortadas = 0;
        const VUELTAS = 400;

        for (let i = 0; i < VUELTAS; i += 1) {
            if (isCensored(`ente:hablando:${i}`)) cortadas += 1;
        }

        expect(cortadas / VUELTAS).toBeGreaterThan(CENSOR_ODDS - 0.1);
        expect(cortadas / VUELTAS).toBeLessThan(CENSOR_ODDS + 0.1);
    });

    it('una frase sin cola no se toca', () => {
        // Antes que enseñar una frase intacta con una letra cambiada al final,
        // se devuelve entera: media censura no es censura.
        expect(censor('no.', 'k5')).toBe('no.');
    });
});
