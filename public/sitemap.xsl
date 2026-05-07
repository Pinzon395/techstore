<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" 
                xmlns:html="http://www.w3.org/TR/REC-html40"
                xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
                xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
    <xsl:template match="/">
        <html xmlns="http://www.w3.org/1999/xhtml">
            <head>
                <title>Sitemap - Pixon PC</title>
                <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <style type="text/css">
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
                        color: #e2e8f0;
                        background-color: #0f172a;
                        margin: 0;
                        padding: 40px;
                    }
                    .container {
                        max-width: 1200px;
                        margin: 0 auto;
                        background: #1e293b;
                        padding: 30px;
                        border-radius: 12px;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                    }
                    h1 {
                        color: #38bdf8;
                        border-bottom: 1px solid #334155;
                        padding-bottom: 15px;
                        margin-top: 0;
                        margin-bottom: 20px;
                        font-size: 24px;
                    }
                    p {
                        color: #94a3b8;
                        line-height: 1.6;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 30px;
                    }
                    th {
                        text-align: left;
                        padding: 15px;
                        background-color: #0f172a;
                        color: #f8fafc;
                        border-bottom: 2px solid #38bdf8;
                        font-weight: 600;
                    }
                    td {
                        padding: 15px;
                        border-bottom: 1px solid #334155;
                        vertical-align: top;
                    }
                    tr:hover td {
                        background-color: #334155;
                    }
                    a {
                        color: #38bdf8;
                        text-decoration: none;
                        transition: color 0.2s ease;
                    }
                    a:hover {
                        color: #7dd3fc;
                        text-decoration: underline;
                    }
                    .images-list {
                        margin: 0;
                        padding-left: 20px;
                        font-size: 0.9em;
                        color: #94a3b8;
                    }
                    .images-list li {
                        margin-bottom: 6px;
                    }
                    @media (max-width: 768px) {
                        body { padding: 15px; }
                        .container { padding: 15px; }
                        table { display: block; overflow-x: auto; white-space: nowrap; }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Sitemap XML - Pixon PC</h1>
                    <p>Este es el sitemap en formato XML generado para facilitar la indexación a los motores de búsqueda como Google o Bing.</p>
                    <p><strong>Total de URLs encontradas:</strong> <xsl:value-of select="count(sitemap:urlset/sitemap:url)"/></p>
                    <table>
                        <thead>
                            <tr>
                                <th>URL</th>
                                <th>Última Modificación</th>
                                <th>Frecuencia</th>
                                <th>Prioridad</th>
                                <th>Imágenes Asociadas</th>
                            </tr>
                        </thead>
                        <tbody>
                            <xsl:for-each select="sitemap:urlset/sitemap:url">
                                <tr>
                                    <td>
                                        <xsl:variable name="itemURL">
                                            <xsl:value-of select="sitemap:loc"/>
                                        </xsl:variable>
                                        <a href="{$itemURL}">
                                            <xsl:value-of select="sitemap:loc"/>
                                        </a>
                                    </td>
                                    <td>
                                        <xsl:value-of select="sitemap:lastmod"/>
                                    </td>
                                    <td>
                                        <xsl:value-of select="sitemap:changefreq"/>
                                    </td>
                                    <td>
                                        <xsl:value-of select="sitemap:priority"/>
                                    </td>
                                    <td>
                                        <xsl:if test="count(image:image) &gt; 0">
                                            <ul class="images-list">
                                                <xsl:for-each select="image:image">
                                                    <li>
                                                        <xsl:variable name="imageURL">
                                                            <xsl:value-of select="image:loc"/>
                                                        </xsl:variable>
                                                        <a href="{$imageURL}" target="_blank">
                                                            <xsl:choose>
                                                                <xsl:when test="image:title != ''">
                                                                    <xsl:value-of select="image:title"/>
                                                                </xsl:when>
                                                                <xsl:otherwise>
                                                                    Ver Imagen
                                                                </xsl:otherwise>
                                                            </xsl:choose>
                                                        </a>
                                                    </li>
                                                </xsl:for-each>
                                            </ul>
                                        </xsl:if>
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
