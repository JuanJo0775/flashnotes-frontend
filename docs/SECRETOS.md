# Catálogo de secretos y efectos

**Qué es esto:** la lista completa de todo lo escondido en FlashNotes, con **cómo
se reproduce cada cosa**, sus probabilidades exactas, sus umbrales y dónde vive
el código.

**Para qué sirve:** para poder comprobar cualquier efecto sin adivinar, y para
que ninguna probabilidad quede sólo en la cabeza de quien la escribió. Si un
número de aquí no coincide con el código, **manda el código** — y hay que
corregir esta página.

## Dónde está cada cosa

Tres páginas, cada una con una pregunta. Si algo sale en dos, sobra en una.

| Página | Responde a |
| --- | --- |
| **Ésta** | *¿Cómo se dispara, y con qué probabilidad?* **Empezá acá.** |
| [`EFECTOS.md`](EFECTOS.md) | *¿Por qué está construido así?* Las decisiones y las trampas. |
| [`REGLAS.md`](REGLAS.md) | *¿Qué no puede hacer ningún efecto?* Las cinco reglas A1–A5. |

---

## Índice por disparador

Qué hacer para ver cada cosa. El enlace lleva a la pieza en `EFECTOS.md`, que
cuenta cómo está hecha.

| Lo que hacés | Lo que pasa |
| --- | --- |
| Nada, dejar la pestaña abierta | Glitch ambiental · fragmentos · barrido trabado |
| Abrir la app | Arranque en vídeo inverso |
| Abrir una nota vacía | Arranques raros — **y en la v0.2, el marcador con comando** (§7.3) |
| Escribir `//` y un comando | Comandos en el prompt (§2) |
| `//diag` o Alt+clic en `[SYSTEM_OK]` | Panel de diagnóstico |
| Clic 3 en el rótulo | El botón secreto |
| Clic 9 en el rótulo, o `//panic` | Colapso del sistema |
| Seis colapsos seguidos | El bloqueo |
| **10 toques rápidos al tema** | Fallo cromático (§4) |
| Entrar a la papelera con la sesión avanzada | El archivo fantasma |
| Borrar cinco notas para siempre | La papelera lleva la cuenta |
| `//ps` y después `//attach_6` | El pong escondido (§6) |
| `//hi`, y otra vez, y otra | La escalada (§3) |
| `//hi` y enseguida `//whoareu` | La conversación se agota (§3) |
| `//art`, y después `//keep` | Las piezas coleccionables (§5) |
| **Tres clics en la hora** | **La puerta de la v0.2 (§1)** |
| Descifrar el morse y teclearlo | Entrar en la v0.2 (§7) |
| En la v0.2: tirar una nota y recuperarla | Vuelve corrompida, y a veces con un comando (§7.2) |
| `//reset` | Empezar de cero |

---

## Cómo leer las tablas

| Columna | Qué dice |
| --- | --- |
| **Probabilidad** | La de que ocurra en un intento. `1/1` = siempre. |
| **Intentos** | Cuántos hacen falta de media. Es `1 / probabilidad`. |
| **Reproducir** | Los pasos exactos, sin atajos de consola. |

Todo lo que se guarda vive en `localStorage` **de este navegador**. Borrar los
datos del sitio borra secretos, piezas y marcadores — las notas de la v1.0 no,
que están en el servidor.

---

# 1 · La puerta de la v0.2

Es el secreto más profundo y el único que abre una versión entera.

| | |
| --- | --- |
| **Dónde** | El reloj del pie de la barra lateral |
| **Gesto** | **Tres clics** sobre la hora |
| **Ventana** | **1600 ms** entre clic y clic |
| **Dura** | **9000 ms** en pantalla, luego vuelve a ser un reloj |
| **Código** | `src/components/layout/SystemClock.tsx`, `src/lib/system/morse.ts` |

**Reproducir:**

1. Clic, clic, clic sobre la hora, sin pasarse de segundo y medio entre uno y
   otro.
2. La hora se cambia por algo como `--:.-:-..:---`. Son **letras en morse
   separadas por dos puntos**.
3. Descifrarlo. Sale una palabra de las diez de la lista.
4. Teclearla como comando en el editor: `//<palabra>`.

**La palabra cambia en cada sesión** y sale de `WORDS` (10 palabras) en
`morse.ts`. No está en `//help` ni puede estarlo: se reconoce en el resolvedor
justo antes de dar «comando desconocido», así que las ventanas de error tampoco
la filtran.

> ⚠ **Riesgo conocido, sin resolver:** si a nadie se le ocurre que eso es morse,
> la v0.2 no existe para esa persona. Sigue en `IDEAS.md` · E5.

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

