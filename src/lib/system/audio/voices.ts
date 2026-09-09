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

/*
 * Las voces de la máquina encendiéndose y apagándose viven en `power.ts` —este
 * fichero ya era largo— pero se re-exportan desde acá a propósito: hay UNA sola
 * puerta de voces, y `CATEGORY_OF` de abajo es la lista de todo lo que suena.
 */
export {
    button,
    capacitor,
    head,
    powerDown,
    powerUp,
    sweep,
    thud,
    whine,
} from '@/lib/system/audio/power';

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
    /*
     * ⚠ El botón y el cabezal caen en `keys`, y no es un descuido semántico:
     * estas familias son de MEZCLA y no de origen. Lo que las agrupa es cuánta
     * atención merecen, y un pulsador y un cabezal buscando merecen la misma que
     * una tecla — poca, porque suenan a menudo.
     */
    button: 'keys',
    head: 'keys',
    capacitor: 'glitch',
    /*
     * El chillido del flyback es de la familia del AMBIENTE: no es un suceso, es
     * el ruido de que hay un tubo encendido. Encender y apagar sí son sucesos.
     */
    whine: 'ambience',
    powerUp: 'glitch',
    powerDown: 'glitch',
    sweep: 'failure',
    thud: 'failure',
    beep: 'confirm',
    confirm: 'confirm',
    drawer: 'confirm',
    relay: 'glitch',
    glitchBurst: 'glitch',
    /*
     * El desgarro es de la familia del glitch por MEZCLA y no por origen: es lo
     * más fuerte que puede pasar sin que el sistema se caiga, y merece la misma
     * atención que un tirón de imagen. Lo que suena, en cambio, es madera.
     */
    tear: 'glitch',
    /*
     * El chachareo es de la familia del AMBIENTE: mientras el ojo mira no es un
     * suceso, es lo que hay. Ponerlo más arriba lo convertiría en el
     * protagonista, y el protagonista ahí es el zumbido.
     */
    chatter: 'ambience',
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
export function fuenteDeRuido(g: AudioGraph, random: Random): AudioBufferSourceNode {
    const src = g.ctx.createBufferSource();
    src.buffer = bufferDeRuido(g.ctx);
    src.playbackRate.value = vary(1, 0.06, random);
    return src;
}

/*
 * ⚠ LOS CUATRO AYUDANTES DE ABAJO SE EXPORTAN, y no es para los tests: los usa
 * `power.ts`, que construye las voces de la máquina encendiéndose y apagándose
 * con las MISMAS piezas. Si cada módulo tuviera su propia envolvente y su propia
 * compensación de filtro, las voces empezarían a sonar de dos familias distintas
 * sin que nadie lo hubiera decidido.
 */

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
export function arrancar(src: AudioBufferSourceNode, cuando: number, random: Random) {
    src.start(cuando, random() * (RUIDO_SEGUNDOS - 0.2));
}

/**
 * La envolvente percutida: sube en un instante y cae.
 *
 * Sin esto hay una discontinuidad en cada extremo —el «clic» digital sucio— que
 * es la marca del audio mal hecho. La caída es exponencial porque así se apagan
 * las cosas de verdad.
 */
