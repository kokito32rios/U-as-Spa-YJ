# 📝 Instrucciones de Actualización - Módulo de Comisiones

## Archivos a Modificar:

### 1. `views/dashboard-admin.html`
**Ubicación:** Líneas 328-358 (sección de filtros)

**Acción:** Reemplazar la sección `<!-- Filtros Comisiones -->` completa con el contenido de:
- **Archivo temporal:** `temp_comisiones_filtros.html`

---

### 2. `public/js/dashboard-admin.js`

#### A) Agregar funciones nuevas (ANTES de `inicializarComisiones()`)
**Ubicación:** Alrededor de la línea 2290

**Acción:** Agregar estas 3 funciones:
1. `cambiarTipoFiltroComision()`
2. `poblarSemanasComision()`
3. `formatearFechaCorta()`

**Código:** Copiar desde `temp_comisiones_js.js` (líneas 1-85)

#### B) Reemplazar `inicializarComisiones()`
**Ubicación:** Línea 2291 aprox.

**Acción:** Reemplazar la función completa
**Código:** Copiar desde `temp_comisiones_js.js` (líneas 90-117)

#### C) Reemplazar `cargarComisiones()`
**Ubicación:** Línea 2336 aprox.

**Acción:** Reemplazar la función completa  
**Código:** Copiar desde `temp_comisiones_js.js` (líneas 122-182)

---

### 3. `controllers/comisiones.controller.js`
**Ya aplicado automáticamente** ✅

Los cambios en el backend ya fueron aplicados correctamente para soportar:
- Parámetro `tipo` (mes, semana, rango)
- Parámetros `desde` y `hasta` para filtros por fecha

---

## Verificación:

Después de aplicar los cambios:
1. Recarga la página
2. Ve a "Comisiones"
3. Deberías ver el selector "Filtrar por:" con 3 opciones:
   - **Mes** (por defecto)
   - **Semana** (muestra dropdown de semanas)
   - **Rango de Fechas** (muestra desde/hasta)
4. Los estilos deben verse profesionales con fondo blanco y sombra

---

## Nuevas Características:
✅ Filtrado por mes (como antes)  
✅ Filtrado por semana (se auto-genera lista de semanas del año)  
✅ Filtrado por rango personalizado de fechas  
✅ UI mejorada con estilos inline profesionales  
✅ Selector dinámico de años  
✅ Backend actualizado para soportar todos los tipos de filtros
