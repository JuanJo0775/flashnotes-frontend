# Reglas del proyecto

Cada regla de aquí salió de un defecto real. No son preferencias: son cosas que
ya se rompieron una vez, con el sitio donde se rompieron.

Si vas a escribir código en este repo, esto es lo único que hay que leer antes.

---

# A · Las tres reglas de producto

Mandan sobre todas las demás. Un efecto que las incumpla no se construye, por
bueno que sea.

### A1 · Nada puede perder trabajo, ni aparentar que lo perdió

Los efectos son de pantalla, nunca de datos. Ninguna ventana de error falsa
menciona tus notas ni el guardado: hablan de la señal y del subsistema de vídeo,
que es lo que de verdad está fallando.

Un susto de que perdiste algo no se arregla enterándote de que era broma.

### A2 · Nada bloquea la escritura

Las capas de efecto van con `pointer-events: none` y sin robar el foco. Durante
el colapso podés seguir tecleando a ciegas y todo llega.

**Única excepción, y es por consentimiento:** el `vsync-test` (§15). Todo lo
demás *te pasa*; ése *lo pediste* tecleando el comando. La regla existe para que
la app no te interrumpa sin permiso.

### A3 · `prefers-reduced-motion` gana siempre

Sin negarse a existir: la versión reducida cuenta lo mismo con menos movimiento.
El colapso pasa a un corte a negro de 400 ms con el texto ya escrito.

---

# B · Reglas de arquitectura

### B1 · La lógica va en un módulo puro; el componente sólo la pinta

Cada pieza se reparte en tres:

| | Qué hace | Cómo se prueba |
| --- | --- | --- |
| `src/lib/system/*.ts` | Puro: sin DOM, sin relojes propios, sin azar sin inyectar | Entero, sin montar nada |
| `src/hooks/*.ts` | Temporizadores, suscripciones, efectos | Con temporizadores falsos |
| `src/components/**` | Marcado y clases | Con RTL |

Quien llama pasa el contexto: `step(estado, dt, teclas)`, `pickFragment(ctx,
previo, random)`. Un módulo que lee el reloj o `Math.random()` por su cuenta no
se puede probar.

### B2 · Estado compartido = almacén de módulo con `useSyncExternalStore`

Es el patrón de la casa (`useTheme`, `useNetworkStatus`, `useSystemState`). No se
añaden context providers ni librerías de estado.

**Suscribirse importa:** leer el almacén con una función suelta (`getSystemState()`,
`isSystemFailing()`) NO re-renderiza. La barra de estado se quedó con
`[TODO_BIEN]` puesto durante la avería justo por esto.

### B3 · Nada de estado test-only en producción

Si un test necesita un atajo, se llega por la ruta de verdad. Para romper la
señal en un test se llama a `registerThemeToggle()` diez veces, que es lo que
hace el usuario, y no a un `breakTheSignal()` inventado para la ocasión.

### B4 · El backend no se toca para un efecto

Las quince piezas escondidas viven enteras en el frontend. Un marcador de peloteo
no justifica una colección, un endpoint y una migración.

### B5 · Lo que se comparte se pasa, no se copia

Si dos sitios necesitan lo mismo, se calcula una vez y se reparte.

Las clases de la avería cromática se calculan en `page.tsx` y se le pasan a la
capa del juego. Copiarlas habría funcionado el primer día y habría divergido a la
primera animación nueva — y la regla «durante el fallo todo se ve roto» se
habría roto sola, sin que nadie lo notara.

**La regla que se cumple por construcción no hace falta recordarla.**

---

# C · Reglas de navegador

Todas éstas costaron un defecto que **ningún test podía ver**. Es el patrón que
más se repite en este proyecto:

> **Los tests cubren lógica. El navegador cubre composición.**
> Cascada, capas, temas, hidratación y métricas de fuente hay que ir a mirarlos.

### C1 · Nada que viva en el navegador se lee al pintar

`localStorage`, `window`, `Date.now()`, `Math.random()`. En el servidor no
existen o valen otra cosa, así que el servidor pinta A y el cliente B, y React
tira el árbol entero y lo regenera.

