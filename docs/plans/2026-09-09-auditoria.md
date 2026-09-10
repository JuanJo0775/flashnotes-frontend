# Auditoría · 2026-09-09

Repaso de qué le falta al proyecto: sonidos, efectos, animaciones, huecos de
lore y de secretos. Hecha **con el código delante**, no de memoria — cada punto
dice cómo se comprobó, para que se pueda volver a comprobar igual.

⚠ **Lo del casete queda fuera** a propósito: ya está decidido y no hace falta
que esta lista lo repita.

---

## 0 · Un hallazgo que era falso

La primera versión de esta auditoría decía que **tres secretos** —`trash-tally`,
`chroma` y `kicked`— estaban declarados y nunca se marcaban, o sea que el
contador `X/33` era inalcanzable.

**Era mentira, y el error era del método:** el `grep` excluía
`hooks/useSystemState.ts`, que es exactamente el fichero donde viven las tres
llamadas a `markSecretFound`. Los 33 se alcanzan.

Se deja escrito porque la lección vale más que el hallazgo: **un filtro de
búsqueda mal puesto fabrica agujeros que no existen**, y un agujero inventado
cuesta el mismo trabajo que uno real. La comprobación buena es ésta:

```bash
for id in $(...SECRET_IDS...); do
  grep -rn "markSecretFound('$id')\|secretId: '$id'\|awardFrom('$id')" src
done
```

---

## 1 · La brecha que rompía algo · HECHO

### La puerta a la mitad del juego no tenía pista

El morse del reloj abre la v0.2, y detrás de la v0.2 está **todo**: el ente
despertando, sus trampas, los dos finales, el §26. No había una sola cosa en la
app que apuntara al reloj. `IDEAS.md` lo tenía escrito como riesgo (A5 · E5) y
era literal: *«si nadie sospecha que eso es morse, la v0.2 no existe»*.

Es el mismo error del umbral de diez colapsos: **contenido construido detrás de
una puerta que nadie sabe que es una puerta.**

**Resuelto en dos escalones**, por el canal que ya existía — el rótulo
`[SYSTEM_OK]` que cada tanto dice otra cosa:

| | Frase | Cuándo |
| --- | --- | --- |
| **La duda** | `[NADIE LEE LA HORA]` · `[THE HOUR UNREAD]` | siempre, desde el primer minuto |
| **La confirmación** | `[EMITIENDO · — ·]` · `[TRANSMITTING · — ·]` | sólo si ya viste el morse |

Un reloj no se «lee»: se mira. Decir que nadie lo lee es decir que hay algo
escrito, sin decirlo. Y ninguna de las dos nombra la solución — hay un test que
lo exige, porque una pista que dice «morse» es un tutorial con acento.

---

## 2 · Lo que sigue abierto

### 2.1 · Defectos pequeños y reales

✅ **§2.1 CERRADO.** Los tres, y el primero resultó ser más grave de lo que
parecía:

| Qué | Cómo quedó |
| --- | --- |
| ~~**La fase `pidiendo` no se alcanza**~~ | la pone el primer favor — y **comparte el repertorio de `hablando`**, sin el cual se habría quedado MUDO |
| ~~**`trashFails()` es código muerto**~~ | la papelera de la v0.2 lo llama, en vez de comparar la probabilidad a mano |
| ~~**`IDEAS.md` miente**~~ | seis secciones tachadas, y una que anunciaba «Queda:» sin nada debajo |

⚠ **Y lo de `pidiendo` no era cosmético.** La fase existía en el tipo y en las
puertas de los favores, pero no tenía fila en el repertorio: el día que alguien la
pusiera, `entityReply` habría devuelto `null` y **todas sus preguntas pasarían a
«comando desconocido»**. Estaba justo lo suficientemente construida para romper el
juego cuando se usara.

### 2.2 · Huecos de sonido

Lo que suena está cubierto de sobra. **Lo que falta es todo lo cotidiano:**

