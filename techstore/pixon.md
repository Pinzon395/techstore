# SEO Page Analysis — pixon.com.mx

**URL:** https://pixon.com.mx/
**Fecha:** 2026-04-28
**Tipo de negocio:** Servicio local — Reparación de computadoras (Cancún, México)
**Score general:** 65/100

\---

## Scorecard

|Categoría|Score|Barra|
|-|-|-|
|On-Page SEO|85/100|█████████░|
|Contenido|65/100|██████▌░░░|
|Técnico|65/100|██████▌░░░|
|Schema|40/100|████░░░░░░|
|Performance|65/100|██████▌░░░|
|AI Readiness|55/100|█████▌░░░░|
|Imágenes|60/100|██████░░░░|

\---

## Problemas Críticos

### 1\. Schema LocalBusiness tiene JSON inválido

El bloque `LocalBusiness` tiene una coma doble (`,,`) en la línea 29 — Google lo ignora por completo. Esto significa que la dirección, teléfono, horarios y el `aggregateRating` de **4.9★ / 47 reseñas no generan rich results**.

**Fix:** eliminar la coma extra. Ver schema corregido al final de este documento.

\---

## Problemas High

### 2\. Title tag excede 60 caracteres

* **Actual (64 chars):** `Reparación de computadoras en Cancún | Pixon PC Servicio técnico`
* **Recomendado (47 chars):** `Reparación de computadoras en Cancún | Pixon PC`

Google trunca en SERPs. "Servicio técnico" al final queda cortado.

### 3\. Imágenes sin width/height — riesgo de CLS

Todas las imágenes de la página carecen de atributos `width` y `height`. El navegador no puede reservar espacio y el contenido "salta" al cargar.

```html
<!-- Mal -->
<img src="/assets/foto.jpeg" alt="...">

<!-- Bien -->
<img src="/assets/foto.jpeg" alt="..." width="800" height="533">
```

### 4\. Font Awesome cargado dos veces

* Una vez de forma async (correcto ✓)
* Una vez bloqueante normal (incorrecto ✗ — eliminar)

### 5\. Google Fonts bloquea el render

```html
<!-- Actual (bloqueante) -->
<link href="https://fonts.googleapis.com/css2?..." rel="stylesheet">

<!-- Fix (async) -->
<link rel="preload" href="https://fonts.googleapis.com/css2?..." as="style" onload="this.rel='stylesheet'">
<noscript><link href="https://fonts.googleapis.com/css2?..." rel="stylesheet"></noscript>
```

\---

## Problemas Medium

### 6\. OG image es solo el logo circular

`og:image = https://pixon.com.mx/LOGOCIRCULAR.png`

Crear una imagen 1200×630px con logo, tagline y foto de una laptop reparada. Mejora CTR en compartidos de WhatsApp y redes sociales.

### 7\. OG title, Twitter title y page title son versiones distintas

Alinear los tres después de corregir el title tag.

|Tag|Texto actual|
|-|-|
|`<title>`|Reparación de computadoras en Cancún \| Pixon PC Servicio técnico|
|`og:title`|Pixon PC \| Técnico en Reparaciones en Cancún|
|`twitter:title`|Pixon PC \| Reparaciones en Cancún|

### 8\. Anchor texts genéricos "Mas información"

Tres enlaces internos usan el mismo texto. Reemplazar:

|Enlace actual|Enlace recomendado|
|-|-|
|"Mas información" → /reparaciones|"Ver servicios de reparación de laptops"|
|"Mas información" → /mantenimiento-mac|"Ver mantenimiento de Mac en Cancún"|
|"Mas información" → /formateo-optimizacion-...|"Conocer el servicio de formateo y optimización"|

### 9\. Jerarquía de encabezados con problemas semánticos

* `<h4>` usados para precios (`$450 MXN`) bajo `<h3>` — usar `<p class="price">` en su lugar
* `<h4>` usados en el footer para etiquetas de navegación — usar `<p>` o `<strong>`
* H3 con texto fusionado: `"Reparación de computadoras en Cancún Reparaciones"` → limpiar

### 10\. Sin hreflang a pesar de "English Spoken"

El sitio mercadea explícitamente a angloparlantes pero no tiene tags hreflang ni versión en inglés.

* **Mínimo:** añadir `hreflang="es-MX"` y `hreflang="x-default"` apuntando a la misma URL
* **Impacto alto:** crear una página `/en/` orientada a expats y turistas — segmento muy poco competido

