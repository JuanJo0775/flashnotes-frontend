# El ojo detrás de la pared · lo que se hizo, y lo que este documento decía mal

> Este fichero era un traspaso: «la lógica está probada, lo visual no se llegó a
> confirmar». Ya se confirmó. Lo que queda escrito acá no es lo que falta —no
> falta nada— sino **qué se vio al mirarlo** y **cuáles de las afirmaciones de la
> versión anterior eran falsas**, que es lo único que le sirve al siguiente.

## ⚠ Cinco cosas que este documento daba por buenas y no lo eran

Están primero porque son lo caro. Cada una se dio por comprobada sin haberla
mirado, y las cinco se veían a simple vista en cuanto se abrió el navegador.

### 1 · «El golpe usa el cromo de verdad. Está comprobado que funciona»

**No existía la regla.** `LooseWall` ponía y quitaba la clase `is-blow` en el
`body` desde el primer día, y en toda la hoja no había nada que la mirara salvo
la excepción de `prefers-reduced-motion`. Cada golpe no pintaba absolutamente
nada.

Ahora sí: `body.is-blow .container-terminal` con `glitch-jolt`, y una capa
`.glitch-bands` —la misma clase del glitch ambiental— montada mientras dura. Va
sobre el CONTENEDOR y nunca sobre el `body`: el grano, el barrido y el propio
pedazo son hermanos suyos, no hijos.

Y la fuerza sube con cada golpe, por variable (`--blow-amp`), que es como esta
casa cuenta las amplitudes.

⚠ **Sin el cromo, y eso costó dos vueltas** — ver «Y el golpe NO lleva el cromo»
más abajo. El contrato lo pedía y se veía mal.

### 2 · «Los dígitos salían cian porque el servidor servía una versión vieja»

No. **Era suavizado de SUBPÍXEL.** A 6 px el navegador pinta el texto con
subpíxeles y los dígitos salían azules y naranjas: color suelto en la única parte
del producto que no puede llevar ninguno. No se arregla reiniciando nada.

Se arregla con **cuerpo de letra**: a 9 px cada dígito es un glifo de verdad, se
lee, y sale gris. El número de columnas es entonces el que quepa — y por eso el
hueco creció.

### 3 · «`ACHATA` estuvo en 1.9 y era un error de cuenta»

La corrección estaba **dada vuelta**. Quedó en `((ROWS-1)/(COLS-1))·2`, cuando lo
que hace redondo un círculo es `((COLS-1)/(ROWS-1)) / CELL_ASPECT`. Con la
fórmula invertida el iris salía **1,6 veces más chato** de lo que debía y se leía
como una rendija, que es exactamente lo que el comentario decía haber arreglado.

Hay un test que lo ata: mide la caja del anillo **en píxeles** y exige que sea
cuadrada. Con la fórmula vieja da 0,45 y falla.

### 4 · «El JS del navegador se bloquea dentro de la app»

A medias, y la corrección importa en las dos direcciones. **Normalmente responde
sin problema** —incluido `await` de nivel superior— así que el rodeo por la ruta
404 no es obligatorio para evaluar; sirve para sembrar el estado ANTES de que
monte la página, que es otra cosa.

Pero **sí se cuelga de vez en cuando**: `Runtime.evaluate` agotó los 45 s una vez
en mitad de la sesión, con la escena montada. No es que el JS esté bloqueado
siempre; es que el renderizador se atasca a ratos y hay que recargar la pestaña.
Si pasa, no es que la página esté rota.

### 5 · «El pedazo va pintado del color del fondo; se midió, no se supone»

Se midió bien y aun así la idea era falsa. **Sólo acertaba en una vista y en un
tema.** Abriendo una nota, debajo hay papel (`--color-tertiary`) y no lienzo, y
el mismo trozo que era invisible en la lista se veía como un parche de otro color
encima del editor.

El error no era el tono: era el modelo. Ver abajo.

## Lo que la escena hace ahora

### El modelo, que es de donde sale todo

**El pedazo no COPIA la pantalla: ES la pantalla.** Mientras nadie lo ha tocado
no pinta ningún color — ninguno — así que es exactamente lo que haya debajo, en
cualquier vista y en los dos temas. No hay color que acertar porque no hay color.

Lo único que lo delata es que **esa zona glitchea de vez en cuando**, y el tic va
con `backdrop-filter`, no con `filter`: lo que se invierte un instante es el
trozo de imagen que haya ahí, sea la lista o sea una nota abierta.

