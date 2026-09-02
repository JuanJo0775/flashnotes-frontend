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

## A5 · Una pista de que hay algo que descifrar

⚠ **Riesgo conocido:** si nadie sospecha que eso es morse, la v0.2 no existe — el
error del umbral de diez colapsos, inalcanzable y sin nada que lo delatara.

Ideas: que el sistema lo mencione en alguna frase de arranque, o que una ventana
de error del fallo cromático suelte un `-.-.` suelto.

---

# B · Los comandos escondidos, lo que falta

B1 (tachados animados), B2 (se desbloquean al usarlos) y B3 (`//hi` escondido) ya
están, en su sitio dentro de la lista. Queda:

# E · La v0.2, lo que falta

La puerta y el esqueleto ya están (ver
[`docs/specs/2026-09-02-v02.md`](specs/2026-09-02-v02.md)): se entra
descifrando el morse, la bandera sobrevive a recargar, el rótulo dice la versión,
guardar miente y `//recover` es la red. Queda el resto de las averías:

## E1 · La papelera falla a ratos

`trashFails()` ya existe y está probado; falta engancharlo a la papelera de
verdad. Tirar una nota a veces no hace nada, o dice que la tiró y no la tiró.
**Nunca al revés: nunca borra algo que no le pediste.**

## E2 · Interfaces a medio dibujar

`halfBaked()` ya existe: devuelve `TITULO_417` en vez de un texto. Falta
repartirlo por la interfaz — marcos sin cerrar, etiquetas con el nombre de la
variable, dígitos donde iba una palabra.

## E3 · Los comandos no están todos

En la v0.2 faltan comandos y alguno contesta mal. `//help` más corto y menos
fiable, porque todavía no estaba terminado.

## E4 · El glitch de tema, con más averías

Sigue rompiéndose a los diez toques, pero la avería **cambia sola**: a ratos sale
estática, a ratos vuelve al fallo cromático. No es el mismo efecto con otro
color: es una avería que no se decide.

## E5 · La pista del morse

⚠ **Sin ella la puerta es inalcanzable** — el error del umbral de diez colapsos.
Candidatas: una frase de arranque que lo mencione, o que una ventana de error del
fallo cromático suelte un `-.-.` suelto.

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
