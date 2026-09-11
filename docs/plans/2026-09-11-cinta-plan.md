# La cinta · plan de implementación

> **Para quien lo ejecute:** SUB-SKILL OBLIGATORIA: usar
> `superpowers:subagent-driven-development` (recomendado) o
> `superpowers:executing-plans` para ir tarea por tarea. Los pasos van con
> casilla (`- [ ]`) para poder marcarlos.

**Meta:** cablear `reserved-tape` con una prueba de operador: la pletina emite un
patrón, vos lo devolvés, y al pasarla suena lo que la cinta lleva grabada.

**Arquitectura:** dos módulos puros y probables sin montar nada (el estado y la
prueba), un comando que se niega a existir hasta que la pletina se encuentra, una
pantalla propia con el molde del pong, y dos marcas de sonido que reutilizan voces
existentes. Cero voces nuevas.

**Tecnología:** Next 16 · React 19 · TypeScript estricto · Jest + Testing Library.
Web Audio por el grafo que ya existe (`voices.ts`).

**Spec:** [`docs/specs/2026-09-11-cinta.md`](../specs/2026-09-11-cinta.md) — el plan
argumenta desde ahí; quien ejecute lee los dos.

## Restricciones globales

- **Comentarios en español**, explicando el PORQUÉ, con `⚠` en lo que costó
  entender o se decidió contra la intuición. Es el estilo de toda la casa.
- **C8 · sólo glifos de JetBrains Mono**: `+ - | ( ) . :` para los dibujos. **Nunca**
  bloques (`█ ▌ ░`) ni marcos de caja (`┌ ─ ┐`): los pinta una fuente de reserva y
  el dibujo se descuadra fila a fila.
- **C1 · nada de `localStorage` al pintar.** Se lee en efecto o en inicializador de
  `useState`, nunca en el cuerpo del render.
- **A3 · `prefers-reduced-motion` manda**: los carretes no giran con eso puesto.
- **A2/A4**: `Esc` sale siempre; la pantalla no se abre sola nunca.
- **B5 · una sola fuente**: los tonos viven en UNA tabla que usan la emisión, la
  comprobación y el banco.
- **Voces de sonido nuevas: CERO.** Todo sale de `voices.ts` tal como está.
- **Verificación de cada tarea**: `npx tsc --noEmit && npx eslint src tests` además
  de los tests. El build (`npm run build`) comprueba los tipos de los tests, que
  `tsc --noEmit` solo no mira.
- **Idioma**: cada texto nuevo va en `es.ts` y `en.ts`; el inglés no es calco.

---

## Mapa de ficheros

| Fichero | De qué responde |
| --- | --- |
| `src/lib/system/deck.ts` | **Estado**: si se delató, si está abierto, la espera, si ya se pasó. Toca `localStorage`; nada de React |
| `src/lib/system/deckTest.ts` | **Reglas de la prueba**: tonos, patrones, margen por ronda, indulto, comparación de orden y de ritmo. **Puro** |
| `src/components/effects/DeckOverlay.tsx` | **La pantalla**: carretes, contador, medidor, rondas, final |
| `src/lib/system/commands.ts` | `//levels`, negado hasta que la pletina se encuentra |
| `src/lib/system/audio/screens.ts` | Las marcas `deck-wake` y `deck-rew` |
| `src/components/layout/StatusBar.tsx` | El rótulo `[CINTA 0]` mientras el motor gira |
| `src/lib/system/asciiArt.ts` + `docs/ARTE.md` | El pie nuevo de la pieza |
| `src/styles/animations.css` + `effectsCatalog.ts` | Los carretes girando |

---

## Tarea 1 · El estado de la pletina

**Ficheros:**
- Crear: `src/lib/system/deck.ts`
- Test: `tests/lib/system/deck.test.ts`

**Interfaces:**
- Consume: nada.
- Produce: `markDeckAwake()`, `deckAwake()`, `markDeckLeaked()`, `deckKnown()`,
  `lockDeck(now: number)`, `deckLockedUntil(): number | null`, `markDeckPassed()`,
  `deckPassed(): boolean`, `answeredOnce(): boolean`, `dueForSelfTest(now: number):
  boolean`, `markSelfTest(now: number)`, `clearDeck()`, `forgetDeckSession()`.

- [ ] **Paso 1: el test que falla**

```ts
// tests/lib/system/deck.test.ts
import {
    clearDeck, deckAwake, deckKnown, deckLockedUntil, forgetDeckSession,
    lockDeck, markDeckAwake, markDeckLeaked,
} from '@/lib/system/deck';

beforeEach(() => {
    localStorage.clear();
    forgetDeckSession();
    clearDeck();
});

describe('encontrar la pletina', () => {
    test('⚠ el nombre solo no abre nada', () => {
        // Es la puerta entera: cualquiera puede leer el nombre en un sitio, y
        // sin esto se lo teclea el primer día y se salta el hallazgo.
        markDeckLeaked();

        expect(deckKnown()).toBe(false);
    });

    test('hace falta verla y que la fuga suelte el nombre', () => {
        markDeckAwake();
        markDeckLeaked();

        expect(deckKnown()).toBe(true);
    });

    test('⚠ y una vez abierto, sigue abierto en la sesión siguiente', () => {
        // Lo que se protege es el descubrimiento, no el trámite.
        markDeckAwake();
        markDeckLeaked();
        forgetDeckSession();

        expect(deckAwake()).toBe(false);
        expect(deckKnown()).toBe(true);
    });
});

describe('la espera', () => {
    test('⚠ es hasta la hora en punto siguiente, no sesenta minutos', () => {
        // Es la cadencia de la máquina, y además es legible: la pantalla dice
        // la hora exacta en vez de dejarte contando.
        const alas1558 = new Date('2026-09-11T15:58:00').getTime();

        lockDeck(alas1558);

        expect(deckLockedUntil()).toBe(new Date('2026-09-11T16:00:00').getTime());
    });
});
```

- [ ] **Paso 2: correrlo y ver que falla**

Ejecutar: `npx jest tests/lib/system/deck.test.ts`
Esperado: FALLA con «Cannot find module '@/lib/system/deck'».

- [ ] **Paso 3: la implementación mínima**

