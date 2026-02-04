# 🚀 Guía de Deployment - Mejoras de Robustez

**Última actualización:** 4 de febrero de 2026

---

## 📋 Checklist Pre-Deployment

### 1️⃣ Validar Cambios

```bash
# En carpeta flashnotes-frontend/
npm run build           # Compilar TypeScript
npm run lint            # Verificar linting
npm test                # Ejecutar tests
npm test -- --coverage  # Ver cobertura

# En carpeta flashnotes-backend/
npm test                # Ejecutar tests del backend
npm run build           # Si aplica
```

### 2️⃣ Verificar Compatibilidad

- ✅ Backend: Cambios en `routes/notes.routes.js` (POST → PATCH)
- ✅ Frontend: Cambios en `notes.api.ts` (POST → PATCH)
- ✅ Ambos lados deben desplegarse juntos

### 3️⃣ Pruebas Manuales

```bash
# Antes de mergear a main/production:

# 1. Crear nota
- Crear una nota con título normal
- Intentar crear con título vacío (debe fallar)
- Intentar crear con >100 caracteres (debe fallar)

# 2. Undo/Redo
- Editar una nota
- Click en Undo (PATCH /notes/:id/undo)
- Click en Redo (PATCH /notes/:id/redo)

# 3. Eliminar
- Click en Eliminar
- Verificar que se movió a Papelera

# 4. Conexión (simular desconexión)
- DevTools > Network > Offline
- Esperar 30 segundos
- Ver que `isOnline` está false en console
- Reconectar (DevTools > Online)
- Ver que se verifica sesión automáticamente

# 5. Reintentos (simular throttle)
- DevTools > Network > Slow 3G
- Actualizar nota
- Ver en console los logs de [Retry 1/3], [Retry 2/3]
```

---

## 🔄 Orden de Deployment

### Opción A: Sin downtime (recomendado)

```bash
# 1. Mergear cambios a develop
git checkout develop
git pull origin develop
git merge feature/robustez-validaciones

# 2. Ejecutar tests
npm test
npm run build

# 3. Deployar backend PRIMERO
cd flashnotes-backend
npm test
npm run build  # Si aplica
# Subir a servidor/cloud

# 4. Esperar 5 minutos (verificar logs del backend)
# - Verificar que backend está up
# - Verificar que endpoints funcionan

# 5. Deployar frontend
cd ../flashnotes-frontend
npm run build
# Subir a servidor/cloud

# 6. Verificar en producción
# - Probar crear/editar/eliminar notas
# - Probar undo/redo
# - Simular desconexión
```

### Opción B: Con mantenimiento (más seguro)

```bash
# 1. Poner en mantenimiento
# - Mostrar mensaje "Mantenimiento" en frontend

# 2. Esperar a que sesiones se cierren (~5 min)

# 3. Deployar backend
cd flashnotes-backend
# Subir nueva versión

# 4. Deployar frontend
cd ../flashnotes-frontend
# Subir nueva versión

# 5. Salir de mantenimiento
# - Retirar mensaje de mantenimiento
```

---

## 🔍 Validación Post-Deployment

### Verificaciones Automáticas

```bash
# Tests post-deployment
curl -X GET https://api.flashnotes.com/health
# Debe retornar 200 OK

# Verificar endpoints
curl -X GET https://api.flashnotes.com/api/notes
# Debe retornar lista de notas

# Verificar PATCH para undo/redo
curl -X PATCH https://api.flashnotes.com/api/notes/{id}/undo
# Debe usar PATCH, no POST
```

### Verificaciones Manuales

1. ✅ Acceder a https://flashnotes.com
2. ✅ Crear una nota
3. ✅ Editar la nota
4. ✅ Click en Undo (debe deshacer)
5. ✅ Click en Redo (debe rehacer)
6. ✅ Mover a papelera
7. ✅ Restaurar desde papelera
8. ✅ Eliminar permanentemente
9. ✅ DevTools > Console: sin errores

### Verificación de Conectividad

```javascript
// En console del navegador

// Debe retornar true o false
navigator.onLine

// Simular offline
// DevTools > Network > Offline
// Intentar crear nota
// Debe mostrar error de conexión

// Reconectar
// DevTools > Online
// Debe reconectar automáticamente
```

---

## 📊 Monitoreo Post-Deployment

### Logs a Revisar

```
✅ [Retry 1/3] PATCH /api/notes/... (status 503)
   → Indica retry logic funcionando

✅ [Connectivity] Usuario está sin línea
   → Indica heartbeat funcionando

⚠️  Error: ID inválido para esta operación
   → Indica validación funcionando

❌ API Error: ... 
   → Investigar si es problema de backend
```

### Métricas a Monitorear

1. **Tasa de error en `POST /api/notes`**
   - Baseline: X%
   - Después: Debería ↓ (mejor validación)

2. **Tasa de éxito en `PATCH /notes/:id/undo`**
   - Debe pasar a 100% de POST a PATCH

