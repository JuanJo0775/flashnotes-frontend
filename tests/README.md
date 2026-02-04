# 🧪 Testing en Frontend - Flashnotes

Esta carpeta contiene todos los tests unitarios e integración para el frontend de Flashnotes.

## 📁 Estructura

```
tests/
├── jest.d.ts                    # Declaraciones de tipos para Jest
├── setup.ts                     # Setup global (deprecated, usar jest.setup.ts)
├── lib/
│   └── utils/
│       ├── validators.test.ts   # Tests para validadores centralizados
│       └── formatters.test.ts   # Tests para formateadores de texto
```

## 🚀 Instalación de Dependencias

Antes de ejecutar tests, asegúrate de instalar las dependencias necesarias:

```bash
npm install --save-dev jest ts-jest @types/jest typescript
```

Si obtienes errores sobre `@testing-library/jest-dom`, instala también:

```bash
npm install --save-dev @testing-library/jest-dom @testing-library/react
```

## 🧪 Ejecutar Tests

### Ejecutar todos los tests una vez
```bash
npm test
```

### Ejecutar tests en modo watch (rerun en cambios)
```bash
npm test -- --watch
```

### Ejecutar tests con coverage
```bash
npm test -- --coverage
```

### Ejecutar un test específico
```bash
npm test -- validators.test.ts
npm test -- formatters.test.ts
```

## 📊 Cobertura de Tests

### validators.test.ts (~13 suites)
- ✅ `isValidObjectId()` - Validación de MongoDB ObjectIds
- ✅ `validateTitle()` - Validación de títulos de notas
- ✅ `validateContent()` - Validación de contenido de notas
- ✅ `sanitizeInput()` - Sanitización de datos de entrada

**Total de tests:** 40+

### formatters.test.ts (~7 suites)
- ✅ `formatDate()` - Formato YYYY.MM.DD
- ✅ `formatTime()` - Formato HH:MM:SS
- ✅ `formatDateTime()` - Combinación fecha + hora
- ✅ `formatFileSize()` - Conversión bytes → KB/MB/GB
- ✅ `formatRelativeTime()` - Tiempo relativo (ahora, 5m, 3h, etc)
- ✅ `truncateText()` - Truncación con ellipsis
- ✅ `shortId()` - Cortador de IDs

**Total de tests:** 35+

**Coverage total:** ~70+ assertions

## ⚙️ Configuración

### jest.config.js
- **Preset:** `ts-jest` (compilación TypeScript automática)
- **Environment:** `jsdom` (simula navegador)
- **Module mapper:** `@/` → `src/` (alias de paths)
- **Setup:** `jest.setup.ts` (configuración global)

### jest.setup.ts
Establece:
- Mock de `navigator.onLine`
- Mock de `addEventListener/removeEventListener`
- Suprime logs de console (debug/warn)

## 🔍 Ejemplos de Tests

### Validator test
```typescript
test('debe aceptar ObjectId válido (24 caracteres hex)', () => {
    expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true);
});

test('debe rechazar ObjectId inválido', () => {
    expect(isValidObjectId('invalid')).toBe(false);
});
```

### Formatter test
```typescript
test('debe formatear kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1.0kb');
    expect(formatFileSize(2048)).toBe('2.0kb');
});

test('no debe truncar si está dentro del límite', () => {
    expect(truncateText('Hola', 10)).toBe('Hola');
});
```

## 🐛 Solución de Problemas

### "No se encuentra el nombre 'describe'"
**Causa:** TypeScript no tiene tipos de Jest  
**Solución:** Agrega a `tsconfig.json`:
```json
{
  "compilerOptions": {
    "types": ["jest", "@types/node"]
  }
}
```

### "Cannot find module '@/'"
**Causa:** Alias de paths no configurado en jest  
**Solución:** Ya configurado en `jest.config.js` con `moduleNameMapper`

### Tests no ejecutan
**Causa:** Dependencias faltantes  
**Solución:**
```bash
npm install --save-dev jest ts-jest @types/jest
```

## 📈 Mejoras Futuras

1. **Tests de integración:** Agregar tests para hooks (useNotes, useUndoRedo, etc)
2. **Tests de componentes:** React Testing Library para componentes UI
3. **E2E tests:** Cypress/Playwright para flujos completos
4. **CI/CD:** GitHub Actions para ejecutar tests automáticamente
5. **Coverage reports:** Generación de reportes HTML de cobertura

## 📚 Referencias

- [Jest Documentation](https://jestjs.io/)
- [ts-jest](https://kulshekhar.github.io/ts-jest/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest Matchers](https://jestjs.io/docs/using-matchers)

---

**Última actualización:** 4 de febrero de 2026
