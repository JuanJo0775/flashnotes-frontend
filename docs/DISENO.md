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

- **Corchetes en toda acción y estado.** `[+] Nueva nota`, `[SYSTEM_OK]`,
  `[GUARDADO]`, `[DATE: 2026.08.31]`.
- **Comentarios de código como etiquetas de sección.** La clase `.comment`
  antepone `// ` y pone versalitas: `// EDITOR_CORE`, `// ACCIONES_RÁPIDAS`.
- **Nombres de archivo, no de documento.** `Sin_titulo.txt`, `ARCHIVOS_DISPONIBLES`.
- **Líneas de puntos guía** entre el nombre y su dato, como en un índice:
  `Ideas_Proyecto.txt ·············· 45b`. Se hacen con `.file-row-leader`, un
  elemento flexible que crece hasta llenar el hueco, así que se adapta a
  cualquier longitud sin calcular nada.
- **Medidores ASCII.** `.progress-bar` dibuja segmentos llenos y vacíos.
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
