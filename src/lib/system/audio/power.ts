// src/lib/system/audio/power.ts

/**
 * La máquina encendiéndose, apagándose y cayéndose.
 *
 * Hasta acá el sonido cubría lo que hacés vos —teclear, encontrar, golpear— y no
 * lo que le PASA a la máquina. Faltaba todo lo grande: el botón que apretás, el
 * tubo muriéndose, el barrido, el arranque.
 *
 * ⚠ Y SON LAS QUE MÁS FÁCIL SUENAN A VIDEOJUEGO. Un barrido descendente es el
 * efecto más manoseado que existe; lo que lo salva o lo hunde es que vaya
 * desafinado y que termine en algo físico en vez de en silencio.
 *
 * Comparten los ayudantes de `voices.ts` a propósito: con envolventes y
 * compensaciones propias, estas voces sonarían de otra familia sin que nadie lo
 * hubiera decidido.
 */

import type { AudioGraph } from '@/lib/system/audio/context';
import type { Random } from '@/lib/system/lore';
import { vary, varyInt } from '@/lib/system/audio/jitter';
import { arrancar, filtro, fuenteDeRuido, percutir } from '@/lib/system/audio/voices';

/**
 * EL BOTÓN DE LA INTERFAZ. Parecido a una tecla, pero NO la misma voz.
 *
 * ⚠ Son dos objetos distintos. Una tecla tiene cuerpo de plástico y de placa; un
 * botón es un chasquido más seco y más corto. Si sonaran igual, apretar un botón
 * se leería como haber escrito una letra — que es justo lo que no pasó.
 */
export function button(g: AudioGraph, random: Random = Math.random) {
    const t0 = g.ctx.currentTime;

    const chasquido = fuenteDeRuido(g, random);
    const f = filtro(g, 'bandpass', vary(2_100, 0.08, random), 1.8);
    const gain = g.ctx.createGain();
    percutir(gain, t0, vary(0.38, 0.12, random) * f.makeup, 0.0005, vary(0.012, 0.2, random));
    chasquido.connect(f.nodo).connect(gain);
    gain.connect(g.air);
    gain.connect(g.room);
    arrancar(chasquido, t0, random);
    chasquido.stop(t0 + 0.022);

    /*
     * El retorno del muelle, muy corto y más agudo. Es lo que separa esto de un
     * clic de ratón y lo acerca a un pulsador de panel: un botón de plástico
     * duro suena dos veces, al bajar y al volver.
     */
    const vuelta = fuenteDeRuido(g, random);
    const fv = filtro(g, 'bandpass', vary(3_400, 0.1, random), 2.6);
    const gVuelta = g.ctx.createGain();
    const cuando = t0 + vary(0.011, 0.3, random);
    percutir(gVuelta, cuando, vary(0.14, 0.2, random) * fv.makeup, 0.0004, 0.006);
    vuelta.connect(fv.nodo).connect(gVuelta);
    gVuelta.connect(g.air);
    arrancar(vuelta, cuando, random);
    vuelta.stop(cuando + 0.012);
}

/**
 * EL BARRIDO: una señal cayéndose.
 *
 * ⚠ VAN DOS OSCILADORES Y ES LO QUE LO SALVA. Uno solo, afinado, es el efecto de
 * videojuego más manoseado que existe. Dos, separados un poco y batiendo entre
 * ellos, es una señal perdiéndose. La diferencia entre las dos cosas es
 * literalmente un oscilador.
 */
export function sweep(
    g: AudioGraph,
    { fromHz, toHz, ms }: { fromHz: number; toHz: number; ms: number },
    random: Random = Math.random
) {
    const t0 = g.ctx.currentTime;
    const largo = vary(ms / 1_000, 0.06, random);

    const gain = g.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(vary(0.5, 0.1, random), t0 + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + largo);
    gain.connect(g.speaker);
    gain.connect(g.room);

    /*
     * El desvío NO es simétrico a propósito: dos voces igual de separadas baten
     * de forma regular, y lo regular vuelve a sonar a efecto. Una arrastra un
     * poco más que la otra y el batido nunca se repite igual.
     */
    for (const desvio of [1, vary(1.021, 0.004, random)]) {
        const osc = g.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(vary(fromHz, 0.02, random) * desvio, t0);
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, toHz * desvio), t0 + largo);
        osc.connect(gain);
        osc.start(t0);
        osc.stop(t0 + largo + 0.02);
    }
}