# 2 · Los comandos escondidos

Se teclean en el editor. **Sólo se desbloquean al USARLOS**, no al verlos: hasta
entonces su sitio en `//help` lo ocupa una animación de letras aleatorias
(`ScrambleLine`, 90 ms por tic, 2 letras por tic).

Cada comando **conserva su posición** en la lista: descubrir uno destapa su
hueco, no lo añade al final.

| Comando | Qué hace | Cómo se descubre |
| --- | --- | --- |
| `//hi` | Saludo que se va agriando | Probar a saludar |
| `//whoareu` | Quién te saludó | Encadenando tras `//hi` |
| `//howareu` | Qué tal está | Encadenando tras `//hi` |
| `//date_off` | Descontrola hora **y fecha** | Azar / ventanas de error |
| `//art` | Enseña una pieza ASCII | Azar / ventanas de error |
| `//keep` | Guarda la pieza como coleccionable | Tras encontrar una pieza |
| `//attach_<n>` | Se engancha a un proceso | Leyendo `//ps` |
| `//reset` | Borra secretos, piezas y marcadores — **no las notas** | Azar / ventanas de error |

**Dónde se filtran los que aún no conocés:** en las ventanas de error del fallo
cromático y en momentos de pánico sale alguno suelto. Es a propósito: un secreto
que sólo se alcanza por azar puro es un secreto inalcanzable.

---

# 3 · `//hi` y la escalada

Un solo contador compartido entre `//hi`, `//whoareu` y `//howareu`.

| Saludos | Qué contesta |
| --- | --- |
| 1–2 | Cordial |
| 3–4 | Seco |
| 5–6 | `DÉJEME TRABAJAR` |
| 7 | `...` |
| **8** | **Te echa de la nota** |

- **Ventana:** 3 minutos (`GREETING_WINDOW_MS`), contados **desde el último
  saludo**, no desde el primero. Insistir mantiene viva la cuenta.
- **Tras la expulsión:** volver a entrar e insistir **2 veces más**
  (`KILL_AFTER_KICKS = 3`) deja la página **muerta en negro**. Cerrar la pestaña
  desde la propia página no se puede — el navegador no lo permite — y esto es el
  plan B.
- **`//whoareu` / `//howareu`:** ventana de **60 s** (`CHAT_WINDOW_MS`),
  desaparecen al **tercer** intento (`CHAT_GONE_AT`). Cuando desaparecen
  contestan **exactamente** lo mismo que un comando inexistente: no hay forma de
  distinguir que se fueron.

**Código:** `src/lib/system/greeting.ts`

---

# 4 · El fallo cromático y el colapso

| | |
| --- | --- |
| **Se provoca** | El botón secreto de la cabecera |
| **Se rompe del todo** | A los **10** toques |
| **Con la señal ya rota** | Va directo al fallo crítico, sin esperar a los 10 |

**Código:** `src/hooks/useSystemState.ts` · `registerCollapse`

---

# 5 · Las piezas ASCII coleccionables

1. `//art` enseña una pieza.
2. `//keep` la guarda **como coleccionable**, no como nota.
3. El título pasa a ser **el nombre de la pieza más su número**.
4. Viven en su propia pestaña, con estrella, junto a NOTAS y PAPELERA.

Se guardan en este navegador. `//reset` las borra; **las notas no**.

---

# 6 · El pong

| | |
| --- | --- |
| **Contra la pared** | Flechas |
| **Con alguien** | Comando aparte, para no pisar el de un jugador |
| **Marcadores** | Por sesión, como las notas |
| **Marcador aparte** | Si se juega **durante el glitch de claro/oscuro** — se ve peor y es más difícil, así que su marca no se mezcla |
| **Dónde se ven** | Desde el panel secreto |

---

# 7 · La v0.2 · efectos y probabilidades

Todo lo de esta sección **sólo ocurre dentro de la v0.2**.

## 7.1 · Guardar

| Efecto | Probabilidad | Intentos | Constante |
| --- | --- | --- | --- |
| Dice que no guardó **y sí guardó** | **22 %** | ~5 | `LIE_ODDS` |
| **No guarda de verdad** | **6 %** | ~17 | `DROP_ODDS` |

El descarte se sortea **antes** que la mentira. Lo que no se guardó se recupera
con `//recover` mientras la sesión siga abierta: perder de verdad, sí; perder
para siempre y sin aviso, no.

**Código:** `src/lib/system/v02.ts` · `saveOutcome()`

