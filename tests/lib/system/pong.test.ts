// tests/lib/system/pong.test.ts
import {
    COURT_W,
    COURT_H,
    PADDLE_H,
    PADDLE_SPEED,
    SPEED_STEP,
    SPEED_EVERY_MS,
    WIN_SCORE,
    GLYPH,
    GLYPH_FAULT,
    createGame,
    step,
    render,
    renderField,
    speedFactor,
    type PongState,
    type Inputs,
} from '@/lib/system/pong';

/** Nadie tocando nada. */
const QUIETO: Inputs = {
    leftUp: false,
    leftDown: false,
    rightUp: false,
    rightDown: false,
};

const teclas = (over: Partial<Inputs> = {}): Inputs => ({ ...QUIETO, ...over });

/** Un estado a medida, para poder colocar la pelota donde haga falta. */
function conPelota(base: PongState, over: Partial<PongState['ball']>): PongState {
    return { ...base, ball: { ...base.ball, ...over } };
}

describe('pong · el corte', () => {
    test('el corte es más ancho que alto, como una mesa', () => {
        expect(COURT_W).toBeGreaterThan(COURT_H);
    });

    test('la paleta cabe de sobra en el alto del corte', () => {
        expect(PADDLE_H).toBeLessThan(COURT_H / 2);
    });
});

describe('pong · el arranque', () => {
    test('la pelota arranca en el centro', () => {
        const juego = createGame('wall');

        expect(juego.ball.x).toBeCloseTo(COURT_W / 2, 5);
        expect(juego.ball.y).toBeCloseTo(COURT_H / 2, 5);
    });

    test('la paleta arranca centrada', () => {
        const juego = createGame('wall');

        expect(juego.right).toBeCloseTo((COURT_H - PADDLE_H) / 2, 5);
    });

    test('el peloteo arranca en cero', () => {
        expect(createGame('wall').rally).toBe(0);
    });

    test('en modo pared no hay paleta izquierda que valga', () => {
        expect(createGame('wall').mode).toBe('wall');
    });

    test('la partida no arranca terminada', () => {
        expect(createGame('wall').over).toBe(false);
    });
});

describe('pong · la velocidad sube con el tiempo', () => {
    // Es lo que hace que el marcador signifique algo: sin esto, un peloteo
    // largo mediría paciencia y no habilidad.
    test('al empezar no hay incremento', () => {
        expect(speedFactor(0)).toBeCloseTo(1, 5);
    });

    test('pasado un tramo, sube el escalón pactado', () => {
        expect(speedFactor(SPEED_EVERY_MS)).toBeCloseTo(1 + SPEED_STEP, 5);
    });

    test('sube de forma compuesta, no lineal', () => {
        // Dos tramos no son 1 + 2·paso: es el paso aplicado dos veces. Si fuera
        // lineal, la partida larga se aplanaría justo cuando debe apretar.
        expect(speedFactor(SPEED_EVERY_MS * 2)).toBeCloseTo(
            (1 + SPEED_STEP) ** 2,
            5
        );
    });

    test('crece de forma continua, sin saltos de escalón', () => {
        // A mitad de tramo ya se nota algo. Con escalones discretos, la
        // aceleración llegaría de golpe y se leería como un fallo.
        const mitad = speedFactor(SPEED_EVERY_MS / 2);

        expect(mitad).toBeGreaterThan(1);
        expect(mitad).toBeLessThan(1 + SPEED_STEP);
    });

    test('a los dos minutos ya va casi al doble', () => {
        expect(speedFactor(120_000)).toBeGreaterThan(1.75);
    });

    test('pasa el doble antes de los dos minutos y medio', () => {
        expect(speedFactor(150_000)).toBeGreaterThan(2);
    });

    test('no tiene tope: a los diez minutos es ingobernable', () => {
        // Que no haya techo es la pieza que hace que el marcador signifique
        // algo: siempre se pierde, y lo único que cambia es cuándo.
        expect(speedFactor(600_000)).toBeGreaterThan(10);
    });
});

