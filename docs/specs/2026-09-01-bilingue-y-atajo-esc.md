# Bilingüe (ES/EN) y atajo Esc — diseño

> Fecha: 2026-09-01 · Alcance: `flashnotes-frontend` + `flashnotes-backend`
>
> **Coordinación:** hay una sesión paralela trabajando sobre los **secretos del
> sistema** (ver `2026-09-01-secretos-del-sistema.md`). Los archivos de esa pieza
> están **congelados** para este trabajo hasta que aterrice. Ver §6.

Hoy la interfaz mezcla los dos idiomas sin criterio: `[SYSTEM_OK]` convive con
`[SIN_RED]`, `FILES:` con `Papelera`, `[DATE:]` con `[GUARDANDO]`. No es una
estética, es una inconsistencia. Este documento la cierra: **la app entera habla
un idioma a la vez**, español o inglés, y el usuario elige cuál.

De paso entra un atajo que faltaba: **Esc para volver atrás**.

---

## 1. Qué se traduce

**Todo lo que el usuario lee**, incluidos los tokens de terminal. En español la
barra dice `[FECHA:]` y `ARCHIVOS:`; en inglés `[DATE:]` y `FILES:`.

**Los tokens de máquina no se calcan.** Se probaron las dos salidas fáciles y
las dos fallan: `[SISTEMA_OK]` se lee como una app traducida, y dejarlos en
inglés convertía `[SYSTEM_EMPTY]` en el único cartel GRANDE en otro idioma.

La regla que quedó es que cada idioma tenga **su propio token**, no una
traducción del otro:

| español          | inglés           |
| ---------------- | ---------------- |
| `[TODO_BIEN]`    | `[SYSTEM_OK]`    |
| `[T0DO_B1EN]`    | `[SYSTEM_0K]`    |
| `[SIN_ARCHIVOS]` | `[SYSTEM_EMPTY]` |
| `[TURNO_PESADO]` | `[SYSTEM_TIRED]` |

La errata del cero sobrevive al cambio, que era la condición para aceptarlo: en
inglés es un cero por la O de `OK`; en español, un cero por la O y un uno por la
I, porque `TODO_BIEN` es más largo y con una sola sustitución la errata se perdía
en la palabra.

Dos tests lo fijan (`translate.test.ts`): ninguna cadena española contiene
`SISTEMA_`, y si alguna usara `SYSTEM` tendría que ser el token inglés exacto —
nunca un híbrido tipo `[SYSTEM_VACÍO]`.

Esto **contradice** `docs/DISENO.md` §Vocabulario, que hoy declara los corchetes
en inglés como estética deliberada. Ese apartado se actualiza como parte de este
trabajo: si no, el documento de diseño queda mintiendo.

### Lo que NO se traduce

- El nombre del producto: `FLASH-NOTES v1.0`.
- Las extensiones de archivo: `.txt`.
- Los códigos de error internos (`INVALID_CSRF_TOKEN`), que no se muestran.

---

## 2. La capa de i18n

Diccionario propio tipado, **sin librería** — la línea que ya sigue todo el repo
(tema, undo/redo, diálogos y foco están hechos a mano a propósito).

```
src/config/lang.ts    LANG_STORAGE_KEY, tipo Lang, LANG_BOOT_SCRIPT
src/i18n/es.ts        diccionario fuente — DEFINE el tipo Dictionary
src/i18n/en.ts        satisface Dictionary
src/i18n/index.ts     useLang(), setLang(), toggleLang(), useT()
```

**La garantía central:** el tipo `Dictionary` se deriva de `es.ts` con
`typeof`, y `en.ts` se declara `const en: Dictionary`. Si a `en.ts` le falta una
clave, **no compila**. No hace falta un test que lo verifique — lo verifica
`tsc`, que ya corre en `npm run check`.

Claves agrupadas por dominio, no por componente (un texto puede mudarse de
componente; su dominio no cambia):

