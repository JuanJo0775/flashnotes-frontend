// src/lib/system/timeDrift.ts

/**
 * `//date_off` · el reloj del sistema se suelta.
 *
 * EL LORE: la app entera se apoya en que el sistema «nunca se mudó» de huso
 * (`//date` lo dice, y se puede verificar mirando tu propio reloj). Este comando
 * es el paso siguiente: no es que esté en otro huso, es que ya no sabe en qué
 * año está.
 *
 * ES SÓLO PINTURA. `formatters.ts` es lo único que lo consulta, y `formatters`
 * sólo pinta: el `updatedAt` que guarda el backend no se toca, y nada de lo que
 * tenés escrito corre peligro. Se rompe el reloj, no tus datos — que es la
 * primera regla del proyecto.
 *
 * NO TIENE MARCHA ATRÁS desde la app: sólo lo apaga recargar la página, igual
 * que el fallo cromático. `stopDrift` existe para los tests, no hay comando que
 * lo llame.
 *
 * ARRANCA APAGADO, Y ESO ES LOAD-BEARING: `formatters` lo consulta al pintar, y
 * el servidor y el cliente tienen que coincidir en el primer render o React tira
 * el árbol entero y lo regenera. Apagado en los dos, coinciden. Sólo lo enciende
 * un comando, que ocurre mucho después de montar.
 */

const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;
const AÑO = 365 * DIA;

/**
 * Cada cuánto cambia de disparate.
 *
 * Los saltos son DISCRETOS a propósito. Un desfase que crece suave se lee como
 * un reloj mal puesto; que la fecha salte de golpe se lee como una avería. Es el
 * mismo criterio que hace que la aberración cromática vaya con `steps` en vez de
 * con un fundido.
 */
const SALTO_MS = 1400;

/** Cuándo se encendió, o null. Módulo, no React: lo lee `formatters`. */
let startedAt: number | null = null;

export function isDrifting(): boolean {
    return startedAt !== null;
}

export function driftStartedAt(): number | null {
    return startedAt;
}

/** Enciende el desvarío. Llamarlo dos veces no reinicia la cuenta. */
export function startDrift(now: number) {
    if (startedAt === null) startedAt = now;
}

/** Sólo para los tests y el arranque del módulo. */
export function stopDrift() {
    startedAt = null;
}

/**
 * Un número reproducible a partir de un entero.
 *
 * Hace falta que sea DETERMINISTA: si cada repintado sorteara de nuevo, la
 * pantalla entera temblaría de números y se leería como parpadeo en vez de como
 * un reloj roto. El mismo instante tiene que dar siempre el mismo disparate.
 */
function ruido(n: number): number {
    const x = Math.sin(n * 12.9898) * 43758.5453;
    return x - Math.floor(x);
}

/**
 * La escala de cada salto.
 *
 * Se mezclan tamaños muy distintos —minutos, días, años— porque un desfase
 * siempre del mismo orden se vuelve previsible: verías la fecha bailar dentro de
 * un rango y dejaría de sorprender. Mezclando, a veces sólo se mueve la hora y a
 * veces cambia el año.
 */
const ESCALAS = [7 * MINUTO, 3 * HORA, 2 * DIA, 40 * DIA, 3 * AÑO, 11 * AÑO];

/**
 * La hora que hay que PINTAR para este instante real.
 *
 * Avanza, retrocede y da saltos. El signo sale del propio ruido, así que
 * retrocede tanto como avanza — sólo hacia adelante sería un reloj adelantado,
 * que no tiene ninguna gracia; que RETROCEDA es lo que no puede pasarle a un
 * reloj que funciona.
 */
export function driftedMs(realMs: number): number {
    if (startedAt === null) return realMs;

    const transcurrido = realMs - startedAt;
    if (transcurrido <= 0) return realMs;

    const paso = Math.floor(transcurrido / SALTO_MS);

    const escala = ESCALAS[Math.floor(ruido(paso) * ESCALAS.length) % ESCALAS.length];
    // De -1 a 1: el signo decide si el reloj se fue para adelante o para atrás.
    const magnitud = ruido(paso + 0.5) * 2 - 1;

    return Math.round(realMs + magnitud * escala);
}

/** La fecha que hay que pintar. Azúcar sobre `driftedMs`. */
export function driftedDate(real: Date): Date {
    return startedAt === null ? real : new Date(driftedMs(real.getTime()));
}
