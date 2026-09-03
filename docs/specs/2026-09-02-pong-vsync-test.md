# vsync-test · el pong escondido

**Fecha:** 2026-09-02
**Estado:** construido y verificado en el navegador
**Pieza:** la 15ª, y la primera que se juega

---

## Por qué esto no es un juego pegado encima

La app ya venía diciendo, cada tanto y sin que nadie preguntara, que está sola:

```
[SIN RELEVO]        [NADIE MÁS CONECTADO]        [TURNO 1/1]
```

Eran frases sueltas. El pong las convierte en una respuesta: **es lo que la
máquina hace cuando nadie la mira.** Un turno sin relevo y una pelota contra la
pared.

Esto es la regla que gobierna todo el lore del proyecto, aplicada una vez más:
nada se inventa: se apoya en algo que ya era cierto. Aquí lo cierto es que la
barra de estado lleva doce piezas quejándose de estar sin compañía.

---

## A · Cómo se descubre

`//ps` existía desde la pieza 6 y era decoración pura: listaba cinco procesos y
ya. Ahora lista seis.

```
PID  PROCESO            INTERVALO
  1  autosave              2500ms
  2  network-poll         60000ms
  3  scanline              9000ms
  4  meter-batch            250ms
  5  glitch-ambient      variable
  6  vsync-test              16ms

USE //attach_<PID> PARA ADJUNTARSE A UN PROCESO.
```

**16 ms son 60 fps.** No hay nada más en la app que dibuje a velocidad de
fotograma — el más rápido de los otros cinco corre cuatro veces por segundo. Un
proceso de vídeo a 60 fps que nadie arrancó, con nombre de mantenimiento
aburrido.

`vsync` no es vocabulario nuevo: las ventanas fantasma del fallo cromático ya
hablan de «SINCRONISMO VERTICAL PERDIDO».

### El reparto entre la pista y el salto

La línea del pie da **el verbo pero no el PID**. Esa división es deliberada:

- Adivinar la palabra `attach` a ciegas sería imposible, y un secreto que nadie
  puede encontrar no es un secreto, es código muerto — es exactamente el error
  que ya se cometió una vez en este proyecto, con el umbral de diez colapsos que
  resultó ser matemáticamente inalcanzable.
- Darte el `6` sería regalarte el hallazgo. Que el sexto proceso es el raro se
  ve solo si mirás la tabla.

La pista se entrega, la observación es tuya.

### `//ps` conserva su trabajo

`//ps` lista procesos y nada más. No se convierte en el lanzador del juego: para
eso está `//attach_<PID>`, que es un comando aparte. Un comando que hace dos
cosas distintas según lo que liste es un comando peor.

---

## B · Cómo se activa

### `//attach_6`, en un solo token

Sin argumento separado por espacio. `//attach_6`, no `//attach 6`.

Es una convención de terminal —donde el guion bajo hace de espacio y los espacios
de verdad separan argumentos— y además elimina una fragilidad: siendo un token
único no hay argumento que parsear, así que no puede confundirse con un comando
seguido de sus argumentos ni romperse por un espacio de más al teclearlo.

Como el buscador de comandos compara el primer token con el nombre exacto, esto
pide una entrada que empareje por patrón (`/^attach_(\d+)$/`) en vez de por
nombre literal, y una marca `hidden` para que `//help` no la liste.

El resto de PIDs contesta, y ahí está la otra mitad del chiste:

```
//attach_1
> PROCESO EN USO. NO TOQUE EL AUTO-GUARDADO.

//attach_6
> ...
> ¿HACE CUÁNTO QUE ESTÁ MIRANDO?
```

`//attach_*` **no aparece en `//help`**. Es lo que hace que `//ps` sea la única
puerta y que la tabla de procesos valga la pena leerla.

---

## C · Los dos modos

### Solo · contra la pared

**La pared está a la izquierda y tu paleta a la derecha.** No es arbitrario: las
flechas viven en el lado derecho del teclado, así que la paleta que gobiernan
tiene que estar en el lado derecho de la pantalla. En dos jugadores eso deja W/S
—lado izquierdo del teclado— gobernando la paleta izquierda, que es como se
sientan dos personas frente a un mismo teclado.

No hay puntos, hay **peloteo**: cuántas veces la devolviste antes de que se te
fuera. Rebotar en la pared no cuenta — el peloteo mide lo que devolviste vos.