Se leen **en un efecto** después de montar, o con `useSyncExternalStore` dando un
snapshot de servidor distinto (ver `useToday`).

Van tres en este proyecto: el rótulo de la cabecera, las ventanas fantasma y los
marcadores del panel de diagnóstico.

### C2 · `useSyncExternalStore` devuelve el snapshot del SERVIDOR en el primer render

Un inicializador perezoso que lea el almacén (`useState(() => locked ? leer() : [])`)
lee siempre el valor de servidor. Las ventanas fantasma no se recuperaban nunca
por esto, y el test que lo cubría pasaba.

### C3 · Dos reglas CSS con `animation` no se suman

Con la misma especificidad gana la que va después **entera**, y la otra
desaparece. `.glitch-jolt` y `.chromatic-failure` declaraban las dos `animation`
y el tirón no se reproducía jamás durante la avería.

Se declara la combinación explícita (`.chromatic-failure.glitch-jolt`), y el
orden dentro de la lista importa: la última gana las propiedades repetidas.

### C4 · `filter` crea un bloque contenedor para los `position: fixed` de dentro

Por eso el fallo va sobre `.container-terminal` y **nunca** sobre `<body>` ni
sobre un ancestro del barrido, del grano o del flash. Esos son *hermanos* del
envoltorio, no descendientes.

### C5 · La capa superior del navegador no hereda el filtro

Un `<dialog>` abierto con `showModal()` se pinta fuera del subárbol filtrado: el
panel de diagnóstico salía impecable en mitad de una pantalla rota. Se resuelve
marcando `<html>` con `data-failing` y aplicando el filtro desde ahí.

### C6 · CSS a medida se importa dentro de `layer(components)`

Con Tailwind v4, el CSS sin capa le gana al CSS con capa sin importar la
especificidad.

### C7 · Un `z-index` alto no es «arriba del todo»

El barrido CRT vivía en 9998 y cualquier capa superior lo tapaba, así que
desaparecía justo en el colapso, el bloqueo y el juego. Antes de elegir un
número, mirar los que ya hay:

```
9994–9997   capas de glitch ambiental
9998        vsync-test
10000       colapso
10001       bloqueo
10002       ventanas fantasma durante el bloqueo
10003       glitch durante el bloqueo
10005       barrido CRT  ← es del tubo, va sobre todo
```

### C7b · Comprobar quién recibe el ratón, no si el elemento «puede» recibirlo

La respuesta de un comando enseñaba barra de desplazamiento y no bajaba. El
elemento tenía `overflow-y: auto` y `pointer-events: auto` — todo correcto — pero
el textarea, con el MISMO `z-index: 1` y más abajo en el documento, quedaba
encima y se comía la rueda.

**La comprobación que sirve** es preguntar qué hay en ese punto de la pantalla:

```js
document.elementFromPoint(cx, cy);   // -> TEXTAREA, no la respuesta
```

**La que no sirve** —y la que hice primero— es disparar el evento sobre el
elemento a mano: `el.dispatchEvent(new WheelEvent('wheel'))` salta el impacto del
ratón y confirma el mecanismo en vez del camino. Dio verde con el defecto puesto.

### C8 · Sólo los glifos que la fuente EMBARCA son de fiar

JetBrains Mono no trae los bloques (`█ ▌ ▓ ░ ● ┊`): los pinta una reserva con
otras métricas —14,489 px contra 9,120— y en una rejilla de caracteres una fila
con un glifo ancho de más empuja todo lo que lleva detrás. **El corte bailaba.**

Si hacen falta esos glifos, el elemento lleva **su propia pila de fuentes**
(`ui-monospace, Consolas, DejaVu Sans Mono…`) y se **mide en el navegador**:

```js
const c = document.createElement('canvas').getContext('2d');
c.font = '15px <la pila>';
const ancho = (ch) => c.measureText(ch.repeat(20)).width / 20;
ancho('█') === ancho('M');   // tiene que ser true
```

### C9 · Una rejilla de caracteres se mueve a saltos, y eso es física, no un fallo

