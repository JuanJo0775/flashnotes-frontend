# Secretos del sistema — diseño

> **Estado: construido.** Este documento describe comportamiento, no código.
> **Las tres decisiones abiertas están cerradas** (ver más abajo).
>
> Fecha: 2026-09-01 · Revisión 2 · Alcance: `flashnotes-frontend` únicamente
>
> | Pieza | Estado |
> | ----- | ------ |
> | §1 glitch ambiental (+ negativo, + fatiga por turno) | **listo** |
> | §2 fragmentos del sistema | **listo** |
> | §3 arranques raros | **listo** |
> | §4 arranque en vídeo inverso | **listo** |
> | §5 el botón secreto | **listo** |
> | §6 comandos en el prompt | **listo** |
> | §7 panel de diagnóstico · con `//history` | **listo** |
> | §8 registro de peticiones | **listo** |
> | §9 archivo fantasma (opción A) | **listo** |
> | §10 la papelera lleva la cuenta | **listo** |
> | §11 la reconexión | **listo** |
> | §12 la línea de barrido se traba | **listo** |
> | §13 colapso del sistema | **listo** |
> | §14 fallo cromático · con ventanas fantasma | **listo** |
>
> **Las catorce piezas están construidas.** Queda pendiente una coordinación con
> el trabajo de internacionalización: ver «Los fragmentos y el idioma», más abajo.
>
> El almacén (`useSystemState`) y los módulos puros (`commands`, `lore`,
> `requestLog`, `diagnostics`) están completos y son la base del resto.

Un conjunto de rarezas escondidas en FlashNotes, en el mismo lenguaje de sistema
operativo de terminal que ya tiene la app: la interfaz se comporta como una
máquina vieja que a veces falla, guarda diagnósticos y esconde comandos.

La revisión 2 cambia tres cosas de fondo respecto de la primera: hay **un lore**
que da sentido a los fallos, las piezas ambientales dejan de contarse como
secretos, y cinco defectos técnicos de la revisión 1 están corregidos (§C).

---

## El lore

Esto es lo primero del documento porque es lo que ordena todo lo demás. Sin
esto, un glitch es ruido; con esto, un glitch es puntuación.

### La idea, en una frase

**FlashNotes es un turno.** El sistema viene funcionando desde antes que vos,
lleva registro de todo el mundo que pasó, vive en un huso horario del que nunca
se mudó, y no puede distinguirte de nadie: sólo sabe que hay alguien escribiendo.

### Por qué esta y no otra

No es una historia inventada encima de la app: **es lo que la app ya es**, dicho
en voz alta. Cada pieza del lore se apoya en algo verdadero del código:

| Verdad del código | Lo que dice el lore |
| ----------------- | ------------------- |
| La cookie es `httpOnly` (`session.js:24`): ni el propio frontend puede leerla | El sistema no sabe quién sos |
| El backend te loguea como un SHA-256 truncado (`requestLogger.js:16`) | Te conoce por un número que se inventó |
| Todos los formateadores usan `getUTC*` (`formatters.ts`) | El sistema nunca se mudó de huso |
| `GET /:id/history` está implementado y el frontend nunca lo llamó | Viene guardando actas que nadie lee |
| La cookie dura diez años | Va a seguir acá cuando vos no |
| No hay cuentas, no hay usuarios | No hay nadie más en el turno |

### El tono: cansado, no siniestro

Esta es la regla que salva al lore de dar mal rollo. La máquina **está de tu
lado**. Está sola, lleva demasiado tiempo encendida y se traba, pero guarda tus
notas y te lo dice. El §13 ya tiene ese latido —te rompe la pantalla durante
cuatro segundos y lo primero que hace al volver es contarte que tus notas están
enteras— y todo lo demás se afina contra esa nota.

Nada de esto se explica nunca. No hay pantalla de historia, no hay coleccionable
que la revele, no hay un archivo de texto que la cuente entera. **Sólo hay
fragmentos**, y ninguno pesa más de una línea.

### El glitch como puntuación

Un fallo suelto es ruido. Un fallo que ocurre **justo cuando el sistema dice
algo** es una frase.

Por eso el glitch ambiental (§1) y los fragmentos del sistema (§2) no son dos
piezas independientes: **una de cada cinco veces, ocurren juntos**. El glitch te
hace levantar la vista y lo que leés cuando la levantás es el fragmento. Ese
acoplamiento es lo que separa "efecto pegado encima" de "la máquina dijo algo".

### El repertorio

Los fragmentos viven en `lib/system/lore.ts` como un módulo de funciones puras
—texto y condiciones, sin DOM—, así que se prueban enteros sin montar nada.

Cada fragmento lleva una condición. Los que no la tienen pueden salir siempre.

| Fragmento | Cuándo puede salir |
| --------- | ------------------ |
| `[SYSTEM_OK?]` | siempre |
| `[SYSTEM_0K]` | siempre |
| `[SIGO ACÁ]` | siempre |
| `[TURNO 1/1]` | siempre |
| `[SIN RELEVO]` | siempre |
| `[MEMORIA TIBIA]` | siempre |
| `[SYSTEM_TIRED]` | 02:00–05:00 |
| `[NADIE MÁS CONECTADO]` | 02:00–05:00 |
| `[TURNO LARGO]` | sesión > 45 min |
| `[SEGUÍS AHÍ]` | sesión > 45 min, sin tecleo hace > 5 min |

`[SYSTEM_0K]` lleva un **cero** en lugar de la O. En JetBrains Mono el cero va
con punto interior, así que se distingue si mirás y no se nota si no. Es el
fragmento favorito del conjunto: no es un efecto, es una errata, y una errata es
mucho más inquietante que un temblor.

**Ninguno lleva color.** El ámbar y el rojo siguen reservados a lo que de verdad
requiere atención, tal como manda `DISENO.md`. Un fragmento es texto raro en el
mismo blanco de siempre.

---

## Decisiones cerradas

| Decisión | Elegido | Por qué |
| -------- | ------- | ------- |
| Alcance | Las trece piezas de §1–§13 | — |
| Interruptor de apagado | Sí, en el panel, y recordado | — |
| `prefers-reduced-motion` | Desactiva **siempre** todo lo que se mueve | — |
| **§9 archivo fantasma: ¿base de datos?** | **A — sólo cliente** | Ver abajo |
| **Cómo se abre el panel** | **`//diag` + Alt/⌥+clic** | Ver abajo |
| **¿Se ve el contador `N/M`?** | **Sí, siempre** | Ver abajo |

