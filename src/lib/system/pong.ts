// src/lib/system/pong.ts

/**
 * El proceso `vsync-test`: un pong.
 *
 * EL LORE, en una frase: la barra de estado lleva doce piezas diciendo que la
 * máquina está sola —`[SIN RELEVO]`, `[NADIE MÁS CONECTADO]`, `[TURNO 1/1]`— y
 * esto es lo que hace mientras nadie mira. Un turno sin relevo y una pelota
 * contra la pared.
 *
 * Se descubre en `//ps`, donde aparece como un proceso de vídeo corriendo a
 * 16 ms —60 fps, el único de la app a velocidad de fotograma— y se abre con
 * `//attach_6`.
 *
 * ESTE MÓDULO ES PURO: geometría y reglas, sin DOM, sin `requestAnimationFrame`
 * y sin reloj propio. Quien lo llama le pasa cuánto tiempo pasó y qué teclas
 * están hundidas. Por eso el juego entero se prueba sin montar nada, incluido el
 * fotograma exacto que se ve en pantalla.
 */

/** El corte, en caracteres. Más ancho que alto, como una mesa. */
export const COURT_W = 72;
export const COURT_H = 24;

/** Lo que mide la paleta de alto, en filas. */
export const PADDLE_H = 4;

/** Lo que corre la paleta, en filas por segundo. */
export const PADDLE_SPEED = 26;

/** Lo que corre la pelota al empezar, en columnas por segundo. */
export const BALL_SPEED_0 = 18;

/**
 * Y lo que sube con el tiempo: un 6 % cada doce segundos, compuesto.
 *
 * SUBE CON EL RELOJ Y NO CON LOS GOLPES, y es una decisión, no un atajo. Si cada
 * devolución acelerara, quien juega agresivo se encontraría una pelota más
 * rápida que quien espera, y dos marcadores dejarían de comparar lo mismo.
 *
 * Y NO TIENE TOPE. Un juego que se puede sostener para siempre no tiene marcador
 * que signifique nada: el récord mediría paciencia, no habilidad. A los dos
 * minutos va a más del doble y ahí ya se pierde solo.
 */
export const SPEED_STEP = 0.06;
export const SPEED_EVERY_MS = 12_000;

/** El tanteo que gana un partido de dos jugadores. */
export const WIN_SCORE = 11;

/**
 * Cuánto se abre el ángulo al devolverla, en filas por segundo.
 *
 * El mínimo existe para que la pelota no quede nunca perfectamente horizontal:
 * dándole justo con el centro de la paleta, el peloteo se volvería un
 * intercambio idéntico para siempre y dejaría de ser un juego.
 */
const MAX_VY = 14;
const MIN_VY = 2.5;

/**
 * Lo máximo que la pelota puede recorrer entre dos comprobaciones de choque.
 *
 * ESTO ES EL ARREGLO DEL DEFECTO CLÁSICO DE TODO PONG. Con la velocidad subiendo
 * sin tope, llega un momento en que un solo fotograma la mueve más de lo que
 * mide la paleta de ancho; mirando sólo la posición final, aparecería del otro
 * lado y el punto se perdería sin que nadie la tocara.
 *
 * El paso se parte en trozos de un cuarto de celda y se mira el choque en cada
 * uno. Es invisible hasta que alguien llega a un peloteo largo — o sea, hasta
 * que le importa el marcador.
 */
const MAX_STEP_CELLS = 0.25;

/**
 * Los glifos del corte: BLOQUES, que es como dibuja una terminal de verdad.
 *
 * ⚠ ESTOS GLIFOS OBLIGAN A QUE EL CORTE LLEVE SU PROPIA PILA DE FUENTES.
 *
 * JetBrains Mono —la tipografía de toda la app— NO trae los bloques, así que
 * los pinta una fuente de reserva con otras métricas. Medido en el navegador:
 *
 *     base (M)   9,120 px
 *     █ ▌ ▓ ░   14,489 px      ← reserva
 *     ●         12,352 px
 *     ┊          8,357 px
 *
 * En una rejilla de caracteres eso no es un detalle estético: una fila con un
 * glifo ancho de más empuja todo lo que lleva detrás, y la paleta del borde
 * derecho aparece descolocada respecto a la fila de arriba. El corte BAILA.
 *
 * Por eso `.pong-court` declara `ui-monospace, Consolas, DejaVu Sans Mono…` en
 * vez de heredar la de la casa: en esas familias los bloques miden exactamente
 * lo que mide una `M`, comprobado midiéndolo. No se nota que es otra
 * tipografía porque aquí no hay texto, hay bloques.
 *
 * Si algún día se cambian estos glifos, hay que volver a medirlos.
 */
export interface GlyphSet {
    ball: string;
    paddle: string;
    wall: string;
    net: string;
}

export const GLYPH = {
    ball: '●',
    paddle: '█',
    /** Media res: se lee como la CARA de un muro, no como una columna suelta. */
    wall: '▌',
    net: '┊',
} as const satisfies GlyphSet;

