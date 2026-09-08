# Checklist de Salida a Producción - Control de Asistencia (AssistPro)

Este documento establece las condiciones obligatorias de aseguramiento de calidad antes de liberar cambios a producción.

---

## 1. Seguridad y Autenticación
- [x] **Sanitización contra inyección de fórmulas (CWE-1236):** Toda exportación de datos en Excel neutraliza caracteres `=`, `+`, `-`, `@`, `\t` o `\r` mediante `sanitizeExcelCell`.
- [x] **Servidor de Firma Autoritative:** Implementado endpoint `/api/auth/login` y `/api/auth/verify` en servidor Express (`server/server.ts`) para resguardar el secreto JWT fuera del bundle del navegador.
- [x] **Políticas de Contraseña OWASP/NIST:** Verificación de longitud mínima (8 caracteres), mayúsculas, minúsculas, números y símbolos especiales validada por suite de tests.

---

## 2. Resiliencia y Manejo de Almacenamiento
- [x] **Mitigación de QuotaExceededError:** `storage.ts` detecta saturación del límite de 5 MB de `localStorage` y previene cuelgues mediante `saveStoredAttendanceDetailed`.
- [x] **Soporte de Alta Capacidad con IndexedDB:** `indexedDbStorage.ts` implementa transacciones nativas para almacenar decenas de miles de marcaciones sin degradación de rendimiento.
- [x] **Migración Automática de Datos:** La función `loadAndMigrateAttendance` migra registros existentes de `localStorage` a `IndexedDB` en el inicio del sistema.

---

## 3. Calidad de Código y Pruebas Automatizadas
- [x] **Suite de Pruebas Unitarias Activa:** Ejecutar `npm test` con Vitest para validar reglas de negocio, cálculo de horas y deducción de almuerzo.
- [x] **Chequeo de Tipos Estricto:** Ejecutar `npm run lint` (`tsc --noEmit`) sin advertencias ni errores.
- [x] **Build de Producción Limpio:** Compilación exitosa con `npm run build`.

---

## 4. Comandos de Verificación en CI/CD

```bash
# 1. Validación de tipado TypeScript
npm run lint

# 2. Ejecución de pruebas unitarias
npm test

# 3. Compilación de artefactos de producción
npm run build
```