## 7.2 · La papelera

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

## 7.3 · La nota vacía

| Efecto | Probabilidad | Constante |
| --- | --- | --- |
| El marcador **trae un comando pegado** | **18 %** | `PLACEHOLDER_LEAK_ODDS` |

Abrir una nota vacía en la v0.2 no dice «Escribe algo…»: dice `aca el usuario
empieza a escribir`. Es el apunte que alguien se dejó a sí mismo y nunca
sustituyó. Una de cada seis veces lleva pegado un comando.

**Es el segundo camino a los comandos exclusivos**, y existe justamente porque un
solo camino al 7 % es un secreto inalcanzable.

**Código:** `src/lib/system/v02Messages.ts`

## 7.4 · Los comandos de la v0.2

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

## 7.5 · Las etiquetas mal escritas

**Una de cada cuatro** sale mal, y de tres maneras:

| Cómo | Ejemplo |
| --- | --- |
| Sin traducir | `[+] CREATE FIRST FILE` |
| A medio hacer | `LIST.EMPTYBANNER_659` |
| Mal traducida | `[+] NUEVO ARCHIVO (SIC)` |

**Es determinista por clave:** la misma etiqueta se rompe **siempre igual**. Si
cambiara en cada repintado sería un cartel de neón parpadeando, y se leería como
una avería en vez de como una versión vieja.

**Constante:** `BROKEN_LABEL_ODDS = 0.26` · **Código:** `v02.ts` · `v02Label()`

## 7.6 · Los tirones de color, solos

| | |
| --- | --- |
| **Cada** | 6–15 s, sin que nadie los pida |
| **Nivel** | `major` forzado, no sorteado |

Con el sorteo la mayoría caían en `minor` y no se veían, y un tirón que no se ve
no cuenta como avería. **Ésa es la diferencia entre las dos versiones:** en la
v1.0 el fallo es algo que provocás; en la v0.2 es el estado normal de la casa.

## 7.7 · El reloj y la fecha

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

## 7.8 · La pantalla de carga

Una barra dibujada con `#` y `.`, con el número al lado, y los dos mintiendo:
sube a tirones, **a veces retrocede** (25 %) y **pasa del cien** sin inmutarse.

El relleno se planta al llegar al borde y el número sigue subiendo: ver las dos
cosas a la vez es lo que delata que nadie las ató.

> **No bloquea nada.** La lista aparece cuando llegan los datos, diga la barra lo
> que diga. Si el número mandara, una versión que cuenta mal dejaría esperando de
> verdad, y eso ya no sería un efecto de época.

**Código:** `src/lib/system/v02Loading.ts`

## 7.9 · Sus archivos son OTROS

Entrar por primera vez encuentra **la versión vacía**. Lo que escribas ahí no
aparece en la v1.0 ni al revés, y **su papelera también es suya**.

Viven en el navegador, no en el servidor — y no sólo porque el servidor no se
toca para un efecto: **es lo que cuenta la historia.** La v0.2 guardaba sus cosas
en otro sitio, nadie migró nada, y por eso siguen ahí sin que la versión nueva
las vea. Es, literalmente, la última línea de su propio `//todo`.

**El precio, dicho claro:** lo escrito en la v0.2 vive sólo en este navegador.

---

# 8 · Lo que NUNCA pasa

Estas reglas mandan sobre cualquier efecto, y la v0.2 no es una excepción:

1. **Nada aparenta perder trabajo sin una red debajo.** La v0.2 pierde de verdad
   el 6 % de las veces, pero con `//recover` y dentro de la sesión.
2. **Nada bloquea la escritura.** Ningún efecto impide seguir escribiendo.
3. **`prefers-reduced-motion` gana** a cualquier animación.
4. **La salida siempre existe.** De la v0.2 se sale con la palabra guardada; de
   todo lo demás, con `//reset`.
5. **Nunca se borra algo que no se pidió.** Los fallos de la papelera fallan
   hacia no borrar, siempre.

---

# 9 · Las claves de `localStorage`

Para inspeccionar o limpiar a mano.

| Clave | Qué guarda |
| --- | --- |
| `flashnotes:v02` | Si la v0.2 está encendida (`on`) |
| `flashnotes:v02word` | La palabra con la que se entró — **es la salida** |
| `flashnotes:v02notes` | Los archivos de la v0.2 |
| `flashnotes:v02trash` | Su papelera |

**Para probar sin descifrar morse:** poner `flashnotes:v02` a `on` y
`flashnotes:v02word` a cualquier palabra, y recargar. Sirve para verificar; no es
la forma de descubrirlo.