### §9 · Sólo cliente, y no como paso intermedio

La revisión 1 presentaba la opción sin base de datos como "menos convincente
porque no sobrevive a una recarga". Es al revés.

El contenido de `SYSTEM.LOG` es tiempo de sesión, notas en memoria y última
escritura — y con §8 pasa a ser el búfer real de peticiones. Todo eso **nace y
muere con la pestaña**. Una nota que dice `[00:12] sesión iniciada` y sigue ahí
tres días después no es más creíble: es incoherente, y encima de una forma
detectable. Un log de sesión que sobrevive a la sesión es una mentira.

Aparte, la opción con base de datos pedía un campo discriminador obligatorio en
el modelo, el DTO, el contrato, `docs/API.md`, los tests de forma de respuesta y
decisiones sobre paginación y contadores — con el riesgo, admitido en la propia
revisión 1, de que una nota de sistema mal marcada pase por tuya. Es demasiada
superficie de dos repositorios para un chiste que queda peor.

**Este trabajo no toca el backend en ninguna de sus piezas.**

### Panel · `//diag` como vía canónica, Alt+clic como atajo

`//diag` primero, porque sale listado en `//help` —o sea que es *encontrable* en
lugar de adivinable—, funciona con teclado y es una función pura que se prueba
sin navegador.

El gesto secundario es **Alt+clic (⌥+clic)**, no Ctrl+clic: en macOS Ctrl+clic
**es** el clic secundario y abre el menú contextual, y en cualquier sistema
Ctrl+clic ya tiene significado de navegador. Alt no colisiona con nada.

Ojo con el objetivo: la barra de estado es `<footer role="status"
aria-live="polite">`. `[SYSTEM_OK]` se queda como **texto plano** —sin
`role="button"`, sin `tabindex`— y el manejador va en el contenedor. Meter un
objetivo interactivo dentro de una región viva es incómodo para lectores de
pantalla, y el panel ya tiene su vía accesible por comando.

### Contador · Se muestra siempre, y la objeción se disuelve sola

La objeción a mostrarlo era que invita a buscar y convierte esto en un juego.
Pero fijate dónde vive: **dentro del panel, que es él mismo un secreto**. No hay
ningún camino por el que alguien vea `0/M`; para leer esa fila ya tuviste que
ejecutar `//diag` o dar con el Alt+clic. El contador no puede aparecer antes de
tiempo, así que la objeción no tiene dónde aplicarse.

Entonces: se muestra siempre, el panel se cuenta a sí mismo como hallazgo —lo
primero que leés es `SECRETOS 1/M`, que es la invitación correcta en el momento
correcto— y **nunca se listan los nombres de los que faltan**. Sólo el número.

### Qué cuenta como secreto

Sólo **lo que provocaste vos**. Lo ambiental te pasa, no lo encontrás: el glitch,
los fragmentos, el barrido trabado y el arranque en vídeo inverso son atmósfera y
**no suman al contador**. Contarlos inflaría el denominador con cosas que nadie
puede buscar.

Los catorce contables: `//help` · panel · botón secreto · colapso · `//history` ·
`//log` · `//sudo` · `//whoami` · `//date` · el trío `//ps`/`//df`/`//ls` · archivo
fantasma · quinto borrado permanente · `//chaos` · fallo cromático.

La lista viva es `SECRET_IDS` en `useSystemState.ts`; esta enumeración es su
reflejo en prosa y puede quedar atrasada. El que manda es el registro.

`M` sale de la longitud del registro, **nunca de un número escrito a mano**. Va a
cambiar.

---

## Reglas que ninguna pieza puede romper

Mandan sobre cualquier efecto. Si un secreto choca con una, se recorta el secreto.

1. **Nada puede perder trabajo.** Ningún efecto interrumpe el auto-guardado ni
   desmonta el editor. El colapso (§13) es una capa **encima**; debajo la app
   sigue viva y guardando.
2. **Nada bloquea la escritura.** Se puede seguir tecleando durante cualquier
   efecto, el foco nunca se mueve, y lo que se teclea llega.
3. **Nada simula pérdida de datos.** La regla 1 cubre también *aparentar*. Nada
   de contadores que bajan y se corrigen, ni de notas que parpadean fuera de la
   lista. Un usuario que ve `FILES: 12` volverse `FILES: 11` no piensa "qué buen
   efecto".
4. **`prefers-reduced-motion` gana siempre.** Con él activo no hay temblores, ni
   estática, ni negativo. Los comandos, el panel y los fragmentos de texto siguen
   funcionando: son contenido, no movimiento.
5. **Monocromo al construir.** Sólo los tokens del sistema. Nada de neón ni de
   separación de canales de color en la interfaz.

   Esta regla gobierna **cómo se construye la interfaz**, y por eso el fallo
   cromático (§14) no la contradice: eso no es interfaz, es una avería que el
   usuario provocó a propósito, y una señal rota se ve en color porque así se
   ve una señal rota. La diferencia no es una excepción negociada: es que una
   regla de construcción y un huevo de pascua son cosas distintas.
6. **Ningún efecto se anuncia a un lector de pantalla.** Ver §B.
7. **Ningún efecto mueve la maqueta.** Ver §B.
8. **El colapso no se dispara sin querer.** Hacen falta clics deliberados y el
   contador se reinicia solo (§5).
9. **El backend no se toca.** Ni un archivo, ni un test, ni `API.md`.

---

## El estado compartido

Las piezas cuelgan de un mismo concepto: la **integridad del sistema**, un número
de 0 a 100. A 100 la app se comporta con normalidad; cuanto más baja, más
inestable se ve; a 0 colapsa.

Vive en un almacén de módulo con `useSyncExternalStore`, igual que
`useNetworkStatus` y `useTheme` — el patrón ya establecido en el proyecto.

```
integridad        0–100, en memoria; vuelve a 100 al recargar
efectosActivos    boolean, recordado en localStorage
secretosHallados  conjunto de identificadores, recordado
inicioSesion      instante de apertura de la pestaña, en memoria
```

---

## La hora: del dispositivo

**Todo lo que dependa de la hora usa la hora local del dispositivo**, vía
`new Date().getHours()` y compañía. Es lo que el usuario ve en su reloj, así que
es lo único que hace que "de madrugada la app está distinta" signifique algo.

**`formatters.ts` no se toca.** Sigue en UTC. Cambiarlo alteraría todas las
fechas visibles de la app, tiene tests que lo fijan y no tiene nada que ver con
los secretos.