**La velocidad sube con el TIEMPO, no con los golpes.** Arranca a ~18 columnas
por segundo y gana un 6 % cada 12 segundos.

**Sin tope.** A los dos minutos va a 1,79 veces la velocidad inicial y pasa el
doble antes de los dos minutos y medio; a los diez es ingobernable. Siempre,
siempre perdés. Un juego que se puede sostener para siempre no tiene marcador que
signifique nada: el récord mediría paciencia, no habilidad.

### Dos jugadores

↑/↓ contra W/S, a 11, en el mismo teclado. Es el pong histórico: siempre fueron
dos personas en una máquina.

Las flechas son del jugador uno en los dos modos — **el segundo jugador es el que
se adapta, no vos.**

No guarda marcador: es un partido, no un récord.

---

## D · Los dos marcadores

Si te adjuntás mientras la señal está rota (§14, fallo cromático), el juego se ve
roto. Y aquí está la decisión que más me gusta de esta pieza:

> **El juego no se hace más difícil. Se rompe la pantalla.**

La aberración cromática desplaza la imagen y el tirón la sacude, así que ves la
pelota doble y corrida. **La física es idéntica, byte por byte.** No hay una
variante «difícil» del juego: hay un display averiado.

Por eso merece su propio marcador. No estás jugando otro juego — estás jugando el
mismo a ciegas, y eso es un logro distinto.

```
VSYNC-TEST · LIMPIO        peloteo 47        01:32
VSYNC-TEST · DEGRADADO     peloteo 12        00:24

RÉCORD DEL SISTEMA        peloteo 118.394
```

El récord del sistema ya está puesto cuando llegás, y es absurdo. Lleva jugando
desde antes que vos y no tenía nada más que hacer. Ese es el chiste y también la
parte triste.

### Dónde viven

En `localStorage`, con el mismo patrón que el tema, el bloqueo y las ventanas
fantasma. Atados a este navegador, sobreviven a recargar.

**No van a Mongo.** De cara al usuario se comportan igual que las notas —siguen
ahí cuando volvés— y guardarlos en la base pedía una colección, un endpoint y una
migración para un contador de peloteo. El backend no se toca en esta pieza, como
no se tocó en las catorce anteriores.

### Dónde se ven

En el panel de diagnóstico (`//diag` o Alt+clic en `[SYSTEM_OK]`), como dos filas
más junto a la temperatura y el tiempo activo. No hace falta pantalla nueva, y le
da al panel una razón para volver a abrirlo.

---

## E · La regla que esta pieza rompe

Las tres reglas del proyecto dicen que **nada bloquea la escritura**. Esta la
rompe: mientras jugás, el teclado es del juego.

Lo que la justifica es el consentimiento. Todo el resto de los efectos *te pasan*
— el glitch, los fragmentos, las ventanas fantasma, el colapso. Este **lo
pediste**: tecleaste `//attach_6`. La regla existe para que la app no te
interrumpa sin permiso, y aquí el permiso es el gesto de entrada.

Lo que NO se rompe:

- **Escape sale** y devuelve el teclado, como en todas las demás capas.
- **La nota sigue auto-guardándose debajo**, igual que durante el colapso. No se
  pierde nada.
- **El comando no llega a la base de datos**: lo cubre la supresión de
  auto-guardado que ya existe para todos los comandos.

---

## F · Cómo se dibuja: ASCII, no canvas

Un `<pre>` monoespaciado de 72×24 caracteres.

La razón principal no es estética, es técnica: **como es texto en el DOM, hereda
gratis el tema y todos los filtros de glitch.** Un canvas habría que tratarlo
aparte, y la regla dicha explícitamente en la sesión anterior fue que todo lo que
aparezca durante el fallo debe verse afectado *sin excepción*. Con un `<pre>` eso
sale solo.

De regalo, se prueba mirándolo: `render()` devuelve un array de líneas y un test
puede afirmar el fotograma exacto, carácter por carácter.

La física va en decimales por dentro y se redondea a celda al pintar. Si la
posición viviera en enteros, la pelota se movería a saltos de carácter.

---

## G · El reparto en archivos

El mismo de las catorce anteriores:

