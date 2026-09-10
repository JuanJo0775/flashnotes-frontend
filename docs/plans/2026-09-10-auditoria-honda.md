# Auditoría honda · 2026-09-10

La primera auditoría ([`2026-09-09`](2026-09-09-auditoria.md)) se cerró entera. Ésta
va sobre **los mismos temas** —animaciones, efectos, sonido, lore, secretos— pero
con **otros métodos**, porque repetir el método encuentra lo mismo.

---

## 0 · Qué se hizo distinto

| Método | Qué busca | Qué encontró |
| --- | --- | --- |
| **Contar hacia atrás** | Cada secreto, cada pieza, cada marca de sonido, cada efecto: ¿quién lo dispara? | Nada. Limpio. |
| **Código muerto** | Exportados que no usa nadie, y los que sólo usan los tests | Nada nuevo |
| **Recarga vs reinicio** | Estado de módulo que una recarga se lleva y `rebootSystem` no | **Tres cosas** |
| **Leer dos piezas juntas** | Contradicciones entre textos escritos en momentos distintos | **Una, grave** |
| **Orden de pintado** | Capas que existen, se montan y no se ven | **Tres pantallas** |
| **Paridad** | es/en, v1.0/v0.2, catálogo/realidad | Una clave muerta |

⚠ **Y lo que salió limpio se anota igual**, porque si no, la tercera auditoría
vuelve a mirarlo:

- **Los 34 secretos son alcanzables.** Cada `SECRET_ID` tiene quien lo marque
  fuera de la propia lista. (La auditoría anterior falló acá por un grep con el
  filtro mal puesto; esta vez el barrido es exhaustivo y automático.)
- **Las 25 marcas de sonido de pantalla se disparan**, y los 31 efectos del
  catálogo los pone algún componente. Ninguno es decorado muerto.
- **Las 16 fuentes de pieza tienen quien las gane**, salvo `reserved-tape`, que
  está declarada como pendiente a propósito.
- **i18n: 152 claves en los dos idiomas, ninguna sin traducir**, y los 18 efectos
  de comando tienen quien los atienda.
- **`BootGate` no tiene fallo de hidratación**, que era mi sospecha: lee
  `isV02()` al pintar y sin guardia. Se comprobó con el HTML del servidor —el
  primer render es el tubo cerrándose, y esa lectura sólo ocurre en el acto
  `tecla`, que llega por temporizador, o sea ya en el cliente.

---

## 1 · Roto, y arreglado el mismo día

### 1.1 · Tres pantallas del banco se montaban y no se veían

**La avería de señal, la piel de la v0.2 y la dieciséis.** El visor las montaba
con su CSS y su ritmo y pintaba un cuadro negro.

**Medido:** el diálogo del visor vive dentro de un `<main>` con `z-index: 2`
—contexto de apilamiento propio— y su fondo es opaco. Las pantallas se portan a
`body`: las que se pintan solas van a `z-index` 10000 y quedan por encima, pero
estas tres se apoyan en la maqueta, y `.container-terminal` vive en `z-index: 2`.

⚠ **Y lo que se veía engañaba:** un cuadro negro no se lee como «falta el
fondo», se lee como que la pantalla está rota. Lo tomé por un fallo de la
dieciséis hasta que abrí «La versión vieja» y salía igual — lleva rota desde que
existe.

**Arreglado** (`d961a72`): no se portan, se montan dentro. Ninguna necesitaba el
portal — existe porque el arranque y el barrido apagan a sus hermanas con
`body > *`, y éstas no apagan a nadie.

### 1.2 · La hoja del turno contradecía al murmullo de la v0.2

`TURNO_3.txt` en la papelera contra `[TURNO 2/2]` en la versión vieja: **en un
sitio de dos turnos no puede haber un tercero.** Las dos piezas son de ayer y de
hoy, y ninguna estaba mal por su cuenta.

**Arreglado**: `[TURNO 2/3]`. Y mejora, porque ahora cuentan algo juntas — el
turno 3 es el de noche, el que escribió la hoja, y el que después no cubrió
nadie. Con `[RELEVO EN 6 H]` encaja: tres turnos de ocho horas.

> ⚠ **La lección es el método, no la errata.** Ninguna pieza de lore se puede
> revisar sola: sólo contradice leyéndola contra otra. Cuando entre una frase
> nueva con un DATO —un número, una hora, un nombre— hay que buscar el otro
> sitio donde ese dato ya está dicho.

---

## 2 · Roto, y arreglado después

### ~~2.1 · El reinicio no es una recarga~~ · HECHO

`rebootSystem` dice, en su propio comentario: *«lo que se limpia es lo que una
recarga se lleva, ni más ni menos»*. No era verdad para tres cosas.

| Qué | Dónde | Por qué importa |
| --- | --- | --- |
| **Los golpes a la pared** | `looseWall.ts` · `golpes` | El módulo dice que no pueden sobrevivir a una recarga —«lo que se derrumba tiene que derrumbarse mientras mirás»— y sobreviven al reinicio: se puede dejar el cuadro a un golpe, reiniciar, y encontrarlo igual |
| **El registro de peticiones** | `requestLog.ts` · `buffer` | `//log` después de reiniciar enseña peticiones de antes del reinicio |
| **Las recién reveladas** | `asciiArt.ts` · `recienReveladas`, `ultima` | La colección vuelve a sintonizar piezas que ya se habían visto llegar |