```ts
// src/lib/system/deck.ts

/**
 * LA PLETINA: si se encontró, si está esperando, y si ya se pasó.
 *
 * ⚠ SON DOS COSAS DISTINTAS Y NO UNA. «Delatarse» es de SESIÓN —el motor giró
 * mientras estabas— y «estar abierto» es PARA SIEMPRE. Hacen falta las dos para
 * que el comando exista, y en ese orden: lo que abre la pletina no es saber el
 * nombre, es haberla encontrado.
 */

const KEY = 'flashnotes:deck';

interface Guardado {
    /** Ya se vio el motor Y la fuga soltó el nombre. No se vuelve atrás. */
    known?: boolean;
    /** Hasta cuándo no vuelve a hacer la prueba, en milisegundos. */
    until?: number;
    /** Ya se pasó: la pieza está dada. */
    passed?: boolean;
    /** Alguien contestó alguna vez, aunque fallara. Sube la cadencia. */
    answered?: boolean;
    /** Cuándo se hizo la última comprobación sola. */
    lastSelfTest?: number;
}

/** Que el motor haya girado en ESTA sesión. En memoria: una recarga se lo lleva. */
let despierta = false;

function leer(): Guardado {
    try {
        const crudo = localStorage.getItem(KEY);
        return crudo === null ? {} : (JSON.parse(crudo) as Guardado);
    } catch {
        return {};
    }
}

function guardar(g: Guardado) {
    try {
        localStorage.setItem(KEY, JSON.stringify(g));
    } catch {
        // Sin persistencia dura lo que la pestaña. Aceptable: lo que no puede
        // pasar es que la espera no exista mientras la pestaña siga abierta.
    }
}

export function markDeckAwake() {
    despierta = true;
}

export function deckAwake(): boolean {
    return despierta;
}

/**
 * La fuga soltó el nombre.
 *
 * ⚠ SÓLO CUENTA SI LA PLETINA YA SE DELATÓ. Al revés no: el nombre sin el
 * aparato es un dato, y con esto deja de servir copiárselo a alguien.
 */
export function markDeckLeaked() {
    if (!despierta) return;
    guardar({ ...leer(), known: true });
}

export function deckKnown(): boolean {
    return leer().known === true;
}

/** La hora en punto siguiente. */
function enPunto(now: number): number {
    const d = new Date(now);
    d.setMinutes(0, 0, 0);
    return d.getTime() + 60 * 60_000;
}

export function lockDeck(now: number = Date.now()) {
    guardar({ ...leer(), until: enPunto(now), answered: true });
}

export function deckLockedUntil(): number | null {
    return leer().until ?? null;
}

export function markDeckPassed() {
    guardar({ ...leer(), passed: true, answered: true });
}

export function deckPassed(): boolean {
    return leer().passed === true;
}

export function answeredOnce(): boolean {
    return leer().answered === true;
}

/**
 * ¿Toca que la máquina se pruebe sola?
 *
 * ⚠ UNA VEZ AL DÍA, Y CADA HORA EN CUANTO ALGUIEN CONTESTA. Sabe que hay
 * alguien. No lo dice, no lo celebra: cambia de frecuencia.
 */
const DIA = 24 * 60 * 60_000;
const HORA = 60 * 60_000;

export function dueForSelfTest(now: number = Date.now()): boolean {
    const g = leer();
    const cada = g.answered === true ? HORA : DIA;

    // La primera vez se siembra: si no, se delataría en el primer minuto de la
    // primera visita y el hallazgo saldría regalado.
    if (g.lastSelfTest === undefined) {
        guardar({ ...g, lastSelfTest: now });
        return false;
    }

    return now - g.lastSelfTest >= cada;
}

export function markSelfTest(now: number = Date.now()) {
    guardar({ ...leer(), lastSelfTest: now });
}

/** El borrado total. */
export function clearDeck() {
    try {
        localStorage.removeItem(KEY);
    } catch {
        // Nada que hacer.
    }
}

/** Lo que una recarga se lleva. Lo llama `loQueSeLlevaUnaRecarga`. */
export function forgetDeckSession() {
    despierta = false;
}
```

- [ ] **Paso 4: correrlo y ver que pasa**

Ejecutar: `npx jest tests/lib/system/deck.test.ts && npx tsc --noEmit && npx eslint src tests`
Esperado: PASA · TS limpio · lint limpio.

- [ ] **Paso 5: engancharlo a los dos reinicios**

En `src/hooks/useSystemState.ts`: añadir `forgetDeckSession()` dentro de
`loQueSeLlevaUnaRecarga()` (con su comentario de por qué: el motor es de sesión) y
`clearDeck()` dentro de `resetEverything()`, junto a `clearShift()`.

Añadir al test `tests/hooks/reinicioComoRecarga.test.ts` un caso:

```ts
test('⚠ y la pletina vuelve a estar sin delatar', () => {
    markDeckAwake();

    rebootSystem();

    expect(deckAwake()).toBe(false);
});
```

- [ ] **Paso 6: commit**

```bash
git add src/lib/system/deck.ts tests/lib/system/deck.test.ts src/hooks/useSystemState.ts tests/hooks/reinicioComoRecarga.test.ts
git commit -m "La pletina tiene estado: encontrarla, la espera y la escalada"
```

---

## Tarea 2 · Las reglas de la prueba

**Ficheros:**
- Crear: `src/lib/system/deckTest.ts`
- Test: `tests/lib/system/deckTest.test.ts`

**Interfaces:**
- Consume: nada (puro).
- Produce: `TONES: readonly number[]`, `ROUNDS`, `marginFor(ronda: number): number`,
  `pattern(ronda: number, anterior: number[] | null, random?: () => number):
  number[]`, `sameOrder(a: number[], b: number[]): boolean`,
  `RHYTHM_TOLERANCE`, `sameRhythm(esperado: number[], hecho: number[]): boolean`,
  `PARDON_ODDS`, `pardoned(ronda: number, random?: () => number): boolean`.

- [ ] **Paso 1: el test que falla**