describe('pong · la pelota se mueve', () => {
    test('avanza en proporción al tiempo transcurrido', () => {
        const juego = conPelota(createGame('wall'), { vx: 10, vy: 0 });
        const despues = step(juego, 100, QUIETO);

        // 10 celdas por segundo durante 100 ms = 1 celda.
        expect(despues.ball.x).toBeCloseTo(juego.ball.x + 1, 3);
    });

    test('el reloj de la partida avanza con ella', () => {
        const despues = step(createGame('wall'), 250, QUIETO);

        expect(despues.elapsedMs).toBe(250);
    });

    test('no muta el estado que recibe', () => {
        const juego = createGame('wall');
        const antes = juego.ball.x;

        step(juego, 500, QUIETO);

        expect(juego.ball.x).toBe(antes);
    });
});

describe('pong · rebotes en los bordes', () => {
    test('rebota en el techo', () => {
        const juego = conPelota(createGame('wall'), { y: 0.2, vy: -10 });
        const despues = step(juego, 100, QUIETO);

        expect(despues.ball.vy).toBeGreaterThan(0);
    });

    test('rebota en el suelo', () => {
        const juego = conPelota(createGame('wall'), {
            y: COURT_H - 0.2,
            vy: 10,
        });
        const despues = step(juego, 100, QUIETO);

        expect(despues.ball.vy).toBeLessThan(0);
    });

    test('el rebote no la deja fuera del corte', () => {
        const juego = conPelota(createGame('wall'), { y: 0.1, vy: -40 });
        const despues = step(juego, 100, QUIETO);

        expect(despues.ball.y).toBeGreaterThanOrEqual(0);
        expect(despues.ball.y).toBeLessThan(COURT_H);
    });
});

describe('pong · la pared, en modo solo', () => {
    // La pared está a la IZQUIERDA y la paleta a la derecha: las flechas están
    // en el lado derecho del teclado, así que la paleta que gobiernan tiene que
    // estar en el lado derecho de la pantalla.
    test('la pared devuelve la pelota sin premio', () => {
        const juego = conPelota(createGame('wall'), { x: 0.2, vx: -10 });
        const despues = step(juego, 100, QUIETO);

        expect(despues.ball.vx).toBeGreaterThan(0);
        expect(despues.over).toBe(false);
    });

    test('rebotar en la pared NO cuenta como peloteo', () => {
        // El peloteo mide lo que devolviste vos. Contar la pared sería regalar
        // la mitad de cada marcador.
        const juego = conPelota(createGame('wall'), { x: 0.2, vx: -10 });

        expect(step(juego, 100, QUIETO).rally).toBe(0);
    });
});

