<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
                xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
                xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html lang="es">
      <head>
        <meta charset="UTF-8"/>
        <title>Sitemap XML - Pixon PC</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <style type="text/css">
          :root {
            color-scheme: dark;
            --bg: #07111f;
            --panel: #0f2238;
            --panel-2: #102a44;
            --line: rgba(148, 163, 184, 0.22);
            --text: #e5f0ff;
            --muted: #9fb3c8;
            --brand: #38bdf8;
            --accent: #5eead4;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 32px;
            background: radial-gradient(circle at 12% 8%, rgba(56, 189, 248, 0.18), transparent 34%), linear-gradient(135deg, var(--bg), #0b1b2d);
            color: var(--text);
            font-family: Arial, Helvetica, sans-serif;
            line-height: 1.5;
          }
          .wrap { max-width: 1180px; margin: 0 auto; }
          .hero {
            padding: 28px;
            border: 1px solid var(--line);
            border-radius: 18px;
            background: linear-gradient(135deg, rgba(15, 34, 56, 0.96), rgba(16, 42, 68, 0.92));
            box-shadow: 0 22px 60px rgba(0, 0, 0, 0.28);
          }
          .eyebrow {
            display: inline-block;
            margin-bottom: 10px;
            padding: 6px 10px;
            border-radius: 999px;
            background: rgba(56, 189, 248, 0.12);
            color: var(--brand);
            font-weight: 800;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: .04em;
          }
          h1 { margin: 0 0 8px; color: #fff; font-size: clamp(28px, 4vw, 46px); line-height: 1; }
          p { margin: 0; color: var(--muted); }
          .meta {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
            margin-top: 20px;
          }
          .meta div {
            padding: 14px;
            border-radius: 14px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--line);
          }
          .meta strong { display: block; color: #fff; font-size: 22px; }
          .meta span { color: var(--muted); font-size: 13px; }
          table {
            width: 100%;
            margin-top: 22px;
            border-collapse: separate;
            border-spacing: 0 8px;
          }
          th {
            padding: 12px 14px;
            color: #c7d8e8;
            font-size: 12px;
            text-align: left;
            text-transform: uppercase;
            letter-spacing: .04em;
          }
          td {
            padding: 14px;
            background: rgba(255, 255, 255, 0.055);
            border-top: 1px solid var(--line);
            border-bottom: 1px solid var(--line);
            vertical-align: top;
          }
          td:first-child { border-left: 1px solid var(--line); border-radius: 14px 0 0 14px; }
          td:last-child { border-right: 1px solid var(--line); border-radius: 0 14px 14px 0; }
          tr:hover td { background: rgba(56, 189, 248, 0.10); }
          a { color: var(--brand); text-decoration: none; overflow-wrap: anywhere; font-weight: 700; }
          a:hover { color: var(--accent); text-decoration: underline; }
          .images-list { margin: 0; padding-left: 18px; color: var(--muted); }
          .empty { color: #64748b; }
          @media (max-width: 820px) {
            body { padding: 14px; }
            .hero { padding: 20px; }
            .meta { grid-template-columns: 1fr; }
            table { display: block; overflow-x: auto; white-space: nowrap; }
            th, td { padding: 12px; }
          }
        </style>
      </head>
      <body>
        <div class="wrap">
          <section class="hero">
            <span class="eyebrow">Mapa de indexación</span>
            <h1>Sitemap XML - Pixon PC</h1>
            <p>Listado de URLs canónicas para facilitar el rastreo de Google Search Console, Bing y motores de IA. Este archivo sigue siendo XML válido para crawlers; esta vista solo mejora su lectura humana.</p>
            <div class="meta">
              <div>
                <strong><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/></strong>
                <span>URLs indexables</span>
              </div>
              <div>
                <strong>pixon.com.mx</strong>
                <span>Dominio principal</span>
              </div>
              <div>
                <strong>UTF-8</strong>
                <span>Acentos y eñes correctos</span>
              </div>
            </div>
          </section>

          <table>
            <thead>
              <tr>
                <th>URL</th>
                <th>Última modificación</th>
                <th>Frecuencia</th>
                <th>Prioridad</th>
                <th>Imágenes asociadas</th>
              </tr>
            </thead>
            <tbody>
              <xsl:for-each select="sitemap:urlset/sitemap:url">
                <tr>
                  <td>
                    <xsl:variable name="itemURL"><xsl:value-of select="sitemap:loc"/></xsl:variable>
                    <a href="{$itemURL}"><xsl:value-of select="sitemap:loc"/></a>
                  </td>
                  <td><xsl:value-of select="sitemap:lastmod"/></td>
                  <td><xsl:value-of select="sitemap:changefreq"/></td>
                  <td><xsl:value-of select="sitemap:priority"/></td>
                  <td>
                    <xsl:choose>
                      <xsl:when test="count(image:image) &gt; 0">
                        <ul class="images-list">
                          <xsl:for-each select="image:image">
                            <li>
                              <xsl:variable name="imageURL"><xsl:value-of select="image:loc"/></xsl:variable>
                              <a href="{$imageURL}" target="_blank">
                                <xsl:choose>
                                  <xsl:when test="image:title != ''"><xsl:value-of select="image:title"/></xsl:when>
                                  <xsl:otherwise>Ver imagen</xsl:otherwise>
                                </xsl:choose>
                              </a>
                            </li>
                          </xsl:for-each>
                        </ul>
                      </xsl:when>
                      <xsl:otherwise><span class="empty">Sin imágenes</span></xsl:otherwise>
                    </xsl:choose>
                  </td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
