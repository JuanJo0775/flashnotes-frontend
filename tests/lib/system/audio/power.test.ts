// tests/lib/system/audio/power.test.ts

/**
 * LAS VOCES DE LA MÁQUINA ENCENDIÉNDOSE Y APAGÁNDOSE.
 *
 * Hasta acá el sonido cubría lo que hacés vos —teclear, encontrar, golpear— y no
 * lo que le pasa a la máquina. Faltaba todo lo grande: el botón que apretás, el
 * tubo cayéndose, el barrido, el arranque.
 *
 * ⚠ Y ESTAS SON LAS QUE MÁS FÁCIL SUENAN A VIDEOJUEGO. Un barrido descendente es
 * el efecto más manoseado que existe; lo que lo salva o lo hunde es que esté
 * DESAFINADO y que termine en algo físico, no en silencio.
 */

import { CATEGORY_OF, button, capacitor, head, sweep, thud } from '@/lib/system/audio/voices';
import { ensureAudio, teardownAudio } from '@/lib/system/audio/context';
import { installFakeAudio, lastContext, type FakeNode } from './fakeAudio';

let quitarFalso: () => void;

beforeEach(() => {
    localStorage.clear();
    quitarFalso = installFakeAudio();
});

afterEach(() => {
    teardownAudio();
    quitarFalso();
});

function azar(semilla: number): () => number {
    let s = semilla;
    return () => {
        s = (s * 1_103_515_245 + 12_345) % 2_147_483_648;
        return s / 2_147_483_648;
    };
}

function nuevos(desde: number): FakeNode[] {
    return lastContext()!.created.slice(desde);
}

function fuentes(desde: number): FakeNode[] {
    return nuevos(desde).filter((n) => n.kind === 'bufferSource' || n.kind === 'oscillator');
}

describe('el botón', () => {
    it('⚠ NO es la misma voz que una tecla', () => {
        /*
         * Son dos objetos distintos y suenan distinto: una tecla tiene cuerpo de
         * plástico y placa; un botón de interfaz es un chasquido más seco y más
         * corto. Si sonaran igual, apretar un botón se leería como haber escrito
         * una letra — que es justo lo que no pasó.
         */
        const g = ensureAudio()!;
        const antes = lastContext()!.created.length;

        button(g, azar(1));

        const largo = Math.max(...fuentes(antes).map((f) => f.stopped! - f.started!));

        expect(largo).toBeLessThan(0.05);
    });

    it('y va por el aire: es un objeto, no algo que emita la bocinita', () => {
        const g = ensureAudio()!;
        const antes = lastContext()!.created.length;

        button(g, azar(2));

        expect(fuentes(antes).length).toBeGreaterThan(0);
    });
});

describe('el barrido descendente', () => {
    it('baja: termina más grave de donde empezó', () => {
        const g = ensureAudio()!;
        const antes = lastContext()!.created.length;

        sweep(g, { fromHz: 900, toHz: 60, ms: 700 }, azar(3));

        const osc = fuentes(antes).find((n) => n.kind === 'oscillator')!;
        const rampas = osc.frequency.calls;

        expect(rampas.length).toBeGreaterThan(0);
        expect(rampas[rampas.length - 1].value).toBeLessThan(900);
    });

    it('⚠ y va DESAFINADO: son dos osciladores, no uno', () => {
        /*
         * Un barrido de un solo oscilador afinado es el efecto de videojuego más
         * manoseado que existe. Dos, separados un poco y batiendo entre ellos,
         * es una señal cayéndose. La diferencia entre las dos cosas es
         * literalmente un oscilador.
         */
        const g = ensureAudio()!;
        const antes = lastContext()!.created.length;

        sweep(g, { fromHz: 900, toHz: 60, ms: 700 }, azar(4));

        const osciladores = fuentes(antes).filter((n) => n.kind === 'oscillator');
        const hz = osciladores.map((o) => o.frequency.value);

        expect(osciladores.length).toBeGreaterThanOrEqual(2);
        expect(hz[0]).not.toBe(hz[1]);
    });
});

describe('el impacto lejano', () => {
    it('es grave y tiene cola: algo cayó, no algo se apagó', () => {
        const g = ensureAudio()!;
        const antes = lastContext()!.created.length;

        thud(g, azar(5));

        const osc = fuentes(antes).find((n) => n.kind === 'oscillator')!;

        expect(osc.frequency.value).toBeLessThan(120);
        expect(osc.stopped! - osc.started!).toBeGreaterThan(0.2);
    });
});

describe('el arranque', () => {
    it('⚠ el condensador es UN golpe, no un pitido', () => {
        /*
         * Es el sonido de la corriente entrando: un golpe de baja frecuencia con
         * ataque instantáneo. Si se le pone tono, deja de ser electricidad y
         * pasa a ser una nota — y una nota al encender suena a menú de consola.
         */
        const g = ensureAudio()!;
        const antes = lastContext()!.created.length;

        capacitor(g, azar(6));

        const osc = fuentes(antes).find((n) => n.kind === 'oscillator')!;

        expect(osc.frequency.value).toBeLessThan(90);
        expect(osc.stopped! - osc.started!).toBeLessThan(0.35);
    });

    it('la búsqueda de cabezal son VARIOS golpes, no uno', () => {
        // Un cabezal buscando no hace un ruido: hace una serie. Uno solo se lee
        // como un clic cualquiera; tres o cuatro se leen como algo buscando.
        const g = ensureAudio()!;
        const antes = lastContext()!.created.length;

        head(g, azar(7));

        expect(fuentes(antes).length).toBeGreaterThanOrEqual(3);
    });

    it('y esos golpes NO caen a intervalos iguales', () => {
        /*
         * Un cabezal no es un metrónomo: busca, para, vuelve. Espaciados
         * exactamente igual suenan a bucle, que es el fallo que el §3 prohíbe
         * para todo lo demás y que acá se cuela con la forma del ritmo.
         */
        const g = ensureAudio()!;
        const antes = lastContext()!.created.length;

        head(g, azar(8));

        const inicios = fuentes(antes)
            .map((f) => f.started!)
            .sort((a, b) => a - b);
        const huecos = inicios.slice(1).map((t, i) => Number((t - inicios[i]).toFixed(4)));

        expect(new Set(huecos).size).toBeGreaterThan(1);
    });
});

describe('todas declaran familia', () => {
    it('para que el presupuesto las alcance', () => {
        expect(CATEGORY_OF.button).toBe('keys');
        expect(CATEGORY_OF.head).toBe('keys');
        expect(CATEGORY_OF.capacitor).toBe('glitch');
        expect(CATEGORY_OF.sweep).toBe('failure');
        expect(CATEGORY_OF.thud).toBe('failure');
    });
});