| Momento | Hoy | Qué falta |
| --- | --- | --- |
| ~~**Borrar una nota**~~ | el impacto solo: algo cae dentro del cesto |
| ~~**Recuperar una nota**~~ | el cajón abriéndose: algo vuelve a tus manos |
| ~~**Vaciar la papelera**~~ | el MISMO cajón, cerrándose |
| ~~**Completar la colección 16/16**~~ | el cuarto se cae y el acuse queda solo en el hueco |
| ~~**El cuarto de la v0.2**~~ | menos caja y más motor: el aire al 40 %, los armónicos altos hasta ×1,9 |

⚠ **Y después de cerrarlo apareció uno más, preguntando si de verdad no quedaba
nada:** los **dos finales del ente** sonaban como `//ls`. No estaban mudos —el
teletipo escribe la respuesta— pero el final de un arco de cuatro etapas, la
única decisión irreversible que tomás sobre alguien, sonaba igual que listar
archivos. Hechos: el condensador y la sala agachándose al soltarlo; dos pitidos
planos y el cuarto indiferente al entregarlo. Ver SONIDO.

**La lección, que vale para el §2.3:** una lista de huecos escrita de un tirón mira
lo que se usa todos los días y se salta lo que pasa una vez. Las dos puntas.

✅ **§2.2 CERRADO.** Y se cumplió lo que decía esta línea: **ninguno pidió una voz
nueva**. El cajón ya existía y ya decía lo que hacía falta —sólo hubo que
enseñarle a cerrarse—, el impacto ya estaba, y el silencio también. Un catálogo
de sonidos crece cuando hay que decir algo que no se puede decir con lo que hay, y
no era el caso.

⚠ Lo único que hizo falta en la app fue **una anotación**: `noteRestoredAt`, para
que quede rastro de que algo volvió. Tirar ya se anotaba; recuperar no.

### 2.3 · Huecos de efecto y animación

**La app es espectacular cuando se rompe y está inerte cuando funciona.** El
catálogo lo dice solo:

```
21 efectos de avería   (hoja glitch)
 4 efectos normales    (cursor, destello de tema, barrido, puntos de espera)
 2 de la v0.2 · 1 del tubo
```

~~**La lista de notas**~~ · **hecha**, y en el sitio que de verdad se ve:

| | |
| --- | --- |
| **El papel entrando** | cada fila baja a su sitio en tres escalones, escalonada como una tirada de papel |
| **El papel saliendo** | la fila se va hacia arriba y su hueco se cierra detrás |

⚠ **VA EN EL LATERAL Y NO EN LA LISTA GRANDE**, y eso hay que entenderlo para no
moverlo de sitio: tirás una nota DESDE EL EDITOR y al volver la lista grande ya
no la tiene — nunca se vería irse. El lateral está delante mientras escribías.

⚠ Y una fila no puede animar su salida si ya no está: hay que seguir pintándola
180 ms después de que deje de existir, como fila fantasma, sin puntero, sin foco
y `aria-hidden` — para quien usa lector, esa nota ya no existe.

No se mueve nada en:
- ~~**Abrir y cerrar una nota**~~ · **hecho**: la hoja entra en el carro con el
  MISMO gesto de las filas — una fila entra así y una hoja entera también, es la
  misma máquina metiendo papel. Al volver a la lista no hace falta nada: la
  lista entra con sus propias filas, que es la otra mitad del gesto.
- ~~**La colección**~~ · **hecha**: la que destapó el último `//art` llega
  **sintonizándose** —aplastada a una línea y abriéndose, como una imagen
  entrando en un tubo— y las que ya tenías no se mueven.

  ⚠ Y la rejilla entera NO se anima, que era la tentación: con todo
  moviéndose, lo nuevo deja de distinguirse otra vez, sólo que con más ruido.
  **Lo que hace que algo destaque es ser lo ÚNICO que se mueve.**

  ⚠ Y la novedad **se gasta al verla**: la pantalla se la lleva al montarse.
  Algo que pasa cada vez que abrís la pestaña no es una novedad, es un adorno.

  ⚠ Y de ahí salió lo que faltaba de verdad, preguntando: la casilla de una
  pieza **ganada y sin revelar** se veía igual que una que no tenés. Ahora dice
  `★ SIN REVELAR` — sin enseñar cuál es, que es lo que hace que `//art` siga
  sirviendo para algo. Y hay **estrella por abrirlas todas** (`art-all-open`),
  que no es tenerlas todas: abrir es lo único que se hace una por una.