```ts
// tests/lib/system/deckTest.test.ts
import {
    marginFor, pardoned, pattern, sameOrder, sameRhythm, TONES,
} from '@/lib/system/deckTest';

describe('los tonos', () => {
    test('⚠ son tres, cercanos y con saltos DESIGUALES', () => {
        /*
         * Muy separados se reconocen sin escuchar y no hay juego; muy juntos
         * son injustos en un altavoz malo. Y con saltos IGUALES el oído infiere
         * el tercero sin haberlo escuchado.
         */
        expect(TONES).toHaveLength(3);

        const saltos = [TONES[1] - TONES[0], TONES[2] - TONES[1]];
        expect(saltos[0]).not.toBe(saltos[1]);
        expect(TONES[2] / TONES[0]).toBeLessThan(1.5);
    });
});

describe('los patrones', () => {
    test('cada ronda es más larga', () => {
        expect(pattern(0, null, () => 0)).toHaveLength(3);
        expect(pattern(1, null, () => 0)).toHaveLength(4);
        expect(pattern(2, null, () => 0)).toHaveLength(5);
    });

    test('⚠ y no sale dos veces el mismo', () => {
        // Una ronda igual a la anterior se lee como que la máquina se colgó.
        const antes = pattern(0, null, () => 0);

        expect(pattern(0, antes, () => 0)).not.toEqual(antes);
    });
});

describe('el margen', () => {
    test('⚠ se estrecha: 3 · 2 · 2 · 1', () => {
        // Es el aparato apretando, no una curva de dificultad: en la primera
        // todavía estás aprendiendo a qué suena cada tecla.
        expect([0, 1, 2, 3].map(marginFor)).toEqual([3, 2, 2, 1]);
    });
});

describe('el indulto', () => {
    test('⚠ sólo en la cuarta ronda', () => {
        expect(pardoned(0, () => 0)).toBe(false);
        expect(pardoned(3, () => 0)).toBe(true);
    });

    test('y una de cada cinco: los dos bordes', () => {
        expect(pardoned(3, () => 0.19)).toBe(true);
        expect(pardoned(3, () => 0.2)).toBe(false);
    });
});

describe('la respuesta', () => {
    test('el orden es exacto', () => {
        expect(sameOrder([0, 2, 1], [0, 2, 1])).toBe(true);
        expect(sameOrder([0, 2, 1], [0, 1, 2])).toBe(false);
    });

    test('⚠ el ritmo tolera ±35 %, y se prueban los dos bordes', () => {
        // La medición empieza con TU primer golpe: no estás persiguiendo un
        // metrónomo que ya arrancó, así que lo que se compara son los HUECOS.
        expect(sameRhythm([0, 500, 1000], [0, 660, 1320])).toBe(true);
        expect(sameRhythm([0, 500, 1000], [0, 690, 1380])).toBe(false);
    });
});
```

- [ ] **Paso 2: correrlo y ver que falla**

Ejecutar: `npx jest tests/lib/system/deckTest.test.ts`
Esperado: FALLA con «Cannot find module '@/lib/system/deckTest'».

- [ ] **Paso 3: la implementación mínima**

```ts
// src/lib/system/deckTest.ts

/**
 * LAS REGLAS DE LA PRUEBA DE OPERADOR.
 *
 * Puro y sin relojes propios: quien lo llama le pasa el azar y los tiempos. Así
 * se prueba entero sin montar nada, que es la decisión que ya tomaron el corte
 * del pong y el cuadro de la v0.2.
 */

/**
 * Los tres tonos, en hercios.
 *
 * ⚠ CERCANOS Y CON SALTOS DESIGUALES, y las dos cosas importan. Muy separados
 * —400/800/1600— se reconocen sin escuchar y no hay juego; muy juntos son
 * injustos en un altavoz malo. Y con saltos IGUALES el oído infiere el tercero
 * sin haberlo escuchado: desiguales, hay que atender a cada uno.
 *
 * Viven en el rango grave que ya usa la app: sus bips van de 130 a 650 Hz.
 */
export const TONES: readonly number[] = [300, 352, 385];

/** Cuántos tonos emite cada ronda. La cuarta es la de ritmo. */
export const ROUNDS = [3, 4, 5, 4] as const;

/**
 * Cuántos rebobinados aguanta cada ronda.
 *
 * ⚠ ES EL APARATO APRETANDO, NO UNA CURVA DE DIFICULTAD. La primera ronda es
 * donde estás aprendiendo a qué suena cada tecla, y ahí da igual fallar; para la
 * cuarta ya sabés lo que hacés, y un error es un error. Que se estreche solo,
 * sin decirlo, hace que la última ronda se juegue con el pulso distinto.
 */
const MARGEN = [3, 2, 2, 1] as const;

export function marginFor(ronda: number): number {
    return MARGEN[ronda] ?? 1;
}

/** Una fuente de azar inyectable, para poder fijarla en los tests. */
type Random = () => number;

/**
 * El patrón de una ronda.
 *
 * ⚠ NUNCA IGUAL AL ANTERIOR. Una ronda repetida se lee como que la máquina se
 * colgó, y entonces el jugador deja de escuchar y empieza a dudar del aparato.
 */
export function pattern(
    ronda: number,
    anterior: number[] | null,
    random: Random = Math.random
): number[] {
    const largo = ROUNDS[ronda] ?? 3;

    for (let intento = 0; intento < 8; intento += 1) {
        const salida = Array.from({ length: largo }, () =>
            Math.min(TONES.length - 1, Math.floor(random() * TONES.length))
        );

        if (anterior === null || !sameOrder(salida, anterior)) return salida;

        // Con el azar fijado —los tests lo fijan— hay que forzar la diferencia o
        // esto no termina nunca.
        salida[0] = (salida[0] + 1) % TONES.length;
        return salida;
    }

    return Array.from({ length: largo }, (_, i) => i % TONES.length);
}

export function sameOrder(a: number[], b: number[]): boolean {
    return a.length === b.length && a.every((v, i) => v === b[i]);
}

/**
 * Cuánto se perdona en la ronda de ritmo.
 *
 * ⚠ ANCHA A PROPÓSITO. Es la única ronda que mide tiempo, y el tiempo de una
 * persona con un teclado no es el de un metrónomo. Un tercio de holgura deja
 * pasar a cualquiera que haya entendido la cadencia y no a quien aporrea.
 */
export const RHYTHM_TOLERANCE = 0.35;

/**
 * ¿La cadencia es la misma?
 *
 * ⚠ SE COMPARAN LOS HUECOS, NO LOS INSTANTES. La medición empieza con TU primer
 * golpe: no estás persiguiendo un metrónomo que ya arrancó, así que sólo cuenta
 * el tiempo ENTRE golpes.
 */
export function sameRhythm(esperado: number[], hecho: number[]): boolean {
    if (esperado.length !== hecho.length) return false;

    for (let i = 1; i < esperado.length; i += 1) {
        const debe = esperado[i] - esperado[i - 1];
        const hizo = hecho[i] - hecho[i - 1];

        if (Math.abs(hizo - debe) > debe * RHYTHM_TOLERANCE) return false;
    }

    return true;
}

/**
 * Una de cada cinco veces, la cuarta ronda te da otra.
 *
 * ⚠ ES LA ÚNICA TIRADA AL AZAR DE TODA LA PIEZA. Los patrones, la escalada y la
 * espera son deterministas. Una sola moneda, y en el único sitio donde PERDONA
 * en vez de castigar: si el azar decidiera cuándo cierra, sería una máquina
 * tramposa.
 *
 * Y no se dice, no se explica y no se puede provocar: el motor se detiene como
 * si fuera a cerrar y arranca otra vez.
 */
export const PARDON_ODDS = 0.2;

export function pardoned(ronda: number, random: Random = Math.random): boolean {
    return ronda === 3 && random() < PARDON_ODDS;
}
```