Y ahí está la gracia: **el desfase entre las dos es lore verdadero**, y es lo que
responde `//date` (§6). Si el dispositivo está justo en UTC el chiste cambia de
forma y queda mejor:

```
>date
LOCAL     21:14 (UTC-03)
SISTEMA   00:14 UTC
EL SISTEMA NUNCA SE MUDÓ.
```

```
>date          ← con desfase cero
LOCAL     00:14 (UTC+00)
SISTEMA   00:14 UTC
SIN DESFASE. ESTÁS EN LA HORA DEL SISTEMA.
```

---

# Las piezas

## 1 · Glitch ambiental

**Cuándo.** Solo, y únicamente si los efectos están activos, no hay
`prefers-reduced-motion` y la pestaña está visible. Con la pestaña oculta no se
programa nada.

**El intervalo se acorta con el turno.** No es aleatorio a secas: la máquina se
cansa mientras la usás.

| Sesión abierta | Intervalo entre glitches |
| -------------- | ------------------------ |
| < 10 min | 240 s ± 60 |
| 10–45 min | 180 s ± 45 |
| 45–90 min | 120 s ± 30 |
| > 90 min | 90 s ± 20 |

Es lore expresado como número, y es honesto: la app de verdad lleva la cuenta de
tu sesión, y de verdad la usa para esto.

**Qué se ve.** La pantalla da un tirón seco de 180 ms y unas franjas horizontales
la recorren.

**Animación — `glitch-jolt`, 180 ms, `steps(1, end)` en cada tramo.**
Sin suavizado: el movimiento salta, no se desliza. Es lo que separa un fallo de
señal de una transición de interfaz.

```
 0%   translate3d( 0px,  0px, 0)
15%   translate3d(-3px,  1px, 0)
30%   translate3d( 2px, -1px, 0)
45%   translate3d(-1px,  0px, 0)
60%   translate3d( 2px,  1px, 0)
100%  translate3d( 0px,  0px, 0)
```

**Capa de franjas — `band-roll`, 180 ms, `steps(6)`.** Una capa fija por encima
de todo, sin eventos de puntero, con un degradado repetido de 8 px (6 px
transparentes, 2 px de tinta al 8 %) que se desplaza 24 px hacia arriba. Anima
sólo `transform`, así que va en el compositor.

La amplitud (`3px`) es la del glitch en reposo. Sube con la integridad baja (§5).

### El negativo, absorbido

La revisión 1 lo tenía como pieza aparte (§9). No lo es: nadie lo *encuentra*,
pasa solo. Es un modificador de esta pieza y acá vive.

**Una de cada cuatro veces**, el glitch va acompañado de un negativo de 200 ms en
dos parpadeos (`steps`), nunca en fundido. Como el tema ya es monocromo, invertir
da exactamente el negativo del otro tema: el efecto sale gratis de los tokens.

**Se hace con `backdrop-filter: invert(1)` sobre una capa fija propia, no con
`filter` sobre un contenedor.** El motivo está en §C.4 y es serio.

### El acoplamiento con §2

**Una de cada cinco veces**, el glitch dispara además un fragmento del sistema en
la barra de estado, con 120 ms de retraso — lo justo para que el ojo llegue.
Es el mecanismo central del lore y está descrito arriba.

---

## 2 · Fragmentos del sistema

Absorbe la "degradación horaria" de la revisión 1, que estaba mal enfocada: el
90 % de lo que hacía era imperceptible (nadie compara la velocidad del barrido a
las 3 a. m. contra la de las 3 p. m., ni nota un cursor a 1,4 s en vez de a
1,05 s). Lo único observable era el cambio de rótulo, así que la pieza pasa a ser
**el cambio de rótulo, hecho bien y con repertorio**.

**Qué es.** Cada tanto, `[SYSTEM_OK]` no dice `[SYSTEM_OK]`. Dice otra cosa
durante **2,5 s** y vuelve.

**Cuándo.** Cada 3–7 minutos, y además acoplado al glitch (§1). Nunca dos veces
el mismo fragmento seguido.

**Cuándo NO.** Si hay algo real que informar —sin red, servidor caído, error,
cargando, guardando— **el estado real gana siempre y sin excepción**. Un
fragmento no puede pisar información. La barra de estado es lo que le dice al
usuario si su trabajo está a salvo; eso no se toca ni en broma.

**Sin animación.** El fragmento aparece y desaparece de golpe, como todo cambio
de estado en esta app. No hay fundido, no hay tecleo, no hay parpadeo. Es un
cambio de texto y nada más — y esa sequedad es justamente lo que lo hace sentir
un fallo y no un adorno.

El repertorio y sus condiciones están arriba, en **El lore**.

**Dos trampas resueltas en §B:** el ancho del hueco y el anuncio a lectores de
pantalla. Las dos son obligatorias, no opcionales.

---

## 3 · Arranques raros

**Cuándo.** Al abrir una nota vacía, con 1 probabilidad entre 30, la secuencia de
arranque teclea otra frase en lugar de la de siempre.

**Qué se ve.** Exactamente la misma animación de `BootPrompt` —despertar,
tecleo, pausa, borrado, reposo— con otro texto. Nunca se repite la misma frase
dos veces seguidas.

Repertorio base:

```
MEMORIA VERIFICADA. CONTINÚE.
¿SEGUIMOS AQUÍ?
NO HAY NADIE MÁS EN ESTE TURNO.
ÚLTIMA SESIÓN: NO REGISTRADA.
ESCRIBA. YO GUARDO.
```

**De madrugada (02:00–05:00, hora del dispositivo)** el repertorio se reemplaza
por otro. Esto es lo que queda de la "degradación horaria", y es lo que la hace
por fin perceptible: la gente sí lee la línea de arranque.

```
TURNO NOCHE. NO HAY RELEVO.
A ESTA HORA SÓLO ESCRIBE USTED.
EL SISTEMA TAMBIÉN ESTÁ CANSADO.
```

**Si abrís una nota nueva a menos de 60 s de haber mandado otra a la papelera**,
la frase es fija y gana a las demás:

```
¿OTRA VEZ DESDE CERO?
```

Es el único secreto que reacciona a lo que acabás de hacer, y por eso es el que
más se siente como que la máquina te está mirando. Sólo usa estado de sesión.

---

## 4 · Arranque en vídeo inverso

**La pieza que se lleva la audacia.** Todo lo demás de este documento es discreto
a propósito para que esta destaque; si tuviera compañía dejaría de funcionar.

**Cuándo.** Al cargar la página, 1 de cada 12 veces. Es lo primero que ves y dura
menos de un segundo.