export function percutir(gain: GainNode, t0: number, pico: number, ataqueS: number, largoS: number) {
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
export function filtro(
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

/**
 * EL CONFIRM DE UN HALLAZGO. Dos notas, y son SIEMPRE las mismas dos.
 *
 * ⚠ UNA FAMILIA, NO TREINTA Y TRES MELODÍAS. Treinta y tres jingles distintos
 * son ruido y no diseño: nadie recuerda treinta y tres, y el primero que suena
 * no significa nada porque no se parece a nada anterior. Un confirm corto
 * repetido se aprende a la segunda y a la tercera ya es «encontré algo».
 *
 * ⚠ Y LOS DEL ENTE SUENAN MAL A PROPÓSITO. `wrong` da el mismo gesto al revés y
 * corrido de tono, porque esos hallazgos NO LOS ENCONTRASTE VOS: te los dio él.
 * Tiene que oírse, pero como VARIANTE — si fuera otro sonido, se leería como
 * otra clase de suceso en vez de como la misma cosa torcida.
 *
 * Sale por la bocinita: es la máquina la que acusa recibo.
 */
export function confirm(
    g: AudioGraph,
    { wrong = false }: { wrong?: boolean } = {},
    random: Random = Math.random
) {
    const t0 = g.ctx.currentTime;

    /*
     * Una quinta justa, que es el intervalo que el oído lee como «cerrado».
     * Torcida se invierte Y se corre un cuarto de tono: invertirla a secas daría
     * un confirm descendente afinado, y eso suena a «cancelado», que es otra
     * cosa. Lo que tiene que sonar es roto.
     */
    const base = vary(660, 0.01, random);
    const notas = wrong ? [base * 1.03, base * 0.69] : [base, base * 1.5];

    notas.forEach((hz, i) => {
        const osc = g.ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = hz;

        const gain = g.ctx.createGain();
        const desde = t0 + i * 0.075;
        const largo = vary(0.07, 0.08, random);

        percutir(gain, desde, vary(0.45, 0.1, random), 0.003, largo);

        osc.connect(gain);
        gain.connect(g.speaker);
        gain.connect(g.room);

        osc.start(desde);
        osc.stop(desde + largo + 0.01);
    });
}

/**
 * EL CRUJIDO DE DESGARRO. Algo pegado que se despega, y cede de a poco.
 *
 * ⚠ SUBE CON LA AMPLITUD DEL GOLPE, y ésa es la razón de que exista. El §5 lo
 * pide sin rodeos: lo que reacciona no puede ser una muestra. La pared se
 * despega a golpes, y cada golpe la mueve más — un crujido siempre igual
 * contaría que da lo mismo cuántas veces le pegues, que es justo lo contrario de
 * lo que la pantalla está enseñando.
 *
 * ⚠ Y NO ES UN GLITCH. Acá sonaba `glitchBurst`, que es el ruido de la SEÑAL
 * rompiéndose: eléctrico, escalonado, de banda ancha. Esto es un objeto físico
 * cediendo, que es otra cosa entera — madera y yeso, no electrónica. El comentario
 * del cableado ya lo llamaba «el crujido» desde el principio; sólo faltaba
 * construirlo.
 *
 * Tres cosas lo hacen leer como algo que SE RASGA en vez de como un golpe:
 *
 *  1 · EL DESGARRO ES IRREGULAR. Un montón de rasguños cortísimos repartidos al
 *      azar en el tiempo, no una envolvente lisa. Lo que se rompe no cede
 *      parejo: cede a tirones, y entre tirón y tirón aguanta.
 *  2 · SUENA A MEDIO GRAVE. Un pasabanda ancho alrededor de 500 Hz: la madera y
 *      el yeso viven ahí. Más agudo sería papel; más grave, un mueble.
 *  3 · Y TERMINA CON UN CHASQUIDO SECO, el trozo que por fin suelta.
 */
export function tear(
    g: AudioGraph,
    { amplitudePx }: { amplitudePx: number },
    random: Random = Math.random
) {
    const t0 = g.ctx.currentTime;

    // 3 px es el tirón leve y 12 el del último golpe: el mismo reparto que usa
    // la imagen, para que los dos cuenten lo mismo.
    const fuerza = Math.min(1, Math.max(0.15, amplitudePx / 12));
    const largo = vary(0.18 + fuerza * 0.16, 0.12, random);

    const src = fuenteDeRuido(g, random);
    const f = filtro(g, 'bandpass', vary(500 - fuerza * 120, 0.1, random), 1.4);
    const gain = g.ctx.createGain();

    /*
     * LOS TIRONES.
     *
     * Cuantos más, más se rompe. Cada uno salta a su nivel y se cae enseguida,
     * y entre medio queda casi nada — que es lo que separa un desgarro de un
     * siseo. Los tiempos van al azar y NO repartidos: lo que cede a intervalos
     * iguales suena a motor.
     */
    const tirones = varyInt(5 + Math.round(fuerza * 7), 0.25, random);
    gain.gain.setValueAtTime(0.0001, t0);

    for (let i = 0; i < tirones; i += 1) {
        const cuando = t0 + random() * largo;
        const nivel = vary(0.12 + fuerza * 0.3, 0.35, random) * f.makeup;

        gain.gain.setValueAtTime(nivel, cuando);
        gain.gain.exponentialRampToValueAtTime(0.0001, cuando + vary(0.014, 0.4, random));
    }

    src.connect(f.nodo).connect(gain);
    gain.connect(g.air);
    gain.connect(g.room);
    arrancar(src, t0, random);
    src.stop(t0 + largo + 0.05);

    /*
     * Y EL TROZO QUE SUELTA, al final y sólo cuando el golpe es fuerte.
     *
     * En los primeros golpes la pared aguanta: crujir sin soltar nada es
     * exactamente lo que hace algo que todavía no cede.
     */
    if (fuerza < 0.55) return;

    const suelta = fuenteDeRuido(g, random);
    const fs = filtro(g, 'bandpass', vary(1_700, 0.12, random), 2);
    const gSuelta = g.ctx.createGain();
    const cuando = t0 + largo * vary(0.85, 0.08, random);

    percutir(gSuelta, cuando, vary(0.3, 0.2, random) * fs.makeup, 0.0006, 0.03);
    suelta.connect(fs.nodo).connect(gSuelta);
    gSuelta.connect(g.air);
    gSuelta.connect(g.room);
    arrancar(suelta, cuando, random);
    suelta.stop(cuando + 0.05);
}

/**
 * EL CHACHAREO DE DATOS. La lluvia binaria, oída.
 *
 * ⚠ SON DATOS, NO MÚSICA. Un modem, un télex, una cinta leyéndose: ráfagas
 * cortísimas de tonos ALTOS a alturas que no forman ninguna escala. En cuanto dos
 * de esos tonos guardan una relación reconocible el oído los lee como una melodía,
 * y una melodía ahí contaría que alguien la escribió — cuando lo que se está
 * viendo es una máquina volcando lo que tiene dentro.
 *
 * Sale por la bocinita: es SEÑAL, no un objeto de la habitación.
 */
export function chatter(g: AudioGraph, random: Random = Math.random) {
    const t0 = g.ctx.currentTime;
    const rafagas = varyInt(6, 0.35, random);

    for (let i = 0; i < rafagas; i += 1) {
        const osc = g.ctx.createOscillator();
        osc.type = 'square';

        /*
         * Alturas al azar en dos octavas altas. ⚠ SIN CUANTIZAR a ninguna
         * escala: lo que se busca es que NO suene a nota.
         */
        osc.frequency.value = 1_400 + random() * 2_600;

        const gain = g.ctx.createGain();
        const cuando = t0 + (i / rafagas) * vary(0.22, 0.2, random) + random() * 0.01;
        const largo = vary(0.012, 0.5, random);

        percutir(gain, cuando, vary(0.16, 0.3, random), 0.001, largo);

        osc.connect(gain);
        gain.connect(g.speaker);
        gain.connect(g.room);
        osc.start(cuando);
        osc.stop(cuando + largo + 0.01);
    }
}

/**
 * LA ENTREGA DE UNA PIEZA. Un cajón que se abre.
 *
 * Más largo y más cálido que un confirm, y con razón: un confirm es un acuse de
 * recibo —«sí, eso contaba»— y esto es un PREMIO. Si sonaran igual, ganarse un
 * dibujo valdría lo mismo que tropezarse con un comando.
 *
 * Va por el aire y no por la bocinita: un cajón es un objeto de la habitación.
 */
export function drawer(g: AudioGraph, random: Random = Math.random) {
    const t0 = g.ctx.currentTime;

    // 1 · La madera corriendo: ruido largo por un filtro medio que se abre.
    const corredera = fuenteDeRuido(g, random);
    const f = filtro(g, 'bandpass', vary(520, 0.06, random), 2.4);
    const gCorredera = g.ctx.createGain();
    const largo = vary(0.34, 0.1, random);
    gCorredera.gain.setValueAtTime(0.0001, t0);
    gCorredera.gain.linearRampToValueAtTime(vary(0.3, 0.1, random) * f.makeup, t0 + 0.09);
    gCorredera.gain.exponentialRampToValueAtTime(0.0001, t0 + largo);
    corredera.connect(f.nodo).connect(gCorredera);
    gCorredera.connect(g.air);
    gCorredera.connect(g.room);
    arrancar(corredera, t0, random);
    corredera.stop(t0 + largo + 0.02);

    // 2 · El tope al final del recorrido: el cajón llega y se detiene.
    const tope = g.ctx.createOscillator();
    tope.type = 'sine';
    tope.frequency.value = vary(120, 0.06, random);
    const gTope = g.ctx.createGain();
    const cuando = t0 + largo * 0.72;
    percutir(gTope, cuando, vary(0.35, 0.12, random), 0.002, 0.09);
    tope.connect(gTope);
    gTope.connect(g.air);
    gTope.connect(g.room);
    tope.start(cuando);
    tope.stop(cuando + 0.11);
}