describe('pong · la paleta', () => {
    /** La pelota, pegada a la paleta derecha y yendo hacia ella. */
    function contraLaPaleta(vx: number): PongState {
        const juego = createGame('wall');
        return conPelota(juego, {
            x: COURT_W - 2,
            y: juego.right + PADDLE_H / 2,
            vx,
            vy: 0,
        });
    }

    test('devolver la pelota suma peloteo', () => {
        const despues = step(contraLaPaleta(20), 100, QUIETO);

        expect(despues.ball.vx).toBeLessThan(0);
        expect(despues.rally).toBe(1);
    });

    test('fallarla termina la partida en modo pared', () => {
        const juego = createGame('wall');
        // A la altura del techo, donde la paleta centrada no llega.
        const fuera = conPelota(juego, { x: COURT_W - 2, y: 0.5, vx: 20, vy: 0 });

        expect(step(fuera, 200, QUIETO).over).toBe(true);
    });

    test('las flechas la suben', () => {
        const juego = createGame('wall');
        const despues = step(juego, 100, teclas({ rightUp: true }));

        expect(despues.right).toBeLessThan(juego.right);
    });

    test('las flechas la bajan', () => {
        const juego = createGame('wall');
        const despues = step(juego, 100, teclas({ rightDown: true }));

        expect(despues.right).toBeGreaterThan(juego.right);
    });

    test('se mueve a la velocidad pactada', () => {
        // Un décimo de segundo: lo justo para medir la velocidad sin que la
        // paleta llegue al borde, donde el tope la frenaría y la medición
        // mediría el tope en vez de la velocidad.
        const juego = createGame('wall');
        const despues = step(juego, 100, teclas({ rightDown: true }));

        expect(despues.right - juego.right).toBeCloseTo(PADDLE_SPEED / 10, 3);
    });

    test('no se sale por arriba', () => {
        const juego = createGame('wall');
        const despues = step(juego, 5000, teclas({ rightUp: true }));

        expect(despues.right).toBeGreaterThanOrEqual(0);
    });

    test('no se sale por abajo', () => {
        const juego = createGame('wall');
        const despues = step(juego, 5000, teclas({ rightDown: true }));

        expect(despues.right + PADDLE_H).toBeLessThanOrEqual(COURT_H);
    });

    test('devolverla NO la acelera: eso lo hace sólo el reloj', () => {
        // La única fuente de dificultad es el tiempo. Si la devolución también
        // acelerara, quien juega agresivo se encontraría una pelota más rápida
        // que quien espera, y el marcador dejaría de comparar lo mismo.
        const antes = contraLaPaleta(20);
        const despues = step(antes, 100, QUIETO);

        expect(Math.abs(despues.ball.vx)).toBeCloseTo(20, 5);
    });

    test('el punto de impacto decide el ángulo', () => {
        // Pegarle con el borde de arriba la manda hacia arriba. Es lo único que
        // convierte la paleta en un instrumento y no en un muro.
        const juego = createGame('wall');
        const arriba = conPelota(juego, {
            x: COURT_W - 2,
            y: juego.right + 0.1,
            vx: 20,
            vy: 0,
        });

        expect(step(arriba, 100, QUIETO).ball.vy).toBeLessThan(0);
    });
});

describe('pong · el defecto clásico: atravesar la paleta', () => {
    // A 60 fps y con la velocidad subiendo sin tope, llega un momento en que un
    // solo paso mueve la pelota más de lo que mide la paleta de ancho. Si la
    // colisión se mirara sólo en la posición final, la pelota aparecería del
    // otro lado y el punto se perdería sin que nadie la tocara.
    //
    // Es invisible hasta que alguien llega a un peloteo largo: o sea, hasta que
    // le importa el marcador.
    test('a velocidad absurda sigue rebotando en la paleta', () => {
        const juego = createGame('wall');
        const bala = conPelota(juego, {
            x: COURT_W / 2,
            y: juego.right + PADDLE_H / 2,
            vx: 4000,
            vy: 0,
        });

        const despues = step(bala, 16, QUIETO);

        expect(despues.over).toBe(false);
        expect(despues.rally).toBe(1);
    });

    test('a velocidad absurda tampoco se escapa del corte', () => {
        const juego = createGame('wall');
        const bala = conPelota(juego, {
            x: COURT_W / 2,
            y: juego.right + PADDLE_H / 2,
            vx: 4000,
            vy: 900,
        });

        const despues = step(bala, 16, QUIETO);

        expect(despues.ball.x).toBeGreaterThanOrEqual(0);
        expect(despues.ball.x).toBeLessThan(COURT_W);
        expect(despues.ball.y).toBeGreaterThanOrEqual(0);
        expect(despues.ball.y).toBeLessThan(COURT_H);
    });

    test('un fallo de verdad sigue siendo un fallo a esa velocidad', () => {
        // El arreglo del túnel no puede volver la paleta infalible: si la
        // pelota pasa por donde la paleta NO está, tiene que salir.
        const juego = createGame('wall');
        const bala = conPelota(juego, {
            x: COURT_W / 2,
            y: 0.5,
            vx: 4000,
            vy: 0,
        });

        expect(step(bala, 16, QUIETO).over).toBe(true);
    });
});

