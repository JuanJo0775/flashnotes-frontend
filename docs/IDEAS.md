# Pendientes

Todo lo pedido que todavía no está construido, con su porqué. **Nada se borra de
aquí sin haberse hecho o sin haberse descartado por escrito.**

Lo ya construido vive en [`SECRETOS.md`](SECRETOS.md); las reglas que gobiernan
cómo construirlo, en [`REGLAS.md`](REGLAS.md).

---

# ⭑ Las piezas · lo que viene ahora

**Diseñado entero y sin construir.** Está en su propio documento porque no es una
idea suelta: es un rediseño de cómo se consiguen las ocho piezas, y cambia tres
comandos.

→ [`specs/2026-09-02-arte.md`](specs/2026-09-02-arte.md)

En una frase: **el arte deja de regalarse**. `//art` pasa a ser un catálogo con
las que faltan revueltas, `//art_<n>` dibuja, `//keep` guarda como nota, y cada
pieza se gana por un camino distinto — el ente, la v0.2, el pong, los secretos.

Quedan cinco decisiones sin tomar, listadas en la sección F de ese documento.

---

# A · El morse, lo que falta

El reloj y los tres clics ya están (ver [SECRETOS §20](SECRETOS.md)). Queda:

## A4 · Que la palabra abra algo

Teclearla no hace nada todavía. Es la puerta de la v0.2 — sección E.

## ~~A5 · Una pista de que hay algo que descifrar~~ · HECHO

Era el riesgo más grande del proyecto —«si nadie sospecha que eso es morse, la
v0.2 no existe»— y estuvo abierto hasta la auditoría del 2026-09-09.

Resuelto por el canal que ya existía, el rótulo `[SYSTEM_OK]` que cada tanto dice
otra cosa, y en dos escalones: **`[NADIE LEE LA HORA]`** para cualquiera, y
**`[· — ·  SIN ACUSE]`** sólo para quien ya vio los puntos y las rayas. Ninguna
nombra la solución, y hay un test que lo exige.

→ [`plans/2026-09-09-auditoria.md`](plans/2026-09-09-auditoria.md) §1

---

# B · Los comandos escondidos, lo que falta

B1 (tachados animados), B2 (se desbloquean al usarlos) y B3 (`//hi` escondido) ya
están, en su sitio dentro de la lista. Queda:

# E · La v0.2, lo que falta

La puerta y el esqueleto ya están (ver
[`docs/specs/2026-09-02-v02.md`](specs/2026-09-02-v02.md)): se entra
descifrando el morse, la bandera sobrevive a recargar, el rótulo dice la versión,
guardar miente y `//recover` es la red. Queda el resto de las averías:

## ~~E1 · La papelera falla a ratos~~ · HECHO

Tirar una nota falla el 18 % de las veces, y siempre hacia NO borrar. Se hizo
dentro de `trashV02Note`, con `TRASH_FAIL_ODDS` a mano.

⚠ **Y por eso `trashFails()` quedó muerto**: nadie lo llama. Dos fuentes para la
misma regla es lo que la casa prohíbe (REGLAS · B5) — pendiente de limpiar, ver la
auditoría §2.1.

## E2 · Interfaces a medio dibujar

`halfBaked()` ya existe: devuelve `TITULO_417` en vez de un texto. Falta
repartirlo por la interfaz — marcos sin cerrar, etiquetas con el nombre de la
variable, dígitos donde iba una palabra.

## ~~E3 · Los comandos no están todos~~ · HECHO

`notInV02` los filtra, y ahí contestan «comando desconocido» — que en esa
versión es la verdad literal: no se habían escrito todavía. `//reboot` es la
excepción y existe en las dos.

## ~~E4 · El glitch de tema, con más averías~~ · HECHO

La avería no se decide (`v02-indeciso`), y además **pierde el sincronismo
vertical** (`v02-vhold`): la imagen se escapa hacia arriba a saltos y vuelve a
engancharse. Ver SECRETOS §24.6 bis.

## ~~E5 · La pista del morse~~ · HECHO

Ver A5, arriba: es la misma y ya está.

---

# Hecho

Lo de aquí ya está construido y probado. Se deja anotado para que no se vuelva a
preguntar si se hizo.

| Pieza | Dónde | Commit |
| ----- | ----- | ------ |
| `//hi` con escalada hasta echarte | [SECRETOS §16](SECRETOS.md) | `90fb4b4` |
| `//date_off`, el reloj se suelta | [SECRETOS §17](SECRETOS.md) | `90fb4b4` |
| `//art` y `//keep` coleccionables | [SECRETOS §18](SECRETOS.md) | `505be7c` |
| `//help` por niveles y sus tres fugas | [SECRETOS §19](SECRETOS.md) | `505be7c` |
| El pong `vsync-test` | [SECRETOS §15](SECRETOS.md) | `7ff3dc5` |
| El reloj de verdad, 24 h con segundos | [SECRETOS §20](SECRETOS.md) | pendiente |
| Tres clics → morse, palabra por sesión | [SECRETOS §20](SECRETOS.md) | `70fdcca` |
| Comandos tachados que se revuelven, en su sitio | [SECRETOS §19](SECRETOS.md) | pendiente |
| Se desbloquean al USARLOS, no al verlos | [SECRETOS §19](SECRETOS.md) | pendiente |
| `//date_off` descontrola también la fecha | [SECRETOS §17](SECRETOS.md) | `ad95f3c` |
| La conversación `//whoareu` que se agota | [SECRETOS §21](SECRETOS.md) | pendiente |
| Insistir tres veces deja la página muerta | [SECRETOS §21](SECRETOS.md) | pendiente |
| `//reset`, que no toca las notas | [SECRETOS §22](SECRETOS.md) | `2cc1556` |
| `//whoareu` y `//howareu`, una sola cuenta | [SECRETOS §21](SECRETOS.md) | pendiente |
| Los coleccionables con su pestaña propia | [SECRETOS §23](SECRETOS.md) | `1c201e8` |
| La puerta de la v0.2: el morse abre | [spec v0.2](specs/2026-09-02-v02.md) | pendiente |
| Guardar que miente, y `//recover` | [spec v0.2](specs/2026-09-02-v02.md) | pendiente |
