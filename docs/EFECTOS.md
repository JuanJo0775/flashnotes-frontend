# Catálogo de efectos

Todo lo que la interfaz hace y que no es «guardar una nota», contado desde
dentro: **qué se ve** y, sobre todo, **por qué está hecho así** — esa segunda
parte es la que evita que alguien lo «arregle» más adelante.

## Dónde está cada cosa

Tres páginas, y cada una responde a una pregunta distinta. Si algo aparece en
dos, sobra en una.

| Página | Responde a |
| --- | --- |
| **`SECRETOS.md`** | *¿Cómo se dispara, y con qué probabilidad?* Disparadores, umbrales, porcentajes exactos y pasos para reproducir. **Es el índice de entrada.** |
| **Ésta** | *¿Por qué está construido así?* Las decisiones, las trampas del navegador y lo que se probó y no funcionó. |
| **`REGLAS.md`** | *¿Qué no puede hacer ningún efecto, nunca?* Las cinco reglas de producto (A1–A5) mandan sobre todo lo de aquí. |

El diseño de conjunto y el lore están en
[`docs/specs/2026-09-01-secretos-del-sistema.md`](specs/2026-09-01-secretos-del-sistema.md).

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

## Índice de piezas

El índice **por disparador** —qué hacer para ver cada cosa— está en
[`SECRETOS.md`](SECRETOS.md), junto con las probabilidades. Acá las piezas van en
el orden en que se construyeron, que es el orden en que se entienden: cada una
apoya en las anteriores.

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

**Cuándo.** Cada 3–7 minutos, más los que dispara el glitch. Nunca dos veces el
mismo seguido.

**Sin animación.** Aparece y desaparece de golpe. Esa sequedad es lo que lo hace
sentir un fallo en vez de un adorno.

### El repertorio

| Fragmento | Condición |
| --------- | --------- |
| `[SYSTEM_OK?]` | siempre |
| `[SYSTEM_0K]` | siempre |
| `[SIGO ACÁ]` | siempre |
| `[TURNO 1/1]` | siempre |
| `[SIN RELEVO]` | siempre |
| `[MEMORIA TIBIA]` | siempre |
| `[SYSTEM_TIRED]` | 02:00–05:00, hora del dispositivo |
| `[NADIE MÁS CONECTADO]` | 02:00–05:00 |
| `[TURNO LARGO]` | sesión > 45 min |
| `[SEGUÍS AHÍ]` | sesión > 45 min y sin teclear hace > 5 min |

`[SYSTEM_0K]` lleva un **cero** en lugar de la O. En JetBrains Mono el cero va
con punto interior, así que se distingue si mirás y no se nota si no. No es un
efecto: es una errata — y una errata inquieta más que un temblor.

`SYSTEM` no se traduce, aunque el resto de la app sí. `[SISTEMA_OK]` se leería
como una app traducida en vez de como una máquina, y la errata del cero perdería
aquello de lo que es errata.

### Dos cosas que parecen detalles y no lo son

**El estado real gana siempre.** Sin red, servidor caído, error, cargando o
guardando: el fragmento no llega a pintarse. Esta barra es lo que le dice al
usuario si su trabajo está a salvo, y eso no se toca ni en broma.

**El fragmento no se anuncia.** La barra es `<footer role="status"
aria-live="polite">`: todo lo que cambie ahí dentro se lee en voz alta. Un
repertorio de frases raras cada tres minutos, para quien usa lector de pantalla,
es una voz que le interrumpe lo que está escribiendo para decirle `SIN RELEVO`.
Eso no es encantador, es hostil. El fragmento va en un nodo `aria-hidden` y el
`[SYSTEM_OK]` real se mantiene en `.sr-only`.

**El hueco tiene ancho reservado.** La barra es `flex` con `gap`: un fragmento más
ancho que `[SYSTEM_OK]` empujaría `[GUARDADO]` y todo lo que sigue. El hueco
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

**Tres fotogramas duros, 620 ms** (`steps(1, end)`, sin transiciones):

```
0 ms     <la variante>          vídeo inverso, rótulo mal
380 ms   [FLASH-NOTES v1.0]     vídeo inverso, rótulo correcto
560 ms   [FLASH-NOTES v1.0]     normal
```

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
el nombre de la app no se corrompe en el árbol de accesibilidad ni por 620 ms.

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

