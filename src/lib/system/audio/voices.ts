// src/lib/system/audio/voices.ts

/**
 * Las voces: lo que suena de verdad.
 *
 * Cada una es una función que programa unos nodos y se va. No guardan estado,
 * no saben cuándo les toca sonar y no consultan el interruptor: reciben el
 * grafo, disparan y terminan. Quién las llama y cada cuánto es problema de la
 * capa de arriba, y ésa es la razón de que el banco de pruebas pueda dispararlas
 * sueltas sin que la compuerta se meta.
 *
 * ⚠ LA REGLA QUE NO SE SALTA: TRES CAPAS, NO UN SONIDO.
 *
 * Un objeto real es transitorio + cuerpo + cola. Una tecla no es un bip: es el
 * chasquido del interruptor (ruido de 3 ms), más la resonancia del plástico y
 * el chasis (un filtro estrecho a media frecuencia), más el golpe de fondo
 * (algo grave y corto). Un oscilador solo suena a juguete; tres capas suenan a
 * objeto. Ésa es toda la diferencia y no hay forma de conseguirla subiendo el
 * volumen.
 *
 * Y todas llevan jitter. Siempre. Sin excepción.
 */

import type { AudioGraph } from '@/lib/system/audio/context';
import type { SoundCategory } from '@/lib/system/audio/mix';
import type { Random } from '@/lib/system/lore';
import { vary, varyInt } from '@/lib/system/audio/jitter';
import { bandpassMakeup } from '@/lib/system/audio/speaker';

/**
 * A qué familia de la mezcla pertenece cada voz.
 *
 * ⚠ TODA VOZ NUEVA TIENE QUE ENTRAR ACÁ. El presupuesto del §8 y la compuerta
 * de 60 ms sólo actúan sobre lo que declara familia: una voz que no lo haga se
 * salta las dos cosas a la vez, o sea suena a volumen completo y sin límite de
 * repetición. Hay un test que enumera esta tabla.
 */
export const CATEGORY_OF = {
    key: 'keys',
    tick: 'keys',
    beep: 'confirm',
    relay: 'glitch',
    glitchBurst: 'glitch',
} as const satisfies Record<string, SoundCategory>;

/**
 * El búfer de ruido, generado UNA vez por contexto.
 *
 * ⚠ NO SE PUEDE GENERAR POR DISPARO. Un búfer nuevo en cada tecla es reservar
 * memoria y rellenarla con decenas de miles de números en el hilo principal
 * mientras alguien escribe — la forma más rápida de que el sonido se note como
 * peso. Se genera uno de dos segundos y cada disparo lee un trozo distinto, que
 * además ayuda a que no suenen dos iguales.
 */
let ruido: AudioBuffer | null = null;
let ruidoDe: BaseAudioContext | null = null;

const RUIDO_SEGUNDOS = 2;

function bufferDeRuido(ctx: AudioContext): AudioBuffer {
    if (ruido && ruidoDe === ctx) return ruido;

    const largo = Math.floor(ctx.sampleRate * RUIDO_SEGUNDOS);
    const buf = ctx.createBuffer(1, largo, ctx.sampleRate);
    const datos = buf.getChannelData(0);

    for (let i = 0; i < largo; i += 1) datos[i] = Math.random() * 2 - 1;

    ruido = buf;
    ruidoDe = ctx;
    return buf;
}

/** Olvida el ruido cacheado. La llama el cierre del contexto. */
export function forgetNoise() {
    ruido = null;
    ruidoDe = null;
}

/**
 * Una fuente de ruido que empieza en un punto al azar del búfer.
 *
 * El desplazamiento no es un capricho: arrancar siempre en la muestra cero hace
 * que todos los chasquidos compartan la misma forma de onda inicial, y eso se
 * oye como repetición aunque el filtro cambie.
 */
function fuenteDeRuido(g: AudioGraph, random: Random): AudioBufferSourceNode {
    const src = g.ctx.createBufferSource();
    src.buffer = bufferDeRuido(g.ctx);
    src.playbackRate.value = vary(1, 0.06, random);
    return src;
}

