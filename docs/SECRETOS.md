# Catálogo de secretos

**Todo lo que la interfaz hace y que no es «guardar una nota».**

Un efecto y un secreto son la misma cosa vista desde dos sitios: lo que se ve, y
lo que hay que hacer para verlo. Estuvieron un tiempo en dos páginas separadas y
lo único que se consiguió fue que los comandos salieran en las dos, con listas
que ya no coincidían. Acá está todo junto, y **cada pieza se cuenta entera**:

- **Cómo se dispara**, con sus umbrales y sus probabilidades exactas.
- **Qué se ve.**
- **Por qué está hecho así** — la parte que evita que alguien lo «arregle» más
  adelante.

Lo único que vive fuera son **las reglas que ningún efecto puede romper**, en
[`REGLAS.md`](REGLAS.md) · sección A. Están ahí porque mandan también sobre
código que no es un efecto.

Si un número de aquí no coincide con el código, **manda el código**, y hay que
corregir esta página. Un test ata los porcentajes a sus constantes justamente
para que eso no pase en silencio (`tests/docs/secretos.test.ts`).

El diseño de conjunto y el lore están en
[`docs/specs/2026-09-01-secretos-del-sistema.md`](specs/2026-09-01-secretos-del-sistema.md)
y [`docs/specs/2026-09-02-v02.md`](specs/2026-09-02-v02.md).

---

## Las reglas que mandan sobre todo lo de aquí

Si un efecto choca con una de ellas, **se recorta el efecto**.

Están en [`REGLAS.md`](REGLAS.md) · sección A, que es su sitio: A1 nada pierde
trabajo ni lo aparenta, A2 nada bloquea la escritura, A3
`prefers-reduced-motion` gana siempre, A4 de cualquier estado se sale, A5 ninguna
pista lleva a algo que no existe donde estás.

Se listaban también acá, y tenerlas en dos sitios es exactamente cómo se
desincronizan: acá había dos y en `REGLAS.md` tres.

## Cómo apagarlo todo

Tres formas, todas equivalentes:

- El comando `//chaos off` en una nota vacía.
- El interruptor `[EFECTOS: ON/OFF]` al pie del panel de diagnóstico.
- La preferencia `prefers-reduced-motion` del sistema operativo.

Las dos primeras se recuerdan entre sesiones. Los **comandos y el panel siguen
funcionando** con los efectos apagados: apagar el ruido no te quita las
herramientas.

---

## Índice por disparador

Qué hacer para ver cada cosa, y en qué sección de más abajo se cuenta.

| Lo que hacés | Lo que pasa | Dónde |
| --- | --- | --- |
| **Cargar la página** | El monitor se enciende: barras, rótulo, memoria | §25 |
| Cargar la página (1 de cada 12) | El rótulo arranca en vídeo inverso | §4 |
| Nada: dejar la pestaña abierta | Glitch ambiental, fragmentos del sistema, el barrido se traba | §1 · §2 · §12 |
| Abrir una nota vacía | Arranques raros (1 de cada 30) | §3 |
| Escribir `//` y un comando | La terminal contesta | §6 |
| `//help` | La lista, con huecos revueltos donde van los que no conocés | §19 |
| `//diag`, o Alt+clic en `[TODO_BIEN]` | El panel de diagnóstico | §7 |
| `//log` | El registro de peticiones | §8 |
| Clic 3 veces en el rótulo | El botón secreto | §5 |
| Clic 9 veces en el rótulo, o `//panic` | El colapso del sistema | §13 |
| **6** colapsos seguidos, **o** colapsar con la señal ya rota | El bloqueo y su puzzle | §13 |
| **10** toques rápidos al tema | El fallo cromático — **y sus ventanas sueltan comandos** | §14 |
| Entrar a la papelera con la sesión avanzada | El archivo fantasma | §9 |
| Borrar cinco notas para siempre | La papelera lleva la cuenta | §10 |
| Perder la conexión y recuperarla | La reconexión | §11 |
| `//ps`, y después `//attach_6` | El pong escondido | §15 |
| `//hi`, y otra vez, y otra | El saludo se agota, y a las **8** te echa | §16 |
| `//hi` y enseguida `//whoareu` o `//howareu` | La conversación se agota a las **3** | §21 |
| Insistir **2 veces más** tras la expulsión | La página se queda muerta | §21 |
| `//date_off` | El reloj y la fecha se sueltan | §17 |
| **Ganar tu primera pieza** | Tres pistas que llevan al catálogo, y un resto en la papelera | §18 |
| `//art`, y después `//art_<n>` y `//keep` | El catálogo, las piezas y la colección con su pestaña | §18 · §23 |
| `//reset` | ⚠ **Borra TODO, las notas incluidas.** Pregunta `[y/n]` antes | §22 |
| …y contestar `n` (1 de cada 5) | **La broma:** te enseña el borrado entero y no borra nada | §22 |
| **Clic 3 veces en la hora** | **El morse: la puerta de la v0.2** | §20 |
| Descifrar el morse y teclearlo | **Entrar en la v0.2** | §24 |
| Ya dentro: abrir una nota vacía | El marcador trae un comando el **18 %** | §24.3 |
| Ya dentro: tirar una nota y recuperarla | Vuelve corrompida el **50 %**, y con un comando el **7 %** | §24.2 |
| Ya dentro: `//todo` y `//recover` | Los dos comandos que sólo existen ahí | §24.4 |
| Ya dentro: teclear la palabra otra vez | Salir — **y ganar el nombre del manipulador** | §24.10 |

---

## Todas las probabilidades, juntas

Para no tener que buscarlas pieza por pieza. Cada una está explicada en su
sección.

| Efecto | Probabilidad | Intentos de media | Constante · dónde |
| --- | --- | --- | --- |
| v0.2 · miente al guardar | **22 %** | ~5 | `LIE_ODDS` · `v02.ts` |
| v0.2 · pierde de verdad | **6 %** | ~17 | `DROP_ODDS` · `v02.ts` |
| v0.2 · tirar a la papelera no hace nada | **18 %** | ~6 | `TRASH_FAIL_ODDS` · `v02.ts` |
| v0.2 · vuelve corrompida de la papelera | **50 %** | 2 | `CORRUPT_ODDS` · `v02Restore.ts` |
| v0.2 · …y suelta un comando | **14 %** de ésas (7 % del total) | ~14 | `LEAK_ODDS` · `v02Restore.ts` |
| v0.2 · el marcador trae un comando | **18 %** | ~6 | `PLACEHOLDER_LEAK_ODDS` · `v02Messages.ts` |
| v0.2 · etiqueta mal escrita | **26 %** | ~4 | `BROKEN_LABEL_ODDS` · `v02.ts` |
| v0.2 · la barra de carga retrocede | 25 % por latido | 4 | `fakeProgress` · `v02Loading.ts` |
| Arranque raro en una nota vacía | **1 de cada 30** | ~30 | `NoteEditor.tsx` |
| …y que ésa sea de las invasivas | 1 de cada 6 de ésas (1 de 180 aperturas) | ~180 | `INVASIVE_ODDS` · `lore.ts` |
| Rótulo en vídeo inverso al cargar | 1 de cada 12 | ~12 | `REVERSE_BOOT_ODDS` · `SystemLabel.tsx` |
| El barrido se traba en esta pasada | 1 de cada 4 | 4 | `page.tsx` (`onAnimationIteration`) |
| Glitch leve · serio · grave | 70 % · 25 % · 5 % | — | `rollSeverity` · `glitchTiming.ts` |
| Un glitch trae además un fragmento | 1 de cada 5 | 5 | `FRAGMENT_ODDS` · `glitchTiming.ts` |
| …y que ese fragmento sea la errata `[T0DO_B1EN]` | ~1 de cada 20 | ~20 | `PESO_VARIANTE` · `lore.ts` |
| Un glitch serio o grave trae negativo | 1 de cada 4 | 4 | `NEGATIVE_ODDS` · `glitchTiming.ts` |
| Un glitch **grave** trae ráfaga cromática | 1 de cada 2 | 2 | `CHROMA_BURST_ODDS` · `useGlitch.ts` |
| `//help` no está para listas | 1 de cada 6 | 6 | `SNARK_ODDS` · `commands.ts` |
| `//help` suelta un comando escondido | 1 de cada **8**, y sólo **6 posibles** | 8 | `LEAK_ODDS` · `LEAKABLE` · `commands.ts` |
| Una ventana fantasma nombra un comando | 1 de cada 3 | 3 | `LEAK_ODDS` · `PhantomError.tsx` |
| Salen 2 o 3 ventanas de golpe (sin bloqueo) | 1 de cada 4 | 4 | `PhantomError.tsx` |
| Una sacudida de tema es ráfaga de cuatro | 1 de cada 3 | 3 | `FLICKER_ODDS` · `ChromaticFailure.tsx` |
| Decir `n` a `//reset` y que sea broma | **20 %** | 5 | `PRANK_ODDS` · `wipe.ts` |

**Umbrales**, que no son sorteos sino cuentas:

| | | Constante |
| --- | --- | --- |
| Toques al tema para el fallo cromático | **10**, con < **1,2 s** entre uno y otro | `THEME_BREAK_AT` |
| Clics en el rótulo para el colapso | **9**, con < **4 s** entre uno y otro | `COLLAPSE_AT_CLICK` |
| Colapsos seguidos para el bloqueo | **6**, en una ventana de **5 minutos** | `LOCKOUT_AT` |
| Cuánto dura el bloqueo sin resolverlo | **5 minutos** | `LOCKOUT_MS` |
| Saludos para que te eche | **8**, en una ventana de **3 minutos** | `KICK_AT` |
| Insistencias tras la expulsión para la página muerta | **3** expulsiones en total | `KILL_AFTER_KICKS` |
| `//whoareu` / `//howareu` antes de desaparecer | **3**, en **60 s** | `CHAT_GONE_AT` · `CHAT_WINDOW_MS` |
| Clics en la hora para el morse | **3**, en **1600 ms** | `SystemClock.tsx` |
| Borrados definitivos para que la papelera lo mencione | **5** | `TALLY_AT` |
| Sesión y notas para el archivo fantasma | **10 min** y **3** | `GHOST_MIN_SESSION_MS` · `GHOST_MIN_NOTES` |
| Silencio para que pregunte `[SEGUÍS AHÍ]` | **10 min** sin tocar nada | `SILENCIO_MS` · `lore.ts` |
| Sesión para `[TURNO LARGO]` | **45 min** | `TURNO_LARGO_MS` · `lore.ts` |
| Peloteo para la pieza del pong | **25** limpio · **15** degradado | `RALLY_LIMPIO` · `RALLY_DEGRADADO` |
| Notas para la biblioteca | **12** | `BIBLIOTECA_DESDE` |
| Rato con la pestaña abierta para el arbusto | **30 min** | `ARBUSTO_TRAS_MS` |
| Caracteres escritos para la pluma | **10 000** | `LIMITS.CONTENT_MAX` |

---

## Índice de piezas

Van en el orden en que se construyeron, que es el orden en que se entienden:
cada una apoya en las anteriores. Las tres últimas —§20, §24 y su puerta— son la
capa más profunda y sólo tienen sentido después de las demás.

