# Pendientes

Todo lo pedido que todavía no está construido, con su porqué. **Nada se borra de
aquí sin haberse hecho o sin haberse descartado por escrito.**

Lo ya construido vive en [`EFECTOS.md`](EFECTOS.md); las reglas que gobiernan
cómo construirlo, en [`REGLAS.md`](REGLAS.md).

---

# A · El morse, lo que falta

El reloj y los tres clics ya están (ver [EFECTOS §20](EFECTOS.md)). Queda:

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
| `//hi` con escalada hasta echarte | [EFECTOS §16](EFECTOS.md) | `90fb4b4` |
| `//date_off`, el reloj se suelta | [EFECTOS §17](EFECTOS.md) | `90fb4b4` |
| `//art` y `//keep` coleccionables | [EFECTOS §18](EFECTOS.md) | `505be7c` |
| `//help` por niveles y sus tres fugas | [EFECTOS §19](EFECTOS.md) | `505be7c` |
| El pong `vsync-test` | [EFECTOS §15](EFECTOS.md) | `7ff3dc5` |
| El reloj de verdad, 24 h con segundos | [EFECTOS §20](EFECTOS.md) | pendiente |
| Tres clics → morse, palabra por sesión | [EFECTOS §20](EFECTOS.md) | `70fdcca` |
| Comandos tachados que se revuelven, en su sitio | [EFECTOS §19](EFECTOS.md) | pendiente |
| Se desbloquean al USARLOS, no al verlos | [EFECTOS §19](EFECTOS.md) | pendiente |
| `//date_off` descontrola también la fecha | [EFECTOS §17](EFECTOS.md) | `ad95f3c` |
| La conversación `//whoareu` que se agota | [EFECTOS §21](EFECTOS.md) | pendiente |
| Insistir tres veces deja la página muerta | [EFECTOS §21](EFECTOS.md) | pendiente |
| `//reset`, que no toca las notas | [EFECTOS §22](EFECTOS.md) | `2cc1556` |
| `//whoareu` y `//howareu`, una sola cuenta | [EFECTOS §21](EFECTOS.md) | pendiente |
| Los coleccionables con su pestaña propia | [EFECTOS §23](EFECTOS.md) | `1c201e8` |
| La puerta de la v0.2: el morse abre | [spec v0.2](specs/2026-09-02-v02.md) | pendiente |
| Guardar que miente, y `//recover` | [spec v0.2](specs/2026-09-02-v02.md) | pendiente |
