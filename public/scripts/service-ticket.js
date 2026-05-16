/**
 * service-ticket.js
 * Lógica del componente ServiceTicketSection.astro
 */
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('serviceTicketForm');
    if (!form) return;

    const deviceSelect = document.getElementById('st_device');
    const deviceOtherContainer = document.getElementById('st_device_other_container');
    const deviceOtherInput = document.getElementById('st_device_other');
    
    const serviceContainer = document.getElementById('st_service_container');
    const serviceSelect = document.getElementById('st_service');
    const serviceOtherContainer = document.getElementById('st_service_other_container');
    const serviceOtherInput = document.getElementById('st_service_other');
    
    const b2bContainer = document.getElementById('st_b2b_container');
    const b2bInputs = [
        document.getElementById('st_b2b_company'),
        document.getElementById('st_b2b_quantity'),
        document.getElementById('st_b2b_types')
    ];

    const btnSubmit = document.getElementById('btn_st_submit');
    const errorMsg = document.getElementById('st_error_msg');
    const errorText = document.getElementById('st_error_text');

    const authOverlay = document.getElementById('ticket-auth-overlay');
    const btnCancelAuth = document.getElementById('btn-cancel-auth');

    // Mapeo de dispositivos a servicios
    const SERVICES_MAP = {
        'Laptop': ['Mantenimiento preventivo', 'Cambio de pantalla', 'Cambio de batería', 'Cambio de teclado', 'Ampliación de RAM', 'Cambio a SSD', 'Formateo / Sistema operativo', 'Recuperación de datos', 'Reparación de bisagras / carcasa', 'No enciende', 'Se apaga o calienta', 'Otro'],
        'PC de escritorio': ['Mantenimiento preventivo', 'Ampliación de RAM', 'Cambio a SSD', 'Tarjeta de video', 'Fuente de poder', 'Ensamble de componentes', 'Formateo / Sistema operativo', 'Recuperación de datos', 'No enciende', 'Se apaga o calienta', 'Otro'],
        'MacBook': ['Mantenimiento preventivo', 'Cambio de pantalla', 'Cambio de batería', 'Formateo / macOS', 'Recuperación de datos', 'No enciende', 'Otro'],
        'iMac': ['Mantenimiento preventivo', 'Cambio a SSD', 'Ampliación de RAM', 'Formateo / macOS', 'Otro'],
        'Celular': ['Cambio de pantalla', 'Cambio de batería', 'Pin de carga', 'Bañado / Mojado', 'No enciende', 'Desbloqueo / Software', 'Otro'],
        'iPhone': ['Cambio de pantalla', 'Cambio de batería', 'Pin de carga', 'Bañado / Mojado', 'No enciende', 'Otro'],
        'iPad / Tablet': ['Cambio de pantalla', 'Cambio de batería', 'Pin de carga', 'Otro'],
        'Consola de videojuegos': ['Mantenimiento preventivo', 'Cambio de pasta térmica / Metal líquido', 'Reparación de puerto HDMI', 'No da video', 'Se apaga sola', 'Mando no conecta', 'Otro'],
        'Control de videojuegos': ['Drift en joystick', 'Botón no funciona', 'Gatillos', 'Batería', 'Pin de carga', 'Otro'],
        'Impresora': ['Mantenimiento', 'Atasco de papel', 'Almohadillas', 'Cabezales tapados', 'No imprime', 'Otro'],
        'Equipo empresarial / B2B': ['Mantenimiento de flotilla', 'Póliza de soporte', 'Instalación de red', 'Otro'],
        'Otro': ['Otro']
    };

    // 1. Manejo de dependencias (Dispositivo -> Servicio)
    function updateServices() {
        const device = deviceSelect.value;
        
        // Mostrar campo "Otro dispositivo"
        if (device === 'Otro') {
            deviceOtherContainer.style.display = 'block';
            deviceOtherInput.required = true;
        } else {
            deviceOtherContainer.style.display = 'none';
            deviceOtherInput.required = false;
        }

        // Mostrar B2B
        if (device === 'Equipo empresarial / B2B') {
            b2bContainer.style.display = 'block';
            b2bInputs.forEach(i => i && (i.required = true));
        } else {
            b2bContainer.style.display = 'none';
            b2bInputs.forEach(i => i && (i.required = false));
        }

        // Llenar servicios
        if (device && SERVICES_MAP[device]) {
            serviceContainer.style.display = 'block';
            serviceSelect.innerHTML = '<option value="">Selecciona un servicio...</option>';
            SERVICES_MAP[device].forEach(srv => {
                const opt = document.createElement('option');
                opt.value = srv;
                opt.textContent = srv;
                serviceSelect.appendChild(opt);
            });
            serviceSelect.required = true;
        } else if (device) {
            // Fallback
            serviceContainer.style.display = 'block';
            serviceSelect.innerHTML = '<option value="Revisión general">Revisión general</option><option value="Otro">Otro</option>';
            serviceSelect.required = true;
        } else {
            serviceContainer.style.display = 'none';
            serviceSelect.required = false;
            serviceOtherContainer.style.display = 'none';
            serviceOtherInput.required = false;
        }
        
        checkServiceOther();
    }

    function checkServiceOther() {
        if (serviceSelect.value === 'Otro') {
            serviceOtherContainer.style.display = 'block';
            serviceOtherInput.required = true;
        } else {
            serviceOtherContainer.style.display = 'none';
            serviceOtherInput.required = false;
        }
    }

    deviceSelect.addEventListener('change', updateServices);
    serviceSelect.addEventListener('change', checkServiceOther);

    // 2. Valores por defecto (desde props)
    const defDevice = document.getElementById('st_default_device')?.value;
    const defService = document.getElementById('st_default_service')?.value;
    
    if (defDevice) {
        // Encontrar opción que coincida parcialmente si no es exacta
        const options = Array.from(deviceSelect.options);
        const match = options.find(o => o.value.toLowerCase() === defDevice.toLowerCase() || o.value.toLowerCase().includes(defDevice.toLowerCase()));
        if (match) {
            deviceSelect.value = match.value;
            updateServices();
            
            if (defService) {
                const srvOptions = Array.from(serviceSelect.options);
                const srvMatch = srvOptions.find(o => o.value.toLowerCase() === defService.toLowerCase() || o.value.toLowerCase().includes(defService.toLowerCase()));
                if (srvMatch) {
                    serviceSelect.value = srvMatch.value;
                    checkServiceOther();
                } else {
                    serviceSelect.value = 'Otro';
                    checkServiceOther();
                    serviceOtherInput.value = defService;
                }
            }
        }
    }

    // 3. AUTO-SUBMIT: si regresamos de Google Auth con data guardada
    async function checkPendingTicket() {
        const pending = sessionStorage.getItem('pixon_pending_ticket');
        if (!pending) return;

        try {
            const meRes = await fetch('/api/me', { credentials: 'include' });
            const meData = await meRes.json();
            if (!meData.user) return; // Aún no hay sesión real

            sessionStorage.removeItem('pixon_pending_ticket');
            const ticketData = JSON.parse(pending);

            // Rellenar visualmente
            document.getElementById('st_name').value = ticketData.customer_name;
            document.getElementById('st_phone').value = ticketData.customer_phone;
            if(ticketData.customer_email) document.getElementById('st_email').value = ticketData.customer_email;
            
            btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creando ticket...';
            btnSubmit.disabled = true;

            const res = await fetch('/api/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
                body: JSON.stringify(ticketData)
            });

            if (!res.ok) throw new Error('Error al crear el ticket');
            
            const result = await res.json();
            showSuccess(result.ticket_code, ticketData.device_type, ticketData.service_requested);

        } catch (err) {
            console.error('Error auto-submit:', err);
            errorText.textContent = 'Hubo un error al procesar tu solicitud después del inicio de sesión. Por favor intenta de nuevo.';
            errorMsg.style.display = 'flex';
            btnSubmit.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Crear Ticket de Servicio';
            btnSubmit.disabled = false;
        }
    }

    // 4. Envío del formulario
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMsg.style.display = 'none';

        // Construir Payload
        let finalDevice = deviceSelect.value === 'Otro' ? deviceOtherInput.value : deviceSelect.value;
        let finalService = serviceSelect.value === 'Otro' ? serviceOtherInput.value : serviceSelect.value;
        
        const isB2B = deviceSelect.value === 'Equipo empresarial / B2B';
        const brand = document.getElementById('st_brand').value;
        const model = document.getElementById('st_model').value;
        const description = document.getElementById('st_description').value;
        
        const issueDetails = [
            description,
            `---\nDetalles Técnicos:`,
            `Enciende: ${document.getElementById('st_turns_on').value}`,
            `Líquidos: ${document.getElementById('st_liquid').value}`,
            `Urgencia: ${document.getElementById('st_priority').value}`,
            `Contacto pref.: ${document.getElementById('st_contact_pref').value}`
        ].join('\n');

        const payload = {
            customer_name: document.getElementById('st_name').value,
            customer_phone: document.getElementById('st_phone').value,
            customer_email: document.getElementById('st_email').value || null,
            device_type: finalDevice,
            service_requested: finalService,
            issue_description: issueDetails,
            device_brand: brand || null,
            device_model: model || null,
            is_b2b: isB2B,
            source_page: document.getElementById('st_source_page').value
        };

        if (isB2B) {
            payload.b2b_company = document.getElementById('st_b2b_company').value;
            payload.b2b_quantity = document.getElementById('st_b2b_quantity').value;
            payload.b2b_type = document.getElementById('st_b2b_types').value;
            payload.b2b_frequency = document.getElementById('st_b2b_frequency').value;
            payload.b2b_invoice = document.getElementById('st_b2b_invoice').value;
        }

        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verificando...';
        btnSubmit.disabled = true;

        try {
            // Verificar sesión
            const meRes = await fetch('/api/me', { credentials: 'include' });
            const meData = await meRes.json();

            if (!meData.user) {
                // Requiere login
                sessionStorage.setItem('pixon_pending_ticket', JSON.stringify(payload));
                form.style.display = 'none';
                authOverlay.style.display = 'block';
                return;
            }

            // Ya hay sesión, enviar
            btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creando ticket...';
            
            const res = await fetch('/api/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Error en el servidor');
            }

            const result = await res.json();
            showSuccess(result.ticket_code, finalDevice, finalService);

        } catch (err) {
            errorText.textContent = err.message;
            errorMsg.style.display = 'flex';
            btnSubmit.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Crear Ticket de Servicio';
            btnSubmit.disabled = false;
        }
    });

    if (btnCancelAuth) {
        btnCancelAuth.addEventListener('click', () => {
            sessionStorage.removeItem('pixon_pending_ticket');
            authOverlay.style.display = 'none';
            form.style.display = 'flex';
            btnSubmit.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Crear Ticket de Servicio';
            btnSubmit.disabled = false;
        });
    }

    function showSuccess(folio, device, service) {
        form.style.display = 'none';
        authOverlay.style.display = 'none';
        document.getElementById('st_success_overlay').style.display = 'block';
        document.getElementById('st_success_folio').textContent = folio;
        document.getElementById('st_success_service').textContent = `${device} - ${service}`;
        
        // Crear link de WA
        const phone = "5219986690777"; // El número base de WhatsApp, puedes ajustarlo
        const msg = encodeURIComponent(`Hola, acabo de generar el ticket de servicio en su página web.\nFolio: ${folio}\nServicio: ${device} - ${service}`);
        document.getElementById('st_wa_link').href = `https://wa.me/${phone}?text=${msg}`;
    }

    // Al cargar, verificar
    checkPendingTicket();
});