- [ ] **Paso 4: correrlo y ver que pasa**

Ejecutar: `npx jest tests/lib/system/deckTest.test.ts && npx tsc --noEmit && npx eslint src tests`
Esperado: PASA · TS limpio · lint limpio.

- [ ] **Paso 5: commit**

```bash
git add src/lib/system/deckTest.ts tests/lib/system/deckTest.test.ts
git commit -m "Las reglas de la prueba: tonos desiguales, margen que se estrecha, un indulto"
```

---

## Tarea 3 · El comando que no existe

**Ficheros:**
- Modificar: `src/lib/system/commands.ts` (tipo `CommandEffect`, entrada nueva,
  `hiddenCommandNames`)
- Modificar: `src/hooks/useNoteCommands.ts` (el caso `open-deck`)
- Modificar: `src/app/page.tsx` (el estado y el montaje)
- Test: `tests/lib/system/levelsCommand.test.ts`

**Interfaces:**
- Consume: `deckKnown()`, `deckAwake()` de la Tarea 1.
- Produce: el efecto `{ kind: 'open-deck' }` y la prop `onOpenDeck` de
  `useNoteCommands`.

- [ ] **Paso 1: el test que falla**

```ts
// tests/lib/system/levelsCommand.test.ts
import { run, type CommandContext } from '@/lib/system/commands';
import { clearDeck, forgetDeckSession, markDeckAwake, markDeckLeaked } from '@/lib/system/deck';
import { clearUsed } from '@/lib/system/commandUnlock';

const ctx = (): CommandContext => ({
    now: new Date('2026-09-11T15:00:00.000Z'),
    sessionStart: new Date('2026-09-11T14:00:00.000Z'),
    notes: [], integrity: 100, theme: 'light', effectsEnabled: true,
    soundEnabled: true, secretsFound: 0, secretsTotal: 34, log: '',
    greetings: 0, chat: 0, kicks: 0, lang: 'es' as const,
});

beforeEach(() => {
    localStorage.clear();
    clearUsed();
    forgetDeckSession();
    clearDeck();
});

describe('//levels antes de encontrar la pletina', () => {
    test('⚠ contesta que el comando no existe', () => {
        /*
         * Es la diferencia entre un secreto y un dato: cualquiera puede leer el
         * nombre en un sitio, y sin esta puerta se lo teclea el primer día y se
         * salta el hallazgo entero.
         */
        const salida = run('//levels', ctx());

        expect(salida?.denied).toBe(true);
        expect(salida?.output).toContain('DESCONOCIDO');
    });

    test('⚠ y no dice «todavía no»', () => {
        // Un «todavía no» admite que existe algo, y el que probó el nombre ya
        // ganó la mitad.
        expect(run('//levels', ctx())?.output).not.toMatch(/TODAVÍA|AÚN|PRONTO/);
    });

    test('ni se abre con sólo haber visto el motor', () => {
        markDeckAwake();

        expect(run('//levels', ctx())?.denied).toBe(true);
    });
});

describe('//levels después', () => {
    test('abre la pletina', () => {
        markDeckAwake();
        markDeckLeaked();

        expect(run('//levels', ctx())?.effect).toEqual({ kind: 'open-deck' });
    });
});

describe('la ayuda y la fuga', () => {
    test('⚠ nunca sale en //help, ni tachado', async () => {
        // Un hueco tachado dice «hay algo aquí» sin que hayas encontrado nada.
        markDeckAwake();
        markDeckLeaked();

        expect(run('//help', ctx())?.output).not.toContain('levels');
    });

    test('la fuga lo suelta sólo si la pletina ya se delató', async () => {
        const { hiddenCommandNames } = await import('@/lib/system/commands');

        expect(hiddenCommandNames()).not.toContain('//levels');

        markDeckAwake();
        expect(hiddenCommandNames()).toContain('//levels');
    });
});
```

- [ ] **Paso 2: correrlo y ver que falla**

Ejecutar: `npx jest tests/lib/system/levelsCommand.test.ts`
Esperado: FALLA — `run('//levels')` devuelve `null` porque el comando no existe.

- [ ] **Paso 3: la implementación**

En `commands.ts`, el tipo:

```ts
    | { kind: 'open-deck' }
```

La entrada, junto a las demás escondidas:

```ts
    {
        /*
         * LA PLETINA.
         *
         * ⚠ NO SE LLAMA `//deck` NI `//tape`, y es deliberado: el pong no se
         * llama `//pong` —se llama por su nombre de diagnóstico— y el chiste es
         * que parece mantenimiento. `//levels` es lo que teclearías para revisar
         * el camino de audio de una máquina; que detrás haya una cinta puesta es
         * el hallazgo.
         *
         * ⚠ Y SE NIEGA A EXISTIR HASTA HABERLA ENCONTRADO. Lo mismo que hace la
         * palabra del ente y que `//attach_*`: sin las dos condiciones —el motor
         * girando y la fuga soltando el nombre— contesta «comando desconocido»,
         * igual que una palabra inventada. Lo que abre la pletina no es saber el
         * nombre: es haberla encontrado.
         */
        name: '//levels',
        notInV02: true,
        hidden: true,
        unlisted: true,
        summary: { es: 'comprobar niveles', en: 'check levels' },
        resolve: (_ctx, _args, lang) => {
            if (!deckKnown()) {
                return {
                    output: unknownCommand('levels', lang),
                    effect: SIN_EFECTO,
                    denied: true,
                };
            }

            return { output: T.deckMounted[lang], effect: { kind: 'open-deck' as const } };
        },
    },
```

Los textos, en la tabla `T`:

```ts
    /* Lo que contesta al montar la pletina. No promete nada: dice qué hay. */
    deckMounted: {
        es: 'CINTA 0 · MONTADA.',
        en: 'TAPE 0 · MOUNTED.',
    },