⚠ **Y una CUARTA que hay que dejar como está y documentar:** `dropped` —lo que
la v0.2 no llegó a guardar— tampoco se limpia, y **no debe limpiarse**: es texto
del usuario esperando a `//recover`. Sin una nota que lo diga, el día que alguien
aplique la regla al pie de la letra borra trabajo ajeno. Es una excepción, no un
olvido.

**El reloj suelto era el quinto de esta lista**, y lo encontró el usuario
jugando (`aa1f38a`).

**Hecho** (`068eae7`), y con lo que de verdad importaba: **una sola lista para
los dos sitios que reinician**. Era el problema de fondo — el reinicio y el
borrado total limpiaban cada uno lo suyo y se separaron en silencio; con dos
listas, la sexta se vuelve a escapar. De paso el borrado total gana lo que le
faltaba: sin esto la pared se quedaba con los golpes de antes.

La excepción de `dropped` está escrita en el código y **probada**, para que
nadie complete la lista sin leer el comentario y se lleve por delante texto de
alguien.

### ~~2.2 · Una clave de idioma muerta~~ · HECHO

`sidebar.noTime` (`'--:--:--'`) está traducida en los dos idiomas y **no la lee
nadie**: el reloj usa `CLOCK_PLACEHOLDER`, una constante con el mismo texto
escrito otra vez en `useClock.ts`.

Dos copias de la misma cadena, una viva y una muerta — que es exactamente lo
que la casa prohíbe (REGLAS · B5).

**Se fue la clave y se quedó la constante**, porque esto no es un texto: es una
MEDIDA. Ocho caracteres que tienen que coincidir con `HH:MM:SS`, y eso no
cambia de idioma — traducirlo sólo abría la puerta a que alguien lo hiciera de
siete.

---

## 3 · Huecos, no defectos

### ~~3.1 · El reloj se suelta en silencio~~ · HECHO

`//date_off` y `//date_on` cambian **un estado permanente de la máquina** y sólo
suenan como cualquier otra respuesta: el teletipo contando renglones.

Compárese con lo que sí tiene voz: el tema cambiando (`relay`), la versión vieja
despertando (`v02-wake`), la señal cayéndose (`sweep`), la red (`net-*`).

**Hecho con el `relay`**, el mismo golpe de contacto del tema: una referencia
horaria que se suelta y se vuelve a fijar es literalmente un enganche, y la
casa no inventa voces — las reparte. Suena igual en los dos sentidos porque el
aparato hace lo mismo; lo que cambia es lo que pasa después.

⚠ **Y hubo que publicar el estado para que sonara.** El reloj suelto vivía en
su módulo y nadie lo anunciaba; el enchufe del audio mira el almacén, así que
lo que no pasa por ahí no suena (REGLAS · B2). Ahora `//date_off` y `//date_on`
pasan por `setClockLoose`, que lo publica.

### ~~3.2 · La hoja del turno entra sin que nadie se entere~~ · HECHO

`TURNO_3.txt` aparece al fondo de la papelera y ya. Las otras tres inyecciones
—el fantasma, el resto de la pieza, la nota del ente— **también** aparecen
calladas, así que es coherente… pero es el único rastro físico de la gente que se
fue, y llega igual que un archivo cualquiera.

**Hecho:** la papelera la trae con la entrada escalonada que ya existe
(`row-feed`) **dos filas más tarde que las demás**. No es un anuncio: es que esa
hoja tarde un poco más en llegar, como algo que estaba más al fondo del cajón.

### ~~3.3 · Volver después de días no cambia nada~~ · HECHO

El ente mide tu ausencia (`ausenciaDeArranque`) y **es el único que se entera**.
La máquina, que lleva el registro de todo el que pasó, no dice nada cuando
vuelves después de una semana.

**Hecho:** `[TURNO REANUDADO]`, a partir de **tres días** sin abrirla. Tres y no
uno — con un día lo dice cualquiera que abra la app los lunes y los miércoles, y
entonces no es una ausencia sino el horario de alguien.

⚠ **Contabilidad y no reproche**, que era el riesgo: «volviste» la convierte en
alguien que te esperaba. Y **no dice cuánto**: un número envejece mal y es la
app contándote tu propia vida. El dato lo pone quien lee.

---

✅ **AUDITORÍA HONDA CERRADA.** Lo único que queda de las dos auditorías es lo
que ya estaba en `IDEAS.md` desde antes: los **marcos a medio dibujar** de la
v0.2 (E2) y la pieza de la cinta, que sigue sin camino decidido.

---

## 4 · El orden que propongo

1. **§2.1 · El reinicio** — tres arreglos de una línea y una nota; es la promesa
   escrita que hoy no se cumple, y ya nos mordió una vez con el reloj.
2. **§2.2 · La clave muerta** — dos líneas.
3. **§3.1 · La voz del reloj** — el hueco de sonido más claro que queda.
4. **§3.3 · La vuelta después de días** — el que más se sentiría, y el más
   delicado de escribir.
5. **§3.2 · La hoja del turno** — el más pequeño de todos.

⚠ **Y lo que NO propongo:** nada de la lista de `reserved-tape`. Sigue esperando
a que su camino esté decidido, y decidirlo no es trabajo de una auditoría.
