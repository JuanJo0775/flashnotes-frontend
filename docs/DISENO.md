# Sistema de diseño

La estética es un sistema operativo de escritorio que nunca existió: cemento y
tinta, todo en monoespaciada, etiquetas entre corchetes, comentarios con `//`,
cero curvas. Referencias: la maqueta `NOTES_OS v1.0`, los fanzines compuestos
con caracteres ASCII y la contraportada de un bloc Rhodia — tablas técnicas
densas, filetes de un pelo, datos alineados.

---

## Cómo está montado

Todo pasa por tokens. Los componentes **nunca** llevan un color literal:

```
globals.css     @theme  → tokens y su versión oscura
                @layer base       → reset, tipografía base, textura, foco
                @layer components → .mono, .pixel, .container-terminal
terminal.css    @layer components → botones, campos, barras, diálogos, fichas
animations.css  @layer components → cursor, barrido, flash, puntos de carga
```

### Las capas de cascada no son opcionales

Los dos archivos de estilos se importan con `layer(components)`:

```css
@import "../styles/terminal.css" layer(components);
```

En Tailwind v4 todas las utilidades viven en `@layer utilities`, y **el CSS sin
capa gana siempre al CSS con capa**, sin importar especificidad ni orden. Con el
reset fuera de capas, un `* { padding: 0 }` anulaba todas las utilidades de
espaciado: `p-4` calculaba `0px` en toda la aplicación. Si añadís un archivo de
estilos, importalo dentro de una capa.

---

## Color

Tokens en `src/app/globals.css`. Sólo se redefinen en el bloque oscuro; ningún
componente se duplica por tema.

| Token                 | Claro     | Oscuro    | Para qué                             |
| --------------------- | --------- | --------- | ------------------------------------ |
| `--color-primary`     | `#e6e4de` | `#121110` | Lienzo                               |
| `--color-secondary`   | `#d5d2c9` | `#1c1b19` | Barras de herramientas y paneles     |
| `--color-tertiary`    | `#f2f0eb` | `#191816` | Papel: fichas y área de escritura    |
| `--color-ink`         | `#12110d` | `#e8e5dc` | Tinta: barras invertidas, líneas     |
| `--color-inverse`     | `#f2f0eb` | `#121110` | Texto sobre tinta                    |
| `--color-meta`        | `#5f5c51` | `#918d80` | Metadatos                            |
| `--color-line`        | `#12110d` | `#e8e5dc` | Filetes principales                  |
| `--color-line-soft`   | `#a8a49a` | `#4a4740` | Separadores internos                 |
| `--color-ok/warn/danger` | —      | —         | Estado. **No son acentos de marca**  |
| `--color-scrim`       | `18 17 13 / .55` | `0 0 0 / .72` | Velo de los diálogos    |


### Cambiar de tema

El botón `[◐ CLARO]` / `[◑ OSCURO]` de la cabecera invierte los colores. El
semicírculo cambia de lado; el texto nombra el modo en el que estás, igual que
las pestañas de al lado nombran la vista en la que estás.

Hay **tres** estados, no dos:

| Estado                  | Qué manda                    | `data-theme` en `<html>` |
| ----------------------- | ---------------------------- | ------------------------ |
| Sin elección guardada    | `prefers-color-scheme`       | ausente                  |
| Elegiste claro           | tu elección                  | `"light"`                |
| Elegiste oscuro          | tu elección                  | `"dark"`                 |

El CSS contempla los tres: el bloque oscuro va guardado como
`:root:not([data-theme="light"])` dentro de la media query, para que una elección
explícita de tema claro gane sobre un sistema en oscuro.

La elección se guarda en `localStorage` y **se aplica antes del primer pintado**
con un script en línea (`THEME_BOOT_SCRIPT`, en `src/config/theme.ts`). Sin él, la
página se pinta con el tema del sistema y salta al elegido al hidratar: un
fogonazo blanco al abrir en oscuro.

> Ese script lo genera `layout.tsx`, que es un **Server Component**. Por eso la
> clave vive en `src/config/theme.ts`, un módulo **sin** `'use client'`: cuando
> se importaba desde el módulo del hook, el servidor recibía una referencia al
> cliente en vez del valor y el script salía al HTML como
> `localStorage.getItem(undefined)`. El tema guardado no se aplicaba nunca.

---

Dos cosas que parecen detalles y no lo son:

- **`--color-ink` se invierte con el tema.** En claro es casi negro; en oscuro,
  casi blanco. La cabecera y la barra de estado son *ink sobre el lienzo*, así
  que se invierten solas y siguen leyéndose.
