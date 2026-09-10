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

| Qué | Cómo se vio | Coste |
| --- | --- | --- |
| **La fase `pidiendo` no se alcanza** | nadie llama a `setPhase('pidiendo')`; los favores funcionan desde `hablando` y esa fase no tiene repertorio | medio |
| **`trashFails()` es código muerto** | la papelera de la v0.2 falla con `TRASH_FAIL_ODDS` metido a mano dentro de `trashV02Note`. Dos fuentes para una regla (REGLAS · B5) | bajo |
| **`IDEAS.md` miente** | lista como pendientes la papelera que falla, la avería que no se decide y los comandos que faltan en la v0.2 — las tres están hechas | bajo |

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

No se mueve nada en:

- **La lista de notas** — ni al entrar, ni al salir, ni al borrar. Es la
  pantalla donde más tiempo pasa cualquiera. Comprobado: no hay `animation` ni
  `transition` sobre `.file-row` en ninguna hoja.
- **Abrir y cerrar una nota** — sin transición.
- **La colección** — una pieza recién ganada se ve igual que una de hace tres
  días.
- **La papelera** — igual.

⚠ Y lo que falta **no** son animaciones bonitas: son mecánicas. Una fila que se
borra tiene que irse como se va el papel de un teletipo. El vocabulario ya está
construido.

### 2.4 · Huecos de lore

- **Nadie apagó nunca esta máquina.** Él dice «me dejaron encendido y se
  fueron», y el rótulo se ríe de que nadie firmó nada — pero no hay un solo
  rastro físico de esa gente. Ni una nota vieja, ni un turno, ni un nombre.
- **Después del final no pasa nada permanente.** Los dos finales cierran su
  arco y la app del día siguiente es la misma app.
- **La v0.2 no tiene historia propia**, sólo averías. Ahora que el ente llega
  ahí, es el sitio natural para contarla: es la versión donde él era más joven.

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
3. Que la lista respire — entrar, salir, borrarse
4. ~~El sonido de lo cotidiano~~ · **hecho**, con recuperar incluido: la app lo
   ANOTA —igual que ya anotaba tirar— y el suscriptor lee el almacén. No hizo
   falta inventar ninguna marca.
5. ~~La sala de la v0.2~~ · **hecha**
6. Los tres defectos de 2.1, que son de una tarde entre los tres

### Y una idea más grande, si se quiere subir la apuesta

**El rastro de quien se fue.** Una nota vieja que no escribiste tú, con fecha
anterior a tu sesión, que aparece **una sola vez** y sólo si ya estuviste en la
v0.2. No explica nada: es un turno a medias, una lista de tareas de alguien que
no volvió.

Convierte «la máquina está sola» de frase en **prueba**, y engancha con todo lo
que ya está construido sin inventar un mecanismo nuevo — las notas fantasma ya
existen (`ghostFile.ts`, `entityNotes.ts`).