### 11\. Alt texts truncados en 2 imágenes

```
alt="Aplicación de metal líquido en CPU de la"   ← incompleto
alt="Técnico Pixon PC trabajando en equipo en"   ← incompleto
```

Completar a frases descriptivas con keyword local.

\---

## Problemas Low

### 12\. Sin señales E-E-A-T en homepage

No se muestran nombres del equipo, certificaciones ni credenciales. Para un negocio donde el cliente entrega equipo costoso, la confianza impacta directamente la conversión.

### 13\. FAQPage schema en sitio comercial

Google restringió los rich results de FAQ a sitios gubernamentales y de salud (agosto 2023). No generará rich results en SERPs. **Mantener el schema** — ayuda a citas de AI (ChatGPT, Perplexity, AI Overviews), pero no invertir más tiempo en expandirlo para Google.

### 14\. Sin enlaces externos a fuentes autoritativas

Zero outbound links a contenido relevante (páginas de soporte de marcas, guías técnicas). Un enlace externo relevante mejora la señal de autoridad temática.

\---

## Lo que funciona bien

* Canonical self-referencing ✓
* Meta robots: `index, follow` ✓
* HTML `lang="es"` ✓
* Viewport configurado correctamente ✓
* Organization schema: JSON válido ✓
* FAQPage schema: JSON válido ✓
* Twitter Card `summary\_large\_image` con todos los campos ✓
* `og:locale = es\_MX` ✓
* Lazy loading en todas las imágenes ✓
* Preconnect hints (Google Fonts, Cloudflare) ✓
* DNS prefetch (GTM, WhatsApp, YouTube) ✓
* Contenido renderizado en HTML estático — Googlebot puede crawlear sin JS ✓
* LocalBusiness schema incluye dirección, teléfono, horarios, geo, ofertas y redes sociales ✓
* AggregateRating 4.9/5 con 47 reseñas en schema (se mostrará en SERPs al corregir el JSON) ✓

\---

## Schema LocalBusiness Corregido

```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Pixon PC",
  "description": "Reparación de computadoras, laptops, celulares e impresoras en Cancún. Mantenimiento preventivo, ensamble de PCs gamer y soporte B2B empresarial. Garantía por escrito. English Spoken.",
  "url": "https://pixon.com.mx",
  "telephone": "+529986690777",
  "image": "https://pixon.com.mx/LOGOCIRCULAR.png",
  "logo": "https://pixon.com.mx/LOGOCIRCULAR.png",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Haciendas",
    "addressLocality": "Cancún",
    "addressRegion": "Quintana Roo",
    "postalCode": "77539",
    "addressCountry": "MX"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 21.1375,
    "longitude": -86.8462
  },
  "openingHoursSpecification": \[{
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": \["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
    "opens": "09:00",
    "closes": "19:00"
  }],
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "reviewCount": "47",
    "bestRating": "5",
    "worstRating": "1"
  },
  "sameAs": \[
    "https://www.facebook.com/people/Pixon-PC/61556271364935/",
    "https://www.instagram.com/pixonpc/",
    "https://www.tiktok.com/@pixonpc",
    "https://www.youtube.com/@pixonpc"
  ]
}
```

\---

## Plan de acción priorizado

|Prioridad|Problema|Impacto esperado|
|-|-|-|
|**Crítico**|Corregir JSON del schema LocalBusiness|Desbloquea estrellas 4.9★ en SERPs|
|**High**|Acortar title tag a ≤60 chars|Elimina truncado en Google|
|**High**|Añadir width/height a todas las imágenes|Elimina CLS, mejora Core Web Vitals|
|**High**|Eliminar Font Awesome duplicado bloqueante|FCP más rápido|
|**High**|Cargar Google Fonts de forma async|Mejor First Contentful Paint|
|**Medium**|Crear imagen OG 1200×630px|Mejor CTR en WhatsApp y redes|
|**Medium**|Unificar title/og:title/twitter:title|Consistencia de marca|
|**Medium**|Reemplazar anchor texts "Mas información"|Mejor equity de links internos|
|**Medium**|Corregir jerarquía H3/H4|Estructura semántica limpia|
|**Medium**|Completar alt texts truncados|Accesibilidad + búsqueda de imágenes|
|**Low**|Añadir hreflang (o página /en/)|Captura segmento angloparlante|
|**Low**|Añadir señales E-E-A-T (equipo, certificaciones)|Confianza → conversión|