/**
 * EL IMPACTO LEJANO: algo cayó, y cayó detrás.
 *
 * Grave y con cola. Sin cola sería un golpe en la mesa; con ella, algo grande
 * que llegó al suelo a cierta distancia.
 */
export function thud(g: AudioGraph, random: Random = Math.random) {
    const t0 = g.ctx.currentTime;
    const largo = vary(0.42, 0.12, random);

    const osc = g.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(vary(84, 0.08, random), t0);
    osc.frequency.exponentialRampToValueAtTime(vary(38, 0.08, random), t0 + largo * 0.7);

    const gain = g.ctx.createGain();
    percutir(gain, t0, vary(0.6, 0.1, random), 0.004, largo);
    osc.connect(gain);
    gain.connect(g.air);
    gain.connect(g.room);
    osc.start(t0);
    osc.stop(t0 + largo + 0.05);

    // El polvo. Sin él el impacto es una NOTA; con él, algo que se rompió.
    const polvo = fuenteDeRuido(g, random);
    const f = filtro(g, 'bandpass', vary(300, 0.1, random), 1.1);
    const gPolvo = g.ctx.createGain();
    percutir(gPolvo, t0, vary(0.3, 0.15, random) * f.makeup, 0.002, vary(0.2, 0.15, random));
    polvo.connect(f.nodo).connect(gPolvo);
    gPolvo.connect(g.air);
    gPolvo.connect(g.room);
    arrancar(polvo, t0, random);
    polvo.stop(t0 + 0.3);
}

/**
 * EL GOLPE DE CONDENSADOR: la corriente entrando.
 *
 * ⚠ NO LLEVA TONO. Es un golpe grave con ataque instantáneo; si se le pone una
 * nota deja de ser electricidad y pasa a ser música — y una nota al encender
 * suena a menú de consola, que es exactamente lo contrario de una máquina vieja
 * despertando.
 */
export function capacitor(g: AudioGraph, random: Random = Math.random) {
    const t0 = g.ctx.currentTime;
    const largo = vary(0.2, 0.15, random);

    const osc = g.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(vary(72, 0.1, random), t0);
    osc.frequency.exponentialRampToValueAtTime(vary(30, 0.1, random), t0 + largo);

    const gain = g.ctx.createGain();
    percutir(gain, t0, vary(0.55, 0.1, random), 0.0008, largo);
    osc.connect(gain);
    gain.connect(g.air);
    gain.connect(g.room);
    osc.start(t0);
    osc.stop(t0 + largo + 0.03);

    // El chispazo del contacto, encima y muy corto.
    const chispa = fuenteDeRuido(g, random);
    const f = filtro(g, 'bandpass', vary(1_800, 0.15, random), 1.4);
    const gChispa = g.ctx.createGain();
    percutir(gChispa, t0, vary(0.25, 0.2, random) * f.makeup, 0.0004, 0.02);
    chispa.connect(f.nodo).connect(gChispa);
    gChispa.connect(g.air);
    arrancar(chispa, t0, random);
    chispa.stop(t0 + 0.03);
}

/**
 * LA BÚSQUEDA DE CABEZAL: varios golpes, y no a compás.
 *
 * ⚠ UN CABEZAL NO ES UN METRÓNOMO. Busca, para, vuelve. Espaciados exactamente
 * igual suenan a bucle — que es el fallo que el §3 prohíbe para todo lo demás, y
 * que acá se colaría por la forma del RITMO en vez de por la del sonido.
 */
export function head(g: AudioGraph, random: Random = Math.random) {
    const t0 = g.ctx.currentTime;
    const golpes = varyInt(4, 0.3, random);

    let cuando = 0;

    for (let i = 0; i < golpes; i += 1) {
        const src = fuenteDeRuido(g, random);
        const f = filtro(g, 'bandpass', vary(1_100 + i * 140, 0.12, random), 3.2);
        const gain = g.ctx.createGain();

        percutir(gain, t0 + cuando, vary(0.3, 0.2, random) * f.makeup, 0.0005, 0.02);
        src.connect(f.nodo).connect(gain);
        gain.connect(g.air);
        gain.connect(g.room);
        arrancar(src, t0 + cuando, random);
        src.stop(t0 + cuando + 0.03);

        // Cada hueco distinto del anterior: eso es lo que lo vuelve una BÚSQUEDA
        // y no una señal de ocupado.
        cuando += vary(0.075, 0.45, random);
    }
}