```

Y la fuga, en `hiddenCommandNames()`:

```ts
export function hiddenCommandNames(): readonly string[] {
    const enV02 = isV02();

    const base = COMMANDS.filter(
        (c) => c.hidden && !c.unlisted && (enV02 ? !c.notInV02 : !c.onlyV02)
    ).map((c) => c.name);

    /*
     * ⚠ Y LA PLETINA, SÓLO SI YA SE DELATÓ EN ESTA SESIÓN. Va a mano y no por
     * bandera porque la condición no es del comando, es del jugador: el nombre
     * tiene que llegar DESPUÉS de haber visto el aparato, o no significa nada.
     */
    return enV02 || !deckAwake() ? base : [...base, '//levels'];
}
```

En `useNoteCommands.ts`:

```ts
                case 'open-deck':
                    onOpenDeck();
                    break;
```

Y en `page.tsx`, junto a `playingPong`:

```tsx
    const [enLaPletina, setEnLaPletina] = useState(false);
```

- [ ] **Paso 4: correrlo y ver que pasa**

Ejecutar: `npx jest tests/lib/system/levelsCommand.test.ts && npx tsc --noEmit && npx eslint src tests`
Esperado: PASA · TS limpio · lint limpio.

⚠ **Si falla el test de la fuga en la v0.2**: es correcto — ahí la pletina no
existe (`notInV02`), y el filtro ya lo cubre.

- [ ] **Paso 5: commit**

```bash
git add src/lib/system/commands.ts src/hooks/useNoteCommands.ts src/app/page.tsx tests/lib/system/levelsCommand.test.ts
git commit -m "//levels: el comando no existe hasta haber encontrado la pletina"
```

---

## Tarea 4 · El motor que se delata, y su sonido

**Ficheros:**
- Crear: `src/components/effects/DeckWake.tsx`
- Modificar: `src/components/layout/StatusBar.tsx`, `src/lib/system/audio/screens.ts`,
  `src/app/page.tsx`, `src/i18n/es.ts`, `src/i18n/en.ts`
- Test: `tests/components/effects/DeckWake.test.tsx`

**Interfaces:**
- Consume: `dueForSelfTest`, `markSelfTest`, `markDeckAwake` (Tarea 1).
- Produce: la clase `deck-wake` en el DOM, que es la marca que dispara el sonido.

- [ ] **Paso 1: el test que falla**

```tsx
// tests/components/effects/DeckWake.test.tsx
process.env.RTL_SKIP_AUTO_CLEANUP = 'true';

import { render, act } from '@testing-library/react';
import DeckWake from '@/components/effects/DeckWake';
import { clearDeck, deckAwake, forgetDeckSession } from '@/lib/system/deck';

beforeEach(() => {
    localStorage.clear();
    forgetDeckSession();
    clearDeck();
    jest.useFakeTimers();
});

afterEach(() => jest.useRealTimers());

test('⚠ la primera visita NO la enseña', () => {
    // Se siembra al primer arranque: si no, se delataría en el primer minuto de
    // la primera visita y el hallazgo saldría regalado.
    render(<DeckWake />);
    act(() => {
        jest.advanceTimersByTime(120_000);
    });

    expect(deckAwake()).toBe(false);
});

test('cuando toca, gira dos segundos y deja marca', () => {
    localStorage.setItem(
        'flashnotes:deck',
        JSON.stringify({ lastSelfTest: Date.now() - 25 * 60 * 60_000 })
    );

    render(<DeckWake />);
    act(() => {
        jest.advanceTimersByTime(60_000);
    });

    expect(deckAwake()).toBe(true);
});
```

- [ ] **Paso 2: correrlo y ver que falla**

Ejecutar: `npx jest tests/components/effects/DeckWake.test.tsx`
Esperado: FALLA con «Cannot find module '@/components/effects/DeckWake'».

- [ ] **Paso 3: la implementación**

```tsx
// src/components/effects/DeckWake.tsx
'use client';

import { useEffect, useState } from 'react';
import { dueForSelfTest, markDeckAwake, markSelfTest } from '@/lib/system/deck';
import { useSystemState } from '@/hooks/useSystemState';

/**
 * LA PLETINA SE DELATA SOLA.
 *
 * ⚠ ES LA PRUEBA DE LA MÁQUINA, NO UNA PISTA PUESTA AHÍ PARA VOS. Se hace su
 * comprobación una vez al día —cada hora en cuanto alguien contesta— esté quien
 * esté, como lleva haciéndolo años. Que la veas es casualidad, y por eso vale.
 *
 * ⚠ Y NO ARRANCA PEGADA AL ENCENDIDO. Medio minuto de margen: encima del
 * arranque sería una parte del arranque, y lo que tiene que ser es algo que
 * pasa mientras trabajás.
 */

/** Cuánto gira el motor. Dos segundos: suficiente para mirar, corto para dudar. */
export const DECK_WAKE_MS = 2_000;

/** Cuánto se espera desde que se abre la pestaña antes de mirar si toca. */
const MARGEN_MS = 30_000;

export default function DeckWake() {
    const { effectsEnabled } = useSystemState();
    const [girando, setGirando] = useState(false);

    useEffect(() => {
        if (!effectsEnabled) return;

        const arranque = setTimeout(() => {
            if (!dueForSelfTest()) return;

            markSelfTest();
            markDeckAwake();
            setGirando(true);
        }, MARGEN_MS);

        return () => clearTimeout(arranque);
    }, [effectsEnabled]);

    useEffect(() => {
        if (!girando) return;

        const fin = setTimeout(() => setGirando(false), DECK_WAKE_MS);
        return () => clearTimeout(fin);
    }, [girando]);

    if (!girando) return null;

    /*
     * El rótulo va con `key` a propósito: el sonido se entera de lo que pasa
     * mirando nodos que APARECEN, y sin `key` React reutilizaría el hueco.
     */
    return (
        <span key="deck-wake" className="deck-wake mono text-2xs dim" data-testid="deck-wake">
            [CINTA 0]
        </span>
    );
}
```

Montarlo en `StatusBar.tsx`, dentro de la barra, después del hueco del fragmento.

La marca, en `screens.ts`:

```ts
    {
        mark: 'deck-wake',
        what: 'El motor de la pletina cogiendo velocidad, sin que nadie lo pida',
        /*
         * ⚠ EL CAJÓN CERRÁNDOSE, QUE ES RUIDO QUE CRECE. Un motor arrancando es
         * exactamente eso: la voz existe y hace lo que hace falta, así que no se
         * inventa ninguna. Es la misma regla que gobierna todo el sonido de la
         * casa — las voces se reparten, no se multiplican.
         */
        shot: { voice: 'drawer', args: { closing: true } },
    },
