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

## 2 · Roto, y pendiente

### 2.1 · El reinicio no es una recarga, y promete serlo

`rebootSystem` dice, en su propio comentario: *«lo que se limpia es lo que una
recarga se lleva, ni más ni menos»*. Hoy no es verdad para tres cosas.

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
jugando. Ya está arreglado (`aa1f38a`).

### 2.2 · Una clave de idioma muerta, y su valor copiado a mano

`sidebar.noTime` (`'--:--:--'`) está traducida en los dos idiomas y **no la lee
nadie**: el reloj usa `CLOCK_PLACEHOLDER`, una constante con el mismo texto
escrito otra vez en `useClock.ts`.

Dos copias de la misma cadena, una viva y una muerta — que es exactamente lo que
la casa prohíbe (REGLAS · B5). Se arregla en dos líneas: o el reloj usa la clave,
o la clave se va.

---

## 3 · Huecos, no defectos

### 3.1 · El reloj se suelta en silencio

`//date_off` y `//date_on` cambian **un estado permanente de la máquina** y sólo
suenan como cualquier otra respuesta: el teletipo contando renglones.

Compárese con lo que sí tiene voz: el tema cambiando (`relay`), la versión vieja
despertando (`v02-wake`), la señal cayéndose (`sweep`), la red (`net-*`).

**Propuesta, sin inventar voz nueva:** el `relay` — el mismo golpe de contacto
que suena al cambiar de tema. Una referencia horaria que se suelta y se vuelve a
fijar es literalmente un enganche. Dos marcas nuevas en la tabla de pantallas y
nada más.

### 3.2 · La hoja del turno entra sin que nadie se entere

`TURNO_3.txt` aparece al fondo de la papelera y ya. Las otras tres inyecciones
—el fantasma, el resto de la pieza, la nota del ente— **también** aparecen
calladas, así que es coherente… pero es el único rastro físico de la gente que se
fue, y llega igual que un archivo cualquiera.

**Idea barata:** que la papelera la traiga con la entrada escalonada que ya
existe (`row-feed`) **una fila más tarde que las demás**. No es un anuncio: es
que esa hoja tarde un poco más en llegar, como algo que estaba más al fondo.

### 3.3 · Volver después de días no cambia nada

El ente mide tu ausencia (`ausenciaDeArranque`) y **es el único que se entera**.
La máquina, que lleva el registro de todo el que pasó, no dice nada cuando
vuelves después de una semana.

El murmullo ya tiene la forma para esto —`when: (c) => …`— y el contexto ya
viaja. Una frase de vuelta, sólo con una ausencia larga, sería una línea de
tabla. **Ojo con el tono:** tiene que ser contabilidad, no reproche —
`[TURNO REANUDADO]` y no `[VOLVISTE]`.

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