### Los comandos

| Comando | Qué responde |
| ------- | ------------ |
| `//help` | La lista completa |
| `//version` | `FLASH-NOTES v1.0 · NÚCLEO ESTABLE` |
| `//whoami` | Que no puede saberlo (ver abajo) |
| `//sudo` | `NO HAY SUPERUSUARIO. NO HAY USUARIOS. HAY UN NAVEGADOR.` |
| `//uptime` | Tiempo desde que abriste la pestaña |
| `//date` | Tu hora, la del sistema y el desfase |
| `//ls` | Tus notas con guías de puntos |
| `//df` | Total escrito, con el medidor ASCII |
| `//ps` | Los procesos que corren de verdad |
| `//log` | El registro de peticiones (§8) |
| `//history` | Las versiones guardadas de la nota |
| `//diag` | Abre el panel (§7) |
| `//chaos on\|off` | Enciende o apaga los efectos |
| `//panic` | Dispara el colapso (§13) |
| `//clear` | Vacía la nota |

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
```

Cada número es verificable contra el código: 2500 es el debounce del
auto-guardado, 60000 el sondeo de red, 9000 la animación del barrido, 250 el
agrupado del medidor. **El chiste es que no hay chiste.**

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

### La respuesta se teclea

Con el mismo motor que la secuencia de arranque: **18 ms** por carácter, **2 s**
de pausa, borrado a **8 ms**, y la nota vuelve a quedar vacía. Escribir la
descarta en el acto.

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

**Qué muestra**

```
SESIÓN            NO LEGIBLE
TIEMPO ACTIVO     00:47:12
NOTAS CREADAS     12
BYTES ESCRITOS    8.4kb
INTEGRIDAD        100%
TEMA              CLARO
SECRETOS          3/14
NÚCLEO            41°C  ▮▮▮▮▮▯▯▯▯▯
```

`SESIÓN` dice `NO LEGIBLE` por lo mismo que `//whoami`. **El panel no inventa un
dato que no tiene.**

`NÚCLEO` es decoración honesta: se deriva del ritmo de escritura, va de 38 °C a
71 °C y no pretende medir nada. Se dibuja con el `ProgressBar` ASCII que ya
existía, no con un widget nuevo.

`SECRETOS` cuenta **sólo lo que provocaste vos**. Lo ambiental te pasa, no lo
encontrás. El total sale de la longitud del registro, nunca de un número escrito
a mano. Y no puede verse en `0/N`: para leer esa fila ya tuviste que encontrar el
panel, así que lo primero que ves es `1/N`.

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

**Cuándo.** Con la sesión ≥ 10 minutos abierta y ≥ 3 notas.

**Contenido: tu propia actividad.** No es texto inventado que la imita — es el
volcado del registro real de peticiones (§8). Un archivo fantasma que te muestra
algo verificable es incomparablemente más incómodo que uno que lo simula.

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

| Borrados | Qué dice |
| -------- | -------- |
| 1–4 | `Esta acción no se puede deshacer.` — genérico, como cualquier app |
| 5–7 | `Como los otros cuatro.` — menciona que estuvo contando |
| 8–11 | `Van ocho. Ninguna vuelve.` — añade que no hay marcha atrás |
| 12+ | `Ya no las cuento por sesión.` — deja ver que lleva un registro aparte |

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
`//panic`. Dura **4,2 s**.

### La secuencia

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
| `snow` | `▓▒░` | Grano medio, con densidad propia por fila — las vetas horizontales que el ojo reconoce como ruido. |
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

**3 · Pantalla muerta — 2,2 a 2,6 s.** El tubo se apaga: `scaleY(1) → scaleY(0.02)`,
queda una línea horizontal brillante, la línea se cierra a un punto, negro.

**4 · Rearranque — a partir de 2,6 s, y dura lo suyo.**

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

**5 · Vuelta.** La capa se retira sin fundido y la integridad vuelve a 100.

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