**Qué se ve.** El rótulo `[FLASH-NOTES v1.0]` de la cabecera arranca mal y se
corrige solo.

La cabecera **ya es tinta con texto inverso** (`terminal.css:16-17`), así que el
vídeo inverso es al revés de lo que uno supone: un **bloque de papel con letra de
tinta**, recortado al rótulo. Sobre una barra ya oscura, eso es un rectángulo
claro, y es exactamente el atributo *reverse* de una terminal de verdad. Sale de
dos tokens que ya existen (`--color-inverse` de fondo, `--color-ink` de letra);
no hace falta ningún color nuevo.

**Animación — `reverse-boot`, 620 ms, `steps(1, end)` en cada tramo.**
Tres fotogramas duros. Sin fundidos, sin transición: la corrección tiene que
leerse como que la máquina se dio cuenta, no como que la interfaz se animó.

```
0 ms     ]0.1v SETON-HSALF[     vídeo inverso, texto invertido
380 ms   [FLASH-NOTES v1.0]     vídeo inverso, texto correcto
560 ms   [FLASH-NOTES v1.0]     normal
```

El texto invertido carácter a carácter en VT323 monoespaciada es legible como
*algo que está mal* sin ser un jeroglífico: mantenés la silueta y los corchetes
saltan de lado. El segundo fotograma es el que hace que el efecto se lea: primero
se arregla el orden, después el vídeo. Corregir las dos cosas a la vez daría un
solo parpadeo y se perdería.

**Estas cargas no vienen solas.** Cuando el arranque sale invertido, la frase de
§3 se fuerza a una del repertorio del turno. Dos rarezas que ocurren juntas se
leen como una decisión; sueltas, como ruido.

**Con `prefers-reduced-motion`, no ocurre.** No se degrada a una versión quieta:
un rótulo mal escrito sin corrección visible sería sencillamente un error.

**Accesibilidad.** El texto invertido va en un nodo `aria-hidden`, con el rótulo
real en `.sr-only` al lado. El nombre de la app no se corrompe en el árbol de
accesibilidad ni por 620 ms.

---

## 5 · El botón secreto

**Dónde.** El rótulo `[FLASH-NOTES v1.0]` de la cabecera. No parece un botón y no
debe parecerlo.

| Clic | Integridad | Qué pasa |
| ---- | ---------- | -------- |
| 1–2 | 100 | Nada |
| **3** | 100 | **`v1.0` parpadea a `v1.0.1` un fotograma y vuelve** |
| 4 | 100 | Nada |
| 5 | 80 | `[SYSTEM_OK]` pasa a `[INTEGRIDAD 80%]` + un glitch de 3 px |
| 6 | 60 | Glitch de 5 px, 200 ms |
| 7 | 40 | Glitch de 7 px, 230 ms; la línea de barrido se acelera |
| 8 | 20 | Glitch de 10 px, 260 ms; el texto de la barra empieza a temblar |
| 9 | 0 | **Colapso** (§13) |

**El clic 3 es nuevo y no es decorativo.** En la revisión 1 los clics 1 a 4 no
hacían absolutamente nada, así que un curioso que tocaba el logo dos veces y
paraba no se llevaba ninguna señal: la tasa de descubrimiento real, salvo leyendo
el código, era cero. Un carácter que parpadea es la diferencia entre un secreto y
un secreto que existe.

**El reinicio del contador es obligatorio.** Si pasan 4 s sin un clic nuevo, el
contador vuelve a cero y la integridad sube a 100 con un glitch suave. Sin esto,
dos clics accidentales separados por días acabarían rompiendo el sistema a
alguien que sólo quería escribir.

**El rótulo necesita `user-select: none`.** Nueve clics rápidos sobre un `<span>`
seleccionan el texto y dejan la cabecera resaltada a mitad del efecto.

La integridad no se recuerda entre sesiones: recargar siempre devuelve un sistema
sano.

---

## 6 · Comandos en el prompt

> **El prefijo cambió de `>` a `//` al construirlo.** El editor ya dibuja un `>`
> al principio de cada línea, así que teclear `>help` se veía en pantalla como
> `> >help`: parecía un error de la app antes que un comando. `//` además es
> vocabulario de la casa — la clase `.comment` antepone `// ` en todas las
> etiquetas de sección.

La pieza que mejor encaja con lo que la app ya es: el editor **ya** muestra un
`>` al principio de cada línea. Esto lo convierte en una terminal de verdad.

### La condición de activación

**No es "en una nota vacía".** En el instante en que pulsás Enter la nota no está
vacía: contiene `//help`. La regla operativa es:

> El contenido **entero** de la nota es **una única línea** que empieza por `//`.

Si hay una segunda línea, o texto antes del `>`, Enter hace lo de siempre. No se
le roba el Enter a nadie que esté escribiendo.

### El comando no se guarda — y hay que forzarlo

La revisión 1 prometía que "ni el comando ni su respuesta llegan a la base de
datos", pero el auto-guardado corre a los 2,5 s de la última tecla
(`NoteEditor.tsx:28`). Escribís `//help`, tardás tres segundos en pulsar Enter, y
`//help` **ya está guardado y ya consumió un punto de historial**.

**Mientras el contenido cumpla la condición de activación, no se programa el
`setTimeout` del auto-guardado.** Sin esa supresión explícita la promesa es
falsa. Es una prueba obligatoria.

### Comandos

| Comando | Respuesta |
| ------- | --------- |
| `//help` | Lista los comandos disponibles |
| `//whoami` | Ver abajo |
| `//uptime` | Tiempo desde que se abrió la pestaña |
| `//date` | Hora local, hora del sistema y el desfase |
| `//version` | `FLASH-NOTES v1.0 · NÚCLEO ESTABLE` |
| `//history` | El historial real de la nota (§7 lo detalla) |
| `//log` | El registro de peticiones (§8) |
| `//ps` | Los procesos que corren de verdad |
| `//df` | Uso total contra `CONTENT_MAX`, con el medidor ASCII |
| `//ls` | Tus notas, con las guías de puntos de la barra lateral |
| `//sudo` | Ver abajo |
| `//diag` | Abre el panel de diagnóstico (§7) |
| `//chaos on\|off` | Enciende o apaga los efectos ambientales |
| `//panic` | Dispara el colapso (§13) |
| `//clear` | Vacía la nota |

### `//whoami` — la limitación es la respuesta

