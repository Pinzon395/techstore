BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS "addresses" (
	"id"	TEXT,
	"user_id"	TEXT NOT NULL,
	"street"	TEXT,
	"city"	TEXT,
	"state"	TEXT,
	"zip"	TEXT,
	"phone"	TEXT,
	PRIMARY KEY("id"),
	FOREIGN KEY("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "cart_items" (
	"id"	TEXT,
	"user_id"	TEXT NOT NULL,
	"product_id"	TEXT NOT NULL,
	"quantity"	INTEGER DEFAULT 1,
	PRIMARY KEY("id"),
	FOREIGN KEY("product_id") REFERENCES "products"("id") ON DELETE CASCADE,
	FOREIGN KEY("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "comments" (
	"id"	INTEGER,
	"name"	TEXT NOT NULL,
	"stars"	INTEGER NOT NULL CHECK("stars" BETWEEN 1 AND 5),
	"text"	TEXT NOT NULL,
	"approved"	INTEGER NOT NULL DEFAULT 1,
	"user_email"	TEXT,
	"created_at"	TEXT DEFAULT (datetime('now', 'localtime')),
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "faq_unanswered" (
	"query"	TEXT,
	"count"	INTEGER DEFAULT 1,
	"first_seen"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	"last_seen"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("query")
);
CREATE TABLE IF NOT EXISTS "faqs" (
	"id"	INTEGER,
	"category"	TEXT NOT NULL,
	"question"	TEXT NOT NULL,
	"answer"	TEXT NOT NULL,
	"status"	TEXT NOT NULL DEFAULT 'published' CHECK("status" IN ('published', 'draft', 'archived')),
	"tags"	TEXT,
	"sort_order"	INTEGER NOT NULL DEFAULT 0,
	"created_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	"icon"	TEXT DEFAULT '',
	"display_order"	INTEGER DEFAULT 0,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "order_items" (
	"id"	TEXT,
	"order_id"	TEXT NOT NULL,
	"product_id"	TEXT,
	"service_id"	TEXT,
	"quantity"	INTEGER NOT NULL,
	"price_at_time"	REAL NOT NULL,
	PRIMARY KEY("id"),
	FOREIGN KEY("order_id") REFERENCES "orders"("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "orders" (
	"id"	TEXT,
	"user_id"	TEXT NOT NULL,
	"total"	REAL NOT NULL,
	"status"	TEXT DEFAULT 'pending',
	"shipping_address_id"	TEXT,
	"stripe_session_id"	TEXT,
	"created_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id"),
	FOREIGN KEY("user_id") REFERENCES "users"("id") ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS "products" (
	"id"	TEXT,
	"title"	TEXT NOT NULL,
	"description"	TEXT,
	"price"	REAL NOT NULL,
	"stock"	INTEGER DEFAULT 0,
	"image_url"	TEXT,
	"category"	TEXT,
	"created_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id")
);
CREATE TABLE IF NOT EXISTS "reviews" (
	"id"	TEXT,
	"user_id"	TEXT NOT NULL,
	"product_id"	TEXT,
	"service_id"	TEXT,
	"rating"	INTEGER CHECK("rating" BETWEEN 1 AND 5),
	"comment"	TEXT,
	"created_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id"),
	FOREIGN KEY("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "services" (
	"id"	TEXT,
	"title"	TEXT NOT NULL,
	"base_price"	REAL,
	"description"	TEXT,
	PRIMARY KEY("id")
);
CREATE TABLE IF NOT EXISTS "sessions" (
	"sid"	TEXT NOT NULL,
	"sess"	JSON NOT NULL,
	"expire"	TEXT NOT NULL,
	PRIMARY KEY("sid")
);
CREATE TABLE IF NOT EXISTS "users" (
	"id"	TEXT,
	"google_id"	TEXT UNIQUE,
	"email"	TEXT NOT NULL UNIQUE,
	"name"	TEXT,
	"avatar"	TEXT,
	"role"	TEXT DEFAULT 'user',
	"created_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	"phone"	TEXT,
	PRIMARY KEY("id")
);
INSERT INTO "comments" VALUES (1,'Eduardo Álvarez',5,'Excelente servicio, dejé mi PC y todas las instalaciones se veían muy limpias y de calidad. Todo un experto.',1,NULL,'2026-05-01 14:00:02');
INSERT INTO "comments" VALUES (2,'Ana Maria Martínez',5,'Pensé que mi equipo estaba perdido, pero me salvaron y además recuperó velocidad. Rápido y confiable.',1,NULL,'2026-05-01 14:00:02');
INSERT INTO "comments" VALUES (3,'Carlos Rodríguez',5,'Mi laptop gamer quedó como nueva. Las temperaturas bajaron 25 °C después del mantenimiento Pro. Recomendado 100%.',1,NULL,'2026-05-01 14:00:02');
INSERT INTO "comments" VALUES (4,'Laura Gómez',5,'Llevé mi impresora que nadie quería reparar. En Pixon PC la dejaron lista en menos de 2 horas. Increíble.',1,NULL,'2026-05-01 14:00:02');
INSERT INTO "faqs" VALUES (1,'Diagnóstico, Reparación y Restauración','¿Dónde revisar o reparar computadoras en Cancún?','En Pixon PC. Estamos en una ubicación céntrica y segura, pero no tienes que moverte: ofrecemos servicio de recolección y entrega a domicilio o a tu hotel/oficina en Cancún. Revisamos tu equipo donde nos necesites.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-stethoscope',0);
INSERT INTO "faqs" VALUES (2,'Diagnóstico, Reparación y Restauración','¿Cuánto cuesta reparar una laptop en Cancún?','Depende exclusivamente del componente dañado (pantalla, teclado, SSD) o si es problema de placa base. Nuestras reparaciones inician desde $600 MXN para problemas de software y van escalando según la refacción. Lo más importante: nuestro diagnóstico no tiene costo y no gastas un centavo hasta conocer y aceptar nuestro presupuesto final.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-stethoscope',1);
INSERT INTO "faqs" VALUES (3,'Diagnóstico, Reparación y Restauración','¿Hacen diagnóstico avanzado de laptops y PC gamer?','Sí. No abrimos equipos a ''ojímetro''. Utilizamos multímetros de banco, cámaras térmicas y esquemáticos electrónicos para medir voltajes en tu motherboard. Si tienes una PC Gamer, realizamos pruebas de estrés severo (Benching) para encontrar qué componente exacto falla.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-stethoscope',2);
INSERT INTO "faqs" VALUES (4,'Diagnóstico, Reparación y Restauración','¿Qué revisan exactamente en un diagnóstico técnico?','Puntos clave: Salud de la batería y desgaste, sectores defectuosos en el disco duro, picos de temperatura en procesador y gráfica, cortos circuitos en línea de voltaje, y estado de la pasta térmica. Es un examen físico y lógico profundo.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-stethoscope',3);
INSERT INTO "faqs" VALUES (5,'Diagnóstico, Reparación y Restauración','¿Pueden reparar una computadora que simplemente no enciende?','¡Totalmente! Cuando un equipo está "muerto", en el 80% de los casos se debe a un corto en la línea de poder o fallo de la fuente/pin de carga. Rastreamos el micro-componente (mosfet o capacitor) dañado en la tarjeta madre y lo soldamos.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-stethoscope',4);
INSERT INTO "faqs" VALUES (6,'Diagnóstico, Reparación y Restauración','¿Laptops súper lentas o con fallas de rendimiento tienen solución?','Reparamos esa lentitud crónica en minutos. Usualmente se arregla cambiando el disco mecánico (HDD) viejo por un almacenamiento de Estado Sólido (SSD) de alta velocidad, aumentando RAM y depurando el disco. Tu laptop revivirá siendo 10 veces más rápida.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-stethoscope',5);
INSERT INTO "faqs" VALUES (7,'Diagnóstico, Reparación y Restauración','¿Pueden recuperar equipos que se apagan solos por calor?','Claro. Cuando un equipo se apaga solo de repente, es un mecanismo de defensa interno llamado ''Thermal Throttling'' para no incendiarse. Requiere limpieza química urgente, liberación de ductos y cambio de pasta térmica de alto rendimiento (o metal líquido).','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-stethoscope',6);
INSERT INTO "faqs" VALUES (8,'Diagnóstico, Reparación y Restauración','¿Atienden fallas complejas de motherboard o tarjeta madre?','Sí, la microelectrónica es nuestra especialidad. En lugar de decirte ''tienes que comprar otra tarjeta madre'' (que suele costar lo mismo que una laptop nueva), reparamos los integrados quemados, ahorrándote hasta un 70%.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-stethoscope',7);
INSERT INTO "faqs" VALUES (9,'Diagnóstico, Reparación y Restauración','¿Cambian pantallas, teclados y baterías?','Sustituimos pantallas estrelladas o con líneas muertas, teclados donde fallan las teclas (muy común por humedad de Cancún) y baterías infladas o que no retienen carga. Todas las piezas cuentan con garantía de distribuidor oficial.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-stethoscope',8);
INSERT INTO "faqs" VALUES (10,'Diagnóstico, Reparación y Restauración','¿Reparan puertos USB, HDMI, Jack de audio o pines de carga?','Reemplazamos soldaduras desoldadas de los puertos que tienen falso contacto, HDMI que ya no da video o conectores de carga rotos para que dejen de bailar.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-stethoscope',9);
INSERT INTO "faqs" VALUES (11,'Mantenimiento y Prevención Térmica','¿Cada cuánto se debe dar mantenimiento a una laptop?','En zonas secas, 1 vez al año es suficiente. Sin embargo, en Cancún o Riviera Maya debido a la salinidad, recomendamos fuertemente realizarlo cada 6 a 8 meses, dependiendo del uso.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-fan',10);
INSERT INTO "faqs" VALUES (12,'Mantenimiento y Prevención Térmica','¿Cada cuánto necesita mantenimiento una PC gamer?','Si el equipo está en piso o en ambientes con mascotas y clima, cada 6 meses (ideal). Si está en un entorno muy limpio, se estira máximo a 9 meses. El polvo actúa como un abrigo que ahoga y asfixia los componentes.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-fan',11);
INSERT INTO "faqs" VALUES (13,'Mantenimiento y Prevención Térmica','¿Qué incluye un verdadero mantenimiento preventivo?','No usamos sopladoras y ya. Desarmamos cada capa, limpiamos la placa libre de polvillo y sulfato, lubricamos bujes de ventiladores, removemos pasta petrificada en CPU/GPU, instalamos pasta térmica de grado industrial de +10 W/m-k y realizamos un test sintético final de estrés eléctrico.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-fan',12);
INSERT INTO "faqs" VALUES (14,'Mantenimiento y Prevención Térmica','¿Hacen limpieza interna de computadoras en Cancún?','Sí, usamos alcohol isopropílico de máxima pureza, limpiadores dieléctricos y cepillos antiestáticos. Eliminamos cualquier telaraña, pelusa densa o nidos de insectos (extremadamente común aquí) que pudieran crear corto circuito.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-fan',13);
INSERT INTO "faqs" VALUES (15,'Mantenimiento y Prevención Térmica','¿También limpian ventiladores y disipadores de calor cerrados?','Los disipadores los lavamos a presión en solitario para liberar el radiador atascado por el clima, y los ventiladores son desensamblados de ser posible para limpieza profunda de las hélices, no solo soplados por encima.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-fan',14);
INSERT INTO "faqs" VALUES (16,'Mantenimiento y Prevención Térmica','¿Cambian pasta térmica en laptops y PC? ¿Por qué es importante?','Vital. La pasta térmica transfiere el calor hirviendo del procesador al disipador. Con el tiempo se hace cemento. Si no se cambia, el procesador se cocinará a +95°C y acabará muriendo irreparablemente.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-fan',15);
INSERT INTO "faqs" VALUES (17,'Mantenimiento y Prevención Térmica','¿Usan pasta térmica premium o de mercado libre?','Únicamente usamos mezclas importadas de grado entusiasta, como Arctic MX-6, Thermal Grizzly Kryonaut, Hydronaut, o aleaciones especiales para gaming bruto, nunca silicios genéricos blancos de tiendas de electrónica que se secan en semanas.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-fan',16);
INSERT INTO "faqs" VALUES (18,'Mantenimiento y Prevención Térmica','¿Qué pasa inevitablemente si no le doy mantenimiento a mi equipo?','Primero notarás lentitud en juegos y tareas (ahorcamiento). Luego ruidos como avión de los ventiladores al 100%. Después congelamientos, pantallas azules y reinicios, hasta que la placa colapsa y no enciende jamás por soldadura fracturada.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-fan',17);
INSERT INTO "faqs" VALUES (19,'Mantenimiento y Prevención Térmica','¿El mantenimiento mejora el rendimiento de mi computadora?','Sí, recuperarás la velocidad del día que la sacaste de la caja. Un procesador fresco corre a su velocidad base real (Turbo Boost), mientras que uno caliente baja sus revoluciones para no incendiarse.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-fan',18);
INSERT INTO "faqs" VALUES (20,'Mantenimiento y Prevención Térmica','¿Pueden bajar permanentemente la temperatura límite de mi laptop?','Logramos dropear temperaturas entre 15°C y hasta 30°C grados con un buen mantenimiento térmico, dependiendo del daño acumulado, devolviéndola a un rango completamente seguro (50°c - 75°c bajo carga prudente).','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-fan',19);
INSERT INTO "faqs" VALUES (21,'Cancún y el Clima Extremo (Humedad & Salitre)','¿Por qué exactamente la humedad daña más las computadoras en Cancún?','Mucha gente usa la laptop con el aire acondicionado muy frío y luego sale a la calle a 35°C, o al revés. Ese cambio brutal genera micro-condensación (gotitas invisibles de agua) que terminan atrapadas dentro, en la tarjeta madre.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-cloud-sun-rain',20);
INSERT INTO "faqs" VALUES (22,'Cancún y el Clima Extremo (Humedad & Salitre)','¿El infame salitre afecta laptops y PCs si vivo cerca de playa o laguna?','Sí, el salitre actúa como un acelerador de oxidación. Los puertos plateados USB y el cobre del disipador de calor terminan color verde y oxidados rápidamente si el ambiente circundante no está climatizado.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-cloud-sun-rain',21);
INSERT INTO "faqs" VALUES (23,'Cancún y el Clima Extremo (Humedad & Salitre)','¿Qué es la sulfatación en equipos electrónicos y por qué es mortal?','Es ese ''polvo blanco o verdoso'' que ves en las pilas cuando se chorrean. Cuando el polvo de la casa + la humedad + electricidad se juntan, la placa crea sarro eléctrico. Ese sarro empieza carcomiendo las pistas de comunicación.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-cloud-sun-rain',22);
INSERT INTO "faqs" VALUES (24,'Cancún y el Clima Extremo (Humedad & Salitre)','¿Cómo afecta el calor infernal de Cancún a mi computadora?','El diseño de túnel de aire de tu laptop asume que juegas en tu sala a 20°C promedio de laboratorios americanos. A los 35°C de ambiente en Cancún tropical, los ventiladores nunca descansan, absorbiendo mucha más basura y desgastando sus motores.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-cloud-sun-rain',23);
INSERT INTO "faqs" VALUES (25,'Cancún y el Clima Extremo (Humedad & Salitre)','¿Cómo puedo prevenir daños graves por humedad estando en la costa?','Evita cambios super drásticos de A/C. Compra bolsas desecantes (sílica gel) y guárdalas dentro de tu mochila donde mueves la laptop. Acude a limpiezas preventivas profesionales semestrales contra el sarro.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-cloud-sun-rain',24);
INSERT INTO "faqs" VALUES (26,'Cancún y el Clima Extremo (Humedad & Salitre)','¿Pueden revisar y salvar daños por corrosión, salitre o la sulfatación en la placa?','Sí. Hacemos lavados ultrasónicos químicos. Si la placa se nos entrega ''fresca'' (tiempo cercano desde que empezó a fallar) las probabilidades de salvar el equipo para que encienda aumentan arriba del 85%.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-cloud-sun-rain',25);
INSERT INTO "faqs" VALUES (27,'Gamer, Escalabilidad y Alto Rendimiento','¿Pueden mejorar drásticamente los FPS de la gráfica en mi PC gamer?','Totalmente. Ofrecemos nuestro servicio de ''Debloat & Tuning''. Limpiamos apps basura de Windows 11, calibramos curva de ventiladores (Afterburner), habilitamos XMP/EXPO en BIOS, Resizable BAR al máximo y undervolt al proce, logrando hasta 30% más FPS estables sin tocar piezas.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-gamepad',26);
INSERT INTO "faqs" VALUES (28,'Gamer, Escalabilidad y Alto Rendimiento','¿Qué diferencia hay entre un mantenimiento estándar y uno Gamer?','El Gaming es ''Heavy Duty'' (uso pesado industrial constante). A diferencia de cambiar la simple pasta a una laptop de oficina, un equipo gamer lleva Thermal Pads en las memorias (VRAM), necesita pulición de placa fría de la GPU y una atención maniaca al flujo de presión positiva interior.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-gamepad',27);
INSERT INTO "faqs" VALUES (29,'Gamer, Escalabilidad y Alto Rendimiento','¿Cambian los Thermal Pads y masillas de mi tarjeta de Video (GPU)?','Sí, y esto es crucial y muy delicado. Removimos los pads chiclosos que ya están duros tipo piedra y aplicamos pads térmicos especiales de la medida milimétrica requerida o masilla k5pro de alta gama. Bajarán tus HotSpots radicalmente y por ende los ventiladores.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-gamepad',28);
INSERT INTO "faqs" VALUES (30,'Gamer, Escalabilidad y Alto Rendimiento','¿Recomiendan aplicar Metal Líquido para laptops gamer en esta zona?','Solo para procesadores extremos empaquetados herméticamente. Disipa x4 veces mejor que la pasta, pero su aplicación es quirúrgica: una sola gota mal colocada frita la motherboard por su aleación de Galio ultra conductor. Lo hacemos y garantizamos con protección Kapton.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-gamepad',29);
INSERT INTO "faqs" VALUES (31,'Gamer, Escalabilidad y Alto Rendimiento','¿Qué hacer si mi PC gamer se calienta mucho o hace ruido ensordecedor?','Tráela inmediatamente, antes de que frías el silicio. Necesita reacondicionamiento del AIO (Enfriamiento Líquido) evaporado o corrección del ensamble general. Un equipo bien balanceado nunca debe sonar como turbina, punto.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-gamepad',30);
INSERT INTO "faqs" VALUES (32,'Gamer, Escalabilidad y Alto Rendimiento','¿Hacen ensambles o armados personalizados garantizados en Cancún?','Sí. Tu compras los componentes que soñaste de Amazon o Cyberpuerta a tu nombre y garantía directa, los traes al taller y nosotros montamos todo el rompecabezas como verdaderos entusiastas puristas, sin esconderte márgenes ocultos en la compra y cableándolo perfecto.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-gamepad',31);
INSERT INTO "faqs" VALUES (33,'Gamer, Escalabilidad y Alto Rendimiento','¿Arman PCs gamer de 0 basados en mi presupuesto para jugar algo específico?','Te asesoramos pieza por pieza. Si tu sueño es jugar Warzone o Valorant en 144Hz en un presupuesto de $12 mil pesos, nos sentamos contigo a diseñar en un Excel la máquina perfecta. En Cancún tenemos la fama de no sobrevender componentes inútiles.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-gamepad',32);
INSERT INTO "faqs" VALUES (34,'Soporte Mac Apple y Alta Precisión','¿Hacen mantenimiento a equipos MacBook o iMac en Cancún?','Sí, damos soporte para equipos Mac Pro, MacBook Air y equipos todo-en-uno iMac desde hace años. Conocemos sus tornillerías propietarias pentalobe y la delicadeza con que se trata uno de estos de aluminios premium.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-brands fa-apple',33);
INSERT INTO "faqs" VALUES (35,'Soporte Mac Apple y Alta Precisión','¿Reparan equipos Apple descontinuados con fallas de placa o video?','Ofrecemos microsoldadura de componentes smd a equipos que Apple declaró ''Vintage'' y que sus centros oficiales ya no tocan, dándoles otra vitalidad. También ampliamos memorias en modelos soportados, recuperando el clásico estilo de la marca pero modernos.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-brands fa-apple',34);
INSERT INTO "faqs" VALUES (36,'Soporte Mac Apple y Alta Precisión','¿Mi Mac se calienta brutalmente al usar Premiere o Logic Pro, la pueden revisar?','Al ser tan delgadas, las MacBooks son muy propensas a tapar su minusculo disipador lateral. Procedemos a destaparla milimétricamente, pulir su disipador estancado, y usar pastas sintéticas no abrasivas. Cuidamos cada puerto tipo flex con antiestática.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-brands fa-apple',35);
INSERT INTO "faqs" VALUES (37,'Soporte Mac Apple y Alta Precisión','¿Atienden equipos Apple por cita rápida?','Escríbenos y coordinaremos tu recepción prioritaria. Entendemos que tu Mac suele ser equipo indispensable para tus freelances y clientes; siempre te hablaremos claro de tiempos estimados sin jugar a asustarte con el ecosistema Apple.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-brands fa-apple',36);
INSERT INTO "faqs" VALUES (38,'Garantía, Metódica y Servicio Técnico Empresarial','¿Dan garantía seria y por escrito en sus reparaciones?','Totalmente. Entregamos un ticket virtual del servicio atado a la folio que te ampara. Las condiciones son simples: si vuelve a fallar por nuestra negligencia te devolvemos tu equipo andando de nuevo por todo o reembolsamos. Transparencia total, cero sorpresas.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-handshake',37);
INSERT INTO "faqs" VALUES (39,'Garantía, Metódica y Servicio Técnico Empresarial','¿Hacen recolección y entrega a domicilio real para todos sus servicios?','Pixon lo simplificó. Un repartidor certificado recolecta en tu puerta. Diagnósticamos mandando un reporte con video por nuestro taller, autorizas o cancelas, arreglamos, y volvemos a despachar a la misma puerta del inicio. Literalmente Cancún de frontera a frontera cubierto.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-handshake',38);
INSERT INTO "faqs" VALUES (40,'Garantía, Metódica y Servicio Técnico Empresarial','¿Se puede cotizar por WhatsApp de inmediato con fotos o video de mi falla?','Es nuestro canal favorito principal, ágil e interactivo. Nos mandas un video de cómo suena el problema o nos escribes los pitidos de error y te resolvemos o guiamos para un pronóstico altamente seguro; es asincrónico por lo que jamás esperarás al otro lado de un teléfono.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-handshake',39);
INSERT INTO "faqs" VALUES (41,'Garantía, Metódica y Servicio Técnico Empresarial','¿Atienden empresas o dan soporte técnico B2B (Agencias de viajes en Cancún, restaurantes)?','Contamos con una división de tickets exclusiva, donde tu hotel, centro de reservas, notaría o agencia podrá contar con reportes de incidencias fijos semanales. Hacemos mantenimientos preventivos masivos y reparaciones para redes de oficina completas, emitiendo factura mensual fiscal por outsourcing.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-handshake',40);
INSERT INTO "faqs" VALUES (42,'Preguntas rápidas y frecuentes','¿Reparan celulares Android e iPhone en Cancún?','Sí. Reparamos <strong>pantallas, baterías, centros de carga y fallas de software</strong> en celulares Android e iPhone en Cancún. Usamos refacciones de calidad con procesos seguros que mantienen la integridad del equipo.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-circle-question',41);
INSERT INTO "faqs" VALUES (43,'Preguntas rápidas y frecuentes','¿Cuánto cuesta cambiar la pantalla de un celular en Cancún?','El costo varía según el modelo. El <strong>diagnóstico es gratis</strong> y el presupuesto se da antes de iniciar. Escríbenos por WhatsApp con el modelo de tu celular y te cotizamos al momento.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-circle-question',42);
INSERT INTO "faqs" VALUES (44,'Preguntas rápidas y frecuentes','¿Reparan impresoras en Cancún?','Sí. Solucionamos fallas en impresoras de tinta y láser: <strong>atascos de papel, cabezales obstruidos, problemas de conexión y configuración WiFi</strong>. Servicio para hogar, negocio y oficina en Cancún.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-circle-question',43);
INSERT INTO "faqs" VALUES (45,'Preguntas rápidas y frecuentes','¿Hacen mantenimiento a consolas PS5, Xbox y Nintendo Switch?','Sí. Realizamos <strong>limpieza interna, reparación de puertos HDMI, corrección de errores de encendido y servicio térmico</strong> para PS5, Xbox y Nintendo Switch en Cancún.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-circle-question',44);
INSERT INTO "faqs" VALUES (46,'Preguntas rápidas y frecuentes','¿Instalan Windows en computadoras en Cancún?','Sí. Realizamos <strong>instalación limpia de Windows 10 y 11</strong>, configuración completa del sistema, drivers y programas esenciales. El equipo queda listo para usarse desde el primer encendido.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-circle-question',45);
INSERT INTO "faqs" VALUES (47,'Preguntas rápidas y frecuentes','¿Eliman virus de computadoras en Cancún?','Sí. Detectamos y eliminamos <strong>virus, malware, ransomware y software malicioso</strong> de tu equipo. Si la infección es grave, realizamos un formateo con respaldo previo de tus archivos.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-circle-question',46);
INSERT INTO "faqs" VALUES (48,'Preguntas rápidas y frecuentes','¿Hay servicio técnico en Cancún que vaya a domicilio?','Sí. Recogemos tu equipo en tu casa, hotel, negocio u oficina en Cancún, lo reparamos en nuestro taller y lo devolvemos a la misma dirección. Solo coordínate por WhatsApp.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-circle-question',47);
INSERT INTO "faqs" VALUES (49,'Preguntas rápidas y frecuentes','¿Mi laptop no carga, qué puede ser?','Puede ser la <strong>batería degradada, el pin de carga dañado o un problema en la tarjeta madre</strong>. El diagnóstico es gratis y te decimos exactamente qué falla antes de hacer cualquier reparación.','published',NULL,0,'2026-05-01 22:45:13','2026-05-01 22:45:13','fa-solid fa-circle-question',48);
INSERT INTO "sessions" VALUES ('VokyTSn9c137DF7xS_SqUNRUarvmJ2D6','{"cookie":{"originalMaxAge":604800000,"expires":"2026-05-08T19:09:35.925Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"1e512ce8-96fb-4471-828d-bdfc48e6c089"}}','2026-05-08T21:40:45.195Z');
INSERT INTO "sessions" VALUES ('YHba-aG1AvKLsqarDgRicR9CS07HiOZD','{"cookie":{"originalMaxAge":604800000,"expires":"2026-05-08T22:44:11.193Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"23c959d1-5532-4100-9d4c-7908db3238d3"}}','2026-05-08T22:45:25.831Z');
INSERT INTO "sessions" VALUES ('eS4ABPEzNykUo2dtCV0HAv8_WE2xX88n','{"cookie":{"originalMaxAge":604800000,"expires":"2026-05-09T13:29:58.178Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"23c959d1-5532-4100-9d4c-7908db3238d3"}}','2026-05-10T02:38:35.649Z');
INSERT INTO "users" VALUES ('23c959d1-5532-4100-9d4c-7908db3238d3','109434318127243515984','luispinzon395@gmail.com','López Pinzón Luis Roberto','https://lh3.googleusercontent.com/a/ACg8ocKdvQ1q2jaG0juGdExiaWFG9N26GBFteEuuK-w4HmX-VsSCnXiG=s96-c','admin','2026-05-01 19:00:43',NULL);
INSERT INTO "users" VALUES ('1e512ce8-96fb-4471-828d-bdfc48e6c089','117886435344210104521','tunjafet97@gmail.com','Angel Jafet','https://lh3.googleusercontent.com/a/ACg8ocLR0jS8UTY8RIOLqxLNTAJUBAAE2NnGRHaqgAFKjyL29joDTw=s96-c','user','2026-05-01 19:09:35','\''; UPDATE users SET');
CREATE INDEX IF NOT EXISTS "idx_comments_date" ON "comments" (
	"created_at"	DESC
);
CREATE INDEX IF NOT EXISTS "idx_faqs_category" ON "faqs" (
	"category"
);
CREATE INDEX IF NOT EXISTS "idx_faqs_sort" ON "faqs" (
	"sort_order"
);
CREATE INDEX IF NOT EXISTS "idx_faqs_status" ON "faqs" (
	"status"
);
COMMIT;