> **El puzzle se endureció.** El patrón era de 5 bytes en una rejilla de 10
> columnas, y 5 divide a 10: la repetición caía en columnas perfectas y la celda
> rota saltaba a la vista sin buscarla. Ahora el patrón es de **7**, primo con
> las 10 columnas, así que se corre una columna por fila y ninguna fila repite la
> alineación de otra.
>
> Y el byte roto ya no es uno al azar —cantaba demasiado— sino **el que tocaba
> con un solo dígito hexadecimal cambiado**. Sigue sin coincidir con ningún byte
> del patrón: difícil no es lo mismo que imposible.

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

Y ahí sí queda la pantalla de fallo crítico con su volcado de memoria:

```
0000   7F 3A 2B 91 4C 7F 3A 2B 91 4C
000A   7F 3A 2B 91 4C 7F 3A 2B 91 4C
0014   7F 3A 2B 91 4C 7F E9 2B 91 4C
0028   7F 3A 2B 91 4C 7F 3A 2B 91 4C
```

**El volcado repite un patrón y una sola celda lo rompe.** Haciendo clic en esa
celda, el sistema se recupera. Las columnas ocupan el ancho entero del cuadro: un
volcado de verdad llena su caja, y además las celdas separadas son objetivos más
grandes y más fáciles de comparar entre sí.

El puzzle **no lleva instrucciones**, y es deliberado: una rejilla que repite un
patrón con una celda distinta se resuelve mirando, y explicarlo lo convertiría en
un formulario. Se resuelve con un **clic** y no escribiendo porque el teclado es
del editor, que sigue vivo debajo — pedirte que escribas acá te robaría las
pulsaciones.

**La memoria corrupta se VE corrupta.** El cuadro entero lleva la misma
aberración cromática del fallo del tema, y el volcado tiembla un poco más que el
resto porque es lo que hay que leer. No es sólo decoración: partir los canales de
un volcado hexadecimal lo vuelve **materialmente más difícil de escanear**, que
es exactamente lo que tiene que ser un puzzle que te bloquea la pantalla. Ver una
irregularidad en una cuadrícula limpia es fácil; verla con los dígitos
temblando, no.

**Errar rehace el volcado entero** — patrón nuevo y celda rota nueva. Sin eso,
cada fallo sólo tacharía una celda y el puzzle se resolvería por descarte:
sesenta clics y listo. Rehaciéndolo, cada intento vuelve a ser una búsqueda. Lo
que NO hace es regenerarse en cada render: ahí el byte saltaría de sitio mientras
lo mirás, que sería tramposo en vez de difícil.

**Es lo único de toda la app que sobrevive a recargar la página.** Recargar es la
salida fácil de cualquier otro efecto; acá justamente no la hay. Se guarda el
instante de vencimiento, no un booleano, así que la espera corre aunque cierres
la pestaña.

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

```
VSYNC-TEST                42  (7 partidas)
VSYNC-TEST DEGRADADO      12  (3 partidas)

RÉCORD DEL SISTEMA       118.394
```

El récord del sistema ya está puesto cuando llegás. Lleva jugando desde antes que
vos y no tenía nada más que hacer.

Viven en `localStorage` con el mismo patrón que el tema y el bloqueo: atados a
este navegador, sobreviven a recargar. **No van a Mongo**: guardar un contador de
peloteo pedía colección, endpoint y migración, y el backend no se toca.

Se ven en el panel de diagnóstico, que gana así una razón para reabrirlo.

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

Ocho piezas, cada una con su pie:

```
     \         /     
  .--.\.-----./.--.  
 /    \|     |/    \ 
|  /\  |  .  |  /\  |
 \ \/  '.___.'  \/ / 
  '--'    |    '--'  
          |          
-- POLILLA · HALLADA EN EL RELÉ 70, 1947
PIEZA NUEVA · 1/8
```

**Se coleccionan, y `//art` prioriza las que te faltan.** Sorteando a ciegas
entre las ocho, conseguir la última pedía una media de veinte intentos y
coleccionar se volvía un trámite. Dando primero las que no tenés, cada tirada
avanza; completada, empieza a repetir y lo dice.

La colección vive en `localStorage`, atada a este navegador, con el mismo patrón
que los marcadores del pong.

### `//keep` · quedarse una