3. **Tiempo promedio de response**
   - Con reintentos: puede ser ↑ en caso de 503
   - Sin problemas de red: mismo que antes

4. **Tasa de desconexiones detectadas**
   - Nueva métrica para monitorear

---

## 🔄 Rollback Plan

Si hay problemas post-deployment:

### Rollback Backend

```bash
# 1. Revertir cambios
git revert <commit-hash>
npm run build

# 2. Deployar versión anterior
# - Esto revierte POST para undo/redo

# 3. Comunicar al equipo
```

### Rollback Frontend

```bash
# 1. Revertir cambios
git revert <commit-hash>
npm run build

# 2. Deployar versión anterior
# - Esto revierte PATCH a POST para undo/redo

# 3. Comunicar al equipo
```

### Comunicación

```
⚠️ URGENT: Rollback de cambios de robustez
- Backend: Revertida a versión anterior
- Frontend: Revertida a versión anterior
- Motivo: [describir problema]
- Status: Investigando
- ETA de fix: [tiempo estimado]
```

---

## 📝 Documentación de Cambios

### Changelog Entry

```markdown
## [Version] - 2026-02-04

### Added
- Validadores centralizados en `lib/utils/validators.ts`
- Retry logic con exponential backoff para status 429/503
- Heartbeat de conectividad cada 30 segundos
- Tests unitarios para validadores y formateadores
- Documentación de validadores y guía de uso

### Changed
- `POST /api/notes/:id/undo` → `PATCH /api/notes/:id/undo` (RESTful)
- `POST /api/notes/:id/redo` → `PATCH /api/notes/:id/redo` (RESTful)
- Hooks actualizados para usar validadores centralizados

### Benefits
- Mayor robustez ante errores de red
- Validaciones consistentes en todo el frontend
- Detección rápida de desconexiones (<30s)
- 70+ tests unitarios

### Migration
- No breaking changes para usuarios
- Backend y frontend deben desplegarse juntos
- Cambio de método HTTP (POST → PATCH)
```

### Release Notes para Usuarios

```
✨ Mejoras de Confiabilidad y Robustez

Esta versión incluye mejoras significativas en la resiliencia del sistema:

✅ Reintentos automáticos
   - Si hay problemas temporales de red, la app reintentará automáticamente
   - Espera exponencial para no sobrecargar el servidor

✅ Detección de desconexiones
   - Si pierdes conexión, la app lo detectará en ~30 segundos
   - Se mostrará indicador de "Sin conexión"
   - Se reconectará automáticamente cuando vuelva la conexión

✅ Mejor validación
   - Validaciones más consistentes y confiables
   - Mejor feedback de errores
   - Rechazo de inputs peligrosos

✅ Más tests
   - 70+ tests unitarios incluidos
   - Mayor confianza en cambios futuros

No requiere acción del usuario. ¡Disfrutá de una experiencia más confiable!
```

---

## 🎯 Verificación Final

Antes de marcar como "completado":

- [ ] Backend compilado y deployado
- [ ] Frontend compilado y deployado
- [ ] Tests pasaron (npm test)
- [ ] Build pasó (npm run build)
- [ ] Verificaciones manuales ✅
- [ ] Logs revisados ✅
- [ ] No hay errores en console ✅
- [ ] Undo/Redo funcionan (PATCH) ✅
- [ ] Heartbeat está activo ✅
- [ ] Equipo notificado ✅

---

## 📞 Soporte Post-Deployment

### Contacto para Issues
- **Developers:** Revisar logs en servidor
- **QA:** Ejecutar test suite manual
- **DevOps:** Verificar métricas de server
- **Support:** Comunicar status a usuarios

### Escalation
1. Issue reportado
2. Revisar logs del servidor
3. Si es bug, crear issue en GitHub
4. Si es degradación severa, considerar rollback
5. Comunicar status a stakeholders

---

## 📅 Timeline Sugerido

```
Día 1 (Martes)
├─ 09:00 - Code review
├─ 10:00 - Tests locales
├─ 11:00 - Deploy a staging
├─ 12:00 - QA en staging
├─ 14:00 - Deploy a producción
└─ 15:00 - Monitoring

Día 2 (Miércoles)
├─ Monitoreo de logs
├─ Métricas de uso
└─ Feedback del equipo

Semana
├─ Observación general
├─ Fix de bugs si aplica
└─ Documentación final
```

---

## ✅ Conclusión

El sistema está listo para deployment con:
- ✅ Todas las mejoras implementadas
- ✅ Tests incluidos y documentados
- ✅ Documentación completa
- ✅ Rollback plan preparado
- ✅ Equipo informado

**Status:** 🟢 Ready for Production

---

*Para dudas o problemas, consultar documentación en:*
- *[IMPLEMENTACION_COMPLETADA.md](./IMPLEMENTACION_COMPLETADA.md)*
- *[GUIA_VALIDADORES.md](./flashnotes-frontend/GUIA_VALIDADORES.md)*
- *[tests/README.md](./flashnotes-frontend/tests/README.md)*