La contradicción —invisible pegado, visible cayendo— **se resuelve en el tiempo,
no en el color**:

| Momento | Qué pinta |
| --- | --- |
| Sin tocar | Nada. Es la pantalla. |
| Del primer golpe en adelante | El color que HABÍA debajo, medido en ese instante (`--slab-bg`), con el grano de la casa. El fotograma siguiente al golpe es idéntico al anterior. |
| Cayendo | Ese color mezclado con `--color-ink`, más las franjas y su propio barrido. |

⚠ **El tono de la caída sale de los tokens, no de un filtro.** Estuvo resuelto
con `invert()` y eso INTRODUCE COLOR: los grises de esta casa son cálidos y su
inverso es frío, así que el trozo caía azulado. Mezclado con `--color-ink` no
aparece ningún color nuevo y funciona en los dos temas por construcción.

### ⚠ Y el golpe NO lleva el cromo. Ésta se corrigió dos veces

El contrato pedía «el glitch del golpe es EL DEL CROMO», y así se hizo primero. Se
veía mal, y por dos motivos:

- **La aberración cromática pinta rojo y cian.** Siete ráfagas de color a
  pantalla completa, una por golpe, son lo más ruidoso de todo el producto — y
  justo encima de la escena que tiene que encontrarse sola.
- **La avería cromática (§14) es un ESTADO raro y voluntario**, algo que te
  ganás insistiendo con el interruptor de tema. Gastarla en cada martillazo la
  abarata.

Lo que corresponde es el glitch **ambiental**, que es lo que esta pantalla hace
cuando algo va mal y es monocromo por construcción: el **tirón** con la amplitud
subiendo golpe a golpe (`--blow-amp`) y las **franjas**. El color se reserva para
el derrumbe final, que es cuando el sistema falla de verdad.

Y por lo mismo, **los grises del hueco pasaron a ser cálidos**. Estuvieron en
`#0a0c0d` y `#d3d9da`, que tienen más azul que rojo. Nadie los había escrito como
«color», pero al lado de una app cuyos grises son cálidos (`#e8e5dc`, `#12110d`)
se leen exactamente como lo que la referencia del cliente traía y había que dejar
fuera: **cian**. La forma se copió; la paleta no. Esto era lo que faltaba de esa
decisión.

### Y va por delante de todo, salvo mientras cae

La zona está a `z-index: 9994` — es el cristal, o sea lo más de delante que hay —
y baja a `1` en cuanto se suelta: **nada se cae por delante del mueble que tiene
delante**, así que el pedazo se va por detrás de la barra de abajo.

Como está delante y no puede quedarse los clics de nadie, los golpes se recogen
en **captura sobre el documento**: si el punto cae dentro del pedazo y no hay
debajo un control (`a, button, input, textarea, …`), es un golpe y se lo traga;
si hay un control, el clic es de la app y sigue su camino. Por eso sobre el área
de texto del editor no se le puede pegar, que es lo correcto: escribir no puede
romper la pared.

### El ojo: tres capas, y un arco que decide él

```
        hueco abierto            +0,9 s              +1,6 s            +5,7 s        +6,2 s
   ┌────────────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  ┌──────────┐
   │ SÓLO ESTÁTICA E    │─>│ la forma se  │─>│ se abre,     │─>│ te mira, y  │─>│ se       │
   │ INTERFERENCIA      │  │ RESUELVE del │  │ mira, se     │  │ se cierra   │  │ disuelve │
   │ (no hay ojo)       │  │ ruido        │  │ queda, parpa-│  │             │  │          │
   └────────────────────┘  └──────────────┘  └──────────────┘  └─────────────┘  └──────────┘
```

- **Binario** — el campo de unos y ceros, y el ojo por AUSENCIA.
- **Estática** — el grano de la casa, y va **DETRÁS** del binario además de
  delante. Ésa es la diferencia entre un recorte y una ventana: con el hueco
  negro liso, la forma era un agujero en una hoja; con estática debajo, los
  dígitos son el VELO y el ojo es donde el velo no está.
- **Interferencia** — las franjas de `.glitch-bands` en gris, el arrastre de
  `chroma-roll`, y un salto de sincronismo de tanto en tanto. ⚠ El salto va
  sobre `.wall-rain`, **no sobre `.loose-hole`**: lo que se descuadra es la
  señal, no el agujero. Un agujero en una pared no se mueve de sitio.