describe('pong · dos jugadores', () => {
    test('hay paleta a los dos lados', () => {
        const juego = createGame('versus');

        expect(juego.left).toBeCloseTo((COURT_H - PADDLE_H) / 2, 5);
        expect(juego.right).toBeCloseTo((COURT_H - PADDLE_H) / 2, 5);
    });

    test('W y S mueven la paleta izquierda', () => {
        const juego = createGame('versus');
        const despues = step(juego, 100, teclas({ leftDown: true }));

        expect(despues.left).toBeGreaterThan(juego.left);
        expect(despues.right).toBe(juego.right);
    });

    test('las flechas no tocan la paleta izquierda', () => {
        const juego = createGame('versus');
        const despues = step(juego, 100, teclas({ rightDown: true }));

        expect(despues.left).toBe(juego.left);
    });

    test('pasarse de la izquierda da punto a la derecha', () => {
        const juego = createGame('versus');
        const fuera = conPelota(juego, { x: 1, y: 0.5, vx: -20, vy: 0 });
        const despues = step(fuera, 200, QUIETO);

        expect(despues.scoreRight).toBe(1);
        expect(despues.scoreLeft).toBe(0);
    });

    test('un punto no termina la partida', () => {
        const juego = createGame('versus');
        const fuera = conPelota(juego, { x: 1, y: 0.5, vx: -20, vy: 0 });

        expect(step(fuera, 200, QUIETO).over).toBe(false);
    });

    test('el punto devuelve la pelota al centro', () => {
        const juego = createGame('versus');
        const fuera = conPelota(juego, { x: 1, y: 0.5, vx: -20, vy: 0 });
        const despues = step(fuera, 200, QUIETO);

        expect(despues.ball.x).toBeCloseTo(COURT_W / 2, 5);
    });

    test('llegar al tanteo de victoria termina la partida', () => {
        const juego: PongState = {
            ...createGame('versus'),
            scoreRight: WIN_SCORE - 1,
        };
        const fuera = conPelota(juego, { x: 1, y: 0.5, vx: -20, vy: 0 });
        const despues = step(fuera, 200, QUIETO);

        expect(despues.scoreRight).toBe(WIN_SCORE);
        expect(despues.over).toBe(true);
    });

    test('en modo pared nadie marca puntos', () => {
        // El modo pared se mide en peloteo. Un marcador ahí sería otra cosa.
        const juego = createGame('wall');
        const fuera = conPelota(juego, { x: COURT_W - 2, y: 0.5, vx: 20 });
        const despues = step(fuera, 200, QUIETO);

        expect(despues.scoreLeft).toBe(0);
        expect(despues.scoreRight).toBe(0);
    });
});

describe('pong · terminada, se queda quieta', () => {
    test('un paso más no mueve nada', () => {
        const juego: PongState = { ...createGame('wall'), over: true };
        const despues = step(juego, 500, QUIETO);

        expect(despues.ball.x).toBe(juego.ball.x);
        expect(despues.elapsedMs).toBe(juego.elapsedMs);
    });
});