- **`--color-scrim` es un token propio, no una mezcla con `--color-ink`.**
  Justamente porque la tinta se invierte: en tema oscuro un velo de tinta
  *aclaraba* la página en vez de atenuarla.

---

## Tipografía

Dos familias, dos trabajos:

- **JetBrains Mono** (`--font-mono`, clase `.mono`) — todo el texto corriente,
  datos y etiquetas. Es una app de notas escrita en monoespaciada: el ancho fijo
  es lo que hace que las líneas de puntos guía y las tablas cuadren solas.
- **VT323** (`--font-pixel`, clase `.pixel`) — sólo cabecera, títulos de sección
  y de diálogo, y el campo del título. Es el acento; usarla en párrafos la
  arruina.

Ambas se cargan con `next/font` y **las variables se cuelgan de `<html>`, no de
`<body>`**: `--font-mono` se define en `:root` y referencia `--font-jetbrains`,
así que tiene que estar disponible en ese elemento o por encima. Además llevan
valor de respaldo dentro del `var()`; sin él, un `var()` que apunte a una
propiedad no definida invalida toda la declaración y la app entera cae a la
sans-serif del sistema.

Escala, en píxeles enteros: `2xs 10 · xs 11 · sm 12 · base 14 · lg 16 · xl 20 ·
2xl 26 · 3xl 34`.

---

## Retícula

`--spacing: 4px`. Todo espaciado es un múltiplo, vía utilidades de Tailwind
(`p-4` = 16px) o `calc(var(--spacing) * n)` en CSS propio. Los grupos hermanos se
componen con `flex`/`grid` y `gap`, nunca con márgenes por elemento.

---

## Vocabulario

Lo que hace que la interfaz se lea como un sistema y no como una app cualquiera:

- **Corchetes en toda acción y estado.** `[+] Nueva nota`, `[TODO_BIEN]`,
  `[GUARDADO]`, `[FECHA: 2026.08.31]`.
- **Los corchetes se traducen como todo lo demás, pero NO SE CALCAN.** La app
  habla **un idioma a la vez**, y cada idioma tiene sus propios tokens en vez de
  una traducción palabra por palabra del otro:

  | español           | inglés            |
  | ----------------- | ----------------- |
  | `[TODO_BIEN]`     | `[SYSTEM_OK]`     |
  | `[T0DO_B1EN]`     | `[SYSTEM_0K]`     |
  | `[SIN_ARCHIVOS]`  | `[SYSTEM_EMPTY]`  |
  | `[TURNO_PESADO]`  | `[SYSTEM_TIRED]`  |
  | `[ARCHIVOS: 3]`   | `[FILES: 3]`      |

  El calco directo (`[SISTEMA_OK]`) se lee como una app traducida, no como una
  máquina; dejarlo en inglés convertía el cartel de la pantalla vacía en el
  único texto grande en otro idioma. Un test lo fija: ninguna cadena española
  puede contener `SISTEMA_`.

  Lo único igual en los dos idiomas es el nombre del producto
  (`FLASH-NOTES v1.0`), las extensiones (`.txt`), el nombre de archivo
  `SYSTEM.LOG` y los nombres de los comandos (`//help`, `//diag`), que son la
  interfaz de la terminal y no prosa.
  Ver `docs/specs/2026-09-01-bilingue-y-atajo-esc.md`.
- **Comentarios de código como etiquetas de sección.** La clase `.comment`
  antepone `// ` y pone versalitas: `// EDITOR_CORE`, `// ACCIONES_RÁPIDAS`.
- **Nombres de archivo, no de documento.** `Sin_titulo.txt`, `ARCHIVOS_DISPONIBLES`.
- **Líneas de puntos guía** entre el nombre y su dato, como en un índice:
  `Ideas_Proyecto.txt ·············· 45b`. Se hacen con `.file-row-leader`, un
  elemento flexible que crece hasta llenar el hueco, así que se adapta a
  cualquier longitud sin calcular nada.
- **Medidores ASCII.** `.progress-bar` dibuja segmentos llenos y vacíos. Mide
  los caracteres de la nota abierta contra `CONTENT_MAX`, que es el único tope
  que un usuario puede alcanzar: **no hay límite de cantidad de notas**.
- **Grano de papel.** Una capa fija en `body::before` con ruido SVG en línea al
  5 % de opacidad. No hay archivo que descargar y el scroll no la repinta.

---

## Movimiento

Los cambios de estado son **instantáneos** (`step-end`, `transition: none`): es
una terminal, no una app con muelles. Lo único continuo es lo ambiental — el
cursor que parpadea y la línea de barrido CRT, que anima sólo `transform` para
quedarse en el compositor. Todo respeta `prefers-reduced-motion` mediante una
regla global en la capa base.

