# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\navbar-quick-check.spec.mjs >> Quick Navbar Logo Verification >> Verify logo in key pages
- Location: tests\navbar-quick-check.spec.mjs:19:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 0
Received: 1
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - navigation [ref=e2]:
    - generic [ref=e3]:
      - link "Pixon PC Logo" [ref=e4] [cursor=pointer]:
        - /url: /
        - img "Pixon PC Logo" [ref=e5]
      - list [ref=e6]:
        - listitem [ref=e7]:
          - link "Inicio" [ref=e8] [cursor=pointer]:
            - /url: /
        - listitem [ref=e9]:
          - link "Servicios " [ref=e10] [cursor=pointer]:
            - /url: "#"
            - text: Servicios
            - generic [ref=e11]: 
        - listitem [ref=e12]:
          - link "Paquetes " [ref=e13] [cursor=pointer]:
            - /url: "#"
            - text: Paquetes
            - generic [ref=e14]: 
        - listitem [ref=e15]:
          - link "Información " [ref=e16] [cursor=pointer]:
            - /url: "#"
            - text: Información
            - generic [ref=e17]: 
        - listitem [ref=e18]:
          - link "Contacto" [ref=e19] [cursor=pointer]:
            - /url: /contacto
        - listitem [ref=e20]:
          - link " B2B" [ref=e21] [cursor=pointer]:
            - /url: /b2b
            - generic [ref=e22]: 
            - text: B2B
        - text: 
      - link "Iniciar Sesión " [ref=e25] [cursor=pointer]:
        - /url: /auth/google
        - text: Iniciar Sesión
        - generic [ref=e26]: 
  - navigation "breadcrumb" [ref=e27]:
    - list [ref=e29]:
      - listitem [ref=e30]:
        - link "Inicio" [ref=e31] [cursor=pointer]:
          - /url: /
      - listitem [ref=e32]:
        - text: ›
        - link "Servicios" [ref=e33] [cursor=pointer]:
          - /url: /reparaciones
      - listitem [ref=e34]: › Limpieza por Líquido
  - heading "Limpieza de Laptop por Derrame de Líquido en Cancún — Pixon PC" [level=1] [ref=e35]
  - banner [ref=e36]:
    - generic [ref=e37]:
      - generic [ref=e38]:
        - generic [ref=e39]: 
        - text: "Emergencia: Actúa Rápido"
      - heading "¿Derramaste líquido en tu equipo? El daño eléctrico ya empezó." [level=1] [ref=e40]:
        - text: ¿Derramaste líquido en tu equipo?
        - text: El daño eléctrico ya empezó.
      - paragraph [ref=e41]:
        - text: Apágalo inmediatamente.
        - strong [ref=e42]: No lo intentes encender.
        - text: Realizamos baños ultrasónicos de emergencia en Cancún para frenar la corrosión y salvar tu información antes de que sea tarde.
      - generic [ref=e43]:
        - button " Auxilio Inmediato 24/7" [ref=e44] [cursor=pointer]:
          - generic [ref=e45]: 
          - text: Auxilio Inmediato 24/7
        - button " Ver precios y proceso" [ref=e46] [cursor=pointer]:
          - generic [ref=e47]: 
          - text: Ver precios y proceso
      - generic [ref=e48]:
        - generic [ref=e49]:
          - generic [ref=e50]: 
          - text: 4.9/5 Reseñas Reales
        - generic [ref=e51]:
          - generic [ref=e52]: 
          - text: Diagnóstico Transparente
        - generic [ref=e53]:
          - generic [ref=e54]: 
          - text: Recolección Express
  - generic [ref=e56]:
    - generic [ref=e57]:
      - generic [ref=e58]:
        - generic [ref=e59]: 
        - text: Antes de llamarnos
      - heading "Los Primeros 30 Minutos Son Críticos" [level=2] [ref=e60]
      - paragraph [ref=e61]: El daño no lo hace el líquido en sí — lo hace la corriente eléctrica pasando por él. Sigue estos pasos antes de traerla al taller.
    - generic [ref=e62]:
      - generic [ref=e63]:
        - generic [ref=e64]:
          - generic [ref=e66]: 
          - heading "SÍ hacer" [level=3] [ref=e67]
        - list [ref=e68]:
          - listitem [ref=e69]:
            - generic [ref=e70]: 
            - generic [ref=e71]:
              - strong [ref=e72]: Apaga manteniendo el botón
              - text: 8 segundos, no por software.
          - listitem [ref=e73]:
            - generic [ref=e74]: 
            - generic [ref=e75]:
              - strong [ref=e76]: Desconecta el cargador
              - text: y la batería externa si tiene.
          - listitem [ref=e77]:
            - generic [ref=e78]: 
            - generic [ref=e79]:
              - strong [ref=e80]: Voltéala en V invertida
              - text: (tienda de campaña) sobre una toalla.
          - listitem [ref=e81]:
            - generic [ref=e82]: 
            - generic [ref=e83]:
              - strong [ref=e84]: Si sabes, retira la batería interna.
              - text: Si no, no la abras.
          - listitem [ref=e85]:
            - generic [ref=e86]: 
            - generic [ref=e87]:
              - strong [ref=e88]: Tráela en menos de 24 horas.
              - text: Después de eso empieza la corrosión.
      - generic [ref=e89]:
        - generic [ref=e90]:
          - generic [ref=e92]: 
          - heading "NO hacer" [level=3] [ref=e93]
        - list [ref=e94]:
          - listitem [ref=e95]:
            - generic [ref=e96]: 
            - generic [ref=e97]:
              - strong [ref=e98]: No la enciendas
              - text: "\"para ver si jala\". Eso es lo que mata la placa."
          - listitem [ref=e99]:
            - generic [ref=e100]: 
            - generic [ref=e101]:
              - strong [ref=e102]: No uses secadora ni horno.
              - text: El calor deforma componentes.
          - listitem [ref=e103]:
            - generic [ref=e104]: 
            - generic [ref=e105]:
              - strong [ref=e106]: El arroz es un mito.
              - text: Absorbe humedad superficial, no del interior.
          - listitem [ref=e107]:
            - generic [ref=e108]: 
            - generic [ref=e109]:
              - strong [ref=e110]: No la inclines repetidamente.
              - text: Esparces el líquido a más zonas.
          - listitem [ref=e111]:
            - generic [ref=e112]: 
            - generic [ref=e113]:
              - strong [ref=e114]: No "esperes a ver qué pasa".
              - text: En 48–72 h aparece la sulfatación.
  - generic [ref=e116]:
    - generic [ref=e117]:
      - generic [ref=e118]:
        - generic [ref=e119]: 
        - text: Lo que pasa si no haces nada
      - heading "El Verdadero Daño Empieza al Día Siguiente" [level=2] [ref=e120]
      - paragraph [ref=e121]: "El líquido se evapora. Lo que queda es lo que mata: residuos minerales, azúcares, ácidos. En Cancún, con la humedad y el salitre, la corrosión avanza el doble de rápido."
    - generic [ref=e122]:
      - generic [ref=e123]:
        - generic [ref=e125]: 
        - heading "Corrosión de la placa madre" [level=3] [ref=e126]
        - paragraph [ref=e127]: El óxido come las pistas de cobre. En 7–10 días puede ser irreparable.
      - generic [ref=e128]:
        - generic [ref=e129]: CANCÚN
        - generic [ref=e131]: 
        - heading "Sulfatación acelerada" [level=3] [ref=e132]
        - paragraph [ref=e133]: El salitre y la humedad de Cancún convierten un derrame menor en sulfatación crónica.
        - link "Ver servicio anti-sulfatación " [ref=e134] [cursor=pointer]:
          - /url: /antisulfatacion
          - text: Ver servicio anti-sulfatación
          - generic [ref=e135]: 
      - generic [ref=e136]:
        - generic [ref=e138]: 
        - heading "Teclado pegajoso o muerto" [level=3] [ref=e139]
        - paragraph [ref=e140]: Las teclas se traban con azúcar y los contactos cortocircuitan. A veces hay que reemplazar.
      - generic [ref=e141]:
        - generic [ref=e143]: 
        - heading "Daño de batería interna" [level=3] [ref=e144]
        - paragraph [ref=e145]: Si el líquido toca la batería, puede inflarse o entrar en cortocircuito. Riesgo de incendio.
      - generic [ref=e146]:
        - generic [ref=e148]: 
        - heading "Pérdida de información" [level=3] [ref=e149]
        - paragraph [ref=e150]:
          - text: Si el SSD se daña, perder los archivos es real. Realizamos
          - link "rescate de datos y reinstalación de Windows" [ref=e151] [cursor=pointer]:
            - /url: /instalacion-windows
          - text: antes de tocar nada.
      - generic [ref=e152]:
        - generic [ref=e154]: 
        - heading "Reparación 5× más cara" [level=3] [ref=e155]
        - paragraph [ref=e156]: "Limpieza preventiva: desde $750. Reparación de placa sulfatada: $3,500+ en componentes."
  - generic [ref=e158]:
    - generic [ref=e159]:
      - generic [ref=e160]:
        - generic [ref=e161]: 
        - text: Tabla de daño
      - heading "No Todos los Líquidos Hacen el Mismo Daño" [level=2] [ref=e162]
      - paragraph [ref=e163]: Cuanto más azúcar, sal o ácido contiene el líquido, más residuo conductor deja al evaporarse. Esto es lo que vemos a diario en el taller.
    - generic [ref=e164]:
      - generic [ref=e165]:
        - generic [ref=e166]: Líquido
        - generic [ref=e167]: Riesgo
        - generic [ref=e168]: Por qué
      - generic [ref=e169]:
        - generic [ref=e170]:
          - generic [ref=e171]: 
          - text: Agua simple
        - generic [ref=e173]: Bajo
        - generic [ref=e174]: Se evapora limpia. Aún así puede oxidar pistas si no se seca bien.
      - generic [ref=e175]:
        - generic [ref=e176]:
          - generic [ref=e177]: 
          - text: Café sin azúcar
        - generic [ref=e179]: Medio
        - generic [ref=e180]: Aceites residuales se quedan en componentes. Limpieza obligatoria.
      - generic [ref=e181]:
        - generic [ref=e182]:
          - generic [ref=e183]: 
          - text: Café con azúcar / leche
        - generic [ref=e185]: Alto
        - generic [ref=e186]: Azúcar caramelizada al evaporarse. Pega componentes y conduce corriente.
      - generic [ref=e187]:
        - generic [ref=e188]:
          - generic [ref=e189]: 
          - text: Refresco / soda
        - generic [ref=e191]: Crítico
        - generic [ref=e192]: Ácido fosfórico + alta concentración de azúcar. El peor escenario.
      - generic [ref=e193]:
        - generic [ref=e194]:
          - generic [ref=e195]: 
          - text: Jugo / smoothie
        - generic [ref=e197]: Crítico
        - generic [ref=e198]: Pulpa, fructosa y ácidos cítricos. Residuo orgánico que oxida rápido.
      - generic [ref=e199]:
        - generic [ref=e200]:
          - generic [ref=e201]: 
          - text: Cerveza
        - generic [ref=e203]: Alto
        - generic [ref=e204]: Azúcar de malta + ácido carbónico. Olor permanente si no se limpia.
      - generic [ref=e205]:
        - generic [ref=e206]:
          - generic [ref=e207]: 
          - text: Agua de mar / piscina
        - generic [ref=e209]: Crítico
        - generic [ref=e210]: Cloro y sal — corrosión instantánea. Llévala el mismo día sin excusa.
      - generic [ref=e211]:
        - generic [ref=e212]:
          - generic [ref=e213]: 
          - text: Alcohol / sanitizante
        - generic [ref=e215]: Bajo
        - generic [ref=e216]: Se evapora rápido y limpio. Aún así revisa que no haya quedado en conectores.
  - generic [ref=e218]:
    - generic [ref=e219]:
      - generic [ref=e220]:
        - generic [ref=e221]: 
        - text: Proceso técnico
      - heading "Cómo Limpiamos una Laptop con Líquido en Pixon PC" [level=2] [ref=e222]
      - paragraph [ref=e223]: Limpieza por inmersión con isopropílico al 99.9% y baño ultrasónico — el mismo método que se usa en líneas de producción de placas madre.
    - generic [ref=e224]:
      - generic [ref=e225]:
        - generic [ref=e226]: "1"
        - heading "Diagnóstico inicial gratis" [level=4] [ref=e227]
        - paragraph [ref=e228]: Identificamos por dónde entró el líquido, qué componentes tocó y respaldo de tu información.
      - generic [ref=e229]:
        - generic [ref=e230]: "2"
        - heading "Desensamble total" [level=4] [ref=e231]
        - paragraph [ref=e232]: Separamos placa, batería, ventiladores, teclado y panel LCD. Ningún componente queda sin revisar.
      - generic [ref=e233]:
        - generic [ref=e234]: "3"
        - heading "Baño ultrasónico" [level=4] [ref=e235]
        - paragraph [ref=e236]: Sumergimos la placa madre en alcohol isopropílico al 99.9% en tina ultrasónica. Quita azúcar, sales y residuos invisibles a simple vista.
      - generic [ref=e237]:
        - generic [ref=e238]: "4"
        - heading "Inspección con microscopio" [level=4] [ref=e239]
        - paragraph [ref=e240]:
          - text: Inspección microscópica contra corrosión. Si el óxido ya avanzó, aplicamos nuestro servicio especializado de
          - link "reparación por antisulfatación" [ref=e241] [cursor=pointer]:
            - /url: /antisulfatacion
          - text: de pistas.
      - generic [ref=e242]:
        - generic [ref=e243]: "5"
        - heading "Secado controlado" [level=4] [ref=e244]
        - paragraph [ref=e245]: Cámara de secado a temperatura controlada por 4–8 horas. Sin secadoras, sin calor agresivo que deforme.
      - generic [ref=e246]:
        - generic [ref=e247]: "6"
        - heading "Ensamble + pruebas 24h" [level=4] [ref=e248]
        - paragraph [ref=e249]:
          - text: Finalizamos aplicando pasta térmica de alto rendimiento (incluido en nuestro
          - link "mantenimiento profundo" [ref=e250] [cursor=pointer]:
            - /url: /paquetes
          - text: ), ensamble y pruebas de estrés 24h.
    - button " Cotizar mi caso" [ref=e252] [cursor=pointer]:
      - generic [ref=e253]: 
      - text: Cotizar mi caso
  - generic [ref=e255]:
    - generic [ref=e256]:
      - heading "Equipos que Limpiamos por Derrame" [level=2] [ref=e257]
      - paragraph [ref=e258]: Cualquier equipo electrónico al que se le haya caído líquido, lo revisamos.
    - generic [ref=e259]:
      - generic [ref=e260]:
        - generic [ref=e261]: 
        - heading "Laptops Windows" [level=4] [ref=e262]
        - paragraph [ref=e263]:
          - text: Limpieza de todas las marcas. Si el disco falló, realizamos formato e
          - link "instalación de Windows 10/11" [ref=e264] [cursor=pointer]:
            - /url: /instalacion-windows
          - text: .
      - link " MacBook Air / Pro Limpieza compatible con líquido en MacBook → ver servicio Mac Ver más " [ref=e265] [cursor=pointer]:
        - /url: /mantenimiento-mac
        - generic [ref=e266]: 
        - heading "MacBook Air / Pro" [level=4] [ref=e267]
        - paragraph [ref=e268]: Limpieza compatible con líquido en MacBook → ver servicio Mac
        - generic [ref=e269]:
          - text: Ver más
          - generic [ref=e270]: 
      - generic [ref=e271]:
        - generic [ref=e272]: 
        - heading "Teclados gaming" [level=4] [ref=e273]
        - paragraph [ref=e274]: Mecánicos y de membrana. Limpieza tecla por tecla cuando aplica.
      - link " Controles PS / Xbox Si tu control quedó pegajoso o con drift por líquido. Ver más " [ref=e275] [cursor=pointer]:
        - /url: /reparacion-controles
        - generic [ref=e276]: 
        - heading "Controles PS / Xbox" [level=4] [ref=e277]
        - paragraph [ref=e278]: Si tu control quedó pegajoso o con drift por líquido.
        - generic [ref=e279]:
          - text: Ver más
          - generic [ref=e280]: 
      - generic [ref=e281]:
        - generic [ref=e282]: 
        - heading "PCs de escritorio" [level=4] [ref=e283]
        - paragraph [ref=e284]: Cuando el líquido entra por la parte superior del gabinete.
      - generic [ref=e285]:
        - generic [ref=e286]: 
        - heading "Tablets" [level=4] [ref=e287]
        - paragraph [ref=e288]: iPad, Galaxy Tab y similares. Diagnóstico por sellado afectado.
  - generic [ref=e290]:
    - generic [ref=e291]:
      - 'heading "Casos Reales: Antes y Después" [level=2] [ref=e292]'
      - paragraph [ref=e293]: Algunas placas que rescatamos de derrames de líquido en clientes de Cancún. Documentamos cada trabajo en video.
    - generic [ref=e294]:
      - generic [ref=e295]:
        - generic [ref=e296]:
          - generic [ref=e298]: ANTES
          - generic [ref=e300]: DESPUÉS
        - generic [ref=e301]:
          - heading "MacBook Pro - Derrame de Café" [level=3] [ref=e302]
          - paragraph [ref=e303]: Limpieza química ultrasónica profunda. Retiro de óxido y sulfatación en la placa madre para recuperar el encendido.
      - generic [ref=e304]:
        - generic [ref=e305]:
          - generic [ref=e307]: ANTES
          - generic [ref=e309]: DESPUÉS
        - generic [ref=e310]:
          - heading "Dell Inspiron - Agua de Lluvia" [level=3] [ref=e311]
          - paragraph [ref=e312]: Tratamiento anti-corrosión en placa y circuitos principales tras exposición prolongada a la lluvia.
    - paragraph [ref=e313]:
      - emphasis [ref=e314]:
        - text: "*Subimos videos del proceso completo en nuestro"
        - link "catálogo de trabajos reales" [ref=e315] [cursor=pointer]:
          - /url: /catalogo
        - text: .
  - generic [ref=e317]:
    - generic [ref=e318]:
      - generic [ref=e319]:
        - generic [ref=e320]: 
        - text: Precios transparentes
      - heading "¿Cuánto Cuesta Limpiar una Laptop Mojada en Cancún?" [level=2] [ref=e321]
      - paragraph [ref=e322]: Diagnóstico gratuito y presupuesto exacto antes de cualquier trabajo. Pagas solo si autorizas la reparación.
    - generic [ref=e323]:
      - generic [ref=e324]:
        - generic [ref=e325]: ❌ Comprar laptop nueva
        - generic [ref=e326]: $12,000 – $35,000
        - generic [ref=e327]: MXN · Pierdes información, configuración y licencias
        - list [ref=e328]:
          - listitem [ref=e329]:
            - generic [ref=e330]: 
            - text: Reinstalar todo desde cero
          - listitem [ref=e331]:
            - generic [ref=e332]: 
            - text: Posible pérdida de datos no respaldados
          - listitem [ref=e333]:
            - generic [ref=e334]: 
            - text: No siempre necesario
      - generic [ref=e335]:
        - generic [ref=e336]: ✓ RECOMENDADO
        - generic [ref=e337]: ✅ Limpieza Pixon PC
        - generic [ref=e338]: Desde $750
        - generic [ref=e339]: MXN · Diagnóstico gratis · Entrega 1–3 días
        - list [ref=e340]:
          - listitem [ref=e341]:
            - generic [ref=e342]: 
            - text: Conservas tu información intacta
          - listitem [ref=e343]:
            - generic [ref=e344]: 
            - text: diagnóstico transparente 30–90 días
          - listitem [ref=e345]:
            - generic [ref=e346]: 
            - text: Te decimos honestamente si no se puede salvar
    - paragraph [ref=e348]:
      - strong [ref=e349]: ¿Tu caso es distinto?
      - text: Si la placa está muy sulfatada o necesita reparación de pistas, el costo puede subir a $1,500–$2,500. Te lo decimos antes de empezar — sin sorpresas.
    - button " Enviar fotos para presupuesto" [ref=e351] [cursor=pointer]:
      - generic [ref=e352]: 
      - text: Enviar fotos para presupuesto
  - generic [ref=e354]:
    - generic [ref=e355]:
      - generic [ref=e356]:
        - generic [ref=e357]: 
        - text: Servicios complementarios
      - heading "¿Tu Caso Necesita Más que Limpieza?" [level=2] [ref=e358]
      - paragraph [ref=e359]: Estos servicios suelen acompañar una limpieza por líquido, sobre todo en Cancún donde la humedad complica todo.
    - generic [ref=e360]:
      - link " Reparación por Antisulfatación Servicio avanzado cuando el líquido ya causó óxido verde. Baño químico, reconstrucción de pistas y sellado UV. Ver antisulfatación " [ref=e361] [cursor=pointer]:
        - /url: /antisulfatacion
        - generic [ref=e362]: 
        - heading "Reparación por Antisulfatación" [level=4] [ref=e363]
        - paragraph [ref=e364]: Servicio avanzado cuando el líquido ya causó óxido verde. Baño químico, reconstrucción de pistas y sellado UV.
        - generic [ref=e365]:
          - text: Ver antisulfatación
          - generic [ref=e366]: 
      - link " Reparación de bisagras Si el líquido aflojó plásticos del marco, reconstruimos con resina epóxica. Ver bisagras " [ref=e367] [cursor=pointer]:
        - /url: /reparacion-bisagras
        - generic [ref=e368]: 
        - heading "Reparación de bisagras" [level=4] [ref=e369]
        - paragraph [ref=e370]: Si el líquido aflojó plásticos del marco, reconstruimos con resina epóxica.
        - generic [ref=e371]:
          - text: Ver bisagras
          - generic [ref=e372]: 
      - link " Mantenimiento Mac MacBooks tienen tornillería pentalobe especial. Las desarmamos sin riesgo. Ver Mac " [ref=e373] [cursor=pointer]:
        - /url: /mantenimiento-mac
        - generic [ref=e374]: 
        - heading "Mantenimiento Mac" [level=4] [ref=e375]
        - paragraph [ref=e376]: MacBooks tienen tornillería pentalobe especial. Las desarmamos sin riesgo.
        - generic [ref=e377]:
          - text: Ver Mac
          - generic [ref=e378]: 
      - link " Reinstalación Windows Si el SSD se afectó, formateo limpio + drivers + tu información respaldada. Ver Windows " [ref=e379] [cursor=pointer]:
        - /url: /instalacion-windows
        - generic [ref=e380]: 
        - heading "Reinstalación Windows" [level=4] [ref=e381]
        - paragraph [ref=e382]: Si el SSD se afectó, formateo limpio + drivers + tu información respaldada.
        - generic [ref=e383]:
          - text: Ver Windows
          - generic [ref=e384]: 
      - link " Optimización post-limpieza Después de armar de nuevo, optimizamos el sistema para que vuelva a sentirse rápido. Ver optimización " [ref=e385] [cursor=pointer]:
        - /url: /optimizacion
        - generic [ref=e386]: 
        - heading "Optimización post-limpieza" [level=4] [ref=e387]
        - paragraph [ref=e388]: Después de armar de nuevo, optimizamos el sistema para que vuelva a sentirse rápido.
        - generic [ref=e389]:
          - text: Ver optimización
          - generic [ref=e390]: 
      - link " Mantenimiento preventivo Limpieza interna periódica para evitar que un derrame futuro sea catástrofe. Ver paquetes " [ref=e391] [cursor=pointer]:
        - /url: /paquetes
        - generic [ref=e392]: 
        - heading "Mantenimiento preventivo" [level=4] [ref=e393]
        - paragraph [ref=e394]: Limpieza interna periódica para evitar que un derrame futuro sea catástrofe.
        - generic [ref=e395]:
          - text: Ver paquetes
          - generic [ref=e396]: 
  - generic [ref=e398]:
    - generic [ref=e399]:
      - generic [ref=e400]:
        - generic [ref=e401]: 
        - text: Términos Claros
      - heading "Política para Equipos Mojados" [level=2] [ref=e402]
      - paragraph [ref=e403]: "Hablamos con la verdad: el agua y la electrónica son enemigos completamente impredecibles."
    - generic [ref=e404]:
      - generic [ref=e405]:
        - generic [ref=e406]: 
        - heading "Sin Garantía Post-Servicio" [level=4] [ref=e407]
        - paragraph [ref=e408]: No damos garantía en equipos mojados. La corrosión puede causar fallas futuras, sin importar qué tan profunda sea la limpieza ultrasónica.
      - generic [ref=e409]:
        - generic [ref=e410]: 
        - heading "Cobro por Éxito" [level=4] [ref=e411]
        - paragraph [ref=e412]: Si el equipo enciende y funciona tras la limpieza, el servicio se cobra. El cliente asume el riesgo del funcionamiento a futuro.
      - generic [ref=e413]:
        - generic [ref=e414]: 
        - heading "Diagnóstico Honesto" [level=4] [ref=e415]
        - paragraph [ref=e416]: Si al abrirlo vemos que la placa está irremediablemente destruida, te lo notificamos directo y no te cobramos.
      - generic [ref=e417]:
        - generic [ref=e418]: 
        - 'heading "Prioridad: Tu Información" [level=4] [ref=e419]'
        - paragraph [ref=e420]: Nuestro objetivo principal antes de intentar encender la placa es respaldar tus archivos para evitar la pérdida de datos.
  - generic [ref=e422]:
    - generic [ref=e423]:
      - heading "Preguntas Frecuentes — Líquido en la Laptop" [level=2] [ref=e424]
      - paragraph [ref=e425]: Las dudas más comunes que recibimos por WhatsApp después de un derrame.
    - generic [ref=e426]:
      - group [ref=e427]:
        - generic "Se me cayó líquido y aún funciona, ¿la traigo igual? +" [ref=e428] [cursor=pointer]:
          - text: Se me cayó líquido y aún funciona, ¿la traigo igual?
          - generic [ref=e429]: +
      - group [ref=e430]:
        - generic "¿Cuánto cuesta limpiar una laptop con líquido en Cancún? +" [ref=e431] [cursor=pointer]:
          - text: ¿Cuánto cuesta limpiar una laptop con líquido en Cancún?
          - generic [ref=e432]: +
      - group [ref=e433]:
        - generic "¿En cuánto tiempo me devuelven la laptop? +" [ref=e434] [cursor=pointer]:
          - text: ¿En cuánto tiempo me devuelven la laptop?
          - generic [ref=e435]: +
      - group [ref=e436]:
        - generic "¿El arroz funciona para secar una laptop mojada? +" [ref=e437] [cursor=pointer]:
          - text: ¿El arroz funciona para secar una laptop mojada?
          - generic [ref=e438]: +
      - group [ref=e439]:
        - generic "¿Y si fue refresco o jugo? Es peor, ¿verdad? +" [ref=e440] [cursor=pointer]:
          - text: ¿Y si fue refresco o jugo? Es peor, ¿verdad?
          - generic [ref=e441]: +
      - group [ref=e442]:
        - generic "¿Funciona también para MacBook o solo Windows? +" [ref=e443] [cursor=pointer]:
          - text: ¿Funciona también para MacBook o solo Windows?
          - generic [ref=e444]: +
      - group [ref=e445]:
        - generic "¿Me la pueden recoger a domicilio en Cancún? +" [ref=e446] [cursor=pointer]:
          - text: ¿Me la pueden recoger a domicilio en Cancún?
          - generic [ref=e447]: +
      - group [ref=e448]:
        - generic "¿Y si ya no enciende? +" [ref=e449] [cursor=pointer]:
          - text: ¿Y si ya no enciende?
          - generic [ref=e450]: +
    - generic [ref=e451]:
      - link " Ver más preguntas frecuentes" [ref=e452] [cursor=pointer]:
        - /url: /preguntas-frecuentes
        - generic [ref=e453]: 
        - text: Ver más preguntas frecuentes
      - link " Ver reseñas reales" [ref=e454] [cursor=pointer]:
        - /url: /comentarios
        - generic [ref=e455]: 
        - text: Ver reseñas reales
  - region "Ubicación y cobertura" [ref=e456]:
    - generic [ref=e457]:
      - generic [ref=e458]:
        - heading "Ubicación y Cobertura en Cancún" [level=2] [ref=e459]
        - paragraph [ref=e460]: Recolección y entrega a domicilio en toda la ciudad.
      - generic [ref=e461]:
        - generic [ref=e462]:
          - iframe [ref=e464]
          - link " Ver en Google Maps" [ref=e465] [cursor=pointer]:
            - /url: https://maps.app.goo.gl/aLrP9whG5R1Wn2kq9
            - generic [ref=e466]: 
            - text: Ver en Google Maps
        - generic [ref=e468]:
          - paragraph [ref=e469]:
            - generic [ref=e470]: 
            - text: Zonas que Cubrimos
          - paragraph [ref=e471]: Recolección y entrega a tu puerta en Cancún y alrededores.
          - generic [ref=e472]:
            - generic [ref=e473]:
              - generic [ref=e474]: 
              - text: Zona Hotelera
            - generic [ref=e475]:
              - generic [ref=e476]: 
              - text: Haciendas
            - generic [ref=e477]:
              - generic [ref=e478]: 
              - text: Supermanzanas
            - generic [ref=e479]:
              - generic [ref=e480]: 
              - text: Polígono Sur
            - generic [ref=e481]:
              - generic [ref=e482]: 
              - text: Huayacán
            - generic [ref=e483]:
              - generic [ref=e484]: 
              - text: Puerto Morelos
            - generic [ref=e485]:
              - generic [ref=e486]: 
              - text: ¿Otra zona? ¡Pregunta!
          - paragraph [ref=e487]:
            - generic [ref=e488]: 
            - text: Horario
          - paragraph [ref=e489]: Lunes – Domingo · con cita previa
          - button " Pedir Recolección a Domicilio" [ref=e490] [cursor=pointer]:
            - generic [ref=e491]: 
            - text: Pedir Recolección a Domicilio
  - contentinfo [ref=e492]:
    - generic [ref=e493]:
      - generic [ref=e494]:
        - link "Pixon PC Logo" [ref=e495] [cursor=pointer]:
          - /url: /
          - img "Pixon PC Logo" [ref=e496]
        - paragraph [ref=e497]:
          - text: Trabajos reales grabados desde el taller. Especialistas en
          - strong [ref=e498]: reparación de computadoras Cancún
          - text: .
      - generic [ref=e499]:
        - heading "Páginas" [level=4] [ref=e500]
        - list [ref=e501]:
          - listitem [ref=e502]:
            - link "Inicio" [ref=e503] [cursor=pointer]:
              - /url: /
          - listitem [ref=e504]:
            - link "Paquetes" [ref=e505] [cursor=pointer]:
              - /url: /paquetes
          - listitem [ref=e506]:
            - link "Ensambles" [ref=e507] [cursor=pointer]:
              - /url: /ensambles
          - listitem [ref=e508]:
            - link "Reseñas" [ref=e509] [cursor=pointer]:
              - /url: /comentarios
          - listitem [ref=e510]:
            - link "Contacto" [ref=e511] [cursor=pointer]:
              - /url: /contacto
      - generic [ref=e512]:
        - heading "Legal" [level=4] [ref=e513]
        - list [ref=e514]:
          - listitem [ref=e515]:
            - link "Política de Privacidad" [ref=e516] [cursor=pointer]:
              - /url: /privacidad
          - listitem [ref=e517]:
            - link "Política de Garantía" [ref=e518] [cursor=pointer]:
              - /url: /garantia
      - generic [ref=e519]:
        - heading "Síguenos" [level=4] [ref=e520]
        - generic [ref=e521]:
          - link "" [ref=e522] [cursor=pointer]:
            - /url: https://wa.me/529986690777
            - generic [ref=e523]: 
          - link "Facebook Pixon PC" [ref=e524] [cursor=pointer]:
            - /url: https://www.facebook.com/people/Pixon-PC/61556271364935/
            - generic [ref=e525]: 
          - link "Instagram Pixon PC" [ref=e526] [cursor=pointer]:
            - /url: https://www.instagram.com/pixonpc/
            - generic [ref=e527]: 
          - link "TikTok Pixon PC" [ref=e528] [cursor=pointer]:
            - /url: https://www.tiktok.com/@pixonpc
            - generic [ref=e529]: 
    - paragraph [ref=e531]:
      - text: © 2026 Pixon PC / Rentalap. Todos los derechos reservados. |
      - link "Privacidad" [ref=e532] [cursor=pointer]:
        - /url: /privacidad
      - text: ·
      - link "Garantía" [ref=e533] [cursor=pointer]:
        - /url: /garantia
  - link "":
    - /url: https://wa.me/529986690777
    - generic: 
  - text:  
  - dialog "Aviso de cookies y privacidad" [ref=e534]:
    - generic [ref=e535]:
      - generic [ref=e536]: 🍪
      - generic [ref=e537]:
        - paragraph [ref=e538]: Privacidad y Cookies
        - paragraph [ref=e539]:
          - text: Usamos cookies anónimas para mejorar tu experiencia.
          - link "Aviso de Privacidad" [ref=e540] [cursor=pointer]:
            - /url: /privacidad
          - text: .
    - generic [ref=e541]:
      - button "Aceptar todas las cookies" [ref=e542] [cursor=pointer]: ✓ Aceptar todo
      - button "Aceptar solo cookies esenciales" [ref=e543] [cursor=pointer]: Solo esenciales
      - button "Más información sobre privacidad" [ref=e544] [cursor=pointer]: Más info
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | /**
  4  |  * Quick Navbar Logo Check - Páginas clave
  5  |  * Verificación rápida sin esperas innecesarias
  6  |  */
  7  | 
  8  | const BASE_URL = 'http://localhost:5174';
  9  | 
  10 | const PAGES_TO_TEST = [
  11 |   { url: '/', name: 'Home Español' },
  12 |   { url: '/en/', name: 'Home English' },
  13 |   { url: '/reparaciones', name: 'Reparaciones' },
  14 |   { url: '/contacto', name: 'Contacto' },
  15 |   { url: '/limpieza-laptop-liquido', name: 'Limpieza Laptop' },
  16 | ];
  17 | 
  18 | test.describe('Quick Navbar Logo Verification', () => {
  19 |   test('Verify logo in key pages', async ({ page }) => {
  20 |     const results = [];
  21 | 
  22 |     for (const pageConfig of PAGES_TO_TEST) {
  23 |       console.log(`\nChecking: ${pageConfig.name}`);
  24 |       const fullUrl = `${BASE_URL}${pageConfig.url}`;
  25 | 
  26 |       try {
  27 |         // Timeout más corto
  28 |         await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 8000 });
  29 |         await page.waitForTimeout(800);
  30 | 
  31 |         // Buscar el navbar logo
  32 |         const navbarLogo = page.locator('#navbar .logo img[alt="Pixon PC Logo"]');
  33 |         const count = await navbarLogo.count();
  34 | 
  35 |         if (count > 0) {
  36 |           const isVisible = await navbarLogo.isVisible();
  37 |           const src = await navbarLogo.getAttribute('src');
  38 |           const box = await navbarLogo.first().boundingBox();
  39 | 
  40 |           results.push({
  41 |             page: pageConfig.name,
  42 |             url: pageConfig.url,
  43 |             status: 'OK',
  44 |             visible: isVisible,
  45 |             src: src,
  46 |             dimensions: box,
  47 |           });
  48 | 
  49 |           console.log(`  ✓ Logo found (${isVisible ? 'visible' : 'hidden'}) - ${src}`);
  50 |         } else {
  51 |           results.push({
  52 |             page: pageConfig.name,
  53 |             url: pageConfig.url,
  54 |             status: 'MISSING',
  55 |             error: 'No navbar logo found',
  56 |           });
  57 |           console.log(`  ✗ No logo found`);
  58 |         }
  59 |       } catch (error) {
  60 |         results.push({
  61 |           page: pageConfig.name,
  62 |           url: pageConfig.url,
  63 |           status: 'ERROR',
  64 |           error: error.message.substring(0, 100),
  65 |         });
  66 |         console.log(`  ✗ Error: ${error.message.substring(0, 80)}`);
  67 |       }
  68 |     }
  69 | 
  70 |     // Resumen
  71 |     console.log('\n═══════════════════════════════════════');
  72 |     console.log('SUMMARY:');
  73 |     console.log('═══════════════════════════════════════\n');
  74 | 
  75 |     const successful = results.filter((r) => r.status === 'OK').length;
  76 |     const failed = results.filter((r) => r.status !== 'OK').length;
  77 | 
  78 |     console.log(`✓ ${successful}/${PAGES_TO_TEST.length} pages with logo\n`);
  79 | 
  80 |     results.forEach((r) => {
  81 |       if (r.status === 'OK') {
  82 |         console.log(`✓ ${r.page.padEnd(20)} - ${r.src}`);
  83 |       } else {
  84 |         console.log(`✗ ${r.page.padEnd(20)} - ${r.status}: ${r.error || 'Unknown'}`);
  85 |       }
  86 |     });
  87 | 
  88 |     console.log('\n═══════════════════════════════════════\n');
  89 | 
  90 |     // Assert all OK
> 91 |     expect(failed).toBe(0);
     |                    ^ Error: expect(received).toBe(expected) // Object.is equality
  92 |   });
  93 | });
  94 | 
```