La revisión 1 pedía "el hash corto de la sesión, el mismo que el backend usa en
sus logs". **Eso es imposible.** La cookie es `httpOnly: true`
(`session.js:24`): el JavaScript del cliente no puede leerla, el hash se calcula
en el servidor (`requestLogger.js:16`) y no hay ninguna ruta que lo devuelva.
Cumplirlo al pie de la letra pedía un endpoint nuevo, o sea el cambio de dos
repositorios que este documento se propone evitar.

La limitación es mejor que la idea original:

```
>whoami
NO SÉ. LA COOKIE ES httpOnly — NI YO PUEDO LEERLA.
SOS ESTE NAVEGADOR. NADA MÁS.
```

Cero backend, y dice exactamente lo que la app es.

### `//sudo`

```
>sudo
NO HAY SUPERUSUARIO. NO HAY USUARIOS.
HAY UN NAVEGADOR.
```

### `//ps` — los procesos son los tuyos

Todo lo listado corre de verdad, con los intervalos reales tomados de las
constantes del código. El chiste es que no hay chiste.

```
PID  PROCESO            INTERVALO
 1   autosave              2500ms
 2   network-poll         60000ms
 3   scanline              9000ms
 4   meter-batch            250ms
 5   glitch-ambient      variable
```

### Animación de la respuesta

Se teclea con el mismo motor que la secuencia de arranque, en color de metadato:
18 ms por carácter, 2 s de pausa, borrado a 8 ms por carácter, y la nota vuelve a
quedar vacía.

**Colisión con §3.** Una nota vacía es exactamente el momento en que `BootPrompt`
está tecleando su texto de ayuda. Escribir lo corta (`setIsBooting(false)` en
`onChange`), así que no explota, pero el arranque y la invitación a teclear
compiten por el mismo hueco. Es una tensión aceptada, no un descuido: se mira
cuando esté montado y se ajusta el `HOLD_MS` si estorba.

### El registro

Módulo de funciones puras (`entrada -> texto de salida`), sin tocar el DOM. Así
se prueba entero sin montar el editor. Es donde se concentra casi toda la lógica
de este documento.

---

## 7 · Panel de diagnóstico

**Cómo se abre.** `//diag`, o Alt+clic (⌥+clic) sobre `[SYSTEM_OK]`. Cerrado
arriba.

**Qué es.** Un `<dialog>` con la misma piel que los diálogos existentes —
`ConfirmDialog` ya tiene el patrón: barra de título en tinta, cuerpo en papel,
sin curvas, trampa de foco y Escape gratis.

**Contenido**, como un listado de lecturas con filete entre filas:

```
SESIÓN            NO LEGIBLE
TIEMPO ACTIVO     00:47:12
NOTAS CREADAS     12
BYTES ESCRITOS    8.4k
INTEGRIDAD        100%
TEMA              CLARO
SECRETOS          3/14
NÚCLEO            41°C  ▮▮▮▮▮▯▯▯▯▯
```

`SESIÓN` dice `NO LEGIBLE` por lo mismo que `//whoami`: la cookie es `httpOnly`.
El panel no inventa un dato que no tiene.

`NÚCLEO` es inventado y se deriva del ritmo de escritura de los últimos minutos.
Es decoración honesta — no pretende medir nada. **Se dibuja con el `ProgressBar`
ASCII que ya existe**, no con un widget nuevo: es el medidor de la casa y esta es
otra cosa que medir.

Al pie, el interruptor `[EFECTOS: ON]` / `[EFECTOS: OFF]`, que persiste.

**Animación de apertura — `signal-lock`, 120 ms, `steps(3)`.** Nada de fundidos:
el panel aparece al 60 % de opacidad, desaparece, y aparece al 100 %, como una
señal que engancha. Acompañado de un `glitch-jolt` de 3 px.

### `//history` — la capacidad que ya está pagada

El backend guarda hasta 20 snapshots por nota con su `editedAt` desde siempre.
`GET /api/notes/:id/history` está implementado (`note.controller.js:277`),
enrutado (`notes.routes.js:76`) y **el frontend nunca lo llamó**: no aparece en
`notes.api.ts`, ni en `note.types.ts`, ni en ningún hook.

`//history` despliega esa pila con la maquetación de guías de puntos que ya usa la
barra lateral:

```
> v20  14:52:11 ·········· 1.4kb
> v19  14:49:03 ·········· 1.2kb
> v18  14:41:55 ·········· 940b
```

Cero trabajo de backend, cero riesgo, y es el único secreto del documento que le
da al usuario algo que de verdad no tenía. Encaja con el lore sin forzarlo: son
las actas que la máquina viene levantando y nadie leyó nunca.

---

## 8 · El registro de peticiones

El backend loguea cada llamada como `[REQUEST] PATCH /notes/:id { sessionHash }`.
El cliente no guardaba nada equivalente.

**Qué es.** Un búfer circular en memoria con las últimas ~40 llamadas que hizo el
frontend, pintado con el formato del log del servidor. Se lee con `//log` o desde
el panel.

```
14:52:03  PATCH  /notes/6f2a…/undo      200    84ms
14:51:58  PATCH  /notes/6f2a…           200   112ms
14:51:31  GET    /health                200    19ms
```

Un solo interceptor en `lib/api/client.ts`, cero backend, y se prueba entero sin
montar nada. **No guarda cuerpos de petición ni de respuesta**: método, ruta,
código y duración. Lo que escribís no se lee, tampoco acá.

Es la pieza que más se parece a un sistema operativo de verdad, porque **no es
decoración: es cierto**. Y es lo que le da contenido real a §9.

---

## 9 · El archivo fantasma

**Opción A: sólo cliente.** Cerrado arriba.

**Cuándo.** Cuando la sesión lleva ≥ 10 minutos abierta y tiene ≥ 3 notas,
aparece en la papelera una nota que nadie creó: `SYSTEM.LOG`.

**Contenido: el búfer de §8.** La revisión 1 lo llenaba de texto inventado que
imitaba tu actividad. Ahora **es** tu actividad, volcada del registro real. Un
archivo fantasma que te muestra algo verificable es incomparablemente más
incómodo que uno que lo simula.

**Cómo vuelve si lo borrás: por visita, no por reloj.** La revisión 1 decía "entre
5 y 15 minutos después", y eso no se cobra nunca: entrás a la papelera, borrás,
salís, y no volvés en toda la sesión. Ahora **vuelve la próxima vez que entrás a
la papelera**, si pasaron más de 5 minutos desde que lo borraste. Mismo efecto, y
esta vez lo ves.

**Se distingue siempre.** En la papelera lleva una etiqueta `[SISTEMA]` en lugar
de `[ELIMINADA]`. No debe poder confundirse con una nota tuya: es un chiste, no
una trampa.