/**
 * El repertorio averiado.
 *
 * Sale a ratos, unas décimas, como si al subsistema de vídeo se le hubiera caído
 * la tabla de glifos y estuviera pintando con lo primero que encuentra. Es ASCII
 * a secas — justo lo que quedaría si la fuente buena no cargara.
 *
 * No es el aspecto normal del juego: es una avería que pasa y se va.
 */
export const GLYPH_FAULT = {
    ball: 'O',
    paddle: '|',
    wall: '#',
    net: ':',
} as const satisfies GlyphSet;

export type PongMode = 'wall' | 'versus';

export interface Ball {
    x: number;
    y: number;
    /** Velocidad BASE. La de verdad es ésta por `speedFactor(elapsedMs)`. */
    vx: number;
    vy: number;
}

export interface PongState {
    mode: PongMode;
    ball: Ball;
    /** Fila del borde superior de cada paleta. Decimal a propósito. */
    left: number;
    right: number;
    /** Cuántas veces la devolviste. Es el marcador del modo pared. */
    rally: number;
    scoreLeft: number;
    scoreRight: number;
    elapsedMs: number;
    over: boolean;
}

/** Qué teclas están hundidas. Las flechas son la paleta derecha. */
export interface Inputs {
    leftUp: boolean;
    leftDown: boolean;
    rightUp: boolean;
    rightDown: boolean;
}

const clamp = (v: number, min: number, max: number) =>
    v < min ? min : v > max ? max : v;

/** Cuánto se ha acelerado la pelota a estas alturas de la partida. */
export function speedFactor(elapsedMs: number): number {
    return (1 + SPEED_STEP) ** (elapsedMs / SPEED_EVERY_MS);
}

const CENTRO_PALETA = (COURT_H - PADDLE_H) / 2;

export function createGame(mode: PongMode): PongState {
    return {
        mode,
        ball: {
            x: COURT_W / 2,
            y: COURT_H / 2,
            // En modo pared sale HACIA LA PARED, que está a la izquierda: te da
            // un momento para colocarte antes de que te llegue.
            vx: mode === 'wall' ? -BALL_SPEED_0 : BALL_SPEED_0,
            vy: MIN_VY,
        },
        left: CENTRO_PALETA,
        right: CENTRO_PALETA,
        rally: 0,
        scoreLeft: 0,
        scoreRight: 0,
        elapsedMs: 0,
        over: false,
    };
}

/** Si la pelota, a esta altura, encuentra paleta. */
function golpea(paddleY: number, ballY: number): boolean {
    return ballY >= paddleY && ballY <= paddleY + PADDLE_H;
}

/**
 * El ángulo de salida según por dónde le pegaste.
 *
 * Es lo único que convierte la paleta en un instrumento en vez de un muro: con
 * el borde de arriba la mandás hacia arriba, con el de abajo hacia abajo.
 */
function anguloDeSalida(paddleY: number, ballY: number): number {
    const desvio = ((ballY - paddleY) / PADDLE_H - 0.5) * 2;
    const vy = desvio * MAX_VY;

    if (Math.abs(vy) >= MIN_VY) return vy;
    return desvio < 0 ? -MIN_VY : MIN_VY;
}

/**
 * Un paso de la simulación.
 *
 * Devuelve un estado nuevo: no toca el que recibe. Eso es lo que permite
 * probarlo colocando la pelota a mano y mirando qué pasa.
 */