La única respuesta física es el desplazamiento de 1px de los botones al pulsar.

---

## El color sólo aparece cuando algo requiere atención

Que todo vaya bien **no se pinta**. `[SYSTEM_OK]` y `[GUARDADO]` van en el mismo
negro o blanco que el resto del texto de la barra; un indicador verde permanente
es ruido, no información. El ámbar y el rojo quedan reservados para lo que hay
que mirar: sin red, servidor caído, error, nota sin guardar, borrado definitivo.

Por eso `MetaTag` no tiene variante de éxito: sólo `neutral`, `warning` y
`error`.

---

## Cursor y arranque del editor

El cursor de texto es un **bloque**, no una raya: `caret-shape: block` sobre
`.input-terminal` y `.editor-textarea`. Es mejora progresiva — donde no está
soportado se ve el cursor fino de siempre y no se pierde nada.

`.cursor-block` —el que dibuja la animación— mide **una celda de carácter**:
`1ch` de ancho, que en una monoespaciada es exactamente el avance de un
carácter, por `1.25em` de alto. Las medidas están tomadas comparándolo lado a
lado con el cursor real del navegador, porque los dos se relevan en el mismo
sitio y cualquier diferencia de tamaño se nota como un salto. Quedan dentro de
un píxel; idénticos no pueden ser, porque el real lo pinta el navegador y no se
puede medir desde CSS.

Al abrir una nota, **el cursor se coloca al final del texto**, no al principio:
`focus()` a secas lo deja en la posición cero, y volver a una nota ya escrita
te dejaba arriba del todo teniendo que bajar a mano.

Al abrir una nota **vacía**, el editor hace una pequeña secuencia de arranque: el
texto de ayuda se teclea solo con cursor de bloque, se mantiene un momento y
desaparece dejando el cursor real listo. Escribir la corta en el acto.

Dos detalles que la hacen funcionar:

- Mientras dura, el textarea lleva `.is-booting`, que pone `caret-color:
  transparent`. Sin eso habría **dos cursores** a la vez: el de la animación y el
  real en la posición cero.
- El foco va al textarea desde el primer instante, aunque la animación siga.
  Escribir siempre funciona; la animación nunca se traga una pulsación.

---

## Prompts de línea

El `>` marca el comienzo de cada línea que escribiste:

| Caso | ¿Lleva `>`? |
| ---- | ----------- |
| Primera línea, siempre (aunque esté vacía) | sí |
| Línea con texto | sí |
| Continuación por ajuste de ancho | **no** — es la misma línea |
| Línea vacía | **no** |

Se alinea **por maquetado, no midiendo**: debajo del textarea hay una copia del
texto en color transparente, con el mismo tipo, ancho y relleno, una línea
lógica por bloque, y el `>` lo pone un `::before` en el hueco de la izquierda.
Como la copia se parte igual que el original, cada prompt cae solo en su sitio.

Tres variables en `.editor-canvas` gobiernan el área de escritura, y las
comparten el textarea, la copia de los prompts y el texto de arranque:
`--gutter` (hueco izquierdo, donde vive el `>`), `--edge` (aire a la derecha,
para que el texto no toque la barra de desplazamiento) y `--tracking`
(separación entre letras). Al ser las mismas en los tres, el texto se parte por
el mismo sitio y todo queda alineado; cambiarlas los mueve a la vez.

**`--tracking` no es decorativo.** En JetBrains Mono los glifos de `-`, `_`, `=`
y `#` llegan al borde de su celda: al repetirse se tocan y forman una línea
continua, así que escribís `---` y ves un solo guion largo, como si se hubieran
borrado dos. No es una ligadura —romperlas con U+200C no cambia nada, y los
caracteres están todos ahí—, es la forma de los glifos. `0.05em` los vuelve
contables sin que el texto pierda densidad. Los caracteres que no llegan al
borde (`(`, `)`, `%`, `$`, `"`) nunca tuvieron el problema.

El relleno derecho del área es menor que el del resto a propósito: iguala al de
la barra del título, así el borde derecho de la caja del título hace de guía y
la barra de desplazamiento cae justo sobre esa línea.

> La primera versión medía las posiciones con un espejo oculto y las aplicaba a
> mano. Se desincronizaba de tres maneras: `requestAnimationFrame` queda
> suspendido si la pestaña no está visible, la tipografía se aplica *después* de
> haber medido (`document.fonts.ready` puede resolverse antes de que llegue a
> usarse), y el ancho cambia al aparecer la barra de desplazamiento. El síntoma
> era un prompt colocado a 1702px en un texto de 1590px de alto: fuera de la
> vista y sin forma de recuperarse. Si alguna vez hay que tocar esto, alinear
> por maquetado y no por aritmética es lo que lo mantiene sano.

