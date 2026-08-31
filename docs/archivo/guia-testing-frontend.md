# 🧪 GUÍA DE TESTING - FLASHNOTES

**Versión:** 1.0  
**Fecha:** 3 de febrero de 2026

---

## 📋 TABLA DE CONTENIDOS

1. [Setup](#setup)
2. [Testing Manual](#testing-manual)
3. [Testing Automatizado](#testing-automatizado)
4. [Casos de Error](#casos-de-error)
5. [Performance](#performance)

---

## 🛠️ SETUP

### Requisitos
- Node.js v14+
- npm o yarn
- MongoDB ejecutándose localmente o remoto
- Navegador moderno (Chrome, Firefox, Safari, Edge)

### Iniciar Backend
```bash
cd flashnotes-backend
npm install  # si no está hecho
npm run dev  # inicia en puerto 3000
```

### Iniciar Frontend
```bash
cd flashnotes-frontend
npm install  # si no está hecho
npm run dev  # inicia en puerto 3000 o siguiente disponible
```

### Verificar Health
```bash
curl http://localhost:3000/api/health
# Respuesta esperada:
# {"success":true,"data":{"status":"OK","timestamp":"..."},"statusCode":200}
```

---

## ✅ TESTING MANUAL

### 1️⃣ FLUJO CREATE (Creación de Notas)

**Paso 1: Crear nota**
- [ ] Click "+" o "Nueva nota" en sidebar
- [ ] Nuevo editor debe abrirse
- [ ] Título debe ser "Nueva nota"
- [ ] Contenido debe estar vacío
- [ ] Nota debe aparecer en lista (arriba con timestamp "Ahora")

**Paso 2: Verificar en backend**
```bash
# En MongoDB, buscar la nota creada
db.notes.findOne({title: "Nueva nota"}).pretty()
# Debe tener:
# - _id: ObjectId
# - sessionId: (string)
# - title: "Nueva nota"
# - content: ""
# - versions: [] (array vacío)
# - redoStack: [] (array vacío)
# - isDeleted: false
# - createdAt: (timestamp)
# - updatedAt: (timestamp)
```

**Paso 3: Validación de ID**
- [ ] Crear nota, copiar URL o ID del editor
- [ ] ID debe ser formato MongoDB (24 hex chars)
- Ej: `507f1f77bcf86cd799439011`

---

### 2️⃣ FLUJO EDIT (Edición y Auto-save)

**Paso 1: Editar título**
- [ ] En el editor, modificar "Nueva nota" a "Mi Primera Nota"
- [ ] Status bar debe mostrar "GUARDANDO..."
- [ ] Después 1 segundo: debe mostrar "GUARDADO Ahora" (o timestamp relativo)
- [ ] Cerrar editor y volver: titulo debe estar actualizado

**Paso 2: Editar contenido**
- [ ] En editor, escribir en textarea: "Este es mi contenido"
- [ ] Esperar 1 segundo
- [ ] Status debe actualizar a "GUARDADO"
- [ ] Ver cambio de tamaño: "123 B" → "149 B"

**Paso 3: Auto-save detecta cambios reales**
- [ ] Editar contenido, esperar a GUARDADO
- [ ] Editar exactamente igual → NO debe enviar request (debounce)
- [ ] Cambiar de nuevo → sí debe guardar

**Paso 4: Cerrar y reabrir**
- [ ] Click [←] VOLVER
- [ ] Click en nota nuevamente
- [ ] Contenido debe ser exacto al que se guardó

---

### 3️⃣ FLUJO UNDO/REDO

**Paso 1: Usar UNDO**
- [ ] Editar nota: escribir "v1"
- [ ] Guardar (esperar GUARDADO)
- [ ] Cambiar a "v2"
- [ ] Guardar
- [ ] Click [↶] UNDO
- [ ] Debe mostrar "v1"
- [ ] Status debe actualizar

**Paso 2: Validar estados de botones**
- [ ] Nueva nota: botones [↶] y [↷] deshabilitados (gray)
- [ ] Después de 1 edit + save: [↶] habilitado, [↷] deshabilitado
- [ ] Click [↶]: ambos habilitados
- [ ] Click [↷]: solo [↶] habilitado

**Paso 3: Limitar historial**
- [ ] Hacer 25 ediciones (límite es 20)
- [ ] Primer UNDO debe devolver la edición 24 (no la 1)

**Paso 4: UNDO anula REDO**
- [ ] Edit: "v1" → UNDO → [↷] habilitado
- [ ] Edit a "v2" (sin REDO)
- [ ] [↷] debe deshabilitarse

---

### 4️⃣ FLUJO TRASH (Papelera)

**Paso 1: Mover a papelera**
- [ ] En editor, click [🗑] TRASH
- [ ] Popup: "¿Mover a papelera?"
- [ ] Click OK
- [ ] Editor debe cerrar, volver a lista
- [ ] Nota debe desaparecer de "Notas activas"

**Paso 2: Ver en papelera**
- [ ] Click "PAPELERA" en header
- [ ] Nota debe aparecer en listado
- [ ] Debe mostrar:
  - [ ] Título
  - [ ] Preview del contenido (primeros 120 chars)
  - [ ] Timestamp relativo (ej: "Eliminado hace 1 segundo")
  - [ ] Tamaño en bytes
  - [ ] Badge [DELETED]

**Paso 3: Restaurar desde papelera**
- [ ] Click [↶] RESTAURAR en nota de papelera
- [ ] Botón debe mostrar "[...] RESTAURAR" (loading)
- [ ] Nota debe desaparecer del listado
- [ ] Click "NOTAS" → debe aparecer nuevamente

**Paso 4: Eliminar permanentemente**
- [ ] En papelera, click [X] ELIMINAR
- [ ] Popup: "¿Eliminar permanentemente?"
- [ ] Click OK
- [ ] Botón debe mostrar "[...] ELIMINAR"
- [ ] Nota debe desaparecer
- [ ] Volver a papelera → NO debe estar

**Paso 5: Verificar en BD**
```bash
# Nota eliminada permanentemente no debe existir
db.notes.findById(ObjectId("..."))  # debe retornar null

# Nota en papelera sí debe existir
db.notes.findById(ObjectId("...")).pretty()  # debe tener isDeleted: true
```

---

### 5️⃣ CONFLICT DETECTION (Concurrencia)

**Paso 1: Setup: 2 navegadores**
- [ ] Abrir pestaña A: http://localhost:3000
- [ ] Abrir pestaña B: http://localhost:3000 (MISMO navegador)
- Ambas cargan lista de notas

**Paso 2: Crear nota en ambas**
- Pestaña A: Click "Nueva nota"
- [ ] Se abre editor
- [ ] Escribir "Desde A"
- [ ] Guardar (esperar "GUARDADO")

**Paso 3: Conflicto simulado**
- Pestaña A: Cambiar a "Desde A - Cambio 1" → Guardar
- Pestaña A: ESPERAR 5 segundos (o hacer GET manual desde B)
- Pestaña A: Cambiar a "Desde A - Cambio 2"
- [ ] Esperar 1 segundo auto-save
- [ ] **Dialog debe aparecer:** "⚠ CONFLICTO DETECTADO"
  - "Esta nota fue modificada desde otro lugar"
  - Botones: [✓] USAR SERVIDOR, [!] MANTENER MÍOS

**Paso 4: Resolver conflicto - Opción 1 (Usar servidor)**
- [ ] Click [✓] USAR SERVIDOR
- [ ] Dialog cierra
- [ ] Editor muestra contenido del servidor
- [ ] Cambios locales se descartan

**Paso 5: Resolver conflicto - Opción 2 (Mantener míos)**
- Repetir pasos 2-3
- [ ] Click [!] MANTENER MÍOS
- [ ] Dialog cierra
- [ ] Editor mantiene cambios locales
- [ ] Siguiente save intentará guardar

---

### 6️⃣ SESSION VALIDATION (Validación de Sesión)

**Paso 1: Warning de sesión expirada**
- [ ] Abrir navegador en http://localhost:3000
- [ ] Abrir DevTools → Application → Cookies
- [ ] Encontrar cookie `sessionId`
- [ ] Eliminar la cookie
- [ ] Esperar 5 segundos (verificación de sesión)
- [ ] **Banner rojo debe aparecer en top:**
  - "⚠ SESIÓN INVÁLIDA O EXPIRADA"
  - "Tu sesión ha cambiado. Por favor, recarga la página."
  - Botones: [X] DESCARTAR, [↻] RECARGAR

**Paso 2: Descartar warning**
- [ ] Click [X] DESCARTAR
- [ ] Banner desaparece
- [ ] El app continúa funcionando
- [ ] En background, sesión está inválida (requests fallarían)

**Paso 3: Recargar página**
- [ ] Banner debe estar visible
- [ ] Click [↻] RECARGAR
- [ ] Página se recarga
- [ ] Nueva sessionId se genera

**Paso 4: Visibilitychange (cambiar pestaña)**
- [ ] 2 pestañas del mismo navegador
- [ ] Ir a otra pestaña por 30 segundos
- [ ] Volver a primera pestaña
- [ ] **Opcional:** Si se detectó cambio, banner debe aparecer

---

### 7️⃣ ERROR HANDLING

**Caso A: Crear nota sin título**
- [ ] Intentar crear con fetch:
  ```bash
  curl -X POST http://localhost:3000/api/notes \
    -H "Content-Type: application/json" \
    -H "Cookie: sessionId=..." \
    -d '{"title": "", "content": "test"}'
  ```
- [ ] Respuesta esperada: 400 VALIDATION_FAILED
  - Estructura: `{success: false, error: "VALIDATION_FAILED", message: "...", details: [...]}`

**Caso B: Editar nota inexistente**
- [ ] Click en editor, cambiar URL: `/notes/999999999999999999999999`
- [ ] Intentar guardar
- [ ] Respuesta esperada: 404 NOTE_NOT_FOUND
  - Error message muestra: "La nota solicitada no existe"

**Caso C: ID inválido**
- [ ] Fetch con ID inválido (no hex):
  ```bash
  curl http://localhost:3000/api/notes/invalid-id/undo
  ```
- [ ] Respuesta esperada: 400 INVALID_ID_FORMAT

**Caso D: Restaurar nota que NO está en papelera**
- [ ] Crear nota (ID: A)
- [ ] Intentar restore sin mover a trash:
  ```bash
  curl -X PATCH http://localhost:3000/api/notes/A/restore
  ```
- [ ] Respuesta esperada: 404 NOTE_NOT_IN_TRASH

**Caso E: Undo sin historial**
- [ ] Nota nueva (0 ediciones)
- [ ] Click [↶] UNDO
- [ ] Botón debe estar deshabilitado (no clickeable)
- O si clickeable por bug: error 400 NO_HISTORY

---

## 🤖 TESTING AUTOMATIZADO

### Backend Tests

**Ejecutar tests unitarios:**
```bash
cd flashnotes-backend
npm run test
```

**Casos cubiertos:**
- `createNote()`: crear con datos válidos
- `updateNote()`: actualización parcial (solo title, solo content)
- `updateNote()`: conflict detection (lastKnownUpdate)
- `undoNote()`: undo exitoso, error sin historial
- `redoNote()`: redo exitoso, error sin acciones
- `moveToTrash()`, `restoreFromTrash()`, `deletePermanently()`
- Validación de entrada (DTO)

**Ejecutar tests de integración (API contract):**
```bash
npm run test:integration
```

**Casos cubiertos:**
- POST /api/notes → 201
- GET /api/notes → 200, array de notas
- PATCH /api/notes/:id → 200
- DELETE /api/notes/:id/permanent → 200 (NO 204)
- Todas las rutas retornan estructura: `{success, data|error, statusCode}`

### Frontend Tests (Manual por ahora)

**Compilación sin errores:**
```bash
cd flashnotes-frontend
npm run build  # debe compilar sin errors
```

**Type checking:**
```bash
npx tsc --noEmit  # debe completar sin errores
```

---

## 📊 PERFORMANCE

### Validación de rendimiento

**Auto-save debounce:**
- [ ] Escribir rápido en textarea (5 cambios en 2 segundos)
- [ ] Debe hacer solo 1 request (el último después de 1s inactividad)
- DevTools → Network: ver que hay 1 PATCH, no 5

**Session validation overhead:**
- [ ] Esperar 5 minutos
- [ ] DevTools → Network: debe haber 1 request GET /api/notes
- No debe hacer spam de requests

**Historial límite (MAX_HISTORY = 20):**
- [ ] Hacer 30 ediciones de nota
- [ ] Backend: `db.notes.findById(...).versions.length` debe ser ≤ 20
- [ ] No debe crecer indefinidamente

---

## 🎓 CONCLUSIÓN

Si todos los tests anteriores pasan ✅, el proyecto está listo para:
- ✅ Usar en desarrollo
- ✅ Desplegar a staging
- ✅ Desplegar a producción

**Si hay fallos:**
1. Revisar logs en console/backend
2. Consultar CAMBIOS_IMPLEMENTADOS.md
3. Revisar git diffs de los cambios

---

*Generado: 3 de febrero de 2026*