export function step(state: PongState, dtMs: number, inputs: Inputs): PongState {
    if (state.over) return state;

    const dt = dtMs / 1000;
    const tope = COURT_H - PADDLE_H;

    let left = state.left;
    let right = state.right;

    // En modo pared no hay paleta izquierda: W y S no gobiernan nada.
    if (state.mode === 'versus') {
        if (inputs.leftUp) left -= PADDLE_SPEED * dt;
        if (inputs.leftDown) left += PADDLE_SPEED * dt;
    }
    if (inputs.rightUp) right -= PADDLE_SPEED * dt;
    if (inputs.rightDown) right += PADDLE_SPEED * dt;

    left = clamp(left, 0, tope);
    right = clamp(right, 0, tope);

    const factor = speedFactor(state.elapsedMs);
    let { x, y, vx, vy } = state.ball;

    let rally = state.rally;
    let scoreLeft = state.scoreLeft;
    let scoreRight = state.scoreRight;
    let over = false;

    const recorrido = Math.hypot(vx * factor * dt, vy * factor * dt);
    const trozos = Math.max(1, Math.ceil(recorrido / MAX_STEP_CELLS));
    const sub = dt / trozos;

    const FILA_MAX = COURT_H - 1;
    const COL_PALETA = COURT_W - 1;

    /** Devuelve la pelota al centro después de un punto. */
    const alCentro = (haciaLaDerecha: boolean) => {
        x = COURT_W / 2;
        y = COURT_H / 2;
        vx = haciaLaDerecha ? BALL_SPEED_0 : -BALL_SPEED_0;
        vy = MIN_VY;
    };

    for (let i = 0; i < trozos; i += 1) {
        x += vx * factor * sub;
        y += vy * factor * sub;

        // Techo y suelo. El tope es la última FILA, no el alto: así el redondeo
        // a celda nunca cae fuera de la rejilla.
        if (y < 0) {
            y = 0;
            vy = -vy;
        } else if (y > FILA_MAX) {
            y = FILA_MAX;
            vy = -vy;
        }

        // El lado derecho: siempre paleta, en los dos modos.
        if (x >= COL_PALETA && vx > 0) {
            if (golpea(right, y)) {
                x = COL_PALETA;
                vx = -vx;
                vy = anguloDeSalida(right, y);
                rally += 1;
            } else if (state.mode === 'wall') {
                over = true;
                break;
            } else {
                scoreLeft += 1;
                if (scoreLeft >= WIN_SCORE) over = true;
                alCentro(false);
                break;
            }
        }

        // El izquierdo: pared en modo solo, paleta en dos jugadores.
        if (x <= 0 && vx < 0) {
            if (state.mode === 'wall') {
                // La pared devuelve sin premio: el peloteo mide lo que
                // devolviste vos, y contar la pared regalaría medio marcador.
                x = 0;
                vx = -vx;
            } else if (golpea(left, y)) {
                x = 0;
                vx = -vx;
                vy = anguloDeSalida(left, y);
                rally += 1;
            } else {
                scoreRight += 1;
                if (scoreRight >= WIN_SCORE) over = true;
                alCentro(true);
                break;
            }
        }
    }

    return {
        mode: state.mode,
        ball: { x, y, vx, vy },
        left,
        right,
        rally,
        scoreLeft,
        scoreRight,
        elapsedMs: state.elapsedMs + dtMs,
        over,
    };
}

/**
 * El campo: lo que NO se mueve. Una cadena por fila.
 *
 * La pared en modo solo, la red en dos jugadores, y nada más. La pelota y las
 * paletas se pintan aparte, encima, con posición decimal.
 *
 * POR QUÉ ESTÁ PARTIDO EN DOS. Una rejilla de 72×24 es baja resolución: a
 * dieciocho columnas por segundo la pelota avanza 0,3 celdas por fotograma, así
 * que redondeando a celda sólo se MUEVE una vez cada tres fotogramas. El
 * resultado se ve a tirones aunque el bucle vaya a 60 fps perfectos, y no hay
 * forma de arreglarlo dentro de la rejilla: el tirón no es un retraso, es el
 * redondeo.
 *
 * Con el campo aparte, la pelota y las paletas se colocan con desplazamiento
 * decimal en CSS y se mueven de forma continua, sin dejar de ser los mismos
 * glifos. Sigue siendo un dibujo de caracteres; deja de ser un dibujo a saltos.
 *
 * Y el redondeo no se tira: `render()` lo conserva, porque cuando el vídeo falla
 * ES el aspecto que toca.
 */
export function renderField(
    state: PongState,
    glyphs: GlyphSet = GLYPH
): string[] {
    const filas: string[][] = Array.from({ length: COURT_H }, () =>
        Array<string>(COURT_W).fill(' ')
    );

    if (state.mode === 'versus') {
        // Discontinua: continua se leería como una pared que parte el corte.
        const centro = Math.floor(COURT_W / 2);
        for (let f = 0; f < COURT_H; f += 2) filas[f][centro] = glyphs.net;
    } else {
        for (let f = 0; f < COURT_H; f += 1) filas[f][0] = glyphs.wall;
    }

    return filas.map((f) => f.join(''));
}

/**
 * El fotograma ENTERO, redondeado a celda.
 *
 * Es el dibujo de emergencia: cuando el subsistema de vídeo falla, el juego
 * vuelve a pintarse celda a celda y se mueve a tirones. No es una limitación que
 * quedó ahí — es la que había al principio, conservada a propósito porque
 * ENSEÑA la avería. El juego sano va fluido; el averiado va a saltos.
 *
 * ES TEXTO Y NO UN CANVAS, y ésa es la decisión importante de la pieza: siendo
 * texto en el DOM hereda gratis el tema y todos los filtros de glitch, así que
 * si te adjuntás con la señal rota el juego se ve roto sin una sola línea extra.
 */
export function render(state: PongState, glyphs: GlyphSet = GLYPH): string[] {
    const filas = renderField(state, glyphs).map((f) => f.split(''));

    const pintaPaleta = (columna: number, arriba: number) => {
        const desde = clamp(Math.round(arriba), 0, COURT_H - PADDLE_H);
        for (let f = desde; f < desde + PADDLE_H; f += 1) {
            filas[f][columna] = glyphs.paddle;
        }
    };

    pintaPaleta(COURT_W - 1, state.right);
    if (state.mode === 'versus') pintaPaleta(0, state.left);

    const bx = clamp(Math.floor(state.ball.x), 0, COURT_W - 1);
    const by = clamp(Math.floor(state.ball.y), 0, COURT_H - 1);
    filas[by][bx] = glyphs.ball;

    return filas.map((f) => f.join(''));
}