Se desbloquea con **la primera** pieza —esperar a tenerlas las ocho dejaría el
comando inútil justo mientras coleccionás, que es cuando dan ganas de guardar
una— y escribe el dibujo en la nota abierta. Sólo puede pasar con la nota en
blanco, porque el comando ES todo el contenido, así que no pisa nada.

Guarda **la última que salió**, y esa memoria es de sesión y no de
almacenamiento: quedarse una pieza es un gesto del momento, y recordar entre
sesiones cuál viste hace tres días haría que `//keep` guardara algo que ya no
tenés delante.

> ⚠ **Todo ASCII imprimible.** Los bloques (`█ ▌ ░`) no están en JetBrains Mono y
> los pinta una fuente de reserva con otras métricas, así que un dibujo con
> bloques se descuadra fila a fila. Es la misma trampa que hizo bailar el corte
> del pong — ver [REGLAS.md · C8](REGLAS.md). Dos tests lo fijan: todo carácter
> dentro del ASCII imprimible, y todas las filas de una pieza del mismo ancho.

---

# 19 · La ayuda no lo dice todo

`//help` listaba los dieciocho comandos. Bastaba teclearlo una vez para que no
quedara nada por descubrir: las piezas dejaban de ser secretos y pasaban a ser un
menú.

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

| Anunciados | Escondidos |
| ---------- | ---------- |
| `//help` `//version` `//clear` `//ls` `//df` `//date` `//hi` | `//whoami` `//sudo` `//uptime` `//ps` `//log` `//history` `//diag` `//chaos` `//panic` `//date_off` `//art` `//keep` `//attach_*` |

### Tres fugas, para que nada sea inalcanzable

Un secreto que nadie puede encontrar no es un secreto, es código muerto — el
error exacto que ya se cometió con el umbral de diez colapsos. Así que hay tres
maneras de que un comando escondido llegue a vos:

1. **`//help` dice CUÁNTOS faltan, no cuáles.** `12 COMANDOS NO LISTADOS.` Sabés
   que hay que buscar; sigue habiendo qué buscar.
2. **Una de cada cuatro veces se le escapa uno.** `UNO SE ME ESCAPÓ: //panic`
3. **Las ventanas de error del fallo cromático los nombran**, una de cada tres:
   `SÍMBOLO SIN RESOLVER: //chaos`

La tercera es la mejor. Las dos primeras se leen como ayuda; una ventana de error
que muestra un comando en un volcado se lee como un descuido, y **enterarte de
algo que el sistema no quería contarte vale más que enterarte porque te lo
contó.**

### Y una de cada seis veces no está para listas

```
//help
> LA LISTA LA TENÍA ALGUIEN QUE YA NO TRABAJA ACÁ.
```

Una ayuda que siempre contesta igual se lee como documentación; ésta es una
máquina cansada. Volver a pedirla funciona: es un desplante, no una avería — un
comando que a veces no anda de verdad sería un defecto, no un chiste.

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

> **La puerta está, la habitación no.** Teclear la palabra todavía no hace nada:
> abre la v0.2, que está por construirse. Ver [`IDEAS.md`](IDEAS.md) · E.

---

# 21 · La conversación se agota

Dos preguntas, y sólo **justo después de un `//hi`**:

| | |
| --- | --- |
| `//whoareu` | quién sos |
| `//howareu` | cómo estás |

Fuera de esa ventana no existen: no se niegan, no están.

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

`//reset`. Los secretos, las piezas, los marcadores, los comandos desbloqueados,
la palabra en morse, el reloj suelto, el bloqueo, la integridad. Todo a cero.

```
TODO A CERO.

LOS SECRETOS, LAS PIEZAS, LOS MARCADORES.
SUS NOTAS NO. ESAS SON SUYAS.
```

**No toca las notas, y eso es lo importante de esta pieza.** Reiniciar el juego
no es reiniciar tu trabajo: un comando escondido que se lleve por delante lo que
escribiste no es un huevo de pascua, es una pérdida de datos — la primera regla
del proyecto. Dos tests lo fijan.

Tampoco toca si apagaste los efectos: eso es una preferencia tuya, no una parte
del juego que se gane.

---

# 23 · La colección