```
status.*   barra de estado        editor.*   editor de notas
nav.*      cabecera y pestañas    trash.*    papelera
list.*     listado y sidebar      error.*    mensajes de error
dialog.*   confirmaciones         a11y.*     etiquetas de lector de pantalla
```

**Interpolación** mínima y a mano: `t('status.noteSize', { n: 42 })` sustituye
`{n}` en la plantilla. Sin motor de plantillas, sin pluralización automática —
los pocos plurales que hay se resuelven con claves separadas
(`list.oneNote` / `list.manyNotes`), que es más legible que una regla ICU para
dos casos.

### Estado del idioma

Copia exacta del patrón de `src/hooks/useTheme.ts`: `useSyncExternalStore` +
`localStorage` + `getServerSnapshot`, con listeners compartidos y caché. Los
motivos por los que ese archivo está escrito así (evitar tocar `localStorage` en
cada render, reaccionar al evento `storage` de otras pestañas, no desincronizar
el render de servidor) valen igual aquí.

**Resolución al arrancar:** elección guardada → `navigator.language` → español.

`LANG_BOOT_SCRIPT` corre en `<head>`, igual que `THEME_BOOT_SCRIPT`, y estampa
el idioma en `<html lang>` **antes del primer pintado**. Sin esto habría un
parpadeo y un `lang` incorrecto para los lectores de pantalla. `layout.tsx` deja
de tener `lang="es"` fijo.

---

## 3. El selector

Un botón `[ES]`/`[EN]` en el Header, junto a `ThemeToggle`, con el mismo aspecto
(`nav-tab`) y la misma forma de anunciarse: muestra el idioma **en el que
estás**, como las pestañas muestran la vista en la que estás.

---

## 4. Los errores del backend

Hoy `getErrorMessage()` mapea a mano tres casos y para todo lo demás muestra
`data.message` — que viene del backend **en español, siempre**. En inglés eso se
ve mal.

**El backend NO necesita ningún cambio.** Al implementarlo resultó que ya manda
un código estable en el campo `error` de cada respuesta de error — la premisa de
que había que añadirlo era falsa. Los códigos que ya existen:

| `code`                   | Origen                        |
| ------------------------ | ----------------------------- |
| `VALIDATION_FAILED`      | validación de datos           |
| `INVALID_ID_FORMAT`      | id con formato inválido       |
| `PAYLOAD_TOO_LARGE`      | cuerpo excede el tamaño       |
| `INVALID_CSRF_TOKEN`     | token de seguridad            |
| `TOO_MANY_REQUESTS`      | límite de peticiones          |
| `UNSUPPORTED_MEDIA_TYPE` | Content-Type incorrecto       |
| `NOT_FOUND`              | ruta o nota inexistente       |
| `NO_HISTORY` / `NO_REDO` | nada que deshacer o rehacer   |
| `CONFIGURATION_ERROR`    | fallo de configuración        |
| `INTERNAL_SERVER_ERROR`  | fallo interno (por defecto)   |
| `NETWORK_ERROR`          | sintético: no hubo respuesta  |

Todo el trabajo es del frontend: `getErrorInfo()` mapea `data.error` → una CLAVE
`error.*` del diccionario.

**Lo que se guarda es la clave, no el texto.** Primero se guardaba el texto ya
traducido en el estado de React, y en pantalla se veía el fallo: con la app en
español, el error de la barra seguía en inglés porque se había resuelto cuando
ocurrió y nadie lo volvía a mirar. Ahora los hooks guardan un `Message`
(`{ key, vars }`) y el componente lo resuelve en cada render, así que el error
sigue al idioma. Vale igual para los errores de validación del cliente
(`validators.ts`), que también devuelven claves. Los mensajes en español del backend **se quedan donde
están** como texto de log, pero dejan de mostrarse.

Los `details` de validación **tampoco se muestran**: son prosa de Mongoose, en
español, así que enseñarlos filtraría español a la interfaz en inglés — el mismo
bug por otra puerta. El cliente ya valida con los mismos límites que el servidor
(`config/limits.ts`), así que un error de validación del servidor es un caso
raro, no la vía normal de avisar al usuario.

