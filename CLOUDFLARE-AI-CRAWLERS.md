# Configurar Cloudflare para permitir crawlers de IA

## El problema

Cloudflare tiene una funcion **"Block AI Bots"** que viene **activada por defecto**
y inyecta dinamicamente reglas en el `/robots.txt` que bloquean a:

- `GPTBot` (ChatGPT)
- `Google-Extended` (Google AI Overviews / Gemini)
- `ClaudeBot` (Anthropic Claude)
- `Applebot-Extended` (Apple Intelligence)
- `CCBot` (Common Crawl)
- `Amazonbot`, `Bytespider`, `meta-externalagent`, etc.

El resultado es que **Pixon PC NO aparece** en:
- Google AI Overviews ("la respuesta arriba de Google")
- Resultados de ChatGPT Search
- Citaciones de Perplexity
- Apple Intelligence

Esto es un problema porque cada vez mas usuarios buscan
"tecnico PC Cancun" y reciben la respuesta directamente del asistente
de IA — sin pasar por la SERP tradicional.

---

## Solucion paso a paso

### Opcion A — Permitir todos los crawlers de IA

1. Inicia sesion en https://dash.cloudflare.com
2. Selecciona el dominio **pixon.com.mx**
3. En el menu lateral: **Security → Bots**
4. Busca la seccion **"AI Scrapers and Crawlers"** (puede llamarse tambien
   "Block AI bots" o aparecer como toggle en la pagina principal de Bots)
5. **Desactiva** el toggle (cambia a OFF)
6. Guarda cambios

### Opcion B — Permitir solo los crawlers que importan (recomendado)

Si quieres mantener bloqueados algunos pero permitir los relevantes
(Google AI Overviews y ChatGPT son los mas importantes):

1. Cloudflare Dashboard → pixon.com.mx
2. **Rules → Transform Rules → Modify Response Header** (o usa Workers)
3. Crea una regla que sobrescriba `/robots.txt` con el contenido del
   archivo `public/robots.txt` del repo
4. O alternativamente, en **Security → Bots → AI Scrapers**, configura
   excepciones individuales si Cloudflare lo permite en tu plan

### Opcion C — Bypass via Workers (solucion robusta)

Si tienes Cloudflare Workers (incluido en plan Free):

```javascript
// Worker que sirve nuestro robots.txt sin la inyeccion de Cloudflare
addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.pathname === '/robots.txt') {
    event.respondWith(
      fetch('https://pixon.com.mx/robots.txt', {
        cf: { cacheTtl: 0, cacheEverything: false }
      })
    );
  }
});
```

---

## Verificacion

Despues de aplicar el cambio, espera 2-5 minutos para que Cloudflare
propague la configuracion y verifica:

```bash
curl -A "Mozilla/5.0" https://pixon.com.mx/robots.txt
```

**Resultado esperado:** Debe coincidir con el contenido de `public/robots.txt`
en este repo, NO debe contener lineas como:

```
User-agent: GPTBot
Disallow: /
```

Si aun ves esas lineas, Cloudflare sigue inyectando — revisa el dashboard.

---

## Verificacion adicional con herramientas

- **Google Search Console** → URL Inspection → confirma que Googlebot puede acceder
- **https://www.aibotaccess.com/** (o herramientas similares) — verifica acceso de cada AI crawler
- **https://search.google.com/test/rich-results** — confirma que Schema sigue valido
- **Lighthouse / PageSpeed** — verifica que no haya regresiones de SEO

---

## Por que importar permitir esto

Para un negocio local como Pixon PC en Cancun, las busquedas conversacionales
estan creciendo rapido. Tipicas queries:

- "donde reparar mi laptop en Cancun"
- "tecnico PC cerca de zona hotelera"
- "cuanto cuesta limpieza de PS5"
- "computer repair Cancun english"

Estas se responden cada vez mas en AI Overviews / ChatGPT antes de que el
usuario haga clic en cualquier resultado tradicional. Si Pixon PC esta
bloqueado de esos crawlers, **literalmente no existe** para ese segmento
de usuarios.

El trade-off de permitirlos es minimo:
- Si te preocupa training de modelos: solo `Google-Extended`, `CCBot` y
  algunos otros se usan para training. Los demas (`OAI-SearchBot`,
  `ChatGPT-User`, `PerplexityBot`) solo se usan para responder en tiempo
  real, no para entrenar.
- Si te preocupa scraping competitivo: el robots.txt no detiene a
  competidores reales — solo a bots que respetan las reglas.
- Beneficio: aparecer como respuesta autoritativa en busquedas de IA.

---

## Estado actual

- [ ] Cambio aplicado en Cloudflare Dashboard
- [ ] Verificado con `curl https://pixon.com.mx/robots.txt`
- [ ] Confirmado que GPTBot ya no aparece como `Disallow: /`
- [ ] Confirmado que Google-Extended ya no aparece como `Disallow: /`

Marca cada checkbox cuando completes el paso.