`useTrash` lo inyecta en la lista que devuelve. El botón de borrado permanente no
llama a la API: simula el borrado. Recargar lo hace desaparecer hasta que se
vuelvan a cumplir las condiciones — que es exactamente lo que corresponde a un
log de sesión.

---

## 10 · La papelera lleva la cuenta

El borrado definitivo es la única acción irreversible de la app.

A partir del **quinto** borrado permanente de la sesión, el mensaje de
`ConfirmDialog` cambia:

```
«Ideas_Proyecto.txt» se borrará para siempre. Como los otros cuatro.
```

Una cadena de texto. Sin animación, sin capa nueva, sin tocar ninguna regla. Y
probablemente lo más inquietante que se puede meter en esta app por ese precio:
el sistema no te juzga, sólo te informa de que estuvo contando.

El orden de los botones y el foco inicial **no cambian**. `ConfirmDialog` es el
único diálogo de la app justamente para que esa regla viva en un solo sitio, y
`tests/components/ui/ConfirmDialog.test.tsx` la fija.

---

## 11 · La reconexión se acuerda de la oscuridad

`useNetworkStatus` ya sabe cuándo el backend dejó de responder y cuándo volvió —
hoy sólo cambia el rótulo y descarta el resto.

Se guarda el instante de la caída y, al volver, la barra muestra tres segundos:

```
[RECONECTADO · 00:02:14 A OSCURAS]
```

Es un dato honesto que la app ya tiene. Y es el mejor tipo de secreto que hay: no
lo podés buscar, sólo te lo podés encontrar, y sólo si algo se rompió de verdad.

**Este sí se anuncia a lectores de pantalla**, a diferencia de los fragmentos de
§2: es información real sobre el estado del sistema, que es justo para lo que la
región viva existe.

---

## 12 · La línea de barrido se traba

En lugar de añadir sólo una textura nueva, se usa el elemento que la app ya tiene
como firma. Cada tantas pasadas, la línea de barrido **se detiene 120 ms a media
pantalla** y sigue.

Sigue animando sólo `transform`, sigue en el compositor, y "la máquina vieja se
traba" se lee mejor en algo que el usuario ya conoce que en una capa que aparece
de la nada.

**Probar esto antes de construir `band-roll`.** Puede que alcance solo.

---

## 13 · Colapso del sistema

El clímax. Se dispara con la integridad a 0 (§5) o con `//panic`.

**Dura unos 4,2 s** y ocurre **entero en una capa por encima de la app**. Debajo,
el editor sigue montado y el auto-guardado sigue su curso.

**El foco nunca se mueve.** La revisión 1 decía "al terminar, se recupera el foco
donde estaba", lo que implica que se pierde — y eso contradice la regla 2. La
versión correcta: la capa lleva `pointer-events: none`, el foco **se queda en el
textarea todo el tiempo**, y durante 4,2 s escribís a ciegas contra una pantalla
negra y todo lo que tecleás llega. Es mejor que la versión anterior y además es
más gracioso.

### La secuencia

**1 · Corte — 0 a 150 ms.**
Todo se va a tinta plana de golpe. Un solo fotograma, sin fundido.

**2 · Estática — 150 ms a 2,2 s.**
Ruido a pantalla completa sobre un `<canvas>`. Los detalles importan:

- Se dibuja a **160 × 90** y se escala con `image-rendering: pixelated`. Barato y
  además se ve más auténtico que el ruido fino.
- **A 12 fotogramas por segundo**, no a 60. La estática de una televisión no es
  suave; el ruido lento es lo que la hace creíble.
- Monocroma: sólo negro y blanco del tema, nada de color.
- Encima, 2 o 3 **barras de arrastre** horizontales de unos 40 px que bajan de
  arriba abajo en 900 ms, en bucle, con opacidad baja.

**3 · Pantalla muerta — 2,2 a 2,6 s.**
El ruido colapsa como un tubo de rayos catódicos al apagarse:
`scaleY(1) → scaleY(0.02)` en 180 ms, queda una línea horizontal brillante en el
centro, esa línea se cierra a un punto en 120 ms, y negro.

**4 · Rearranque — 2,6 a 4,2 s.**
Sobre el negro se teclean líneas de arranque, con el mismo motor que `BootPrompt`
(14 ms por carácter):

```
> REINICIANDO NÚCLEO...
> MEMORIA: OK
> NOTAS: 12 RECUPERADAS
> SYSTEM_OK
```

`NOTAS: N` usa el número real. Que la máquina te diga que tus notas están a salvo
justo después de romperse es la parte que hace que el chiste no dé miedo — y es
el latido del que cuelga todo el tono del lore.

**5 · Vuelta.** La capa se retira sin fundido y la integridad vuelve a 100.

Con `prefers-reduced-motion`, el colapso se reduce a un corte a negro de 400 ms
con el texto de rearranque ya escrito, sin ruido ni animación.

---

## 14 · Fallo cromático

**El único sitio de toda la app donde hay color.** Ver la regla 5: no es una
excepción a la estética, es que esto no es interfaz.

**Cuándo.** Siete pulsaciones seguidas del interruptor de tema, con menos de
1,2 s entre una y otra. Nadie cambia de tema siete veces seguidas sin querer:
hay que ensañarse con el botón, y ese ensañamiento es el gesto que el secreto
premia. Con pausas, la cuenta se reinicia.

**Qué se ve.** La interfaz entera pasa a verse con **aberración cromática**: el
texto se separa en un fantasma rojo y otro cian, la pantalla da un tirón cada
cinco segundos, y unas franjas de color bajan despacio por encima de todo.

**Qué NO pasa.** Nada. Se escribe, se guarda, se navega, se abre la papelera y
se ejecutan comandos exactamente igual. Es cien por cien visual — regla 1 y
regla 2 intactas.

**No se arregla solo.** Es el único estado de la app que no se puede deshacer
desde la propia app: dura hasta que recargues. Y mientras dura, **el interruptor
de tema queda inservible** y lo dice — pasa a `[✗ SEÑAL]`, deshabilitado, con un
nombre accesible que explica que hay que recargar. Un control que no responde y
no se explica se lee como un defecto; uno que dice qué le pasó, como una avería.

**Fotogramas.**