/**
 * Arranca una fuente de ruido DESDE UN PUNTO AL AZAR del búfer.
 *
 * ⚠ EL DESPLAZAMIENTO NO ES OPCIONAL Y SE OLVIDA MUY FÁCIL. El búfer es uno
 * solo y se reutiliza, que es lo correcto; pero si todos los disparos arrancan
 * en la muestra cero, todos comparten la misma forma de onda inicial. El filtro
 * cambia y el volumen cambia, y aun así se OYE la repetición: el ataque es
 * idéntico, y el ataque es lo primero que llega al oído.
 *
 * Un `start(cuando)` a secas es exactamente ese fallo, y no se ve leyendo el
 * código — sólo escuchando un buen rato. Por eso arrancar pasa por acá.
 */
function arrancar(src: AudioBufferSourceNode, cuando: number, random: Random) {
    src.start(cuando, random() * (RUIDO_SEGUNDOS - 0.2));
}

/**
 * La envolvente percutida: sube en un instante y cae.
 *
 * Sin esto hay una discontinuidad en cada extremo —el «clic» digital sucio— que
 * es la marca del audio mal hecho. La caída es exponencial porque así se apagan
 * las cosas de verdad.
 */
function percutir(gain: GainNode, t0: number, pico: number, ataqueS: number, largoS: number) {
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(pico, t0 + ataqueS);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + largoS);
}

/**
 * Un filtro, y CUÁNTO HAY QUE DEVOLVERLE.
 *
 * ⚠ LOS DOS VALORES VIENEN JUNTOS A PROPÓSITO, y es la lección más cara de este
 * módulo. El número que se le pasa a `percutir` no es el nivel de salida: es un
 * multiplicador sobre lo que el filtro deja pasar, y un pasabanda estrecho deja
 * pasar casi nada. Tratarlos como cosas separadas fue lo que dejó la tecla 28 dB
 * por debajo de la bocinita, que no cruza ningún filtro y sale entera.
 *
 * Devolviéndolos en el mismo sitio, olvidarse de compensar cuesta trabajo.
 */
function filtro(
    g: AudioGraph,
    type: BiquadFilterType,
    hz: number,
    q: number
): { nodo: BiquadFilterNode; makeup: number } {
    const nodo = g.ctx.createBiquadFilter();
    nodo.type = type;
    nodo.frequency.value = hz;
    nodo.Q.value = q;

    // Sólo los pasabanda tiran espectro; un pasaaltos o un pasabajos conservan
    // media banda y no hay nada que devolver.
    const makeup = type === 'bandpass' ? bandpassMakeup(hz, q, g.ctx.sampleRate) : 1;

    return { nodo, makeup };
}

/**
 * Las tres capas de la tecla, por nombre.
 *
 * ⚠ SE PUEDEN PEDIR SUELTAS, Y NO ES UNA COMODIDAD PARA LOS TESTS. Si la tecla
 * suena mal, saberlo no sirve de nada: hay que saber CUÁL de las tres está mal,
 * y mezcladas es imposible porque el chasquido tapa al cuerpo y el cuerpo tapa
 * al fondo. El banco de pruebas las dispara sueltas para poder afinarlas.
 */
export const KEY_LAYERS = ['click', 'body', 'thud'] as const;

export type KeyLayer = (typeof KEY_LAYERS)[number];

/**
 * LA TECLA. El sonido que más veces va a sonar en la vida del producto.
 *
 * Tres capas, y cada una tiene un porqué físico:
 *
 *  1 · EL CHASQUIDO del mecanismo. Ruido muy corto y agudo. Es el ataque, lo
 *      que hace que el sonido se sienta pulsado y no reproducido.
 *  2 · EL CUERPO: la resonancia del plástico y de la placa. Ruido por un filtro
 *      ESTRECHO alrededor de 300 Hz. ⚠ Ésta es la capa que separa un teclado
 *      mecánico de uno de membrana, y la que se pierde entera si esto pasa por
 *      el pasabanda de la bocinita. Por eso las voces físicas van por `air`.
 *  3 · EL FONDO: el golpe de la tecla al llegar abajo. Grave, corto, sordo.
 */