| Archivo | Qué hace | Cómo se prueba |
| ------- | -------- | -------------- |
| `src/lib/system/pong.ts` | Puro. `step(estado, dt, teclas)` y `render(estado)` | Entero, sin montar nada |
| `src/hooks/usePong.ts` | El bucle de `requestAnimationFrame` y el teclado | Con temporizadores falsos |
| `src/components/effects/PongOverlay.tsx` | El `<pre>`, el marcador, Escape | Con RTL |

### El test que de verdad importa

**Que la pelota no atraviese la paleta yendo rápido.**

A 60 fps y con la velocidad subiendo sin tope, llega un momento en que un solo
paso mueve la pelota más de lo que mide la paleta de ancho. Si la colisión se
comprueba sólo en la posición final, la pelota aparece del otro lado y el punto
se pierde sin que nadie lo tocara.

Es el defecto clásico de todo Pong y es **invisible hasta que alguien llega a un
peloteo largo** — o sea, exactamente al jugador al que le importa el marcador.

---

## H · Interacción con lo que ya existe

| Ya está | Qué le aporta |
| ------- | ------------- |
| `//ps` | Deja de ser adorno: es la única puerta |
| Supresión de auto-guardado en comandos | `//attach_6` no llega a la base |
| Filtros del fallo cromático | Entrar con la señal rota se ve roto |
| `usePrefersReducedMotion` | Se quitan los adornos; el juego corre igual |
| `SECRET_IDS` | De 14 a 15; el total se recalcula solo |
| Panel de diagnóstico | Gana dos filas y una razón para reabrirlo |

Sobre `prefers-reduced-motion`: un juego ES movimiento, así que no puede
desactivarse sin negarse a existir. Lo que se quita son los adornos —el temblor
al perder, el destello del marcador—; la pelota se mueve porque es el juego que
pediste al teclear el comando.

---

# I · Lo que cambió al construirlo

Cuatro cosas se decidieron mirándolo correr, no diseñándolo.

## 1 · Los glifos bailaban

El corte se desplazaba de una fila a otra. JetBrains Mono no trae los bloques y
los pintaba una reserva de 14,489 px contra los 9,120 de la base; una fila con un
glifo ancho de más empuja todo lo que lleva detrás.

Primero pasé todo a ASCII (`O | # :`), que era portátil pero feo. La respuesta
buena resultó ser **una pila de fuentes propia para el corte**: en
`ui-monospace`, `Consolas` o `DejaVu Sans Mono` los bloques miden exactamente lo
que mide una `M`. Y el ASCII pelado se quedó — como **avería**, cada 7–17 s.

**Ningún test podía verlo: jsdom no mide texto.**

## 2 · El tirón no era retraso, era el redondeo

A 0,3 celdas por fotograma, redondeando a celda la pelota sólo se movía una vez
cada tres. Partir el dibujo en campo fijo + piezas con posición decimal lo
resolvió — y dejó el redondeo disponible como **el aspecto del vídeo averiado**.
La limitación pasó a ser el síntoma.

## 3 · El barrido estaba tapado

`.scanline-effect` vivía en `z-index: 9998` y toda capa superior lo ocultaba:
desaparecía en el colapso, en el bloqueo y en el juego. Es el refresco del tubo,
o sea una propiedad de la pantalla. Ahora va en 10005.

**No se duplicó**: el primer intento fue darle al juego un barrido propio, que es
exactamente la clase de copia que se desincroniza.

## 4 · La avería no puede tener excepciones

La capa del juego es HERMANA del envoltorio filtrado, no descendiente, así que no
heredaba nada. En vez de copiarle las animaciones —que habrían divergido a la
primera que se añadiera— **`page.tsx` calcula la lista de clases una vez y se la
pasa**. Así la regla se cumple por construcción y no por disciplina.

Se aprovechó para invertir el rótulo: con la señal rota, `[TODO_BIEN]` pasa a
`[TODO_MAL]` (`[SYSTEM_FAIL]`). Es la única pieza del lore que se contradice a sí
misma, y por eso funciona: doce piezas insistiendo en que todo va bien hacen que
este rótulo, la primera vez, se lea como una confesión.

## Y un defecto de hidratación, otra vez

El panel de diagnóstico leía `localStorage` **durante el render**: el servidor
pintaba «SIN JUGAR» y el cliente el marcador, y React tiraba el árbol entero en
cada carga. Es el tercero de la misma familia en este proyecto.

**La regla, ya sin excusa: nada que viva en el navegador se lee al pintar.**