---

## 5. El atajo Esc

| Dónde                    | Qué hace                                      |
| ------------------------ | --------------------------------------------- |
| Editor de nota           | `flush()` (guarda lo pendiente) y vuelve a la lista |
| Papelera                 | Vuelve a notas                                |
| Listado de notas         | Nada                                          |
| Con un `<dialog>` abierto | **Nada** — lo gestiona el diálogo             |

**Por qué no hay diálogo de confirmación.** El editor ya autoguarda: debounce de
2,5 s, más `flush()` en `blur` y al desmontar. "Cambios sin guardar" apenas
existe como estado, y preguntar por algo cuya respuesta el sistema ya conoce es
ruido. Esc **guarda** en vez de preguntar. Es el tono que `lore.ts` declara: la
máquina está de tu lado, guarda tus notas y te lo dice.

**La guarda del diálogo es obligatoria.** `ConfirmDialog` y `DiagnosticPanel`
usan `<dialog>` nativo con `showModal()`, que ya cierra con Escape por su cuenta.
Si el manejador global también actuara, un solo Esc cerraría el diálogo **y**
saldría del editor. El manejador se salta si hay un `dialog[open]` en el
documento.

`useKeyboardShortcuts` hoy **sale temprano si no hay Ctrl/Cmd**. Esa guarda se
abre para dejar pasar Esc, con cuidado de no alterar el comportamiento de los
atajos existentes.

---

## 6. Orden de trabajo y archivos congelados

La sesión paralela trabaja sobre los secretos del sistema. Estos archivos
**no se tocan** en las fases 1–4:

```
src/lib/system/lore.ts          src/components/effects/BootPrompt.tsx
src/lib/system/commands.ts      src/components/effects/TypewriterText.tsx
src/lib/system/requestLog.ts    src/components/notes/LinePrompts.tsx
src/lib/system/diagnostics.ts   src/components/system/DiagnosticPanel.tsx
src/hooks/useSystemState.ts     src/hooks/useNoteCommands.ts
```

| Fase | Contenido                                                        | Estado |
| ---- | ---------------------------------------------------------------- | ------ |
| 1    | Capa i18n + `config/lang.ts` + tests — archivos nuevos            | **hecha** |
| 2a   | Header, Sidebar, NotesList, NoteCard, ThemeToggle, layout         | **hecha** |
| 2b   | StatusBar                                                        | **hecha** |
| 2c   | TrashView, ConfirmDialog, NoteEditor, formatters, page.tsx        | **hecha** |
| 3    | Errores por clave: `client.ts`, `validators.ts`, los tres hooks   | **hecha** |
| 4    | Esc: `useKeyboardShortcuts`, `page.tsx`, `NoteEditor`             | **hecha** |
| 5    | `lore.ts` y `commands.ts` — fragmentos, arranques y comandos      | **hecha** |
| 6    | `DiagnosticPanel`, `ghostFile`, `requestLog`, `useNoteCommands`   | **hecha** |

La fase 2a se hizo primero porque son los archivos que la sesión paralela NO
tenía modificados: colisión imposible. La fase 5 se hizo al final, cuando
`lore.ts` y `commands.ts` llevaban ya casi una hora sin tocarse y esa sesión
había pasado a archivos nuevos.

No queda nada pendiente. Los efectos puramente visuales de la otra sesión
—`SystemCollapse`, `GlitchLayer`, `ChromaticFailure`, `TypewriterText`,
`LinePrompts`— no llevan texto propio: pintan, no hablan.

---

## 6 bis. El error de hidratación del panel de diagnóstico

Apareció mientras se verificaba lo demás y se arregló de paso, porque el panel
había que tocarlo igual para traducirlo.

`DiagnosticPanel` hacía `useState(() => Date.now())`. Ese inicializador corre en
el SERVIDOR al renderizar y otra vez en el CLIENTE al hidratar, con segundos de
diferencia, así que la fila TIEMPO ACTIVO salía `496754:16:04` en uno y
`496754:16:08` en el otro y React tiraba un error de hidratación en **cada
carga**. Se veía aunque el panel estuviese cerrado: es un `<dialog>`, y su
contenido está en el DOM desde el primer render.