export function key(
    g: AudioGraph,
    random: Random = Math.random,
    layers: readonly KeyLayer[] = KEY_LAYERS
) {
    const t0 = g.ctx.currentTime;
    const suena = (capa: KeyLayer) => layers.includes(capa);

    // 1 · El chasquido.
    if (suena('click')) {
        const chasquido = fuenteDeRuido(g, random);
        const agudo = filtro(g, 'bandpass', vary(2_800, 0.08, random), 1.1);
        const gChasquido = g.ctx.createGain();
        percutir(
            gChasquido,
            t0,
            vary(0.5, 0.15, random) * agudo.makeup,
            0.0006,
            vary(0.008, 0.2, random)
        );
        chasquido.connect(agudo.nodo).connect(gChasquido);
        gChasquido.connect(g.air);
        gChasquido.connect(g.room);
        arrancar(chasquido, t0, random);
        chasquido.stop(t0 + 0.012);
    }

    // 2 · El cuerpo, que es el que suena rico.
    if (suena('body')) {
        const cuerpo = fuenteDeRuido(g, random);
        const resonancia = filtro(g, 'bandpass', vary(310, 0.05, random), 6.5);
        const gCuerpo = g.ctx.createGain();
        const largoCuerpo = vary(0.07, 0.12, random);
        percutir(gCuerpo, t0, vary(0.42, 0.12, random) * resonancia.makeup, 0.001, largoCuerpo);
        cuerpo.connect(resonancia.nodo).connect(gCuerpo);
        gCuerpo.connect(g.air);
        gCuerpo.connect(g.room);
        arrancar(cuerpo, t0, random);
        cuerpo.stop(t0 + largoCuerpo + 0.01);
    }

    // 3 · El fondo.
    if (suena('thud')) {
        const fondo = g.ctx.createOscillator();
        fondo.type = 'sine';
        fondo.frequency.value = vary(104, 0.07, random);
        const gFondo = g.ctx.createGain();
        const largoFondo = vary(0.05, 0.12, random);
        percutir(gFondo, t0, vary(0.3, 0.15, random), 0.0015, largoFondo);
        fondo.connect(gFondo);
        gFondo.connect(g.air);
        fondo.start(t0);
        fondo.stop(t0 + largoFondo + 0.01);
    }
}

/**
 * EL TIC DEL TELETIPO, por línea impresa y nunca por carácter.
 *
 * Por carácter sería una ametralladora aunque la compuerta lo recortara: el
 * teletipo golpea el papel una vez por renglón, y ése es el ritmo que hace que
 * una respuesta se sienta IMPRESA en lugar de aparecida.
 *
 * Es la tecla en pequeño: dos capas y muy corto.
 */
export function tick(g: AudioGraph, random: Random = Math.random) {
    const t0 = g.ctx.currentTime;

    const golpe = fuenteDeRuido(g, random);
    const f = filtro(g, 'bandpass', vary(1_900, 0.09, random), 2.2);
    const gGolpe = g.ctx.createGain();
    percutir(
        gGolpe,
        t0,
        vary(0.34, 0.15, random) * f.makeup,
        0.0005,
        vary(0.014, 0.18, random)
    );
    golpe.connect(f.nodo).connect(gGolpe);
    gGolpe.connect(g.air);
    gGolpe.connect(g.room);
    arrancar(golpe, t0, random);
    golpe.stop(t0 + 0.018);

    const madera = fuenteDeRuido(g, random);
    const fm = filtro(g, 'bandpass', vary(430, 0.06, random), 5);
    const gMadera = g.ctx.createGain();
    percutir(gMadera, t0, vary(0.2, 0.15, random) * fm.makeup, 0.001, vary(0.016, 0.18, random));
    madera.connect(fm.nodo).connect(gMadera);
    gMadera.connect(g.air);
    arrancar(madera, t0, random);
    madera.stop(t0 + 0.018);
}

/**
 * LA BOCINITA INTERNA. La única voz que tiene que sonar barata.
 *
 * Onda cuadrada cruda, sin adornos y sin capas, saliendo por el cono de cinco
 * centímetros. Una PC de los ochenta tenía un altavoz malo y eso es
 * precisamente lo que la delata: acá lo pobre es la intención, y adornarlo
 * sería el error.
 */