`//keep` no escribe el dibujo en la nota abierta: **crea una pieza**. Y una pieza
no es una nota.

```
[NOTAS]   [PAPELERA]   [★ COLECCIÓN 3]
```

### Se llaman por lo que son

`TERMINAL · 3/8`, no «Nueva nota». Es una **ficha de catálogo**: dice qué pieza es
y cuántas hay. El número es su sitio en la colección, no el orden en que la
encontraste.

### Y no se tratan como notas

No las escribiste, no se editan y no tienen por qué estorbar entre tus archivos:

- **Fuera de la lista de notas y de la barra lateral.** Filtrarlas sólo de la
  lista principal las dejaba asomando por el lado.
- **Fuera del recuento.** Cinco archivos siguen siendo cinco archivos.
- **No se abren en el editor** ni llevan tamaño en bytes, ni fecha, ni `[ABRIR]`.
  Se ven, que es lo único que se hace con una colección.
- **Enteras, sin recortar.** Una pieza cortada a tres líneas no es una pieza, es
  una nota con un dibujo dentro — justo lo que esta vista existe para no ser.

### La pestaña no está hasta que la ganás

Sin ninguna pieza, `[★ COLECCIÓN]` **ni aparece**. Enseñarla vacía anunciaría que
hay una colección que llenar, y encontrar la primera pieza es parte de lo que se
descubre.

### ⚠ La marca vive en el navegador

El backend no sabe que una nota es una pieza, y no va a saberlo: **no se toca el
backend para un efecto** (REGLAS · B4). Un campo nuevo en el modelo, una
migración y un endpoint por un huevo de pascua es exactamente el cambio que esa
regla existe para frenar.

El precio, dicho claro: **abrir la app desde otro navegador enseña las piezas como
notas normales.** Lo mismo que ya pasa con la colección de `//art` y con los
marcadores del pong — todo el juego es de este navegador.

---

# Accesibilidad, en una tabla

| Regla | Dónde se aplica |
| ----- | --------------- |
| Nada se anuncia al lector de pantalla… | fragmentos (§2), rótulo invertido (§4), capa de colapso (§13) |
| …salvo lo que es información real | la reconexión (§11) sí se anuncia |
| Ningún efecto entra en el orden de tabulación | el botón secreto (§5) no es un `<button>` |
| El nombre real se mantiene en `.sr-only` | §2 y §4 |
| Ningún efecto mueve la maqueta | hueco reservado en `ch` (§2) |
| Ningún efecto roba el foco | §13 |
| Destellos rápidos, sólo si los provocás | la ráfaga de §14 es rápida a propósito y `prefers-reduced-motion` la apaga entera |
| `prefers-reduced-motion` desactiva el movimiento | todas; §14 se queda quieta en vez de desaparecer |

---

# Dónde vive cada cosa

```
src/hooks/useSystemState.ts             integridad, efectos, secretos, sesión
src/hooks/useGlitch.ts                  el glitch y su gravedad
src/hooks/useSystemFragment.ts          el fragmento visible
src/hooks/useNoteCommands.ts            ejecución de comandos
src/lib/system/lore.ts                  fragmentos y frases, en los dos idiomas
src/lib/system/commands.ts              registro de comandos, puro
src/lib/system/glitchTiming.ts          intervalos, gravedad, rebanadas
src/lib/system/requestLog.ts            búfer circular
src/lib/system/ghostFile.ts             SYSTEM.LOG
src/lib/system/diagnostics.ts           la temperatura del núcleo
src/components/effects/GlitchLayer.tsx      franjas, rebanadas, negativo
src/components/effects/SystemCollapse.tsx   estática, muerte y rearranque
src/components/effects/ChromaticFailure.tsx franjas de color y sacudida de tema
src/components/layout/SystemLabel.tsx       vídeo inverso y botón secreto
src/components/system/DiagnosticPanel.tsx   el panel
src/styles/glitch.css                       todos los fotogramas
```

> `glitch.css` se importa **dentro de una capa de cascada**, como `terminal.css`
> y `animations.css`. Fuera de capa anularía utilidades de Tailwind; ya pasó una
> vez y costó caro (ver [`DISENO.md`](DISENO.md)).