```

- [ ] **Paso 4: correrlo y ver que pasa**

Ejecutar: `npx jest tests/components/effects/DeckWake.test.tsx tests/lib/system/audio tests/docs && npx tsc --noEmit && npx eslint src tests`
Esperado: PASA. El test del catálogo de sonido exige que el `what` esté también en
`docs/SONIDO.md`: añadir su fila.

⚠ **`DeckWake` es un componente de `effects/`**, así que el test del catálogo de
pantallas va a exigir que esté en `SYSTEM_SCREENS` o en `NOT_SCREENS`. Va en
**`NOT_SCREENS`**: no es una pantalla, es un rótulo de dos segundos.

- [ ] **Paso 5: commit**

```bash
git add src/components/effects/DeckWake.tsx tests/components/effects/DeckWake.test.tsx src/components/layout/StatusBar.tsx src/lib/system/audio/screens.ts src/lib/system/screensCatalog.ts docs/SONIDO.md
git commit -m "La pletina se delata sola: [CINTA 0] y el motor cogiendo velocidad"
```

---

## Tarea 5 · La pantalla: el armazón

**Ficheros:**
- Crear: `src/components/effects/DeckOverlay.tsx`
- Modificar: `src/app/page.tsx`, `src/styles/animations.css`,
  `src/lib/system/effectsCatalog.ts`, `src/lib/system/screensCatalog.ts`,
  `src/components/system/ScreenViewer.tsx`
- Test: `tests/components/effects/DeckOverlay.test.tsx`

**Interfaces:**
- Consume: `deckLockedUntil()` (Tarea 1).
- Produce: `<DeckOverlay open onClose demo? />` — donde `demo` es:

```ts
interface DeckProps {
    open: boolean;
    onClose: () => void;
    /**
     * Para el banco: se puede jugar, pero NO da la pieza ni pone la espera.
     *
     * ⚠ HACE FALTA, y es el mismo tropiezo que ya tuvo el visor con la
     * ceremonia: las pantallas del catálogo se montan de verdad, así que sin
     * esto consultar el banco regalaría la cinta y, de paso, te dejaría la
     * pletina bloqueada una hora por fallar en una demostración.
     */
    demo?: boolean;
}
```

- [ ] **Paso 1: el test que falla**

```tsx
// tests/components/effects/DeckOverlay.test.tsx
process.env.RTL_SKIP_AUTO_CLEANUP = 'true';

import { render, screen, fireEvent } from '@testing-library/react';
import DeckOverlay from '@/components/effects/DeckOverlay';
import { clearDeck, lockDeck } from '@/lib/system/deck';

beforeEach(() => {
    localStorage.clear();
    clearDeck();
});

test('cerrada no pinta nada', () => {
    const { container } = render(<DeckOverlay open={false} onClose={() => {}} />);

    expect(container.firstChild).toBeNull();
});

test('⚠ abre PARADA: no te pilla escuchando a mitad', () => {
    render(<DeckOverlay open onClose={() => {}} />);

    expect(screen.getByTestId('deck-idle')).toBeInTheDocument();
});

test('⚠ de todo estado se sale: Esc cierra', () => {
    const cerrar = jest.fn();
    render(<DeckOverlay open onClose={cerrar} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(cerrar).toHaveBeenCalled();
});

test('y con la espera puesta dice la hora exacta', () => {
    // La pantalla dice la hora en vez de dejarte contando: es la cadencia de la
    // máquina, no un castigo calibrado contra vos.
    lockDeck(new Date('2026-09-11T15:58:00').getTime());

    render(<DeckOverlay open onClose={() => {}} />);

    expect(screen.getByTestId('deck-locked')).toHaveTextContent('16:00');
});
```

- [ ] **Paso 2: correrlo y ver que falla**

Ejecutar: `npx jest tests/components/effects/DeckOverlay.test.tsx`
Esperado: FALLA con «Cannot find module».

- [ ] **Paso 3: la implementación del armazón**

El componente pinta la caja con `+ - |`, los dos carretes, el contador de vueltas
y el medidor (`ProgressBar`). Sin rondas todavía: estado `idle` y estado
`bloqueada`.

```tsx
// src/components/effects/DeckOverlay.tsx
'use client';

import { useEffect, useState } from 'react';
import { deckLockedUntil } from '@/lib/system/deck';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import ProgressBar from '@/components/ui/ProgressBar';
import { useT } from '@/i18n';

/**
 * LA PLETINA.
 *
 * ⚠ MISMO MOLDE QUE EL PONG: un overlay que se abre desde un comando, sale con
 * `Esc` y no existe en la v0.2. Lo que cambia es lo de dentro.
 *
 * ⚠ ABRE PARADA. No arranca sola: no te puede pillar escuchando a mitad, y
 * además así se puede mirar el aparato antes de meterse.
 */
export default function DeckOverlay({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const t = useT();
    const quieto = usePrefersReducedMotion();
    const [hasta] = useState(() => deckLockedUntil());

    useEffect(() => {
        if (!open) return;

        const alPulsar = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('keydown', alPulsar);
        return () => document.removeEventListener('keydown', alPulsar);
    }, [open, onClose]);

    if (!open) return null;

    const esperando = hasta !== null && hasta > Date.now();
    const hora = hasta === null ? '' : new Date(hasta).toTimeString().slice(0, 5);

    return (
        <div className="deck-overlay" role="dialog" aria-label={t('deck.title')}>
            <pre className="deck-box" aria-hidden="true">
                {[
                    '+- CINTA 0 --------------------------------+',
                    '|                                          |',
                    '|    .------.                .------.      |',
                    `|   (  ${quieto ? '()()' : '()()'}  )  [ 0 0 0 0 ]  (  ()()  )    |`,
                    "|    '------'                '------'      |",
                    '|                                          |',
                    '+------------------------------------------+',
                ].join('\n')}
            </pre>

            <ProgressBar value={0} name={t('deck.level')} />

            {esperando ? (
                <p className="mono text-xs" data-testid="deck-locked">
                    {t('deck.next', { time: hora })}
                </p>
            ) : (
                <p className="mono text-xs" data-testid="deck-idle">
                    {t('deck.idle')}
                </p>
            )}
        </div>
    );
}
```

Los textos (`es.ts` / `en.ts`):

```ts
    'deck.title': 'Pletina',
    'deck.level': 'Nivel de la cinta',
    'deck.idle': 'PULSE PARA COMPROBAR',
    'deck.next': 'PRÓXIMA PRUEBA {time}',
```

- [ ] **Paso 4: los carretes, catalogados**

```css
/* ─────────────────────────────────────────────────────────────────────────
   LOS CARRETES DE LA PLETINA

   ⚠ GIRAN A SALTOS, no en continuo. Un giro suave se lee como una animación
   de web; el escalón es lo que lo delata como un mecanismo. Es el mismo
   `steps()` de todo lo demás.

   ⚠ Y GIRA UN `<span>`, no el cuadro entero: el marco está dibujado con
   caracteres y rotarlo lo descuadraría fila a fila.
   ───────────────────────────────────────────────────────────────────────── */
@keyframes deck-reel {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
}

.deck-reel {
    display: inline-block;
    animation: deck-reel 1.2s steps(8, end) infinite;
}
```

Y su ficha en `effectsCatalog.ts` — **un test recorre el CSS y exige que las dos
listas coincidan en las dos direcciones**, y otro deriva de los fotogramas que
esto es `donde: 'pantalla'` porque anima `transform`:

```ts
    {
        id: 'deck-reel',
        donde: 'pantalla',
        nombre: 'Carrete de la pletina',
        que: 'El carrete girando a saltos mientras la cinta corre.',
        cuando: 'Con la pletina abierta y la cinta en marcha, en `//levels`.',
        hoja: 'animations',
        clases: 'deck-reel',
    },
```

- [ ] **Paso 5: catalogar la pantalla y montarla**

- `screensCatalog.ts`: entrada `id: 'pletina'`, `componente: 'DeckOverlay'`,
  `como: 'directo'`, `inerte: 'acá no da la pieza'`.
- `ScreenViewer.tsx`: `case 'pletina': return <DeckOverlay open demo onClose={INERTE} />;`
- `page.tsx`: montarla junto al pong.

- [ ] **Paso 6: correr todo y commit**

```bash
npx jest tests/components/effects/DeckOverlay.test.tsx tests/lib/system && npx tsc --noEmit && npx eslint src tests
git add -A && git commit -m "La pletina tiene pantalla: carretes, contador y medidor"
```

---

## Tarea 6 · Las rondas

**Ficheros:**
- Modificar: `src/components/effects/DeckOverlay.tsx`
- Test: `tests/components/effects/DeckRounds.test.tsx`

**Interfaces:**
- Consume: `pattern`, `sameOrder`, `sameRhythm`, `marginFor`, `pardoned`, `TONES`.
- Produce: nada nuevo hacia fuera.

- [ ] **Paso 1: el test que falla**

```tsx
// tests/components/effects/DeckRounds.test.tsx
process.env.RTL_SKIP_AUTO_CLEANUP = 'true';

import { render, screen, fireEvent, act } from '@testing-library/react';
import DeckOverlay from '@/components/effects/DeckOverlay';
import { clearDeck, deckLockedUntil } from '@/lib/system/deck';

beforeEach(() => {
    localStorage.clear();
    clearDeck();
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0);
});

afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
});