export function beep(
    g: AudioGraph,
    { hz, ms }: { hz: number; ms: number },
    random: Random = Math.random
) {
    const t0 = g.ctx.currentTime;
    const largo = vary(ms / 1_000, 0.04, random);

    const osc = g.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = vary(hz, 0.012, random);

    const gain = g.ctx.createGain();
    // Ataque y caída secos, pero no instantáneos: un corte a cero de una onda
    // cuadrada mete un chasquido que no es de época, es de programación.
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(vary(0.5, 0.08, random), t0 + 0.004);
    gain.gain.setValueAtTime(vary(0.5, 0.08, random), t0 + largo - 0.006);
    gain.gain.linearRampToValueAtTime(0.0001, t0 + largo);

    osc.connect(gain);
    gain.connect(g.speaker);
    gain.connect(g.room);

    osc.start(t0);
    osc.stop(t0 + largo + 0.005);
}

/**
 * EL RELÉ. Seco, y son DOS chasquidos, no uno.
 *
 * Un relé cierra y la armadura rebota: es lo que hace que suene a metal y no a
 * clic de ratón. Los dos golpes juntos duran menos de cuarenta milisegundos.
 */
export function relay(g: AudioGraph, random: Random = Math.random) {
    const t0 = g.ctx.currentTime;

    const golpear = (offset: number, pico: number, hz: number) => {
        const src = fuenteDeRuido(g, random);
        const f = filtro(g, 'bandpass', vary(hz, 0.08, random), 3.5);
        const gain = g.ctx.createGain();

        percutir(gain, t0 + offset, pico * f.makeup, 0.0004, 0.006);
        src.connect(f.nodo).connect(gain);
        gain.connect(g.air);
        gain.connect(g.room);

        arrancar(src, t0 + offset, random);
        src.stop(t0 + offset + 0.008);
    };

    golpear(0, vary(0.55, 0.12, random), 1_500);
    // El rebote llega un pelo después y más flojo. Sin él es un clic; con él es
    // una pieza de metal moviéndose.
    golpear(vary(0.014, 0.25, random), vary(0.22, 0.2, random), 2_400);
}

/**
 * EL GLITCH, que tiene que temblar SINCRONIZADO con la imagen.
 *
 * ⚠ SE CORTA EN ESCALONES, y esto es lo único que no es negociable de esta voz.
 * La imagen usa `steps(1, end)`: salta, no se desliza. Un sonido que se
 * desvanece suavemente mientras la pantalla da tirones secos deja de ser el
 * mismo suceso y se convierte en un efecto de imagen con música encima.
 *
 * Y sube con la amplitud del tirón, porque lo que reacciona no puede ser una
 * muestra: cuanto más tiembla, más fuerte.
 */
export function glitchBurst(
    g: AudioGraph,
    { amplitudePx, durationMs }: { amplitudePx: number; durationMs: number },
    random: Random = Math.random
) {
    const t0 = g.ctx.currentTime;
    const largo = vary(durationMs / 1_000, 0.06, random);

    // La amplitud de la imagen manda en el volumen. 3 px es el tirón leve y 12
    // el del último golpe de la pared; el reparto se queda dentro de la familia.
    const fuerza = Math.min(1, amplitudePx / 12);

    const src = fuenteDeRuido(g, random);
    const f = filtro(g, 'bandpass', vary(1_200 + fuerza * 900, 0.1, random), 0.9);

    const gain = g.ctx.createGain();

    /*
     * LOS ESCALONES.
     *
     * Un número impar y variable de tramos: con un número fijo, dos glitches
     * seguidos tienen el mismo ritmo interno y se oye el bucle. Cada tramo
     * alterna entre presencia y casi-silencio, y el conjunto decae.
     */
    const tramos = varyInt(7, 0.3, random);
    const pico = 0.25 + fuerza * 0.55;

    for (let i = 0; i < tramos; i += 1) {
        const t = t0 + (i / tramos) * largo;
        const caida = 1 - i / tramos;

        const nivel = (i % 2 === 0 ? pico : pico * 0.12) * caida * f.makeup;
        gain.gain.setValueAtTime(nivel, t);
    }
    gain.gain.setValueAtTime(0, t0 + largo);

    src.connect(f.nodo).connect(gain);
    gain.connect(g.speaker);
    gain.connect(g.room);

    arrancar(src, t0, random);
    src.stop(t0 + largo + 0.01);
}