⚠ **El ojo no aparece: SE RESUELVE.** `presence` va de 0 a 1 y no es opacidad —
es la probabilidad de que una celda del hueco esté vacía, y sube antes en el
centro que en el borde. El ojo se come el ruido desde dentro, con el borde
tramado. Un recorte que se enciende es una máscara; una forma que se revela
estaba ahí antes de que la vieras. Al final el mismo mecanismo lo disuelve.

Y tiene **brillo**: una chispa de dígitos arriba a la izquierda dentro del iris.
Es el detalle más pequeño de la escena y el que más trabaja — un anillo con nada
dentro se lee como una diana; con la chispa se lee como algo húmedo mirándote.

### El final, que ya no es una recarga a secas

El arco se acaba **cuando él termina**, no cuando se acaba un temporizador: la
duración sale de `EYE_ARC_FRAMES`. Entonces cae todo — separación de canales,
tirón, franjas, y **el TEMA fallando de claro a oscuro y vuelta** con la misma
ráfaga de la avería de señal (`flipThemeVolatile`, `FLICKER_STEPS`,
`FLICKER_GAP_MS`) — y sólo después recarga, con el arranque de siempre.

Con `prefers-reduced-motion` no hay caída, ni lluvia hirviendo, ni sacudida de
tema: se enseña el fotograma en que te mira y se aguanta. **El final se ve; lo
que no hay es movimiento.** Antes se saltaba entero.

## Los ficheros

```
src/components/effects/LooseWall.tsx    el trozo, los golpes, la caída, el derrumbe
src/lib/system/eyeStatic.ts             el campo, la forma del ojo y su arco
src/styles/glitch.css                   la zona, el hueco, las tres capas, el golpe
tests/lib/system/eyeStatic.test.ts      la forma, el arco y el iris redondo
```

## Cómo probarlo, que sigue teniendo truco

**Sembrar el estado en una ruta 404 del mismo origen y navegar después.** No es
porque el JS no responda —responde— sino porque hace falta que el estado esté
antes de que monte la página:

```js
// en http://localhost:3000/loquesea
localStorage.setItem('flashnotes:entity', JSON.stringify({
  phase: 'dispuesto', exchanges: 0, gaveCommand: true, loose: true, provedIt: true
}));
// y después ir a http://localhost:3000
```

⚠ **Los clics sintéticos son más fiables que los del automatismo**, porque el
pedazo no tiene `pointer-events` y hay que acertarle a la caja:

```js
const s = document.querySelector('.loose-slab');
const r = s.getBoundingClientRect();
const x = Math.round(r.x + r.width / 2), y = Math.round(r.y + r.height / 2);
document.elementFromPoint(x, y)
  .dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: x, clientY: y }));
```

⚠ **Y el estado de React no se ve en el mismo turno.** Leer `--grieta` justo
después de despachar el golpe da el valor viejo y parece que el clic no llegó.
Esperar un tick antes de mirar; se perdió un buen rato con esto.

Para congelar el arco y mirar el ojo con calma, envolver `setInterval` y dejar
que la lluvia avance sólo N fotogramas. Y para que no recargue, tragarse los
`setTimeout` largos.

**El equipo se queda sin memoria.** Los servidores se murieron dos veces solos
por eso. Conviene levantarlos de a uno (`npm run dev:api`, luego `npm run
dev:web`) en vez de `npm run dev`.

## Lo que sigue fuera, a propósito

- La pieza de la **cinta** (`reserved-tape`) sigue sin cablear, y ahora es lo
  ÚNICO que queda: cerrado el ojo, es el último camino sin decidir de las
  dieciséis. Mientras siga así el **cuaderno firmado es inalcanzable** —exige
  todas las demás— y la colección se queda en 14/16. Su pie dice «siguió
  girando sola», así que lo que la gane tiene que ser algo que la máquina hizo
  sin nadie delante.
- El final de los golpes **no es alcanzable sin ratón**, y ahora tampoco encima
  del área de texto del editor. Las dos cosas están razonadas en la nota de
  accesibilidad al final de `LooseWall.tsx`: anunciar «botón» sobre algo cuyo
  sentido entero es que NO es un botón arruinaría el hallazgo, y robarle el clic
  al editor sería peor que no poder pegarle desde ahí. El otro final sí se
  teclea (`//report`).