describe('pong · el dibujo', () => {
    test('devuelve una línea por fila del corte', () => {
        expect(render(createGame('wall'))).toHaveLength(COURT_H);
    });

    test('cada línea mide el ancho del corte', () => {
        for (const linea of render(createGame('wall'))) {
            expect(linea).toHaveLength(COURT_W);
        }
    });

    test('la pelota se dibuja donde dice el estado', () => {
        const juego = conPelota(createGame('wall'), { x: 10.7, y: 5.2 });
        const filas = render(juego);

        expect(filas[5][10]).toBe(GLYPH.ball);
    });

    test('la paleta ocupa exactamente su alto', () => {
        const juego = createGame('wall');
        const filas = render(juego);
        const columna = filas.map((f) => f[COURT_W - 1]);

        expect(columna.filter((c) => c === GLYPH.paddle)).toHaveLength(PADDLE_H);
    });

    test('en modo pared se ve la pared a la izquierda', () => {
        const filas = render(createGame('wall'));

        for (const fila of filas) expect(fila[0]).toBe(GLYPH.wall);
    });

    test('en dos jugadores no hay pared, hay paleta', () => {
        const filas = render(createGame('versus'));
        const columna = filas.map((f) => f[0]);

        expect(columna).not.toContain(GLYPH.wall);
        expect(columna.filter((c) => c === GLYPH.paddle)).toHaveLength(PADDLE_H);
    });

    test('en dos jugadores hay línea divisoria', () => {
        const filas = render(createGame('versus'));
        const centro = filas.map((f) => f[Math.floor(COURT_W / 2)]);

        expect(centro).toContain(GLYPH.net);
    });

    test('la línea divisoria es discontinua', () => {
        // Continua se leería como una pared que parte el corte en dos.
        const filas = render(createGame('versus'));
        const centro = filas.map((f) => f[Math.floor(COURT_W / 2)]);

        expect(centro).toContain(' ');
    });

    test('los dos repertorios cubren exactamente las mismas piezas', () => {
        // El averiado se usa en el sitio del normal sin tocar nada más, así que
        // si al normal le sale una pieza nueva, el averiado tiene que traerla.
        expect(Object.keys(GLYPH_FAULT).sort()).toEqual(Object.keys(GLYPH).sort());
    });

    test('cada glifo se distingue de los demás', () => {
        for (const set of [GLYPH, GLYPH_FAULT]) {
            const usados = Object.values(set);
            expect(new Set(usados).size).toBe(usados.length);
        }
    });

    test('el repertorio averiado es ASCII a secas', () => {
        // Es lo que le da sentido: se ve como lo que QUEDARÍA si la fuente buena
        // no cargara y el sistema pintara con lo primero que encuentra.
        for (const glifo of Object.values(GLYPH_FAULT)) {
            const punto = glifo.codePointAt(0)!;
            expect(punto).toBeGreaterThanOrEqual(0x21);
            expect(punto).toBeLessThan(0x7f);
        }
    });

    test('el dibujo acepta el repertorio averiado', () => {
        const filas = render(createGame('wall'), GLYPH_FAULT);

        expect(filas.join('')).toContain(GLYPH_FAULT.ball);
        expect(filas.join('')).not.toContain(GLYPH.ball);
    });

    test('no se cuela ningún carácter fuera del repertorio', () => {
        // El dibujo tiene que hablar el vocabulario de la casa: si aparece un
        // glifo suelto, en otra tipografía se ve como una caja vacía.
        const permitidos = new Set([' ', ...Object.values(GLYPH)]);

        for (const fila of render(createGame('versus'))) {
            for (const c of fila) expect(permitidos.has(c)).toBe(true);
        }
    });
});

describe('pong · el campo, sin lo que se mueve', () => {
    // La pelota y las paletas se pintan encima con posición decimal: dentro de
    // la rejilla sólo se moverían una vez cada tres fotogramas, y eso se ve a
    // tirones aunque el bucle vaya perfecto.
    test('mide lo mismo que el corte entero', () => {
        const campo = renderField(createGame('wall'));

        expect(campo).toHaveLength(COURT_H);
        for (const fila of campo) expect(fila).toHaveLength(COURT_W);
    });

    test('no lleva pelota', () => {
        expect(renderField(createGame('wall')).join('')).not.toContain(GLYPH.ball);
    });

    test('no lleva paletas', () => {
        expect(renderField(createGame('versus')).join('')).not.toContain(
            GLYPH.paddle
        );
    });

    test('sí lleva la pared en modo solo', () => {
        for (const fila of renderField(createGame('wall'))) {
            expect(fila[0]).toBe(GLYPH.wall);
        }
    });

    test('sí lleva la red en dos jugadores', () => {
        expect(renderField(createGame('versus')).join('')).toContain(GLYPH.net);
    });

    test('el campo no cambia aunque la pelota se mueva', () => {
        // Es lo que permite pintarlo una vez y mover sólo lo de encima.
        const juego = createGame('wall');
        const despues = step(juego, 500, QUIETO);

        expect(renderField(despues)).toEqual(renderField(juego));
    });
});