| Animación | Duración | Qué hace |
| --------- | -------- | -------- |
| `chroma-drift` | 1,6 s, `steps(1, end)`, en bucle | Separa los canales entre cuatro posiciones. Salta, no se desliza. |
| `chroma-jolt` | 5,2 s, `steps(1, end)`, en bucle | El tirón, sólo en el último 8 % del ciclo: una pantalla averiada da un salto cada tanto, no tiembla sin parar. |
| `chroma-roll` | 2,8 s, lineal, en bucle | Las franjas de color bajando. Sólo `transform`. |

**Dónde se aplica y por qué importa.** Sobre `.container-terminal`, **nunca**
sobre `<body>` ni sobre un ancestro de los elementos fijos. El grano
(`body::before`), la línea de barrido y el flash son **hermanos** del contenedor,
no descendientes, así que ni el `text-shadow` ni el `transform` los convierten en
su bloque contenedor. Es la misma trampa de §C.4, esquivada por la estructura que
ya tenía `page.tsx`.

Efecto colateral que además queda bien: el grano y el barrido **no** se aberran.
Que el texto falle mientras la textura de la pantalla sigue limpia refuerza que
lo que se rompió es la señal, no la ventana.

**Con `prefers-reduced-motion`, la avería se ve QUIETA, no desaparece.** El fallo
es contenido —al sistema le pasó algo y hay que poder verlo— pero no se mueve, no
se desplaza y no parpadea: queda la separación de canales fija y nada más. Es la
única pieza de este documento que no se apaga entera con movimiento reducido, y
la razón es que su información no está en el movimiento.

---

# A · Qué NO entra

Listado explícito para que nada se cuele después sin decisión.

| Idea | Por qué no |
| ---- | ---------- |
| Que `FILES: 12` muestre un número equivocado y se corrija | Simula pérdida de datos. Regla 3. Era la idea más efectiva del lote y por eso hay que nombrarla. |
| Comandos escritos en el título | `limits.ts` prohíbe `<` y `>` en títulos (`FORBIDDEN_TITLE_MARKUP`) y el backend lo valida igual. Imposible. |
| `//export` | Es una función que falta, no un secreto. Va por la puerta de adelante. |
| Sonido | Fuera de alcance desde la revisión 1. |
| Persistir la integridad entre sesiones | Recargar siempre da un sistema sano. |
| Logros o puntuaciones | Convierte esto en un juego. |
| Secretos que dependan del contenido de tus notas | Lo que escribís no se lee. Nunca. |

**Candidatas para una revisión 3**, evaluadas y aparcadas — no descartadas:

- Ctrl+Z tres veces con el historial agotado → `[NO HAY MÁS PASADO]`.
- El núcleo de §7 asomando a la barra de estado en ámbar si escribís rápido
  30 s seguidos. Es el único caso donde el token `warn` estaría legítimamente
  ganado, y el único secreto que premia *usar* la app en vez de hurgarla.
- Seis cambios de tema seguidos: el sexto vuelve solo a los 400 ms, una vez.

---

# B · Dos reglas que parecen detalles y no lo son

### 1 · Ningún efecto se anuncia a un lector de pantalla

La barra de estado es `<footer role="status" aria-live="polite">`. **Todo lo que
cambie ahí dentro se lee en voz alta.** Un repertorio de frases raras disparándose
cada tres minutos se convierte, para un usuario ciego, en una voz que interrumpe
lo que está escribiendo para decirle `SIN RELEVO`. Eso no es encantador: es
hostil.

El fragmento va en un nodo `aria-hidden="true"`, con el `[SYSTEM_OK]` real
mantenido en el árbol de accesibilidad mediante `.sr-only`. Lo mismo vale para el
rótulo invertido de §4.

La excepción es §11: la reconexión **sí** se anuncia, porque es información real
sobre el estado del sistema. Esa es la línea. Si es verdad y te importa, se
anuncia; si es atmósfera, no.

### 2 · Ningún efecto mueve la maqueta

La barra de estado es `flex` con `gap`. `[NADIE MÁS CONECTADO]` es mucho más
ancho que `[SYSTEM_OK]`: al aparecer **empuja `[GUARDADO]` y todo lo que sigue**.
Un secreto que descoloca la interfaz cada tres minutos deja de ser un secreto y
pasa a ser un defecto.

Se resuelve por maquetado, no midiendo — el mismo principio que sostiene
`LinePrompts`. El hueco del estado lleva `min-width` en **`ch`**, dimensionado al
fragmento más largo del repertorio. En una monoespaciada `1ch` es exactamente el
avance de un carácter, así que el cálculo es contar letras y no hay nada que
medir en tiempo de ejecución.

Corolario: **el repertorio tiene un largo máximo**. Un fragmento nuevo que no
entre, o se acorta, o no entra.

---

# C · Correcciones a la revisión 1

Se dejan escritas porque cada una costaría una tarde de depuración si alguien
volviera al documento viejo.

**1 · `//whoami` era imposible.** Cookie `httpOnly`, el hash se calcula en el
servidor y no hay ruta que lo devuelva. Resuelto en §6 convirtiendo la limitación
en la respuesta.

**2 · Los comandos sí se guardaban.** El auto-guardado a 2,5 s escribía `//help`
en la base junto con un punto de historial. Resuelto en §6 con supresión
explícita del `setTimeout`.

**3 · "Nota vacía" estaba mal definido.** Al pulsar Enter la nota contiene el
comando. Resuelto en §6 con la condición real: una única línea que empieza por
`>`.

**4 · `filter: invert(1)` rompía la maqueta.** `filter` sobre un elemento crea un
bloque contenedor para sus descendientes `position: fixed`. En `page.tsx:105-108`
la línea de barrido (z-9998) y el flash (z-9999) son **hermanos** de
`.container-terminal`, y el grano de papel vive en `body::before`
(`globals.css:190`). Cualquier "contenedor" que se elija deja al grano fuera de
la inversión: un velo de ruido sin invertir sobre una página invertida, con
costura visible.

Solución: una capa fija propia con **`backdrop-filter: invert(1)`**. Invierte
todo lo pintado detrás —grano y barrido incluidos—, no crea bloques contenedores
para nadie, y vive en la misma capa que las franjas.

Efecto colateral que además está bien: un `<dialog>` abierto con `showModal()`
pinta en la capa superior del navegador, así que **el panel de diagnóstico no se
invierte**. El instrumento de medición no debería mentir.

**5 · §13 contradecía la regla 2.** "Se recupera el foco donde estaba" implica que
se perdió. Resuelto: el foco no se mueve nunca.

---

# Dónde iría cada cosa