A 0,3 celdas por fotograma, redondeando a celda algo sólo se mueve una vez cada
tres. **El tirón no es retraso, es el redondeo.** Para que se vea continuo, lo
que se mueve va aparte, colocado con desplazamiento decimal en CSS (`1ch` es el
avance exacto de un carácter).

### C10 · Las pestañas ocultas frenan los temporizadores

Chrome los limita a ~1000 ms. El primer fotograma al volver traería el hueco
entero, así que el `dt` se topa (`DT_MAX_MS`) y los efectos propios se apagan con
`document.hidden`.

---

# D · Reglas de tests

### D1 · Un test que puede fallar sin que nada esté roto es un test roto

Dos casos ya:

- El modo `bars` del ruido exigía que apareciera `█`, y cada fila elige uno de
  tres glifos: fallaba 1 de cada 200.
- El punto donde la barra de rearranque se traba **se sortea a propósito**, y la
  línea que el test buscaba caía en el margen: fallaba 1 de cada 9.

Si el azar es parte del diseño, se fija en el test (`jest.spyOn(Math, 'random')`)
o se afirma sobre lo que sí es determinista (densidad, subconjunto).

### D2 · Los tests que aciertan por casualidad no prueban nada

Los tests de fechas construían fechas UTC y comprobaban salida UTC: coherentes
entre sí, y equivocados los dos. La app mostraba el día de mañana a partir de las
siete de la tarde.

Cuando lo que se prueba es una conversión, el test tiene que fijar los DOS lados.

### D3 · `jest.resetModules()` da un React nuevo

RTL y los mocks tienen que importarse **dentro del mismo registro aislado**, o el
componente y `render` usan Reacts distintos. Y `process.env.RTL_SKIP_AUTO_CLEANUP
= 'true'` cuando se importa RTL así.

### D4 · El bucle de tecleo se avanza con la variante asíncrona

`jest.advanceTimersByTime` dispara los temporizadores pero no vacía las
microtareas: una cadena de promesas se queda en el primer `await`. Va
`await jest.advanceTimersByTimeAsync(...)` dentro de `await act(async () => …)`.

### D5 · Verificación antes de afirmar

`npm run check` desde la raíz: lint, typecheck, los dos conjuntos de tests y el
build. No se dice «listo» sin haberlo visto en verde, y **lo visual se mira en el
navegador** — ver la regla de arriba de la sección C.

---

# E · Reglas de escritura

### E1 · El comentario explica POR QUÉ, no QUÉ

El código ya dice qué hace. El comentario dice qué se rompió antes, qué
alternativa se descartó y por qué ese número y no otro.

### E2 · Las constantes se calculan, no se escriben a mano

`MAX_FRAGMENT_LENGTH` sale del repertorio; `secretsTotal` sale del largo de la
lista. Un número copiado a mano se desincroniza el día que alguien añade algo.

### E3 · Los nombres de comando y de proceso NO se traducen

`//help`, `autosave`, `vsync-test` son identificadores, igual que `ls` en un
shell. Se traduce lo que el sistema RESPONDE. Hay una lista blanca en los tests
de i18n para las claves que legítimamente coinciden en los dos idiomas.

### E4 · Los errores se guardan como CLAVE, no como texto resuelto

Guardar el texto ya traducido dejaba la pantalla mezclada al cambiar de idioma.

---

# F · Regla de lore

### F1 · Nada se inventa: se apoya en algo que ya es cierto

La cookie es `httpOnly`, así que el sistema de verdad no sabe quién sos. El
backend te loguea como un hash truncado, así que de verdad te conoce por un
número que se inventó. `GET /:id/history` existía desde siempre y nadie lo había
llamado.

Un fragmento que no se apoye en nada del código está mal escrito.

### F2 · El tono es cansado, no siniestro

La máquina está de tu lado: lleva demasiado tiempo encendida y se traba, pero
guarda tus notas y te lo dice. Si un texto nuevo suena a amenaza, está mal.

### F3 · Una regla de construcción no es lo mismo que un huevo de pascua

La app es monocroma. El fallo cromático tiene color **porque es una avería que
provocás vos**, no porque la regla admita excepciones. La regla gobierna cómo se
construye la interfaz; el huevo de pascua es un estado de fallo.