/** Arranca la prueba y deja pasar la emisión de la ronda. */
function arrancar() {
    render(<DeckOverlay open onClose={() => {}} />);
    fireEvent.keyDown(document, { key: '1' });
    act(() => {
        jest.advanceTimersByTime(5_000);
    });
}

test('la ronda 1 pide tres tonos', () => {
    arrancar();

    expect(screen.getByTestId('deck-round')).toHaveTextContent('1');
});

test('⚠ fallar rebobina esa ronda, no la prueba', () => {
    // Nunca desde el principio: la máquina no te riñe, rebobina.
    arrancar();
    fireEvent.keyDown(document, { key: '3' });
    act(() => {
        jest.advanceTimersByTime(3_000);
    });

    expect(screen.getByTestId('deck-round')).toHaveTextContent('1');
    expect(deckLockedUntil()).toBeNull();
});

test('⚠ agotar el margen cierra la prueba y pone la espera', () => {
    arrancar();
    for (let i = 0; i < 3; i += 1) {
        fireEvent.keyDown(document, { key: '3' });
        act(() => {
            jest.advanceTimersByTime(3_000);
        });
    }

    expect(deckLockedUntil()).not.toBeNull();
});
```

- [ ] **Paso 2: correrlo y ver que falla**

Ejecutar: `npx jest tests/components/effects/DeckRounds.test.tsx`
Esperado: FALLA — todavía no hay rondas.

- [ ] **Paso 3: la implementación**

El corazón, que es lo único con reglas — todo sale de `deckTest.ts`, y este
componente no decide nada por su cuenta:

```tsx
type Fase = 'idle' | 'emitiendo' | 'esperando' | 'rebobinando' | 'ganada' | 'perdida';

const [fase, setFase] = useState<Fase>('idle');
const [ronda, setRonda] = useState(0);
const [patron, setPatron] = useState<number[]>([]);
const [respuesta, setRespuesta] = useState<number[]>([]);
const [fallos, setFallos] = useState(0);

/** La altura de la aguja para cada tono. UNA aguja, tres alturas. */
const ALTURAS = [40, 55, 70];

/**
 * Lo que pasa cuando la respuesta está completa.
 *
 * ⚠ EL MARGEN Y EL INDULTO NO SE DECIDEN ACÁ. `marginFor` y `pardoned` viven en
 * `deckTest.ts` y están probados sin montar nada; acá sólo se obedecen. Si la
 * regla se escribiera también en el componente, habría dos y se separarían.
 */
function resolver(acierto: boolean) {
    if (acierto) {
        if (ronda === 3) return setFase('ganada');

        setRonda(ronda + 1);
        setFallos(0);
        setRespuesta([]);
        return setFase('emitiendo');
    }

    const gastados = fallos + 1;
    const cerrada = gastados >= marginFor(ronda) && !pardoned(ronda);

    if (cerrada) {
        lockDeck();
        return setFase('perdida');
    }

    setFallos(gastados);
    setRespuesta([]);
    setFase('rebobinando');
}
```

Y el resto, sin reglas propias:

- **Al entrar en una ronda**: `pattern(ronda, patronAnterior)`, y emitir cada tono
  con `play('beep', { hz: TONES[i], ms: 180 })` moviendo la aguja a `ALTURAS[i]`.
- **Teclas `1 2 3`** → empujan a `respuesta`. Completa → `sameOrder` decide.
- **Ronda 4**: se guardan los instantes con `Date.now()` y decide `sameRhythm`.

⚠ **La aguja es UNA y salta a tres alturas.** No son tres lucecitas: con tres
lámparas se juega mirando y sin escuchar nada, y se cae lo único que hace que
esto valga.

- [ ] **Paso 3 bis: el sonido de rebobinar**

La fase `rebobinando` tiene que sonar, y es la segunda marca del spec. En
`screens.ts`:

```ts
    {
        mark: 'deck-rew',
        what: 'La cinta rebobinando después de un fallo, para volver a intentarlo',
        /*
         * ⚠ EL CAJÓN ABRIÉNDOSE: ruido que DECAE, que es un motor perdiendo
         * velocidad. Es la misma voz que el motor arrancando (`deck-wake`) con
         * el sentido cambiado, y por eso las dos se reconocen como el mismo
         * aparato haciendo dos cosas opuestas.
         */
        shot: { voice: 'drawer', args: { closing: false } },
    },
