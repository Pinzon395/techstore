(function () {
    const devices = [
        'Equipo',
        'Laptop',
        'Laptop / PC',
        'PC',
        'PC de escritorio',
        'MacBook / iMac',
        'MacBook',
        'iMac',
        'Celular',
        'iPhone',
        'iPad / Tablet',
        'Consola',
        'Consola de videojuegos',
        'Control de videojuegos',
        'Control de consola',
        'Impresora',
        'Monitor',
        'Componente PC',
        'Equipo gamer',
        'Equipo empresarial / B2B',
        'Otro'
    ];

    const services = {
        'Equipo': ['Reparación General', 'Diagnóstico', 'Mantenimiento Preventivo', 'Otro'],
        'Laptop': ['Servicios de Laptop', 'Reparación General', 'Cambio de pantalla', 'Cambio de teclado', 'Cambio de batería', 'Reparación Bisagras', 'Mantenimiento Preventivo', 'Cambio de pasta térmica', 'Upgrade SSD / RAM', 'Diagnóstico', 'Optimización del Sistema', 'Instalación de Windows', 'Mantenimiento Mac', 'Limpieza por Líquido', 'No enciende', 'Se apaga o calienta', 'Recuperación de datos', 'Otro'],
        'Laptop / PC': ['Reparación General', 'Diagnóstico', 'Instalación de Windows', 'Optimización del Sistema', 'Formateo', 'Antisulfatación', 'Mantenimiento Preventivo', 'Upgrade SSD / RAM', 'Upgrade RAM / SSD', 'No enciende', 'Se apaga o calienta', 'Otro'],
        'PC': ['Servicios de PC', 'Reparación General', 'Ensambles PC Gamer', 'Mantenimiento Preventivo', 'Mantenimiento correctivo', 'Formateo', 'Instalación de Windows', 'Upgrade RAM / SSD', 'Limpieza profunda', 'Diagnóstico', 'Optimización del Sistema', 'Antisulfatación', 'Tarjeta de video', 'Fuente de poder', 'No enciende', 'Se apaga o calienta', 'Otro'],
        'PC de escritorio': ['Servicios de PC', 'Reparación General', 'Ensambles PC Gamer', 'Mantenimiento Preventivo', 'Mantenimiento correctivo', 'Formateo', 'Instalación de Windows', 'Upgrade RAM / SSD', 'Limpieza profunda', 'Diagnóstico', 'Optimización del Sistema', 'Antisulfatación', 'Tarjeta de video', 'Fuente de poder', 'No enciende', 'Se apaga o calienta', 'Otro'],
        'MacBook / iMac': ['Mantenimiento Mac', 'Mantenimiento Preventivo', 'Cambio de pantalla', 'Cambio de batería', 'Cambio de pasta térmica', 'Formateo / macOS', 'Diagnóstico', 'Limpieza por Líquido', 'No enciende', 'Otro'],
        'MacBook': ['Mantenimiento Mac', 'Mantenimiento Preventivo', 'Cambio de pantalla', 'Cambio de batería', 'Cambio de teclado', 'Cambio de pasta térmica', 'Formateo / macOS', 'Diagnóstico', 'Limpieza por Líquido', 'No enciende', 'Otro'],
        'iMac': ['Mantenimiento Mac', 'Mantenimiento Preventivo', 'Cambio de pantalla', 'Upgrade SSD / RAM', 'Formateo / macOS', 'Diagnóstico', 'Otro'],
        'Celular': ['Servicios de Celular', 'Reparación General', 'Cambio de pantalla', 'Cambio de batería', 'Reparación de carga', 'Reparación de bocina', 'Cambio de flex / botones', 'Liberación / software', 'Diagnóstico', 'Bañado / Mojado', 'No enciende', 'Otro'],
        'iPhone': ['Reparación General', 'Cambio de pantalla', 'Cambio de batería', 'Reparación de carga', 'Reparación de bocina', 'Cambio de flex / botones', 'Liberación / software', 'Diagnóstico', 'Bañado / Mojado', 'No enciende', 'Otro'],
        'iPad / Tablet': ['Reparación General', 'Cambio de pantalla', 'Cambio de batería', 'Reparación de carga', 'Diagnóstico', 'Otro'],
        'Consola': ['Servicios de Consola', 'Reparación General', 'Limpieza de Consolas', 'Reparación Controles', 'Limpieza interna', 'Cambio de pasta térmica', 'Reparación de HDMI', 'Reparación de fuente', 'Cambio de ventilador', 'Diagnóstico', 'No da video', 'Se apaga sola', 'Otro'],
        'Consola de videojuegos': ['Servicios de Consola', 'Reparación General', 'Limpieza de Consolas', 'Reparación Controles', 'Limpieza interna', 'Cambio de pasta térmica', 'Reparación de HDMI', 'Reparación de fuente', 'Cambio de ventilador', 'Diagnóstico', 'No da video', 'Se apaga sola', 'Otro'],
        'Control de videojuegos': ['Reparación Controles', 'Drift en joystick', 'Botón no funciona', 'Gatillos', 'Batería', 'Pin de carga', 'Otro'],
        'Control de consola': ['Reparación Controles', 'Drift en joystick', 'Botón no funciona', 'Gatillos', 'Batería', 'Pin de carga', 'Otro'],
        'Impresora': ['Servicios de Impresora', 'Reparación General', 'Mantenimiento', 'Cambio de tinta / tóner', 'Reparación de atascos', 'Rodillos / alimentación', 'Conectividad / configuración', 'Diagnóstico', 'Atasco de papel', 'Almohadillas', 'Cabezales tapados', 'No imprime', 'Otro'],
        'Monitor': ['No da imagen', 'Líneas / manchas', 'Fuente / alimentación', 'Otro'],
        'Componente PC': ['Diagnóstico', 'Tarjeta de video', 'Fuente de poder', 'Motherboard', 'RAM / SSD', 'Otro'],
        'Equipo gamer': ['Ensambles PC Gamer', 'Mantenimiento Preventivo', 'Cambio de pasta térmica', 'Optimización del Sistema', 'Upgrade RAM / SSD', 'Limpieza profunda', 'Diagnóstico', 'Otro'],
        'Equipo empresarial / B2B': ['Mantenimiento preventivo empresarial', 'Mantenimiento de flotilla', 'Póliza de soporte', 'Instalación de red', 'Otro'],
        'Otro': ['Otro']
    };

    const priorities = {
        normal: { label: 'Normal', formValue: 'Normal', aliases: ['normal'] },
        urgent: { label: 'Lo necesito lo antes posible', formValue: 'Urgente', aliases: ['urgente', 'lo necesito lo antes posible', 'express', 'hoy'] },
        work_school: { label: 'Es para trabajo / escuela', formValue: 'Trabajo/Escuela', aliases: ['trabajo/escuela', 'trabajo / escuela', 'trabajo', 'escuela'] },
        quote: { label: 'Solo quiero cotizar', formValue: 'Solo cotizar', aliases: ['solo cotizar', 'cotizar', 'cotizacion', 'cotización'] }
    };

    window.PIXON_TICKET_OPTIONS = { devices, services, priorities };
})();
