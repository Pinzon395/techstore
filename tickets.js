/**
 * ════════════════════════════════════════════
 *  TICKETS SYSTEM - Lógica de gestión
 * ════════════════════════════════════════════
 */

'use strict';

// Inicializar tickets desde localStorage
function initializeTickets() {
    const stored = localStorage.getItem('pixonTickets');
    return stored ? JSON.parse(stored) : [];
}

// Guardar tickets en localStorage
function saveTickets(tickets) {
    localStorage.setItem('pixonTickets', JSON.stringify(tickets));
}

// Generar ID único para ticket
function generateTicketId() {
    return 'TK-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

// Enviar ticket por correo (simulado o real)
async function sendTicketEmail(ticket) {
    try {
        // Simulación: en producción integrar con un backend
        console.log('Enviando ticket por email:', ticket);
        // Aquí iría la lógica de integración con un servicio de email
        return true;
    } catch (error) {
        console.error('Error enviando email:', error);
        return false;
    }
}

// Crear nuevo ticket
function createTicket(e) {
    e.preventDefault();

    const tickets = initializeTickets();
    const form = document.getElementById('ticketForm');

    const newTicket = {
        id: generateTicketId(),
        name: document.getElementById('ticketName').value.trim(),
        device: document.getElementById('ticketDevice').value,
        description: document.getElementById('ticketDescription').value.trim(),
        email: document.getElementById('ticketEmail').value.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: []
    };

    // Validaciones
    if (!newTicket.name || !newTicket.device || !newTicket.description || !newTicket.email) {
        alert('Por favor completa todos los campos');
        return;
    }

    // Guardar ticket
    tickets.push(newTicket);
    saveTickets(tickets);

    // Mostrar mensaje de éxito
    const successMsg = document.querySelector('.ticket-success-message');
    if (successMsg) {
        successMsg.classList.add('show');
        setTimeout(() => successMsg.classList.remove('show'), 5000);
    }

    // Limpiar formulario
    form.reset();

    // Actualizar lista de tickets
    displayRecentTickets();

    // Enviar email de confirmación (opcional)
    sendTicketEmail(newTicket);

    // Notificar por WhatsApp opcional
    console.log('Ticket creado:', newTicket);
}

// Mostrar tickets recientes
function displayRecentTickets() {
    const tickets = initializeTickets();
    const ticketsList = document.getElementById('ticketsList');

    if (!ticketsList) return;

    // Ordenar por más reciente primero
    const recent = tickets.slice().reverse().slice(0, 5);

    if (recent.length === 0) {
        ticketsList.innerHTML = `
            <div style="padding: 16px; background: #f8f9fc; border-radius: 12px; text-align: center; color: #64748b; border: 1px dashed #cbd5e1;">
                <i class="fa-solid fa-inbox" style="font-size: 2rem; color: #cbd5e1; margin-bottom: 8px; display: block;"></i>
                <p style="margin: 0;">No hay tickets aún. ¡Crea uno para empezar!</p>
            </div>
        `;
        return;
    }

    ticketsList.innerHTML = recent.map(ticket => `
        <div class="ticket-item status-${ticket.status}" onclick="showTicketDetail('${ticket.id}')">
            <div class="ticket-header">
                <span class="ticket-id">${ticket.id}</span>
                <span class="ticket-status status-${ticket.status}">
                    ${getStatusLabel(ticket.status)}
                </span>
            </div>
            <div class="ticket-title">${ticket.name}</div>
            <div class="ticket-date">
                <i class="fa-solid fa-clock" style="margin-right: 4px; opacity: 0.6;"></i>
                ${formatDate(ticket.createdAt)}
            </div>
        </div>
    `).join('');
}

// Obtener etiqueta de estado
function getStatusLabel(status) {
    const labels = {
        'pending': 'Por revisar',
        'in-progress': 'En proceso',
        'resolved': 'Resuelto'
    };
    return labels[status] || status;
}

// Formatear fecha
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Hace poco';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    
    return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
}