```

Y el nodo que la dispara, con `key` para que el observador lo vea APARECER:

```tsx
{fase === 'rebobinando' && (
    <span key="deck-rew" className="deck-rew" aria-hidden="true" />
)}
```

- [ ] **Paso 4: correr y commit**

```bash
npx jest tests/components/effects && npx tsc --noEmit && npx eslint src tests
git add -A && git commit -m "Las cuatro rondas, con el margen estrechandose y un indulto"
```

---

## Tarea 7 · La grabación, el parte y la pieza

**Ficheros:**
- Modificar: `src/components/effects/DeckOverlay.tsx`, `src/lib/system/asciiArt.ts`,
  `docs/ARTE.md`, `src/i18n/es.ts`, `src/i18n/en.ts`
- Test: `tests/components/effects/DeckWin.test.tsx`

- [ ] **Paso 1: el test que falla**

```tsx
test('⚠ al pasarla imprime el parte, y las cuentas cuadran', () => {
    // No es una frase con números: es el parte de una máquina que lleva la
    // cuenta. La última línea sos vos.
    ganarLaPrueba();

    const parte = screen.getByTestId('deck-log').textContent ?? '';
    expect(parte).toContain('11.417');
    expect(parte).toContain('11.416');
});

test('y da la pieza una sola vez', () => {
    ganarLaPrueba();
    expect(readFound().has('cassette')).toBe(true);

    // Volver a entrar reproduce la cinta y no vuelve a premiar.
    const antes = readFound().size;
    ganarLaPrueba();
    expect(readFound().size).toBe(antes);
});
```

- [ ] **Paso 2: correrlo y ver que falla**

Ejecutar: `npx jest tests/components/effects/DeckWin.test.tsx`
Esperado: FALLA.

- [ ] **Paso 3: la implementación**

1. **La reproducción**: seis pasadas de `patrón… silencio` con los huecos
   encogiendo (`beep` a los tonos, `silence(300)` entre medias), y la última con
   respuesta. Total ~4 s.
2. **El parte**, impreso con el tic del teletipo línea a línea:

```
PRUEBA DE OPERADOR
INTENTOS        11.417
SIN OPERADOR    11.416
OPERADOR             1
```

3. `markDeckPassed()` y `awardFrom('reserved-tape')` — **y las dos SÓLO si no
   es `demo`**: el banco monta las pantallas de verdad, así que sin esa guarda
   consultar el catálogo regalaría la pieza.
4. **El pie nuevo** en `asciiArt.ts`:

```ts
        caption: { es: 'CINTA · ALGUIEN CONTESTÓ', en: 'TAPE · SOMEONE ANSWERED' },
```

⚠ **Y hay que tocar `docs/ARTE.md`**: `tests/docs/arte.test.ts` ata el documento
al código **en las dos direcciones**, así que cambiar el pie sin tocarlo rompe la
suite.

- [ ] **Paso 4: correr y commit**

```bash
npx jest && npx tsc --noEmit && npx eslint src tests
git add -A && git commit -m "La cinta suelta lo que tenia dentro, y la pieza cae"
```

---

## Tarea 8 · Documentos y banco

**Ficheros:**
- Modificar: `docs/SECRETOS.md`, `docs/SONIDO.md`, `docs/IDEAS.md`,
  `docs/plans/2026-09-10-auditoria-honda.md`, `src/components/system/Banco.tsx`

- [ ] **Paso 1: SECRETOS** — sección nueva para la pletina: cómo se encuentra, las
  cuatro rondas, el margen, el indulto, la escalada, el parte. Y **quitar** de §18
  la deuda de `reserved-tape`: ya no es «la única sin camino», y la colección pasa
  a **16/16 alcanzables**. ⚠ Hay menciones del `14/16` en varios sitios del
  documento: buscarlas todas.
- [ ] **Paso 2: SONIDO** — la fila de `deck-wake` y `deck-rew` en la tabla de
  sucesos.
- [ ] **Paso 3: IDEAS** — tachar la cinta de los pendientes.
- [ ] **Paso 4: el banco** — la pletina sale sola en PANTALLAS por el catálogo; la
  sección de sonido también. **Comprobar** que el contador de pantallas sube y que
  el test del banco sigue verde.
- [ ] **Paso 5: la suite entera y commit**

```bash
npm run build && npx jest
git add -A && git commit -m "La cinta, documentada: SECRETOS, SONIDO y el banco al dia"
```

---

## Repaso contra el spec

| Sección del spec | Tarea |
| --- | --- |
| §2 · el comando `//levels` | 3 |
| §3.1 · se delata sola, una vez al día | 4 |
| §3.2 · la fuga sólo después | 3 |
| §3.3 · antes, «comando desconocido» | 3 |
| §3.4 · la cadena se sigue sin oír | 4 (el rótulo) + 6 (la aguja) |
| §4 · las cuatro rondas, tonos, aguja | 2 (reglas) + 6 (pantalla) |
| §5.1 · rebobinar esa ronda | 6 |
| §5.1 bis · el margen 3·2·2·1 | 2 + 6 |
| §5.1 ter · el indulto | 2 + 6 |
| §5.2 · la escalada y la espera | 1 + 6 |
| §6 · la grabación, el parte, la pieza | 7 |
| §7 · lo que reutiliza | todas |
| §8 · las reglas de la casa | 5 (A3/A4), 1 (C1), 5 (C8) |
| §9 · los tests | uno por tarea |

**Riesgo abierto del spec que se comprueba al final:** si la ronda de ritmo sale
irritante en pruebas, se quita — las tres primeras ya son una prueba. Esa decisión
se toma **después de la Tarea 6**, jugándola, no antes.
