# Plan: Fix iconos + Sticker diagnóstico gratis

## Archivo 1: `styles/style.css`

### Cambio 1 — Iconos 30% más grandes (línea 740)
```
--icon-size: 26px;  →  --icon-size: 34px;
```

### Cambio 2 — SVG hereda color blanco (línea 768)
```css
.feature-item i {  →  .feature-item i, .feature-item .fa-icon {
```
Agregar `fill: #fff;` dentro del bloque para que los SVGs del sprite también pinten blanco.

### Cambio 3 — Mobile icon size (línea 1960)
```
--icon-size: 22px;  →  --icon-size: 29px;
```

### Cambio 4 — Mobile selector SVG (línea 1981)
```css
.feature-item i {  →  .feature-item i, .feature-item .fa-icon {
```

### Cambio 5 — Sticker flotante (al final del archivo)
```css
/* ═══ COUPON STICKER — Diagnóstico gratis flotante ═══ */
.coupon-sticker {
  position: fixed;
  bottom: 110px;
  right: 20px;
  z-index: 9001;
  background: linear-gradient(145deg, rgba(15,23,42,0.94), rgba(30,41,59,0.94));
  border: 1px solid rgba(245,158,11,0.4);
  border-radius: 16px;
  padding: 16px 20px 14px;
  min-width: 210px;
  max-width: 240px;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 8px 32px rgba(0,0,0,0.45);
  opacity: 0;
  transform: translateY(24px) scale(0.95);
  transition: opacity 0.5s cubic-bezier(0.22,0.68,0,1.2), transform 0.5s cubic-bezier(0.22,0.68,0,1.2);
  pointer-events: none;
}
.coupon-sticker.visible {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: all;
}
.coupon-close {
  position: absolute;
  top: 5px;
  right: 7px;
  background: none;
  border: none;
  color: rgba(255,255,255,0.25);
  font-size: 1rem;
  cursor: pointer;
  padding: 2px 6px;
  line-height: 1;
  transition: color 0.2s;
}
.coupon-close:hover {
  color: rgba(255,255,255,0.6);
}
.coupon-content {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.coupon-tag {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: #fbbf24;
  text-transform: uppercase;
}
.coupon-price {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.coupon-old-price {
  font-size: 0.85rem;
  color: rgba(255,255,255,0.35);
  text-decoration: line-through;
}
.coupon-free {
  font-size: 1.5rem;
  font-weight: 900;
  font-family: var(--font-heading);
  background: linear-gradient(135deg, #f59e0b, #fbbf24, #f59e0b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.1;
  letter-spacing: 1px;
}
.coupon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 9px 14px;
  border: none;
  border-radius: 50px;
  font-size: 0.8rem;
  font-weight: 800;
  font-family: var(--font-main);
  cursor: pointer;
  background: linear-gradient(135deg, #b45309, #f59e0b 25%, #fbbf24 50%, #f59e0b 75%, #b45309);
  background-size: 200% 100%;
  color: #1a1200;
  text-shadow: 0 1px 2px rgba(255,255,255,0.25);
  box-shadow: 0 2px 12px rgba(245,158,11,0.35), 0 0 0 1px rgba(245,158,11,0.25) inset;
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
  overflow: hidden;
}
.coupon-btn:hover {
  transform: translateY(-1px) scale(1.03);
  box-shadow: 0 4px 20px rgba(245,158,11,0.55), 0 0 0 1px rgba(245,158,11,0.4) inset;
}
.coupon-btn::after {
  content: '';
  position: absolute;
  top: -50%;
  left: -60%;
  width: 35%;
  height: 200%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
  transform: rotate(25deg);
  animation: coupon-shimmer 3s ease-in-out infinite;
}
@keyframes coupon-shimmer {
  0% { left: -60%; }
  70% { left: 120%; }
  100% { left: 120%; }
}
@media (max-width: 480px) {
  .coupon-sticker { display: none; }
}
```

---

## Archivo 2: `index.html`

Agregar el HTML del sticker justo antes del cierre `</body>` (línea 1995):

```html
<!-- ═══ STICKER DIAGNÓSTICO GRATIS ═══ -->
<div class="coupon-sticker" id="coupon-sticker">
  <button class="coupon-close" id="coupon-close" aria-label="Cerrar">×</button>
  <div class="coupon-content">
    <span class="coupon-tag">🔥 DIAGNÓSTICO GRATIS</span>
    <div class="coupon-price">
      <span class="coupon-old-price">$299</span>
      <span class="coupon-free">$0</span>
    </div>
    <button class="coupon-btn" id="coupon-claim">
      Reclamar cupón
    </button>
  </div>
</div>
```

---

## Archivo 3: `scripts/script.js`

Agregar al final del archivo (después de la línea 698):

```js
/* ══════════════════════════════════════════════════════════════
   11. COUPON STICKER — Diagnóstico gratis flotante (estilo Temu)
   Aparece tras 3s, guarda localStorage 7 días al cerrar.
══════════════════════════════════════════════════════════════ */
(function initCouponSticker() {
  var sticker = document.getElementById('coupon-sticker');
  if (!sticker) return;
  if (document.body.classList.contains('low-end-mode')) return;

  // Verificar localStorage — si ya lo cerraron hace menos de 7 días, no mostrar
  try {
    var dismissed = localStorage.getItem('pixon-coupon-dismissed');
    if (dismissed) {
      var daysAgo = (Date.now() - parseInt(dismissed, 10)) / 86400000;
      if (daysAgo < 7) return;
      localStorage.removeItem('pixon-coupon-dismissed');
    }
  } catch(e) {}

  // Mostrar después de 3s
  var showTimer = setTimeout(function() {
    sticker.classList.add('visible');
  }, 3000);

  // X — cerrar y guardar en localStorage
  document.getElementById('coupon-close').addEventListener('click', function(e) {
    e.stopPropagation();
    sticker.classList.remove('visible');
    try { localStorage.setItem('pixon-coupon-dismissed', Date.now().toString()); } catch(e) {}
    clearTimeout(showTimer);
  });

  // Botón reclamar → WhatsApp
  document.getElementById('coupon-claim').addEventListener('click', function() {
    smartWaRedirect('https://wa.me/529986690777?text=Quiero%20reclamar%20mi%20cup%C3%B3n%20de%20diagn%C3%B3stico%20GRATIS');
    sticker.classList.remove('visible');
    try { localStorage.setItem('pixon-coupon-dismissed', Date.now().toString()); } catch(e) {}
  });
})();
```

---

## Resumen de cambios

| Archivo | Cambios |
|---------|---------|
| `styles/style.css` | 5 ediciones: tamaño iconos + selector SVG + sticker CSS |
| `index.html` | 1 adición: HTML del sticker antes de `</body>` |
| `scripts/script.js` | 1 adición: lógica del sticker al final |

## Notas de diseño

- **Metallic gold**: gradiente con 4 stops para simular brillo metálico + `::after` shimmer animation que cruza el botón cada 3s
- **Sticker position**: `bottom: 110px` para que quede arriba del WhatsApp float (`bottom: 30px`); se oculta en <480px
- **Temu-style**: fondo oscuro semi-transparente con blur, precio tachado + $0 enorme en gold, botón metálico llamativo, X discreta
- **localStorage**: 7 días de expiración para no molestar
- **No afecta rendimiento**: no se renderiza si `low-end-mode` está activo; el CSS solo afecta al sticker
