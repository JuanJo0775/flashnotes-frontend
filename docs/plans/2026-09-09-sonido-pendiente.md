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
| ~~**Guardar / no guardar**~~ | El único aviso de que tu texto está a salvo | Hecho: un golpe de cabezal al guardar —escribir es un golpe, buscar son cuatro— y la bocinita grave y larga cuando no se guarda |
| ~~**Quedarse sin red**~~ | `[SIN_RED]` y el reconectado | Hecho: barrido corto al caerse la línea, medio barrido cuando lo que calla es el servidor, y el relé al volver |

⚠ **Y con esto la 1.0 se queda sin mudos.** Los cinco de arriba cuelgan de
`screens.ts` por marcas de la barra de estado, sin una sola llamada suelta. Lo
único que hizo falta en la app fueron cinco clases y sus `key` — ver el
documento: sin `key`, React recicla el `<span>` y la marca no APARECE nunca.

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

1. ~~**Que el reinicio exista en la v0.2**~~ — hecho: `//reboot` deja de estar
   marcado `notInV02`. Se arregló añadiendo, como se pidió. El argumento que lo
   sostiene: apagar y encender es lo más viejo que sabe hacer un equipo, y es lo
   último que se le quitaría — lo que cambia entre versiones no es que exista,
   es lo que se VE mientras vuelve.
2. ~~**Su propia pantalla de reinicio**~~ — hecha, con los tres puntos:
   estática en vez de barras, sin rótulo ni comprobación, y la barra de 40
   columnas. Vive en el MISMO `bootScript` con otro reparto (`REPARTO_V02`) y en
   el mismo `BootScreen`: el armazón se comparte, el contenido no.
3. ~~**Su propio sonido**~~ — hecho: el condensador al recibir corriente, la
   estática muda a propósito, el tic mientras la barra cuenta y un bip más grave
   al terminar.

⚠ **Y ahí tuvo sitio por fin el `capacitor`.** Es la última voz construida sin
enchufar —un golpe de 72 a 30 Hz con un chispazo corto encima, un condensador
soltándose dentro de la caja— y que una versión vieja arranque con eso, en vez
de con el encendido limpio de la 1.0, es exactamente la diferencia entre las dos
máquinas.

### Lo que sigue faltando en la v0.2

- **Más variaciones de pantalla.** Lo que se pidió incluía «otras cosas», y de
  momento sólo cambió el arranque — la puerta ya se miró y perdió su firma; el
  resto de las pantallas de esa versión sigue siendo la de la 1.0 con la piel
  puesta.
- **El armazón compartido del pong** sigue pendiente, que es de la otra lista.

---

## 2 bis · El pong

- **El armazón de la cabecera y el pie se comparte** con la app, no se copia: hoy
  el pong repite la estructura con las mismas clases y ya se notó la deriva —la
  app estrenó `[RESTART]` abajo y el pong no lo tiene—. Contenido propio, marco
  común. **Pendiente.**
- ~~**Los dos efectos prestados.**~~ Hechos: el **tic del pedazo** cuando el juego
  se dibuja con caracteres —con el vídeo sano sería un adorno; ahí ya se rompió
  algo y el tic es de la misma avería— y el **grano hirviendo** con el juego
  parado, nunca sobre la pantalla de perdido. Se reusan las clases `.loose-slab`
  y `.wall-grain`, no se copia el CSS, y el catálogo dice los dos sitios.
- ~~**Sonidos.**~~ Hechos: tres tonos como el pong original —300 Hz la paleta,
  620 la pared, 170 el punto— y el relé al parar y seguir. El juego publica
  contadores en su raíz y el sonido los lee.

## 3 · Lo que NO hay que volver a intentar

Escrito para no repetir el trabajo de descubrirlo.

- **Una capa prestada no se ve por estar puesta: hay que mirar QUIÉN pinta
  encima.** Los dos efectos del pong estuvieron puestos y mudos. El tic filtra
  con `backdrop-filter`, o sea lo de DEBAJO, y estaba antes de la rejilla:
  invertía el vacío. El grano estaba dentro de la mesa, debajo del velo de la
  pausa —un `color-mix` al 55%—, y un 12% debajo de eso queda en un 5%. Se
  arreglan por orden de hermanos, no tocando el efecto.
- **Y un efecto espaciado no se ve en una ventana corta.** El tic de la pared
  llega al 96% de un ciclo de once segundos; la capa del pong vive de 220 a
  700 ms. Un `animation-delay` negativo entra por donde está el destello, sin
  duplicar los keyframes.
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
