// src/i18n/es.ts

/**
 * El diccionario español. Es el ORIGEN: su forma define el tipo `Dictionary`
 * (ver `types.ts`), así que una clave nueva se añade primero aquí y el
 * compilador se encarga de reclamarla en `en.ts`.
 *
 * Las claves se agrupan por DOMINIO, no por componente: un texto puede mudarse
 * de componente, pero su dominio no cambia.
 *
 * Los tokens entre corchetes se traducen igual que el resto: `[FECHA:]`/`[DATE:]`,
 * `ARCHIVOS:`/`FILES:`, `[GUARDANDO`/`[SAVING`.
 *
 * LA REGLA ES NO CALCAR, que no es lo mismo que no traducir. `[SISTEMA_OK]` se
 * lee como una app traducida, no como una máquina; por eso el español no calca
 * `SYSTEM`, pero tampoco se queda en inglés: usa SU PROPIO token, que suena a
 * máquina en español.
 *
 *   `[SYSTEM_OK]`    ->  `[TODO_BIEN]`
 *   `[SYSTEM_EMPTY]` ->  `[SIN_ARCHIVOS]`
 *
 * No son traducciones el uno del otro, y por eso funcionan los dos. Lo único
 * que se queda igual en ambos idiomas es el nombre del producto
 * (`FLASH-NOTES v1.0`), las extensiones y los nombres de comando.
 */