```
src/hooks/useSystemState.ts                 integridad, efectos, secretos, uptime
src/lib/system/commands.ts                  registro de comandos, funciones puras
src/lib/system/lore.ts                      fragmentos y sus condiciones, puro
src/lib/system/requestLog.ts                búfer circular (§8)
src/components/effects/GlitchLayer.tsx      glitch, franjas y negativo
src/components/effects/SystemCollapse.tsx   estática, muerte y rearranque
src/components/effects/ReverseBoot.tsx      el rótulo invertido (§4)
src/components/system/DiagnosticPanel.tsx   el panel
src/styles/glitch.css                       los fotogramas clave (§1, §14)
```

`glitch.css` se importa **dentro de una capa de cascada**, como `terminal.css` y
`animations.css`. Fuera de capa anularía utilidades de Tailwind; ya pasó una vez
y costó caro (ver `docs/DISENO.md`).

**Ningún archivo del backend cambia.**

---

# Qué se puede probar sin navegador

- **Registro de comandos:** entrada → salida. Es lo que más lógica concentra.
- **Fragmentos del lore:** dada una hora y una duración de sesión, qué puede
  salir y qué no; que nunca se repite el anterior; que ninguno excede el largo
  máximo del hueco.
- **Almacén de estado:** cuenta de clics, reinicio a los 4 s, umbrales de
  integridad, persistencia del interruptor, escalones del intervalo por uptime.
- **Búfer de peticiones:** que es circular, que no crece, que no guarda cuerpos.
- **Movimiento reducido:** con `prefers-reduced-motion`, ningún efecto de
  movimiento se programa, y §4 no ocurre en absoluto.
- **El estado real gana:** con la red caída o un guardado en curso, ningún
  fragmento de §2 llega a pintarse.
- **El comando no se guarda:** con la condición de activación cumplida, el
  auto-guardado no se programa. Prueba obligatoria.
- **No romper nada:** con el colapso activo, el editor sigue montado, el foco
  sigue en el textarea y el auto-guardado se dispara igual. Esta es la prueba que
  de verdad importa.

El aspecto de las animaciones se juzga mirándolas, no con tests.

---

# Por dónde empezar

1. `useSystemState`, `commands.ts`, `lore.ts` y `requestLog.ts`. Son la base de
   casi todo y se prueban sin pintar nada.
2. Los comandos (§6) y el panel (§7), con `//history` (§7) y `//log` (§8). Dan
   valor visible enseguida y no dependen de ninguna animación.
3. Los textos: §3, §10, §11. Son cadenas y condiciones; ningún efecto nuevo.
4. El glitch (§1), los fragmentos (§2) y el barrido trabado (§12). Probar §12
   antes de construir `band-roll`.
5. El arranque invertido (§4) y el botón (§5).
6. El colapso (§13) al final: es el más vistoso y el que más depende de que lo
   anterior esté sano.

---

# D · Los fragmentos y el idioma · **SIN RESOLVER**

En español el rótulo de la barra dice hoy **`[TODO_BIEN]`** (`status.ok` en el
diccionario), mientras que los fragmentos de §2 siguen construidos sobre la
palabra `SYSTEM`: `[SYSTEM_OK?]`, `[SYSTEM_0K]`, `[SYSTEM_TIRED]`.

**Esto rompe el mejor fragmento del repertorio.** `[SYSTEM_0K]` funciona porque
es una errata de algo que ves cien veces al día; si en español nunca ves
`SYSTEM`, ese cero no es una errata de nada. Y `[SYSTEM_OK?]` deja de leerse como
"lo de siempre con una duda" y pasa a parecer un fallo de traducción.

**La forma correcta** es que la familia de fragmentos se DERIVE del rótulo activo
en lugar de ser una lista suelta: en español serían `[TODO_BIEN?]`,
`[TOD0_BIEN]`, `[TODO_CANSADO]`. Así la broma sobrevive a cualquier traducción
del rótulo, incluida la próxima.

Cuidado al hacerlo: `MAX_FRAGMENT_LENGTH` reserva el ancho del hueco de la barra
y ya toma el máximo de los dos idiomas para que cambiar de idioma no desplace
nada. Si los fragmentos pasan a derivarse, el máximo tiene que seguir
calculándose sobre las dos familias completas.

No se resolvió acá porque el diccionario pertenece a la pieza de trabajo de
internacionalización y estaba en edición activa; tocarlo desde este lado habría
pisado su trabajo.

---

# E · Estado final

**Las catorce piezas están construidas, probadas y vistas corriendo.**

```
npm run check  →  EXIT=0
  frontend   596 tests   (eran 99 al empezar)
  backend    148 tests   (sin tocar)
  lint · typecheck · build   limpios
```

La referencia técnica de lo construido —qué se ve, cómo se dispara cada efecto,
con qué números y por qué está hecho así— vive en
[`docs/SECRETOS.md`](../SECRETOS.md). Este documento conserva el **razonamiento**:
el lore, las decisiones que se cerraron y por qué.

## Lo que enseñó construirlo

Cinco defectos no los encontró ningún test. Aparecieron al abrir la app, y los
cinco eran invisibles desde el código:

| Defecto | Por qué ningún test lo veía |
| ------- | --------------------------- |
| Las fechas en UTC mostraban el día de mañana | Los tests construían fechas UTC y comprobaban salida UTC: coherentes entre sí y equivocados los dos |
| Desajuste de hidratación en el rótulo | En los tests no hay render de servidor |
| La pantalla de colapso invertía el tema | Ningún test mira colores computados |
| El `<dialog>` escapaba del filtro | La capa superior del navegador no existe en jsdom |
| Dos reglas CSS con `animation` pisándose | Jest no resuelve la cascada |

Hay un patrón: **los tests cubren lógica; el navegador cubre composición.** Todo
lo que dependa de cómo el navegador junta capas, temas, cascada o hidratación
hay que ir a mirarlo.

## Lo que queda abierto

- **El ritmo.** Cada cuánto caen los tirones, cuánto dura la interferencia, si
  cuarenta segundos de rearranque se hacen largos. Está probado que funciona; si
  se siente bien se juzga usándolo un rato.
- **Las fechas locales y la hidratación.** Los componentes que las pintan también
  se renderizan en el servidor, que tiene otro huso. No apareció ningún error al
  probar, pero es el primer sitio donde mirar si algo se ve raro.
- **Las ventanas fantasma sobre el puzzle.** Con cinco abiertas tapan medio
  volcado. Es solvible siempre —el clic las atraviesa, huyen del cursor, y están
  los cinco minutos— pero si se hace pesado, sesgar sus posiciones hacia los
  bordes lo arregla sin quitarles presencia.
