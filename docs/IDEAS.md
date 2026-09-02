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

# C · Los coleccionables

## C1 · El título es el nombre de la pieza

Al guardar con `//keep`, la nota no se llama «Nueva nota»: se llama por la pieza y
su número — `POLILLA · 1/8`.

## C2 · Sección propia, no «archivos disponibles»

**No son notas y no se tratan como notas.** Van en una tercera pestaña junto a
NOTAS y PAPELERA, marcada con una estrella o un cuadrito, y ahí se ven como lo
que son: una colección.

---

## D1 · Un comando que reinicia todo

La cuenta de secretos, las piezas, los marcadores, todo. Como una sesión nueva.

Cuidado: **no puede borrar notas.** Reiniciar el juego no es reiniciar tu trabajo.

---

# E · La v0.2

Una versión vieja, a medio hacer, que se entra descifrando el morse.

- Funciona, pero mal: la papelera falla a veces, salen errores solos, hay
  interfaces a medio dibujar con dígitos.
- **A veces dice que no guardó y sí guardó** — miente sobre sí misma, no sobre
  tus datos.
- **Y en algunas variantes pierde de verdad**, porque al fin y al cabo es una
  versión antigua con errores. Decidido así explícitamente.
- Los comandos no están todos y algunos no andan bien.
- El glitch de claro/oscuro sigue, pero con más fallas: a veces sale estática y
  vuelve al glitch. Una experiencia distinta, no la misma con otro color.

Merece su propio documento de diseño antes de tocar código.

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
| `//reset`, que no toca las notas | [EFECTOS §22](EFECTOS.md) | pendiente |
