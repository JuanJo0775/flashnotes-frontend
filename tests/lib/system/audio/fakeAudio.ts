// tests/lib/system/audio/fakeAudio.ts

/**
 * UN `AudioContext` DE MENTIRA.
 *
 * jsdom no implementa Web Audio, así que sin esto no se puede comprobar nada
 * del sonido salvo la aritmética. Y hay cosas que SÓLO se ven en el grafo:
 *
 *  · que apagado no se cree ni un nodo —que es distinto de crearlos a volumen
 *    cero, y es lo que exige el §9 del plan—,
 *  · que el bus maestro lleve la sala, el parlante y el limitador EN ORDEN,
 *  · que una tecla sean tres capas y no un pitido.
 *
 * No simula audio: anota qué se creó, con qué se conectó y qué se programó en
 * cada parámetro. Eso es exactamente lo que hay que poder afirmar.
 */

/** Lo que se le pidió a un `AudioParam`, en orden. */
export interface ParamCall {
    method: string;
    value: number;
    time: number;
}

export class FakeParam {
    value: number;
    readonly calls: ParamCall[] = [];

    constructor(value = 0) {
        this.value = value;
    }

    private anotar(method: string, value: number, time: number) {
        this.calls.push({ method, value, time });
        this.value = value;
        return this;
    }

    setValueAtTime(v: number, t: number) {
        return this.anotar('setValueAtTime', v, t);
    }

    linearRampToValueAtTime(v: number, t: number) {
        return this.anotar('linearRampToValueAtTime', v, t);
    }

    exponentialRampToValueAtTime(v: number, t: number) {
        return this.anotar('exponentialRampToValueAtTime', v, t);
    }

    setTargetAtTime(v: number, t: number) {
        return this.anotar('setTargetAtTime', v, t);
    }

    cancelScheduledValues(t: number) {
        return this.anotar('cancelScheduledValues', 0, t);
    }
}

export class FakeNode {
    readonly outputs: FakeNode[] = [];
    /** Los nodos que se enchufaron a éste. Sirve para leer la cadena al revés. */
    readonly inputs: FakeNode[] = [];
    started: number | null = null;
    stopped: number | null = null;
    disconnected = false;

    // Los campos de cada clase de nodo. Se declaran todos acá por simplicidad:
    // un nodo falso de más no molesta a nadie y evita cinco subclases.
    readonly gain = new FakeParam(1);
    readonly frequency = new FakeParam(440);
    readonly detune = new FakeParam(0);
    readonly Q = new FakeParam(1);
    readonly pan = new FakeParam(0);
    readonly playbackRate = new FakeParam(1);
    readonly threshold = new FakeParam(-24);
    readonly ratio = new FakeParam(12);

    type = '';
    curve: Float32Array | null = null;
    buffer: FakeBuffer | null = null;
    loop = false;
    normalize = true;
    oversample = 'none';

    constructor(readonly kind: string) {}

    connect<T extends FakeNode>(destino: T): T {
        this.outputs.push(destino);
        destino.inputs.push(this);
        return destino;
    }

    disconnect() {
        this.disconnected = true;
    }

    /** Desde qué punto del búfer se leyó. Lo mira el test de la repetición. */
    offset: number | null = null;

    start(t = 0, offset?: number) {
        this.started = t;
        if (offset !== undefined) this.offset = offset;
    }

    stop(t = 0) {
        this.stopped = t;
    }
}

export class FakeBuffer {
    private readonly canales: Float32Array[];

    constructor(
        readonly numberOfChannels: number,
        readonly length: number,
        readonly sampleRate: number
    ) {
        this.canales = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
    }

    getChannelData(i: number) {
        return this.canales[i];
    }

    copyToChannel(datos: Float32Array, i: number) {
        this.canales[i].set(datos);
    }
}

export class FakeAudioContext {
    static instancias: FakeAudioContext[] = [];

    readonly sampleRate = 44_100;
    currentTime = 0;
    state: 'suspended' | 'running' | 'closed' = 'suspended';
    readonly destination = new FakeNode('destination');