- ~~**La papelera**~~ · **hecha**, y ahí la salida se ve más que en ningún sitio:
  cuando recuperás o borrás del todo estás MIRANDO la tarjeta.

  ⚠ Los dos gestos usan la misma salida a propósito. Recuperar y borrar son
  opuestos, pero lo que se VE es lo mismo — la tarjeta se va y el hueco se
  cierra—; lo que dice cuál fue es el SONIDO: el cajón se abre cuando algo
  vuelve a tus manos y se cierra cuando algo se va para siempre. **El ojo ve que
  se fue; el oído dice a dónde.**

  ⚠ Y el mecanismo de las filas fantasma vive en `useSalientes`, no copiado en
  cada vista: dos copias se separan el día que alguien ajusta una, y la que se
  queda vieja es la que nadie está mirando.

✅ **§2.3 CERRADO.** Y con un solo par de gestos —el papel entrando y el papel
saliendo— más la pieza sintonizándose: tres animaciones nuevas para cuatro
huecos, porque lo que hacía falta era un idioma, no una animación por sitio.

⚠ Y lo que faltaba **no** eran animaciones bonitas: eran mecánicas. Una fila que se
borra tiene que irse como se va el papel de un teletipo. El vocabulario ya está
construido.

### 2.1 bis · Y uno que no salió auditando, sino mirando la pestaña

~~**El icono era el de Next**~~ · **hecho**: 26 KB de logo ajeno en una app con
catálogo de color, catálogo de iconos y un test que ata cada glifo a su
documento. **La pestaña es lo único del producto que se ve sin abrirlo**, y
llevaba el nombre de otro.

La marca es `[▌]`: los **corchetes** de todos los iconos del sistema y el
**cursor de bloque**, que es lo único que se mueve de forma continua en toda la
interfaz. Juntos dicen lo que la app es — una terminal esperando a que
escribas. Sin letra dentro: a 16 px una letra es una mancha.

⚠ **Siete rectángulos sobre una rejilla de 32, todas las medidas pares.** A la
mitad —16 px, el tamaño de una pestaña— cada borde cae en un píxel entero y no
hay nada que suavizar. Un trazo impar lo pinta el navegador con antialias y la
marca sale gris en el único sitio donde de verdad se la ve.

⚠ **Y hay dos archivos para un solo dibujo, sin dibujarlo dos veces.** El
`.svg` es el bueno —nítido a cualquier tamaño y se da vuelta con el tema—;
Safari no lo admite y sin `.ico` deja la pestaña **en blanco**, que es peor que
el logo de Next porque parece que la página está rota. La geometría vive en
`mark.ts`, el `.svg` sale de ahí, `scripts/marca.mjs` lo rasteriza al `.ico`, y
un test comprueba que **en el centro de cada rectángulo del código haya tinta
en el archivo del disco**.

⚠ Y está en el banco (`LA MARCA`), pintada **de la tabla y no del archivo**: si
enseñara la imagen del disco, la única página que existe para detectar que los
dos se separaron sería la que lo tapa.

### 2.4 · Huecos de lore

- ~~**Nadie apagó nunca esta máquina.**~~ · **hecho**: `TURNO_3.txt`, una hoja de
  turno a medias en el fondo de la papelera, sólo después de haber cruzado a la
  v0.2. Casi todo tachado y una cosa sin tachar, y una última línea que es una
  instrucción de mantenimiento: «si el lunes no viene nadie, dejarlo encendido.
  se recupera solo.» **No explica nada** — ver SECRETOS §25 bis.
