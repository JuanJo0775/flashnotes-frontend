# Traspaso · el ojo detrás de la pared

> Escrito al cerrar una sesión que se atascó en esto. Lo importante de este
> documento no es lo que falta —es poco— sino **los errores que ya se
> cometieron**, para no repetirlos.

## ⚠ El contrato de diseño

**Esto es EL FINAL de todo el juego.** Es lo último que ve quien recorrió el
sistema entero, y lo único que va a recordar de haberlo hecho. No puede quedar
correcto: tiene que quedar **memorable**. Si sale «bien», salió mal.

Antes de escribir una línea, cargar la skill `frontend-design` y trabajar con su
método: plan de diseño primero —color, tipo, disposición, principios— revisarlo
contra este contrato, y sólo entonces construir. Y criticarse mirando capturas,
que para eso están.

Los seis principios, en orden de importancia:

### 1 · Nada nuevo. Todo sale de lo que ya existe

Los colores, las texturas, los filtros y las animaciones **ya están construidos**
en esta app: el fallo cromático y sus `<defs>` SVG, el barrido, el grano, los
tirones, las bandas, el vídeo inverso, los `--color-*`. La escena se arma con
ESO.

Inventar un efecto propio para el final diría que es otra clase de avería, y es
la misma: **el sitio se rompe de una sola manera**. Cada vez que haga falta algo,
la primera pregunta es cuál de las averías que ya existen sirve — no cómo se
haría una nueva. Ya se falló en esto una vez, con un `backdrop-filter` inventado
en lugar del cromo de verdad.

### 2 · ⚠ EL CUADRO ES LA PANTALLA. SIEMPRE, Y TAMBIÉN MIENTRAS CAE

Éste es el principio que lo sostiene todo, y el que más veces se rompió.

No es un rectángulo del color del fondo: **es un trozo de la pantalla**, y tiene
que verse como tal en los tres momentos —quieto, aflojándose y cayendo—. Eso
significa que **se lleva puesto lo que la pantalla estaba haciendo**: el barrido,
el grano, la textura del tubo, los tirones. Si mientras cae la pantalla glitchea,
el trozo glitchea con ella; si tiene línea de barrido, la lleva encima girando.

Un rectángulo plano cayendo es una ficha. Un trozo con el barrido corriéndole por
dentro mientras da vueltas es **la pantalla partiéndose**, que es lo que pasa.

Quieto tiene que ser invisible: mismo color medido del fondo —`rgb(18,17,16)`,
que es `var(--color-primary)`— y las mismas capas encima que el resto. Lo único
que lo delata es que esa zona glitchea de vez en cuando.

### 3 · El ojo: binario, estática e interferencia, las tres

No es lluvia de dígitos a secas. Son **tres capas conviviendo**:

- **Binario** — el campo de unos y ceros, y el ojo dibujado por AUSENCIA. La
  forma no se pinta: se recorta. Ya está resuelto en `eyeStatic.ts`.
- **Estática** — grano de verdad por encima, del que ya usa la app.
- **Interferencia** — bandas que barren, saltos de sincronismo, el canal
  partiéndose. Lo que hace una señal que no llega bien.

Las tres a la vez son lo que convierte un dibujo en **algo que está transmitiendo
desde el otro lado**. Con una sola es un gráfico bonito.

El ojo mira, se queda, mira a otro lado, parpadea — y al final **te mira y se
cierra**. Ese cierre es el remate, no un temporizador: el último gesto tiene que
ser suyo.

### 4 · Funciona en claro y en oscuro. Los dos, de verdad

No «no se rompe» en uno de los dos: **se ve igual de bien en los dos**. El hueco
es oscuro siempre, porque un agujero es oscuro y eso es físico. Todo lo que
rodea al hueco —el trozo, los glitches, la cicatriz— sale de los tokens del
tema, así que acompaña.

Hay que **mirarlo en los dos** antes de darlo por hecho. Ya pasó una vez que en
claro no se veía.

### 5 · El color no se copia de la referencia

La referencia del cliente viene en cian. De ella se toma **la forma**, no la
paleta: esta app es monocroma estricta y un color suelto sería lo más ruidoso de
todo el producto — y llamaría la atención justo sobre lo que tiene que
encontrarse solo.

### 6 · Gastar la audacia en un solo sitio

Lo dice la skill y acá vale doble: que el momento memorable sea **el ojo mirando
por el agujero**. Todo lo demás —el trozo, la caída, el reinicio— disciplinado y
callado, al servicio de eso. Si tres cosas compiten por ser el remate, no hay
remate.

## Dónde está todo

Rama `feat/secretos-del-sistema`, **todo commiteado y subido**. El árbol está
limpio.

**El ente está terminado**: las cuatro etapas, 1624 tests del front y 148 del
back, lint, tipos y build en verde. Documentado en `docs/SECRETOS.md` §26 y en
los planes `docs/plans/2026-09-0{3,4}-ente-etapa-{1,2,3,4}.md`.

La escena final vive en cuatro ficheros:

```
src/components/effects/LooseWall.tsx    el trozo, la caída, la cicatriz
src/lib/system/eyeStatic.ts             el campo de dígitos y la forma del ojo
src/styles/glitch.css                   la zona, el hueco, el golpe
tests/lib/system/eyeStatic.test.ts      la forma, probada sin medidas a mano
```

⚠ **Pasan todos los tests, pero NO se llegaron a ver en pantalla.** Eso es
exactamente lo que falta, y por eso el commit lo dice en su primera línea: la
lógica está probada, lo visual no está confirmado.

## Lo que falta, que es una sola cosa