    /** Todos los nodos creados, en orden. La cuenta que importa. */
    readonly created: FakeNode[] = [];

    constructor() {
        FakeAudioContext.instancias.push(this);
    }

    private nuevo(kind: string): FakeNode {
        const n = new FakeNode(kind);
        this.created.push(n);
        return n;
    }

    /** Cuántos nodos de una clase se crearon. */
    count(kind: string): number {
        return this.created.filter((n) => n.kind === kind).length;
    }

    /** El primero de una clase, que en el bus maestro es el único. */
    first(kind: string): FakeNode | undefined {
        return this.created.find((n) => n.kind === kind);
    }

    createGain() {
        return this.nuevo('gain');
    }
    createBiquadFilter() {
        return this.nuevo('biquad');
    }
    createConvolver() {
        return this.nuevo('convolver');
    }
    createWaveShaper() {
        return this.nuevo('shaper');
    }
    createDynamicsCompressor() {
        return this.nuevo('compressor');
    }
    createOscillator() {
        return this.nuevo('oscillator');
    }
    createBufferSource() {
        return this.nuevo('bufferSource');
    }
    createStereoPanner() {
        return this.nuevo('panner');
    }

    /** Cuántos búferes se pidieron. Lo mira el test del ruido cacheado. */
    buffersCreated = 0;

    createBuffer(canales: number, largo: number, sr: number) {
        this.buffersCreated += 1;
        return new FakeBuffer(canales, largo, sr);
    }

    async resume() {
        this.state = 'running';
    }

    async close() {
        this.state = 'closed';
    }
}

/**
 * Lo que en un test cuenta como nodo.
 *
 * El grafo declara `GainNode` porque en producción lo es; dentro de la suite
 * esos mismos objetos SON falsos. El puente se hace acá, en una sola línea, y
 * no con un `as unknown as` repetido en cada aserción.
 */
export type AnyNode = FakeNode | AudioNode;

const comoFalso = (n: AnyNode) => n as FakeNode;

/**
 * ¿Hay un camino de `desde` hasta un nodo de clase `kind`?
 *
 * Recorre el grafo hacia adelante. Sirve para afirmar que una voz termina
 * pasando por el parlante sin tener que saberse la cadena entera de memoria.
 */
export function reaches(desde: AnyNode, kind: string, vistos = new Set<FakeNode>()): boolean {
    const n = comoFalso(desde);
    if (vistos.has(n)) return false;
    vistos.add(n);

    return n.outputs.some((o) => o.kind === kind || reaches(o, kind, vistos));
}

/**
 * ¿Hay un camino de `desde` hasta ESE nodo en concreto?
 *
 * `reaches` pregunta por una clase de nodo, que sirve para «acaba saliendo por
 * un limitador». Esto pregunta por uno identificado, que es lo que hace falta
 * para afirmar que algo NO pasa por un filtro determinado — con `reaches` esa
 * pregunta se contesta sola con un `false` que no significa nada.
 */
export function reachesNode(desde: AnyNode, objetivo: AnyNode, vistos = new Set<FakeNode>()): boolean {
    const n = comoFalso(desde);
    if (vistos.has(n)) return false;
    vistos.add(n);

    return n.outputs.some((o) => o === comoFalso(objetivo) || reachesNode(o, objetivo, vistos));
}

/** Pone el falso en su sitio y devuelve cómo quitarlo. */
export function installFakeAudio(): () => void {
    const previo = (globalThis as { AudioContext?: unknown }).AudioContext;

    FakeAudioContext.instancias = [];
    (globalThis as { AudioContext?: unknown }).AudioContext = FakeAudioContext;

    return () => {
        (globalThis as { AudioContext?: unknown }).AudioContext = previo;
    };
}

/** El contexto que se creó de verdad, o `undefined` si no se creó ninguno. */
export function lastContext(): FakeAudioContext | undefined {
    return FakeAudioContext.instancias[FakeAudioContext.instancias.length - 1];
}

/** Cuántos contextos se llegaron a construir. Apagado tiene que ser cero. */
export function contextCount(): number {
    return FakeAudioContext.instancias.length;
}
