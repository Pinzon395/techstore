# Plan: Rediseño Premium - Cambio de Batería de Laptop

## TL;DR

> **Objetivo**: Rediseñar completamente la vista `/servicios/laptop/cambio-bateria` con un diseño premium, moderno y de alto conversión.

> **Entregables**:
> - Nuevo componente `CambioBateriaView.astro` con 14 secciones premium
> - FAQ con contraste corregido (texto visible en fondo oscuro)
> - Comentarios con contraste mejorado (texto azul/legible)
> - Routing actualizado en `[servicio].astro`

> **Esfuerzo**: Grande  
> **Paralelo**: NO - secuencial  
> **Crítico**: Crear componente → Actualizar routing → Build → Verificar

---

## Contexto

### Request del Usuario
El usuario quiere un rediseño completo de la página de cambio de batería que:
- Sea mucho más premium y profesional
- Corrija problemas de contraste en FAQ y Comentarios
- Ofrezca una experiencia visual moderna y no repetitiva
- Mejore SEO local para Cancún
- Venda mejor el servicio

### Problemas Actuales Identificados
1. **FAQ**: Texto blanco sobre fondo blanco (contraste roto)
2. **Comentarios**: Texto gris que parece deshabilitado
3. **Diseño repetitivo**: Mismo patrón de cards en todas partes

### ADN Visual Existente
- Colores: `--primary: #3b82f6`, `--secondary: #6366f1`, `--accent: #8b5cf6`
- Fondos oscuros: `--bg-darker: #0a0f1a`, `--bg-dark: #0f172a`, `--bg-card: #1e293b`
- Tipografía: Kanit (headings), Red Hat Display (body)
- Background global: patrón de grid sutil

---

## Work Objectives

### Objetivo Core
Crear una experiencia premium para el servicio de cambio de batería que:
- Comunique confianza y profesionalismo
- Corrija los problemas de contraste identificados
- Ofrezca diseño moderno sin ser repetitivo
- Conecte naturalmente con servicios relacionados

### Entregables Concrete
1. `src/components/views/CambioBateriaView.astro` - Componente completo
2. Routing actualizado en `src/pages/servicios/[categoria]/[servicio].astro`
3. Build exitoso sin errores

### Definition of Done
- [ ] Componente creado con 14 secciones
- [ ] FAQ visible (contraste oscuro)
- [ ] Comentarios legibles (contraste mejorado)
- [ ] Routing funciona
- [ ] Build pasa
- [ ] Vista en navegador correcta

### Must Have
- Todas las 14 secciones especificadas
- Diseño premium y no repetitivo
- Responsive completo
- SEO local para Cancún

### Must NOT Have
- Texto blanco sobre fondo blanco
- Texto gris en comentarios
- Cards repetitivas sin variación

---

## Verification Strategy

### Test Decision
- **Infraestructura existe**: NO
- **Automated tests**: NO
- **QA**: Agent-Executed manual verification

### QA Policy
Cada tarea incluye verificación manual:
- Build del proyecto
- Navegar a `/servicios/laptop/cambio-bateria`
- Verificar contraste de FAQ
- Verificar contraste de comentarios
- Verificar responsive

---

## Execution Strategy

### Tareas Secuenciales

**Tarea 1**: Crear componente `CambioBateriaView.astro`

Crear el archivo en `src/components/views/CambioBateriaView.astro` con:
- 14 secciones completas según especificación
- CSS premium con variables existentes
- Dark theme consistente
- Animaciones sutiles (pulse en CTAs)

**Tarea 2**: Actualizar routing

En `src/pages/servicios/[categoria]/[servicio].astro`:
- Importar `CambioBateriaView`
- Agregar condición para usar el nuevo componente cuando `service.slug === 'cambio-bateria'`

**Tarea 3**: Build y verificación

- Ejecutar `npm run build`
- Verificar no haya errores
- Probar en navegador

---

## TODOs

- [ ] 1. **Crear componente CambioBateriaView.astro**

  **Qué hacer**:
  - Crear archivo: `src/components/views/CambioBateriaView.astro`
  - Incluir las 14 secciones especificadas
  - Usar variables CSS existentes del proyecto
  - Implementar diseño premium con variaciones

  **Must NOT hacer**:
  - No usar fondo blanco en FAQ
  - No usar texto gris en comentarios

  **Acceptance Criteria**:
  - [ ] Archivo creado en ubicación correcta
  - [ ] 14 secciones presentes
  - [ ] CSS usa variables existentes

  **QA Scenarios**:
  ```
  Scenario: Verificar archivo creado
    Tool: Bash (dir)
    Preconditions: Ninguno
    Steps:
      1. Ejecutar: dir "src\components\views"
    Expected Result: CambioBateriaView.astro existe
    Evidence: Output del comando
  ```

- [ ] 2. **Actualizar routing en [servicio].astro**

  **Qué hacer**:
  - Agregar import del nuevo componente
  - Agregar condición para usar CambioBateriaView cuando slug === 'cambio-bateria'

  **Must NOT hacer**:
  - No romper existentes rutas (ventilacion, etc.)

  **Acceptance Criteria**:
  - [ ] Import agregado
  - [ ] Condición creada
  - [ ] existing routes still work

- [ ] 3. **Build y verificación**

  **Qué hacer**:
  - Ejecutar npm run build
  - Verificar output
  - Probar en navegador

  **Acceptance Criteria**:
  - [ ] Build exitoso
  - [ ] Página carga correctamente
  - [ ] FAQ visible (contraste)
  - [ ] Comentarios legibles

---

## Estructura del Componente (Referencia)

El componente debe incluir (en orden):

1. **Hero Premium** - Título, subtítulo, CTAs, badges flotantes, animación de batería
2. **Síntomas** - Grid de 7 síntomas con diseño alternado
3. **Beneficios** - Showcase de 6 beneficios
4. **Metodología** - Timeline de 7 pasos (01-07)
5. **Educación/Cuidado** - Grid de 6 tips
6. **Sobrecalentamiento** - Sección térmica con diagrama
7. **Galería** - Mosaico moderno
8. **Por qué elegirnos** - Grid de 6 razones
9. **Diagnóstico frecuente** - Lista problemas/soluciones
10. **Marcas** - Chips flexibles de marcas
11. **Servicios relacionados** - 4 cards a otras páginas
12. **FAQ** - Fondo OSCURO con texto legible
13. **Comentarios** - Fondo oscuro, texto AZUL/OSCURO legible
14. **CTA Final** - Cierre fuerte

---

## CSS Requerido (Variables)

```css
:root {
  --primary: #3b82f6;
  --primary-dark: #2563eb;
  --secondary: #6366f1;
  --accent: #8b5cf6;
  --text-light: #f8fafc;
  --text-muted: #94a3b8;
  --bg-darker: #0a0f1a;
  --bg-dark: #0f172a;
  --bg-card: #1e293b;
  --border-subtle: rgba(255,255,255,0.1);
}
```

---

## Success Criteria

### Verification Commands
```bash
npm run build  # Debe pasar sin errores
```

### Final Checklist
- [ ] CambioBateriaView.astro creado
- [ ] Routing actualizado
- [ ] FAQ con texto legible (fondo oscuro)
- [ ] Comentarios con texto legible (azul/osuro)
- [ ] Build exitoso
- [ ] Diseño premium y moderno
- [ ] Responsive funcional