El arreglo es que `now` arranque en `system.sessionStart` en lugar de en
`Date.now()`. El instantáneo de servidor de `useSystemState` da `sessionStart: 0`,
así que servidor y cliente coinciden en `00:00:00` al hidratar, y el efecto —que
sólo corre con el panel abierto— lo pone al día enseguida.

---

## 7. El lore en inglés no es una traducción

`lore.ts` y `commands.ts` son los archivos con más texto y con voz propia: un
registro rioplatense deliberado (*"seguís", "acá", "vos"*) y un tono documentado
como **cansado, no siniestro**. Pasarlo a inglés es **escritura creativa**, no
sustitución de cadenas. El criterio es que la experiencia sea igual de buena en
los dos idiomas, no que las frases se correspondan una a una.

Casos que no cruzan solos:

- **`[SYSTEM_0K]`** — la errata del cero en lugar de la O. Funciona igual en
  inglés; se conserva tal cual.
- **`[SIGO ACÁ]`** — el rioplatense no tiene equivalente directo. El inglés
  busca el mismo cansancio, no las mismas palabras (`[STILL HERE]`).
- **La lista de números en palabras** (`'cero','uno','dos'…`) necesita su
  equivalente inglés completo.
- **El voseo** (`escribí`, `recargá`, `pulsá`) desaparece en inglés; lo que hay
  que conservar es el trato directo y seco, no la conjugación.
- **Los nombres de comando** (`>help`, `>diag`, `>panic`) **no se traducen**:
  son la interfaz de la terminal, no prosa. Sus descripciones sí.

**Cómo quedó implementado.** Los textos del lore NO se movieron al diccionario:
se quedan en `lore.ts` y `commands.ts` como `{ es, en }` en la misma línea. Es
deliberado — el comentario que explica por qué una frase funciona tiene que estar
al lado de las DOS versiones, o la segunda se escribe a ciegas. El diccionario
general es para la interfaz; el lore es texto de autor y vive con su comentario.

Las funciones (`pickFragment`, `pickBootPhrase`, `permanentDeleteMessage`,
`run`) reciben el idioma como parámetro con valor por defecto: pasándolo siguen
siendo puras y se prueban en los dos idiomas sin tocar `localStorage`;
omitiéndolo, siguen el idioma de la app.

`MAX_FRAGMENT_LENGTH` se calcula sobre AMBOS idiomas. Si dependiera del idioma
activo, cambiar de ES a EN reajustaría el hueco reservado y la barra de estado
entera daría un salto.

Esta fase se revisa línea por línea, no de un vistazo.

---

## 8. Pruebas

TDD. La línea base antes de empezar es **298 tests en 22 suites, todo en verde**.

| Qué                                   | Cómo                                         |
| ------------------------------------- | -------------------------------------------- |
| Diccionarios completos                | lo garantiza `tsc`, no un test               |
| `useLang` / `setLang`                 | aislado: guardado, autodetección, fallback, almacenamiento bloqueado |
| Selector de idioma                    | cambia el idioma y lo anuncia                |
| Mapeo `code` → texto de error         | tabla de códigos, incluido uno desconocido   |
| Esc por vista                         | editor (guarda y sale), papelera, listado    |
| Esc con diálogo abierto               | **no** sale del editor                       |
| Atajos existentes                     | Ctrl+S/Z/Y/N siguen intactos                 |

**El idioma de las pruebas se fija a mano.** El spec asumió que el entorno de
pruebas ya sería español; es falso — jsdom reporta `navigator.language = 'en-US'`,
así que la app arrancaba en INGLÉS en la suite y toda aserción sobre un texto en
español fallaba por el entorno y no por el código. `jest.setup.ts` lo fija en
`es-AR`, que además hace el resultado independiente del locale de la máquina.
Los tests que necesitan el otro idioma lo piden con `setLang()`.