// Mostrar detalle del ticket
function showTicketDetail(ticketId) {
    const tickets = initializeTickets();
    const ticket = tickets.find(t => t.id === ticketId);

    if (!ticket) return;

    const modal = document.getElementById('ticketModal') || createTicketModal();
    const content = modal.querySelector('.tickets-modal-content');

    content.innerHTML = `
        <button class="close-modal" onclick="closeTicketModal()">&times;</button>
        
        <h2 style="color: #0f172a; margin-bottom: 24px;">
            Detalles del Ticket
        </h2>

        <div style="background: #f8f9fc; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                <div>
                    <p style="margin: 0 0 4px 0; color: #64748b; font-size: 0.85rem; font-weight: 600;">ID del Ticket</p>
                    <p style="margin: 0; font-family: monospace; font-weight: 700; color: var(--primary);">${ticket.id}</p>
                </div>
                <div>
                    <p style="margin: 0 0 4px 0; color: #64748b; font-size: 0.85rem; font-weight: 600;">Estado</p>
                    <span class="ticket-status status-${ticket.status}">
                        ${getStatusLabel(ticket.status)}
                    </span>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div>
                    <p style="margin: 0 0 4px 0; color: #64748b; font-size: 0.85rem; font-weight: 600;">Fecha de creación</p>
                    <p style="margin: 0; color: #0f172a;">${new Date(ticket.createdAt).toLocaleDateString('es-MX', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div>
                    <p style="margin: 0 0 4px 0; color: #64748b; font-size: 0.85rem; font-weight: 600;">Tipo de equipo</p>
                    <p style="margin: 0; color: #0f172a; text-transform: capitalize;">${ticket.device}</p>
                </div>
            </div>
        </div>

        <div style="margin-bottom: 24px;">
            <h3 style="color: #0f172a; margin-bottom: 12px; font-size: 1.1rem;">Información del Servicio</h3>
            <div style="background: white; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0;">
                <p style="margin: 0 0 8px 0; color: #64748b; font-size: 0.85rem; font-weight: 600;">Nombre del servicio</p>
                <p style="margin: 0 0 16px 0; color: #0f172a; font-weight: 600;">${ticket.name}</p>

                <p style="margin: 0 0 8px 0; color: #64748b; font-size: 0.85rem; font-weight: 600;">Descripción</p>
                <p style="margin: 0 0 16px 0; color: #0f172a; line-height: 1.6;">${ticket.description}</p>

                <p style="margin: 0 0 8px 0; color: #64748b; font-size: 0.85rem; font-weight: 600;">Correo de contacto</p>
                <p style="margin: 0; color: var(--primary); font-weight: 600;">${ticket.email}</p>
            </div>
        </div>

        <div style="display: flex; gap: 12px;">
            <button onclick="updateTicketStatus('${ticketId}', 'in-progress')" class="btn btn-primary" style="flex: 1;">
                <i class="fa-solid fa-play"></i> En proceso
            </button>
            <button onclick="updateTicketStatus('${ticketId}', 'resolved')" class="btn btn-outline" style="flex: 1;">
                <i class="fa-solid fa-check"></i> Marcar resuelto
            </button>
        </div>
    `;

    modal.classList.add('active');
}

// Crear modal para tickets
function createTicketModal() {
    const modal = document.createElement('div');
    modal.id = 'ticketModal';
    modal.className = 'tickets-modal';
    modal.innerHTML = '<div class="tickets-modal-content"></div>';
    document.body.appendChild(modal);

    modal.addEventListener('click', function(e) {
        if (e.target === this) closeTicketModal();
    });

    return modal;
}

// Cerrar modal
function closeTicketModal() {
    const modal = document.getElementById('ticketModal');
    if (modal) modal.classList.remove('active');
}

// Actualizar estado de ticket
function updateTicketStatus(ticketId, newStatus) {
    const tickets = initializeTickets();
    const ticket = tickets.find(t => t.id === ticketId);

    if (ticket) {
        ticket.status = newStatus;
        ticket.updatedAt = new Date().toISOString();
        saveTickets(tickets);
        displayRecentTickets();
        closeTicketModal();
    }
}

// Mostrar todos los tickets
function showAllTickets() {
    const tickets = initializeTickets();
    const modal = document.getElementById('ticketModal') || createTicketModal();
    const content = modal.querySelector('.tickets-modal-content');

    if (tickets.length === 0) {
        content.innerHTML = `
            <button class="close-modal" onclick="closeTicketModal()">&times;</button>
            <div style="text-align: center; padding: 40px 20px;">
                <i class="fa-solid fa-inbox" style="font-size: 3rem; color: #cbd5e1; margin-bottom: 16px; display: block;"></i>
                <h2 style="color: #64748b; margin-bottom: 8px;">No hay tickets</h2>
                <p style="color: #94a3b8;">Crea tu primer ticket para comenzar a rastrear tu servicio.</p>
            </div>
        `;
    } else {
        content.innerHTML = `
            <button class="close-modal" onclick="closeTicketModal()">&times;</button>
            <h2 style="color: #0f172a; margin-bottom: 24px;">Todos tus Tickets</h2>
            <div style="display: flex; flex-direction: column; gap: 12px; max-height: 60vh; overflow-y: auto;">
                ${tickets.slice().reverse().map(ticket => `
                    <div class="ticket-item status-${ticket.status}" onclick="showTicketDetail('${ticket.id}'); event.stopPropagation();">
                        <div class="ticket-header">
                            <span class="ticket-id">${ticket.id}</span>
                            <span class="ticket-status status-${ticket.status}">
                                ${getStatusLabel(ticket.status)}
                            </span>
                        </div>
                        <div class="ticket-title">${ticket.name}</div>
                        <div class="ticket-date">
                            <i class="fa-solid fa-clock" style="margin-right: 4px; opacity: 0.6;"></i>
                            ${formatDate(ticket.createdAt)}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    modal.classList.add('active');
}

// Inicializar al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    const ticketForm = document.getElementById('ticketForm');
    if (ticketForm) {
        ticketForm.addEventListener('submit', createTicket);
        displayRecentTickets();
    }

    // Crear modal al inicio
    createTicketModal();

    // Cerrar modal con tecla ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeTicketModal();
    });
});
