# Plan SEO — Landing Pages por Categoría

Investigación basada en patrones de búsqueda México/Cancún para servicios de reparación.
Las keywords están priorizadas por **volumen estimado × intención de compra**.

---

## 🟢 PRIORIDAD 1 — Crear primero (alto volumen, alta conversión)

### Celulares (mayor volumen del país)
| Slug propuesto | Target keyword | Volumen est. | Notas |
|---|---|---|---|
| `/cambio-pantalla-iphone-cancun` | cambio pantalla iphone cancun | 🔥 Alto | Pieza estrella; toda la línea iPhone 11→16 |
| `/cambio-bateria-iphone-cancun` | cambio bateria iphone cancun | Alto | Calendario de degradación 80% |
| `/reparacion-iphone-cancun` | reparacion iphone cancun | Alto | Hub de iPhone con submodelos |
| `/reparacion-samsung-cancun` | reparacion samsung cancun | Medio-Alto | Galaxy S, Note, A series |
| `/celular-mojado-cancun` | celular se cayó al agua / celular mojado | Medio-Alto | Urgencia: precio premium |

### Consolas (drift joystick es viral)
| Slug | Keyword | Volumen | Notas |
|---|---|---|---|
| `/reparacion-joystick-drift-cancun` | joystick drift PS5 / arreglar joystick | Alto | Problema universal; ya tienes blog post |
| `/reparacion-ps5-cancun` | reparacion ps5 cancun | Medio-Alto | Hub de PS5 con submodelos |
| `/reparacion-xbox-cancun` | reparacion xbox cancun | Medio | Series X/S y One |
| `/reparacion-nintendo-switch-cancun` | reparacion nintendo switch cancun | Medio | Joy-Con drift es masivo |

### Laptops (alto valor por ticket)
| Slug | Keyword | Volumen | Notas |
|---|---|---|---|
| `/laptop-no-enciende-cancun` | laptop no enciende / no prende | Medio-Alto | Diagnóstico + presupuesto |
| `/cambio-pantalla-laptop-cancun` | cambio pantalla laptop precio | Medio | Por marca: HP, Dell, Lenovo |
| `/cambio-bateria-laptop-cancun` | cambio bateria laptop | Medio | Genéricas y originales |

---

## 🟡 PRIORIDAD 2 — Segunda ola (volumen medio, buen ROI)

| Slug | Keyword |
|---|---|
| `/recuperacion-datos-cancun` | recuperacion de datos disco duro |
| `/reparacion-impresoras-cancun` | reparacion impresora epson/hp/canon cancun |
| `/reparacion-tablets-cancun` | reparacion tablet ipad cancun |
| `/tecnico-computadoras-domicilio-cancun` | tecnico a domicilio cancun (alto volumen local) |
| `/reparacion-macbook-cancun` | reparacion macbook cancun |
| `/diagnostico-gratis-cancun` | diagnostico gratis computadora |

---

## 🟠 PRIORIDAD 3 — Long-tail (bajo volumen, muy bajo competencia)

Páginas de 1 problema específico para captar long-tail:

- `/laptop-se-calienta-mucho-cancun` (ya tienes blog)
- `/computadora-lenta-cancun` (link a /optimizacion)
- `/control-ps5-no-funciona`
- `/teclado-laptop-no-funciona`
- `/laptop-pantalla-azul-cancun`
- `/reparacion-iphone-11/12/13/14/15` (uno por modelo, programmatic SEO)

---

## Estructura recomendada por landing page

Cada página debe tener:

1. **H1 con keyword exacta** + ubicación
2. **Hero con CTA WhatsApp directo** (no formulario primero)
3. **3-4 secciones**: ¿Qué reparamos?, Precios desde, Proceso, Garantía
4. **3-5 FAQs específicas del servicio** (`<FaqSection items={...} />`)
5. **CommentsSection** al final con reseñas reales
6. **Schema.org Service + LocalBusiness + FAQPage**
7. **Breadcrumb** completo
8. **Canonical** + hreflang

---

## Programmatic SEO (futuro)

Una vez validado que las landing pages individuales convierten, escalar a:

- **Por modelo de iPhone**: `/reparacion-iphone-{modelo}-cancun` (×15 modelos)
- **Por modelo de Samsung**: `/reparacion-samsung-{modelo}-cancun`
- **Por colonia de Cancún**: `/tecnico-{colonia}-cancun` (zona hotelera, SM, Huayacán)

Esto se hace con Astro [getStaticPaths] desde un JSON con datos.

---

## Métricas para medir éxito

Una vez publicadas, monitorear en Google Search Console (4-8 semanas):
- **Impresiones** → confirma que Google indexó y la query coincide
- **CTR** → si es <2% el title/description necesita ajuste
- **Posición promedio** → si está en top 10, hay potencial
- **Clics** → conversión real
