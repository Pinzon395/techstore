/**
 * service-ticket.js
 * Lógica del componente ServiceTicketSection.astro
 */
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('serviceTicketForm');
    if (!form) return;

    const ticketSection = form.closest('.service-ticket-section');
    const ticketContainer = form.closest('.service-ticket-section .container') || form.parentElement;

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
    const defaultSubmitHtml = '<i class="fa-solid fa-paper-plane"></i> Solicitar revisión y cotización';

    const authOverlay = document.getElementById('ticket-auth-overlay');
    const btnCancelAuth = document.getElementById('btn-cancel-auth');
    const successOverlay = document.getElementById('st_success_overlay');
    const prioritySelect = document.getElementById('st_priority');
    const ticketOptions = window.PIXON_TICKET_OPTIONS || {};
    const appointmentType = document.getElementById('st_appointment_type');
    const appointmentDate = document.getElementById('st_appointment_date');
    const appointmentTime = document.getElementById('st_appointment_time');
    const appointmentDelivery = document.getElementById('st_appointment_delivery_method');
    const appointmentNote = document.getElementById('st_appointment_note');
    const appointmentHint = document.getElementById('st_appointment_hint');

    // Mapeo de dispositivos a servicios
    const SERVICES_MAP = ticketOptions.services || {
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
        'Monitor': ['No da imagen', 'Líneas / manchas', 'Fuente / alimentación', 'Otro'],
        'Componente PC': ['Diagnóstico', 'Tarjeta de video', 'Fuente de poder', 'Motherboard', 'RAM / SSD', 'Otro'],
        'Equipo gamer': ['Mantenimiento preventivo', 'Cambio de pasta térmica / Metal líquido', 'Optimización gaming', 'Upgrade de componentes', 'Otro'],
        'Equipo empresarial / B2B': ['Mantenimiento de flotilla', 'Póliza de soporte', 'Instalación de red', 'Otro'],
        'Otro': ['Otro']
    };

    if (Array.isArray(ticketOptions.devices) && ticketOptions.devices.length) {
        const currentDevice = deviceSelect.value;
        deviceSelect.innerHTML = '<option value="">Selecciona una opción...</option>';
        ticketOptions.devices.forEach(device => {
            const opt = document.createElement('option');
            opt.value = device;
            opt.textContent = device;
            deviceSelect.appendChild(opt);
        });
        deviceSelect.value = ticketOptions.devices.includes(currentDevice) ? currentDevice : '';
    }

    if (ticketOptions.priorities && prioritySelect) {
        const currentPriority = prioritySelect.value;
        prioritySelect.innerHTML = '';
        Object.values(ticketOptions.priorities).forEach(priority => {
            const opt = document.createElement('option');
            opt.value = priority.formValue || priority.label;
            opt.textContent = priority.label;
            prioritySelect.appendChild(opt);
        });
        const priorityValues = Array.from(prioritySelect.options).map(opt => opt.value);
        prioritySelect.value = priorityValues.includes(currentPriority) ? currentPriority : 'Normal';
    }

    function normalizeOptionText(value) {
        return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    function findMatchingOption(options, desiredValue) {
        const target = normalizeOptionText(desiredValue);
        if (!target) return null;
        const stopWords = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'por', 'para', 'y']);
        const targetTokens = target.split(/[^a-z0-9]+/).filter(token => token && !stopWords.has(token));
        const normalizedOptions = options.map(option => ({ option, value: normalizeOptionText(option.value) })).filter(item => item.value);
        return normalizedOptions.find(item => item.value === target)?.option
            || normalizedOptions.find(item => item.value.includes(target))?.option
            || normalizedOptions.find(item => targetTokens.length > 0 && targetTokens.every(token => item.value.includes(token)))?.option
            || normalizedOptions.find(item => target.includes(item.value))?.option
            || null;
    }

    function clearFieldErrors() {
        form.querySelectorAll('[aria-invalid="true"]').forEach((field) => {
            field.removeAttribute('aria-invalid');
        });
    }

    function showError(message, field) {
        if (errorText) errorText.textContent = message;
        if (errorMsg) errorMsg.style.display = 'flex';
        if (field) {
            field.setAttribute('aria-invalid', 'true');
            field.focus({ preventScroll: false });
        }
    }

    function getAbsoluteTop(element) {
        let top = 0;
        let curr = element;
        while (curr) {
            top += curr.offsetTop;
            curr = curr.offsetParent;
        }
        return top;
    }

    function scrollTicketStateIntoView(panel) {
        if (!panel) return;
        const target = ticketContainer || ticketSection || panel;
        const absoluteTop = getAbsoluteTop(target);
        const top = Math.max(0, absoluteTop - 96);
        const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        window.requestAnimationFrame(() => {
            window.scrollTo({
                top,
                behavior: reduceMotion ? 'auto' : 'smooth'
            });

            window.setTimeout(() => {
                if (!panel.hasAttribute('tabindex')) {
                    panel.setAttribute('tabindex', '-1');
                }
                panel.focus({ preventScroll: true });
            }, reduceMotion ? 0 : 220);
        });
    }

    function isValidPhone(value) {
        const digits = String(value || '').replace(/\D/g, '');
        return digits.length >= 8;
    }

    function isValidEmail(value) {
        const trimmed = String(value || '').trim();
        return !trimmed || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    }

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

    function todayISO() {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 10);
    }

    function appointmentTypeKey(value) {
        const normalized = normalizeOptionText(value);
        if (normalized.includes('entrega')) return 'entrega';
        if (normalized.includes('diagnostico')) return 'diagnostico';
        if (normalized.includes('recepcion')) return 'recepcion';
        return 'otro';
    }

    async function refreshAppointmentAvailability() {
        if (!appointmentDate || !appointmentTime || !appointmentType) return;
        const date = appointmentDate.value;
        appointmentTime.innerHTML = '<option value="">Selecciona fecha primero...</option>';
        if (!date) return;
        if (date < todayISO()) {
            appointmentTime.innerHTML = '<option value="">Día no disponible</option>';
            if (appointmentHint) appointmentHint.textContent = 'Selecciona un día disponible. No se permiten fechas pasadas.';
            return;
        }
        appointmentTime.disabled = true;
        appointmentTime.innerHTML = '<option value="">Cargando horarios...</option>';
        try {
            const type = appointmentTypeKey(appointmentType.value);
            const res = await fetch(`/api/appointments/availability?date=${encodeURIComponent(date)}&type=${encodeURIComponent(type)}`, { cache: 'no-store' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.available) {
                appointmentTime.innerHTML = `<option value="">${data.message || 'Este día está bloqueado por el taller.'}</option>`;
                if (appointmentHint) appointmentHint.textContent = data.message || 'Este día está bloqueado por el taller.';
                return;
            }
            const slots = Array.isArray(data.slots) ? data.slots : [];
            appointmentTime.innerHTML = slots.length
                ? '<option value="">Selecciona un horario...</option>' + slots.map(slot => `<option value="${slot}">${slot}</option>`).join('')
                : '<option value="">Día lleno o sin horarios disponibles</option>';
            if (appointmentHint) {
                appointmentHint.textContent = slots.length
                    ? 'Tu visita quedará registrada como pendiente de confirmación.'
                    : 'Este día está lleno o no tiene horarios disponibles para el tipo de visita seleccionado.';
            }
        } catch (err) {
            console.error('availability error:', err);
            appointmentTime.innerHTML = '<option value="">No se pudieron cargar horarios</option>';
            if (appointmentHint) appointmentHint.textContent = 'No se pudieron cargar los horarios. Intenta de nuevo.';
        } finally {
            appointmentTime.disabled = false;
        }
    }

    if (appointmentDate) {
        appointmentDate.min = todayISO();
        appointmentDate.addEventListener('change', refreshAppointmentAvailability);
    }
    appointmentType?.addEventListener('change', refreshAppointmentAvailability);

    // 2. Valores por defecto (desde props)
    const defDevice = document.getElementById('st_default_device')?.value;
    const defService = document.getElementById('st_default_service')?.value;
    
    if (defDevice) {
        const options = Array.from(deviceSelect.options);
        const match = findMatchingOption(options, defDevice);
        if (match) {
            deviceSelect.value = match.value;
            updateServices();
            
            if (defService) {
                const srvOptions = Array.from(serviceSelect.options);
                const srvMatch = findMatchingOption(srvOptions, defService);
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
                credentials: 'include',
                body: JSON.stringify(ticketData)
            });

            if (!res.ok) throw new Error('Error al crear el ticket');
            
            const result = await res.json();
            showSuccess(result.ticket_code, ticketData.device_type, ticketData.service_requested, ticketData);

        } catch (err) {
            console.error('Error auto-submit:', err);
            showError('Hubo un error al procesar tu solicitud después del inicio de sesión. Por favor intenta de nuevo.');
            btnSubmit.innerHTML = defaultSubmitHtml;
            btnSubmit.disabled = false;
        }
    }

    // 4. Envío del formulario
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMsg.style.display = 'none';
        clearFieldErrors();

        // Construir Payload
        let finalDevice = deviceSelect.value === 'Otro' ? deviceOtherInput.value.trim() : deviceSelect.value;
        let finalService = serviceSelect.value === 'Otro' ? serviceOtherInput.value.trim() : serviceSelect.value;
        
        const isB2B = deviceSelect.value === 'Equipo empresarial / B2B';
        const nameInput = document.getElementById('st_name');
        const phoneInput = document.getElementById('st_phone');
        const emailInput = document.getElementById('st_email');
        const descriptionInput = document.getElementById('st_description');
        const brand = document.getElementById('st_brand').value.trim();
        const model = document.getElementById('st_model').value.trim();
        const description = descriptionInput.value.trim();

        if (!nameInput.value.trim()) {
            showError('Ingresa tu nombre.', nameInput);
            return;
        }
        if (!isValidPhone(phoneInput.value)) {
            showError('Ingresa un WhatsApp o teléfono válido.', phoneInput);
            return;
        }
        if (!isValidEmail(emailInput.value)) {
            showError('Ingresa un correo válido o deja el campo vacío.', emailInput);
            return;
        }
        if (!finalDevice) {
            showError(deviceSelect.value === 'Otro' ? 'Especifica qué dispositivo necesitas revisar.' : 'Selecciona tu dispositivo.', deviceSelect.value === 'Otro' ? deviceOtherInput : deviceSelect);
            return;
        }
        if (!finalService) {
            showError(serviceSelect.value === 'Otro' ? 'Describe el servicio que necesitas.' : 'Selecciona el servicio que necesitas.', serviceSelect.value === 'Otro' ? serviceOtherInput : serviceSelect);
            return;
        }
        if (!description) {
            showError('Escribe una breve descripción del problema.', descriptionInput);
            return;
        }
        if (isB2B) {
            const company = document.getElementById('st_b2b_company');
            const quantity = document.getElementById('st_b2b_quantity');
            const types = document.getElementById('st_b2b_types');
            if (!company.value.trim()) {
                showError('Ingresa el nombre de la empresa.', company);
                return;
            }
            if (!quantity.value || Number(quantity.value) < 1) {
                showError('Ingresa la cantidad de equipos.', quantity);
                return;
            }
            if (!types.value) {
                showError('Selecciona el tipo de equipos.', types);
                return;
            }
        }
        
        const issueDetails = [
            description,
            `---\nDetalles Técnicos:`,
            `Enciende: ${document.getElementById('st_turns_on').value}`,
            `Líquidos: ${document.getElementById('st_liquid').value}`,
            `Urgencia: ${document.getElementById('st_priority').value}`,
            `Contacto pref.: ${document.getElementById('st_contact_pref').value}`,
            `Cita tipo: ${appointmentType?.value || ''}`,
            `Cita fecha: ${appointmentDate?.value || ''}`,
            `Cita hora: ${appointmentTime?.value || ''}`,
            `Cita entrega: ${appointmentDelivery?.value || ''}`,
            `Cita comentario: ${appointmentNote?.value || ''}`
        ].join('\n');

        if (appointmentDate && appointmentTime && (!appointmentDate.value || !appointmentTime.value)) {
            showError(!appointmentDate.value ? 'Selecciona un día disponible.' : 'Selecciona un horario disponible.', !appointmentDate.value ? appointmentDate : appointmentTime);
            return;
        }

        const payload = {
            customer_name: nameInput.value.trim(),
            customer_phone: phoneInput.value.trim(),
            customer_email: emailInput.value.trim() || null,
            device_type: finalDevice,
            service_requested: finalService,
            issue_description: issueDetails,
            device_brand: brand || null,
            device_model: model || null,
            is_b2b: isB2B,
            source_page: document.getElementById('st_source_page').value,
            appointment_type: appointmentType?.value || null,
            appointment_date: appointmentDate?.value || null,
            appointment_time: appointmentTime?.value || null,
            appointment_datetime: appointmentDate?.value && appointmentTime?.value ? `${appointmentDate.value} ${appointmentTime.value}:00` : null,
            appointment_delivery_method: appointmentDelivery?.value || null,
            appointment_note: appointmentNote?.value || null,
            appointment_status: 'pendiente_confirmacion'
        };

        if (isB2B) {
            payload.b2b_company = document.getElementById('st_b2b_company').value.trim();
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
                btnSubmit.innerHTML = defaultSubmitHtml;
                btnSubmit.disabled = false;
                scrollTicketStateIntoView(authOverlay);
                return;
            }

            // Ya hay sesión, enviar
            btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creando ticket...';
            
            const res = await fetch('/api/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Error en el servidor');
            }

            const result = await res.json();
            showSuccess(result.ticket_code, finalDevice, finalService, payload);

        } catch (err) {
            const message = err?.message && err.message !== 'Failed to fetch'
                ? err.message
                : 'No se pudo enviar tu solicitud. Intenta nuevamente o contáctanos por WhatsApp.';
            showError(message);
            btnSubmit.innerHTML = defaultSubmitHtml;
            btnSubmit.disabled = false;
        }
    });

    if (btnCancelAuth) {
        btnCancelAuth.addEventListener('click', () => {
            sessionStorage.removeItem('pixon_pending_ticket');
            authOverlay.style.display = 'none';
            form.style.display = 'flex';
            btnSubmit.innerHTML = defaultSubmitHtml;
            btnSubmit.disabled = false;
            scrollTicketStateIntoView(form);
        });
    }

    function getContactPreference(ticketData) {
        const match = String(ticketData?.issue_description || '').match(/Contacto pref\.:\s*([^\n\r]+)/i);
        return match?.[1]?.trim() || 'WhatsApp';
    }

    function getContactPreferenceMessage(ticketData) {
        const preference = getContactPreference(ticketData);
        const normalized = normalizeOptionText(preference);
        if (normalized.includes('correo')) return 'Te contactaremos por correo electronico lo antes posible.';
        if (normalized.includes('llamada')) return 'Te llamaremos al telefono registrado lo antes posible.';
        if (normalized.includes('cualquiera')) return 'Te contactaremos por el medio mas rapido disponible.';
        return 'Te contactaremos por WhatsApp lo antes posible.';
    }

    function showSuccess(folio, device, service, ticketData = {}) {
        form.style.display = 'none';
        authOverlay.style.display = 'none';
        if (successOverlay) successOverlay.style.display = 'block';
        document.getElementById('st_success_folio').textContent = folio;
        document.getElementById('st_success_service').textContent = `${device} - ${service}`;
        const successMessage = document.getElementById('st_success_message') || document.querySelector('#st_success_overlay h2 + p');
        if (successMessage && ticketData.appointment_date && ticketData.appointment_time) {
            successMessage.textContent = `Ticket creado correctamente. Registramos tu visita para el ${ticketData.appointment_date} a las ${ticketData.appointment_time}. Un técnico se pondrá en contacto contigo para confirmar detalles.`;
            successMessage.style.display = '';
        }
        
        // Crear link de WA
        const phone = "5219986690777"; // El número base de WhatsApp, puedes ajustarlo
        const msg = encodeURIComponent(`Hola, acabo de generar el ticket de servicio en su página web.\nFolio: ${folio}\nServicio: ${device} - ${service}`);
        document.getElementById('st_wa_link').href = `https://wa.me/${phone}?text=${msg}`;
        scrollTicketStateIntoView(successOverlay);
    }

    // Al cargar, verificar
    checkPendingTicket();
});