export const es = {
    // ── común ────────────────────────────────────────────────────────────────
    'common.untitled': 'Sin_titulo.txt',
    'common.empty': '(vacío)',
    'common.loading': '[...] Cargando',
    'common.dash': '—',

    // ── cabecera y navegación ────────────────────────────────────────────────
    'nav.notes': 'Notas',
    'nav.trash': 'Papelera',
    'nav.viewsLabel': 'Vistas',
    'nav.dateLabel': 'FECHA',
    'nav.datePlaceholder': '----.--.--',

    // ── tema ─────────────────────────────────────────────────────────────────
    'theme.dark': 'OSCURO',
    'theme.light': 'CLARO',
    'theme.switchTo': 'Cambiar a tema {mode}',
    'theme.status': 'Tema {mode}. Pulsá para cambiar a {other}.',
    'theme.modeDark': 'oscuro',
    'theme.modeLight': 'claro',
    'theme.signalLost': '[✗ SEÑAL]',
    'theme.signalLostTitle': 'La señal de vídeo se perdió. Recargá la página.',
    'theme.signalLostStatus':
        'Señal perdida. Recargá la página para recuperar el cambio de tema.',

    // ── idioma ───────────────────────────────────────────────────────────────
    'lang.code': 'ES',
    'lang.switchTo': 'Cambiar el idioma a inglés',
    'lang.status': 'Idioma: español. Pulsá para cambiar a inglés.',

    // ── barra lateral ────────────────────────────────────────────────────────
    'sidebar.selectFile': 'Seleccionar_archivo',
    'sidebar.newNote': '[+] Nueva nota',
    'sidebar.empty': 'Sin archivos',
    'sidebar.loadMore': '[↓] Cargar más ({n})',
    // Grupo de plural: se pide con `t.plural('sidebar.files', n)`. `other` es
    // obligatoria; `one` es opcional y la elige `Intl.PluralRules`.
    'sidebar.files.one': 'archivo',
    'sidebar.files.other': 'archivos',
    'sidebar.noTime': '--:--:--',
    'sidebar.clockLabel': 'Hora del sistema',

    // ── listado de notas ─────────────────────────────────────────────────────
    'list.loading': '[CARGANDO',
    'list.loadingDetail': 'Recuperando archivos del sistema',
    // No es `[SISTEMA_VACÍO]` ni `[SYSTEM_EMPTY]`: el calco suena a app
    // traducida, y dejarlo en inglés lo convertía en el único cartel GRANDE en
    // otro idioma. El español tiene su propio token, que no es lo mismo que
    // traducir el del inglés.
    'list.emptyBanner': '[SIN_ARCHIVOS]',
    'list.emptyLine1': 'No hay archivos en el sistema.',
    'list.emptyLine2': 'Creá el primero para empezar.',
    'list.createFirst': '[+] Crear primer archivo',
    'list.available': 'Archivos_disponibles',
    'list.newFile': '[+] Nuevo archivo',
    'list.loadMore': '[↓] Cargar {n} más',

    // ── tarjeta de nota ──────────────────────────────────────────────────────
    'card.open': '[Abrir →]',

    // ── tiempo relativo ──────────────────────────────────────────────────────
    // El resto (5s, 12m, 3h, 4d) son cifras con su unidad: iguales en los dos
    // idiomas, así que no pasan por aquí.
    'time.now': 'ahora',

    // ── editor ───────────────────────────────────────────────────────────────
    'editor.back': '[←] Volver',
    'editor.saving': 'Guardando…',
    'editor.saved': 'Guardado',
    'editor.notSaved': 'Sin guardar',
    'editor.core': 'Editor_core',
    'editor.titlePlaceholder': 'Nombre_del_archivo.txt',
    'editor.contentLabel': 'Contenido de la nota',
    'editor.bootPlaceholder': 'El usuario comienza a escribir aquí…',
    'editor.quickActions': 'Acciones_rápidas',
    'editor.undo': '[↶] Deshacer',
    'editor.undoTitle': 'Deshacer (Ctrl+Z)',
    'editor.redo': '[↷] Rehacer',
    'editor.redoTitle': 'Rehacer (Ctrl+Y)',
    'editor.trash': '[↧] Papelera',
    'editor.trashTitle': 'Mover a papelera',
    'editor.overLimit':
        'La nota supera los {max} caracteres y no se puede guardar. Recortá {excess}.',
    'editor.newNoteTitle': 'Nueva nota',

    // ── diálogos ─────────────────────────────────────────────────────────────
    'dialog.cancel': '[✗] Cancelar',
    'dialog.trashTitle': '⚠ Mover a papelera',
    'dialog.trashMessage': 'La nota se moverá a la papelera. Podés restaurarla desde ahí.',
    'dialog.trashConfirm': '[✓] Mover',
    'dialog.deleteTitle': '⚠ Eliminar definitivamente',
    'dialog.deleteConfirm': '[X] Eliminar',

    // ── papelera ─────────────────────────────────────────────────────────────
    'trash.empty': 'La papelera está vacía.',
    'trash.deleted': 'Eliminada',
    'trash.restore': '[↶] Restaurar',
    'trash.delete': '[X] Eliminar',
    'trash.busy': '[...]',
    // La etiqueta del archivo fantasma. Es prosa —"esto lo puso el sistema"—
    // y no el nombre `SYSTEM.LOG`, que sí se queda igual.
    'trash.systemFile': 'Sistema',

    // ── barra de estado ──────────────────────────────────────────────────────
    'status.noNet': '[SIN_RED]',
    'status.reconnected': '[RECONECTADO · {duration} A OSCURAS]',
    'status.serverDown': '[SERVIDOR_NO_RESPONDE]',
    'status.error': '[ERROR]',
    'status.loading': '[CARGANDO',
    'status.ok': '[TODO_BIEN]',
    'status.broken': '[TODO_MAL]',
    'status.saving': '[GUARDANDO',
    'status.saved': '[GUARDADO]',
    'status.notSaved': '[NO_GUARDADO]',
    'status.files': 'ARCHIVOS: {n}',
    'status.noteSize': '[NOTA {used}/{max}]',
    'status.noteUsage': 'Espacio usado en la nota abierta',

    // ── panel de diagnóstico ─────────────────────────────────────────────────
    'diag.title': '⚙ Diagnóstico del sistema',
    'diag.session': 'SESIÓN',
    'diag.unreadable': 'NO LEGIBLE',
    'diag.uptime': 'TIEMPO ACTIVO',
    'diag.notesCreated': 'NOTAS CREADAS',
    'diag.bytesWritten': 'BYTES ESCRITOS',
    'diag.integrity': 'INTEGRIDAD',
    'diag.theme': 'TEMA',
    'diag.secrets': 'SECRETOS',
    'diag.core': 'NÚCLEO',
    'diag.coreMeter': 'Temperatura del núcleo: {temp} de {max} grados',
    'diag.effects': '[EFECTOS: {state}]',
    'diag.close': '[✗] Cerrar',

    // vsync-test (el pong escondido, ver docs/EFECTOS.md)
    'pong.title': 'vsync-test',
    'pong.rally': 'PELOTEO',
    'pong.systemRecord': 'RÉCORD DEL SISTEMA',
    'pong.hintVersus': '[2] DOS JUGADORES  ·  [ESC] SALIR',
    'pong.hintWall': '[1] CONTRA LA PARED  ·  A {score}  ·  [ESC] SALIR',
    'pong.lost': 'SE ESCAPÓ. PELOTEO {rally}.',
    'pong.won': 'GANA {side}.',
    'pong.again': '[ENTER] OTRA',
    'pong.modesLabel': 'Modos de juego',
    'pong.modeWall': 'PARED',
    'pong.modeVersus': '2 JUGADORES',
    'pong.speed': 'VELOCIDAD',
    'diag.pongClean': 'VSYNC-TEST',
    'diag.pongDegraded': 'VSYNC-TEST DEGRADADO',
    'diag.pongNever': 'SIN JUGAR',
    'diag.pongLine': '{best}  ({games} partidas)',

    // ── validación en el cliente ─────────────────────────────────────────────
    // Mismas reglas que el backend (ver config/limits.ts), dichas antes de
    // gastar una petición.
    'valid.titleNotText': 'El título debe ser un texto',
    'valid.titleEmpty': 'El título no puede estar vacío',
    'valid.titleTooLong': 'El título no puede superar {max} caracteres',
    'valid.titleNewline': 'El título no puede tener saltos de línea',
    'valid.titleMarkup': 'El título no puede contener < ni >',
    'valid.contentNotText': 'El contenido debe ser un texto',
    'valid.contentTooLong': 'El contenido no puede superar {max} caracteres',

    // ── errores ──────────────────────────────────────────────────────────────
    // La clave es el CÓDIGO que ya manda el backend en el campo `error`, no su
    // mensaje: los mensajes del servidor están siempre en español y dejan de
    // enseñarse. Añadir un código nuevo allá es añadir una clave aquí.
    'error.NETWORK_ERROR':
        'No se pudo contactar el servidor. Revisá que el backend esté corriendo.',
    'error.TOO_MANY_REQUESTS':
        'Demasiadas peticiones seguidas. Esperá un momento y volvé a intentar.',
    'error.INVALID_CSRF_TOKEN': 'Tu sesión de seguridad expiró. Recargá la página.',
    'error.VALIDATION_FAILED': 'Los datos enviados no son válidos.',
    'error.INVALID_ID_FORMAT': 'El identificador de la nota no es válido.',
    'error.PAYLOAD_TOO_LARGE': 'La nota es demasiado grande para guardarse.',
    'error.UNSUPPORTED_MEDIA_TYPE': 'El formato de la petición no es el esperado.',
    'error.NOT_FOUND': 'Eso ya no está acá.',
    'error.NO_HISTORY': 'No hay nada más que deshacer.',
    'error.NO_REDO': 'No hay nada que rehacer.',
    'error.CONFIGURATION_ERROR': 'El servidor está mal configurado. No es cosa tuya.',
    'error.INTERNAL_SERVER_ERROR': 'El servidor falló al procesar la petición.',
    'error.UNKNOWN': 'Algo salió mal.',
    'error.withStatus': 'Error {status}',
    'error.dismiss': 'Descartar el error',
};