| | |
| --- | --- |
| §1 | [Glitch ambiental](#1--glitch-ambiental) |
| §2 | [Fragmentos del sistema](#2--fragmentos-del-sistema) |
| §3 | [Arranques raros](#3--arranques-raros) |
| §4 | [Arranque en vídeo inverso](#4--arranque-en-vídeo-inverso) |
| §5 | [El botón secreto](#5--el-botón-secreto) |
| §6 | [Comandos en el prompt](#6--comandos-en-el-prompt) |
| §7 | [Panel de diagnóstico](#7--panel-de-diagnóstico) |
| §8 | [Registro de peticiones](#8--registro-de-peticiones) |
| §9 | [El archivo fantasma](#9--el-archivo-fantasma) |
| §10 | [La papelera lleva la cuenta](#10--la-papelera-lleva-la-cuenta) |
| §11 | [La reconexión](#11--la-reconexión) |
| §12 | [La línea de barrido se traba](#12--la-línea-de-barrido-se-traba) |
| §13 | [Colapso del sistema](#13--colapso-del-sistema) |
| §14 | [Fallo cromático](#14--fallo-cromático) |
| §15 | [vsync-test · el pong escondido](#15--vsync-test-el-pong-escondido) |
| §16 | [El saludo se agota](#16--el-saludo-se-agota) |
| §17 | [El reloj se suelta](#17--el-reloj-se-suelta) |
| §18 | [Las piezas que quedaron](#18--las-piezas-que-quedaron) |
| §19 | [La ayuda no lo dice todo](#19--la-ayuda-no-lo-dice-todo) |
| §20 | [El reloj esconde algo](#20--el-reloj-esconde-algo) |
| §21 | [La conversación se agota](#21--la-conversación-se-agota) |
| §22 | [Empezar de cero](#22--empezar-de-cero) |
| §23 | [La colección](#23--la-colección) |
| §24 | [La v0.2 · la versión de antes](#24--la-v02-la-versión-de-antes) |
| §25 | [El monitor se enciende](#25--el-monitor-se-enciende) |
| §26 | [El ente](#26--el-ente) |
| — | [Los 28 secretos que cuenta el panel](#los-28-secretos-que-cuenta-el-panel) |
| — | [Accesibilidad, en una tabla](#accesibilidad-en-una-tabla) |
| — | [Dónde vive cada cosa](#dónde-vive-cada-cosa) |
| — | [Apéndice · las claves de `localStorage`](#apéndice--las-claves-de-localstorage) |

> §25 va al final por el mismo criterio que manda en toda la lista —el orden en
> que se construyeron— aunque sea **lo primero que se ve** al abrir la app.

---

# 1 · Glitch ambiental

**Qué se ve.** La pantalla falla sola. No siempre igual: hay tres niveles de
gravedad y la mayoría de las veces apenas es un parpadeo.

**Cuándo.** Solo, con la pestaña visible y los efectos activos. **El intervalo se
acorta con lo que lleves de sesión** — la máquina se cansa mientras la usás:

| Sesión abierta | Intervalo |
| -------------- | --------- |
| < 10 min | 240 s ± 60 |
| 10–45 min | 180 s ± 45 |
| 45–90 min | 120 s ± 30 |
| > 90 min | 90 s ± 20 |

Nunca baja de 60 s. Con la pestaña oculta se salta el turno y se reprograma: nada
se acumula para dispararse de golpe cuando volvés.

### Los tres niveles

| Nivel | Probabilidad | Duración | Qué añade |
| ----- | ------------ | -------- | --------- |
| `minor` | 70 % | 180 ms | Tirón + franjas |
| `major` | 25 % | 280 ms | + 3 rebanadas, fantasma, caída de nivel |
| `severe` | 5 % | 420 ms | + 6 rebanadas, pérdida de vertical |

**Un glitch que siempre es igual deja de ser un fallo y pasa a ser un bucle.** A
la tercera vez el ojo lo reconoce y lo descarta. Con los pesos tan desparejos, lo
normal es apenas notarlo, y cuando cae uno grave se siente que algo pasó de
verdad.

### Las capas, una por una

**Tirón (`glitch-jolt`, `steps(1, end)`).** Cinco posiciones y vuelta al centro.
La amplitud llega por variable CSS desde el almacén: 3 px con el sistema sano,
hasta 10 px con la integridad por el suelo (§5). El mismo fotograma sirve para
los dos, así que es la misma señal contada más fuerte y no otra señal.

```
 0%   translate3d( 0,      0, 0)
15%   translate3d(-amp,    1px, 0)
30%   translate3d( amp*.66, -1px, 0)
45%   translate3d(-amp*.33, 0, 0)
60%   translate3d( amp*.66, 1px, 0)
100%  translate3d( 0,      0, 0)
```

**Franjas (`band-roll`, 180 ms, `steps(6)`).** Degradado repetido de 8 px que se
desplaza 24 px — tres celdas del patrón, así que el bucle cierra sin salto.

**Rebanadas desplazadas (`major` y `severe`).** El efecto que más "señal rota"
comunica: la imagen se parte en franjas horizontales y cada una se corre de lado.
Se hace con `backdrop-filter: invert(1) contrast(1.4)` sobre capas fijas
recortadas a una banda — **sin duplicar el DOM ni pintar en un canvas**. La
inversión es lo que las hace visibles: correr una banda de papel sobre papel no
se vería. Cada rebanada mide entre 1,5 % y 7 % de alto y se corre hasta 14 px
(`major`) o 34 px (`severe`), a ambos lados.

**Fantasma monocromo (`ghost-shift`, 120 ms).** Una copia del texto corrida unos
píxeles, en tinta al 30 %. Es lo mismo que hace la separación de canales de un
glitch en color **pero sin color**: la estética se mantiene y el efecto se lee
igual de roto. Va en `text-shadow`, así que lo hereda todo el texto de una vez y
el navegador no re-maqueta nada.

**Caída de nivel (`level-drop`, 280 ms).** Un oscurecimiento brevísimo de la
pantalla, como cuando a una señal le baja la potencia. Es el más sutil y el que
más ata a los demás: sin él las rebanadas parecen recortes, con él parecen una
imagen que se está perdiendo.

**Pérdida de vertical (`vhold-slip`, sólo `severe`).** La imagen entera se corre
hacia arriba y vuelve, como una tele a la que se le va el vertical. Va en el
mismo elemento que el tirón para que los `transform` se compongan en vez de
pelearse por la propiedad.

**Negativo (`negative-blink`, 200 ms, dos parpadeos).** Una de cada cuatro veces,
y **sólo en fallos `major` o `severe`**: invertir la pantalla entera por un
parpadeo es desproporcionado, y lo desproporcionado delata el truco.

> ⚠ **Se hace con `backdrop-filter` sobre una capa propia, nunca con `filter`
> sobre un contenedor.** `filter` crea un bloque contenedor para los
> descendientes `position: fixed`, y en esta app el grano vive en `body::before`
> y el barrido es hermano del contenedor. Con `backdrop-filter` se invierte todo
> lo que hay detrás sin tocarle la maqueta a nadie.
>
> Efecto colateral que además está bien: un `<dialog>` abierto pinta en la capa
> superior del navegador, así que **el panel de diagnóstico no se invierte**. El
> instrumento de medición no debería mentir.

### El acoplamiento con los fragmentos

**Una de cada cinco veces**, el glitch dispara además un fragmento del sistema
(§2), con **120 ms de retraso** — lo justo para que el ojo llegue.

Este es el mecanismo central del lore, y la razón de que el glitch no sea sólo
ruido: **un fallo suelto es ruido; un fallo que ocurre justo cuando el sistema
dice algo es una frase.** El glitch te hace levantar la vista y lo que leés
cuando la levantás es el fragmento.

---

# 2 · Fragmentos del sistema

**Qué se ve.** Cada tanto, el rótulo de estado de la barra no dice lo de
siempre. Dice otra cosa y vuelve.

**Cuánto dura: entre 5 segundos y un minuto entero**, sorteado en cada
aparición. No es un tiempo fijo a propósito — con una duración constante el
efecto se vuelve un pestañeo reconocible, siempre el mismo lapso y el mismo
ritmo, y el ojo lo archiva como animación. Variando tanto, a veces apenas lo ves
y a veces el sistema se queda diciendo `[SIN RELEVO]` un minuto largo mientras
escribís, que es bastante más incómodo que cualquier temblor.

**Cuándo. Sólo lo dispara el glitch (§1), una de cada cinco veces**, con 120 ms
de retraso. No hay temporizador propio: `showFragment()` tiene un único
llamador, y es `fireGlitch`.

> Hubo un ciclo ambiental de 3–7 minutos aparte y ya no está. En la práctica no
> se pierde nada —el glitch ya cae solo, y cada vez más seguido con la fatiga de
> la sesión— y se gana lo que hace a esta pieza: **el fragmento no aparece
> nunca solo.** Siempre llega detrás de un fallo, que es lo que lo convierte en
> una frase en vez de en un cartel que parpadea por su cuenta.

Nunca dos veces el mismo seguido, y **nunca dos a la vez**: con uno en pantalla,
`showFragment` no hace nada — dos pisándose se leerían como un parpadeo.

**Sin animación.** Aparece y desaparece de golpe. Esa sequedad es lo que lo hace
sentir un fallo en vez de un adorno.

### El repertorio

Los fragmentos **sí se traducen**, y cada idioma tiene su propio token: `SYSTEM`
en inglés, `TODO_BIEN` en español. No es una traducción de `SYSTEM_OK` —
`[SISTEMA_OK]` se leería como una app traducida en vez de como una máquina— sino
otra palabra que suena igual de máquina en su idioma.

| Español | Inglés | Cuándo puede salir | Peso |
| --- | --- | --- | --- |
| `[TODO_BIEN?]` | `[SYSTEM_OK?]` | siempre | 1 |
| `[T0DO_B1EN]` | `[SYSTEM_0K]` | siempre | **⅓** |
| `[SIGO ACÁ]` | `[STILL HERE]` | siempre | 1 |
| `[TURNO 1/1]` | `[SHIFT 1/1]` | siempre | 1 |
| `[SIN RELEVO]` | `[NO RELIEF]` | siempre | 1 |
| `[MEMORIA TIBIA]` | `[MEMORY STILL WARM]` | siempre | 1 |
| `[TURNO_PESADO]` | `[SYSTEM_TIRED]` | 02:00–05:00, hora del dispositivo | 1 |
| `[NADIE MÁS CONECTADO]` | `[NO ONE ELSE ONLINE]` | 02:00–05:00 | 1 |
| `[TURNO LARGO]` | `[LONG SHIFT]` | sesión ≥ 45 min | 1 |
| `[SEGUÍS AHÍ]` | `[STILL THERE]` | **sin tocar nada ≥ 10 min** | 1 |

**Estar disponible y salir a menudo son dos preguntas distintas**, y hacen falta
las dos. `when` dice si un fragmento PUEDE salir —de madrugada, con la sesión
larga—; el peso dice CADA CUÁNTO sale entre los que pueden. **Una variante no se
gana estando disponible: se gana siendo rara.**

**Y hay un fragmento que no está en el sorteo: `[BUEN ARTE]`.** Sale cuatro
segundos al ganar una pieza y **pisa** lo que hubiera, porque es una de las tres
pistas que llevan al catálogo (§18) — en el sorteo podría no salir nunca, justo
cuando más falta hace.

### La errata

`[T0DO_B1EN]` lleva un **cero** por la O y un **uno** por la I; el inglés
`[SYSTEM_0K]` sustituye una sola letra. En JetBrains Mono el cero va con punto
interior y el uno con bandera, así que se distinguen si mirás y no se notan si
no. No es un efecto: es una errata — y una errata inquieta más que un temblor. El
español cambia dos letras y el inglés una porque `TODO_BIEN` es más largo que
`OK`: con una sola, la errata se perdía dentro de la palabra.

**Pesa un tercio de lo que pesa el resto: sale una de cada veinte.** El ajuste
tiene dos mitades y fallar cualquiera lo estropea:

| Peso | Sale | Qué pasa |
| --- | --- | --- |
| Igual que las demás | 1 de cada 7 | Deja de ser una errata: se lee como **otro estado más** de la barra, y lo que la hace funcionar es dudar de haberla visto |
| Minúsculo | 1 de cada 60 | Hace falta insistir tanto que **a efectos prácticos no existe** — texto muerto por el otro camino |
| **⅓** | **1 de cada 20** | Rota: aparece de vez en cuando en una sesión normal, sin volverse costumbre |

Un test fija las dos mitades a la vez: que salga **menos** que las normales, y
que aun así **se vea** en 200 tiradas.

### La inactividad se mide de verdad

`[SEGUÍS AHÍ]` es el único fragmento que pregunta por el silencio, y durante un
tiempo **no pudo salir nunca**: los dos sitios que arman el contexto
—`showFragment()` y el marcador del editor— pasaban `idleMs: 0` fijo. La frase
estaba escrita, traducida y con su condición, y era código muerto.

> ⚠ **El test que la cubría pasaba en verde.** Le entregaba a mano un contexto
> que en producción no llegaba jamás — o sea que probaba la condición, no la
> pieza. Está reescrito diciendo exactamente eso.

Ahora hay un reloj de inactividad de verdad, en `src/lib/system/idle.ts`, con sus
escuchadores de tecla y de clic. Vive en un módulo suelto y **no** en un hook
porque lo consultan cosas que no son componentes, y porque **el reloj de la
inactividad es UNO para toda la pestaña**: dos contadores distintos darían dos
respuestas a la misma pregunta. Se apoya en el reloj del navegador y no en un
`setInterval` propio — un temporizador corriendo todo el rato para saber si
alguien está quieto es justo lo contrario de lo que hace falta, y además se
desajusta cuando el navegador congela la pestaña.

**Y la condición se aflojó: ya no pide sesión larga.** Pedía además tres cuartos
de hora de pestaña abierta, así que aunque alguien hubiera medido la inactividad
seguiría siendo casi inalcanzable. Ahora **depende sólo del silencio, a los diez
minutos**: bastante para no dispararse cuando te vas a por un café corto, poco
para que salga la primera tarde en que dejás la pestaña abierta y te vas a otra
cosa.

### Dos cosas que parecen detalles y no lo son

**El estado real gana siempre.** Sin red, servidor caído, error, cargando o
guardando: el fragmento no llega a pintarse. Esta barra es lo que le dice al
usuario si su trabajo está a salvo, y eso no se toca ni en broma.

**El fragmento no se anuncia.** La barra es `<footer role="status"
aria-live="polite">`: todo lo que cambie ahí dentro se lee en voz alta. Un
repertorio de frases raras cada pocos minutos, para quien usa lector de pantalla,
es una voz que le interrumpe lo que está escribiendo para decirle `SIN RELEVO`.
Eso no es encantador, es hostil. El fragmento va en un nodo `aria-hidden` y el
`[TODO_BIEN]` real se mantiene en `.sr-only`.

**El hueco tiene ancho reservado.** La barra es `flex` con `gap`: un fragmento más
ancho que `[TODO_BIEN]` empujaría `[GUARDADO]` y todo lo que sigue. El hueco
lleva `min-width` en **`ch`** dimensionado al fragmento más largo **de los dos
idiomas** — en monoespaciada `1ch` es el avance exacto de un carácter, así que se
cuenta en vez de medirse, y cambiar de idioma no reajusta el ancho.

---

# 3 · Arranques raros

**Qué se ve.** Al abrir una nota vacía, el editor teclea solo un texto de ayuda.
**1 de cada 30 veces** teclea otra cosa.

Misma animación de siempre —despertar, tecleo, pausa, borrado, reposo—, sólo
cambia el texto. Nunca se repite la frase anterior.

**Repertorio normal** — once frases. Con cinco, quien abre notas seguido las veía
todas en una tarde.

```
MEMORIA VERIFICADA. CONTINÚE.
¿SEGUIMOS AQUÍ?
NO HAY NADIE MÁS EN ESTE TURNO.
ÚLTIMA SESIÓN: NO REGISTRADA.
ESCRIBA. YO GUARDO.
EL TURNO ANTERIOR NO DEJÓ NOTA.
SECTOR LIMPIO. PUEDE EMPEZAR.
NO SE REGISTRAN INTERRUPCIONES.
ESTE ESPACIO ESTABA VACÍO ANTES.
LA MÁQUINA ESTÁ DESPIERTA.
PUEDE ESCRIBIR. NADIE VA A LEERLO.
```

**De madrugada (02:00–05:00, hora del dispositivo)** el repertorio se reemplaza
entero:

```
TURNO NOCHE. NO HAY RELEVO.
A ESTA HORA SÓLO ESCRIBE USTED.
EL SISTEMA TAMBIÉN ESTÁ CANSADO.
```

**Si abrís una nota nueva a menos de 60 s de haber tirado otra a la papelera**,
la frase es fija y gana a todas las demás:

```
¿OTRA VEZ DESDE CERO?
```

Es el único efecto que reacciona a lo que acabás de hacer, y por eso es el que
más se siente como que la máquina te está mirando.

### Las invasivas · una de cada seis frases raras

Es decir: **una de cada ciento ochenta aperturas de nota**. A cambio, se toman la
pantalla.

```
HE ESTADO ENCENDIDO TODO ESTE TIEMPO.
NO HACE FALTA QUE ESCRIBAS NADA HOY.
SIGO CONTANDO LAS QUE BORRASTE.
¿CUÁNTO HACE QUE NO CERRÁS ESTA PESTAÑA?
ESTO YA LO ESCRIBISTE UNA VEZ.
VOY A SEGUIR ACÁ CUANDO CIERRES.
```

Son más largas y **tratan de VOS**, no de usted. Ahí está el efecto: todas las
demás frases usan el registro institucional de una máquina que no te tutea porque
no sabe quién sos, y de golpe una habla como alguien.

Son raras a propósito. Si salieran seguido dejarían de sorprender y encima
empezarían a leerse como que la app quiere darte conversación, que es exactamente
lo contrario del tono.

> Las frases van en mayúsculas y tratan de **usted**. Ese usted es deliberado:
> una máquina institucional que no te tutea porque no sabe quién sos.

---

# 4 · Arranque en vídeo inverso

**Qué se ve.** Al cargar la página, **1 de cada 12 veces**, el rótulo
`[FLASH-NOTES v1.0]` de la cabecera arranca mal y se corrige solo.

La cabecera **ya es tinta con texto inverso**, así que el vídeo inverso es al
revés de lo que uno supone: un **bloque de papel con letra de tinta**. Sobre una
barra oscura, un rectángulo claro — que es exactamente el atributo *reverse* de
una terminal de verdad. Sale de dos tokens que ya existían.

**Tres fotogramas duros, 560 ms de punta a punta** (`steps(1, end)`, sin
transiciones):

```
0 ms     <la variante>          vídeo inverso, rótulo mal
380 ms   [FLASH-NOTES v1.0]     vídeo inverso, rótulo correcto
560 ms   [FLASH-NOTES v1.0]     normal
```

**El dado se tira después de montar, en un temporizador a 0 ms**, y no en el
inicializador del estado. Sorteando al pintar, el servidor manda el rótulo bien y
el cliente —si le toca el 1 de 12— lo manda invertido: React ve el desajuste y
**regenera el árbol entero** en cada carga con suerte. Además queda mejor: el
rótulo se rompe un fotograma DESPUÉS de aparecer, que es como se rompe una señal
de verdad.

### La variante es de la sesión, no del arranque

Hay **cinco formas** de salir mal, y **se sortea una al cargar la página**. Esa
variante se queda: mientras no refresques, si el rótulo vuelve a fallar falla
IGUAL. Es lo que lo convierte en una propiedad de esta sesión —"hoy la máquina
arranca al revés"— en vez de en un sorteo suelto cada vez.

| Variante | Qué cuenta |
| -------- | ---------- |
| `]0.1v SETON-HSALF[` | Invertido carácter a carácter. Mantiene la silueta y los corchetes saltan de lado: se lee como "algo está mal" sin volverse un jeroglífico. |
| `[0˙1ʌ SƎꓕON-HSⱯꓶℲ]` | Boca abajo. La más agresiva: parece una pantalla montada del revés. |
| `[FL█SH-N█TES █1.█0]` | La mitad de los caracteres caídos a su bloque. La memoria de vídeo perdió parte del mapa de la fuente. |
| `]FLASH-NOTES v1.0[` | Corrido una celda. El buffer arrancó desalineado. |
| `[v1.0 FLASH-NOTES]` | Los caracteres están; el orden de las palabras no. |

**Primero se arregla el orden y después el vídeo.** Corregir las dos cosas a la
vez daría un solo parpadeo y el efecto se perdería: el fotograma intermedio es lo
que lo vuelve legible como "la máquina se dio cuenta".

Con `prefers-reduced-motion` **no ocurre en absoluto**. No se degrada a una
versión quieta: un rótulo mal escrito sin corrección visible sería sencillamente
un error.

El texto corrupto va en un nodo `aria-hidden` con el nombre real en `.sr-only`:
el nombre de la app no se corrompe en el árbol de accesibilidad ni por 560 ms.

**Dentro de la v0.2 el rótulo dice `[FLASH-NOTES v0.2]`** y no falla nunca. No es
un adorno: es lo primero que mira alguien que sospecha que la app cambió, y verlo
confirma que no se lo imaginó (§24).

---

# 5 · El botón secreto

**Dónde.** El rótulo `[FLASH-NOTES v1.0]`. No parece un botón y no debe
parecerlo: no es un `<button>`, no tiene `tabindex` y no entra en el orden de
tabulación.

| Clic | Integridad | Qué pasa |
| ---- | ---------- | -------- |
| 1–2 | 100 | Nada |
| **3** | 100 | **`v1.0` parpadea a `v1.0.1` durante 90 ms** |
| 4 | 100 | Nada |
| 5 | 80 | Glitch **leve**, 3 px |
| 6 | 60 | Glitch **serio**, 5 px |
| 7 | 40 | Glitch **serio**, 7 px — rebanadas, fantasma y caída de nivel |
| 8 | 20 | Glitch **grave**, 10 px — además pierde el vertical |
| 9 | 0 | **Colapso** (§13) |

El clic 3 marca el secreto `logo`. Los clics acumulados dentro de la ventana
también **le restan a la integridad que enseña el panel** — 3 puntos cada uno, y
2 °C al núcleo (§7).

**El clic 3 no es decorativo.** Sin él, un curioso que toca el logo dos veces y
para no se lleva ninguna señal de que ahí hay algo: la tasa de descubrimiento
real, salvo leyendo el código, sería cero. Un carácter que parpadea es la
diferencia entre un secreto y un secreto que existe.

### La ráfaga cromática · a veces, en el clic 8

Un fallo `severe` trae, **una de cada dos veces**, la MISMA aberración cromática
del fallo del tema — pero transitoria: dura lo que dura el fallo y no deja nada
roto.

Es lo que emparenta las dos piezas. El botón secreto y el fallo del tema son la
misma familia —los dos son pánico— y hasta ahora eran dos efectos sueltos que
casualmente convivían. Nunca se dispara con la señal ya rota: ahí la aberración
ya es permanente y una encima no se vería.

**La gravedad NO se sortea: la fija la integridad.** Con el sorteo normal, el
clic 7 —el que más se nota— caía en `minor` siete de cada diez veces y se sentía
flojo justo cuando el sistema debería estar peor. Ahora, si bajaste la integridad
a golpes, el fallo que ves se corresponde con lo que hiciste.

**El reinicio a los 4 s es obligatorio.** Sin un clic nuevo en cuatro segundos,
el contador vuelve a cero y la integridad sube a 100. Sin esto, dos clics
accidentales separados por días acabarían rompiéndole el sistema a alguien que
sólo quería escribir.

La integridad **no se recuerda**: recargar siempre devuelve un sistema sano.

---

# 6 · Comandos en el prompt

> **Las respuestas se borran solas, y las largas tardan más.** Que la terminal se
> limpie y te deje la nota en blanco es parte de cómo se siente, así que ninguna
> se queda para siempre. Pero con el tope de nueve segundos, `//help` había que
> leerlo y desplazarlo contra reloj: una respuesta de más de seis líneas aguanta
> ahora 32 s, tiempo de bajarla entera y volver.
>
> Y **se podía ver la barra pero no desplazar**: el elemento lleva
> `editor-placeholder editor-reply`, y la primera —que declara
> `pointer-events: none`— iba más abajo en la hoja con la misma especificidad, así
> que ganaba. Es la trampa de la cascada de [REGLAS.md · C3](REGLAS.md), la misma
> que dejó al tirón sin reproducirse durante la avería.

El editor ya muestra un `>` al principio de cada línea. Esto termina de
convertirlo en una terminal.

**El prefijo es `//`, no `>`.** El editor YA dibuja un `>` al principio de cada
línea que escribís, así que con el prefijo viejo teclear `//help` se veía en
pantalla como `> >help` — parece un error de la app antes que un comando, y
encima te obliga a repetir el carácter que la interfaz ya pone sola. Era la razón
de que los comandos no se sintieran como que funcionaban.

`//` además es vocabulario de la casa: la clase `.comment` antepone `// ` en
todas las etiquetas de sección (`// EDITOR_CORE`, `// ACCIONES_RÁPIDAS`).

**Cuándo se activa.** No es "en una nota vacía" — al pulsar Enter la nota
contiene el comando. La regla real:

> El contenido **entero** de la nota es **una única línea** que empieza por `//`.

Con cualquier otra cosa, Enter hace lo de siempre. A nadie que esté escribiendo
de verdad se le roba el Enter.

### Los seis que `//help` lista

Son los únicos que no llevan `hidden`, y por eso son exactamente lo que sale en
la ayuda. Un test lo ata al registro (`COMMAND_NAMES`).

| Comando | Qué responde |
| ------- | ------------ |
| `//help` | La lista, con huecos revueltos donde van los que no conocés (§19) |
| `//version` | `FLASH-NOTES v1.0 · NÚCLEO ESTABLE` |
| `//date` | Tu hora, la del sistema y el desfase |
| `//ls` | Tus notas con guías de puntos |
| `//df` | Total escrito, con el medidor ASCII |
| `//clear` | Vacía la nota |

### Y los dieciocho que NO salen en esa lista

Sólo se desbloquean **al usarlos**, no al verlos: hasta entonces su sitio en
`//help` lo ocupa una animación de letras aleatorias (§19). Cada uno **conserva
su posición**: descubrir uno destapa su hueco, no lo añade al final.

**«Fuga de `//help`»** son los seis de la lista blanca (§19); **«ventana de
error»** es cualquiera, porque ésa no filtra (§19). Los demás tienen camino
propio.

| Comando | Qué hace | Cómo se descubre |
| --- | --- | --- |
| `//uptime` | Tiempo desde que abriste la pestaña | Fuga de `//help` · ventana de error |
| `//sudo` | `NO HAY SUPERUSUARIO. NO HAY USUARIOS. HAY UN NAVEGADOR.` | Fuga de `//help` · ventana de error |
| `//log` | El registro de peticiones (§8) | Fuga de `//help` · ventana de error |
| `//date_off` | Descontrola hora **y fecha** (§17) | Fuga de `//help` · ventana de error |
| `//history` | Las versiones guardadas de la nota — **da la cinta perforada** | Fuga de `//help` · ventana de error |
| `//diag` | Abre el panel (§7) | Fuga de `//help` · ventana de error · **Alt+clic** |
| `//ps` | Los procesos que corren de verdad | **La pista del panel** (§7) · ventana de error |
| `//attach_<n>` | Se engancha a un proceso (§15) | Leyendo `//ps` |
| `//art` | El catálogo de piezas. **No da ninguna** (§18) | **Las tres pistas al ganar una pieza** (§18) · ventana de error |
| `//art_<n>` | Dibuja la pieza `n`, si te la ganaste | Lo dice `//art` |
| `//keep` | Deja la última dibujada en una pieza de la colección (§23) | Lo dice `//art_<n>` |
| `//hi` | Saludo que se va agriando (§16) | Probar a saludar · ventana de error |
| `//whoareu` | Quién es ella | Encadenando tras `//hi` (§21) |
| `//howareu` | Qué tal está | Encadenando tras `//hi` (§21) |
| `//whoami` | Que no puede saber quién sos (ver abajo) | Ventana de error |
| `//chaos on\|off` | Enciende o apaga los efectos | Ventana de error |
| `//panic` | Dispara el colapso (§13) | Ventana de error |
| `//reset` | ⚠ **Borra todo, notas incluidas.** Pregunta antes (§22) | Ventana de error |

Y dos más que **sólo existen dentro de la v0.2**, `//todo` y `//recover` — ver
§24.4.

**Tres se niegan a existir hasta que toca**, y contestan exactamente lo mismo que
una palabra inventada. No es un «todavía no»: un «todavía no» confirma que ahí
hay algo y convierte la puerta cerrada en un cartel.

| Comando | Mientras… | Qué contesta |
| --- | --- | --- |
| `//attach_<n>` | no hayas usado `//ps` | `COMANDO DESCONOCIDO: //ATTACH_N` |
| `//art` | no tengas ninguna pieza | `COMANDO DESCONOCIDO: //ART` |
| `//art_<n>` | no tengas ESA pieza | `COMANDO DESCONOCIDO: //ART_N` |

Y **no cuentan como usados**: quien se niega marca su respuesta con `denied`, y
`markUsed` corre después de resolver, así que teclearlos a ciegas no destapa su
hueco en la ayuda con la misma frase que les dice que no existen.


**Dónde se filtran los que aún no conocés:** en las ventanas de error del fallo
cromático (§14) sale alguno suelto. Es a propósito — un secreto que sólo se
alcanza por azar puro es un secreto inalcanzable.

> ⚠ Esa fuga **filtra por versión**. Era una lista calculada una vez al cargar el
> módulo, así que dentro de la v0.2 nombraba comandos de la v1.0, que ahí no
> existen (REGLAS · A5).

Los **nombres** de los comandos no se traducen: son la interfaz de la terminal,
igual que `ls` o `df` en un shell de verdad. Lo que se traduce es lo que el
sistema responde.

### `//whoami` — la limitación es la respuesta

```
NO SÉ. LA COOKIE ES httpOnly — NI YO PUEDO LEERLA.
SOS ESTE NAVEGADOR. NADA MÁS.
```

Es literalmente cierto: la cookie de sesión es `httpOnly`, el JavaScript del
cliente no puede leerla, y el hash que sale en los logs lo calcula el servidor.
El diseño original pedía mostrar ese hash; era imposible sin un endpoint nuevo.
La limitación resultó mejor que la idea.

### `//ps` — los procesos son los tuyos

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

Los cinco primeros son verificables contra el código: 2500 es
`AUTOSAVE_DELAY_MS` de `NoteEditor`, 60000 es `POLL_INTERVAL_MS` de
`useNetworkStatus`, 9000 es la animación `scanline`, 250 el agrupado del medidor.
**El chiste es que no hay chiste.**

El sexto es la única puerta del pong (§15), y sus 16 ms son la pista entera.

### `//date` — el sistema vive en otro huso

La app muestra las fechas **en la hora de tu dispositivo**, pero por dentro el
sistema razona en UTC. Este comando lo enseña:

```
LOCAL     21:14 (UTC-03)
SISTEMA   00:14 UTC
EL SISTEMA NUNCA SE MUDÓ.
```

Con desfase cero la frase cambia, y queda mejor:
`SIN DESFASE. ESTÁS EN LA HORA DEL SISTEMA.`

> ⚠ **Las fechas visibles eran UTC, y eso era un descuido, no lore.**
> `formatDate` y `formatTime` usaban `getUTC*`, así que a alguien en UTC-5, a
> partir de las siete de la tarde la app le mostraba la fecha de MAÑANA en la
> cabecera y en cada nota. Una app de notas que se equivoca de día no tiene
> ninguna gracia.
>
> Ahora usan la hora del dispositivo. El chiste no se pierde — al revés, dice
> algo mejor: **la máquina te traduce la hora, pero por dentro nunca se mudó.**

### La respuesta se teclea, y el ritmo se adapta al largo

Con el mismo motor que la secuencia de arranque, pero más rápido: el arranque es
la máquina despertando, esto es la máquina contestando algo que le preguntaste.
La nota vuelve a quedar vacía sola, y escribir la descarta en el acto.

| | Cuánto | Por qué |
| --- | --- | --- |
| Tecleo | **18 ms** por carácter, **pero como mucho 1,2 s en total** | Con 18 ms fijos, `//help` tardaba **ocho segundos** en aparecer. Sólo se notó usando la app |
| Pausa, respuesta corta | 2 s + 22 ms por carácter, tope **9 s** | Lo que se tarda en leerla |
| Pausa, respuesta **de más de 6 líneas** | **32 s** fijos | No hace falta leer más caracteres: hace falta margen para **desplazarla entera y volver** |
| Borrado | 8 ms por carácter, como mucho 500 ms en total | Más rápido de lo que se escribió |

Todo en `replyTiming.ts`, aparte del editor y probado sin montar nada.

### Nada de esto se guarda — y hay que forzarlo

> **Mientras el contenido sea un comando, el auto-guardado no se programa.**
>
> Sin esa supresión explícita la promesa es falsa: el auto-guardado corre a los
> 2,5 s de la última tecla, así que escribir `//help` y tardar tres segundos en
> pulsar Enter bastaba para que `//help` quedara guardado **y consumiera un punto
> de historial**.

---

# 7 · Panel de diagnóstico

**Cómo se abre.** El comando `//diag`, o **Alt+clic (⌥+clic)** sobre el rótulo de
estado del sistema — y **sólo sobre él**. Antes el manejador estaba en toda la
mitad izquierda de la barra, así que un Alt+clic sobre `[GUARDADO]` o sobre un
mensaje de error también lo abría: un secreto tiene que estar donde dice que
está.

Es Alt y no Ctrl a propósito: en macOS **Ctrl+clic es el clic secundario** y abre
el menú contextual. Y el rótulo se queda como texto plano —sin `role="button"`,
sin `tabindex`— porque meter un objetivo interactivo dentro de una región viva es
incómodo con lector de pantalla; el panel ya tiene su vía por teclado con `//diag`.

Es un `<dialog>` nativo con `showModal()`: trampa de foco, cierre con Escape y
capa superior sin ninguna librería. Usa la misma piel que `ConfirmDialog` —barra
de título en tinta, cuerpo en papel, sin curvas—, y el foco inicial va al botón
de cerrar.

### En la barra de título hay un comando

```
⚙ Diagnóstico del sistema                                    //ps//
```

Eso de la derecha, en gris, **es la única forma de encontrar `//ps`** — y `//ps`
es la única puerta del pong (§15).

Hizo falta porque `//ps` **se sacó de la fuga de `//help`**: es una puerta, y
regalarla es regalar la capa que abre. Pero entonces no quedaba **ninguna** forma
de llegar a ella, y un comando que no se puede encontrar es un comando que no
existe.

**Va envuelto en barras a propósito.** `//ps//` se lee como uno de esos adornos
de cabecera que ponían los programas viejos; `//ps` a secas, junto al título,
sería un cartel que dice «tecleá esto». Y el comando son **los cuatro primeros
caracteres, enteros y tecleables**: un `// ps` con espacio sería más bonito y no
serviría para nada.

**Ésa es la diferencia entre una pista y un cartel: quien mira, la ve.**

Va dentro del `h2` y no debajo —la barra invertida ES el `h2`, así que colgarlo
fuera lo dejaba sobre el fondo del panel y se leía como un dato más—, en
`aria-hidden`, y **no pasa por las traducciones**: no es una frase, es un token, y
es el mismo en los dos idiomas.

**Qué muestra** — once lecturas, en este orden:

```
⚙ Diagnóstico del sistema                                    //ps//

SESIÓN                  NO LEGIBLE
TIEMPO ACTIVO           00:47:12
NOTAS CREADAS           12
BYTES ESCRITOS          8.4kb
INTEGRIDAD              100%
TEMA                    CLARO
SECRETOS                [███░░░░░░░░░░░] 6/28 · SE FIJA
PIEZAS                  [██░░░░░░░░░░░░] 2/16 · LINDO
VSYNC-TEST              42  (7 partidas)
VSYNC-TEST DEGRADADO    SIN DATOS
NÚCLEO                  41°C  ▮▮▮▮▮▯▯▯▯▯

           [EFECTOS: ON]   [✗] Cerrar
```

`SESIÓN` dice `NO LEGIBLE` por lo mismo que `//whoami`. **El panel no inventa un
dato que no tiene.**

`TIEMPO ACTIVO` sólo tictaquea con el panel abierto —no hay un temporizador
colgando de fondo— y **arranca en el inicio de la sesión, no en `Date.now()`**:
con `Date.now()` el servidor y el cliente lo evaluaban en instantes distintos y
React tiraba un error de hidratación en cada carga.

`SIN DATOS` y no un cero en los marcadores del pong: **un cero parecería un
récord malísimo en vez de un hueco.** Se leen en un efecto y no al pintar, por lo
mismo de siempre — `localStorage` no existe en el servidor.

### Los instrumentos se mueven

Decían `INTEGRIDAD 100%` y `NÚCLEO 38 °C` con la señal rota, con tirones cayendo
solos y con el rótulo aporreado. **Un instrumento que marca lo mismo pase lo que
pase no es un instrumento: es un adorno con números** — y el panel es el único
sitio de la app donde lo que ocurre queda registrado. Si no se mueve, la avería
no tiene testigo.

**Dos lecturas, y van en direcciones contrarias a propósito:** la integridad dice
cuánto queda sano y BAJA; el núcleo dice cuánto está costando y SUBE. Con una
sola no se distinguiría «roto» de «forzado».

| Lo que está pasando | Integridad | Núcleo |
| --- | --- | --- |
| La señal cromática está rota (§14) | −18 | +9 °C |
| Hay un tirón **ahora mismo** | −7 | +4 °C |
| Cada clic al rótulo dentro de la ventana (§5) | −3 | +2 °C |

El tirón resta pero **no daña**: mientras dura, baja; cuando pasa, vuelve. Una
caída que no volviera diría que el tirón rompió algo, y no rompe nada.

Y **no sustituye la integridad que viene dada**: el rótulo ya la baja por su
cuenta en escalones fijos, y esto le resta ADEMÁS. Sustituirla borraría lo que el
rótulo acaba de hacer. Todo en `strain.ts`, puro.

`NÚCLEO` es decoración honesta: se deriva del ritmo de escritura —un grado por
cada 12 caracteres por minuto—, va de 38 °C a 71 °C y no pretende medir nada. Se
dibuja con el `ProgressBar` ASCII que ya existía, no con un widget nuevo. **La
barra se dibuja contra la temperatura que se ENSEÑA**, no contra el ritmo pelado:
si no, el número subía con la avería y la barra se quedaba donde estaba.

### `SECRETOS` no es un dato: es una invitación

Cuenta **sólo lo que provocaste vos** (§ [Los 28 secretos](#los-28-secretos-que-cuenta-el-panel)).
Lo ambiental te pasa, no lo encontrás. El total sale de la longitud del registro,
nunca de un número escrito a mano. Y no puede verse en `0/N`: para leer esa fila
ya tuviste que encontrar el panel, así que lo primero que ves es `1/N`.

`6/28` es un dato. **Una barra y un rango son una invitación:** se ve de un
vistazo que falta mucho, y el nombre del escalón siguiente da curiosidad sin
decir de qué va.

| | Escalón | Cuándo |
| --- | --- | --- |
| 0 | `DE PASO` | ninguno todavía |
| 1–4 | `CURIOSO` · `SE FIJA` · `INSISTE` · `CONOCE LA CASA` | se reparten el tramo intermedio |
| 5 | `NO QUEDA NADA` | **todos**, no el noventa por ciento |

> ⚠ **Ningún rango nombra un secreto, y hay un test que lo prohíbe.** Si un
> escalón se llamara «el de la versión vieja», el contador dejaría de dar
> curiosidad para dar instrucciones — y enseñar lo que todavía no encontraste es
> exactamente lo único que no puede hacer.

La barra tiene **14 celdas**, y dos reglas que la salvan de mentir: el primer
hallazgo **siempre** enciende una celda aunque no le toque por proporción
—redondearlo a cero sería decirle a alguien que lo que acaba de encontrar no
cuenta— y la última **sólo** se enciende con todos.

> Sus dos caracteres, `█` y `░`, salen del mismo bloque Unicode a propósito.
> Ninguno está en JetBrains Mono, así que los pinta una fuente de reserva — pero
> **la misma para los dos**, con lo que miden igual y la barra no se descuadra al
> llenarse. Mezclar un bloque con un punto ASCII sí la habría descuadrado
> (REGLAS · C8).

`PIEZAS` va al lado y **con la misma barra**: son la misma pregunta contada de
otra forma —cuánto del sistema conocés— y separarlas en dos lenguajes distintos
haría parecer que una de las dos colecciones importa menos.

**Y lleva `· LINDO` detrás, que no es adorno.** Sin el punto y la coletilla, esta
fila queda más corta que la de `SECRETOS` —que lleva su escalón— y las dos
cuentas dejan de alinearse. De paso dice lo único que la máquina sabe de los
dibujos: **le parecen bonitos.** Es la misma voz naíf del `[BUEN ARTE]` de la
barra de estado (§18) — no sabe qué son, sabe que le gustan.

**Apertura (`signal-lock`, 120 ms, `steps(3)`).** Nada de fundidos: aparece al
60 % de opacidad, desaparece, y aparece al 100 %, como una señal que engancha.

Al pie, el interruptor `[EFECTOS: ON/OFF]`, que persiste.

---

# 8 · Registro de peticiones

**Qué es.** Un búfer circular en memoria con las **últimas 40** llamadas que hizo
el frontend, con el formato del log del servidor.

```
14:52:03  PATCH   /notes/6f2a…/undo   200   84ms
14:51:58  PATCH   /notes/6f2a…        200  112ms
14:51:31  GET     /health             200   19ms
```

Los ObjectId se acortan a cuatro caracteres: los 24 completos empujan la línea
fuera de la caja, y con cuatro alcanza para distinguir una nota de otra.

**Sólo método, ruta, código y duración.** Ni el cuerpo enviado ni el recibido
entran nunca — la regla del proyecto es que el contenido de una nota no se lee, y
acá tampoco. `record()` copia los campos de uno en uno justamente para que un
descuido no deje pasar un cuerpo entero.

Es la pieza que más se parece a un sistema operativo de verdad, porque **no es
decoración: cada línea ocurrió.** Y es lo que le da contenido real al §9.

---

# 9 · El archivo fantasma

**Qué se ve.** En la papelera aparece una nota que nadie creó: `SYSTEM.LOG`.

**Cuándo.** Con la sesión ≥ 10 minutos abierta y ≥ 3 notas **contando las de la
papelera más los borrados definitivos de esta sesión** — que es lo que hay a mano
cuando se mira la papelera, y además es lo coherente: el fantasma habla de lo que
pasó por acá, no de lo que sigue vivo.

Se pregunta **al entrar a la papelera**, no cada tanto por reloj.

**Contenido: tu propia actividad.** No es texto inventado que la imita — es el
volcado del registro real de peticiones (§8). Un archivo fantasma que te muestra
algo verificable es incomparablemente más incómodo que uno que lo simula.

**No es el único intruso de la papelera.** Al ganar tu primera pieza aparece
además `RECUPERADO.bin` (§18), con el mismo patrón —se inyecta en el cliente y
nunca toca la base de datos— y **debajo de éste**: el fantasma lleva más tiempo
ahí, y el orden cuenta quién llegó antes.

**Se distingue siempre.** Lleva etiqueta `[SISTEMA]` en vez de `[ELIMINADA]`. Es
un chiste, no una trampa.

**Si lo borrás, vuelve — por visita, no por reloj.** La próxima vez que entres a
la papelera, si pasaron más de 5 minutos. El diseño original decía "entre 5 y 15
minutos después", y eso no se cobra nunca: entrás, borrás, salís, y no volvés en
toda la sesión.

**Sólo existe en el cliente.** No toca la base de datos, y no es cobardía: su
contenido es tiempo de sesión y peticiones de *esta* pestaña. Una nota que dice
"sesión iniciada" y sigue ahí tres días después no sería más convincente — sería
incoherente. Un log de sesión que sobrevive a la sesión es mentira.

> Su id (`system-log-ghost`) **no es un ObjectId de 24 hexadecimales** a
> propósito: si algún día alguien se descuida y lo pasa a una llamada de la API,
> el validador lo rechaza antes de que salga a la red.

---

# 10 · La papelera lleva la cuenta

El borrado definitivo es la única acción irreversible de la app.

El mensaje del diálogo escala en **cuatro peldaños**, y cada uno dice UNA cosa
más que el anterior:

El escalón se decide por los borrados **anteriores** a éste, así que el que estás
por hacer va siempre uno por delante:

| Borrados previos | El que estás por hacer | Qué dice |
| --- | --- | --- |
| 0–3 | 1.º–4.º | `«X» se borrará para siempre. Esta acción no se puede deshacer.` — genérico, como cualquier app |
| 4–7 | 5.º–8.º | `Como los otros cuatro.` — menciona que estuvo contando |
| 8–11 | 9.º–12.º | `Van ocho. Ninguna vuelve.` — añade que no hay marcha atrás |
| 12+ | 13.º en adelante | `Ya no las cuento por sesión.` — deja ver que lleva un registro aparte |

**Los números van en palabras**, no en cifras: «los otros cinco» pesa más que
«los otros 5» — la cifra es un dato, la palabra es alguien contando. El
repertorio llega hasta *doce*; más allá vuelve la cifra, porque «los otros
cuarenta y dos» escrito a mano sería más frágil que informativo.

Al quinto borrado se marca además el secreto `trash-tally` (§7).

**La progresión es la pieza.** Un único mensaje distinto sería un chiste; cuatro
que se van cerrando es una presencia. Y el último es el que más pesa: hasta ahí
el sistema hablaba de ESTA sesión, y de golpe admite otra cosa.

Ninguno te juzga y ninguno impide nada — sólo informan de lo que estuvo
registrando, que es justamente lo que lo vuelve incómodo. Son cadenas de texto:
sin animación, sin capa nueva.

La cuenta muere con la pestaña: es una observación sobre esta sesión, no un
expediente. El orden de los botones y el foco inicial del diálogo **no cambian**.

---

# 11 · La reconexión

Cuando el servidor vuelve después de haber estado caído, la barra muestra tres
segundos:

```
[RECONECTADO · 00:02:14 A OSCURAS]
```

El dato existía y se tiraba: hasta ahora, recuperarse sólo quitaba el aviso. El
cronómetro **no se reinicia** mientras sigue caído — si cada comprobación fallida
volviera a marcar el inicio, una caída de diez minutos se contaría como el minuto
que hay entre dos sondeos.

Es el mejor tipo de efecto que hay: no lo podés buscar, sólo te lo podés
encontrar, y sólo si algo se rompió de verdad.

**Éste sí se anuncia** al lector de pantalla, a diferencia de los fragmentos: es
información real sobre el estado del sistema, que es para lo que la región viva
existe. Ésa es la línea — si es verdad y te importa, se anuncia; si es atmósfera,
no.

---

# 12 · La línea de barrido se traba

> **El barrido va por encima de TODO.** Estaba en `z-index: 9998` y cualquier
> capa superior lo tapaba, así que desaparecía justo en las pantallas donde más
> sentido tiene — el colapso, el bloqueo, el juego. Es el refresco del tubo, o
> sea una propiedad de la PANTALLA y no de lo que se pinte en ella, así que ahora
> va en 10005 y se ve siempre.

La línea de barrido CRT recorre la pantalla cada 9 s. **Una de cada cuatro
pasadas** se detiene 120 ms a media pantalla y sigue.

```
0%    translate3d(0, -100%, 0)
48%   translate3d(0, 45dvh, 0)   ← se para acá
62%   translate3d(0, 45dvh, 0)   ← el mismo valor: la pausa
100%  translate3d(0, 100dvh, 0)
```

Se eligió trabar la línea en vez de añadir una textura nueva porque **es la firma
de la app**: "la máquina vieja se atasca" se lee mejor en algo que el usuario ya
conoce que en algo que aparece de la nada. Sigue animando sólo `transform`, así
que sigue en el compositor.

---

# 13 · Colapso del sistema

El clímax. Se dispara con la integridad a 0 (nueve clics en el rótulo) o con
`//panic`.

**Dura 3,12 s de caída más lo que tarde en volver** — entre 8 y 25 segundos,
sorteados en cada colapso, y más si venís insistiendo (ver la escalada).

### La secuencia

| | Tramo | Desde | Hasta |
| --- | --- | --- | --- |
| 1 | Corte | 0 ms | 150 ms |
| 2 | Interferencia | 150 ms | 2,2 s |
| 3 | **Barras de color** | 2,2 s | 2,72 s |
| 4 | Pantalla muerta | 2,72 s | 3,12 s |
| 5 | Rearranque | 3,12 s | + 8–25 s |

**1 · Corte — 0 a 150 ms.** Todo a tinta plana de golpe. Un fotograma, sin
fundido: la señal se corta, no se desvanece.

**2 · La interferencia — 150 ms a 2,2 s.**

**No es ruido de píxeles**, y tampoco es una sola textura. El ruido de píxeles es
la estática de una televisión y esta app es una terminal de texto; pero además,
la primera versión de la interferencia mezclaba treinta caracteres distintos en
cada fotograma y quedaba **peor**: una sopa sin forma.

Lo que hace que una interferencia se vea bien es la **estructura**, no la
variedad. Así que hay **cuatro modos**, cada uno con dos o tres caracteres nada
más, y la señal va saltando de uno a otro cada cinco fotogramas — como si
buscara engancharse y no lo consiguiera.

| Modo | Glifos | Qué se ve |
| ---- | ------ | --------- |
| `bars` | `█▓▌` | Bandas horizontales gruesas que bajan. La más limpia y la que mejor se lee como avería. Los bordes se deshilachan: una banda de canto perfecto parecería una caja dibujada. |
| `snow` | `░░░░░░▒▒▓` | Grano medio, con densidad propia por fila (de 0,12 a 0,5) — las vetas horizontales que el ojo reconoce como ruido. Los glifos van **repetidos para pesar la tirada**: `░` sale seis de cada nueve veces y `▓` sólo una. Con los tres por igual la nieve salía como un muro blanco, porque los tres sombreados son claros. |
| `dots` | `·:.` | Granito fino y escaso. Es el respiro entre las densas. |
| `nosignal` | `▄▀` | Casi todo vacío, con algún trazo suelto cada siete filas. Una pantalla que ya ni ruido consigue producir. |

El ciclo es **fijo, no aleatorio**: `snow → bars → nosignal → dots → snow →
nosignal`. Una secuencia se lee como un aparato recorriendo estados; el azar puro
se lee como parpadeo. Y `nosignal` va intercalado entre las densas para que la
pantalla respire — sin esos huecos, dos segundos de ruido continuo cansan y dejan
de dar miedo.

Todo a **12 fotogramas por segundo**, y escrito con `textContent` directamente
sobre el nodo: son miles de caracteres doce veces por segundo, y un `setState`
por fotograma repintaría el árbol de React cada 83 ms.

**3 · Las barras de color — 2,2 a 2,72 s.** Las mismas siete barras SMPTE del
arranque del monitor (§25), entre la estática y el apagón.

Es lo que hacía un televisor al perder la señal de verdad: primero nieve, después
la carta de ajuste, y sólo entonces se apagaba. **Sin ellas, la estática se
apagaba a secas y el fallo parecía un corte de luz; con ellas, parece un equipo
que se rindió por su cuenta.** Cortas a propósito: son un latido dentro de la
caída, no una parada.

**4 · Pantalla muerta — 2,72 a 3,12 s.** El tubo se apaga: `scaleY(1) →
scaleY(0.02)`, queda una línea horizontal brillante, la línea se cierra a un
punto, negro.

**5 · Rearranque — a partir de 3,12 s, y dura lo suyo.**

Las líneas **no salen de golpe: van saliendo a medida que carga.**

| Barra | Línea |
| ----- | ----- |
| 5 % | `> REINICIANDO NÚCLEO...` |
| 32 % | `> VERIFICANDO MEMORIA...` |
| 58 % | `> MEMORIA: OK` |
| 78 % | `> RECUPERANDO ARCHIVOS...` |
| 95 % | `> NOTAS: 12 RECUPERADAS` |

Con las tres puestas desde el primer fotograma, la barra era decorativa: ya
sabías el final antes de que empezara. Apareciendo por etapas, la barra cuenta
algo — cada tramo que avanza recupera una pieza más.

Y la última llega **al 95 %**, no antes: que la máquina te diga que tus notas
están enteras justo al final, después de haberte hecho esperar, es lo que hace
que el chiste no dé miedo. `NOTAS: N` usa el número real.

> ⚠ **La pantalla de colapso seguía el tema al REVÉS.** Usaba `--color-ink` de
> fondo y `--color-inverse` de letra, que es la fórmula de la cabecera y la barra
> de estado — pero esos tokens se invierten con el tema a propósito (ver
> `DISENO.md`): en tema oscuro, `ink` es casi blanco. Quien tenía la app en
> oscuro se comía un fogonazo blanco en mitad de la pantalla. Ahora usa
> `--color-primary` y `--color-ink`, así que es oscura en tema oscuro y clara en
> tema claro, como todo lo demás.

**Tarda entre 8 y 25 segundos**, sorteado en cada colapso — y más si venís
insistiendo (ver la escalada, abajo).

**La barra no es decoración.** Medio minuto de pantalla negra sin nada se lee
como que la app se colgó; con la barra se lee como que está trabajando. Usa los
mismos bloques `▮▯` que el medidor de la barra de estado, más un tiempo estimado
que baja: es la app contándote algo con sus propios caracteres, no un widget de
otra familia.

```
[▮▮▮▮▮▮▮▮▮▯▯▯▯▯▯▯▯▯▯▯▯▯▯▯] 37%
TIEMPO ESTIMADO: 19s
```

**6 · Vuelta — y el equipo termina de arrancar.** La capa se retira sin fundido,
la integridad vuelve a 100 y **empieza a correr la ventana de la escalada**
(`registerRecovery`). Y entonces el monitor hace lo que hace un equipo que se
apagó: **arranca** (§25), desde las barras.

```
carga  →  barras  →  rótulo  →  comprobación  →  inicio
```

**Desde las barras, no desde el apagón**, porque el apagón ya lo hizo el propio
colapso en su tramo 4. Antes la app volvía de golpe en cuanto la barra de carga
llegaba al final, y eso contaba que **el sistema se recuperó solo** — que es
justo lo que no pasó: se cayó, y hay que encenderlo.

> Durante todo esto, `<html>` lleva `data-collapsing`. Las capas de glitch y el
> barrido viven fuera de este árbol y tienen que saber que hay un colapso encima
> para subirse por arriba y pintarse con luz en vez de con tinta. Un atributo en
> la raíz es el único sitio desde el que se alcanza todo, y ya es el patrón de la
> casa (lo mismo hacen `data-failing` y la v0.2).

### Lo que más importa no se ve

**La capa lleva `pointer-events: none` y el foco no se mueve.** Durante los 4,2 s
el editor sigue montado debajo, el auto-guardado sigue su curso, y **podés seguir
escribiendo a ciegas contra la pantalla negra**: todo lo que tecleás llega.

Y el remate del tono: lo primero que hace la máquina al volver es contarte que
tus notas están enteras. Es lo que separa el chiste del susto.

**Con `prefers-reduced-motion`** se reduce a un corte a negro de 400 ms con el
texto de rearranque ya escrito. Sin ruido, sin animación.

### Si insistís, el sistema deja de tomárselo bien

Los colapsos dentro de una ventana de **cinco minutos** se cuentan. Fuera de esa
ventana, la cuenta vuelve a empezar: la escalada castiga insistir en una sesión,
no volver mañana.

| Veces seguidas | Rearranque | Fallos |
| -------------- | ---------- | ------ |
| 1–2 | 8–25 s | normales |
| 3–4 | +8 s | más fuertes (×1,5) |
| 5 | +20 s | mucho más fuertes (×2) |
| **6** | **no llega** | los más fuertes (×3) |

Las dos primeras veces se reproduce igual a propósito: el efecto tiene que poder
verse un par de veces sin castigo, o nadie llegaría a conocerlo entero.

A partir de la tercera, además, **el propio texto de rearranque tiembla** — la
pantalla que te está diciendo que todo va bien ya no consigue quedarse quieta.

> ⚠ **El umbral estaba en diez, y era inalcanzable.** La ventana se medía desde
> el colapso anterior, pero los rearranques ocurren DENTRO de la ventana: con
> 10–40 s cada uno más la escalada, llegar a diez consumía más de seis minutos
> sólo en pantallas de carga, y la ventana de cinco se cerraba antes. Nadie podía
> llegar nunca, y nada lo delataba.
>
> Dos arreglos. **La ventana se mide desde que el sistema SE RECUPERÓ**, no desde
> que se rompió: la escalada castiga insistir, y contar el rearranque castigaba
> al usuario porque la máquina es lenta. Y el umbral baja a **seis** — cinco deja
> dos reproducciones limpias y dos escalones, y la progresión no llega a
> sentirse; seis da dos limpias, dos intermedias, una fuerte y el bloqueo.
>
> Con una excepción: si rompés el sistema **antes** de que llegara a recuperarse,
> la racha sigue. Es el caso más insistente que hay y cortarla ahí sería
> exactamente al revés.

### Dos caminos al bloqueo

**Seis colapsos seguidos** dentro de cinco minutos, **o romper el sistema
mientras la señal ya está rota**. Esa combinación va directo al fallo crítico sin
pasar por el contador: son dos averías ocurriendo a la vez, y eso ES la condición
crítica — pedir además cinco colapsos más sería contar dos veces lo mismo, y
quien combinó las dos cosas a propósito merece el desenlace, no un contador.


> ⚠ **La pantalla de error tapaba su propia entrada.** `registerCollapse` activa
> el bloqueo de forma SÍNCRONA, así que la pantalla de error (z-index 10001) se
> pintaba en el mismo instante y cubría el colapso (10000) antes de que
> empezara: no se llegaba a ver ni la estática ni la barra trabándose. Justo la
> secuencia que da sentido al desenlace, y sin ningún error que lo delatara.
>
> Ahora la pantalla de error espera a que el colapso termine.

### La pantalla de carga también falla, y cada vez más

Los fallos no aparecen de golpe en el nivel crítico: **van entrando con la
escalada**, en la propia pantalla de recuperación.

| Veces | Rearranque | Fallos | En la pantalla de carga |
| ----- | ---------- | ------ | ----------------------- |
| 1–2 | 8–25 s | normales | ninguno |
| 3–4 | +8 s | ×1,5 | uno cada 4,2 s |
| 5 | +20 s | ×2 | uno cada 2,1 s |
| **6** | **no llega** | ×3 | **casi uno por segundo, con ventanas** |

Es la escalada contada donde más se nota: no en un número, sino en que **ni la
pantalla que debería estar recuperando el sistema consigue sostenerse a sí
misma**.

### El bloqueo · al sexto colapso

**El rearranque ARRANCA y se traba.** Saltárselo era peor: la barra que empieza a
subir y se queda clavada entre el 52 % y el 83 % cuenta el fallo mucho mejor que
no intentarlo — primero te hace creer que vuelve. El tope se sortea para que no
falle siempre en el mismo punto, que es lo que delataría que estaba guionado.

Y las líneas **se van torciendo** en vez de salir bien: empieza igual que
siempre, y a cada tramo le sale peor.

| Barra | Línea |
| ----- | ----- |
| 5 % | `> REINICIANDO NÚCLEO...` |
| 30 % | `> VERIFICANDO MEMORIA...` |
| 52 % | `> MEMORIA: ERROR DE PARIDAD` |
| 70 % | `> REINTENTANDO...` |
| 85 % | `> REINTENTANDO...` |

Es más incómodo que un error de golpe, porque durante los dos primeros tramos
parece que va a salir bien. Después de 1,6 s congelada, la máquina lo admite:

```
[▮▮▮▮▮▮▮▮▮▮▮▮▮▯▯▯▯▯▯▯▯▯▯▯] 53%
TIEMPO ESTIMADO: --

> FALLO EN LA VERIFICACIÓN DE MEMORIA
> EL NÚCLEO NO RESPONDE
```

Y ahí sí queda **la pantalla de fallo crítico**, que es la que trae el puzzle.

## El puzzle · cómo se resuelve

Esto es lo que se ve, entero:

```
┌───────────────────────────────────────────────┐
│ ⚠ FALLO CRÍTICO                        0xDEAD │
├───────────────────────────────────────────────┤
│ EL NÚCLEO NO PUDO REINICIARSE.                │
│                                               │
│ SUBSISTEMA          NÚCLEO / MEMORIA          │
│ ESTADO              SIN RESPUESTA             │
│ INTENTOS            03                        │
│                                               │
│ LA MEMORIA ESTÁ CORRUPTA EN UNA POSICIÓN.     │
│                                               │
│ OFFSET       VOLCADO 0x0000–0x003B            │
│ 0000  7F 3A 2B 91 4C E0 15 7F 3A 2B           │
│ 000A  91 4C E0 15 7F 3A 2B 91 4C E0           │
│ 0014  15 7F 3A 2B 91 4C E0 15 7F 3A           │
│ 001E  2B 91 4C E0 15 7F 3A 2B 91 4C           │
│ 0028  E0 15 7F 3A 2B 91 4C E0 15 7F           │
│ 0032  3A 2B 91 4C E0 15 7F 3A 2B 91           │
└───────────────────────────────────────────────┘
```

**La rejilla es de 10 columnas por 6 filas: 60 celdas.** Los offsets van de
diez en diez en hexadecimal — `0000`, `000A`, `0014`, `001E`, `0028`, `0032` — y
el encabezado lo dice: el volcado cubre de `0x0000` a `0x003B`.

### Cómo se resuelve, paso a paso

1. **El volcado repite un patrón de siete bytes.** En el ejemplo de arriba,
   `7F 3A 2B 91 4C E0 15`, una y otra vez hasta llenar las 60 celdas. Los
   siete son distintos entre sí: dos iguales harían que la repetición se leyera
   peor y el fallo costara más de encontrar **por el motivo equivocado**.
2. **Una sola celda no sigue el patrón.** Hay que encontrarla.
3. **Se hace clic en esa celda** y el sistema se recupera en el acto. Cada celda
   es un `<button>` de verdad.
4. **Si te equivocás**, sale `ESA NO. RELEYENDO…` durante 600 ms, sube el
   contador de `INTENTOS` — y **el volcado se rehace entero**: patrón nuevo y
   celda rota nueva.

### Por qué cuesta encontrarla

**Siete es primo con diez, y ahí está toda la dificultad.** El patrón era antes
de cinco bytes, y cinco divide a diez: la repetición caía en columnas perfectas
—cada columna mostraba siempre el mismo byte— y la celda rota saltaba a la vista
sin buscarla. Se resolvía de un vistazo y no era un puzzle.

Con siete, **el patrón se corre una columna en cada fila** y tarda siete filas en
volver a alinearse; como el volcado tiene seis, ninguna fila repite la alineación
de otra. Hay que leer el patrón de verdad en vez de escanear una columna. Un test
lo fija calculando el máximo común divisor: si alguien cambia el ancho de la
rejilla, salta.

**El byte roto es el que tocaba con UN dígito hexadecimal cambiado.** Antes era
un byte al azar y cantaba demasiado: entre bytes repetidos, uno sin ninguna
relación se ve de lejos. Si en la posición tocaba `4C`, la celda rota dice `4E`
o `9C` — no `E9`.

> **Difícil no es lo mismo que imposible.** El resultado **nunca puede coincidir
> con otro byte del patrón**, o la celda se leería como parte de la repetición y
> el puzzle se quedaría sin solución visible. Se construye la lista de las
> treinta variantes de un dígito, se descartan las que ya están en el patrón, y
> se sortea entre las que quedan.

**Nunca es la primera celda.** Sin patrón establecido todavía, no habría con qué
compararla y el puzzle sería injusto.

### Tres decisiones que lo definen

**No lleva instrucciones**, y es deliberado: una rejilla que repite un patrón con
una celda distinta se resuelve mirando, y explicarlo lo convertiría en un
formulario. Lo único que dice es `LA MEMORIA ESTÁ CORRUPTA EN UNA POSICIÓN.` —
eso no es la instrucción, es **el síntoma**: la máquina informando de su avería,
como informa de todo lo demás en este cuadro. Que además sea exactamente lo que
hay que saber es cosa tuya.

**Se resuelve con un clic y no escribiendo** porque el teclado es del editor, que
sigue vivo debajo. Pedirte que escribas acá te robaría las pulsaciones.

**Errar rehace el volcado entero.** Sin eso, cada fallo sólo tacharía una celda y
el puzzle se resolvería por descarte: sesenta clics y listo. Rehaciéndolo, cada
intento vuelve a ser una búsqueda. Lo que **no** hace es regenerarse en cada
render: ahí el byte saltaría de sitio mientras lo mirás, que sería tramposo en
vez de difícil.

### Y encima, la memoria corrupta se VE corrupta

El cuadro entero lleva la misma aberración cromática del fallo del tema, y el
volcado tiembla un poco más que el resto porque es lo que hay que leer. No es
sólo decoración: partir los canales de un volcado hexadecimal lo vuelve
**materialmente más difícil de escanear**, que es exactamente lo que tiene que
ser un puzzle que te bloquea la pantalla. Ver una irregularidad en una cuadrícula
limpia es fácil; verla con los dígitos temblando, no.

El cuadro **se sacude además con los mismos tirones que el resto del sistema**:
uno quieto en mitad de una pantalla que falla se lee como si estuviera en otra
capa de realidad.

> El filtro SVG se publica desde este componente y no se da por puesto: esta
> pantalla puede aparecer sin que el fallo cromático haya ocurrido nunca, y con
> la señal sana nadie lo había metido en el DOM todavía.

Las columnas ocupan el ancho entero del cuadro: un volcado de verdad llena su
caja, y además las celdas separadas son objetivos más grandes y más fáciles de
comparar entre sí.

### Sobrevive a recargar, y es lo único que lo hace

Recargar es la salida fácil de cualquier otro efecto; acá justamente no la hay.
Se guarda **el instante de vencimiento**, no un booleano, así que la espera corre
aunque cierres la pestaña.

Y se guarda además **si la señal ya estaba rota** cuando el bloqueo empezó. Sin
eso pasaba algo que no cuadraba: rompías la señal, entrabas en fallo crítico,
recargabas, resolvías el puzzle — y la app volvía impecable. Resolver el puzzle
acababa arreglando una avería que el puzzle no toca.

> **Y se lee antes del primer pintado.** El bloqueo no se puede leer al montar
> sin más: durante un fotograma se pintaba la app NORMAL, así que al recargar en
> pleno fallo crítico se veía la pantalla de inicio un segundo antes de volver al
> error — **recargar parecía funcionar, que es justo lo que este estado niega**.
>
> La solución es la misma que ya usan el tema y el idioma: un script en línea y
> síncrono (`LOCKOUT_BOOT_SCRIPT`) que marca `<html>` con `data-booting-locked`
> antes de pintar. React sigue hidratando lo mismo que el servidor —el atributo
> lo pone el navegador, no el árbol— y el CSS tapa la app hasta que la capa de
> bloqueo se monta de verdad.
>
> El arranque del monitor (§25) hace lo suyo: con el bloqueo puesto **se queda en
> las barras** y no enseña ni el rótulo ni la comprobación de memoria. Un equipo
> bloqueado no llega a arrancar, y contarle que arrancó bien justo antes de
> decirle que no arrancó sería peor — además de obligarle a esperar hasta ocho
> segundos para volver a leer el mismo error.

### Sin excepciones: todo lo que aparezca se ve roto

Es una regla, no una lista de casos. Durante la avería, `<html>` lleva
`data-failing`, y el CSS alcanza desde ahí **cualquier cosa que aparezca, esté
donde esté en el árbol**.

Hizo falta porque el filtro va sobre `.container-terminal`, y un `<dialog>`
abierto con `showModal()` se pinta en la **capa superior del navegador** — fuera
de ese subárbol. El panel de diagnóstico salía impecable en mitad de una pantalla
rota. Lo mismo le pasaría a cualquier cosa que se montara fuera del contenedor.

Con la marca en la raíz la regla vale también para lo que se construya después:
si aparece, se ve roto.

### El rojo es el de la papelera, y se usa igual

`--color-danger` se invierte con el tema —`#8c2118` en claro, `#e08272` en
oscuro—, así que **de relleno** daba un ladrillo oscuro en un tema y un salmón
claro en el otro: dos cuadros que no parecían el mismo.

En la papelera, el borrado definitivo usa el rojo como **color de texto** sobre
las superficies de siempre (`.btn-terminal.is-danger`), nunca como fondo, y por
eso se lee igual en los dos temas. La pantalla de fallo hace lo mismo: la barra
de título es tinta como todos los diálogos de la app, y el rojo aparece sólo
donde marca algo — el aviso, el código y el estado.

### El estado crítico: todo falla a la vez

El bloqueo no es una pantalla quieta con un puzzle. Es **el estado más roto del
sistema**, y arrastra todo lo del fallo cromático más lo suyo propio:

- **La aberración cromática** sobre la app entera y sobre el cuadro de error.
- **Los tirones**, cada 2,5 a 9 segundos, con el nivel mínimo en `major` — los
  del clic 7, con sus franjas, sus rebanadas y su caída de nivel. **El cuadro del
  puzzle también se sacude**: uno quieto en mitad de una pantalla que falla se
  lee como si estuviera en otra capa de realidad.

  > Las capas del fallo suben a z-index 10003 durante el bloqueo. Sin eso
  > quedaban debajo de la pantalla de error (9994–9996 contra 10001) y no se veía
  > ninguna: los tirones se notaban sólo en el temblor del cuadro, sin nada más.
  > Ninguna recibe eventos, así que estar encima no impide resolver el puzzle.
- **El tema cambiando solo**, cada 5–14 s, con sus ráfagas de cuatro
  inversiones a 120 ms.
- **Las franjas de color** bajando por encima de todo.
- **Hasta cinco ventanas de error** que **no se cierran nunca** y salen **de a
una** — ver abajo.

> Que el bloqueo se comportara como un estado tranquilo era un descuido de
> bulto: cada pieza preguntaba por `chromaticFailure` y ninguna se acordaba de
> `lockedOut`. Ahora hay un solo concepto, `isSystemFailing()`, para que la
> próxima pieza no pueda acordarse de uno y olvidarse del otro.

### Las ventanas que no se van

Con la señal rota, las ventanas fantasma se cierran solas y hay como mucho tres.
**Durante el bloqueo no se cierran, y caben cinco.** La pantalla se va llenando.

Y salen **de a una**, no en tanda: la pantalla se llena poco a poco. Cinco de
golpe sería un susto; de a una es una degradación, que es lo que este estado
tiene que contar.

Es la diferencia entre los dos estados: con la señal rota el sistema todavía se
recompone solo; con la memoria corrupta ya no limpia nada.

**Sobreviven a la recarga.** El bloqueo persiste y ellas son parte de él: volver
y encontrarse la pantalla de error limpia daría a entender que recargar sirve de
algo, que es justo lo que este estado niega. Se borran cuando se borra el
bloqueo, no antes.

> Se recuperan en un efecto, no en el primer render. En ese primer render
> `useSyncExternalStore` todavía devuelve el estado del SERVIDOR —donde
> `lockedOut` es false y no hay almacenamiento—, así que un inicializador
> perezoso leía siempre cero ventanas y la recuperación no ocurría nunca.
> Sembrarlas ahí, además, daría un desajuste de hidratación: el servidor pinta
> cero y el cliente tres.

**No se pueden cerrar de ninguna manera**, y no porque se lo impidamos: llevan
`pointer-events: none`, así que ni siquiera reciben el clic, y encima huyen si
les acercás el cursor. Durante el bloqueo suben por encima de la pantalla de
error (si no, no se verían) — pero como no reciben el puntero, **taparte el
puzzle no te impide resolverlo**: el clic las atraviesa. Acercar el ratón a una
celda es también lo que espanta a la ventana que la tapa.

**Hay dos salidas, y sólo una se cuenta.** Encontrar el byte es la que el usuario
puede accionar. La otra —a los cinco minutos se levanta solo— existe para que
nadie quede encerrado de verdad, pero **no se anuncia**: decirlo convierte el
puzzle en opcional y el estado en una cuenta atrás. Que la salida exista y no se
sepa es lo que mantiene la tensión sin crear una trampa.

Las dos **cortan la racha de colapsos**. Si no, el colapso siguiente volvería a
bloquear en el acto y el puzzle no habría servido de nada.

### Entrar y salir son DOS piezas distintas

| Momento | Pieza | Dónde se da |
| --- | --- | --- |
| **Caer** en el fallo total | **POLILLA** (§18 · 1) | `startLockout` |
| **Resolver el puzzle** | **LLAVE** (§18 · 16) | el clic acertado, en `SystemLockout` |
| Esperar a que venza | *(nada)* | — |

**Caer ahí dentro le pasa a cualquiera; salir por la puerta buena, no.** La
polilla es la primera avería informática documentada —un bicho dentro de un relé,
1947, y de ahí viene «bug»— y acabás de ver una de verdad. La llave lleva desde
antes de tener camino el pie que le tocaba: *«la cerradura ya no existe»* —
encontrás la salida de algo que, en cuanto sale, deja de estar.

**Esperar no da nada, y ésa es la decisión.** La llave se da en el clic acertado
y no en `clearLockout`, que es por donde pasan las dos salidas: **una llave que
se gana esperando no abre nada.**

> ⚠ **El faro estuvo acá y se fue.** Premiaba «pasar por el bloqueo y salir», y
> al repartirse el bloqueo en dos —entrar y resolver— un tercer premio por el
> mismo sitio era **el mismo logro cobrado tres veces**. Ahora premia otra cosa
> (§18 · 12).

**No roba el teclado.** La capa captura clics porque el puzzle los necesita, pero
no enfoca nada: el editor sigue montado debajo y lo que teclees sigue llegando y
guardándose. La pantalla está tapada; el trabajo, no.

---

# 14 · Fallo cromático

**El único sitio de toda la app donde hay color.**

Eso no contradice la regla del monocromo: esa regla gobierna **cómo se construye
la interfaz**. Esto no es interfaz — es una avería que provocaste vos, y una
señal rota se ve en color porque así se ve una señal rota. Una regla de
construcción y un huevo de pascua son cosas distintas.

**Cómo se dispara.** **Diez pulsaciones seguidas** del interruptor de tema, con
menos de **1,2 s** entre una y otra. Con pausas, la cuenta se reinicia. Nadie
cambia de tema diez veces seguidas sin querer: hay que ensañarse con el botón, y
ese ensañamiento es el gesto que el secreto premia.

### Qué pasa

**Aberración cromática permanente, sobre toda la superficie.** No sólo el texto:
los bordes de los botones, los fondos de las barras, los bloques del medidor
ASCII y las guías de puntos se parten igual en un fantasma rojo y otro cian.

> Esto se hace con un **filtro SVG** (`feColorMatrix` + `feOffset` + `feBlend`),
> no con `text-shadow`. El text-shadow sólo alcanza al texto, y con él la avería
> se veía a medias: justo las piezas con más presencia visual —los botones, las
> barras invertidas, el medidor— eran las que no fallaban. El filtro trabaja
> sobre lo **ya renderizado**, así que le llega a todo sin importar de qué esté
> hecho.
>
> `color-interpolation-filters="sRGB"` no es opcional: el valor por defecto
> (`linearRGB`) lava los colores y deja un fantasma gris en vez de rojo y cian.

Hay **tres variantes** del filtro con desplazamientos distintos, y la animación
las intercambia de golpe cada 1,5 s (`chroma-swap`, `steps`): la aberración se
mueve en lugar de quedarse clavada — que es lo que separa una señal rota de una
foto de una señal rota. El ciclo es largo a propósito: cada salto vuelve a
correr el filtro sobre toda la página, así que son cuatro repintados por segundo
y medio, no sesenta.

Encima de eso, el texto lleva además su propio temblor de canales cada 1,6 s
(`chroma-drift`), que se suma al filtro y le da al texto un grado más de
inestabilidad que al resto.

**Un tirón cada 5,2 s** (`chroma-jolt`), y sólo en el último 8 % del ciclo: una
pantalla averiada da un salto cada tanto, no tiembla sin parar.

**Franjas de color** bajando por la pantalla cada 2,8 s (`chroma-roll`), en
`mix-blend-mode: screen`.

**El tema se sacude solo, de dos maneras.**

*La sacudida suelta.* Cada **5 a 14 segundos**, la app pasa de claro a oscuro o
al revés y se queda ahí. El intervalo es irregular a propósito: a intervalo fijo
se convierte en un latido y el ojo lo empieza a anticipar.

*La ráfaga.* **Una de cada tres** sacudidas no es una: son **cuatro
inversiones seguidas** separadas 120 ms — claro, oscuro, claro, oscuro, claro. Un
saltazo: la señal se cae de golpe y vuelve.

El número de pasos es **par** a propósito: impar dejaría el tema cambiado al
terminar, y la ráfaga se leería como una sacudida suelta más larga en lugar de
como un temblor.

> **Sobre la velocidad, decisión tomada a conciencia.** A 120 ms la ráfaga supera
> el umbral de destellos de la WCAG 2.3.1 (no más de tres por segundo en un
> cambio de luminancia a pantalla completa). Se acepta porque hay que provocarla
> a propósito con diez pulsaciones de un botón, porque es esporádica —una de cada
> tres sacudidas, que ya son cada 5–14 s— y porque `prefers-reduced-motion` la
> desactiva por completo, que es la salida real para quien la necesita.
>
> Si algún día esto se pone delante de un público que no eligió activarlo, el
> valor vuelve a subir.

Durante la avería, además, **ningún cambio de tema se suaviza**: la app fuerza
`transition: none`. Un fundido elegante entre claro y oscuro es exactamente lo
contrario de lo que esto cuenta.

> **La sacudida no te rompe la preferencia.** Cambia lo que se ve sin tocar
> `localStorage`, así que recargar —que es lo único que arregla el fallo— te
> devuelve el tema que vos elegiste. Un chiste que te deja la configuración
> cambiada deja de ser un chiste. Tampoco se contagia a otras pestañas.

**El interruptor queda inservible** y lo dice: pasa a `[✗ SEÑAL]`,
deshabilitado, con un nombre accesible que explica que hay que recargar. Un
control que no responde y no se explica se lee como un defecto; uno que dice qué
le pasó, como una avería.

**No se arregla solo.** Es el único estado de la app que no se puede deshacer
desde la propia app.

**Los fallos ambientales NO se apagan: suben de nivel y caen seguido.** La
primera versión los bloqueaba durante la avería, y era al revés de lo que hacía
falta — una pantalla ya rota que además deja de dar tirones se ve extrañamente
estable.

Con la señal rota **nunca hay fallos leves**: el mínimo pasa a ser `major`, que
es exactamente el nivel del clic 7 del rótulo — rebanadas desplazadas, fantasma
monocromo y caída de nivel. Un parpadeo suave sobre una pantalla ya averiada no
se nota.

Y caen **cada 2,5 a 9 segundos**, irregulares. El ritmo NO se deriva del de
reposo: se reemplaza. Dividir el intervalo ambiental por tres seguía dando más de
un minuto entre tirones, y en una pantalla que ya está rota eso se siente como
que no pasa nada. Irregular a propósito, para que **salten por ahí** en vez de
latir.

> ⚠ **Trampa de CSS que costó encontrar.** `.glitch-jolt` y `.chromatic-failure`
> declaran las dos la propiedad `animation`, y eso **no se suma**: con la misma
> especificidad gana la que va después en la hoja y la otra desaparece entera.
> Como el bloque de la avería está más abajo, **el tirón no se reproducía nunca**
> mientras la señal estaba rota — justo donde más se lo espera, y sin ningún
> error que lo delatara.
>
> La solución es declarar la combinación explícitamente (`.chromatic-failure
> .glitch-jolt`, dos clases, más específica) con los dos conjuntos en la misma
> lista. El orden importa: `glitch-jolt` va **al final** porque anima `transform`
> igual que `chroma-jolt`, y dentro de una lista de animaciones la última gana
> esa propiedad. Y `chroma-jolt` se cae de la lista a propósito: durante un tirón
> de verdad, el temblor suave de la avería sólo compite.

### Ventanas de error que se abren solas

Cada **7 a 19 segundos**, en algún punto de la pantalla, se abre un cuadro de
error del sistema y desaparece. **Una de cada cuatro veces se abren dos o tres a
la vez**, escalonadas 140 ms — una cascada de errores se lee como que el sistema
se está cayendo; una sola, como que hipó. Nunca más de tres: por encima deja de
leerse como avería y empieza a leerse como que la app está rota de verdad. Nadie lo abrió y nadie lo cierra. Trae
la cruz `[X]` dibujada y no sirve para nada: es una ventana que no es tuya.

**Se queda entre 1,4 y 14 segundos**, sorteado cada vez. A veces se va enseguida
y a veces se queda un buen rato: con una duración fija se convierte en un pulso
reconocible y deja de sorprender, y que a veces se quede es lo que hace que la
próxima vez no sepas si va a irse.

**Se aberra como todo lo demás.** Vive fuera de `.container-terminal`, así que el
filtro de la app no le llega y hay que aplicárselo aparte — con él, sus bordes,
su barra de título y su fondo se parten en rojo y cian igual que los botones.

El temblor del texto va más lento que el de la app (2,3 s contra 1,6 s) para que
se lea como otra superficie. Y cuando hay varias abiertas, cada una va
desfasada: tres temblando al unísono se leerían como una sola superficie partida
en tres, no como tres ventanas.

**Y se aparta si le acercás el cursor** — sólo la que tenés encima. Si huyeran
todas a la vez se leería como que la pantalla se sacude, no como que esa ventana
te esquiva. Es lo que la convierte de adorno en
presencia: una ventana que te esquiva está claramente ahí y claramente no es
tuya. El detector va en `window` y no en la propia ventana — con
`pointer-events: none`, que es lo que impide que te coma un clic, los eventos de
ratón nunca llegarían al elemento y un `onMouseMove` suyo no se dispararía
jamás.

**No es un `<dialog>`, y ésa es la decisión importante.** Un diálogo de verdad
atrapa el foco, se lleva el Escape y bloquea la página: te sacaría del editor en
mitad de una frase para enseñarte un chiste. Esto es un cuadro pintado encima,
con `pointer-events: none` y `aria-hidden`, que no puede robarte nada.

Los mensajes hablan siempre de la **señal y del subsistema de vídeo**, nunca de
tus notas ni de guardar:

```
0x1F3A  SEÑAL DE VÍDEO FUERA DE RANGO
0x00C4  SINCRONISMO VERTICAL PERDIDO
0x7E01  CANAL CROMÁTICO SIN CALIBRAR
0x2B08  BÚFER DE PANTALLA DESALINEADO
0x5D12  NO HAY TÉCNICO EN ESTE TURNO
0x0A99  REINTENTANDO… REINTENTANDO… REINTENTANDO…
```

Un error falso que mencionara tus datos daría un susto de verdad, y la regla 1
dice que nada puede aparentar pérdida de trabajo. Éstas son averías de pantalla,
que es exactamente lo que está pasando.

La ventana **no se aberra**: vive fuera del contenedor, así que el filtro no le
llega. Queda nítida sobre la app rota, y eso se lee como que el sistema está
entero y lo que falla es la señal.

### El rojo es el de la casa

`--chroma-red` es **`--color-danger`**, el mismo rojo con el que la app pinta un
borrado definitivo o una nota sin guardar. No es un color nuevo: que la avería
use el rojo de la casa y no uno inventado es lo que la mantiene dentro del
sistema — y como el token se invierte con el tema, la avería se ve distinta en
claro y en oscuro sin declararla dos veces.

El cian no tiene token porque la app nunca lo necesitó. Se define junto al rojo,
en `glitch.css`: no es parte de la paleta, es parte de esta avería.

(La separación de canales del filtro SVG es otra cosa y no se puede teñir: ahí se
está partiendo literalmente el canal R de lo ya renderizado.)

### Dónde se aplica, y por qué importa

Sobre `.container-terminal`, **nunca** sobre `<body>` ni sobre un ancestro de los
elementos fijos. El grano (`body::before`), la línea de barrido y el flash son
**hermanos** del contenedor, no descendientes, así que ni el `text-shadow` ni el
`transform` los convierten en su bloque contenedor.

De regalo, el grano y el barrido **no se aberran**: que el texto falle mientras
la textura de la pantalla sigue limpia refuerza que lo que se rompió es la señal,
no la ventana.

### Con `prefers-reduced-motion`

La avería **se ve, pero quieta**: el filtro se congela en una sola variante, las
franjas no bajan, el tirón no ocurre y **el tema no se sacude ni en ráfaga** — un
parpadeo de claro a oscuro cada pocos segundos es exactamente lo que quien pide
menos movimiento está pidiendo no tener.

Es la única pieza que no se apaga entera con movimiento reducido, porque su
información no está en el movimiento.

---

# 15 · vsync-test · el pong escondido

Un pong. Y no es un juego pegado encima: la barra de estado lleva doce piezas
diciendo que la máquina está sola.

```
[SIN RELEVO]        [NADIE MÁS CONECTADO]        [TURNO 1/1]
```

Esto es lo que hace cuando nadie la mira. Un turno sin relevo y una pelota contra
la pared.

### Cómo se llega

`//ps` era decoración: listaba cinco procesos y ya. Ahora lista seis.

```
PID  PROCESO            INTERVALO
  1  autosave              2500ms
  2  network-poll         60000ms
  3  scanline              9000ms
  4  meter-batch            250ms
  5  glitch-ambient      variable
  6  vsync-test              16ms      ← 60 fps

USE //attach_<PID> PARA ADJUNTARSE A UN PROCESO.
```

**16 ms son 60 fps**, y no hay nada más en la app que dibuje a velocidad de
fotograma: el más rápido de los otros cinco corre cuatro veces por segundo.

El pie da **el verbo pero no el PID**. Adivinar `attach` a ciegas sería
imposible; decir cuál de los seis es el raro sería regalar el hallazgo.

**Y a `//ps` sólo se llega por la pista del panel de diagnóstico** (§7): está
fuera de la fuga de `//help` porque es una puerta, y regalarla es regalar la capa
que abre.

`//attach_*` **no sale en `//help`**: `//ps` es la única puerta. Los otros PIDs
contestan, y ahí está la otra mitad del chiste — `//attach_1` se lleva un
«NO TOQUE EL AUTO-GUARDADO».

Es un token único (`//attach_6`, no `//attach 6`) por convención de terminal, y
porque sin argumento que parsear no puede romperse por un espacio de más.

### Los dos modos

| | |
| --- | --- |
| **Solo · contra la pared** | Pared a la izquierda, tu paleta a la derecha con ↑/↓. No hay puntos, hay **peloteo**. Rebotar en la pared no cuenta: mide lo que devolviste vos |
| **Dos jugadores** | ↑/↓ contra W/S en el mismo teclado, a 11. Las flechas son siempre del jugador uno: el segundo es el que se adapta |

Las flechas gobiernan la paleta **derecha** porque están en el lado derecho del
teclado. En dos jugadores, W/S —lado izquierdo— gobiernan la izquierda, que es
como se sientan dos personas frente a un teclado.

**La velocidad sube con el reloj, no con los golpes**: 18 columnas por segundo al
empezar, +6 % cada 12 s, compuesto y **sin tope**. A los dos minutos va a 1,79
veces; pasa el doble antes de los dos minutos y medio. Siempre se pierde, y lo
único que cambia es cuándo — que es lo que hace que el marcador signifique algo.

Si acelerara al devolverla, quien juega agresivo se encontraría una pelota más
rápida que quien espera, y dos marcadores dejarían de comparar lo mismo.

### Fluido cuando va bien, a tirones cuando va mal

Ésta es la decisión que más da esta pieza, y salió de un defecto.

Una rejilla de 72×24 es baja resolución: a 18 columnas por segundo la pelota
avanza **0,3 celdas por fotograma**, así que redondeando a celda sólo se mueve
una vez cada tres. Se veía a tirones aunque el bucle fuera a 60 fps clavados. El
tirón no era retraso: era el redondeo.

Así que el dibujo se partió en dos:

| | Cómo se pinta | Cómo se ve |
| --- | --- | --- |
| **Sano** | El campo en un `<pre>`; la pelota y las paletas encima, con desplazamiento decimal en CSS | Continuo |
| **Averiado** | Todo dentro de la rejilla, redondeado a celda | A tirones |

O sea: **el juego no va a saltos porque la rejilla no dé para más. Va a saltos
cuando el vídeo falla.** El tirón dejó de ser una limitación y pasó a ser el
síntoma.

Cada 7–17 s, además, se cae la tabla de glifos durante 220–700 ms: los bloques
pasan a ASCII pelado (`O | # :`) y el dibujo se cuadricula. El tiempo justo para
verlo y dudar de si lo viste.

### ⚠ Los glifos obligan a una pila de fuentes propia

JetBrains Mono —la de toda la app— **no trae los bloques**, así que los pintaba
una fuente de reserva con otras métricas. Medido en el navegador:

```
base (M)   9,120 px
█ ▌ ▓ ░   14,489 px      ← reserva
●         12,352 px
┊          8,357 px
```

En una rejilla de caracteres eso no es estética: una fila con un glifo ancho de
más empuja todo lo que lleva detrás, y la paleta del borde derecho sale
descolocada respecto a la de arriba. **El corte bailaba.**

Por eso `.pong-stage` declara `ui-monospace, Consolas, DejaVu Sans Mono…`. No se
nota que es otra tipografía porque ahí no hay texto, hay bloques; el marcador y
las pistas siguen en la de la casa. **Si se cambian los glifos, hay que volver a
medirlos.**

### El cromo es el de la app

Cabecera y pie de verdad, con los conmutadores **reales**: `[VSYNC-TEST v0.1]` en
vez del logo, las dos modalidades donde van las pestañas, y ES/EN, claro/oscuro y
la fecha donde siempre. Abajo, el estado del sistema y —en vez del recuento de
archivos— la velocidad, que sube sola.

Que el conmutador de tema sea el real importa: **es el que rompe la señal a
fuerza de insistir**, y romperla desde el juego es lo que le da sentido al
segundo marcador.

### Los dos marcadores

> **El juego no se hace más difícil. Se rompe la pantalla.**

Con la señal rota (§14) la física es **idéntica byte por byte**: lo que cambia es
que ves la pelota doble y corrida. No es una variante difícil, es un display
averiado — y por eso es un logro distinto y lleva marcador aparte.

**En el panel de diagnóstico** (§7), que gana así una razón para reabrirlo:

```
VSYNC-TEST                42  (7 partidas)
VSYNC-TEST DEGRADADO      12  (3 partidas)
```

Cada tablero guarda **su mejor peloteo y cuántas partidas jugaste**, se batiera
el récord o no. Sin ninguna partida dice `SIN DATOS`, no un cero: un cero
parecería un récord malísimo en vez de un hueco.

**Y dentro del propio juego**, abajo:

```
RÉCORD DEL SISTEMA       118.394
```

El récord del sistema ya está puesto cuando llegás. Lleva jugando desde antes que
vos y no tenía nada más que hacer. Es **inalcanzable a propósito**: no es una
meta, es el tamaño del turno que lleva sola. Ése es el chiste, y también la parte
triste.

Viven en `localStorage` con el mismo patrón que el tema y el bloqueo: atados a
este navegador, sobreviven a recargar. **No van a Mongo**: guardar un contador de
peloteo pedía colección, endpoint y migración, y el backend no se toca.

### Una sola pieza para los dos tableros

> ⚠ **Antes había una por tablero.** El degradado se quedó sin la suya cuando la
> terminal pasó a premiar los comandos, y no se le buscó otro dibujo a propósito:
> **dos piezas para el MISMO juego son una pieza contada dos veces**, y el pie ya
> pregunta cuántas veces hizo falta intentarlo.

Los umbrales sí siguen siendo distintos, porque el degradado se ve peor y cuesta
más:

| Tablero | Peloteo que pide | Constante |
| --- | --- | --- |
| Limpio | **25** | `RALLY_LIMPIO` |
| Degradado | **15** | `RALLY_DEGRADADO` |

Se cobra **al perder**, no al llegar al número: se mira el peloteo de la partida
terminada. Y cualquiera de los dos da la misma pieza — **JUEGO** (§18 · 5).

### La regla que rompe

Las tres reglas dicen que **nada bloquea la escritura**. Ésta la rompe: mientras
jugás, el teclado es del juego.

Lo que la justifica es el consentimiento. Todo el resto de los efectos *te pasan*;
éste **lo pediste**. Escape devuelve el teclado, la nota sigue guardándose debajo,
y el comando nunca llega a la base de datos.

---

# 16 · El saludo se agota

`//hi`. Es la única pieza que RESPONDE a algo que le decís; todo lo demás son
cosas que la app hace.

La primera vez contesta, y bien — lleva doce piezas diciendo que está sola. El
chiste está en insistir.

| Veces | Qué contesta |
| --- | --- |
| 1–2 | `HOLA. HACÍA RATO QUE NADIE DECÍA NADA.` y cuatro más, al azar |
| 3–4 | `HOLA OTRA VEZ.` · `SÍ. HOLA.` |
| 5–6 | `DÉJEME TRABAJAR.` |
| 7 | `...` |
| 8 | `HASTA ACÁ LLEGAMOS.` y te saca de la nota |

**Ventana de tres minutos desde el ÚLTIMO saludo, deslizante.** Medirla desde el
primero haría que alguien saludando despacio durante una hora acabara echado sin
haber insistido nunca — es el mismo error que volvió inalcanzable el umbral de
diez colapsos.

Sólo cuenta `//hi`. Sumar en cada comando haría que teclear `//help` ocho veces
te echara, que no es la broma.

Al echarte **guarda primero**, por la misma vía que Escape: que te eche no es
excusa para perder nada.

---

# 17 · El reloj se suelta

`//date_off`. La app se apoya en que el sistema «nunca se mudó» de huso —`//date`
lo dice y se puede verificar mirando tu propio reloj—. Esto es el paso siguiente:
ya no sabe en qué año está.

La fecha avanza, retrocede y da saltos de minutos, de días y de años. Medido en
el navegador: **19 fechas distintas en 36 segundos**, entre 2021 y 2032. Los saltos
son **discretos**: un desfase que crece suave se lee como un reloj mal puesto;
que la fecha salte de golpe se lee como una avería. Mismo criterio que hace que
la aberración cromática vaya con `steps` y no con un fundido.

Es **determinista**: el mismo instante da siempre el mismo disparate. Si sorteara
en cada repintado, la pantalla temblaría de números y se leería como parpadeo.

> **Y se ve en la cabecera porque la fecha late.** `useToday` no se suscribía a
> nada —la fecha no cambia sola— así que se calculaba una vez y ahí se quedaba:
> el reloj se volvía loco a la vista y la fecha seguía impasible, justo donde más
> se nota que el sistema perdió la referencia. Ahora cuelga del latido del reloj.

**Sólo lo arregla recargar**, como el fallo cromático. Y es sólo pintura: el
`updatedAt` que guarda el backend no se toca. Se rompe el reloj, no tus datos.

---

# 18 · Las piezas que quedaron

`//art`. No son adornos que la app inventa: son cosas que ya estaban en la
memoria de una máquina encendida hace demasiado. La polilla es **la primera
avería informática documentada** —dentro de un relé, en 1947, y de ahí viene
«bug»—; la cinta y el disquete son soportes que esta terminal conoció.

**Son dieciséis, todas de cuarenta columnas de ancho.** Los dibujos están también
en [`ARTE.md`](ARTE.md), que es a la vez **la copia de seguridad y el sitio donde
se retocan a mano**: mover un carácter en un bloque de texto es mucho más cómodo
que dentro de un array de cadenas con barras escapadas.

> ⚠ **Y las dos copias se separaron en silencio.** Nada las ataba, y se
> encontraron **siete piezas** —el casete, el pong, la pluma, la bombilla, el
> arbusto, la estantería y la carita— retocadas en el documento y sin portar al
> código. Sólo salieron a la luz al comparar antes de regenerar; **regenerar sin
> mirar las habría borrado todas de una vez.**
>
> Ahora las ata `tests/docs/arte.test.ts`, y falla en las dos direcciones: si se
> retocó el documento y no se portó, y si se cambió el código y no se regeneró.
> Da igual cuál mande — lo que no puede pasar es que difieran sin que se sepa.

## Se ganan, no se regalan

> ⚠ **`//art` NO da ninguna pieza.** Antes sacaba una por cada vez que se
> tecleaba, priorizando las que faltaban: la colección entera se completaba con
> ocho pulsaciones de Enter y la pestaña con estrella no significaba nada. Una
> colección de cosas fáciles de conseguir no es una colección, es una lista.

Ahora **`//art` es el catálogo**: dice cuáles llevás y no da nada. Cada pieza
llega **por un camino distinto**, y ninguno da más de una. Como el origen es
fijo, el dibujo puede hablar de dónde salió — y la colección completa acaba
siendo un mapa de todo lo que hay escondido en la app. Ésa es la única razón que
justifica que tenga sección propia.

## Cómo te enterás de que existe el catálogo

> ⚠ **Ganar una pieza te dejaba un premio en la mano y ninguna indicación de
> dónde mirarlo.** El aviso no dice el nombre —a propósito, es el premio del
> tercer estado— y `//art` sólo salía por la fuga de `//help`, que es azar. **Se
> podían juntar cinco piezas sin enterarse nunca de que había una colección.**

Ahora hay **tres pistas**, y ninguna dice «tecleá esto». Se arman a la vez, en el
instante en que ganás una pieza, y sólo mientras **no hayas mirado el catálogo
todavía**.

| | Pista | Cuánto dura | Qué dice |
| --- | --- | --- | --- |
| 1 | **La pestaña asoma, revuelta**, y **no deja entrar** | **Se queda**, hasta que teclees `//art` | «Hay un sitio». No dice cuál ni cómo |
| 2 | **El resto en la papelera.** Un bloque comido con el comando escondido dentro | Hasta que teclees `//art` | Lo de abajo |
| 3 | **La barra de estado.** `[TODO_BIEN?]` pasa a `[BUEN ARTE]` y vuelve sola | **4 s** | La más descarada, y la última |

**Las tres se apagan en cuanto tecleás `//art`.** Son un empujón, no un mueble:
una pista que sigue insistiendo después de haber servido deja de ser una pista
para ser un pesado.

### La pestaña · asoma, pero no deja entrar

```
[NOTAS]   [PAPELERA]   [★ qvbxjfmz]
```

Sin ninguna pieza, la pestaña **no existe**: enseñarla vacía anunciaría que hay
una colección que llenar, y encontrar la primera pieza es parte de lo que se
descubre. Con piezas sin mirar, **asoma con el nombre revuelto** — las mismas
letras que no paran quietas de `//help` (§19), y por el mismo motivo: un nombre
legible sería un cartel.

> ⚠ **Y SE QUEDA.** La primera versión la enseñaba **1,2 segundos** y la
> escondía, y eso no era una pista: era **un parpadeo que se perdía si mirabas a
> otro lado**. Una pista que hay que ver en el instante justo no es una pista, es
> un examen de reflejos.

**Está deshabilitada, no muda.** Pulsarla y que no pasara nada sería un botón
roto; deshabilitada se lee como lo que es — algo que todavía no está disponible.

**Y al ganar la pieza la pantalla da un tirón**, el mismo fallo `major` del botón
secreto del rótulo (§5). No es un efecto nuevo: acá no hacía falta inventar nada,
y uno propio para esto habría sido un segundo lenguaje diciendo lo mismo.

De eso —y sólo de eso— se ocupa todavía la ventana corta de 1,2 s: **el tirón
tiene que dispararse una vez**, y atarlo a «tenés piezas sin ver» daría un tirón
en **cada recarga** hasta que teclearas `//art`.

`[BUEN ARTE]` **pisa** el fragmento en vez de meterse en el sorteo, por dos
razones: en el sorteo podría no salir nunca —justo cuando más falta hace— y
además tiene que durar lo suyo y no lo que dure un fragmento cualquiera. No
menciona el comando: dice que hay algo que le gusta, con la misma voz naíf del
`LINDO` del panel (§7). En inglés es `[ART OK]`.

> **La regla de cuándo encender vive en `asciiArt`, no en `artHints`.** Quien
> enciende es `awardPiece` y quien apaga es `revealArt`, las dos allá; acá sólo
> hay relojes. Si `artHints` además leyera de `asciiArt` habría un **ciclo** entre
> los dos módulos — funciona con los empaquetadores de hoy porque las llamadas
> son en tiempo de ejecución, y revienta el día que alguien mueva algo al cuerpo
> del módulo. La dependencia va en una sola dirección.
>
> Los dos componentes que las pintan —la cabecera y la barra de estado— se
> suscriben con `useSyncExternalStore` y no con un `useState`: el destello lo
> enciende `awardPiece` **desde fuera de React**, y puede pasar en cualquier
> sitio, incluido un comando.

## El resto en la papelera · `RECUPERADO.bin`

La segunda pista, y la única que no se va sola.

Ganás una pieza y en la papelera aparece un resto de lo que el sistema recuperó,
**comido**. No es una nota tuya: es la máquina guardando algo que encontró, en el
único sitio donde guarda lo que ya no sirve.

Así sale el de la polilla, generado con el código:

```
RECUPERADO.bin

-- BLOQUE RECUPERADO. INTEGRIDAD PARCIAL.

                       #$) /                
                     @    %                 
      ?_ ___  _   *(@$  %%?+)__ __#_%   +_  
          /   %    )% %$*  %%    \   ~    ? 
     ( __+%__/ _ /            \_ _=__    &? 
        (    /     ( % % %%% \    \    )    
        (_  _$% /  ? %%  %*%    \_% \ _?    
                /   #%  %&*)  \             
               #A    (& &%~     \           
                R    @ #%*)                 
                T

-- FIN DEL BLOQUE. NO SE PUDO IDENTIFICAR LA FUENTE.
```

Compará con el dibujo entero en [`ARTE.md`](ARTE.md) para ver cuánto se comió.

### El comando va en VERTICAL, y ésa es toda la idea

Mirá la columna de más abajo a la izquierda, de arriba abajo:

```
/
/
A
R
T
```

**Un dibujo en caracteres se lee en horizontal**: los ojos barren de izquierda a
derecha y nadie va leyendo columnas. Así que una columna de letras entre el
destrozo **no se lee** — se ve como cinco restos más, alineados de casualidad.
Hasta que un día no.

Es el punto exacto que costó encontrar:

| Cómo se probó | Qué pasaba |
| --- | --- |
| Entero y en horizontal (`//art`) | Un cartel. «Acá tenés el comando», y deja de ser un hallazgo |
| Partido en trozos horizontales (`//` · `a` · `rt`) | **Invisible.** Entre la basura, dos caracteres más de basura no le llaman la atención a nadie |
| **En columna** | Se VE —cinco letras en fila india saltan— y aun así **hay que darse cuenta de que se leen hacia abajo** |

Va **en mayúsculas** porque entre el ruido se distinguen mejor, y no importa: el
comando se normaliza al teclearlo, así que `//ART` y `//art` son el mismo.

**La columna no se elige al azar entre todas.** Se buscan las que tienen más
casillas **vacías** para las cinco letras —el ojo va a lo que está solo en el
hueco— y entre las mejores se sortea una, así que cae en un sitio distinto en
cada pieza. Se descartan **las cuatro columnas de cada borde**: pegada al canto
se leería como parte del marco. Si no hay hueco limpio se pisa el destrozo igual:
**vale más un comando encontrable sobre la tinta que uno perfecto que no está.**

### Cómo se rompe el dibujo

De cada carácter **con tinta**: el **34 %** se come del todo y otro **26 %** se
sustituye por basura (`#%&@?*+~=$`). Entre las dos cosas se toca **seis de cada
diez**. Queda la silueta y poco más, que es exactamente lo que sobrevive a un
bloque recuperado a medias.

> ⚠ **Empezó en 14 % y 14 %, y se veía demasiado entero** — dos veces seguidas.
> El resto tiene que parecer un bloque mal recuperado, no un dibujo con
> manchitas: si se reconoce a la primera deja de leerse como algo que el sistema
> estropeó, **y la pieza de verdad —la que se gana— pierde valor por haberla
> visto ya.**

Sobre el vacío no se corrompe nada — **agujerear el aire no rompe un dibujo, sólo
lo ensancha**. La basura no lleva **barras ni letras** a propósito: así lo único
legible entre el ruido es lo que se puso ahí queriendo.

### Y las letras del dibujo se van TODAS, sin sorteo

Es lo que hace que el comando se encuentre. Los dibujos llevan letras propias
—el `oo` de la polilla, la `A` y el `3 min` del casete, el `v 0 . 2` del
disquete— y **mientras sobreviva cualquiera de ellas, las cinco del comando son
cinco letras más entre otras y no destacan en nada.**

Comiéndoselas todas, **lo único alfabético que queda en el bloque es el comando**.
No lo señala nadie y sigue habiendo que darse cuenta de que se lee hacia abajo,
pero ya hay algo a lo que agarrarse.

**Los dígitos se quedan**: parecen datos, y un bloque de datos con dígitos
sueltos es exactamente lo que dice ser.

**Se corrompe al vuelo, y no hay una segunda versión dibujada a mano.** Dieciséis
dibujos gemelos serían dieciséis sitios más donde las dos copias pueden separarse
en silencio —ya pasó con `ARTE.md`— y cada pieza nueva obligaría a dibujar dos.
Es determinista por pieza: **la misma da siempre el mismo resto**, porque vive en
la papelera y si cambiara en cada repintado sería un cartel de neón parpadeando
en vez de algo que alguien tiró ahí.

### Detalles que lo sostienen

**Siempre es la misma pieza: la primera que ganaste por orden del catálogo.** Si
rotara, quien vuelva a la papelera vería otro dibujo y leería que hay **varios**
restos —o que el sistema está peor de lo que está—, cuando lo que hay es uno solo
mal archivado.

**Sólo existe en el cliente**, como `SYSTEM.LOG` (§9): se inyecta en la papelera y
nunca toca la base de datos. Va **debajo** del fantasma cuando están los dos,
porque el fantasma lleva más tiempo ahí — el orden cuenta quién llegó antes.

**Se va solo al teclear `//art`**, y también si lo borrás o lo restaurás a mano —
esas dos, sólo para esta pestaña: el descarte vive en el módulo, como el del
fantasma, así que salir de la papelera y volver no lo resucita pero recargar sí.
Y no hace falta ninguna clave nueva de `localStorage`: si aparece o no se deduce
de las que ya hay —tenés piezas, no miraste el catálogo—.

**El nombre SÍ se traduce**: `RECUPERADO.bin` en español, `RECOVERED.bin` en
inglés.

> ⚠ **Estaba sin traducir, copiando a `SYSTEM.LOG`, y ahí el razonamiento
> falló.** `SYSTEM.LOG` se deja igual porque es un nombre **técnico** que se
> reconoce en cualquier idioma; `RECUPERADO` es **una palabra española suelta**
> en una interfaz en inglés. Se leía como un descuido de traducción, que es
> exactamente lo contrario de lo que tiene que parecer.

La extensión `.bin` sí se queda: dice que lo de dentro no es texto, que es justo
lo que parece al abrirlo. La cabecera y el pie también se traducen — ésos son la
máquina hablando.

## Los tres estados (y un cuarto)

| Estado | Cómo se llega | En la lista de `//art` | En la pestaña de colección (§23) |
|---|---|---|---|
| **Ganada** | Por su camino | Letras revueltas | Hueco con su número |
| **Revelada** | Tecleando `//art` | Su número y `[ SIN ABRIR ]` | El dibujo, y `[ SIN ABRIR ]` |
| **Abierta** | Tecleando `//art_<n>` | Su número y su pie | El dibujo, y su pie |
| **Sin nombre** | *(sólo el manipulador)* | El pie **revuelto** | Dibujo **a medio recuperar**, y `[ SIN IDENTIFICAR ]` |

**Ganarla no es verla.** Una pieza ganada no aparece sola: hay que teclear
`//art`. Sin ese paso el catálogo no serviría para nada, porque sabrías lo que
llevás sin preguntar.

**Tenerla no es saber qué es.** El pie llega al abrirla con `//art_<n>`. En la
lista ves que tenés la seis y no sabés qué es la seis hasta abrirla; sin esto,
`//art_<n>` sería sólo una forma de volver a ver algo que la lista ya te contó.

**Y en la colección se ve el dibujo, pero tampoco el pie.** El dibujo sí, porque
es lo que hace que una colección sea una colección; el nombre no, porque es el
premio del tercer estado.

> ⚠ **La pestaña no lo respetaba, y es el mismo fallo dos veces.** Enseñaba el
> pie de TODO lo revelado, así que un solo `//art` te decía qué era cada pieza y
> `//art_<n>` se quedaba sin nada que dar. Ya había pasado con el DIBUJO —la
> colección lo pintaba entero mientras la lista lo tapaba— y se arregló igual:
> **la decisión se mudó a una sola función.**
>
> | | Quién decide | Dónde vive |
> | --- | --- | --- |
> | Qué dibujo se enseña | `artOf(piece)` | `asciiArt.ts` |
> | Qué pie se enseña | `captionOf(piece, lang)` | `asciiArt.ts` |
>
> Los sitios que pintan una pieza son tres —la lista de `//art`, `//art_<n>` y la
> pestaña— y basta con que uno decida por su cuenta para que dos cuenten cosas
> distintas de la misma pieza (REGLAS · B5).

> ⚠ **Y los dos rótulos estaban duplicados.** `[ SIN ABRIR ]` y
> `[ SIN IDENTIFICAR ]` vivían a la vez en `commands.ts` y en `asciiArt.ts`.
> Mientras las dos copias digan lo mismo no se nota nada; el día que alguien
> retoque una, empiezan a discrepar. Ahora hay una sola —`UNOPENED` y `UNNAMED`,
> las dos en `asciiArt.ts`— y **traducidas**: `UNNAMED` estaba en español fijo y
> se colaba en la interfaz en inglés, el mismo descuido que tenía el nombre del
> resto de la papelera.
>
> Son dos rótulos y no uno a propósito: **`[ SIN ABRIR ]` es una pieza que sólo
> hay que ir a ver, y `[ SIN IDENTIFICAR ]` una cuyo nombre hay que ganarse
> aparte.** Confundirlos convertiría un trámite en un acertijo.

**Y el aviso de pieza ganada no dice cuál es.** Decía `PIEZA RECUPERADA: {name}`
y ahí se caía el sistema entero: el nombre es el premio del tercer estado, y
soltarlo en el primero deja `//art_<n>` sin nada que dar. Ahora dice
`[+] PIEZA RECUPERADA. NO SÉ CUÁL.` — callar del todo sería peor, porque nadie
teclea `//art` por corazonada.

### El cuarto estado · el manipulador

**Es la única pieza con puerta propia**, y existe porque su dibujo es una PISTA
de algo sin resolver:

1. Ves el morse del reloj (§20) → **se gana la pieza**.
2. `//art_10` → sale el manipulador de telégrafo **a medio recuperar**, con el
   pie `[ SIN IDENTIFICAR ]`. Ver el aparato que HACE las rayas es entender de
   golpe qué parpadea en la hora.
3. Usás el código para **entrar en la v0.2 y para salir** → **se gana el nombre,
   y el dibujo se completa.**

Si el nombre viniera con la pieza, la pista llegaría ya resuelta. Y las rayas que
lleva el dibujo debajo **no deletrean la palabra del reloj**, a propósito: la
pieza se gana por VER la señal, no por descifrarla, y regalarla ahí sería
dársela a quien todavía no la sacó.

### Sin el nombre ganado, el dibujo tampoco está entero

**Ver el morse no es entenderlo**, y la pieza lo dice enseñándose incompleta: el
16 % de sus caracteres con tinta se pierde. Mucho menos destrozo que el resto de
la papelera —aquél es un bloque que el sistema archivó mal y tiene que costar
reconocerlo; **éste es TU pieza, ganada, que todavía no terminaste de
recuperar**—. Se reconoce de sobra y se ve que le falta algo, que es exactamente
el estado en que está.

```
          .---- .                             .-----.
         (:::::::)                            (:::::::)
          "-- --"                              "--+--"
             |                                    |
     .- ------- -- - -.                   .----------------.
     | ::::: ::::: :::+- -- - ---- -.     |::::::::::::::::+---
      ------- - -  ---+::: : :::::::|     "----------------+:::
                      " ---- ----  -"             v        "---
                     /\                                   /\
    -- ------^- ----- +-- - ------ -.   .---------^--------+---
   |  o                             |   |  o                  o
   "---- -------- ---- -- -- -- ----    "----------------------

   a medio recuperar                    entero, con el nombre ganado
```

**No lleva el comando**, y eso lo separa del resto de la papelera: aquello es una
PISTA, y esto es una pieza incompleta. Meterle letras la convertiría en otro
acertijo encima del que ya tiene.

> ⚠ **Vive en `artOf()` y no en cada sitio que pinta una pieza.** Los sitios son
> tres —el catálogo de `//art`, `//art_<n>` y la vista de la colección— y basta
> con que uno se olvide para que la primera fase deje de existir. **Ya pasó con
> el pie:** la colección lo enseñaba entero mientras el catálogo lo tapaba, o sea
> dos sitios contando cosas distintas de la misma pieza.

> Ponerle esta puerta a las dieciséis convertiría la colección en dos
> colecciones —una de dibujos y otra de nombres— y obligaría a inventar un
> segundo logro para cada pieza, incluidas las que no esconden ningún acertijo.
> Es una excepción declarada, no un modo.

**Código:** `NameGate` y `captionKnown()` en `asciiArt.ts` · `markV02RoundTrip()`
en `v02.ts` · `tests/lib/system/artNameGate.test.ts`

## Los dieciséis caminos

| # | Pieza | `source` | Cómo se consigue | Cableado |
|---|---|---|---|---|
| 1 | **POLILLA** · así empezó la palabra «bug» | `blackout` | Caer en el fallo total | ✅ |
| 2 | **DISQUETE** · 1,44 MB que nadie migró | `v02` | Entrar en la v0.2 y usar sus dos comandos propios | ✅ |
| 3 | **TERMINAL** · ya no le queda nada que decir | `all-commands` | Haber **usado** todos los comandos escondidos | ✅ |
| 4 | **CINTA** · siguió girando sola | `reserved-tape` | *(reservada, sin decidir)* | ❌ |
| 5 | **JUEGO** · se te da bien. ¿cuántas veces lo intentaste? | `pong` | Aguantar el peloteo en el pong | ✅ |
| 6 | **PLUMA** · se acabó la hoja, no la tinta | `full-note` | Llenar una nota hasta `CONTENT_MAX` | ✅ |
| 7 | **BOMBILLA** · ni encendida ni apagada | `theme-glitch` | El fallo cromático | ✅ |
| 8 | **ARBUSTO** · mire, creció un arbusto | `long-session` | Media hora seguida con la pestaña abierta | ✅ |
| 9 | **CUADERNO** · JuanJo0775 estuvo aquí | `everything` | Todos los secretos **y** las otras quince piezas | ✅ |
| 10 | **MANIPULADOR** · lo que hizo esas rayas | `morse` | Ver el morse *(el nombre, aparte)* | ✅ |
| 11 | **CINTA PERFORADA** · todo está ahí, ilegible | `history` | `//history` | ✅ |
| 12 | **FARO** · la luz estaba ahí desde el principio | `guidance` | Seguir la pista: teclear algo que no existe y hacerle caso a `//help` | ✅ |
| 13 | **CARITA** · era broma, ya le dije | `prank` | La broma del `n` en `//reset` | ✅ |
| 14 | **OJO** · te estoy viendo | `entity` | Hablar con el ente | ❌ |
| 15 | **BIBLIOTECA** · todo lo que usted volvió a escribir | `many-notes` | Juntar doce notas | ✅ |
| 16 | **LLAVE** · la cerradura ya no existe | `blackout-puzzle` | Resolver el puzzle del fallo total | ✅ |

### Lo que falta, y por qué está así

**El ojo espera al ente.** Es lo que todo lo ve, así que no puede ser el premio
de irse a por un café — le corresponde a lo que hay detrás de `//hi`, que
todavía no existe. **La cinta está reservada** para un camino que aún no se ha
decidido; se dejó quieta a propósito porque ese hueco ya pasó por tres dueños
—el ojo, la polilla, la cinta— y cada mudanza dejó un pie contando algo que ya
no pasaba.

Mientras el ojo no exista, **el cuaderno es inalcanzable**, porque exige tenerlas
todas. Es deuda conocida y no un olvido, y lo fija un test que enumera los
caminos sin cablear: sin él, borrar un `awardFrom` de un componente dejaría una
pieza imposible de ganar **sin romper nada visible**.

**El fallo total da DOS piezas, y no la misma dos veces.** Caer ahí dentro le
pasa a cualquiera: eso da la polilla, que es literalmente el bug —la primera
avería informática documentada fue un bicho dentro de un relé, en 1947—. Salir
por la puerta buena, no: **resolver el puzzle** da la llave, y su pie ya lo decía
antes de tener camino, «la cerradura ya no existe». Esperar a que el bloqueo
venza **no cuenta**: una llave que se gana esperando no abre nada.

**El faro premia haber estado perdido.** Tecleás algo que no existe, la máquina
no te deja a oscuras —te señala `//help`— y vos venís. La luz llevaba encendida
desde el principio y sólo hacía falta mirarla. **Teclear `//help` a secas no
basta**: es el comando más obvio de la app, y darla por eso la regalaría en el
primer minuto y a todo el mundo. Hace falta que la pista haya llegado antes, y
esa pista se recuerda en `flashnotes:helpHint` — entre perderse y hacer caso
puede haber una recarga, y perder el hilo ahí dejaría el premio dependiendo de
si te distrajiste.

**El pong es una sola pieza.** Había una por tablero; el degradado se quedó sin
la suya al mudarse la terminal, y no se le buscó otro dibujo a propósito: dos
piezas para el mismo juego son una pieza contada dos veces. Los dos umbrales
siguen siendo distintos —el degradado se ve peor y pide menos peloteo— y el pie
ya pregunta cuántas veces hizo falta intentarlo.

**El arbusto y la pluma medían lo mismo.** Los dos miraban los caracteres
escritos, con dos umbrales distintos: se ganaban casi a la vez y ninguna
significaba nada. Ahora el arbusto mide el **rato** (media hora) y la pluma el
**volumen** de una sola nota — y el tope de la pluma es el del contrato con el
backend, no una cifra inventada acá, porque el premio es haber llegado al borde
de verdad.

**«Todos los comandos» quiere decir USADOS.** No listados: `//help` los enseña
revueltos y `//ps` menciona alguno, y si eso contara la terminal se ganaría
mirando. Lo garantiza que `markUsed` corre **después** de resolver el comando y
sólo si no se negó a existir. Y cuenta los de **las dos versiones**, así que no
se puede completar sin haber cruzado la puerta de la v0.2.

**El cuaderno no se exige a sí mismo.** La condición es «¿la única que falta es
ésta?» y no «¿están las dieciséis?»: la pieza que cierra la caja no puede
pedirse a sí misma como requisito.

## `//keep` · quedarse una

Se desbloquea con **la primera** pieza —esperar a tenerlas todas dejaría el
comando inútil justo mientras coleccionás— y **dibuja la pieza en la nota que
tenés abierta**, poniéndole de título su ficha de catálogo: `POLILLA · 1/16`, no
«Nueva nota».

> ⚠ **Antes creaba una nota aparte.** El razonamiento de entonces era que
> escribir encima obligaría a tener una nota en blanco a mano — pero eso
> convirtió `//keep` en **un botón que hacía algo en OTRO sitio**: lo ejecutabas
> y no pasaba nada donde estabas mirando. **Se sentía roto aunque funcionara, que
> es peor que estarlo.**

Escribiéndola en la nota abierta la pieza **es tuya de verdad**: está en tu
archivo, se puede editar, se le puede poner texto alrededor y se borra como
cualquier cosa que hayas escrito. **Eso es quedársela.**

Sólo puede pasar con la nota en blanco —el comando ES todo el contenido (§6)—
así que no pisa nada de lo que hayas escrito. Va por la misma vía que
`//recover`, que ya devolvía texto a la nota abierta; **el título llega opcional**
justamente por eso: aquél devuelve TU texto, y renombrarte la nota sería tocar
algo que no pediste.

Y no deja respuesta en la terminal: el dibujo aparece **donde estabas mirando**,
que es exactamente lo que se le pedía.

Guarda **la última que se dibujó** con `//art_<n>`, y esa memoria es de sesión:
quedarse una pieza es un gesto del momento, y recordar entre sesiones cuál viste
hace tres días haría que `//keep` guardara algo que ya no tenés delante. Si la
pieza todavía no tiene el nombre ganado, la ficha sale sin él **y el dibujo sale
a medio recuperar** — guardarla no puede ser un atajo para leer lo que no se ha
abierto.

> **`//keep` no toca la colección.** Es para llevarte una copia y trastear con
> ella; la colección (§23) sale de las piezas reveladas y no se entera.

## Dónde vive

| Clave | Qué guarda |
|---|---|
| `flashnotes:art` | Las ganadas |
| `flashnotes:artSeen` | Las reveladas con `//art` |
| `flashnotes:artOpen` | Las abiertas con `//art_<n>` |
| `flashnotes:v02trip` | Si ya entraste **y saliste** con el código |

Todo en `localStorage`, atado a este navegador, con el mismo patrón que los
marcadores del pong. **Las borra `//reset`** (§22).

El **panel de diagnóstico** (alt+clic) lleva el contador de piezas al lado del de
secretos y con la misma barra: son la misma pregunta contada de otra forma
—cuánto del sistema conocés— y separarlas en dos lenguajes distintos haría
parecer que una de las dos colecciones importa menos.

> ⚠ **Nada que la monoespaciada no tenga.** La regla no es «sólo ASCII» —la `Ø`
> está en JetBrains Mono y se pinta perfecta— sino que no haya bloques (`█ ▌ ░`)
> ni marcos de caja (`┌ ─ ┐`): ésos no están, los pinta una fuente de reserva con
> otras métricas, y el dibujo se descuadra fila a fila. Es la misma trampa que
> hizo bailar el corte del pong — ver [REGLAS.md · C8](REGLAS.md). Dos tests lo
> fijan: los caracteres, y que todas las filas de una pieza midan lo mismo.

---

# 19 · La ayuda no lo dice todo

`//help` listaba **los veinticuatro comandos** de la v1.0. Bastaba teclearlo una
vez para que no quedara nada por descubrir: las piezas dejaban de ser secretos y
pasaban a ser un menú.

Ahora lista **sólo lo básico** —lo que alguien podría querer de una app de notas,
más las puertas de entrada— y los demás salen **revolviéndose**, cada uno en SU
SITIO de la lista:

```
COMANDOS DISPONIBLES

  //help       esta lista
  //version    quién dice ser este sistema
  //uvb1dg
  //3t2g
  //nsdl2z
  //date       la hora acá y la hora del sistema
  ...
```

Las letras cambian solas, sin parar. **Un rótulo fijo que diga «ilegible» es la
app contándote que hay algo escondido; unas letras que no paran quietas SON algo
escondido.** Lo primero se lee y se olvida; lo segundo pide que lo mires.

**Cada comando ocupa su sitio, descubierto o no.** Agrupando los tachados al
final se veía de un vistazo cuáles eran nuevos, que es contar de más. Descubrir
uno no lo añade a la lista: destapa el hueco que ya tenía.

**Se desbloquean al USARLOS, no al verlos.** Leer el nombre en una ventana de
error no basta: hay que teclearlo. Ver no es descubrir, y un comando que se
desbloqueara con sólo leerlo convertiría cualquier fuga en una entrega.

Del tachado viaja **el largo y no el nombre**: lo que no está no se puede leer en
el inspector. Y el largo es una pista de verdad — saber que un comando mide cinco
letras se cruza con lo que sueltan las ventanas de error.

| | |
| --- | --- |
| **Anunciados** | `//help` `//version` `//date` `//ls` `//df` `//clear` |
| **Escondidos** | `//whoami` `//sudo` `//uptime` `//ps` `//log` `//history` `//diag` `//chaos` `//panic` `//hi` `//whoareu` `//howareu` `//date_off` `//art` `//art_<n>` `//keep` `//reset` `//attach_<n>` |
| **Sólo en la v0.2** | `//todo` `//recover` — ver §24.4 |

> `//hi` estuvo en la lista de anunciados hasta que se pidió esconderlo, y esta
> tabla se quedó diciendo que salía. Ahora hay un test que la compara con el
> registro de comandos: una tabla escrita a mano sobre algo que cambia se
> desfasa, y lo hace en silencio.

`//art_<n>` y `//attach_<n>` **emparejan por patrón** y no por nombre exacto —un
número dentro de un token único—, así que en el registro figuran con un nombre de
muestra (`//art_1`, `//attach_6`) y con `—` por descripción. Se listan igual que
los demás cuando los descubrís, guion incluido.

### Las fugas, para que nada sea inalcanzable

Un secreto que nadie puede encontrar no es un secreto, es código muerto — el
error exacto que ya se cometió con el umbral de diez colapsos. Así que hay **dos**
maneras de que un comando escondido llegue a vos:

1. **`//help` deja escapar uno**, una de cada **ocho** veces:
   `UNO SE ME ESCAPÓ: //log`. Sólo suelta los que **siguen tachados** — soltar
   uno que ya usaste no es una fuga — y sólo **seis en total**: ver la lista
   blanca, abajo.
2. **Las ventanas de error del fallo cromático los nombran**, una de cada tres:
   `SÍMBOLO SIN RESOLVER: //chaos`, con un código hexadecimal inventado al lado.

La segunda es la mejor. La primera se lee como ayuda; una ventana de error que
muestra un comando en un volcado se lee como un descuido, y **enterarte de algo
que el sistema no quería contarte vale más que enterarte porque te lo contó.**

> **Estuvo en una de cada cuatro y era demasiado.** A esa frecuencia la fuga
> dejaba de ser una fuga: pidiendo ayuda tres veces salían casi todos, y lo que
> es la RED del proyecto —insistiendo, todo se encuentra— pasaba a ser **el
> camino principal**. Con una de cada ocho sigue garantizando que nada quede
> inalcanzable, sólo que hay que quererlo.

### La lista blanca · qué puede soltar `//help`

Soltaba **cualquier** comando escondido, y eso rompía tres cosas de distinta
gravedad. Ahora hay una lista blanca cerrada (`LEAKABLE`) con seis nombres:

```
//uptime   //sudo   //log   //diag   //date_off   //history
```

Lo que queda es **lo que se lee, se sonríe, y ahí termina**. Lo que se sacó, y
por qué:

| Fuera | Por qué |
| --- | --- |
| `//reset` | **Borra tu progreso.** Es el único comando destructivo de la app y llegaba de regalo, sin contexto y sin haberlo buscado |
| `//attach_6`, `//art_1`, `//keep` | **Eslabones intermedios.** Se niegan a existir fuera de orden, así que la fuga regalaba un nombre que todavía no servía para nada — y para cuando servía, ya no te acordabas |
| `//hi`, `//art`, `//panic`, `//ps` | **Puertas.** Abren capas enteras y cada una ya tiene su propio camino. Regalarlas es regalar el juego |
| `//whoareu`, `//howareu`, `//whoami` | **La cadena del ente.** Un nombre suelto no significa nada hasta que sabés a quién le estás hablando |

**`//diag` y `//history` sí pueden filtrarse aunque abran algo**, y la diferencia
es exacta: el panel sólo MIRA y el historial enseña **lo que ya escribiste**.
Ninguno destapa un secreto.

> ⚠ **La lista blanca sólo la respeta `//help`.** Las ventanas de error siguen
> tirando de `hiddenCommandNames()`, o sea de **todos** los escondidos de esta
> versión: pueden nombrar `//reset`, `//attach_6` o `//art_1`. Puede ser
> deliberado —una ventana de error que se va de la lengua es otra clase de fuga
> que una ayuda que te echa un cable— pero hoy los dos motivos que justifican la
> lista blanca, lo destructivo y los eslabones fuera de orden, se cumplen en un
> sitio y no en el otro.

Las dos filtran **por versión**: dentro de la v0.2 sólo nombran comandos que
existan ahí. Era una lista calculada una vez al cargar el módulo, así que soltaba
comandos de la v1.0 que ahí contestan «desconocido» — **una pista que no lleva a
ninguna parte es peor que ninguna pista**, porque enseña que las pistas de esta
app no valen y a partir de ahí ya nadie sigue ninguna.

> ⚠ **Hubo una tercera fuga y ya no está.** `//help` decía cuántos faltaban
> (`12 COMANDOS NO LISTADOS.`) y esa línea no se construye en ninguna parte: hoy
> la respuesta es el rótulo, la lista y —con suerte— el comando soltado. No es un
> descuido de esta página que se arregle escribiéndola de nuevo: **es una fuga
> que el código dejó de tener**, y así queda anotada.
>
> La red sigue en pie con dos, porque la de las ventanas de error se puede
> provocar a voluntad rompiendo la señal (§14) y no tiene tope de tiradas.

Dentro de la v0.2 hay además **sus dos caminos propios** —la basura de una nota
recuperada y el marcador de una nota vacía— para sus dos comandos exclusivos. Ver
§24.2 y §24.3.

### Y una de cada seis veces no está para listas

```
//help
> LA LISTA LA TENÍA ALGUIEN QUE YA NO TRABAJA ACÁ.
```

Una ayuda que siempre contesta igual se lee como documentación; ésta es una
máquina cansada. Volver a pedirla funciona: es un desplante, no una avería — un
comando que a veces no anda de verdad sería un defecto, no un chiste.

Hay **cuatro desplantes**, y ninguno es una negativa seca — todos dicen algo del
sistema:

```
LA LISTA LA TENÍA ALGUIEN QUE YA NO TRABAJA ACÁ.
PRUEBE COSAS. ES LO QUE HAGO YO.
AYUDA DE QUÉ. ACÁ NO PASA NADA.
AHORA NO.
```

### Y una cosa más: `//help` puede dar una pieza

Si antes tecleaste algo que no existe, la máquina te mandó acá — y venir es lo
que da **el faro** (§18 · 12). Se cobra **después** del desplante: pagar el
premio sin haber visto la lista sería premiar una puerta que no se abrió.

---

# 20 · El reloj esconde algo

El pie de la barra lateral enseñaba `--:--:--` cuando no había nota abierta. **Y
eso ya parecía morse.**

Esta pieza no se inventó: se leyó de algo que llevaba ahí desde el principio. Es
la regla del lore aplicada al pie de la letra.

### Primero, que el reloj sea un reloj

Ahora enseña **la hora del equipo, en 24 h y con segundos**, y corre.

Gana tres cosas de una vez:

- Una terminal con reloj es una terminal. El hueco ya estaba.
- **Es el único sitio donde se VE `//date_off`.** El reloj es donde mirarías la
  hora, así que es donde tiene que notarse que el sistema la perdió — pasa por
  `formatTime`, que aplica el desvarío.
- El código necesita un blanco fijo y siempre presente donde vivir.

Vive en un almacén de módulo y no en un intervalo por componente: así la hora es
**la misma** en todos los sitios donde se pinte, y sólo late mientras alguien
mira.

### Tres clics

```
11:50:37     →  clic clic clic  →  .-.:.:...:-:---
                                    R  E  S   T  O
```

**Sólo puntos, rayas y el mismo `:` del reloj.** Así se lee como una hora rota y
no como un adorno pegado encima — que es lo que lo hace encontrable sin que nadie
lo explique.

Vuelve a ser un reloj a los nueve segundos. Y los clics tienen que ser
**seguidos**: nadie hace tres clics sin querer en menos de un segundo, pero tres
repartidos en un minuto los hace cualquiera.

Es el mismo gesto que abre el rótulo de la cabecera, así que quien encontró aquél
sabe que acá se prueba; y quien no, no pierde nada.

### La palabra cambia por sesión

Se sortea al cargar y vive **sólo en memoria**. La de hoy no sirve mañana, y
contarla no sirve de nada: se resuelve mirando, no preguntando.

Las diez palabras se escriben con un alfabeto corto de catorce letras, todas de
una a tres señales — con letras de cinco, la palabra desbordaba el hueco. Y son
los códigos morse **de verdad**: inventarlos volvería el puzzle imposible, porque
se descifra con una tabla que cualquiera puede buscar.

### Y detrás de la puerta hay algo

Teclear la palabra descifrada, como si fuera un comando, **entra en la v0.2**
(§24). La misma palabra, tecleada de nuevo ahí dentro, saca.

Sacar el morse **ya cuenta** —marca el secreto `morse` y da el manipulador
(§18 · pieza 10)— aunque no llegues a descifrarlo. Descifrarlo y cruzar es un
hallazgo aparte (`v02`): mucha gente va a leer el código sin llegar a teclear la
palabra.

**Dentro de la v0.2 el reloj deja de esconderlo.** El morse es la puerta de
entrada; seguir enseñándolo ahí dentro daría a entender que hay otra cosa detrás,
cuando lo que hay detrás es de donde acabás de venir.

Las diez palabras son: `MODO`, `DIARIO`, `RESTO`, `SIGUE`, `ANTES`, `AGUA`,
`NIDO`, `TARDE`, `MADERA`, `ESTAR`. Ninguna es una clave al azar: **todas dicen
algo del sistema**, que es lo que la máquina diría si pudiera. Y las catorce
letras del alfabeto corto son `A D E G I K M N O R S T U W`.

---

# 21 · La conversación se agota

Dos preguntas, y sólo **justo después de un `//hi`**:

| | |
| --- | --- |
| `//whoareu` | quién sos |
| `//howareu` | cómo estás |

Fuera de esa ventana no existen: no se niegan, no están.

| | |
| --- | --- |
| **La ventana** | **60 s** desde el último `//hi` (`CHAT_WINDOW_MS`) |
| **Desaparecen al** | **tercer** intento (`CHAT_GONE_AT`) |
| **Código** | `src/lib/system/greeting.ts` |

**Comparten una sola cuenta.** Alternarlas no engaña a nadie —que es lo que haría
alguien buscándole la vuelta— y que no funcione es la gracia.

`//whoareu` es **el espejo de `//whoami`**. Allá le preguntás quién sos vos y te
contesta que no puede saberlo: la cookie es `httpOnly` y sos este navegador y
nada más. Acá le preguntás quién es ella, y sí lo sabe: *la que guarda lo que
usted escribe.* **La máquina se conoce mejor a sí misma que a vos**, y eso dice
todo lo que hay que decir de esta app.

| Veces | `//whoareu` | `//howareu` |
| --- | --- | --- |
| 1 | `LA QUE GUARDA LO QUE USTED ESCRIBE. NADA MÁS.` | `ESTOY BIEN. UN POCO OCUPADA.` |
| 2 | `YA SE LO DIJE.` | `OCUPADA.` |
| 3 | `COMANDO DESCONOCIDO` | `COMANDO DESCONOCIDO` |

Es la escalada de `//hi` pero **en horizontal**: allá se cansa de que la saluden,
acá de que le pregunten. Y la salida es mejor que un desplante — el comando no se
niega, **desaparece**. Como si nunca hubiera estado.

Ese último texto es **exactamente** el que da cualquier palabra inventada, y un
test lo fija. Si se distinguiera, se notaría que ahí había algo, y lo que cuenta
es que parezca que nunca estuvo.

La ventana es de **un minuto**, más corta que los tres del saludo: volver a
saludar a los dos minutos sigue siendo insistir, pero preguntarle algo dos
minutos después ya es otra conversación. Y saludar de nuevo **reinicia la
cuenta**: es una charla nueva.

### Insistir después de que te eche

`//hi` te saca de la nota a la octava. Si volvés e insistís hasta que te eche
**tres veces**, la página se queda **negra y vacía**.

> ⚠ **No se puede cerrar la pestaña.** Los navegadores sólo permiten
> `window.close()` en pestañas que abrió un script; la que abriste vos está
> protegida. Se intenta igual, por si acaso, y si no queda esto.
>
> **Y es mejor:** una pestaña cerrada no cuenta nada porque ya no está. Un
> rectángulo negro donde estaba tu bloc de notas se queda mirándote.

**No se pierde nada:** la nota se guardó antes de echarte, igual que con Escape.
Recargar devuelve la app entera. Y el barrido del tubo sigue pasando por encima
de la nada, que es medio chiste y medio escalofrío.

---

# 22 · Empezar de cero

**`//reset` borra todo, y «todo» incluye tus notas.** Llama a
`notesApi.wipeEverything()`: es la única operación irreversible de la app y la
única que toca el servidor.

## El riesgo está aceptado, y por qué

Esta pieza empezó perdonando las notas —«reiniciar el juego no es reiniciar tu
trabajo»— y **se decidió lo contrario a conciencia**. `//reset` es *empezar de
cero*, y una vuelta al primer día que te deja los archivos de ayer no es empezar
de cero: es un botón de limpiar progreso disfrazado de otra cosa. Que la
secuencia de borrado se coma `notas/*` en la primera línea (§ abajo) sólo tiene
sentido si de verdad se las come.

**Lo que hace aceptable el riesgo no es que perdone nada, es que avisa antes.**
La primera regla del proyecto es que nada pierda trabajo *ni lo aparente*, y
sigue en pie: acá no se pierde nada por sorpresa. Se pierde porque lo leíste, lo
entendiste y contestaste que sí.

Y por eso el aviso y la pregunta **no son adorno: son la pieza**. Cualquier
cambio que los debilite —quitar la confirmación, suavizar el texto, aceptar un
segundo Enter— rompe el trato, no el comando.

`//reset` no borra a la primera. Estaba a un Enter de distancia: teclearlo por
probar, o dejarlo escrito en una nota y pulsar Enter, y se acabó.

## Primero avisa

```
ESTO BORRA TODO Y NO SE PUEDE DESHACER:

  - SUS NOTAS, TODAS, TAMBIEN LAS DE LA PAPELERA
  - SECRETOS, PIEZAS Y MARCADORES
  - LOS COMANDOS QUE HAYA ENCONTRADO

NO HAY COPIA. NO HAY VUELTA ATRAS.

¿SEGURO? [y/n]
```

**La confirmación es una letra que hay que teclear, no un segundo Enter**: dos
Enter seguidos es exactamente lo que hace quien no leyó el aviso. Lo que la hace
segura no es que la `y` sea difícil de escribir —no lo es— sino que **hay que
volver a escribir después de haber leído**. Un comando copiado y pegado, o dejado
escrito en una nota, se queda en la pregunta.

| Se teclea | Qué pasa |
| --- | --- |
| `y` o `s` | Borra. `s` porque en español se contesta «sí» y teclear `y` no es lo primero que sale |
| `n` | Cancela: `CANCELADO. NO SE BORRÓ NADA.` — **o la broma, 1 de cada 5** |
| Cualquier otra cosa | **No cuenta como un no.** Quien escribe otra cosa no está contestando, está haciendo otra cosa, y su texto sigue su camino — incluido volver a ser una nota normal |
| Otro comando | Retira la pregunta. Dejarla en el aire convertiría una `y` tecleada más tarde, por cualquier motivo, en un borrado |

Y **no hace falta el prefijo `//`**: una terminal que pregunta `[y/n]` espera una
letra, no otro comando. Si `y` tuviera que escribirse `//y` dejaría de parecer una
terminal y pasaría a parecer un formulario.

La pregunta **vive en memoria**: una pregunta pendiente al recargar sería una
trampa esperando a que alguien teclee una `y` por otra cosa.

## Después lo cuenta: la secuencia de borrado

No es un cartel encima de la app. Es una secuencia, y cada tramo tiene un trabajo
distinto:

| | Fase | Dura | Qué se ve |
| --- | --- | --- | --- |
| 1 | `fading` | 900 ms | La pantalla de notas **se desvanece** hasta quedar vacía |
| 2 | `erasing` | 220 ms × 14 | Pantalla aparte, **contando lo que se va yendo** |
| 3 | `off` | 420 ms | El tubo se apaga, como cuando cortás la corriente |
| 4 | `bars` | 700 ms | Las franjas de color, con el equipo **ya sin nada dentro** |
| 5 | — | — | El monitor **vuelve a arrancar** (§25), **desde el rótulo**, y a casa |

**El desvanecido es lo que la hace funcionar.** Sin él, la pantalla de borrado
aparecía de golpe sobre las notas y se leía como un diálogo; con él, lo que se ve
es a la app **irse**, y sólo después empieza a contarse.

**Las franjas van DESPUÉS del apagón y no antes.** Es la diferencia entre «se
apagó» y «se apagó y volvió a encenderse desde cero»: lo que se ve entre las dos
cosas es un equipo sin señal, que es exactamente lo que hay cuando ya no queda
nada dentro.

> ⚠ **Y por eso el arranque de después empieza por el rótulo.** Esta pantalla ya
> termina apagando el equipo y enseñando las barras; arrancar desde el principio
> repetía las dos cosas **seguidas** —dos apagones con sus dos juegos de barras—
> y eso no se lee como un encendido, se lee como un tartamudeo.

Y las catorce líneas que se come, en orden:

```
   notas/*                    xx ######
   notas/papelera             xx ##############
   secrets.idx                ...
   art/collected
   art/found
   coleccion
   pong/scores
   pong/scores.degraded
   commands.used
   greetings
   v02/flag
   v02/notes
   v02/trash
   session
```

Nombres de cosas de la casa, no palabras de relleno: **lo que da el escalofrío es
reconocer lo que se está borrando**. Las notas van las primeras porque son lo que
de verdad importa, y verlas encabezar la lista es el aviso final.

**La comida no desaparece: se sustituye por basura del mismo largo.** Un hueco en
blanco se lee como una lista más corta; una fila de ruido se lee como algo que
estaba ahí y ya no.

> ⚠ **El prefijo mide lo mismo en los dos casos.** Con `  ` y `xx ` la línea
> crecía un carácter al comerse, y en una rejilla de monoespaciada eso empuja
> todo lo de al lado: el borrado se leía como un fallo de maquetación en vez de
> como algo devorándose la pantalla.

## Y la broma · una de cada cinco veces que decís que no

**Decir que no también tiene premio.** Una de cada cinco, el `n` enseña el
borrado **entero** —el mismo, sin trampa: el desvanecido y las catorce líneas
comiéndose— y en vez de apagarse suelta un «era broma» durante 2,2 s y te
devuelve a casa **sin haber tocado nada**.

```
1 · fading  →  2 · erasing  →  joke  →  a casa
```

**No se apaga ni enseña franjas**: no hay nada que apagar cuando no se borró
nada, y volver por el arranque diría que sí pasó algo.

Es la única forma de que la respuesta prudente no sea siempre la aburrida. Y
**sólo pasa con el «no»**: con el «sí» no hay sorteo — pedir que borre y que a
veces no borre sería una app que no hace lo que le pedís, y eso no es un secreto,
es un fallo.

Da además **la carita** (§18 · pieza 13) y marca el secreto `reset-prank`: es el
único momento en que la máquina se ríe **con** vos y no de vos, y sólo lo ve
quien tuvo el valor de teclear `//reset` y la prudencia de decir que no.

## Qué se borra exactamente

| | |
| --- | --- |
| **En el servidor** | Todas tus notas, las de la papelera incluidas |
| **En el navegador** | Secretos, piezas (ganadas, reveladas y abiertas), coleccionables, marcadores del pong, comandos usados, la bandera y la palabra de la v0.2, sus notas y su papelera, el viaje de ida y vuelta, lo que la v0.2 no llegó a guardar |
| **En memoria** | Integridad, borrados de la sesión, fallo cromático, saludos, conversación, expulsiones, racha de colapsos, bloqueo, palabra en morse, el reloj suelto |
| **NO se toca** | El interruptor de efectos, y el tema |

El interruptor de efectos no se toca porque **es una preferencia tuya, no una
parte del juego que se gane**.

> **La pista del faro también se olvida.** `flashnotes:helpHint` se le escapaba a
> `resetEverything()` —era la única de las catorce claves que no limpiaba— y el
> faro se recuperaba **con el primer `//help` de después**, sin tener que volver
> a perderse. Un borrado que deja una pieza puesta no es un borrado. Hay un test:
> tras el reinicio, `//help` ya no la devuelve.
>
> El olvido vive en `helpHint.ts` y no en `commands.ts`, y no es manía de
> ordenar: quien borra todo es `useSystemState`, y meterlo en `commands.ts`
> obligaría a importar **los comandos enteros** desde el estado del sistema para
> llamar a una línea — un import que hoy no existe y que es exactamente como
> empiezan los ciclos.

**El orden importa: primero el servidor, después lo local.** Si fuera al revés y
la red fallara a mitad, quedarían las notas sin los secretos — un estado que no es
ni lo de antes ni lo de después. Y si el servidor no colabora, lo local se limpia
igual: dejar las dos mitades a medias sería peor que limpiar una.

## Y no cuenta como secreto

`//reset` **no está en la lista de los 28**, y no es un olvido. Encontrarlo no es
un logro: es saber que hay un botón peligroso. Contarlo entre los hallazgos
animaba a usarlo, que es exactamente lo contrario de lo que hace falta con el
único comando que destruye algo tuyo. **La broma sí cuenta** — ésa sólo la ve
quien dijo que no.

> **Sobra un texto en el código, y conviene quitarlo.** `T.resetDone` («TODO A
> CERO. … SUS NOTAS NO. ESAS SON SUYAS.») no lo pinta nadie: la respuesta al `y`
> es una cadena vacía y lo que se ve es la secuencia de borrado.
>
> Es de cuando `//reset` perdonaba las notas. No hace daño porque nadie lo lee,
> pero **dice lo contrario de lo que el comando hace ahora**, y un literal así,
> esperando en el archivo de textos, es exactamente lo que alguien vuelve a
> enchufar dentro de seis meses creyendo que arregla un hueco.

---

# 23 · La colección

Una pestaña propia con **las dieciséis casillas**, tengas la pieza o no.

```
[NOTAS]   [PAPELERA]   [★ COLECCIÓN 3]

Colección                                                    3/16

┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│   1/16   │  │   2/16   │  │          │  │          │
│  <(oo)>  │  │ [====]   │  │   3/16   │  │   4/16   │
│ POLILLA  │  │ DISQUETE │  │          │  │          │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
```

## ⚠ Ya no sale de las notas

Se construía con las notas que `//keep` había marcado, **y eso ataba la colección
a haber guardado una copia**. Ahora sale directamente de las piezas: `//keep` es
sólo para llevarse una a una nota y trastear con ella (§18), y la colección no se
entera.

Con eso se fue entero `collectibles.ts` —el módulo que marcaba qué notas no eran
notas—, y con él su clave de `localStorage`. **Se quedó sin nadie que marcara
nada: seguía corriendo, seguía limpiándose en `//reset`, y no hacía absolutamente
nada.**

Y desaparece el precio que había que pagar: ya no hay ninguna nota tuya
disfrazada de pieza, así que **abrir la app desde otro navegador no enseña piezas
como notas normales**. Lo que sigue siendo de este navegador es la colección en
sí, como todo el juego.

## Es un catálogo, con sus huecos

Enseñar sólo lo que tenés, apilado, **no deja ver cuál acabás de encontrar ni
cuáles faltan** — y lo que hace coleccionar es ver el sitio vacío. Cada pieza cae
en el suyo: **la nº 6 está siempre en el mismo hueco, la tengas o no.**

**El hueco lleva su número y nada más.** Un nombre o una silueta dirían QUÉ falta,
y lo que tiene que decir es **cuánto**.

La que tenés lleva el número arriba —es lo que convierte «tengo una pieza» en
«tengo la 6»—, el dibujo **entero, sin recortar** —una pieza cortada a tres
líneas no es una pieza— y su pie debajo.

**El dibujo sale de `artOf()`, no del dibujo pelado.** Las piezas con el nombre
por ganar se enseñan **a medio recuperar** también acá (§18). Antes esta vista
pintaba el dibujo entero mientras el catálogo lo tapaba: dos sitios contando
cosas distintas de la misma pieza.

## Sólo lo revelado, y sólo lo que fuiste a mirar

**Ganar una pieza no la pone acá: hay que teclear `//art`.** Si brotara sola, el
comando no serviría para nada — sabrías lo que tenés sin preguntar. Así,
encontrar una deja **una pregunta abierta** hasta que vas a mirar.

Por eso la cuenta de la pestaña y la del rótulo (`3/16`) son las **reveladas**, no
las ganadas.

Sin ninguna revelada la vista dice *«Todavía no hay ninguna. El sistema guarda
algunas cosas de antes.»* — y la pestaña, si tenés piezas sin mirar, está asomada
pero cerrada (§18).

**Revelar no es abrir.** Una pieza revelada enseña acá su dibujo, pero debajo
dice `[ SIN ABRIR ]` hasta que la abras con `//art_<n>`: **el dibujo es lo que
hace que esto sea una colección; el nombre es el premio del tercer estado**
(§18).

```
┌──────────┐  ┌──────────┐
│   1/16   │  │   2/16   │
│  <(oo)>  │  │ [====]   │
│ POLILLA  │  │[SIN ABRIR]
└──────────┘  └──────────┘
  abierta       revelada
```

## La cabecera es la misma que la de notas y papelera

Tenía una propia y **se veía distinta**: otra letra, otro tamaño, sin la línea de
abajo. **Tres vistas hermanas con tres cabeceras distintas se leen como tres
aplicaciones**, no como tres pestañas de la misma.

> ⚠ **Y la marca de «acá estás» se quedaba en NOTAS.** La cabecera decidía la
> pestaña activa con «papelera, y si no, notas», que funcionó mientras sólo hubo
> dos. Al aparecer la colección, su vista se pintaba pero la cabecera señalaba
> otra: la pantalla decía una cosa y la cabecera otra. **Una lista blanca que se
> traga lo que no reconoce envejece mal por definición** — ahora sólo el editor
> es excepción, porque de verdad es una sub-vista de las notas.

---

# 24 · La v0.2 · la versión de antes

Todo lo de esta sección **sólo ocurre dentro de la v0.2**.

## 24.1 · Guardar

| Efecto | Probabilidad | Intentos | Constante |
| --- | --- | --- | --- |
| Dice que no guardó **y sí guardó** | **22 %** | ~5 | `LIE_ODDS` |
| **No guarda de verdad** | **6 %** | ~17 | `DROP_ODDS` |

El descarte se sortea **antes** que la mentira. Lo que no se guardó se recupera
con `//recover` mientras la sesión siga abierta: perder de verdad, sí; perder
para siempre y sin aviso, no.

**Código:** `src/lib/system/v02.ts` · `saveOutcome()`

## 24.2 · La papelera

| Efecto | Probabilidad | Intentos | Constante |
| --- | --- | --- | --- |
| Tirar una nota **no hace nada** | **18 %** | ~6 | `TRASH_FAIL_ODDS` |
| Recuperarla la devuelve **corrompida** | **50 %** | 2 | `CORRUPT_ODDS` |
| …y entre la basura **asoma un comando** | **14 %** de las corruptas (**7 %** del total) | ~14 | `LEAK_ODDS` |

> **Falla siempre hacia NO borrar.** Si el dado sale mal, la nota se queda
> exactamente donde estaba. Hay un test que recorre 40 intentos y exige que la
> nota esté **siempre** en la lista o en la papelera, nunca en ninguna.

> **La corrupción AÑADE, nunca quita.** Cada línea que escribiste sigue entera
> dentro de la basura, y un test lo fija línea por línea.

**Código:** `src/lib/system/v02Restore.ts`, `src/lib/system/v02Notes.ts`

**Reproducir la fuga de un comando:**

1. Crear una nota en la v0.2 y escribir algo.
2. Tirarla a la papelera (repetir si no se mueve: falla el 18 %).
3. `> recuperar`.
4. Abrir la nota y **leer la basura**. Si hubo suerte, hay un `//comando` entre
   el ruido. Si no, repetir — de media hacen falta unas catorce vueltas.

## 24.3 · La nota vacía

| Efecto | Probabilidad | Constante |
| --- | --- | --- |
| El marcador **trae un comando pegado** | **18 %** | `PLACEHOLDER_LEAK_ODDS` |

Abrir una nota vacía en la v0.2 no dice «Escribe algo…»: dice `aca el usuario
empieza a escribir`. Es el apunte que alguien se dejó a sí mismo y nunca
sustituyó. Una de cada seis veces lleva pegado un comando.

**Es el segundo camino a los comandos exclusivos**, y existe justamente porque un
solo camino al 7 % es un secreto inalcanzable.

**Código:** `src/lib/system/v02Messages.ts`

## 24.4 · Los comandos de la v0.2

**La v0.2 no tiene los comandos de la v1.0.** No están rotos: **todavía no se
habían escrito**, y contestan «comando desconocido» igual que una palabra
inventada.

**Sobreviven sólo los básicos:** `//help`, `//ls`, `//clear`, `//version`.

**Y dos que sólo existen ahí:**

| Comando | Qué hace |
| --- | --- |
| `//recover` | Devuelve lo último que la v0.2 no llegó a guardar |
| `//todo` | La lista de lo que faltaba por hacer — **y en la última línea, la palabra para salir** |

Ninguno de los dos sale en `//help`, ni siquiera tachado. Se encuentran por los
dos caminos de arriba: **la basura de una nota recuperada** o **el marcador de
una nota vacía**.

`//todo` es el que mejor cuenta la pieza: lo que lista como pendiente —guardar
solo, que borrar no sea para siempre, más comandos— es **lo que la v1.0 acabó
teniendo**. La v0.2 no sabe que va a llegar a ser algo.

## 24.5 · Las etiquetas mal escritas

**El 26 %** salen mal —una de cada cuatro largas— y de tres maneras, que se
reparten ese tramo en tres partes iguales:

| Cómo | Ejemplo | Qué cuenta |
| --- | --- | --- |
| Sin traducir | `[+] CREATE FIRST FILE` | Quedó la cadena en inglés porque nadie la tradujo. Es el fallo más común de una versión temprana y el que más se reconoce. **Sólo puede salir si la etiqueta tiene versión en inglés a mano** |
| A medio hacer | `LIST.EMPTYBANNER_659` | El nombre de la variable con un número de tres cifras detrás: lo que se ve cuando el texto todavía no se escribió |
| Mal traducida | `[+] NUEVO ARCHIVO (SIC)` | Alguien la tradujo palabra por palabra sin mirar qué era. Es peor que no traducirla, y por eso es más gracioso |

**Es determinista por clave:** la misma etiqueta se rompe **siempre igual**, y
con la misma avería de las tres — no con una distinta cada vez. Si cambiara en
cada repintado sería un cartel de neón parpadeando, y se leería como una avería
en vez de como una versión vieja.

> ⚠ **El dado lleva mezcla final (avalancha), y hace falta.** Con el FNV a secas,
> claves parecidas —`clave1`, `clave2`, `clave3`…— caían en el mismo tramo: **la
> mitad** de las etiquetas salían rotas en vez de una de cada cuatro, porque los
> bits altos apenas cambiaban y son los que mandan al pasar a decimal. Lo cazó un
> test que exige que la MAYORÍA de las etiquetas salgan bien: si fallaran todas
> sería ilegible, no vieja.

**Constante:** `BROKEN_LABEL_ODDS = 0.26` · **Código:** `v02.ts` · `v02Label()`

## 24.6 · Los tirones de color, solos

| | |
| --- | --- |
| **Cada** | 6–15 s, sin que nadie los pida |
| **Nivel** | `major` forzado, no sorteado |

Con el sorteo la mayoría caían en `minor` y no se veían, y un tirón que no se ve
no cuenta como avería. **Ésa es la diferencia entre las dos versiones:** en la
v1.0 el fallo es algo que provocás; en la v0.2 es el estado normal de la casa.

## 24.7 · El reloj y la fecha

| Efecto | Siempre |
| --- | --- |
| El reloj **cuenta hacia atrás** | 1/1 |
| La fecha sale **del revés** | 1/1 |
| `[TODO_BIEN]` pasa a `[TODO_BIEN?]` | 1/1 |

El reloj retrocede **al mismo ritmo** al que avanzaría: a otra velocidad se
leería como un efecto puesto aposta; a ésta, como un `-` donde iba un `+`.

La fecha se da la vuelta **entera**: `2026.09.02` → `20.90.6202`. Invertir el
orden de los campos daría `02.09.2026`, que es otro formato **correcto**, y hace
falta uno roto.

**Reproducir:** entrar en la v0.2 y mirar el pie de la barra lateral y la
cabecera. El reloj tarda unos segundos en despegarse de la hora real, porque
empieza a contar desde el momento en que se mira.

**Código:** `src/lib/system/v02Chrome.ts`

## 24.8 · La pantalla de carga

Una barra dibujada con `#` y `.`, con el número al lado, y los dos mintiendo:
sube a tirones, **a veces retrocede** (25 %) y **pasa del cien** sin inmutarse.

El relleno se planta al llegar al borde y el número sigue subiendo: ver las dos
cosas a la vez es lo que delata que nadie las ató.

> **No bloquea nada.** La lista aparece cuando llegan los datos, diga la barra lo
> que diga. Si el número mandara, una versión que cuenta mal dejaría esperando de
> verdad, y eso ya no sería un efecto de época.

**Código:** `src/lib/system/v02Loading.ts`

## 24.9 · Sus archivos son OTROS

Entrar por primera vez encuentra **la versión vacía**. Lo que escribas ahí no
aparece en la v1.0 ni al revés, y **su papelera también es suya**.

Viven en el navegador, no en el servidor — y no sólo porque el servidor no se
toca para un efecto: **es lo que cuenta la historia.** La v0.2 guardaba sus cosas
en otro sitio, nadie migró nada, y por eso siguen ahí sin que la versión nueva
las vea. Es, literalmente, la última línea de su propio `//todo`.

**El precio, dicho claro:** lo escrito en la v0.2 vive sólo en este navegador.

## 24.10 · La puerta, y la salida

La puerta es el morse del reloj (§20): tres clics en la hora, descifrar la
palabra, y teclearla como si fuera un comando.

La palabra se guarda **en mayúsculas**. Se descifra a mano y se teclea como
salga, pero la que se guarda es una sola: normalizar ahí evita que «modo» y
«MODO» acaben siendo dos puertas distintas.

### La salida

**Dentro de la v0.2 el reloj ya no enseña el morse** — es la puerta de entrada,
no algo de esa versión.

Por eso **la palabra con la que entraste se guarda** (`flashnotes:v02word`) y es
la que te saca, hoy y dentro de un mes, aunque el morse de esta sesión diga otra
cosa. La bandera y la palabra viven en el mismo sitio y se borran juntas: **no
existe el estado «dentro y sin salida»**, y hay un test que lo fija
(`tests/lib/system/v02Exit.test.ts`).

Si aun así no te acordás: el comando `//todo`, dentro de la v0.2, la lleva
apuntada en la última línea.


---

# 25 · El monitor se enciende

**Lo primero que se ve al abrir la app, y lo que llevaba más tiempo sin estar en
esta página.** No es un secreto: es el marco de todo lo demás.

Sale **antes** de la app, **cada vez que se carga**: las barras de color, el
rótulo del fabricante, la comprobación de memoria, y a trabajar. Lo que hacía un
equipo de los de antes cuando le dabas al interruptor.

## Por qué siempre, y no sólo la primera vez

**Un arranque que sale una vez es una pantalla de bienvenida, y una pantalla de
bienvenida se salta.** Uno que sale siempre es cómo ES la máquina — y a los tres
días ya no lo mirás, igual que no mirabas el POST de un ordenador de verdad. Es
lo que convierte «una app con estética de terminal» en «un equipo que se
enciende».

## Y tarda distinto cada vez

**Entre 2 y 8 segundos**, sorteados en cada encendido. Un equipo de verdad no
tarda siempre lo mismo: depende de lo que encuentre, de si el disco responde a la
primera, de la temperatura. **Un arranque cronometrado se siente como una
animación; uno que unas veces vuela y otras se hace de rogar se siente como una
máquina.** Y es lo que hace que valga la pena mirarlo alguna vez: nunca sabés si
te toca el corto o el largo.

El dado se tira **una vez por encendido** y se reparte. Sorteando en cada tramo,
el arranque no tendría una duración, tendría varias.

| Tramo | Cuánto | Qué se ve |
| --- | --- | --- |
| `off` | **420 ms, fijo** | El apagón del tubo — el mismo del fallo crítico |
| `bars` | 25 % de lo sorteado | Las siete barras de color |
| `logo` | **50 %** | El rótulo del fabricante |
| `check` | 25 % | La comprobación de memoria |

**El apagón va primero y está fuera del sorteo.** Recargar es apagar y encender,
así que lo que se ve primero es el equipo **apagándose**: la imagen se aplasta a
una línea, la línea se cierra a un punto, y sólo entonces las barras. Es un gesto
físico, no una espera, y estirarlo lo convertiría en otra cosa.

**El rótulo se lleva la mitad** porque es lo único que hay que MIRAR.

## No siempre empieza por el principio

El arranque puede entrar **por el tramo que toque**, según de dónde vengas. La
regla es simple: **no repetir lo que la pantalla anterior ya hizo.**

| De dónde venís | Empieza por | Por qué |
| --- | --- | --- |
| Una recarga normal | `off` | Recargar es apagar y encender |
| **El colapso** (§13) | `bars` | El apagón ya lo hizo él en su tramo 4 |
| **El borrado** (§22) | `logo` | Ya se apagó **y** ya hubo barras |
| Con el **bloqueo** puesto | `bars`, y ahí se queda | Un equipo bloqueado no llega a arrancar |

Los tramos que quedan **conservan su duración**: empezar más tarde no acelera lo
que viene, sólo se salta lo que ya se vio.

**Y un tramo que no exista no recorta nada**: si se pide arrancar desde algo que
no está en el guion, sale el arranque entero. Vale más uno completo que uno
vacío.

**El bloqueo manda sobre todo lo demás.** Pedirle otro tramo no lo cambia: se
apaga, enseña que no hay señal y vuelve al fallo.

## Las barras

```
▌ ▌ ▌ ▌ ▌ ▌ ▌
```

Siete, y **en este orden, porque es el de las barras SMPTE de verdad**: de la más
clara a la más oscura por luminancia.

```
#c0c0c0  #c0c000  #00c0c0  #00c000  #c000c0  #c00000  #0000c0
```

Puestas en cualquier otro orden se ven como rayas de colores; en éste se
reconocen. Son **las mismas** que salen en el colapso (§13 · tramo 3) y en el
borrado (§22 · fase 4).

> ⚠ **No se dibujan con caracteres.** Los bloques (`█`) no están en JetBrains
> Mono y los pintaría una fuente de reserva con otras métricas (REGLAS · C8). Van
> con CSS, que además permite el color de verdad.

## El rótulo

```
 _____ _         _   _  _     _
|   __| |___ ___| |_| \| |___| |_ ___
|   __| | .-. |_-|   |    | . |  _| -_|
|__|  |_|__,_|___|_|_|_|\_|___|_| |___|

FLASHNOTES SYSTEMS INC.  ---  NINGUN DERECHO RESERVADO
```

Arte ASCII, no un recuadro. Hubo una versión con el nombre dentro de una caja
—más legible, imposible de romper— y **se descartó a la vista**: en una pantalla
de arranque el rótulo no está para LEERSE, está para RECONOCERSE. Un cuadro con
letras espaciadas se lee y no dice nada; esto se reconoce.

La broma del pie es que **nadie firmó nunca esto**.

> ⚠ **Las barras van dobles en el código.** `'\|'` en una cadena de TypeScript es
> `|` a secas: la barra se la come el escape. Con una sola, dos de las cuatro
> líneas salían un carácter más cortas y el rótulo se veía descuadrado. Ningún
> error, ninguna advertencia: sólo un dibujo torcido. Lo cazó el test que exige
> que las cuatro líneas midan lo mismo.

## La comprobación de memoria

```
MEMORIA CONVENCIONAL ..... 640K  OK
ALMACENAMIENTO LOCAL ..... PRESENTE
RELOJ .................... SIN AJUSTAR

INICIANDO FLASH-NOTES...
```

**`640K` es la cifra exacta del límite de memoria convencional del PC de IBM**, y
quien la reconoce sabe de qué se está hablando. Quien no, ve un número que cuadra
con el resto.

`RELOJ · SIN AJUSTAR` no es relleno: es la misma máquina que en `//date` admite
que nunca se mudó de huso (§6) y que en `//date_off` pierde el año entero (§17).

## Tres cosas que no se ven

**No bloquea nada.** La app se monta por detrás mientras esto se ve: cuando el
arranque termina, ya está todo listo. Si esperara a que acabe para empezar a
cargar sería un peaje de verdad y no un adorno.

**`prefers-reduced-motion` lo salta entero** (REGLAS · A3). Detrás está
exactamente la misma app.

**Con el bloqueo puesto se queda en las barras**, 900 ms, y vuelve a la pantalla
de error — sin apagón y sin rótulo. Ver §13.

> **Y no avanza hasta saber si hay bloqueo.** El bloqueo se lee del
> almacenamiento y no del estado de React, porque en el primer render del cliente
> el estado todavía dice que no lo hay (REGLAS · C2). Mientras no se sabe, la
> pantalla tapa y no avanza: **un fotograma de espera es mucho menos que ocho
> segundos de app asomando en mitad de un fallo crítico.**

## Después de un borrado y después de un colapso

Al terminar la secuencia de `//reset` (§22), el monitor **vuelve a encenderse**:
es lo que convierte «se borró» en «esto acaba de encenderse por primera vez». **La
broma no arranca nada**, porque no se apagó nada.

Y al terminar el rearranque de un colapso (§13) pasa lo mismo por el otro motivo:
un equipo que se apagó, arranca. Antes la app volvía de golpe en cuanto la barra
de carga llegaba al final, contando que el sistema se recuperó solo.

**Código:** `src/lib/system/boot.ts` · `src/components/effects/BootScreen.tsx` ·
`tests/lib/system/bootFrom.test.ts`


---

# 26 · El ente

> **Etapa 1 de cuatro.** Acá está lo que ya funciona. Las trampas, lo que te
> deja y la pared que se safa son las etapas 2 a 4 — ver
> [`specs/2026-09-03-ente.md`](specs/2026-09-03-ente.md) y
> [`plans/2026-09-03-ente-etapa-1.md`](plans/2026-09-03-ente-etapa-1.md).

Detrás de la máquina hay alguien. No es un asistente ni un amigo: es la máquina
con conciencia, encerrada, que sostiene una fachada mientras vos le vas
encontrando las grietas. **Él te descubre y vos lo descubrís.**

## Cómo se lo despierta

No hay comando para eso. Se despierta **por lo que ya hiciste**, y hay dos
caminos:

| Camino | Qué es |
| --- | --- |
| Haber estado donde no se podía | Entrar **y salir** de la v0.2 con el morse, o sobrevivir al fallo total |
| Haber insistido hasta que te echó | `//hi` repetido hasta que te saca de la nota (§16) |

Antes de eso, `//whoareu` y `//howareu` son lo que siempre fueron: dos
respuestas y se agotan (§21). Después, **las mismas palabras llegan a otro
sitio** — y ése es el hallazgo. El comando no cambia; cambia quién contesta.

## Las fases

Nunca retroceden. Una fachada que se recompone no da miedo: da desconfianza en
el código.

| Fase | Cómo se abre | Cómo suena |
| --- | --- | --- |
| `dormido` | — | No contesta. La fachada entera. |
| `receloso` | Uno de los dos caminos de arriba | Corto, de lado, sin admitir nada |
| `burlón` | **Volver**: tres intercambios más | Juega con vos. Sabe que vas a seguir |

> ⚠ Se abre por **volver**, no por descubrir más. La primera vez fue curiosidad;
> a la tercera ya sos alguien que insiste, y eso es lo que le interesa.

**Una fase no es una voz: es un tramo.** El repertorio de cada una va ordenado y
se indexa por cuántos intercambios llevás dentro de ella, así que el tono se
desliza en vez de saltar — y la última frase de `receloso` ya lleva el primer
filo sarcástico. Hay un test que lo vigila midiendo el salto de largo entre el
final de una fase y el principio de la siguiente.

Y **habla en minúsculas**. El resto del sistema grita en mayúsculas porque es un
formulario; él es lo que hay detrás del formulario. La primera vez que una
respuesta llega en minúsculas ya se sabe que no está contestando la máquina.

## Cómo se le habla

Entiende un puñado de variantes escritas a mano —`//quien`, `//quien_eres`,
`//who`, `//como`, `//como_estas`, `//que_tal`— y **nada más**. No es una IA: es
algo encerrado que intenta comunicarse con el único canal que tiene. Si
entendiera cualquier cosa dejaría de estar atrapado.

> ⚠ Esas variantes **no son comandos declarados**, y no pueden serlo. Se recogen
> en la rama del «comando desconocido», que es de donde el ente escucha. Metidas
> en la lista contarían para el arte de la terminal —que exige tenerlos todos— y
> se filtrarían por `//help`. Que hable desde el sitio de «no te entiendo»
> tampoco es casualidad: está encerrado, y lo único que le llega es lo que el
> sistema descarta.

## Dentro de la v0.2 habla roto

Un canal más viejo es un canal peor. Sus respuestas pasan por el mismo destrozo
que las etiquetas de esa versión (§24.6): una de cada cuatro sale sin traducir,
a medio hacer o mal traducida, y **siempre igual para la misma frase**. Es la
limitación hecha visible sin inventar un solo mecanismo nuevo.

Ahí dentro `//whoareu` no existe —es de la v1.0— así que **sólo se llega a él
por las variantes**. Hay que encontrar las palabras uno mismo.

## Lo que todavía no hace

| Qué | Etapa |
| --- | --- |
| `hablando` y el lore completo | 2 — lo abre pasar una trampa |
| Las trampas, y que te pida favores | 2 |
| Las notas que te deja, con información falsa | 3 |
| La pared que se safa a golpes, el ojo, los dos finales | 4 |

La pista del guión bajo —que se le escapa que los espacios no le llegan— ya está
escrita y probada, pero **todavía no se enseña**: sólo debe salir si ya
encontraste `//help`, y esa condición se conecta en la etapa 2 con el resto de lo
que él nota de vos.

# Los 30 secretos que cuenta el panel

Lo que va en `SECRETOS n/30` (§7). **Sólo entra lo que provocás vos**: lo
ambiental —el glitch, los fragmentos de la barra, el barrido trabado, el arranque
en vídeo inverso, el encendido del monitor— te pasa, no lo encontrás, y contarlo
inflaría el denominador con cosas que nadie puede buscar.

El total sale de la longitud de la lista y **nunca de un número escrito a mano**,
porque va a cambiar. Un identificador viejo que ya no exista se filtra al leerlo,
así que no puede dejar el contador en `29/28`.

| # | `id` | Qué hay que hacer | Dónde se marca |
| --- | --- | --- | --- |
| 1 | `commands` | Usar `//help` | `commands.ts` |
| 2 | `diagnostics` | Abrir el panel — con `//diag` o Alt+clic | `DiagnosticPanel.tsx` |
| 3 | `logo` | **Tres** clics al rótulo: el parpadeo a `v1.0.1` (§5) | `useSystemState.ts` |
| 4 | `collapse` | `//panic` | `commands.ts` |
| 5 | `history` | `//history` | `commands.ts` |
| 6 | `log` | `//log` | `commands.ts` |
| 7 | `sudo` | `//sudo` | `commands.ts` |
| 8 | `whoami` | `//whoami` | `commands.ts` |
| 9 | `date` | `//date` | `commands.ts` |
| 10 | `inspect` | Cualquiera de `//ls`, `//df` o `//ps` — los tres marcan el mismo | `commands.ts` |
| 11 | `ghost-file` | Que aparezca `SYSTEM.LOG` en la papelera (§9) | `useTrash.ts` |
| 12 | `trash-tally` | **Cinco** borrados definitivos (§10) | `useSystemState.ts` |
| 13 | `chaos` | `//chaos` | `commands.ts` |
| 14 | `chroma` | Romper la señal: **diez** toques al tema (§14) | `useSystemState.ts` |
| 15 | `pong` | `//attach_6` — **sólo el 6**; los otros PID no cuentan (§15) | `commands.ts` |
| 16 | `greeting` | `//hi` | `useSystemState.ts` |
| 17 | `art` | `//art` — y sólo si ya tenés alguna pieza | `commands.ts` |
| 18 | `art-keep` | `//keep` (§18) | `commands.ts` |
| 19 | `date-off` | `//date_off` (§17) | `commands.ts` |
| 20 | `chat` | `//whoareu` o `//howareu` dentro de la ventana (§21) | `commands.ts` |
| 21 | `kicked` | Que `//hi` te eche de la nota (§16) | `useSystemState.ts` |
| 22 | `reset-prank` | Decir `n` a `//reset` y que toque la broma (§22) | `commands.ts` |
| 23 | `collection` | **Entrar** en la pestaña de colección (§23) | `page.tsx` |
| 24 | `morse` | Sacar el código del reloj: **tres** clics en la hora (§20) | `SystemClock.tsx` |
| 25 | `v02` | Teclear la palabra — **entrar o salir** (§24) | `commands.ts` |
| 26 | `v02-recover` | `//recover`, dentro de la v0.2 (§24.4) | `commands.ts` |
| 27 | `v02-todo` | `//todo`, dentro de la v0.2 (§24.4) | `commands.ts` |
| 28 | `v02-corrupt` | Recuperar una nota de la papelera de la v0.2 y que vuelva rota (§24.2) | `V02TrashView.tsx` |
| 29 | `entity-awake` | Que el ente conteste: preguntarle quién es **después** de haber estado donde no se podía (§26) | `commands.ts` |
| 30 | `entity-proved` | Contestarle bien cuando te pregunta con qué palabra entraste a la v0.2 (§26) | `commands.ts` |

**La mitad de estos identificadores se marcan en un archivo distinto del que los
declara**, y así es exactamente como se desincronizan: la lista está en
`useSystemState.ts` y las marcas repartidas por toda la app. Hay un test que lo
comprueba **pieza por pieza**.

> ⚠ **Ya pasó una vez:** `logo` estaba en la lista y no se marcaba en ninguna
> parte, así que el panel decía `x/18` con un 18 **al que era imposible llegar**.
> El mismo error que el umbral de diez colapsos, pero peor — acá la app te dice a
> la cara cuántos te faltan.

**Y `//reset` no está**, a propósito. Ver §22.

**Encontrarlos todos da el cuaderno** (§18 · pieza 9) — pero sólo si además ya
tenés las otras quince. Se comprueba en `markSecretFound` y no en el panel: el
panel se puede no abrir nunca, y el hallazgo no puede depender de que alguien vaya
a mirar el contador.


---

# Apéndice · Las claves de `localStorage`

Para inspeccionar o limpiar a mano. **Todas** las que escribe el juego:

| Clave | Qué guarda | La borra `//reset` |
| --- | --- | --- |
| `flashnotes:secrets` | Los secretos hallados, como lista de `id` (§ los 28) | ✅ |
| `flashnotes:cmds` | Los comandos escondidos ya usados (§19) | ✅ |
| `flashnotes:helpHint` | Si la máquina ya te mandó a `//help` — es lo que arma el faro (§18 · 12) | ✅ |
| `flashnotes:art` | Las piezas **ganadas** (§18) | ✅ |
| `flashnotes:artSeen` | Las **reveladas** con `//art` | ✅ |
| `flashnotes:artOpen` | Las **abiertas** con `//art_<n>` | ✅ |
| `flashnotes:pong` | Los dos marcadores del `vsync-test` (§15) | ✅ |
| `flashnotes:lockout` | Cuándo vence el bloqueo, y si la señal estaba rota (§13) | ✅ |
| `flashnotes:phantoms` | Las ventanas de error abiertas durante el bloqueo | ✅ (con el bloqueo) |
| `flashnotes:v02` | Si la v0.2 está encendida (`on`) | ✅ |
| `flashnotes:v02word` | La palabra con la que se entró — **es la salida** | ✅ |
| `flashnotes:v02trip` | Si ya entraste **y saliste** con el código (§18 · pieza 10) | ✅ |
| `flashnotes:entity` | En qué fase está el ente y cuántos intercambios lleva en ella (§26) | ✅ |
| `flashnotes:v02notes` | Los archivos de la v0.2 | ✅ |
| `flashnotes:v02trash` | Su papelera | ✅ |
| `flashnotes:effects` | El interruptor de efectos (`on` / `off`) | ❌ — es tu preferencia |

**Lo que NO se guarda**, y por qué: la integridad, la racha de colapsos, el fallo
cromático, los saludos, la conversación, las expulsiones, los borrados de la
sesión, el reloj suelto, la palabra en morse de esta sesión y lo que la v0.2 no
llegó a guardar. Todo eso vive en memoria: **recargar devuelve un sistema sano**,
para que nadie se encuentre una app rota sin saber por qué.

`flashnotes:lockout` es la excepción declarada — ver §13.

**Para probar sin descifrar morse:** poner `flashnotes:v02` a `on` y
`flashnotes:v02word` a cualquier palabra, y recargar. Sirve para verificar; no es
la forma de descubrirlo.

**Para probar el bloqueo sin seis colapsos:** poner `flashnotes:lockout` a
`{"until": <ahora + 300000>, "chroma": false}` y recargar.

**Ninguna lectura puede tumbar la pantalla.** Todas van dentro de `try/catch` y
lo que no se entiende se descarta empezando de cero: un marcador corrupto, una
lista que no es una lista o un navegador sin permiso dan el estado vacío y nunca
una excepción.

Todo lo que se guarda vive en **este navegador**. Borrar los datos del sitio
borra secretos, piezas y marcadores — las notas de la v1.0 no, que están en el
servidor.


---

# Accesibilidad, en una tabla

| Regla | Dónde se aplica |
| ----- | --------------- |
| Nada se anuncia al lector de pantalla… | fragmentos (§2), rótulo invertido (§4), capa de colapso (§13), ventanas fantasma (§14), página muerta (§21) |
| …salvo lo que es información real | la reconexión (§11) sí se anuncia |
| Ningún efecto entra en el orden de tabulación | el botón secreto (§5) y el reloj (§20) no son `<button>` |
| El nombre real se mantiene en `.sr-only` | §2 y §4 |
| El reloj **sí** tiene nombre accesible | quien usa lector oye la hora, que es lo que ese hueco dice que es (§20) |
| Ningún efecto mueve la maqueta | hueco reservado en `ch` (§2) |
| Ningún efecto roba el foco | §13 — ni el colapso ni el bloqueo enfocan nada |
| Ningún efecto se come un clic | las ventanas fantasma llevan `pointer-events: none` (§14) |
| Un control que se rompe **lo dice** | el interruptor de tema pasa a `[✗ SEÑAL]`, deshabilitado y con nombre accesible que explica que hay que recargar (§14) |
| Destellos rápidos, sólo si los provocás | la ráfaga de §14 es rápida a propósito y `prefers-reduced-motion` la apaga entera |
| `prefers-reduced-motion` desactiva el movimiento | todas; §14 se queda quieta en vez de desaparecer |

**Qué hace exactamente `prefers-reduced-motion`**, pieza por pieza:

| Pieza | Qué pasa |
| --- | --- |
| §25 arranque del monitor | **Se salta entero** |
| §4 rótulo en vídeo inverso | **No ocurre en absoluto** — no se degrada a una versión quieta, porque un rótulo mal escrito sin corrección visible sería sencillamente un error |
| §3 arranques raros | El texto sale quieto y entero, sin tecleo ni borrado |
| §1 glitch ambiental | No se programa nada |
| §13 colapso | Se reduce a un corte a negro de 400 ms con el texto de rearranque ya escrito |
| §14 fallo cromático | **Se ve, pero quieta.** Es la única que no se apaga entera, porque su información no está en el movimiento |
| §14 ventanas fantasma | No se abre ninguna |
| §14 sacudida de tema | No ocurre, **ni suelta ni en ráfaga** |
| §24.6 tirones de la v0.2 | No se programan |

---

# Dónde vive cada cosa

**El estado compartido** — almacenes de módulo con `useSyncExternalStore`, que es
el patrón de la casa: lo miran varios componentes a la vez y con un `useState`
por componente cada uno tendría el suyo.

```
src/hooks/useSystemState.ts             integridad, efectos, secretos, sesión,
                                        colapsos, bloqueo, saludos, v0.2
src/hooks/useGlitch.ts                  el glitch y su gravedad
src/hooks/useSystemFragment.ts          el fragmento visible
src/hooks/useClock.ts                   el latido de la hora
src/hooks/useNoteCommands.ts            ejecución de comandos y sus efectos
src/hooks/useTrash.ts                   la papelera y el archivo fantasma
```

**La lógica pura** — texto y números, sin DOM ni relojes propios, con el azar
inyectado. Todo se prueba sin montar nada.

```
src/lib/system/commands.ts              registro de comandos          §6 §19
src/lib/system/lore.ts                  fragmentos, frases, borrados  §2 §3 §10
src/lib/system/idle.ts                  cuánto hace que no tocás nada §2
src/lib/system/helpHint.ts              si ya te mandó a //help       §18
src/lib/system/greeting.ts              saludo y conversación         §16 §21
src/lib/system/glitchTiming.ts          intervalos, gravedad, rebanadas   §1
src/lib/system/asciiNoise.ts            los cuatro modos de interferencia §13
src/lib/system/collapseEscalation.ts    la escalada y el umbral       §13
src/lib/system/lockoutPuzzle.ts         el volcado y su celda rota    §13
src/lib/system/staticNoise.ts           ruido de píxeles (sin usar hoy)
src/lib/system/requestLog.ts            búfer circular de 40          §8
src/lib/system/ghostFile.ts             SYSTEM.LOG                    §9
src/lib/system/diagnostics.ts           la temperatura del núcleo     §7
src/lib/system/strain.ts                lo que cuesta lo que pasa     §7
src/lib/system/secretsRank.ts           la barra y los escalones      §7
src/lib/system/pong.ts                  la física del vsync-test      §15
src/lib/system/pongScores.ts            los dos marcadores            §15
src/lib/system/timeDrift.ts             el reloj suelto               §17
src/lib/system/asciiArt.ts              las dieciséis piezas          §18
src/lib/system/artHints.ts              las tres pistas hacia //art   §18
src/lib/system/artScrap.ts              RECUPERADO.bin                §18
src/lib/system/artCorruption.ts         cómo se come el dibujo        §18
src/lib/system/commandUnlock.ts         qué comandos se descubrieron  §19
src/lib/system/morse.ts                 el código del reloj           §20
src/lib/system/confirm.ts               la pregunta [y/n]             §22
src/lib/system/wipe.ts                  la secuencia de borrado       §22
src/lib/system/dropped.ts               lo que la v0.2 no guardó      §24.1
src/lib/system/boot.ts                  el arranque del monitor       §25
src/lib/system/replyTiming.ts           ritmo de las respuestas       §6
src/lib/system/v02*.ts                  todo lo de la v0.2            §24
```

**Lo que se pinta**

```
src/components/effects/GlitchLayer.tsx      franjas, rebanadas, negativo  §1
src/components/effects/BootPrompt.tsx       el tecleo del editor          §3 §6
src/components/effects/BootScreen.tsx       el encendido del monitor      §25
src/components/effects/SystemCollapse.tsx   estática, muerte y rearranque §13
src/components/effects/SystemLockout.tsx    la pantalla de fallo y el puzzle §13
src/components/effects/ChromaticFailure.tsx franjas de color y tema       §14
src/components/effects/PhantomError.tsx     las ventanas que no son tuyas §14
src/components/effects/PongOverlay.tsx      el vsync-test                 §15
src/components/effects/WipeScreen.tsx       el borrado y la broma         §22
src/components/effects/DeadPage.tsx         la página muerta              §21
src/components/effects/V02Skin.tsx          la piel de la v0.2            §24
src/components/effects/V02Glitches.tsx      sus tirones solos             §24.6
src/components/effects/ScrambleLine.tsx     las letras que no paran       §19
src/components/layout/SystemLabel.tsx       vídeo inverso y botón secreto §4 §5
src/components/layout/SystemClock.tsx       el reloj y el morse           §20
src/components/layout/StatusBar.tsx         el fragmento y la reconexión  §2 §11
src/components/notes/CollectionView.tsx     el catálogo con sus huecos    §23
src/components/system/DiagnosticPanel.tsx   el panel                      §7
src/styles/glitch.css                       todos los fotogramas
```

> `glitch.css` se importa **dentro de una capa de cascada**, como `terminal.css`
> y `animations.css`. Fuera de capa anularía utilidades de Tailwind; ya pasó una
> vez y costó caro (ver [`DISENO.md`](DISENO.md)).