### Y una regla que no es de diseño pero lo parece

**No propagar cada tecla al componente padre.** El medidor de la barra de estado
necesita el tamaño de la nota, y avisar al padre en cada pulsación re-renderiza
la página entera, encadenando una actualización más por tecla. Escribiendo
rápido, esa cadena llegaba al límite de actualizaciones anidadas de React
—`Maximum update depth exceeded`—, React abortaba el ciclo y **la interfaz se
quedaba congelada**: los prompts desaparecían y no volvían hasta que otro render
los rescataba. Por eso el aviso va agrupado cada 250 ms: un medidor no necesita
precisión de carácter.

---

## Barra de desplazamiento

Un canal rayado en diagonal con un bloque de tinta rectangular dentro, sin
flechas ni esquinas redondeadas: 14px de ancho, porque es un elemento del
sistema y no un detalle que haya que esconder.

Ojo con una trampa: **en Chrome, declarar `scrollbar-color` desactiva todas las
reglas `::-webkit-scrollbar`** de ese scroller y devuelve la barra del sistema.
Por eso las propiedades estándar van dentro de
`@supports not selector(::-webkit-scrollbar)`, para que sólo las coja Firefox.

---

## Iconos

Todos entre corchetes y **monocromos, de trazo fino**: `[+]` `[←]` `[↶]` `[↷]`
`[↧]` `[X]` `[✓]` `[✗]` `[↓]` `[◐]`.

Nada de emoji. El botón de papelera era `[🗑]` y se pintaba a color, con mucho
más peso que las flechas de al lado: parecía una calcomanía pegada sobre la
interfaz. Ahora es `[↧]`, del mismo grosor y de la misma familia que `[↶]` y
`[↷]`, y significa "mandar abajo" — que es mover a la papelera, no borrar. El
borrado definitivo sigue siendo `[X]`, y es el único que va en rojo.

---

## Orden de los botones

En cualquier grupo de botones, **la acción que retrocede o es más segura va
primero; la que avanza, confirma o destruye va última.** Se lee de izquierda a
derecha como avanza la intención.

| Grupo                     | Orden                          |
| ------------------------- | ------------------------------ |
| Diálogo de confirmación   | Cancelar · Confirmar           |
| Ficha de la papelera      | Restaurar · Eliminar           |
| Barra del editor          | Undo · Redo · Papelera         |

La destructiva queda siempre en el extremo derecho, lejos de donde cae el cursor
al abrirse un diálogo, y marcada con `.btn-terminal.is-danger`.

El **foco inicial** de un diálogo depende de si la acción se puede deshacer:
irreversible enfoca *Cancelar*, reversible enfoca *Confirmar*. Así, pulsar Enter
sin leer nunca borra nada para siempre, pero tampoco estorba en una
confirmación de trámite.

`ConfirmDialog` es el único diálogo de la app, así que la regla está en un solo
sitio y no se puede torcer por descuido. `tests/components/ui/ConfirmDialog.test.tsx`
comprueba el orden y el foco: si alguien los invierte, la suite falla.

---

## Reglas que no se saltan

1. **Sin curvas.** `border-radius: 0` para controles, en la capa base. Antes se
   imponía con `* { ... !important }`, un martillo que ningún componente podía
   sobrescribir; ahora es un selector normal que deja lugar a una excepción si
   algún día hace falta.
2. **Foco siempre visible.** La app se maneja con teclado (Ctrl+N, Ctrl+Z,
   Ctrl+Y, Escape). `:focus-visible` pinta un contorno de 2px. No lo quites.
3. **Los diálogos son `<dialog>` nativos.** `showModal()` da trampa de foco,
   cierre con Escape y capa superior sin librerías. Ojo: el reset global anula el
   `margin: auto` con el que el navegador los centra, por eso `.dialog-terminal`
   lo repone.
4. **Ninguna clase inventada.** Si escribís `bg-secondary` o `text-meta`, tiene
   que existir el token en `@theme`. Había unas 30 clases sin definir repartidas
   por el JSX que no pintaban nada: la barra lateral salía sin fondo y el título
   del editor nunca usaba la tipografía de píxeles.
5. **El color semántico no es acento.** `ok`, `warn` y `danger` sólo comunican
   estado. El único uso destructivo es `.btn-terminal.is-danger`, reservado al
   borrado definitivo.
