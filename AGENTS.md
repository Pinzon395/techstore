# AGENTS.md

## Objetivo del proyecto

Este proyecto debe generar interfaces profesionales, limpias, rápidas, con buen SEO local, buena UX, buen responsive y diseño visual de alto nivel.

Codex debe evitar resultados genéricos, secciones vacías, texto sin intención, cards repetidas, layouts sin jerarquía y componentes que parezcan hechos rápido.

## Uso obligatorio de skills

Antes de rediseñar, crear o mejorar cualquier vista frontend, Codex debe usar estas skills en este orden:

1. Taste Skill
   - Usarla para definir dirección visual, layout, jerarquía, ritmo de espacios, densidad, tipografía, composición y estructura general.
   - Objetivo: evitar diseño genérico y hacer que la vista tenga intención.

2. Impeccable
   - Usarla para estructurar, auditar, pulir y endurecer la interfaz.
   - Usar especialmente:
     - /impeccable shape antes de construir
     - /impeccable critique para revisar jerarquía y UX
     - /impeccable audit para accesibilidad, responsive y calidad técnica
     - /impeccable polish antes de terminar
     - /impeccable harden para edge cases, overflow, mobile y errores visuales

3. Emil Kowalski Design Engineering
   - Usarla para detalles finos de UI, microinteracciones, animaciones, transiciones, estados hover/focus, timing, easing, percepción de calidad y sensación premium.
   - No agregar animaciones innecesarias.
   - Las animaciones deben ser sutiles, rápidas y útiles.

## Reglas para Pixon PC

Todas las vistas de servicios deben tener SEO local real para Cancún.

Debe respetarse:
- Un solo H1 por página.
- Title y meta description optimizados.
- H2 y H3 con intención de búsqueda.
- Keywords locales naturales, sin keyword stuffing.
- NAP consistente:
  - Pixon PC / Rentalap
  - Cto. Hacienda Chimay, 77539 Cancún, Q.R.
  - +52 998 669 0777
  - pixonpc@gmail.com
- Zonas locales integradas con sentido:
  - Cancún Centro
  - Zona Hotelera
  - Huayacán
  - Cumbres
  - Bonfil
  - Polígono Sur
  - Puerto Cancún
  - Av. Tulum
  - Bonampak
  - Puerto Juárez
  - Supermanzanas
  - Haciendas

## Reglas visuales

- No cambiar contenedores base.
- No romper componentes existentes.
- No eliminar formularios.
- No cambiar rutas.
- No eliminar botones de WhatsApp, Crear ticket o Solicitar revisión.
- Todos los textos fuera del hero deben usar azul oscuro:
  --azul-oscuro: #071F3A;
- El diseño debe ser mobile first.
- Las cards deben tener contenido útil.
- No dejar huecos visuales.
- No usar textos genéricos.
- No saturar el hero.
- No prometer resultados sin diagnóstico.

## Flujo obligatorio antes de entregar

Antes de finalizar cualquier vista, Codex debe revisar:

- ¿Hay un solo H1?
- ¿El SEO local tiene sentido?
- ¿Los textos explican el servicio real?
- ¿Las keywords están naturales?
- ¿El formulario sigue intacto?
- ¿Los botones siguen funcionando?
- ¿El diseño se ve profesional?
- ¿Está responsive?
- ¿No hay secciones repetidas?
- ¿Todos los textos fuera del hero están en azul oscuro?
- ¿Hay CTA arriba, medio y final?
- ¿La página convierte a WhatsApp o ticket?

## Prompt para rediseñar vistas con Codex

Usa las skills instaladas: Taste Skill, Impeccable y Emil Kowalski.

Primero analiza la vista actual.
Después propón estructura SEO local.
Luego implementa el rediseño sin romper mis contenedores, rutas, formulario, botones ni lógica existente.

Quiero una vista más profesional, directa y completa para SEO local en Cancún.

Reglas:
- No cambies contenedores base.
- No elimines secciones importantes.
- No rompas el formulario.
- Mantén WhatsApp, Crear ticket y Solicitar revisión.
- Un solo H1.
- H2 y H3 bien ordenados.
- SEO local natural.
- Nada de keyword stuffing.
- Todos los textos fuera del hero deben ser azul oscuro: #071F3A.
- Corrige acentos y textos flojos.
- El contenido debe tener sentido real para el servicio.
- Mobile first.
- Revisa responsive, accesibilidad, spacing, jerarquía y CTA.

Antes de terminar ejecuta una pasada tipo:
1. Taste Skill para dirección visual.
2. Impeccable critique/audit/polish.
3. Emil Kowalski para microinteracciones y pulido visual.

Entrega cambios listos en código.