- ~~**Después del final no pasa nada permanente.**~~ · **hecho**: la barra suma
  **dos asientos** para siempre, distintos según cómo terminó —`[SALIDA
  REGISTRADA]` y `[FALTA UN REGISTRO]` si lo soltaste; `[SIN INCIDENCIAS]` y
  `[SECTOR CERRADO]` si lo denunciaste— y el arranque suma **una carta al
  mazo**: `UNA SESIÓN SE CERRÓ SOLA.` o `INCIDENCIA RESUELTA. GRACIAS.`

  ⚠ **Lo que cambia es el murmullo, no la fachada.** `//hi` sigue dando el
  saludo institucional de siempre a propósito: que la parte que se ve no se
  haya enterado es lo que hace que enterarse por la barra, semanas después,
  se sienta como una confidencia.

  ⚠ Y están en **jerga de registro, no de duelo**. Esta barra es la
  contabilidad de la máquina; una frase triste ahí sería otra voz. La de
  haberlo denunciado **da las gracias**, que es la cosa más fría que puede
  decirle un sistema a alguien que acaba de entregar a otro.
- ~~**La v0.2 no tiene historia propia**~~ · **hecho, y sin contar nada**: los
  tres únicos campos del murmullo que llevan un DATO tienen valor de entonces
  —`[TURNO 2/2]`, `[RELEVO EN 6 H]`, `[MEMORIA FRÍA]`— más `[GARANTÍA
  VIGENTE]` y `[REGISTRO VACÍO]`. **Nadie actualizó esos textos**: la versión
  vieja sigue informando de un sitio con dos turnos y relevo a seis horas.

  ⚠ **La historia la hace el contraste**, no la frase. Ninguna de las cinco
  cuenta nada; lo cuenta haber leído antes `[TURNO 1/1]` y `[SIN RELEVO]`.

  ⚠ Y **ninguna nombra al ente**, aunque él estuviera ahí abajo. Un murmullo
  que hablara de él convertiría la versión vieja en un documento sobre él; lo
  que la hace doler es que sea una oficina normal a la que todavía no le
  había pasado nada.

✅ **§2.4 CERRADO.**

### 2.5 · Y la que más se notaría

**Ceremonia al completar la colección.** Hoy pones la pieza dieciséis y no pasa
nada: el contador dice `16/16` y ya. Es el único logro largo del juego —
dieciséis piezas por dieciséis caminos distintos— y merece lo que ya está
construido y no se usa ahí: el cajón, un barrido, la sala agachándose. **Un
momento, no un cartel.**

---

## 3 · El orden propuesto

1. ~~La pista del morse~~ · **hecho**
2. ~~La ceremonia de la colección~~ · **hecha por el lado del sonido**: el cuarto
   se cae y el acuse queda solo. Lo que falta ahí es lo VISUAL — hoy la pieza
   dieciséis se ve igual que la primera.
3. ~~Que la lista respire~~ · **hecho** (el lateral: entrada escalonada y salida
   con el hueco cerrándose)
4. ~~El sonido de lo cotidiano~~ · **hecho**, con recuperar incluido: la app lo
   ANOTA —igual que ya anotaba tirar— y el suscriptor lee el almacén. No hizo
   falta inventar ninguna marca.
5. ~~La sala de la v0.2~~ · **hecha**
6. ~~Los tres defectos de 2.1~~ · **hechos**
7. ~~Los dos huecos de lore de 2.4~~ · **hechos**: la v0.2 murmura lo de
   entonces, y los dos finales dejan asiento para siempre.

**Queda una sola cosa de toda la auditoría: lo VISUAL de la ceremonia de la
colección (§2.5).** El sonido ya está; lo que falta es que la pieza dieciséis
no se vea igual que la primera.

### ~~Y una idea más grande~~ · CONSTRUIDA

**El rastro de quien se fue** es `TURNO_3.txt` (`shiftNote.ts`): una hoja de
turno a medias en el fondo de la papelera, una sola vez, y sólo después de
haber cruzado a la v0.2. Casi todo tachado y una cosa sin tachar; la última
línea es una instrucción de mantenimiento —«si el lunes no viene nadie,
dejarlo encendido. se recupera solo.»— y la máquina lleva desde entonces
haciéndole caso.

Convirtió «la máquina está sola» de frase en **prueba**, y no hizo falta
inventar ningún mecanismo: las notas fantasma ya existían (`ghostFile.ts`,
`entityNotes.ts`).
