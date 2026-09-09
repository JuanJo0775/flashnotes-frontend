# Lo que le falta al sonido · 2026-09-09

Escrito para que no se pierda entre sesiones. Sale de dos sitios: lo que se pidió
jugando y lo que apareció al repasar el código.

El orden está decidido: **primero se cierran los mudos de la 1.0, y después se va
de lleno con la v0.2.**

---

## 1 · Los mudos de la 1.0

Pantallas y momentos que hoy no suenan. Salió de repasar qué escucha
`wire.ts` y qué queda fuera.

| Qué | Por qué se nota | Nota |
| --- | --- | --- |
| **El pong** (`//attach_6`) | Una pantalla entera sin un solo sonido | La pelota, los rebotes contra la pared y la paleta, el punto. La pausa ya está, falta que suene |
| **Las ventanas de error** del bloqueo | Aparecen de golpe y en silencio | Es el sitio natural del bip feo de la bocinita |
| **La pantalla muerta** (`//hi` insistido) | El final más brusco del juego, mudo | |
| **El bloqueo** | Idem | |
| **El ente hablando** | La sala no le hace sitio | `duck()` existe en `ambience.ts` y no lo llama nadie |
| **Guardar / no guardar** | El único aviso de que tu texto está a salvo | |
| **Quedarse sin red** | `[SIN_RED]` y el reconectado | |

⚠ Todos tienen que colgar de `screens.ts` / `events.ts`, no de llamadas sueltas
en los componentes. Ver el encabezado de `wire.ts`.

---

## 2 · La v0.2

### Lo que se encontró mirando

- **Tiene módulos propios**: `v02Loading` (barra de carga de 40 columnas, con
  progreso falso), `v02Chrome`, `v02Card`, `v02Messages`, `v02Notes`,
  `v02Restore`, `v02TrashLine`.
- **`//reboot` NO existe ahí**: está marcado `notInV02`.
- **Pero el botón `[RESTART]` de la barra SÍ se ve.** Hoy hay un botón donde no
  hay comando: una incoherencia que hay que cerrar.
- **Sonidos propios: ninguno.** Suena exactamente igual que la 1.0, y no debería.

### Lo que se pidió

> «en v0.2 existe lo de reiniciar? si si debe ser algo diferente a la de 1.0, mas
> rudimentario, se que ahi faltan tambien sonidos y variaciones de pantallas,
> sobre todo las de reiniciar hacer estatica en vez de la de barras de colores y
> otras cosas»

### El plan

1. **Que el reinicio exista en la v0.2** — comando y botón. Arreglar la
   incoherencia por el lado de añadir, no de quitar el botón.
2. **Su propia pantalla de reinicio**, más rudimentaria:
   - **estática en vez de las barras de color**,
   - sin rótulo del fabricante y sin comprobación de memoria,
   - con la barra de carga de 40 columnas que ya existe en `v02Loading`.
3. **Su propio sonido**, más pobre y más eléctrico. La v0.2 es una máquina más
   vieja: ahí la bocinita tiene que pesar más que la habitación.

⚠ **Y ahí tiene sitio por fin el `capacitor`.** Es la última voz construida sin
enchufar —un golpe de 72 a 30 Hz con un chispazo corto encima, un condensador
soltándose dentro de la caja— y que una versión vieja arranque con eso, en vez
de con el encendido limpio de la 1.0, es exactamente la diferencia entre las dos
máquinas.

---

## 2 bis · El pong

- **El armazón de la cabecera y el pie se comparte** con la app, no se copia: hoy
  el pong repite la estructura con las mismas clases y ya se notó la deriva —la
  app estrenó `[RESTART]` abajo y el pong no lo tiene—. Contenido propio, marco
  común. **Pendiente.**
- ~~**Sonidos.**~~ Hechos: tres tonos como el pong original —300 Hz la paleta,
  620 la pared, 170 el punto— y el relé al parar y seguir. El juego publica
  contadores en su raíz y el sonido los lee.

## 3 · Lo que NO hay que volver a intentar

Escrito para no repetir el trabajo de descubrirlo.

- **El apagón de una recarga del navegador no puede sonar.** Pasa antes del
  primer gesto y ningún navegador deja sonar antes de eso. Se probó mover la
  imagen detrás de la tecla y era peor: rompe el orden de los hechos. Por eso
  existen `//reboot` y el botón, que sí suenan enteros.
- **Un contexto de audio dormido no descarta lo programado: lo guarda.** Medido:
  un tono programado con el contexto dormido sonó entero ocho segundos después.
  De ahí la regla de `play`: un golpe que no se puede oír ahora no se guarda.
- **`transition: clip-path` no corría** en el navegador de pruebas, con el
  movimiento reducido apagado y en un elemento aislado. Lo que se mueve por
  pasos no puede fallar así.
- **Los símbolos fuera del ASCII son una apuesta.** `⏻` (U+23FB) no está en
  JetBrains Mono: medía 14 px contra los 8,4 de los glifos reales y se pintaba
  en blanco.
- **`onDone` en las dependencias de un efecto congela lo que ese efecto
  temporiza.** Apareció cuatro veces. Se arregla con `useEvent`, que fija la
  identidad dentro del componente.