**Ver la escena final en el navegador y ajustarla.** Nada más. La lógica está
probada; lo que no está confirmado es cómo se ve.

La escena: un pedazo de la pantalla se afloja, lo golpeás, se cae, y por el
hueco se ve estática con un ojo que te mira y después se cierra. Luego el
sistema falla, reinicia, y esa zona queda con una cicatriz que tiembla de vez
en cuando.

## ⚠ Los cinco errores que ya se cometieron

Están puestos primero a propósito. Cada uno costó una vuelta entera.

### 1 · El ojo no puede ser una forma encima del ruido

La primera versión era un SVG —almendra blanca, iris negro— sobre una textura.
Se leía como **un emoji pegado**. El problema no era el dibujo: era que el ojo y
el fondo estaban hechos de cosas distintas, así que uno se veía ENCIMA del otro
en vez de DENTRO.

La forma correcta es **por ausencia**: un campo de unos y ceros, y el ojo es
donde los dígitos NO están. Es lo que hace la referencia que dio el cliente, y
lo que ya hacía la pieza `eye` de la colección.

### 2 · El campo tiene que ir DENSO

Con las columnas al 50–95% de relleno, el campo ya estaba lleno de claros al
azar y **el vacío del ojo no contrastaba con nada**: se perdía dentro de su
propio ruido. Está en 88–100% y por eso ahora se ve. No bajarlo.

### 3 · El campo tiene que CABER en el hueco

Con más columnas de las que caben, se recorta por los cuatro lados y lo que
queda a la vista es justo el centro del ojo, o sea el vacío: **parece que no se
dibuja nada**. `COLS`/`ROWS` en `eyeStatic.ts` van atados al tamaño del hueco y
al cuerpo de letra en `glitch.css`. Si cambia uno, rehacer la cuenta.

### 4 · El glitch del golpe es EL DEL CROMO, no uno parecido

Reutilizar `chroma-drift` sobre un `<div>` vacío no pinta nada — anima
`text-shadow`. Y `chroma-swap` apunta a `url(#chroma-split-a)`, así que **hace
falta que `ChromaSplitFilters` esté montado** o la animación corre en vacío.

Ahora se aplica al `body` con la clase `is-blow` y los tres `@keyframes`
originales. Está comprobado que funciona: se ve la separación de canales.

### 5 · El color no se copia de la referencia

La referencia viene en cian. De ella se toma **la forma, no la paleta**: la app
es monocroma estricta y un color suelto sería lo más ruidoso del producto. El
hueco es oscuro en los dos temas —un agujero es oscuro, eso es físico— y por eso
funciona en claro y en oscuro sin pedirle nada al tema.

## Datos duros que costó averiguar

| Qué | Valor |
| --- | --- |
| Color real del fondo bajo el pedazo | `rgb(18,17,16)`, que es `var(--color-primary)` — medido, no supuesto |
| Dónde está el pedazo | `.loose-zone`: `top 58%`, `left 66%`, `268×176 px` |
| Golpes para tirarlo | `HITS_TO_FALL = 7` |
| Duración de la escena | caída 1600 ms + mirada 4200 ms + cierre 1100 ms ≈ **7 s** |

## ⚠ Cómo probarlo, que tiene truco

**El JS del navegador se bloquea dentro de la app.** `Runtime.evaluate` agota
los 45 s en `localhost:3000`, incluso con los efectos apagados. La vuelta que
funciona es sembrar el estado en una ruta 404 del mismo origen, que no tiene
animaciones, y navegar después:

```js
// en http://localhost:3000/loquesea  (404, ahí el JS sí responde)
localStorage.setItem('flashnotes:entity', JSON.stringify({
  phase: 'dispuesto', exchanges: 0, gaveCommand: true, loose: true, provedIt: true
}));
// y después ir a http://localhost:3000
```

**El arranque tarda ~30 s** (apagón, barras, rótulo, carga). Y la escena entera
dura 7 s, así que **hay que encadenar clics y capturas en un solo lote**: con
viajes de ida y vuelta sueltos, para cuando llega la captura ya reinició.

**El servidor de desarrollo se queda pegado.** Estuvo sirviendo una versión de
hacía cuatro ediciones —CSS vieja, geometría vieja— y no se notaba salvo porque
los dígitos salían cian. Si algo no cuadra con el código, matar el proceso del
puerto 3000, borrar `.next` y relanzar.

**Y el equipo se queda sin memoria.** Los servidores se murieron dos veces solos
por eso. Conviene levantarlos de a uno (`npm run dev:api`, luego `npm run
dev:web`) en vez de `npm run dev`.

## Lo que quedó fuera del ente, a propósito

- La pieza de la **cinta** (`reserved-tape`) sigue sin cablear. Su hueco pasó
  por tres dueños y se queda quieta hasta que su camino esté decidido.
- El final de los golpes **no es alcanzable sin ratón**. Está razonado en la
  nota de accesibilidad al final de `LooseWall.tsx`: anunciar «botón» sobre algo
  cuyo sentido entero es que NO es un botón arruinaría el hallazgo. El otro
  final sí se teclea (`//report`).

## Y una corrección que dejo dicha

Marqué el «usted» de la fachada como un despiste y **estaba equivocado**:
`lore.ts` y `greeting.ts` lo documentan como deliberado —la máquina
institucional no tutea porque no sabe quién sos— y el tuteo del ente es
justamente el contraste. El pronombre del ente es el arco: usted en `receloso`,
cruza a tú dentro de `burlón`, y tú en `hablando`. Hay un test que vigila el
viaje, no un pronombre fijo.
