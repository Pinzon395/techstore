'use strict';

const API_BASE = '/api';
let allComments = [];
let allGoogleReviews = [];
let googleSyncStatus = null;
let allRepairs = [];
let allBuilds = [];
let currentFilter = 'all'; // all, pending, approved
let allUsers = [];
let activeRepairTicket = null;
let crmCurrentPage = 1;
let crmPageSize = 25;
let crmSelectedTickets = new Set();
let activeRepairQuickView = 'all';
let activeRepairTab = 'summary';
let availableTechnicians = [];
let globalSearchIndex = -1;
let globalSearchResults = [];
let appointmentConfig = { settings: [], exceptions: [] };
let adminAppointments = [];
let activeAppointmentFilter = 'today';
let activeAgendaView = 'list';
let pendingDeleteRepairId = null;

// M8 → header CSRF que el backend exige en POST/PUT/DELETE.
// Helper para no olvidarlo en ninguna llamada de escritura.
const CSRF_HEADER = { 'X-Requested-With': 'fetch' };
const JSON_HEADERS = { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' };
const INCLUDE_CREDENTIALS = { credentials: 'include' };

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verificar permisos
    const authLoading = document.getElementById('auth-loading');
    const adminContent = document.getElementById('admin-content');
    
    try {
        const meRes = await fetch(`${API_BASE}/me`, INCLUDE_CREDENTIALS);
        if (!meRes.ok) throw new Error(`No se pudo validar la sesion (HTTP ${meRes.status})`);
        const meData = await meRes.json();
        
        if (!meData.user || meData.user.role !== 'admin') {
            authLoading.innerHTML = `
                <i class="fa-solid fa-lock" style="color: #ef4444; font-size: 3rem;"></i>
                <h2 style="color: #f1f5f9; margin-top: 10px;">Acceso Denegado</h2>
                <p>No tienes permisos de administrador.</p>
                <a href="/" class="btn btn-primary" style="margin-top: 15px;">Volver al Inicio</a>
            `;
            return;
        }

        // Es admin, mostrar contenido
        authLoading.style.display = 'none';
        adminContent.style.display = 'block';

        // Cargar usuario en navbar
        const userArea = document.getElementById('admin-user-area');
        userArea.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; color: #f1f5f9;">
                <img src="${meData.user.avatar || 'https://ui-avatars.com/api/?name=Admin&background=6366f1&color=fff'}" 
                     style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid #6366f1;">
                <span style="font-weight: 600;">${meData.user.name.split(' ')[0]}</span>
                <a href="/auth/logout" style="color: #94a3b8; margin-left: 10px;" title="Cerrar sesión">
                    <i class="fa-solid fa-right-from-bracket"></i>
                </a>
            </div>
        `;

        // 2. Cargar datos iniciales
        await Promise.all([
            fetchComments(),
            fetchUsers(),
            fetchFaqs(),
            fetchUnanswered(),
            fetchRepairs(),
            fetchTechnicians(),
            fetchBuilds()
        ]);
        
        // 3. Conectar SSE para notificaciones en vivo
        connectSSE();

        // Configurar filtros de comentarios
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                currentFilter = e.target.getAttribute('data-filter');
                renderComments();
            });
        });

        // Escuchar el evento de cambio de vista del sidebar para recargar datos frescos
        window.addEventListener('admin:switch-view', (e) => {
            const targetView = e.detail && e.detail.view;
            if (!targetView) return;
            if (targetView === 'comments') {
                fetchComments();
            } else if (targetView === 'users') {
                fetchUsers();
            } else if (targetView === 'faqs') {
                fetchFaqs();
                fetchUnanswered();
            } else if (targetView === 'repairs') {
                fetchRepairs();
            } else if (targetView === 'builds') {
                fetchBuilds();
            }
        });

    } catch (err) {
        authLoading.innerHTML = `
            <i class="fa-solid fa-triangle-exclamation" style="color: #f59e0b; font-size: 3rem;"></i>
            <h2 style="color: #f1f5f9; margin-top: 10px;">Error</h2>
            <p>${err.message}</p>
            <button onclick="location.reload()" class="btn btn-outline" style="margin-top: 15px;">Reintentar</button>
        `;
    }
});

async function fetchComments() {
    try {
        const res = await fetch(`${API_BASE}/admin/comments`, INCLUDE_CREDENTIALS);
        if (!res.ok) throw new Error('Error al cargar comentarios');
        allComments = await res.json();
        renderComments();
    } catch (err) {
        showAdminNotice('Error: ' + err.message, 'error');
    }
    // Independiente del resultado de los comentarios locales: si esto falla
    // (p. ej. Google no configurado todavía) no debe romper la vista.
    await Promise.all([fetchGoogleReviews(), fetchGoogleSyncStatus()]);
}

async function fetchGoogleReviews() {
    try {
        const res = await fetch(`${API_BASE}/admin/google-reviews`, INCLUDE_CREDENTIALS);
        if (!res.ok) throw new Error('Error al cargar reseñas de Google');
        allGoogleReviews = await res.json();
        renderComments();
    } catch (err) {
        allGoogleReviews = [];
        console.error('[google-reviews]', err.message);
    }
}

async function fetchGoogleSyncStatus() {
    try {
        const res = await fetch(`${API_BASE}/admin/google-reviews/status`, INCLUDE_CREDENTIALS);
        if (!res.ok) throw new Error('No se pudo consultar el estado de sincronización');
        googleSyncStatus = await res.json();
    } catch (err) {
        googleSyncStatus = null;
        console.error('[google-reviews]', err.message);
    }
    renderGoogleSyncStatus();
}

const GOOGLE_STATUS_LABEL = {
    CONNECTED: { text: 'Conectado', cls: 'status-approved' },
    NEEDS_LOCATION: { text: 'Falta accountId/locationId', cls: 'status-pending' },
    NEEDS_AUTHORIZATION: { text: 'Necesita autorización', cls: 'status-pending' },
    NOT_CONFIGURED: { text: 'No configurado', cls: 'status-pending' }
};

function renderGoogleSyncStatus() {
    const box = document.getElementById('google-sync-status');
    if (!box) return;
    if (!googleSyncStatus) {
        box.innerHTML = '<span class="status-badge status-pending">Sin datos</span>';
        return;
    }
    const label = GOOGLE_STATUS_LABEL[googleSyncStatus.status] || GOOGLE_STATUS_LABEL.NOT_CONFIGURED;
    const lastSync = googleSyncStatus.lastSyncedAt
        ? new Date(googleSyncStatus.lastSyncedAt).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
        : 'nunca';
    const errorBadge = googleSyncStatus.lastSyncStatus === 'ERROR'
        ? `<span class="status-badge status-pending" title="${escapeHtml(googleSyncStatus.lastError || '')}"><i class="fa-solid fa-triangle-exclamation"></i> Error</span>`
        : '';
    const authorizeBtn = (googleSyncStatus.status === 'NEEDS_AUTHORIZATION')
        ? `<a class="btn-admin btn-approve" href="${API_BASE}/admin/google-reviews/oauth/start"><i class="fa-brands fa-google"></i> Autorizar con Google</a>`
        : '';
    box.innerHTML = `
        <span class="status-badge ${label.cls}">${escapeHtml(label.text)}</span>
        ${errorBadge}
        <span style="color:var(--a-text-dim); font-size:.78rem;">Última sincronización: ${lastSync}</span>
        ${authorizeBtn}
        <button class="btn-admin btn-outline" type="button" onclick="syncGoogleReviews(event)"><i class="fa-solid fa-rotate"></i> Sincronizar Google</button>
    `;
}

window.syncGoogleReviews = async function (evt) {
    const btn = evt?.target?.closest('button');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sincronizando…'; }
    try {
        const res = await fetch(`${API_BASE}/admin/google-reviews/sync`, { method: 'POST', headers: CSRF_HEADER, credentials: 'include' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            if (data.reason === 'EXTERNAL_REQUIRED') {
                showAdminNotice('Google todavía no está autorizado/configurado. Revisa el estado arriba.', 'error');
            } else {
                throw new Error(data.message || `Error al sincronizar (HTTP ${res.status})`);
            }
        } else {
            showAdminNotice(`Sincronizado: ${data.total} reseñas, ${data.newlyPending} nuevas pendientes.`, 'success');
        }
    } catch (err) {
        showAdminNotice(err.message, 'error');
    } finally {
        await Promise.all([fetchGoogleReviews(), fetchGoogleSyncStatus()]);
    }
};

async function fetchUsers() {
    try {
        const res = await fetch(`${API_BASE}/admin/users`, INCLUDE_CREDENTIALS);
        if (!res.ok) throw new Error('Error al cargar usuarios');
        const users = await res.json();
        allUsers = Array.isArray(users) ? users : [];
        renderUsers(allUsers);
    } catch (err) {
        console.error(err);
        allUsers = [];
        renderUsers([]);
    }
}

function renderUsers(users) {
    const tbody = document.getElementById('users-tbody');
    tbody.innerHTML = '';

    if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#64748b;">No hay usuarios registrados.</td></tr>`;
        return;
    }

    users.forEach(u => {
        const date = new Date(u.created_at).toLocaleString('es-MX', { 
            day: '2-digit', month: 'short', year: 'numeric'
        });

        const roleClass = u.role === 'admin' ? 'admin' : '';
        const phoneDisplay = u.phone ? escapeHtml(u.phone) : '<span class="user-phone-empty">Sin registrar</span>';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${escapeHtml(u.avatar)}" style="width:32px; height:32px; border-radius:50%;">
                    <span style="font-weight:600;">${escapeHtml(u.name)}</span>
                </div>
            </td>
            <td>${escapeHtml(u.email)}</td>
            <td>${phoneDisplay}</td>
            <td><span class="user-role-badge ${roleClass}">${u.role.toUpperCase()}</span></td>
            <td>${date}</td>
        `;
        tbody.appendChild(tr);
    });
}

/** Normaliza comentarios locales y reseñas de Google a una forma común para la grilla. */
function buildUnifiedCommentsList() {
    const local = allComments.map(c => ({
        uid: `local-${c.id}`,
        id: c.id,
        source: 'LOCAL',
        name: c.name,
        email: c.user_email || null,
        stars: c.stars,
        text: c.text,
        created_at: c.created_at,
        status: c.approved === 1 ? 'approved' : 'pending',
        review_url: null,
        reply: null
    }));
    const google = allGoogleReviews.map(r => ({
        uid: `google-${r.id}`,
        id: r.id,
        source: 'GOOGLE',
        name: r.name,
        email: null,
        stars: r.stars,
        text: r.text,
        created_at: r.created_at,
        status: r.status === 'APPROVED' ? 'approved' : (r.status === 'HIDDEN' ? 'hidden' : (r.status === 'REMOVED' ? 'removed' : 'pending')),
        review_url: r.review_url,
        reply: r.reply
    }));
    return [...google, ...local];
}

function renderComments() {
    const grid = document.getElementById('comments-grid');
    grid.innerHTML = '';

    const unified = buildUnifiedCommentsList();
    let filtered = unified;
    if (currentFilter === 'pending') filtered = unified.filter(c => c.status === 'pending');
    if (currentFilter === 'approved') filtered = unified.filter(c => c.status === 'approved');
    if (currentFilter === 'hidden') filtered = unified.filter(c => c.status === 'hidden');
    if (currentFilter === 'google') filtered = unified.filter(c => c.source === 'GOOGLE' && c.status !== 'removed');
    if (currentFilter === 'local') filtered = unified.filter(c => c.source === 'LOCAL');
    if (currentFilter === 'all') filtered = unified.filter(c => c.status !== 'removed');

    if (filtered.length === 0) {
        grid.innerHTML = `<div id="empty-state">Sin reseñas pendientes.</div>`;
        return;
    }

    filtered.forEach(c => {
        const date = new Date(c.created_at).toLocaleString('es-MX', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            starsHtml += i <= c.stars ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>';
        }

        const statusMeta = {
            approved: { cls: 'status-approved', icon: 'fa-check', text: 'Publicado' },
            pending: { cls: 'status-pending', icon: 'fa-clock', text: 'Pendiente' },
            hidden: { cls: 'status-pending', icon: 'fa-eye-slash', text: 'Oculto' }
        }[c.status] || { cls: 'status-pending', icon: 'fa-clock', text: 'Pendiente' };

        const sourceBadge = c.source === 'GOOGLE'
            ? '<span class="status-badge" style="background:#e8f0fe; color:#1a73e8;"><i class="fa-brands fa-google"></i> Google</span>'
            : '<span class="status-badge" style="background:#f1f5f9; color:#475569;">Local</span>';

        const actions = c.source === 'GOOGLE' ? `
                ${c.status !== 'approved' ? `<button class="btn-admin btn-approve" onclick="approveGoogleReview(${c.id})"><i class="fa-solid fa-check"></i> Aprobar</button>` : ''}
                ${c.status !== 'hidden' ? `<button class="btn-admin btn-delete" onclick="hideGoogleReview(${c.id})"><i class="fa-solid fa-eye-slash"></i> Ocultar</button>` : ''}
                ${c.review_url ? `<a class="btn-admin btn-outline" href="${escapeHtml(c.review_url)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-arrow-up-right-from-square"></i> Ver en Google</a>` : ''}
            ` : `
                ${c.status !== 'approved' ? `<button class="btn-admin btn-approve" onclick="approveComment(${c.id})"><i class="fa-solid fa-check"></i> Aprobar</button>` : ''}
                <button class="btn-admin btn-delete" onclick="deleteComment(${c.id})"><i class="fa-solid fa-trash"></i> Eliminar</button>
            `;

        const card = document.createElement('div');
        card.className = `admin-card ${c.status === 'approved' ? 'approved' : 'pending'}`;
        card.innerHTML = `
            <div class="card-header">
                <div>
                    <div class="card-user">${escapeHtml(c.name)}</div>
                    <div class="card-email">${c.email ? `<i class="fa-solid fa-envelope"></i> ${escapeHtml(c.email)}` : sourceBadge}</div>
                </div>
                <div class="status-badge ${statusMeta.cls}">
                    <i class="fa-solid ${statusMeta.icon}"></i> ${statusMeta.text}
                </div>
            </div>
            <div>
                <div class="card-stars">${starsHtml}</div>
                <div class="card-date">${date}${c.source === 'GOOGLE' ? ' · Reseña verificada de Google' : ''}</div>
            </div>
            <div class="card-text" onclick="this.classList.toggle('expanded')" title="Haz clic para expandir o contraer">${escapeHtml(c.text)}</div>
            ${c.reply ? `<div class="card-text" style="background:#f8fafc; font-size:.85rem;"><strong>Respuesta de Pixon PC:</strong> ${escapeHtml(c.reply.text)}</div>` : ''}
            <div class="card-actions">${actions}</div>
        `;
        grid.appendChild(card);
    });
}

window.approveGoogleReview = async function (id) {
    if (!confirmAdminAction('¿Aprobar esta reseña de Google para que aparezca públicamente?')) return;
    try {
        const res = await fetch(`${API_BASE}/admin/google-reviews/${id}/approve`, { method: 'POST', headers: CSRF_HEADER, credentials: 'include' });
        if (!res.ok) {
            const err = await res.json().catch(() => null);
            throw new Error(err?.message || `Error al aprobar (HTTP ${res.status})`);
        }
        const row = allGoogleReviews.find(r => r.id === id);
        if (row) row.status = 'APPROVED';
        renderComments();
    } catch (err) {
        showAdminNotice(err.message, 'error');
    }
};

window.hideGoogleReview = async function (id) {
    if (!confirmAdminAction('¿Ocultar esta reseña de la web? No se borra de Google ni de tu base de datos.')) return;
    try {
        const res = await fetch(`${API_BASE}/admin/google-reviews/${id}/hide`, { method: 'POST', headers: CSRF_HEADER, credentials: 'include' });
        if (!res.ok) {
            const err = await res.json().catch(() => null);
            throw new Error(err?.message || `Error al ocultar (HTTP ${res.status})`);
        }
        const row = allGoogleReviews.find(r => r.id === id);
        if (row) row.status = 'HIDDEN';
        renderComments();
    } catch (err) {
        showAdminNotice(err.message, 'error');
    }
};

window.approveComment = async function(id) {
    if (!confirmAdminAction('¿Seguro que deseas aprobar este comentario para que aparezca públicamente?')) return;
    try {
        const res = await fetch(`${API_BASE}/admin/comments/${id}/approve`, { method: 'POST', headers: CSRF_HEADER, credentials: 'include' });
        if (!res.ok) {
            const errData = await res.json().catch(() => null);
            const errMsg = errData?.error || `Error al aprobar (HTTP ${res.status})`;
            throw new Error(errMsg);
        }
        
        // Actualizar estado local
        const comment = allComments.find(c => c.id === id);
        if (comment) comment.approved = 1;
        renderComments();
    } catch (err) {
        showAdminNotice(err.message, 'error');
    }
};

window.deleteComment = async function(id) {
    if (!confirmAdminAction('¿Seguro que deseas eliminar definitivamente este comentario?')) return;
    try {
        const res = await fetch(`${API_BASE}/admin/comments/${id}`, { method: 'DELETE', headers: CSRF_HEADER, credentials: 'include' });
        if (!res.ok) {
            const errData = await res.json().catch(() => null);
            const errMsg = errData?.error || `Error al eliminar (HTTP ${res.status})`;
            throw new Error(errMsg);
        }
        
        // Eliminar localmente
        allComments = allComments.filter(c => c.id !== id);
        renderComments();
    } catch (err) {
        showAdminNotice(err.message, 'error');
    }
};

function connectSSE() {
    const liveIndicator = document.getElementById('live-indicator');
    
    try {
        const sse = new EventSource(`${API_BASE}/admin/comments/stream`);
        
        sse.onopen = () => {
            liveIndicator.style.display = 'inline-flex';
        };

        sse.onmessage = (e) => {
            try {
                const payload = JSON.parse(e.data);
                if (payload.type === 'google_review') {
                    // Reseña de Google sincronizada como PENDING: recarga desde
                    // el admin (la fila real ya vive en google_reviews) en vez
                    // de intentar reconstruirla a mano en el cliente.
                    fetchGoogleReviews();
                    window.PixonDashboard?.refresh({ quiet: true });
                    addNotification({
                        id: `new-google-review-${payload.review_id}`,
                        title: `Nueva reseña de Google pendiente`,
                        text: `Reseña de ${payload.name} (${payload.stars}★) requiere aprobación.`,
                        time: payload.created_at || new Date().toISOString(),
                        read: false
                    });
                    return;
                }
                const newComment = payload;
                // Evitar duplicados
                if (!allComments.some(c => c.id === newComment.id)) {
                    allComments.unshift(newComment); // Añadir al principio
                    renderComments();
                    window.PixonDashboard?.refresh({ quiet: true });
                    addNotification({
                        id: `new-comment-${newComment.id}`,
                        title: `Comentario pendiente`,
                        text: `Reseña de ${newComment.name} (${newComment.stars}★) requiere moderación.`,
                        time: newComment.created_at || new Date().toISOString(),
                        read: false
                    });
                }
            } catch(err) {
                console.error('SSE comment parse error:', err);
            }
        };

        sse.onerror = () => {
            if (liveIndicator) liveIndicator.style.display = 'none';
            sse.close();
            setTimeout(connectSSE, 10000);
        };
    } catch (err) {
        console.error('No SSE', err);
    }
}

let crmNotifications = [];

function updateNotificationsBadge() {
    const badge = document.getElementById('notifications-badge');
    if (!badge) return;
    const unreadCount = crmNotifications.filter(n => !n.read).length;
    if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

function renderNotifications() {
    const body = document.getElementById('notificationsDropdownBody');
    if (!body) return;
    if (crmNotifications.length === 0) {
        body.innerHTML = '<div class="empty-state" style="padding: 12px; text-align: center; color: var(--a-text-dim);">No tienes notificaciones pendientes</div>';
        return;
    }
    body.innerHTML = crmNotifications.map(n => `
        <div class="notification-item ${n.read ? '' : 'unread'}" data-notif-id="${n.id}" style="border-bottom: 1px solid var(--a-border); padding: 12px; cursor: pointer;">
            <div class="notification-item-title" style="font-weight: 700; font-size: 0.82rem; margin-bottom: 2px;">${escapeHtml(n.title)}</div>
            <div class="notification-item-text" style="font-size: 0.78rem; color: var(--a-text-muted);">${escapeHtml(n.text)}</div>
            <div class="notification-item-time" style="font-size: 0.7rem; color: var(--a-text-dim); margin-top: 4px;">${formatRepairDate(n.time)}</div>
        </div>
    `).join('');
}

function addNotification(notif) {
    if (crmNotifications.some(n => n.id === notif.id)) return;
    crmNotifications.unshift(notif);
    crmNotifications = crmNotifications.slice(0, 15);
    try {
        localStorage.setItem('crm_notifications_v1', JSON.stringify(crmNotifications));
    } catch (e) {}
    renderNotifications();
    updateNotificationsBadge();
}

function initNotifications() {
    try {
        const cached = localStorage.getItem('crm_notifications_v1');
        if (cached) crmNotifications = JSON.parse(cached);
    } catch (e) {}
    
    // Buscar también tickets 'new' y agregarlos si no están
    allRepairs.forEach(r => {
        if (r.status === 'new') {
            const clientName = getRepairClientName(r);
            addNotification({
                id: `new-ticket-${r.id}`,
                title: `Nuevo ticket #${r.ticket_code}`,
                text: `Cliente ${clientName} solicita revisión de ${r.device_type}.`,
                time: r.created_at,
                read: false
            });
        }
    });

    renderNotifications();
    updateNotificationsBadge();

    const bell = document.getElementById('notificationsBellBtn');
    const dropdown = document.getElementById('notificationsDropdown');
    if (bell && dropdown) {
        bell.addEventListener('click', (e) => {
            e.stopPropagation();
            const isShown = dropdown.classList.toggle('show');
            bell.setAttribute('aria-expanded', isShown ? 'true' : 'false');
            if (isShown) {
                crmNotifications.forEach(n => n.read = true);
                try {
                    localStorage.setItem('crm_notifications_v1', JSON.stringify(crmNotifications));
                } catch (e) {}
                updateNotificationsBadge();
                renderNotifications();
            }
        });
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && e.target !== bell && !bell.contains(e.target)) {
                dropdown.classList.remove('show');
                bell.setAttribute('aria-expanded', 'false');
            }
        });
    }

    document.getElementById('notificationsDropdownBody')?.addEventListener('click', (e) => {
        const item = e.target.closest('.notification-item');
        if (!item) return;
        const notifId = item.dataset.notifId;
        const ticketCodeMatch = notifId.match(/new-ticket-(\d+)/);
        if (ticketCodeMatch && ticketCodeMatch[1]) {
            openRepairTicket(ticketCodeMatch[1]);
            dropdown.classList.remove('show');
            bell.setAttribute('aria-expanded', 'false');
        }
    });
}

/* ─────────────────────────────────────────────────────────────
   UTILIDADES DE INTERFAZ
───────────────────────────────────────────────────────────── */
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function showAdminNotice(message, type = 'info') {
    let notice = document.getElementById('admin-notice');
    if (!notice) {
        notice = document.createElement('div');
        notice.id = 'admin-notice';
        notice.setAttribute('role', 'status');
        notice.setAttribute('aria-live', 'polite');
        notice.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:10000;max-width:min(92vw,420px);padding:14px 16px;border-radius:12px;color:#fff;font-weight:700;box-shadow:0 18px 50px rgba(0,0,0,.35);opacity:0;transform:translateY(10px);transition:opacity .2s ease,transform .2s ease;';
        document.body.appendChild(notice);
    }
    const colors = { success: '#16a34a', error: '#dc2626', warning: '#d97706', info: '#2563eb' };
    notice.textContent = message;
    notice.style.background = colors[type] || colors.info;
    notice.style.opacity = '1';
    notice.style.transform = 'translateY(0)';
    window.clearTimeout(showAdminNotice._timer);
    showAdminNotice._timer = window.setTimeout(() => {
        notice.style.opacity = '0';
        notice.style.transform = 'translateY(10px)';
    }, 4500);
}

function confirmAdminAction(message) {
    return window.confirm(message);
}

/* ─────────────────────────────────────────────────────────────
   FAQ AND UNANSWERED LOGIC
───────────────────────────────────────────────────────────── */
let allFaqs = [];
let allUnanswered = [];
let openFaqCategories = new Set();

async function fetchFaqs() {
    try {
        const res = await fetch(`${API_BASE}/faqs`);
        if (!res.ok) throw new Error('Error al cargar FAQs');
        allFaqs = await res.json();
        renderFaqs();
    } catch (err) {
        console.error(err);
    }
}

async function fetchUnanswered() {
    try {
        const res = await fetch(`${API_BASE}/admin/faqs/unanswered`, INCLUDE_CREDENTIALS);
        if (!res.ok) throw new Error('Error al cargar búsquedas sin respuesta');
        allUnanswered = await res.json();
        renderUnanswered();
    } catch (err) {
        console.error(err);
    }
}

function renderUnanswered() {
    const tbody = document.getElementById('unanswered-tbody');
    if(!tbody) return;
    tbody.innerHTML = '';

    if (allUnanswered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#64748b;">No hay búsquedas sin respuesta.</td></tr>`;
        return;
    }

    allUnanswered.forEach(u => {
        const date = u.last_seen ? new Date(u.last_seen).toLocaleString('es-MX', { 
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        }) : '-';
        
        const countColor = u.count > 2 ? '#ef4444' : '#f59e0b';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 600;">${escapeHtml(u.query)}</td>
            <td style="color:${countColor}; font-weight:700;">${u.count}</td>
            <td style="font-size: 0.85rem; color:#94a3b8;">${date}</td>
            <td><button type="button" class="btn-admin btn-approve" data-create-faq-query="${escapeHtml(u.query)}"><i class="fa-solid fa-plus"></i> Crear FAQ</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function renderFaqs() {
    const container = document.getElementById('faqs-container');
    if(!container) return;
    container.innerHTML = '';

    const normalizeFaqSearch = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
    const searchTerm = normalizeFaqSearch(document.getElementById('faqSearchInput')?.value || '');
    const searchTokens = searchTerm.split(' ').filter(Boolean);
    const categoryFilter = document.getElementById('faqCategoryFilter')?.value || 'all';

    let filtered = allFaqs;
    if (searchTerm) {
        filtered = allFaqs.filter(f => {
            const haystack = normalizeFaqSearch(`${f.question} ${f.answer} ${f.category}`);
            return searchTokens.every(token => haystack.includes(token));
        });
    }
    if (categoryFilter !== 'all') {
        filtered = filtered.filter(f => f.category === categoryFilter);
    }

    if (filtered.length === 0) {
        container.innerHTML = `<div id="empty-state">No se encontraron preguntas frecuentes.</div>`;
        return;
    }

    // Group by category
    const grouped = {};
    filtered.forEach(f => {
        if(!grouped[f.category]) grouped[f.category] = { icon: f.icon, items: [] };
        grouped[f.category].items.push(f);
    });

    // Populate datalist (always with allFaqs, not filtered)
    const datalist = document.getElementById('faqCategoriesList');
    if(datalist) {
        const uniqueCategories = [...new Set(allFaqs.map(f => f.category))];
        datalist.innerHTML = uniqueCategories.map(cat => `<option value="${escapeHtml(cat)}">`).join('');
    }
    const categorySelect = document.getElementById('faqCategoryFilter');
    if (categorySelect) {
        const current = categorySelect.value || 'all';
        const uniqueCategories = [...new Set(allFaqs.map(f => f.category))].sort((a, b) => a.localeCompare(b, 'es'));
        categorySelect.innerHTML = '<option value="all">Todas las categorias</option>' + uniqueCategories.map(cat => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`).join('');
        categorySelect.value = uniqueCategories.includes(current) ? current : 'all';
    }

    for (const [cat, data] of Object.entries(grouped)) {
        // Sort items by display order
        data.items.sort((a, b) => a.display_order - b.display_order);

        const catSection = document.createElement('div');
        catSection.className = 'faq-category-admin-block';
        const safeCatId = btoa(unescape(encodeURIComponent(cat))).replace(/=+$/g, '');
        const isOpen = openFaqCategories.has(cat) || Boolean(searchTerm) || categoryFilter !== 'all';
        if (isOpen) openFaqCategories.add(cat);
        catSection.innerHTML = `
            <button type="button" class="faq-category-toggle" aria-expanded="${isOpen}" data-category="${escapeHtml(cat)}" aria-controls="faq-cat-${safeCatId}">
                <span><i class="${data.icon || 'fa-solid fa-circle-question'}"></i> ${escapeHtml(cat)}</span>
                <small>${data.items.length} pregunta(s)</small>
                <i class="fa-solid fa-chevron-down faq-category-chevron"></i>
            </button>`;
        
        const grid = document.createElement('div');
        grid.className = `admin-grid faq-category-items ${isOpen ? 'open' : ''}`;
        grid.id = `faq-cat-${safeCatId}`;
        grid.style.marginTop = '15px';

        data.items.forEach(f => {
            const card = document.createElement('div');
            card.className = 'admin-card faq-admin-card';
            card.innerHTML = `
                <div class="card-header">
                    <div>
                        <div class="card-user" style="font-size: 1rem;">${escapeHtml(f.question)}</div>
                    </div>
                    <div class="status-badge" style="background: rgba(99, 102, 241, 0.15); color: #818cf8;">
                        ID: ${f.id}
                    </div>
                </div>
                <div class="card-text" onclick="this.classList.toggle('expanded')" title="Haz clic para expandir o contraer" style="margin-top:10px;">${escapeHtml(f.answer.replace(/<br\s*[\/]?>/gi, '\n'))}</div>
                <div style="font-size: 0.75rem; color:#64748b; margin-top:5px;">Orden: ${f.display_order}</div>
                <div class="card-actions" style="margin-top:15px;">
                    <button class="btn-admin" style="background: rgba(255, 255, 255, 0.1); color: #f8fafc;" onclick="editAdminFaq(${f.id})">
                        <i class="fa-solid fa-pen"></i> Editar
                    </button>
                    <button class="btn-admin btn-delete" onclick="deleteAdminFaq(${f.id})">
                        <i class="fa-solid fa-trash"></i> Eliminar
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });

        catSection.appendChild(grid);
        container.appendChild(catSection);
    }
    const summary = document.getElementById('faqFilterSummary');
    if (summary) {
        summary.textContent = `${filtered.length} pregunta(s) en ${Object.keys(grouped).length} categoria(s). Las categorias se mantienen comprimidas hasta que las abras.`;
    }
}

// Escuchar búsqueda en tiempo real
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('faqSearchInput');
    let faqSearchTimer;
    if(searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(faqSearchTimer);
            faqSearchTimer = setTimeout(renderFaqs, 120);
        });
    }
    document.getElementById('faqCategoryFilter')?.addEventListener('change', renderFaqs);
    document.getElementById('faqExpandAll')?.addEventListener('click', () => {
        openFaqCategories = new Set(allFaqs.map(f => f.category));
        renderFaqs();
    });
    document.getElementById('faqCollapseAll')?.addEventListener('click', () => {
        openFaqCategories.clear();
        document.getElementById('faqSearchInput')?.blur();
        renderFaqs();
    });
    document.addEventListener('click', (event) => {
        const createButton = event.target.closest('[data-create-faq-query]');
        if (createButton) {
            addNewFaq(createButton.dataset.createFaqQuery || '');
            return;
        }
        const toggle = event.target.closest('.faq-category-toggle');
        if (!toggle) return;
        const category = toggle.dataset.category;
        if (!category) return;
        if (openFaqCategories.has(category)) openFaqCategories.delete(category);
        else openFaqCategories.add(category);
        renderFaqs();
    });
});

window.clearUnanswered = async function() {
    if (!confirmAdminAction('¿Seguro que deseas vaciar el registro de búsquedas sin respuesta?')) return;
    try {
        const res = await fetch(`${API_BASE}/admin/faqs/unanswered`, { method: 'DELETE', headers: CSRF_HEADER, credentials: 'include' });
        if (!res.ok) throw new Error('Error al limpiar');
        allUnanswered = [];
        renderUnanswered();
    } catch (err) {
        showAdminNotice(err.message, 'error');
    }
};

window.addNewFaq = function(prefillQuestion = '') {
    document.getElementById('faqModalTitle').textContent = 'Nueva Pregunta';
    document.getElementById('faqId').value = '';
    document.getElementById('faqCategory').value = '';
    document.getElementById('faqIcon').value = 'fa-solid fa-circle-question';
    document.getElementById('faqQuestion').value = prefillQuestion;
    document.getElementById('faqAnswer').value = '';
    document.getElementById('faqOrder').value = '0';
    
    document.getElementById('faqModalOverlay').classList.add('show');
    requestAnimationFrame(() => {
        const target = prefillQuestion ? document.getElementById('faqAnswer') : document.getElementById('faqCategory');
        target?.focus();
    });
};

window.editAdminFaq = function(id) {
    const faq = allFaqs.find(f => f.id === id);
    if(!faq) return;

    document.getElementById('faqModalTitle').textContent = 'Editar Pregunta';
    document.getElementById('faqId').value = faq.id;
    document.getElementById('faqCategory').value = faq.category;
    document.getElementById('faqIcon').value = faq.icon;
    document.getElementById('faqQuestion').value = faq.question;
    // Replace <br> back to newlines for the textarea
    document.getElementById('faqAnswer').value = faq.answer.replace(/<br\s*[\/]?>/gi, '\n');
    document.getElementById('faqOrder').value = faq.display_order;

    document.getElementById('faqModalOverlay').classList.add('show');
};

window.closeFaqModal = function() {
    document.getElementById('faqModalOverlay').classList.remove('show');
};

window.saveFaqModal = async function() {
    const id = document.getElementById('faqId').value;
    const category = document.getElementById('faqCategory').value.trim();
    const icon = document.getElementById('faqIcon').value.trim() || 'fa-solid fa-circle-question';
    const question = document.getElementById('faqQuestion').value.trim();
    let answer = document.getElementById('faqAnswer').value.trim();
    const order = document.getElementById('faqOrder').value.trim();

    if(!category || !question || !answer) {
        showAdminNotice('Por favor, completa Categoria, Pregunta y Respuesta.', 'warning');
        return;
    }

    // Convert newlines to <br> to support HTML rendering automatically
    answer = answer.replace(/\n/g, '<br>');

    const payload = { category, icon, question, answer, display_order: parseInt(order||0) };
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_BASE}/admin/faqs/${id}` : `${API_BASE}/admin/faqs`;

    try {
        const res = await fetch(url, {
            method: method,
            headers: JSON_HEADERS,
            credentials: 'include',
            body: JSON.stringify(payload)
        });
        if(!res.ok) throw new Error('Error al guardar la FAQ');
        await fetchFaqs();
        closeFaqModal();
    } catch(err) {
        showAdminNotice(err.message, 'error');
    }
};

window.deleteAdminFaq = async function(id) {
    if (!confirmAdminAction('¿Seguro que deseas eliminar esta pregunta frecuente?')) return;
    try {
        const res = await fetch(`${API_BASE}/admin/faqs/${id}`, { method: 'DELETE', headers: CSRF_HEADER, credentials: 'include' });
        if (!res.ok) throw new Error('Error al eliminar FAQ');
        await fetchFaqs();
    } catch (err) {
        showAdminNotice(err.message, 'error');
    }
};

/* ─────────────────────────────────────────────────────────────
   TALLER (REPAIRS) LOGIC
───────────────────────────────────────────────────────────── */
async function fetchRepairs() {
    try {
        const res = await fetch(`${API_BASE}/admin/repairs`, INCLUDE_CREDENTIALS);
        if (!res.ok) throw new Error('Error al cargar tickets');
        allRepairs = await res.json();
        populateRepairFilters();
        renderRepairs();
        renderMyJourney();
    } catch (err) {
        console.error(err);
    }
}

async function fetchTechnicians() {
    try {
        const res = await fetch(`${API_BASE}/admin/technicians`, INCLUDE_CREDENTIALS);
        if (!res.ok) throw new Error('No se pudo cargar el equipo técnico');
        availableTechnicians = await res.json();
    } catch (err) {
        console.warn('No se pudo cargar el equipo técnico.', err);
        availableTechnicians = [];
    }
}

const REPAIR_STATUS_LABELS = {
    new: 'Nuevo',
    received: 'Recibido',
    diagnosing: 'En revisión',
    contacted: 'Contactado',
    quoted: 'Cotizado',
    approved: 'Aprobado',
    in_progress: 'En proceso',
    waiting_parts: 'Esperando piezas',
    ready: 'Listo para entrega',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
    eliminado: 'Eliminado'
};

const REPAIR_STATUS_COLORS = {
    new: '#38bdf8',
    received: '#3b82f6',
    diagnosing: '#f59e0b',
    contacted: '#06b6d4',
    quoted: '#8b5cf6',
    approved: '#10b981',
    in_progress: '#f97316',
    waiting_parts: '#64748b',
    ready: '#14b8a6',
    delivered: '#059669',
    cancelled: '#ef4444',
    eliminado: '#ef4444'
};

const REPAIR_DEVICE_SERVICE_OPTIONS = window.PIXON_TICKET_OPTIONS?.services || {
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
    'Equipo empresarial / B2B': ['Mantenimiento preventivo empresarial', 'Mantenimiento de flotilla', 'Póliza de soporte', 'Instalación de red', 'Otro'],
    'Otro': ['Otro']
};

const REPAIR_PRIORITY_OPTIONS = window.PIXON_TICKET_OPTIONS?.priorities || {
    normal: { label: 'Normal', aliases: ['normal'] },
    urgent: { label: 'Lo necesito lo antes posible', aliases: ['urgente', 'lo necesito lo antes posible', 'express', 'hoy'] },
    work_school: { label: 'Es para trabajo / escuela', aliases: ['trabajo/escuela', 'trabajo / escuela', 'trabajo', 'escuela'] },
    quote: { label: 'Solo quiero cotizar', aliases: ['solo cotizar', 'cotizar', 'cotizacion', 'cotización'] }
};

const APPOINTMENT_STATUS_LABELS = {
    pendiente_confirmacion: 'Pendiente de confirmación',
    confirmada: 'Confirmada',
    reagendada: 'Reagendada',
    cancelada: 'Cancelada',
    completada: 'Completada'
};

const APPOINTMENT_TYPE_VALUES = ['Recepción de equipo', 'Diagnóstico', 'Entrega de equipo', 'Otro'];
const WEEKDAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function normalizeText(value) {
    return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function findCanonicalRepairService(value) {
    const target = normalizeText(value);
    if (!target) return '';
    const stopWords = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'por', 'para', 'y']);
    const targetTokens = target.split(/[^a-z0-9]+/).filter(token => token && !stopWords.has(token));
    const services = getAllRepairServices().map(service => ({ service, value: normalizeText(service) })).filter(item => item.value);
    return services.find(item => item.value === target)?.service
        || services.find(item => item.value.includes(target))?.service
        || services.find(item => targetTokens.length > 0 && targetTokens.every(token => item.value.includes(token)))?.service
        || services.find(item => target.includes(item.value))?.service
        || '';
}

function inferRepairService(repair) {
    const text = normalizeText(`${repair.reported_issue} ${repair.notes_internal} ${repair.device_type} ${repair.device_brand} ${repair.device_model}`);
    const explicit = String(repair.reported_issue || '').match(/Servicio solicitado:\s*([^\n\r]+)/i);
    if (explicit?.[1]) {
        const explicitService = explicit[1].trim();
        return findCanonicalRepairService(explicitService) || explicitService;
    }
    for (const services of Object.values(REPAIR_DEVICE_SERVICE_OPTIONS)) {
        const match = services.find(service => service !== 'Otro' && text.includes(normalizeText(service)));
        if (match) return match;
    }
    if (/pantalla|display|lcd|cristal|touch/.test(text)) return 'Pantalla';
    if (/bateria|carga|cargador|energia|no carga/.test(text)) return 'Bateria / carga';
    if (/teclado|tecla|keyboard/.test(text)) return 'Teclado';
    if (/bisagra|carcasa|tapa/.test(text)) return 'Bisagra / carcasa';
    if (/liquido|agua|cafe|sulfat|humedad|mojado/.test(text)) return 'Liquido / sulfatacion';
    if (/lento|windows|formateo|virus|software|optimiz/.test(text)) return 'Software / optimizacion';
    if (/limpieza|temperatura|calienta|pasta|ventilador/.test(text)) return 'Mantenimiento termico';
    if (/hdmi|control|joystick|consola|xbox|playstation|ps5|ps4/.test(text)) return 'Consola / control';
    return 'Diagnóstico general';
}

function getRepairIssueDescription(repair) {
    let text = String(repair.reported_issue || '').replace(/Servicio solicitado:\s*[^\n\r]+/i, '').trim();
    text = text.split(/\n---\n?/)[0].trim();
    return text || String(repair.reported_issue || '').trim();
}

function getRepairContactEmail(repair) {
    return repair.contact_email || repair.user_email || '';
}

function getRepairClientName(repair) {
    const internalName = String(repair.notes_internal || '').match(/Cliente:\s*([^\n\r]+)/i)?.[1]?.trim();
    return repair.user_name || internalName || 'Cliente sin registrar';
}

function renderRepairStatusTrack(status) {
    const steps = ['received', 'diagnosing', 'quoted', 'approved', 'in_progress', 'ready', 'delivered'];
    const currentIndex = Math.max(0, steps.indexOf(status));
    return `
        <div class="repair-status-track" aria-label="Progreso del ticket">
            ${steps.map((step, index) => `
                <div class="repair-status-step ${index < currentIndex ? 'done' : ''} ${index === currentIndex ? 'current' : ''}">
                    <span></span>
                    <small>${escapeHtml(REPAIR_STATUS_LABELS[step] || step)}</small>
                </div>
            `).join('')}
        </div>`;
}

function inferRepairUrgency(repair) {
    const text = normalizeText(`${repair.reported_issue} ${repair.notes_internal} ${repair.status}`);
    const createdAt = repair.created_at ? new Date(repair.created_at).getTime() : Date.now();
    const ageHours = (Date.now() - createdAt) / 36e5;
    const priorityMatch = String(repair.reported_issue || repair.notes_internal || '').match(/Urgencia:\s*([^\n\r]+)/i);
    const priorityText = normalizeText(priorityMatch?.[1] || repair.priority || '');
    if (priorityText) {
        if (REPAIR_PRIORITY_OPTIONS.urgent.aliases.some(alias => priorityText.includes(alias)) || priorityText === 'urgent' || priorityText === 'high') return 'urgent';
        if (REPAIR_PRIORITY_OPTIONS.work_school.aliases.some(alias => priorityText.includes(alias))) return 'work_school';
        if (REPAIR_PRIORITY_OPTIONS.quote.aliases.some(alias => priorityText.includes(alias)) || priorityText === 'low') return 'quote';
        if (REPAIR_PRIORITY_OPTIONS.normal.aliases.some(alias => priorityText.includes(alias)) || priorityText === 'normal') return 'normal';
    }
    if (/urgente|hoy|express|no enciende|no prende|liquido|mojado|agua|cafe|humo|quemado|empresa|factura/.test(text)) return 'urgent';
    if (['received', 'diagnosing', 'in_progress', 'waiting_parts'].includes(repair.status) && ageHours > 48) return 'urgent';
    if (/pantalla|bateria|carga|teclado|bisagra|lento|virus/.test(text)) return 'work_school';
    return 'normal';
}

function populateSelectOptions(selectId, values, allLabel, labelMap = {}) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const current = select.value || 'all';
    const unique = [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'es'));
    select.innerHTML = `<option value="all">${allLabel}</option>` + unique.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(labelMap[value] || value)}</option>`).join('');
    select.value = unique.includes(current) ? current : 'all';
}

function populateRepairFilters() {
    const priorityLabels = Object.fromEntries(Object.entries(REPAIR_PRIORITY_OPTIONS).map(([key, data]) => [key, data.label]));
    populateSelectOptions('repairStatusFilter', ['active', 'overdue', ...Object.keys(REPAIR_STATUS_LABELS)], 'Todos', {
        active: 'Activos', overdue: 'Atrasados', ...REPAIR_STATUS_LABELS
    });
    populateSelectOptions('repairDeviceFilter', Object.keys(REPAIR_DEVICE_SERVICE_OPTIONS), 'Todos');
    populateSelectOptions('repairUrgencyFilter', Object.keys(REPAIR_PRIORITY_OPTIONS), 'Todas', priorityLabels);
    refreshRepairServiceFilterOptions();
}

function refreshRepairServiceFilterOptions() {
    const device = document.getElementById('repairDeviceFilter')?.value || 'all';
    const services = device === 'all'
        ? getAllRepairServices()
        : (REPAIR_DEVICE_SERVICE_OPTIONS[device] || ['Otro']);
    populateSelectOptions('repairServiceFilter', services, 'Todos');
}

function getRepairFilters() {
    return {
        search: normalizeText(document.getElementById('repairSearchInput')?.value || ''),
        status: document.getElementById('repairStatusFilter')?.value || 'all',
        urgency: document.getElementById('repairUrgencyFilter')?.value || 'all',
        device: document.getElementById('repairDeviceFilter')?.value || 'all',
        service: document.getElementById('repairServiceFilter')?.value || 'all'
    };
}

function filterRepairs() {
    const filters = getRepairFilters();
    const activeStatuses = new Set(['new', 'received', 'diagnosing', 'contacted', 'quoted', 'approved', 'in_progress', 'waiting_parts', 'ready']);
    const now = Date.now();
    return allRepairs.filter(r => {
        const service = inferRepairService(r);
        const clientName = getRepairClientName(r);
        const urgency = inferRepairUrgency(r);
        const haystack = normalizeText([r.ticket_code, clientName, r.user_email, r.contact_email, r.contact_phone, r.device_type, r.device_brand, r.device_model, r.reported_issue, r.notes_internal, service, REPAIR_STATUS_LABELS[r.status] || r.status].join(' '));
        const promisedAt = r.promised_at ? new Date(r.promised_at).getTime() : NaN;
        const matchesStatus = filters.status === 'all'
            || r.status === filters.status
            || (filters.status === 'active' && activeStatuses.has(r.status))
            || (filters.status === 'overdue' && Number.isFinite(promisedAt) && promisedAt < now && activeStatuses.has(r.status));
        return (!filters.search || haystack.includes(filters.search))
            && matchesStatus
            && (filters.urgency === 'all' || urgency === filters.urgency)
            && (filters.device === 'all' || normalizeText(r.device_type) === normalizeText(filters.device))
            && (filters.service === 'all' || normalizeText(service) === normalizeText(filters.service));
    });
}

function getAllRepairServices() {
    return [...new Set(Object.values(REPAIR_DEVICE_SERVICE_OPTIONS).flat())];
}

function formatRepairDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatRepairDateTimeInput(value) {
    if (!value) return '';
    return String(value).replace(' ', 'T').slice(0, 16);
}

function formatRepairMoney(value) {
    if (value === null || value === undefined || value === '') return '-';
    const amount = Number(value);
    if (Number.isNaN(amount)) return String(value);
    return amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function repairValue(value) {
    return value === null || value === undefined || String(value).trim() === '' ? 'No especificado' : String(value);
}

function parseRepairLine(text, label) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return String(text || '').match(new RegExp(`${escaped}:\\s*([^\\n\\r]+)`, 'i'))?.[1]?.trim() || '';
}

function parseRepairDetails(repair) {
    const reported = String(repair.reported_issue || '');
    const notes = String(repair.notes_internal || '');
    const service = parseRepairLine(reported, 'Servicio solicitado') || inferRepairService(repair);
    const description = getRepairIssueDescription(repair);
    const sourcePage = parseRepairLine(reported, 'Pagina de origen') || parseRepairLine(reported, 'Página de origen') || parseRepairLine(notes, 'Pagina de origen') || parseRepairLine(notes, 'Página de origen');
    const contactPref = parseRepairLine(reported, 'Contacto pref.') || parseRepairLine(reported, 'Contacto preferido') || parseRepairLine(notes, 'Contacto pref.');
    const turnsOn = parseRepairLine(reported, 'Enciende') || parseRepairLine(notes, 'Enciende');
    const liquid = parseRepairLine(reported, 'Liquidos') || parseRepairLine(reported, 'Líquidos') || parseRepairLine(notes, 'Liquidos') || parseRepairLine(notes, 'Líquidos');
    const previousRepair = parseRepairLine(reported, 'Reparacion previa') || parseRepairLine(reported, 'Reparación previa') || parseRepairLine(notes, 'Reparacion previa') || parseRepairLine(notes, 'Reparación previa');
    const imagesRaw = parseRepairLine(reported, 'Imagenes') || parseRepairLine(reported, 'Imágenes') || parseRepairLine(notes, 'Imagenes') || parseRepairLine(notes, 'Imágenes');
    const images = imagesRaw ? imagesRaw.split(/[,|]/).map(item => item.trim()).filter(Boolean) : [];
    const b2bLine = String(notes.match(/B2B Info:\s*([^\n\r]+)/i)?.[1] || '');
    const b2b = {
        company: parseRepairLine(notes, 'Empresa') || b2bLine.match(/Empresa:\s*([^,]+)/i)?.[1]?.trim() || '',
        quantity: parseRepairLine(notes, 'Cantidad') || b2bLine.match(/Cantidad:\s*([^,]+)/i)?.[1]?.trim() || '',
        type: parseRepairLine(notes, 'Tipo') || b2bLine.match(/Tipo:\s*([^,]+)/i)?.[1]?.trim() || '',
        frequency: parseRepairLine(notes, 'Frecuencia') || parseRepairLine(notes, 'Frec') || b2bLine.match(/Frec:\s*([^,]+)/i)?.[1]?.trim() || '',
        invoice: parseRepairLine(notes, 'Factura') || b2bLine.match(/Factura:\s*([^,]+)/i)?.[1]?.trim() || '',
        comments: parseRepairLine(notes, 'Comentarios empresariales') || ''
    };
    const isB2b = Boolean(repair.is_b2b || normalizeText(repair.device_type).includes('b2b') || normalizeText(repair.device_type).includes('empresarial') || b2bLine || b2b.company);
    return { service, description, sourcePage, contactPref, turnsOn, liquid, previousRepair, images, b2b, isB2b };
}

function setupRepairModalOptions() {
    const typeSelect = document.getElementById('repairType');
    const prioritySelect = document.getElementById('repairPriority');
    if (typeSelect && !typeSelect.dataset.ready) {
        typeSelect.innerHTML = Object.keys(REPAIR_DEVICE_SERVICE_OPTIONS)
            .map(device => `<option value="${escapeHtml(device)}">${escapeHtml(device)}</option>`)
            .join('');
        typeSelect.dataset.ready = '1';
        typeSelect.addEventListener('change', () => {
            syncRepairDeviceOther();
            updateRepairModalServices();
        });
    }
    if (prioritySelect && !prioritySelect.dataset.ready) {
        prioritySelect.innerHTML = Object.entries(REPAIR_PRIORITY_OPTIONS)
            .map(([value, data]) => `<option value="${escapeHtml(value)}">${escapeHtml(data.label)}</option>`)
            .join('');
        prioritySelect.dataset.ready = '1';
    }
    const serviceSelect = document.getElementById('repairService');
    if (serviceSelect && !serviceSelect.dataset.ready) {
        serviceSelect.addEventListener('change', syncRepairServiceOther);
        serviceSelect.dataset.ready = '1';
    }
    updateRepairModalServices();
    syncRepairDeviceOther();
}

function updateRepairModalServices() {
    const typeSelect = document.getElementById('repairType');
    const serviceSelect = document.getElementById('repairService');
    if (!typeSelect || !serviceSelect) return;
    const current = serviceSelect.value;
    const services = REPAIR_DEVICE_SERVICE_OPTIONS[typeSelect.value] || ['Otro'];
    serviceSelect.innerHTML = services.map(service => `<option value="${escapeHtml(service)}">${escapeHtml(service)}</option>`).join('');
    serviceSelect.value = services.includes(current) ? current : services[0];
    syncRepairServiceOther();
}

function syncRepairDeviceOther() {
    const typeSelect = document.getElementById('repairType');
    const otherWrap = document.getElementById('repairDeviceOtherWrap');
    const otherInput = document.getElementById('repairDeviceOther');
    const needsOther = typeSelect?.value === 'Otro';
    if (otherWrap) otherWrap.style.display = needsOther ? 'block' : 'none';
    if (otherInput) otherInput.required = Boolean(needsOther);
}

function syncRepairServiceOther() {
    const serviceSelect = document.getElementById('repairService');
    const otherWrap = document.getElementById('repairServiceOtherWrap');
    const otherInput = document.getElementById('repairServiceOther');
    const needsOther = serviceSelect?.value === 'Otro';
    if (otherWrap) otherWrap.style.display = needsOther ? 'block' : 'none';
    if (otherInput) otherInput.required = Boolean(needsOther);
}

function renderRepairField(label, value) {
    return `<div class="repair-ticket-field"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(repairValue(value))}</span></div>`;
}

function renderRepairText(label, value) {
    return `<div class="repair-ticket-text"><strong>${escapeHtml(label)}</strong><p>${escapeHtml(repairValue(value))}</p></div>`;
}

function renderRepairStatusOptions(current) {
    return Object.entries(REPAIR_STATUS_LABELS)
        .map(([value, label]) => `<option value="${escapeHtml(value)}" ${value === current ? 'selected' : ''}>${escapeHtml(label)}</option>`)
        .join('');
}

function renderRepairPriorityOptions(current) {
    const labels = { low: 'Baja', normal: 'Normal', high: 'Alta', urgent: 'Urgente' };
    return Object.entries(labels)
        .map(([value, label]) => `<option value="${escapeHtml(value)}" ${value === current ? 'selected' : ''}>${escapeHtml(label)}</option>`)
        .join('');
}

function renderAppointmentStatusOptions(current) {
    return Object.entries(APPOINTMENT_STATUS_LABELS)
        .map(([value, label]) => `<option value="${escapeHtml(value)}" ${value === current ? 'selected' : ''}>${escapeHtml(label)}</option>`)
        .join('');
}

function renderAppointmentTypeOptions(current) {
    return APPOINTMENT_TYPE_VALUES
        .map(value => `<option value="${escapeHtml(value)}" ${normalizeText(value) === normalizeText(current) ? 'selected' : ''}>${escapeHtml(value)}</option>`)
        .join('');
}

function renderAppointmentTypeLabel(value) {
    const normalized = normalizeText(value);
    return APPOINTMENT_TYPE_VALUES.find(item => normalizeText(item) === normalized) || value || 'Recepción de equipo';
}

function renderTechnicianOptions(currentId) {
    const options = availableTechnicians.map((technician) => `<option value="${escapeHtml(technician.id)}" ${String(technician.id) === String(currentId || '') ? 'selected' : ''}>${escapeHtml(technician.name)}</option>`).join('');
    return `<option value="">Sin asignar</option>${options}`;
}

let lastActiveTriggerElement = null;

function renderRepairDetailModal(ticket) {
    activeRepairTicket = ticket;
    const details = parseRepairDetails(ticket);
    const clientName = getRepairClientName(ticket);
    const contactEmail = getRepairContactEmail(ticket);
    const statusColor = REPAIR_STATUS_COLORS[ticket.status] || '#cbd5e1';
    const urgency = inferRepairUrgency(ticket);
    const urgencyLabel = REPAIR_PRIORITY_OPTIONS[urgency]?.label || repairValue(ticket.priority);
    const nextAction = ticket.next_action || 'Revisar expediente';
    const cleanPhone = String(ticket.contact_phone || '').replace(/\D/g, '');
    const waMessage = encodeURIComponent(`Hola ${clientName}, te contactamos de Pixon PC sobre tu ticket #${ticket.ticket_code}.`);
    const waHref = cleanPhone ? `https://wa.me/52${cleanPhone}?text=${waMessage}` : '';
    const overlay = document.getElementById('repairDetailOverlay');
    const title = document.getElementById('repairDetailTitle');
    const meta = document.getElementById('repairDetailMeta');
    const body = document.getElementById('repairDetailBody');
    const saveMessage = document.getElementById('repairDetailSaveMessage');

    if (!overlay || !title || !meta || !body) return;
    title.textContent = `Ticket #${ticket.ticket_code}`;
    meta.innerHTML = `
        <span style="background:${statusColor}20;color:${statusColor};border-color:${statusColor}40;">Estado: ${escapeHtml(REPAIR_STATUS_LABELS[ticket.status] || repairValue(ticket.status))}</span>
        <span>Urgencia: ${escapeHtml(urgencyLabel)}</span>
        <span style="background:rgba(99,102,241,0.15);color:#818cf8;border-color:rgba(99,102,241,0.3);">Siguiente paso: ${escapeHtml(nextAction)}</span>
        <span>Creado: ${escapeHtml(formatRepairDate(ticket.created_at))}</span>
        ${details.isB2b ? '<span>B2B / Empresarial</span>' : ''}
    `;
    if (saveMessage) saveMessage.textContent = '';

    body.innerHTML = `
        <section class="repair-ticket-overview" aria-label="Resumen operativo">
            <div><small>Siguiente acción</small><strong>${escapeHtml(nextAction)}</strong></div>
            <div><small>Cliente</small><strong>${escapeHtml(clientName)}</strong></div>
            <div><small>Saldo</small><strong>${escapeHtml(ticketBalanceLabel(ticket))}</strong></div>
            <label><span>Responsable</span><select id="repairDetailAssignee" class="admin-input">${renderTechnicianOptions(ticket.technician_id)}</select></label>
        </section>
        <div class="repair-ticket-columns">
            <div class="repair-ticket-column">
                <section class="repair-ticket-section repair-ticket-client-section">
                    <h3>Datos del cliente</h3>
                    <div class="repair-ticket-field-grid">
                        ${renderRepairField('Nombre completo', clientName)}
                        ${renderRepairField('WhatsApp / teléfono', ticket.contact_phone)}
                        ${renderRepairField('Correo', contactEmail)}
                        ${renderRepairField('Medio de contacto preferido', details.contactPref)}
                    </div>
                    ${waHref ? `<a class="btn-admin btn-approve repair-ticket-whatsapp" href="${waHref}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> Contactar por WhatsApp</a>` : ''}
                </section>

                <section class="repair-ticket-section repair-ticket-device-section">
                    <h3>Equipo / dispositivo</h3>
                    <div class="repair-ticket-field-grid">
                        ${renderRepairField('Dispositivo', ticket.device_type)}
                        ${renderRepairField('Tipo de servicio', details.service)}
                        ${renderRepairField('Marca', ticket.device_brand)}
                        ${renderRepairField('Modelo', ticket.device_model)}
                        ${renderRepairField('Número de serie', ticket.serial_number)}
                        ${renderRepairField('Si el equipo enciende', details.turnsOn)}
                        ${renderRepairField('Contacto con líquidos', details.liquid)}
                        ${renderRepairField('Reparación previa', details.previousRepair)}
                    </div>
                </section>

                <section class="repair-ticket-section repair-ticket-issue-section">
                    <h3>Falla reportada</h3>
                    ${renderRepairField('Servicio solicitado', details.service)}
                    ${renderRepairText('Descripción completa', details.description)}
                    ${renderRepairField('Página de origen', details.sourcePage)}
                    <div class="repair-ticket-images">
                        <strong>Imágenes adjuntas</strong>
                        ${details.images.length ? details.images.map(src => `<a href="${escapeHtml(src)}" target="_blank" rel="noopener"><img src="${escapeHtml(src)}" alt="Imagen adjunta del ticket" loading="lazy"></a>`).join('') : '<span>No especificado</span>'}
                    </div>
                </section>

                ${details.isB2b ? `
                    <section class="repair-ticket-section repair-ticket-b2b-section">
                        <h3>Datos empresariales</h3>
                        <div class="repair-ticket-field-grid">
                            ${renderRepairField('Nombre de empresa', details.b2b.company)}
                            ${renderRepairField('Cantidad de equipos', details.b2b.quantity)}
                            ${renderRepairField('Tipo de equipos', details.b2b.type)}
                            ${renderRepairField('Frecuencia deseada', details.b2b.frequency)}
                            ${renderRepairField('Requiere factura', details.b2b.invoice)}
                        </div>
                        ${renderRepairText('Comentarios empresariales', details.b2b.comments)}
                    </section>
                ` : ''}
            </div>

            <div class="repair-ticket-column">
                <section class="repair-ticket-section repair-ticket-admin-section">
                    <h3>Gestión interna</h3>
                    <div class="repair-ticket-form-grid">
                        <label>Estado del ticket<select id="repairDetailStatus" class="admin-input">${renderRepairStatusOptions(ticket.status)}</select></label>
                        <label>Prioridad<select id="repairDetailPriority" class="admin-input">${renderRepairPriorityOptions(ticket.priority || 'normal')}</select></label>
                        <label>Costo estimado<input id="repairDetailEstimatedCost" class="admin-input" type="number" min="0" step="0.01" value="${escapeHtml(ticket.estimated_cost ?? '')}"></label>
                        <label>Costo final<input id="repairDetailFinalCost" class="admin-input" type="number" min="0" step="0.01" value="${escapeHtml(ticket.final_cost ?? '')}"></label>
                        <label>Fecha prometida<input id="repairDetailPromisedAt" class="admin-input" type="datetime-local" value="${escapeHtml(formatRepairDateTimeInput(ticket.promised_at))}"></label>
                        <label>Fecha de entrega<input id="repairDetailDeliveredAt" class="admin-input" type="datetime-local" value="${escapeHtml(formatRepairDateTimeInput(ticket.delivered_at))}"></label>
                        <label>Garantía hasta<input id="repairDetailWarrantyUntil" class="admin-input" type="date" value="${escapeHtml(String(ticket.warranty_until || '').slice(0, 10))}"></label>
                    </div>
                    <label class="repair-ticket-label">Diagnóstico técnico<textarea id="repairDetailDiagnostic" class="admin-input" rows="5">${escapeHtml(ticket.diagnostic || '')}</textarea></label>
                    <label class="repair-ticket-label">Nota para cliente (opcional, se envia por correo)<textarea id="repairDetailCustomerNote" class="admin-input" rows="4" placeholder="Escribe aqui una actualizacion clara para el cliente. Se enviara al correo registrado y se guardara en notas internas."></textarea></label>
                    <label class="repair-ticket-label">Notas internas<textarea id="repairDetailNotes" class="admin-input" rows="6">${escapeHtml(ticket.notes_internal || '')}</textarea></label>
                </section>
                <section class="repair-ticket-section repair-ticket-appointment-section">
                    <h3>Cita / Agenda</h3>
                    <div class="repair-ticket-form-grid">
                        <label>Tipo de visita<select id="repairAppointmentType" class="admin-input">${renderAppointmentTypeOptions(ticket.appointment_type || 'Recepción de equipo')}</select></label>
                        <label>Estado de cita<select id="repairAppointmentStatus" class="admin-input">${renderAppointmentStatusOptions(ticket.appointment_status || 'pendiente_confirmacion')}</select></label>
                        <label>Fecha<input id="repairAppointmentDate" class="admin-input" type="date" value="${escapeHtml(ticket.appointment_date || '')}"></label>
                        <label>Hora<input id="repairAppointmentTime" class="admin-input" type="time" value="${escapeHtml(String(ticket.appointment_time || '').slice(0, 5))}"></label>
                        <label>Método de recepción<input id="repairAppointmentDeliveryMethod" class="admin-input" maxlength="80" value="${escapeHtml(ticket.appointment_delivery_method || '')}"></label>
                    </div>
                    <label class="repair-ticket-label">Comentario de cita<textarea id="repairAppointmentNote" class="admin-input" rows="3">${escapeHtml(ticket.appointment_note || '')}</textarea></label>
                    <div class="repair-detail-actions">
                        <button class="btn-admin btn-approve" type="button" data-appointment-action="confirmada">Confirmar cita</button>
                        <button class="btn-admin" type="button" data-appointment-action="reagendada">Reagendar</button>
                        <button class="btn-admin btn-delete" type="button" data-appointment-action="cancelada">Cancelar cita</button>
                    </div>
                </section>
                <section class="repair-ticket-section repair-ticket-history-section" style="margin-top: 20px;">
                    <h3>Historial y Cronología de Auditoría</h3>
                    <div id="repairTicketHistoryTimeline" class="timeline-list">
                        <div class="empty-state" style="padding: 10px 0;">Cargando historial del ticket...</div>
                    </div>
                </section>
            </div>
        </div>
    `;
    organizeRepairDetailTabs(body, ticket);
}

function organizeRepairDetailTabs(body, ticket) {
    const columns = body.querySelector('.repair-ticket-columns');
    if (!columns) return;
    const overview = body.querySelector('.repair-ticket-overview');
    const sections = {
        summary: Array.from(body.querySelectorAll('.repair-ticket-client-section, .repair-ticket-device-section, .repair-ticket-issue-section, .repair-ticket-b2b-section')),
        work: Array.from(body.querySelectorAll('.repair-ticket-admin-section')),
        appointment: Array.from(body.querySelectorAll('.repair-ticket-appointment-section')),
        history: Array.from(body.querySelectorAll('.repair-ticket-history-section'))
    };
    const workspace = document.createElement('div');
    workspace.className = 'repair-workspace';
    workspace.innerHTML = `<div class="repair-workspace-tabs" role="tablist" aria-label="Expediente de ticket">
        <button type="button" role="tab" data-repair-workspace-tab="summary">Resumen</button>
        <button type="button" role="tab" data-repair-workspace-tab="work">Diagnóstico y costos</button>
        <button type="button" role="tab" data-repair-workspace-tab="appointment">Cita</button>
        <button type="button" role="tab" data-repair-workspace-tab="communication">Comunicación</button>
        <button type="button" role="tab" data-repair-workspace-tab="history">Historial</button>
    </div>`;
    const makePanel = (key) => {
        const panel = document.createElement('section');
        panel.className = 'repair-workspace-panel';
        panel.dataset.repairWorkspacePanel = key;
        panel.setAttribute('role', 'tabpanel');
        if (key === 'summary' && overview) panel.append(overview);
        (sections[key] || []).forEach((section) => panel.append(section));
        if (key === 'communication') {
            panel.innerHTML = `<div class="repair-communication-empty"><i class="fa-solid fa-envelope-circle-check" aria-hidden="true"></i><div><strong>Sin registro de comunicación persistente</strong><p>El historial de correo se mostrará aquí cuando la entrega transaccional esté registrada. No se inventan eventos ni confirmaciones.</p></div></div>`;
        }
        workspace.append(panel);
    };
    ['summary', 'work', 'appointment', 'communication', 'history'].forEach(makePanel);
    columns.replaceWith(workspace);
    setRepairWorkspaceTab(activeRepairTab, workspace);
    workspace.querySelectorAll('[data-repair-workspace-tab]').forEach((tab) => tab.addEventListener('click', () => setRepairWorkspaceTab(tab.dataset.repairWorkspaceTab, workspace)));
}

function setRepairWorkspaceTab(tabName, workspace = document.querySelector('.repair-workspace')) {
    if (!workspace) return;
    activeRepairTab = tabName;
    workspace.querySelectorAll('[data-repair-workspace-tab]').forEach((tab) => {
        const selected = tab.dataset.repairWorkspaceTab === tabName;
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
        tab.classList.toggle('active', selected);
    });
    workspace.querySelectorAll('[data-repair-workspace-panel]').forEach((panel) => {
        const selected = panel.dataset.repairWorkspacePanel === tabName;
        panel.hidden = !selected;
    });
    if (tabName === 'communication' && activeRepairTicket?.id) {
        loadTicketEmails(activeRepairTicket.id);
    }
}

async function openRepairTicket(ticketId, triggerEl = null) {
    lastActiveTriggerElement = triggerEl || document.activeElement;
    const overlay = document.getElementById('repairDetailOverlay');
    const body = document.getElementById('repairDetailBody');
    const title = document.getElementById('repairDetailTitle');
    const meta = document.getElementById('repairDetailMeta');
    if (!overlay || !body) return;
    const fallbackTicket = allRepairs.find(item => String(item.id) === String(ticketId));
    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    if (title) title.textContent = 'Cargando ticket...';
    if (meta) meta.innerHTML = '';
    body.innerHTML = '<div class="empty-state">Cargando información completa del ticket...</div>';
    try {
        const res = await fetch(`${API_BASE}/admin/tickets/${encodeURIComponent(ticketId)}`, { cache: 'no-store', credentials: 'include' });
        if (res.status === 404) {
            const notFoundErr = new Error('ticket not found');
            notFoundErr.isNotFound = true;
            throw notFoundErr;
        }
        if (!res.ok) throw new Error(`load failed: ${res.status}`);
        const data = await res.json();
        const ticket = data.ticket || data.repair || data;
        if (!ticket || !ticket.id) throw new Error('invalid ticket payload');
        renderRepairDetailModal(ticket);
        await Promise.allSettled([
            loadTicketHistory(ticket.id),
            loadTicketEmails(ticket.id)
        ]);
        const firstInput = document.getElementById('repairDetailStatus');
        if (firstInput) firstInput.focus();
    } catch (err) {
        console.error('No se pudo cargar el detalle por endpoint; usando datos ya cargados en tabla.', err);
        if (err && err.isNotFound) {
            if (title) title.textContent = 'Ticket no disponible';
            if (meta) meta.innerHTML = '';
            body.innerHTML = '<div class="empty-state">El ticket asociado a esta cita ya no existe o no está disponible.</div>';
            return;
        }
        if (fallbackTicket) {
            renderRepairDetailModal(fallbackTicket);
            await Promise.allSettled([
                loadTicketHistory(fallbackTicket.id),
                loadTicketEmails(fallbackTicket.id)
            ]);
            return;
        }
        body.innerHTML = '<div class="empty-state">No se pudo cargar la información completa del ticket. Intenta de nuevo.</div>';
    }
}
window.openRepairTicket = openRepairTicket;

async function loadTicketEmails(ticketId) {
    const container = document.querySelector('[data-repair-workspace-panel="communication"]');
    if (!container) return;
    try {
        const res = await fetch(`${API_BASE}/admin/tickets/${ticketId}/emails`, INCLUDE_CREDENTIALS);
        if (!res.ok) throw new Error('Error al cargar correos');
        const data = await res.json();
        const emails = data.emails || [];
        if (emails.length === 0) {
            container.innerHTML = `
                <div class="repair-communication-empty">
                    <i class="fa-solid fa-envelope" aria-hidden="true"></i>
                    <div>
                        <strong>Sin registros de correo en esta sesión</strong>
                        <p>Los correos transaccionales (confirmación al cliente, aviso de recepción y notas) quedarán registrados automáticamente al enviarse.</p>
                    </div>
                </div>
            `;
            return;
        }
        const eventLabels = {
            ticket_created_customer: 'Confirmación inicial enviada al cliente',
            ticket_created_admin: 'Aviso de nuevo ticket al administrador',
            ticket_received: 'Aviso de equipo recibido en taller',
            ticket_note: 'Actualización de notas al cliente'
        };
        container.innerHTML = `
            <div class="repair-ticket-section" style="border:none;padding:0;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <h3 style="margin:0;">Historial de Correos Transaccionales</h3>
                    <small style="color:var(--a-text-muted);">Estado: Aceptado por Resend (Entrega no verificada por webhook)</small>
                </div>
                <div class="timeline-list">
                    ${emails.map(e => {
                        const isAccepted = e.status === 'accepted';
                        const isFailed = e.status === 'failed';
                        const statusBadge = isAccepted
                            ? `<span class="badge-status" style="background:#10b98120;color:#10b981;border:1px solid #10b98140;"><i class="fa-solid fa-check"></i> Aceptado</span>`
                            : isFailed
                            ? `<span class="badge-status" style="background:#ef444420;color:#ef4444;border:1px solid #ef444440;"><i class="fa-solid fa-triangle-exclamation"></i> Fallido</span>`
                            : `<span class="badge-status" style="background:#64748b20;color:#94a3b8;border:1px solid #64748b40;">Omitido</span>`;
                        return `
                            <div class="timeline-item">
                                <div class="timeline-dot" style="background:${isAccepted ? '#10b981' : isFailed ? '#ef4444' : '#64748b'};"></div>
                                <div class="timeline-meta">
                                    <span>${formatRepairDate(e.created_at)}</span> · Destinatario: <strong>&lt;${escapeHtml(e.recipient)}&gt;</strong>
                                </div>
                                <div class="timeline-title" style="display:flex;align-items:center;gap:8px;">
                                    <span>${escapeHtml(eventLabels[e.event_type] || e.event_type)}</span>
                                    ${statusBadge}
                                </div>
                                <div class="timeline-desc">
                                    <div><strong>Asunto:</strong> ${escapeHtml(e.subject)}</div>
                                    ${e.provider_id ? `<div><small style="color:var(--a-text-muted);">Resend ID: ${escapeHtml(e.provider_id)}</small></div>` : ''}
                                    ${e.error ? `<div style="color:#ef4444;font-size:0.8rem;margin-top:4px;">Error: ${escapeHtml(typeof e.error === 'string' ? e.error : JSON.stringify(e.error))}</div>` : ''}
                                    ${isFailed ? `<button type="button" class="btn-admin btn-sm" style="margin-top:6px;" onclick="window.retryEmailEventUI('${e.id}', ${ticketId})"><i class="fa-solid fa-rotate-right"></i> Reintentar envío</button>` : ''}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div class="empty-state">No se pudo cargar el historial de correos.</div>';
    }
}

window.retryEmailEventUI = async function(eventId, ticketId) {
    try {
        const res = await fetch(`${API_BASE}/admin/emails/${eventId}/retry`, { method: 'POST', headers: JSON_HEADERS, credentials: 'include' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Error al reintentar envío');
        showAdminNotice('Reintento enviado correctamente.', 'success');
        if (ticketId) loadTicketEmails(ticketId);
    } catch (err) {
        showAdminNotice(err.message || 'Fallo en el reintento', 'error');
    }
};

const REPAIR_HISTORY_ACTION_LABELS = {
    creacion: 'Ticket creado',
    cambio_de_estado: 'Cambio de estado',
    actualizacion: 'Información actualizada',
    actualizacion_cita: 'Cita actualizada',
    update: 'Información actualizada'
};

const REPAIR_HISTORY_FIELD_LABELS = {
    status: 'Estado',
    priority: 'Prioridad',
    diagnostic: 'Diagnóstico',
    notes_internal: 'Notas internas',
    estimated_cost: 'Costo estimado',
    final_cost: 'Costo final',
    appointment_type: 'Tipo de cita',
    appointment_date: 'Fecha de cita',
    appointment_time: 'Hora de cita',
    appointment_datetime: 'Fecha y hora de cita',
    appointment_delivery_method: 'Método de recepción',
    appointment_note: 'Comentario de cita',
    appointment_status: 'Estado de cita',
    promised_at: 'Fecha prometida',
    delivered_at: 'Fecha de entrega',
    warranty_until: 'Garantía',
    comment: 'Comentario'
};

function repairHistoryValue(field, value) {
    if (value === null || value === undefined || value === '') return 'Sin definir';
    if (field === 'status') return REPAIR_STATUS_LABELS[value] || String(value);
    if (field === 'appointment_status') return APPOINTMENT_STATUS_LABELS[value] || String(value);
    if (field === 'priority') return ({ low: 'Baja', normal: 'Normal', high: 'Alta', urgent: 'Urgente' })[value] || String(value);
    if (field === 'estimated_cost' || field === 'final_cost') return formatRepairMoney(value);
    return String(value);
}

function renderRepairHistoryDiff(diff) {
    if (!diff || typeof diff !== 'object') return '';
    return Object.entries(diff).map(([field, change]) => {
        const label = REPAIR_HISTORY_FIELD_LABELS[field] || field;
        const before = change?.before ?? change?.anterior ?? null;
        const after = change?.after ?? change?.nuevo ?? change;
        if (['diagnostic', 'notes_internal', 'appointment_note'].includes(field)) {
            return `<span><strong>${escapeHtml(label)}:</strong> actualizado</span>`;
        }
        return `<span><strong>${escapeHtml(label)}:</strong> ${escapeHtml(repairHistoryValue(field, before))} → ${escapeHtml(repairHistoryValue(field, after))}</span>`;
    }).join('');
}

async function loadTicketHistory(ticketId) {
    const timelineContainer = document.getElementById('repairTicketHistoryTimeline');
    if (!timelineContainer) return;
    try {
        const res = await fetch(`${API_BASE}/admin/tickets/${ticketId}/history`, INCLUDE_CREDENTIALS);
        if (!res.ok) throw new Error('Error cargando historial');
        const data = await res.json();
        const history = data.history || [];
        if (history.length === 0) {
            timelineContainer.innerHTML = '<div class="empty-state" style="padding: 10px 0;">No hay historial registrado para este ticket.</div>';
            return;
        }
        timelineContainer.innerHTML = history.map(item => {
            const date = formatRepairDate(item.created_at);
            const actionLabel = REPAIR_HISTORY_ACTION_LABELS[item.action] || item.action || 'Modificación';
            let diffDesc = '';
            if (item.diff) {
                try {
                    const diffObj = typeof item.diff === 'string' ? JSON.parse(item.diff) : item.diff;
                    diffDesc = renderRepairHistoryDiff(diffObj);
                } catch (e) {
                    diffDesc = '';
                }
            }

            return `
                <div class="timeline-item">
                    <div class="timeline-dot"></div>
                    <div class="timeline-meta">${date} — por ${escapeHtml(item.user_name || item.user_email || 'Sistema')}</div>
                    <div class="timeline-title">${escapeHtml(actionLabel)}</div>
                    ${diffDesc ? `<div class="timeline-desc">${diffDesc}</div>` : ''}
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error(err);
        timelineContainer.innerHTML = '<div class="empty-state">No se pudo cargar el historial del ticket.</div>';
    }
}

function closeRepairTicketModal() {
    const overlay = document.getElementById('repairDetailOverlay');
    if (!overlay) return;
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    activeRepairTicket = null;
    if (lastActiveTriggerElement && typeof lastActiveTriggerElement.focus === 'function') {
        lastActiveTriggerElement.focus();
        lastActiveTriggerElement = null;
    }
}

function summarizeTicketNotifications(notifications) {
    if (!Array.isArray(notifications) || notifications.length === 0) return '';
    if (notifications.some(item => item.status === 'accepted')) {
        return ' Correo aceptado por el proveedor; la entrega no está verificada.';
    }
    if (notifications.some(item => item.reason === 'missing_recipient')) {
        return ' No se envio correo porque el ticket no tiene email de cliente.';
    }
    if (notifications.some(item => item.reason === 'email_disabled')) {
        return ' Correo no enviado: falta configurar RESEND_API_KEY y EMAIL_FROM.';
    }
    if (notifications.some(item => item.status === 'failed')) {
        return ' El ticket se guardo, pero el correo no pudo enviarse.';
    }
    return ' Aviso de correo omitido.';
}

async function saveRepairTicketChanges() {
    if (!activeRepairTicket) return;
    const saveMessage = document.getElementById('repairDetailSaveMessage');
    const payload = {
        status: document.getElementById('repairDetailStatus')?.value,
        priority: document.getElementById('repairDetailPriority')?.value,
        diagnostic: document.getElementById('repairDetailDiagnostic')?.value || '',
        customer_note: document.getElementById('repairDetailCustomerNote')?.value || '',
        notes_internal: document.getElementById('repairDetailNotes')?.value || '',
        estimated_cost: document.getElementById('repairDetailEstimatedCost')?.value || null,
        final_cost: document.getElementById('repairDetailFinalCost')?.value || null,
        promised_at: document.getElementById('repairDetailPromisedAt')?.value || null,
        delivered_at: document.getElementById('repairDetailDeliveredAt')?.value || null,
        warranty_until: document.getElementById('repairDetailWarrantyUntil')?.value || null,
        appointment_type: document.getElementById('repairAppointmentType')?.value || null,
        appointment_status: document.getElementById('repairAppointmentStatus')?.value || 'pendiente_confirmacion',
        appointment_date: document.getElementById('repairAppointmentDate')?.value || null,
        appointment_time: document.getElementById('repairAppointmentTime')?.value || null,
        appointment_delivery_method: document.getElementById('repairAppointmentDeliveryMethod')?.value || null,
        appointment_note: document.getElementById('repairAppointmentNote')?.value || null,
        appointment_datetime: document.getElementById('repairAppointmentDate')?.value && document.getElementById('repairAppointmentTime')?.value
            ? `${document.getElementById('repairAppointmentDate').value} ${document.getElementById('repairAppointmentTime').value}:00`
            : null,
        expected_updated_at: activeRepairTicket.updated_at || null
    };
    try {
        const res = await fetch(`${API_BASE}/admin/tickets/${activeRepairTicket.id}`, {
            method: 'PATCH',
            headers: JSON_HEADERS,
            credentials: 'include',
            body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 409) {
            const body = document.getElementById('repairDetailBody');
            document.getElementById('repairConflictBanner')?.remove();
            if (body) {
                const banner = document.createElement('div');
                banner.id = 'repairConflictBanner';
                banner.className = 'repair-conflict-banner';
                banner.innerHTML = `
                    <div style="display:flex;gap:12px;align-items:flex-start;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.35);border-radius:8px;padding:12px 14px;margin-bottom:14px;">
                        <i class="fa-solid fa-triangle-exclamation" style="color:#f59e0b;font-size:1.2rem;margin-top:2px;"></i>
                        <div style="flex:1;">
                            <strong style="color:#f59e0b;font-size:0.92rem;display:block;margin-bottom:3px;">Conflicto de edición (409)</strong>
                            <p style="margin:0 0 8px;font-size:0.84rem;color:var(--a-text);">Este ticket cambió en el servidor mientras lo tenías abierto. Tus cambios no se han borrado de la pantalla.</p>
                            <div style="display:flex;gap:8px;">
                                <button type="button" class="btn-admin btn-sm btn-approve" onclick="openRepairTicket('${activeRepairTicket.id}')">Recargar versión del servidor</button>
                                <button type="button" class="btn-admin btn-sm" onclick="document.getElementById('repairConflictBanner')?.remove()">Descartar aviso</button>
                            </div>
                        </div>
                    </div>
                `;
                body.prepend(banner);
            }
            if (saveBtn) saveBtn.disabled = false;
            if (saveMessage) saveMessage.textContent = 'Conflicto de edición (409). Revisa el aviso arriba.';
            showAdminNotice('El ticket fue modificado por otro proceso. Revisa el aviso en el expediente.', 'warning');
            return;
        }
        if (!res.ok) throw new Error(data.message || data.error || `No se pudo guardar el ticket (HTTP ${res.status}).`);
        const index = allRepairs.findIndex(item => String(item.id) === String(data.ticket.id));
        if (index >= 0) allRepairs[index] = data.ticket;
        renderRepairs();
        renderRepairDetailModal(data.ticket);
        await loadTicketHistory(data.ticket.id);
        loadTicketEmails(data.ticket.id);
        fetchAdminAppointments();
        window.dispatchEvent(new CustomEvent('admin:data-changed', { detail: { source: 'ticket', id: data.ticket.id } }));
        if (saveMessage) saveMessage.textContent = 'Cambios guardados correctamente.' + summarizeTicketNotifications(data.notifications);
        showAdminNotice('Ticket guardado correctamente.', 'success');
    } catch (err) {
        console.error('No se pudieron guardar los cambios del ticket.', err);
        if (saveMessage) saveMessage.textContent = err.message || 'No se pudieron guardar los cambios.';
        showAdminNotice(err.message || 'Error al guardar ticket', 'error');
    }
}

async function updateRepairAssignee(technicianId) {
    if (!activeRepairTicket) return;
    const select = document.getElementById('repairDetailAssignee');
    if (select) select.disabled = true;
    try {
        const res = await fetch(`${API_BASE}/admin/tickets/${encodeURIComponent(activeRepairTicket.id)}/assignee`, {
            method: 'PATCH', headers: JSON_HEADERS, credentials: 'include', body: JSON.stringify({ technician_id: technicianId || null })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'No se pudo actualizar el responsable.');
        activeRepairTicket = data.ticket;
        allRepairs = allRepairs.map((ticket) => String(ticket.id) === String(data.ticket.id) ? data.ticket : ticket);
        renderRepairs();
        renderMyJourney();
        showAdminNotice(technicianId ? 'Responsable actualizado.' : 'Ticket sin asignar.', 'success');
    } catch (err) {
        showAdminNotice(err.message, 'error');
        if (select) select.value = activeRepairTicket.technician_id || '';
    } finally {
        if (select) select.disabled = false;
    }
}


/* ─────────────────────────────────────────────────────────────
   TALLER (REPAIRS) UI
───────────────────────────────────────────────────────────── */

function getRepairAssignee(repair) {
    return repair.technician_name || 'Sin asignar';
}

function formatRelativeTicketTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Sin fecha';
    const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
    if (minutes < 60) return `Hace ${Math.max(1, minutes)} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours} h`;
    const days = Math.floor(hours / 24);
    return days === 1 ? 'Ayer' : `Hace ${days} días`;
}

function ticketBalanceLabel(repair) {
    const total = Number(repair.final_cost ?? repair.estimated_cost);
    if (!Number.isFinite(total) || total <= 0) return 'Sin saldo definido';
    return `${formatRepairMoney(total)} pendiente`;
}

function applyRepairQuickView(repairs) {
    const view = activeRepairQuickView;
    const activeStatuses = new Set(['new', 'received', 'diagnosing', 'contacted', 'quoted', 'approved', 'in_progress', 'waiting_parts', 'ready']);
    if (view === 'attention') return repairs.filter((ticket) => activeStatuses.has(ticket.status) && (inferRepairUrgency(ticket) === 'urgent' || !ticket.technician_id || ticket.status === 'diagnosing'));
    if (view === 'unassigned') return repairs.filter((ticket) => activeStatuses.has(ticket.status) && !ticket.technician_id);
    if (view === 'waiting') return repairs.filter((ticket) => ['quoted', 'contacted'].includes(ticket.status));
    if (view === 'ready') return repairs.filter((ticket) => ticket.status === 'ready');
    return repairs;
}

function renderRepairFilterChips(filters) {
    const container = document.getElementById('repairFilterChips');
    if (!container) return;
    const labels = {
        status: REPAIR_STATUS_LABELS[filters.status] || (filters.status === 'active' ? 'Activos' : filters.status === 'overdue' ? 'Atrasados' : ''),
        urgency: REPAIR_PRIORITY_OPTIONS[filters.urgency]?.label || '',
        device: filters.device === 'all' ? '' : filters.device,
        service: filters.service === 'all' ? '' : filters.service
    };
    const chips = Object.entries(labels).filter(([, label]) => label).map(([key, label]) => `<button type="button" class="repair-filter-chip" data-clear-filter="${key}">${escapeHtml(label)} <i class="fa-solid fa-xmark" aria-hidden="true"></i></button>`);
    if (filters.search) chips.unshift(`<button type="button" class="repair-filter-chip" data-clear-filter="search">“${escapeHtml(filters.search)}” <i class="fa-solid fa-xmark" aria-hidden="true"></i></button>`);
    container.innerHTML = chips.join('');
}

function updateBulkToolbar() {
    const toolbar = document.getElementById('repairBulkToolbar');
    const count = crmSelectedTickets.size;
    if (!toolbar) return;
    toolbar.hidden = count === 0;
    const countEl = document.getElementById('repairBulkCount');
    if (countEl) countEl.textContent = count;
}

let bulkActionKind = null;
let bulkDialogTrigger = null;

function openBulkActionDialog(kind, trigger) {
    const ids = [...crmSelectedTickets];
    if (!ids.length) return;
    const overlay = document.getElementById('repairBulkDialog');
    const title = document.getElementById('repairBulkDialogTitle');
    const description = document.getElementById('repairBulkDialogDescription');
    const label = document.getElementById('repairBulkDialogLabel');
    const select = document.getElementById('repairBulkDialogValue');
    if (!overlay || !select) return;
    bulkActionKind = kind;
    bulkDialogTrigger = trigger || document.activeElement;
    const definitions = {
        status: { title: 'Cambiar estado', label: 'Nuevo estado', values: Object.entries(REPAIR_STATUS_LABELS).filter(([value]) => value !== 'eliminado').map(([value, text]) => [value, text]) },
        priority: { title: 'Cambiar prioridad', label: 'Nueva prioridad', values: Object.entries(REPAIR_PRIORITY_OPTIONS).map(([value, data]) => [value, data.label]) },
        assignee: { title: 'Asignar responsable', label: 'Responsable', values: [['', 'Sin asignar'], ...availableTechnicians.map((person) => [person.id, person.name])] }
    };
    const definition = definitions[kind];
    if (!definition) return;
    title.textContent = definition.title;
    description.textContent = `Aplicarás este cambio a ${ids.length} ticket${ids.length === 1 ? '' : 's'} seleccionados.`;
    label.firstChild.textContent = definition.label;
    select.innerHTML = definition.values.map(([value, text]) => `<option value="${escapeHtml(value)}">${escapeHtml(text)}</option>`).join('');
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    requestAnimationFrame(() => select.focus());
}

function closeBulkActionDialog() {
    const overlay = document.getElementById('repairBulkDialog');
    if (!overlay) return;
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    bulkDialogTrigger?.focus?.();
    bulkDialogTrigger = null;
    bulkActionKind = null;
}

async function confirmBulkAction() {
    const value = document.getElementById('repairBulkDialogValue')?.value;
    const ids = [...crmSelectedTickets];
    if (!bulkActionKind || !ids.length) return;
    const confirm = document.getElementById('repairBulkDialogConfirm');
    if (confirm) { confirm.disabled = true; confirm.textContent = 'Aplicando…'; }
    try {
        const response = await fetch(`${API_BASE}/admin/tickets/bulk`, {
            method: 'PATCH',
            headers: JSON_HEADERS,
            credentials: 'include',
            body: JSON.stringify({ ticket_ids: ids, action: bulkActionKind, value })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'No se pudieron actualizar los tickets.');
        const updated = new Map((data.tickets || []).map((ticket) => [String(ticket.id), ticket]));
        allRepairs = allRepairs.map((ticket) => updated.get(String(ticket.id)) || ticket);
        crmSelectedTickets.clear();
        renderRepairs();
        renderMyJourney();
        closeBulkActionDialog();
        showAdminNotice(`${data.count || ids.length} ticket${ids.length === 1 ? '' : 's'} actualizado${ids.length === 1 ? '' : 's'}.`, 'success');
    } catch (error) {
        showAdminNotice(error.message, 'error');
    } finally {
        if (confirm) { confirm.disabled = false; confirm.textContent = 'Aplicar cambios'; }
    }
}

function getGlobalSearchItems(query) {
    const normalized = normalizeText(query);
    if (!normalized) return [];
    const ticketItems = allRepairs.filter((ticket) => normalizeText(`${ticket.ticket_code} ${getRepairClientName(ticket)} ${ticket.contact_phone} ${getRepairContactEmail(ticket)} ${ticket.serial_number} ${ticket.device_model}`).includes(normalized)).slice(0, 8).map((ticket) => ({ type: 'Tickets', title: `#${ticket.ticket_code} · ${ticket.device_type || 'Equipo'}`, meta: `${getRepairClientName(ticket)} · ${ticket.next_action || 'Revisar expediente'}`, action: () => openRepairTicket(ticket.id) }));
    const customerItems = allUsers.filter((user) => normalizeText(`${user.name} ${user.email} ${user.phone}`).includes(normalized)).slice(0, 5).map((user) => ({ type: 'Clientes', title: user.name || 'Cliente sin nombre', meta: user.email || user.phone || 'Sin datos de contacto', action: () => { document.querySelector('[data-view="users"]')?.click(); } }));
    const buildItems = allBuilds.filter((build) => normalizeText(`${build.title} ${build.description} ${build.price}`).includes(normalized)).slice(0, 5).map((build) => ({ type: 'Ensambles', title: build.title || 'Ensamble', meta: build.price || 'Sin precio visible', action: () => { document.querySelector('[data-view="builds"]')?.click(); } }));
    return [...ticketItems, ...customerItems, ...buildItems];
}

function renderGlobalSearchResults(query) {
    const container = document.getElementById('adminGlobalSearchResults');
    if (!container) return;
    globalSearchResults = getGlobalSearchItems(query);
    globalSearchIndex = globalSearchResults.length ? 0 : -1;
    if (!globalSearchResults.length) {
        container.innerHTML = `<div class="admin-search-empty">${query ? 'No encontramos coincidencias. Prueba con folio, cliente, teléfono o modelo.' : 'Escribe para buscar tickets, clientes y ensambles.'}</div>`;
        return;
    }
    const grouped = globalSearchResults.reduce((groups, item, index) => {
        (groups[item.type] ||= []).push({ ...item, index });
        return groups;
    }, {});
    container.innerHTML = Object.entries(grouped).map(([group, items]) => `<section class="admin-search-group"><h3>${escapeHtml(group)}</h3>${items.map((item) => `<button type="button" class="admin-search-result ${item.index === globalSearchIndex ? 'active' : ''}" data-global-result="${item.index}" role="option" aria-selected="${item.index === globalSearchIndex}"><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.meta)}</small></span><i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button>`).join('')}</section>`).join('');
}

function openGlobalSearch(trigger) {
    const overlay = document.getElementById('adminGlobalSearchDialog');
    const input = document.getElementById('adminGlobalSearchInput');
    if (!overlay || !input) return;
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    overlay.dataset.triggerId = trigger?.id || '';
    document.body.classList.add('modal-open');
    input.value = '';
    renderGlobalSearchResults('');
    requestAnimationFrame(() => input.focus());
}

function closeGlobalSearch() {
    const overlay = document.getElementById('adminGlobalSearchDialog');
    if (!overlay) return;
    const trigger = overlay.dataset.triggerId ? document.getElementById(overlay.dataset.triggerId) : null;
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    trigger?.focus();
}

function activateGlobalSearchResult(index = globalSearchIndex) {
    const result = globalSearchResults[index];
    if (!result) return;
    closeGlobalSearch();
    result.action();
}

function renderMyJourney() {
    const attention = document.getElementById('journey-attention');
    const upcoming = document.getElementById('journey-upcoming') || document.getElementById('dashboard-agenda-preview');
    const summary = document.getElementById('journey-summary-grid');
    const date = document.getElementById('journey-date');
    if (!attention || !summary) return;
    const today = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Cancun' }).format(new Date());
    if (date) date.textContent = today.charAt(0).toUpperCase() + today.slice(1);
    const active = allRepairs.filter((ticket) => !['delivered', 'cancelled', 'eliminado'].includes(ticket.status));
    const withoutDiagnosis = active.filter((ticket) => ['new', 'received', 'diagnosing'].includes(ticket.status));
    const unassigned = active.filter((ticket) => !ticket.technician_id);
    const ready = active.filter((ticket) => ticket.status === 'ready');
    const waitingClient = active.filter((ticket) => ['quoted', 'contacted'].includes(ticket.status));
    const ageOldest = (tickets) => tickets.length ? tickets.reduce((oldest, item) => new Date(item.created_at) < new Date(oldest.created_at) ? item : oldest, tickets[0]) : null;
    const items = [
        { tone: withoutDiagnosis.length ? 'warning' : 'positive', icon: withoutDiagnosis.length ? 'fa-triangle-exclamation' : 'fa-circle-check', title: withoutDiagnosis.length ? `${withoutDiagnosis.length} ticket${withoutDiagnosis.length === 1 ? '' : 's'} sin diagnóstico` : 'No hay tickets sin diagnóstico', meta: withoutDiagnosis.length ? `Más antiguo: ${formatRelativeTicketTime(ageOldest(withoutDiagnosis).created_at)} · ${unassigned.length} sin asignar` : 'Todo al día en revisión inicial', action: 'Revisar', filter: 'attention' },
        { tone: waitingClient.length ? 'warning' : 'neutral', icon: waitingClient.length ? 'fa-clock' : 'fa-message', title: waitingClient.length ? `${waitingClient.length} esperando respuesta del cliente` : 'Sin respuestas pendientes', meta: waitingClient.length ? `Cotizaciones o contactos por confirmar` : 'No hay seguimiento bloqueado', action: 'Abrir', filter: 'waiting' },
        { tone: ready.length ? 'positive' : 'neutral', icon: ready.length ? 'fa-box-open' : 'fa-check', title: ready.length ? `${ready.length} equipo${ready.length === 1 ? '' : 's'} listo${ready.length === 1 ? '' : 's'} para entregar` : 'Sin entregas pendientes', meta: ready.length ? `${ready.filter(ticket => (Date.now() - new Date(ticket.created_at).getTime()) > 86400000).length} desde ayer o antes` : 'Se mostrará aquí lo que requiera entrega', action: 'Entregar', filter: 'ready' }
    ];
    attention.innerHTML = items.map((item) => `<div class="journey-item is-${item.tone}"><div class="journey-item-icon"><i class="fa-solid ${item.icon}" aria-hidden="true"></i></div><div class="journey-item-copy"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.meta)}</span></div><button type="button" data-journey-filter="${item.filter}">${item.action} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button></div>`).join('');
    attention.setAttribute('aria-busy', 'false');

    const now = Date.now();
    const nextDay = now + 86400000;
    const appointments = allRepairs.filter((ticket) => ticket.appointment_datetime || (ticket.appointment_date && ticket.appointment_time)).map((ticket) => ({ ticket, at: new Date(ticket.appointment_datetime || `${ticket.appointment_date}T${ticket.appointment_time}`) })).filter((entry) => !Number.isNaN(entry.at.getTime()) && entry.at.getTime() >= now - 1800000 && entry.at.getTime() <= nextDay).sort((a, b) => a.at - b.at);
    if (upcoming && !document.getElementById('dashboard-agenda-preview')) {
        upcoming.innerHTML = appointments.length ? appointments.map(({ ticket, at }) => `<button type="button" class="journey-timeline-item" data-ticket-open="${ticket.id}"><time>${at.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Cancun' })}</time><span><strong>${escapeHtml(`${ticket.device_type || 'Equipo'}${ticket.device_model ? ` · ${ticket.device_model}` : ''}`)}</strong><small>${escapeHtml(getRepairClientName(ticket))} · ${escapeHtml(APPOINTMENT_STATUS_LABELS[ticket.appointment_status] || 'Cita')}</small></span><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>`).join('') : '<div class="journey-empty"><i class="fa-solid fa-calendar-check" aria-hidden="true"></i><strong>Sin citas en las próximas 24 horas.</strong><span>La agenda disponible aparecerá aquí.</span></div>';
        upcoming.setAttribute('aria-busy', 'false');
    }

    const totalPending = active.reduce((sum, ticket) => sum + (Number(ticket.final_cost ?? ticket.estimated_cost) || 0), 0);
    const metrics = [
        ['Tickets abiertos', active.length, 'repairs'],
        ['Por entregar', ready.length, 'repairs'],
        ['Sin asignar', unassigned.length, 'repairs'],
        ['Pendiente estimado', formatRepairMoney(totalPending), 'repairs']
    ];
    summary.innerHTML = metrics.map(([label, value, view]) => `<button type="button" class="journey-metric" data-view-target="${view}"><span>${label}</span><strong>${value}</strong><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></button>`).join('');
    summary.setAttribute('aria-busy', 'false');
}

function renderRepairs() {
    const tbody = document.getElementById('repairs-tbody');
    if(!tbody) return;
    tbody.innerHTML = '';

    const filters = getRepairFilters();
    const filteredRepairs = applyRepairQuickView(filterRepairs());
    const totalCount = filteredRepairs.length;

    // Calcular paginación
    const totalPages = Math.ceil(totalCount / crmPageSize) || 1;
    if (crmCurrentPage > totalPages) crmCurrentPage = totalPages;
    if (crmCurrentPage < 1) crmCurrentPage = 1;

    const startIndex = (crmCurrentPage - 1) * crmPageSize;
    const endIndex = Math.min(startIndex + crmPageSize, totalCount);
    const paginatedRepairs = filteredRepairs.slice(startIndex, endIndex);

    const summary = document.getElementById('repairFilterSummary');
    if (summary) {
        summary.textContent = `Mostrando ${filteredRepairs.length} de ${allRepairs.length} tickets.`;
    }
    renderRepairFilterChips(filters);
    updateBulkToolbar();

    // Actualizar controles de paginación en UI
    const pagInfo = document.getElementById('crmPaginationInfo');
    if (pagInfo) {
        pagInfo.textContent = `${totalCount > 0 ? startIndex + 1 : 0} - ${endIndex} de ${totalCount}`;
    }
    const prevBtn = document.getElementById('crmPrevPage');
    if (prevBtn) prevBtn.disabled = crmCurrentPage <= 1;
    const nextBtn = document.getElementById('crmNextPage');
    if (nextBtn) nextBtn.disabled = crmCurrentPage >= totalPages;

    if (paginatedRepairs.length === 0) {
        const message = allRepairs.length === 0 ? 'Aún no hay tickets registrados.' : 'No hay tickets que coincidan con los filtros.';
        tbody.innerHTML = `<tr><td colspan="11" class="empty-row" style="text-align: center; padding: 30px; color: var(--a-text-dim);">${message}</td></tr>`;
        const mobile = document.getElementById('repairMobileList');
        if (mobile) mobile.innerHTML = `<div class="repair-mobile-empty">${message}</div>`;
        return;
    }

    paginatedRepairs.forEach(r => {
        const color = REPAIR_STATUS_COLORS[r.status] || '#cbd5e1';
        const clientName = getRepairClientName(r);
        const service = inferRepairService(r);
        const urgency = inferRepairUrgency(r);
        const urgencyColor = urgency === 'urgent' ? '#ef4444' : urgency === 'work_school' ? '#f59e0b' : urgency === 'quote' ? '#38bdf8' : '#10b981';
        const urgencyLabel = REPAIR_PRIORITY_OPTIONS[urgency]?.label || urgency;
        const isChecked = crmSelectedTickets.has(r.id);

        const tr = document.createElement('tr');
        tr.className = `repair-row ${isChecked ? 'selected' : ''}`;
        tr.setAttribute('data-ticket-id', r.id);
        tr.setAttribute('tabindex', '0');
        tr.innerHTML = `
            <td style="text-align: center;" onclick="event.stopPropagation()">
                <input type="checkbox" class="crm-row-select" data-id="${r.id}" ${isChecked ? 'checked' : ''} />
            </td>
            <td style="font-weight: 700; color: #818cf8;">#${escapeHtml(r.ticket_code)}</td>
            <td>
                <div style="font-weight:600;">${escapeHtml(clientName)}</div>
                <div style="font-size:0.75rem; color:var(--a-text-muted);">${escapeHtml(r.contact_phone || '')}</div>
            </td>
            <td>
                <div style="font-weight:600;">${escapeHtml(r.device_type)}</div>
                <div style="font-size:0.75rem; color:var(--a-text-muted);">${escapeHtml([r.device_brand, r.device_model, service].filter(Boolean).join(' · '))}</div>
            </td>
            <td><span class="badge-status" style="background: ${urgencyColor}18; color: ${urgencyColor}; border: 1px solid ${urgencyColor}30;">${escapeHtml(urgencyLabel)}</span></td>
            <td><span class="badge-status" style="background: ${color}18; color: ${color}; border: 1px solid ${color}30;">${escapeHtml(REPAIR_STATUS_LABELS[r.status] || r.status)}</span></td>
            <td>
                <span class="ticket-assignee ${r.technician_id ? '' : 'is-unassigned'}"><i class="fa-solid fa-user" aria-hidden="true"></i>${escapeHtml(getRepairAssignee(r))}</span>
            </td>
            <td><span class="ticket-next-action"><small>Siguiente</small>${escapeHtml(r.next_action || 'Revisar expediente')}</span></td>
            <td><time title="${escapeHtml(formatRepairDate(r.created_at))}">${escapeHtml(formatRelativeTicketTime(r.created_at))}</time></td>
            <td><span class="ticket-balance ${Number(r.final_cost ?? r.estimated_cost) > 0 ? 'is-pending' : ''}">${escapeHtml(ticketBalanceLabel(r))}</span></td>
            <td style="text-align: right;">
                <div style="display: flex; gap: 8px; justify-content: flex-end;">
                    <button class="crm-actions-btn" type="button" data-open-ticket="${escapeHtml(r.id)}" onclick="window.openRepairTicket('${escapeHtml(r.id)}')" aria-label="Abrir ticket ${escapeHtml(r.ticket_code)}">
                        Abrir <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    const mobile = document.getElementById('repairMobileList');
    if (mobile) mobile.innerHTML = paginatedRepairs.map((r) => {
        const urgency = inferRepairUrgency(r);
        const urgencyLabel = REPAIR_PRIORITY_OPTIONS[urgency]?.label || urgency;
        return `<article class="repair-mobile-card"><header><strong>#${escapeHtml(r.ticket_code)}</strong><span class="ticket-priority priority-${escapeHtml(urgency)}">${escapeHtml(urgencyLabel)}</span></header><div class="repair-mobile-device"><strong>${escapeHtml(r.device_type || 'Equipo')}</strong><span>${escapeHtml(getRepairClientName(r))}</span></div><div class="repair-mobile-state"><span>${escapeHtml(REPAIR_STATUS_LABELS[r.status] || r.status)}</span><strong><small>Siguiente</small>${escapeHtml(r.next_action || 'Revisar expediente')}</strong></div><footer><span>${escapeHtml(getRepairAssignee(r))} · ${escapeHtml(formatRelativeTicketTime(r.created_at))}</span><strong>${escapeHtml(ticketBalanceLabel(r))}</strong></footer><button class="crm-actions-btn" type="button" data-open-ticket="${escapeHtml(r.id)}" onclick="window.openRepairTicket('${escapeHtml(r.id)}')">Abrir ticket <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button></article>`;
    }).join('');
}

function switchRepairPanel(panel) {
    const panels = {
        tickets: document.getElementById('repairTicketsPanel'),
        agenda: document.getElementById('repairAgendaPanel'),
        config: document.getElementById('repairConfigPanel')
    };
    Object.entries(panels).forEach(([key, el]) => {
        if (el) el.style.display = key === panel ? '' : 'none';
    });
    if (panel === 'agenda') fetchAdminAppointments();
    if (panel === 'config') fetchAppointmentConfig();
}

function dateISOFromOffset(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 10);
}

function setAppointmentRangeForFilter(filter) {
    const fromInput = document.getElementById('appointmentFrom');
    const toInput = document.getElementById('appointmentTo');
    if (!fromInput || !toInput) return;
    if (filter === 'today') {
        fromInput.value = dateISOFromOffset(0);
        toInput.value = dateISOFromOffset(0);
    } else if (filter === 'week') {
        fromInput.value = dateISOFromOffset(0);
        toInput.value = dateISOFromOffset(7);
    } else {
        fromInput.value = dateISOFromOffset(0);
        toInput.value = dateISOFromOffset(30);
    }
}

function getFilteredAdminAppointments() {
    if (['confirmada', 'pendiente_confirmacion', 'cancelada'].includes(activeAppointmentFilter)) {
        return adminAppointments.filter(item => item.appointment_status === activeAppointmentFilter);
    }
    return adminAppointments;
}

async function fetchAdminAppointments() {
    const fromInput = document.getElementById('appointmentFrom');
    const toInput = document.getElementById('appointmentTo');
    if (fromInput && !fromInput.value) setAppointmentRangeForFilter(activeAppointmentFilter);
    const from = fromInput?.value || dateISOFromOffset(0);
    const to = toInput?.value || from;
    const list = document.getElementById('appointmentsList');
    if (list) list.innerHTML = '<div class="empty-state">Cargando agenda...</div>';
    try {
        const res = await fetch(`${API_BASE}/admin/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { cache: 'no-store', credentials: 'include' });
        if (!res.ok) throw new Error('appointments failed');
        adminAppointments = await res.json();
        renderAdminAppointments();
    } catch (err) {
        console.error(err);
        if (list) list.innerHTML = '<div class="empty-state">No se pudo cargar la agenda.</div>';
    }
}

function renderAdminAppointments() {
    const list = document.getElementById('appointmentsList');
    const calendar = document.getElementById('appointmentsCalendar');
    if (!list) return;
    const visibleAppointments = getFilteredAdminAppointments();
    if (calendar) calendar.hidden = activeAgendaView === 'list';
    list.hidden = activeAgendaView !== 'list';
    if (activeAgendaView !== 'list') {
        renderAppointmentCalendar(visibleAppointments, activeAgendaView);
        return;
    }
    if (!visibleAppointments.length) {
        list.innerHTML = '<div class="empty-state">No hay citas programadas para este rango.</div>';
        return;
    }
    list.innerHTML = visibleAppointments.map(item => `
        <div class="repair-appointment-card">
            <div>
                <strong>#${escapeHtml(item.ticket_code)} - ${escapeHtml(getRepairClientName(item))}</strong>
                <span>${escapeHtml(item.contact_phone || 'Sin telefono')} | ${escapeHtml(item.device_type || '')} | ${escapeHtml(inferRepairService(item))}</span>
            </div>
            <div>
                <strong>${escapeHtml(item.appointment_date || '')} ${escapeHtml(String(item.appointment_time || '').slice(0, 5))}</strong>
                <span>${escapeHtml(renderAppointmentTypeLabel(item.appointment_type))} | ${escapeHtml(APPOINTMENT_STATUS_LABELS[item.appointment_status] || item.appointment_status || 'Pendiente')}</span>
            </div>
            <button class="btn-admin repair-open-btn" type="button" data-open-ticket="${escapeHtml(item.id)}">Abrir ticket</button>
        </div>
    `).join('');
}

function renderAppointmentCalendar(appointments, view) {
    const calendar = document.getElementById('appointmentsCalendar');
    if (!calendar) return;
    const from = document.getElementById('appointmentFrom')?.value || dateISOFromOffset(0);
    const start = new Date(`${from}T12:00:00`);
    const days = view === 'week' ? Array.from({ length: 7 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date; }) : [start];
    const byDay = new Map(days.map((date) => [date.toISOString().slice(0, 10), []]));
    appointments.forEach((appointment) => {
        const key = String(appointment.appointment_date || '').slice(0, 10);
        if (byDay.has(key)) byDay.get(key).push(appointment);
    });
    calendar.className = `appointments-calendar is-${view}`;
    calendar.innerHTML = days.map((day) => {
        const key = day.toISOString().slice(0, 10);
        const label = day.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'America/Cancun' });
        const entries = (byDay.get(key) || []).sort((a, b) => String(a.appointment_time || '').localeCompare(String(b.appointment_time || '')));
        return `<section class="agenda-day-column"><h3>${escapeHtml(label)}</h3>${entries.length ? entries.map((item) => `<button type="button" class="agenda-calendar-item status-${escapeHtml(item.appointment_status || 'pendiente_confirmacion')}" data-open-ticket="${item.id}"><time>${escapeHtml(String(item.appointment_time || '').slice(0, 5) || 'Hora por confirmar')}</time><span><strong>${escapeHtml(item.device_type || 'Equipo')}</strong><small>${escapeHtml(getRepairClientName(item))} · ${escapeHtml(APPOINTMENT_STATUS_LABELS[item.appointment_status] || 'Pendiente')}</small></span></button>`).join('') : '<p class="agenda-day-empty">Sin citas</p>'}</section>`;
    }).join('');
}

async function fetchAppointmentConfig() {
    const grid = document.getElementById('appointmentSettingsGrid');
    if (grid) grid.innerHTML = '<div class="empty-state">Cargando configuración...</div>';
    try {
        const res = await fetch(`${API_BASE}/appointments/config`, { cache: 'no-store' });
        if (!res.ok) throw new Error('config failed');
        appointmentConfig = await res.json();
        renderAppointmentConfig();
    } catch (err) {
        console.error(err);
        if (grid) grid.innerHTML = '<div class="empty-state">No se pudo cargar la configuración.</div>';
    }
}

function renderAppointmentConfig() {
    const grid = document.getElementById('appointmentSettingsGrid');
    const exceptionsList = document.getElementById('appointmentExceptionsList');
    if (grid) {
        const settings = appointmentConfig.settings || [];
        grid.innerHTML = WEEKDAY_LABELS.map((label, weekday) => {
            const row = settings.find(item => Number(item.weekday) === weekday) || {};
            return `
                <div class="appointment-setting-row" data-weekday="${weekday}">
                    <strong>${label}</strong>
                    <label><input type="checkbox" data-setting="is_open" ${Number(row.is_open) ? 'checked' : ''}> Abierto</label>
                    <input class="admin-input" type="time" data-setting="start_time" value="${escapeHtml(String(row.start_time || '').slice(0, 5))}">
                    <input class="admin-input" type="time" data-setting="end_time" value="${escapeHtml(String(row.end_time || '').slice(0, 5))}">
                    <select class="admin-input" data-setting="slot_minutes">
                        ${[15, 30, 45, 60].map(v => `<option value="${v}" ${Number(row.slot_minutes || 30) === v ? 'selected' : ''}>${v} min</option>`).join('')}
                    </select>
                </div>`;
        }).join('');
    }
    if (exceptionsList) {
        const exceptions = appointmentConfig.exceptions || [];
        exceptionsList.innerHTML = exceptions.length
            ? exceptions.map(item => `<div class="repair-appointment-card"><div><strong>${escapeHtml(item.date)}</strong><span>${escapeHtml(item.status)} ${item.reason ? '- ' + escapeHtml(item.reason) : ''}</span></div></div>`).join('')
            : '<div class="empty-state">No hay reglas especiales registradas.</div>';
    }
}

async function saveAppointmentConfigFromUI() {
    const settings = Array.from(document.querySelectorAll('.appointment-setting-row')).map(row => ({
        weekday: Number(row.dataset.weekday),
        is_open: row.querySelector('[data-setting="is_open"]')?.checked ? 1 : 0,
        start_time: row.querySelector('[data-setting="start_time"]')?.value || null,
        end_time: row.querySelector('[data-setting="end_time"]')?.value || null,
        slot_minutes: Number(row.querySelector('[data-setting="slot_minutes"]')?.value || 30),
        allowed_types: 'recepcion,diagnostico,entrega,otro'
    }));
    const exceptions = appointmentConfig.exceptions || [];
    try {
        const res = await fetch(`${API_BASE}/admin/appointments/config`, {
            method: 'PATCH',
            headers: JSON_HEADERS,
            credentials: 'include',
            body: JSON.stringify({ settings, exceptions })
        });
        if (!res.ok) throw new Error('No se pudo guardar la configuración');
        const data = await res.json();
        appointmentConfig = data.config;
        renderAppointmentConfig();
        showAdminNotice('Configuracion de agenda guardada.', 'success');
    } catch (err) {
        showAdminNotice(err.message, 'error');
    }
}

function addAppointmentExceptionFromUI() {
    const date = document.getElementById('appointmentExceptionDate')?.value;
    if (!date) { showAdminNotice('Selecciona una fecha.', 'warning'); return; }
    appointmentConfig.exceptions = appointmentConfig.exceptions || [];
    appointmentConfig.exceptions = appointmentConfig.exceptions.filter(item => item.date !== date);
    appointmentConfig.exceptions.push({
        date,
        status: document.getElementById('appointmentExceptionStatus')?.value || 'closed',
        start_time: document.getElementById('appointmentExceptionStart')?.value || null,
        end_time: document.getElementById('appointmentExceptionEnd')?.value || null,
        slot_minutes: document.getElementById('appointmentExceptionSlot')?.value || null,
        reason: document.getElementById('appointmentExceptionReason')?.value || null
    });
    renderAppointmentConfig();
}

function openRepairDeleteConfirm(ticketId) {
    pendingDeleteRepairId = ticketId || activeRepairTicket?.id || null;
    if (!pendingDeleteRepairId) return;
    const ticket = allRepairs.find(item => String(item.id) === String(pendingDeleteRepairId)) || activeRepairTicket;
    const overlay = document.getElementById('repairDeleteConfirmOverlay');
    if (!overlay) return;

    const modalBody = overlay.querySelector('.admin-modal-body');
    if (modalBody && ticket) {
        const clientName = getRepairClientName(ticket);
        modalBody.innerHTML = `
            <p style="color:var(--a-text);font-weight:700;margin:0 0 10px;font-size:1rem;">¿Seguro que deseas eliminar el ticket #${escapeHtml(ticket.ticket_code)}?</p>
            <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);border-radius:8px;padding:12px 14px;margin-bottom:12px;font-size:0.88rem;line-height:1.5;">
                <div><strong>Cliente:</strong> ${escapeHtml(clientName)}</div>
                <div><strong>Equipo:</strong> ${escapeHtml(ticket.device_type || '')} ${escapeHtml(ticket.device_brand || '')}</div>
                <div><strong>Estado actual:</strong> ${escapeHtml(REPAIR_STATUS_LABELS[ticket.status] || ticket.status)}</div>
            </div>
            <p style="color:var(--a-text-dim);margin:0;font-size:0.85rem;">Esta acción moverá el ticket al estado <em>eliminado</em> y cancelará cualquier cita asociada pendiente.</p>
        `;
    }

    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    const cancelBtn = document.getElementById('repairDeleteCancel');
    if (cancelBtn) cancelBtn.focus();
}


function closeRepairDeleteConfirm() {
    const overlay = document.getElementById('repairDeleteConfirmOverlay');
    if (!overlay) return;
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
    pendingDeleteRepairId = null;
    if (!document.getElementById('repairDetailOverlay')?.classList.contains('show')) {
        document.body.classList.remove('modal-open');
    }
}

async function deleteRepairTicketConfirmed() {
    if (!pendingDeleteRepairId) return;
    const ticketId = pendingDeleteRepairId;
    try {
        const res = await fetch(`${API_BASE}/admin/tickets/${encodeURIComponent(ticketId)}/delete`, {
            method: 'PATCH',
            headers: JSON_HEADERS,
            credentials: 'include'
        });
        if (!res.ok) throw new Error('No se pudo eliminar el ticket');
        allRepairs = allRepairs.filter(item => String(item.id) !== String(ticketId));
        adminAppointments = adminAppointments.filter(item => String(item.id) !== String(ticketId));
        closeRepairDeleteConfirm();
        closeRepairTicketModal();
        renderRepairs();
        renderAdminAppointments();
        window.dispatchEvent(new CustomEvent('admin:data-changed', { detail: { source: 'ticket-delete', id: ticketId } }));
        const summary = document.getElementById('repairFilterSummary');
        if (summary) summary.textContent = 'Ticket eliminado correctamente.';
    } catch (err) {
        showAdminNotice(err.message, 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setupRepairModalOptions();
    populateRepairFilters();
    document.getElementById('adminGlobalSearchTrigger')?.addEventListener('click', (event) => openGlobalSearch(event.currentTarget));
    document.querySelectorAll('[data-search-close]').forEach((button) => button.addEventListener('click', closeGlobalSearch));
    document.getElementById('adminGlobalSearchDialog')?.addEventListener('click', (event) => { if (event.target.id === 'adminGlobalSearchDialog') closeGlobalSearch(); });
    document.getElementById('adminGlobalSearchInput')?.addEventListener('input', (event) => renderGlobalSearchResults(event.target.value));
    document.getElementById('adminGlobalSearchResults')?.addEventListener('click', (event) => {
        const result = event.target.closest('[data-global-result]');
        if (result) activateGlobalSearchResult(Number(result.dataset.globalResult));
    });
    document.getElementById('adminGlobalSearchInput')?.addEventListener('keydown', (event) => {
        if (!globalSearchResults.length) return;
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            globalSearchIndex = (globalSearchIndex + (event.key === 'ArrowDown' ? 1 : -1) + globalSearchResults.length) % globalSearchResults.length;
            renderGlobalSearchResults(event.currentTarget.value);
            document.querySelector(`[data-global-result="${globalSearchIndex}"]`)?.scrollIntoView({ block: 'nearest' });
        }
        if (event.key === 'Enter') { event.preventDefault(); activateGlobalSearchResult(); }
    });
    document.addEventListener('keydown', (event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openGlobalSearch(document.getElementById('adminGlobalSearchTrigger')); }
    });
    
    // Iniciar notificaciones tras un pequeño delay para que repairs ya estén cargados
    setTimeout(initNotifications, 1200);

    // Controles de Paginación CRM
    document.getElementById('crmPrevPage')?.addEventListener('click', () => {
        if (crmCurrentPage > 1) {
            crmCurrentPage--;
            renderRepairs();
        }
    });

    document.getElementById('crmNextPage')?.addEventListener('click', () => {
        crmCurrentPage++;
        renderRepairs();
    });

    document.getElementById('crmPageSize')?.addEventListener('change', (e) => {
        crmPageSize = parseInt(e.target.value, 10) || 25;
        crmCurrentPage = 1;
        renderRepairs();
    });

    // Selección múltiple CRM
    document.getElementById('crmSelectAll')?.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        const visibleCheckboxes = document.querySelectorAll('.crm-row-select');
        visibleCheckboxes.forEach(cb => {
            cb.checked = isChecked;
            const id = parseInt(cb.dataset.id, 10);
            if (isChecked) {
                crmSelectedTickets.add(id);
                cb.closest('tr')?.classList.add('selected');
            } else {
                crmSelectedTickets.delete(id);
                cb.closest('tr')?.classList.remove('selected');
            }
        });
        updateBulkToolbar();
    });

    // Event listener delegado para selección de checkboxes individuales
    document.getElementById('repairs-tbody')?.addEventListener('change', (e) => {
        if (e.target.classList.contains('crm-row-select')) {
            const cb = e.target;
            const id = parseInt(cb.dataset.id, 10);
            if (cb.checked) {
                crmSelectedTickets.add(id);
                cb.closest('tr')?.classList.add('selected');
            } else {
                crmSelectedTickets.delete(id);
                cb.closest('tr')?.classList.remove('selected');
            }
            updateBulkToolbar();
        }
    });

    // Exportación CSV
    document.getElementById('crmExportCsv')?.addEventListener('click', crmExportToCsv);
    document.getElementById('repairBulkExport')?.addEventListener('click', crmExportToCsv);
    document.getElementById('repairBulkStatus')?.addEventListener('click', (event) => openBulkActionDialog('status', event.currentTarget));
    document.getElementById('repairBulkAssign')?.addEventListener('click', (event) => openBulkActionDialog('assignee', event.currentTarget));
    document.getElementById('repairBulkPriority')?.addEventListener('click', (event) => openBulkActionDialog('priority', event.currentTarget));
    document.getElementById('repairBulkClear')?.addEventListener('click', () => { crmSelectedTickets.clear(); renderRepairs(); });
    document.getElementById('repairBulkDialogConfirm')?.addEventListener('click', confirmBulkAction);
    document.querySelectorAll('[data-bulk-close]').forEach((button) => button.addEventListener('click', closeBulkActionDialog));
    document.getElementById('repairBulkDialog')?.addEventListener('click', (event) => { if (event.target.id === 'repairBulkDialog') closeBulkActionDialog(); });
    document.querySelectorAll('[data-repair-quick-view]').forEach((button) => button.addEventListener('click', () => {
        activeRepairQuickView = button.dataset.repairQuickView || 'all';
        document.querySelectorAll('[data-repair-quick-view]').forEach((item) => item.classList.toggle('active', item === button));
        crmCurrentPage = 1;
        renderRepairs();
    }));

    ['repairSearchInput', 'repairStatusFilter', 'repairUrgencyFilter', 'repairDeviceFilter', 'repairServiceFilter'].forEach(id => {
        document.getElementById(id)?.addEventListener(id === 'repairSearchInput' ? 'input' : 'change', () => {
            if (id === 'repairDeviceFilter') refreshRepairServiceFilterOptions();
            crmCurrentPage = 1; // reset a la primera página al filtrar
            renderRepairs();
        });
    });
    document.getElementById('repairClearFilters')?.addEventListener('click', () => {
        ['repairSearchInput', 'repairStatusFilter', 'repairUrgencyFilter', 'repairDeviceFilter', 'repairServiceFilter'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.value = id === 'repairSearchInput' ? '' : 'all';
        });
        refreshRepairServiceFilterOptions();
        crmCurrentPage = 1;
        renderRepairs();
    });
    document.getElementById('repairFilterChips')?.addEventListener('click', (event) => {
        const chip = event.target.closest('[data-clear-filter]');
        if (!chip) return;
        const key = chip.dataset.clearFilter;
        const inputMap = { search: 'repairSearchInput', status: 'repairStatusFilter', urgency: 'repairUrgencyFilter', device: 'repairDeviceFilter', service: 'repairServiceFilter' };
        const input = document.getElementById(inputMap[key]);
        if (input) input.value = key === 'search' ? '' : 'all';
        if (key === 'device') refreshRepairServiceFilterOptions();
        crmCurrentPage = 1;
        renderRepairs();
    });
    document.addEventListener('click', (event) => {
        const copyBtn = event.target.closest('[data-copy-ticket]');
        if (copyBtn) {
            navigator.clipboard?.writeText(copyBtn.dataset.copyTicket || '');
            return;
        }
        const openBtn = event.target.closest('[data-open-ticket]');
        if (openBtn) {
            event.preventDefault();
            openRepairTicket(openBtn.dataset.openTicket);
            return;
        }
        const journeyFilter = event.target.closest('[data-journey-filter]');
        if (journeyFilter) {
            activeRepairQuickView = journeyFilter.dataset.journeyFilter || 'all';
            document.querySelectorAll('[data-repair-quick-view]').forEach((item) => item.classList.toggle('active', item.dataset.repairQuickView === activeRepairQuickView));
            document.querySelector('[data-view="repairs"]')?.click();
            renderRepairs();
            return;
        }
        const journeyTicket = event.target.closest('[data-ticket-open]');
        if (journeyTicket) { openRepairTicket(journeyTicket.dataset.ticketOpen, journeyTicket); return; }
        const deleteBtn = event.target.closest('[data-delete-ticket]');
        if (deleteBtn) {
            event.preventDefault();
            openRepairDeleteConfirm(deleteBtn.dataset.deleteTicket);
            return;
        }
        const appointmentAction = event.target.closest('[data-appointment-action]');
        if (appointmentAction && activeRepairTicket) {
            event.preventDefault();
            const statusSelect = document.getElementById('repairAppointmentStatus');
            if (statusSelect) statusSelect.value = appointmentAction.dataset.appointmentAction;
            saveRepairTicketChanges();
            return;
        }
        const row = event.target.closest('.repair-row');
        if (!row) return;
        if (event.target.closest('button, a, input, select, textarea')) return;
        openRepairTicket(row.dataset.ticketId);
    });
    document.addEventListener('keydown', (event) => {
        if ((event.key !== 'Enter' && event.key !== ' ') || !event.target.classList?.contains('repair-row')) return;
        event.preventDefault();
        openRepairTicket(event.target.dataset.ticketId);
    });
    document.getElementById('repairDetailClose')?.addEventListener('click', closeRepairTicketModal);
    document.getElementById('repairDetailCancel')?.addEventListener('click', closeRepairTicketModal);
    document.getElementById('repairDetailSave')?.addEventListener('click', saveRepairTicketChanges);
    document.addEventListener('change', (event) => {
        if (event.target.id === 'repairDetailAssignee') updateRepairAssignee(event.target.value);
    });
    document.getElementById('repairDetailDelete')?.addEventListener('click', () => openRepairDeleteConfirm(activeRepairTicket?.id));
    document.getElementById('repairTabTickets')?.addEventListener('click', () => switchRepairPanel('tickets'));
    document.getElementById('repairTabAgenda')?.addEventListener('click', () => switchRepairPanel('agenda'));
    document.getElementById('repairTabConfig')?.addEventListener('click', () => switchRepairPanel('config'));
    document.getElementById('appointmentRefresh')?.addEventListener('click', fetchAdminAppointments);
    document.getElementById('appointmentConfigSave')?.addEventListener('click', saveAppointmentConfigFromUI);
    document.getElementById('appointmentExceptionAdd')?.addEventListener('click', addAppointmentExceptionFromUI);
    document.querySelectorAll('[data-appointment-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-appointment-filter]').forEach(item => item.classList.remove('active'));
            btn.classList.add('active');
            activeAppointmentFilter = btn.dataset.appointmentFilter || 'today';
            setAppointmentRangeForFilter(activeAppointmentFilter);
            fetchAdminAppointments();
        });
    });
    document.querySelectorAll('[data-agenda-view]').forEach((button) => button.addEventListener('click', () => {
        activeAgendaView = button.dataset.agendaView || 'list';
        document.querySelectorAll('[data-agenda-view]').forEach((item) => {
            const selected = item === button;
            item.classList.toggle('active', selected);
            item.setAttribute('aria-selected', String(selected));
        });
        renderAdminAppointments();
    }));
    document.getElementById('repairDetailOverlay')?.addEventListener('click', (event) => {
        if (event.target.id === 'repairDetailOverlay') closeRepairTicketModal();
    });
    document.getElementById('repairDeleteConfirmClose')?.addEventListener('click', closeRepairDeleteConfirm);
    document.getElementById('repairDeleteCancel')?.addEventListener('click', closeRepairDeleteConfirm);
    document.getElementById('repairDeleteConfirm')?.addEventListener('click', deleteRepairTicketConfirmed);
    document.getElementById('repairDeleteConfirmOverlay')?.addEventListener('click', (event) => {
        if (event.target.id === 'repairDeleteConfirmOverlay') closeRepairDeleteConfirm();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Tab') {
            const overlay = document.querySelector('.admin-search-overlay:not([hidden]), .crm-drawer-overlay.show, .admin-modal-overlay.show');
            if (overlay) {
                const focusable = Array.from(overlay.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter((element) => element.getClientRects().length > 0);
                const first = focusable[0];
                const last = focusable.at(-1);
                if (first && last) {
                    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
                }
            }
        }
        if (event.key === 'Escape') {
            if (!document.getElementById('adminGlobalSearchDialog')?.hidden) { closeGlobalSearch(); return; }
            if (!document.getElementById('repairBulkDialog')?.hidden) { closeBulkActionDialog(); return; }
            if (document.getElementById('repairDeleteConfirmOverlay')?.classList.contains('show')) {
                closeRepairDeleteConfirm();
                return;
            }
            if (document.getElementById('repairDetailOverlay')?.classList.contains('show')) {
                closeRepairTicketModal();
                return;
            }
            if (document.getElementById('faqModalOverlay')?.classList.contains('show')) {
                closeFaqModal();
                return;
            }
            if (document.getElementById('buildModalOverlay')?.classList.contains('show')) {
                closeBuildModal();
                return;
            }
        }
    });
});


function crmExportToCsv() {
    const filtered = filterRepairs();
    if (filtered.length === 0) {
        showAdminNotice('No hay registros para exportar', 'warning');
        return;
    }

    const headers = ['Folio', 'Cliente', 'Celular', 'Email', 'Dispositivo', 'Marca', 'Modelo', 'Falla/Servicio', 'Prioridad', 'Estado', 'Fecha Registro', 'Costo Estimado', 'Costo Final'];
    const rows = filtered.map(r => {
        const details = parseRepairDetails(r);
        return [
            r.ticket_code,
            getRepairClientName(r),
            r.contact_phone || '',
            getRepairContactEmail(r),
            r.device_type,
            r.device_brand || '',
            r.device_model || '',
            details.service,
            r.priority,
            r.status,
            r.created_at,
            r.estimated_cost || 0,
            r.final_cost || 0
        ];
    });

    const csvContent = "\uFEFF" + [
        headers.join(','),
        ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `crm_repairs_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

window.openRepairModal = function() {
    setupRepairModalOptions();
    document.getElementById('repairCustomer').value = '';
    document.getElementById('repairType').value = 'Laptop';
    syncRepairDeviceOther();
    updateRepairModalServices();
    document.getElementById('repairPriority').value = 'normal';
    document.getElementById('repairDeviceOther').value = '';
    document.getElementById('repairBrand').value = '';
    document.getElementById('repairModel').value = '';
    document.getElementById('repairServiceOther').value = '';
    document.getElementById('repairIssue').value = '';
    document.getElementById('repairPhone').value = '';
    document.getElementById('repairEmail').value = '';
    document.getElementById('repairModalOverlay').classList.add('show');
};

window.closeRepairModal = function() {
    document.getElementById('repairModalOverlay').classList.remove('show');
};

window.saveRepair = async function() {
    const user_name = document.getElementById('repairCustomer').value.trim();
    const deviceRaw = document.getElementById('repairType').value;
    const device_type = deviceRaw === 'Otro'
        ? document.getElementById('repairDeviceOther').value.trim()
        : deviceRaw;
    const serviceRaw = document.getElementById('repairService').value;
    const service_requested = serviceRaw === 'Otro'
        ? document.getElementById('repairServiceOther').value.trim()
        : serviceRaw;
    const priority = document.getElementById('repairPriority').value;
    const device_brand = document.getElementById('repairBrand').value.trim();
    const device_model = document.getElementById('repairModel').value.trim();
    const reported_issue = document.getElementById('repairIssue').value.trim();
    const contact_phone = document.getElementById('repairPhone').value.trim();
    const contact_email = document.getElementById('repairEmail').value.trim();

    if(!user_name || !device_type || !service_requested || !device_brand || !reported_issue || !contact_phone) {
        showAdminNotice('Por favor, completa todos los campos requeridos.', 'warning');
        return;
    }

    const priorityLabel = REPAIR_PRIORITY_OPTIONS[priority]?.label || 'Normal';
    const issueWithService = [
        `Servicio solicitado: ${service_requested}`,
        '',
        reported_issue,
        '---',
        `Urgencia: ${priorityLabel}`
    ].join('\n');

    const payload = {
        user_name,
        device_type,
        service_requested,
        device_brand,
        device_model,
        reported_issue: issueWithService,
        contact_phone,
        contact_email,
        priority
    };

    try {
        const res = await fetch(`${API_BASE}/admin/repairs`, {
            method: 'POST',
            headers: JSON_HEADERS,
            credentials: 'include',
            body: JSON.stringify(payload)
        });
        if(!res.ok) throw new Error('Error al crear el ticket');

        await fetchRepairs();
        closeRepairModal();
        window.dispatchEvent(new CustomEvent('admin:data-changed', { detail: { source: 'ticket-create' } }));
    } catch(err) {
        showAdminNotice(err.message, 'error');
    }
};
async function fetchBuilds() {
    try {
        const res = await fetch(`${API_BASE}/admin/builds`, INCLUDE_CREDENTIALS);
        if (!res.ok) throw new Error('Error al cargar ensambles');
        allBuilds = await res.json();
        renderBuilds();
    } catch (err) {
        console.error(err);
    }
}

function renderBuilds() {
    const grid = document.getElementById('builds-grid');
    if(!grid) return;
    grid.innerHTML = '';

    if (allBuilds.length === 0) {
        grid.innerHTML = `<div style="text-align: center; color: #64748b; grid-column: 1 / -1; padding: 40px;">No hay ensambles creados.</div>`;
        return;
    }

    allBuilds.forEach(b => {
        const card = document.createElement('div');
        card.className = `admin-card`;
        card.innerHTML = `
            <div class="card-header">
                <div>
                    <div class="card-user" style="font-size: 1.1rem; color: #60a5fa;">${escapeHtml(b.title)}</div>
                    <div class="card-email">SKU: ${b.sku || 'SIN-SKU'} | ${b.build_category.toUpperCase()}</div>
                </div>
                <div class="status-badge status-approved">
                    $${Number(b.price).toLocaleString('es-MX')}
                </div>
            </div>
            <div class="card-text" style="margin-top:10px;">${escapeHtml(b.description)}</div>
            <div style="font-size: 0.85rem; color:#94a3b8; margin-top:10px;">
                Rendimiento: <strong>${b.performance_tier.toUpperCase()}</strong>
            </div>
        `;
        grid.appendChild(card);
    });
}

window.openBuildModal = function() {
    document.getElementById('buildTitle').value = '';
    document.getElementById('buildDescription').value = '';
    document.getElementById('buildPrice').value = '';
    document.getElementById('buildCategory').value = 'gaming';
    document.getElementById('buildTier').value = 'mid';
    document.getElementById('buildImage').value = '';
    document.getElementById('buildModalOverlay').classList.add('show');
};

window.closeBuildModal = function() {
    document.getElementById('buildModalOverlay').classList.remove('show');
};

window.saveBuild = async function() {
    const title = document.getElementById('buildTitle').value.trim();
    const description = document.getElementById('buildDescription').value.trim();
    const price = document.getElementById('buildPrice').value.trim();
    const build_category = document.getElementById('buildCategory').value;
    const performance_tier = document.getElementById('buildTier').value;
    const image_url = document.getElementById('buildImage').value.trim();

    if(!title || !price || !description) {
        showAdminNotice('Titulo, descripcion y precio son obligatorios.', 'warning');
        return;
    }

    const payload = {
        title, description, price, build_category, performance_tier, image_url
    };

    try {
        const res = await fetch(`${API_BASE}/admin/builds`, {
            method: 'POST',
            headers: JSON_HEADERS,
            credentials: 'include',
            body: JSON.stringify(payload)
        });
        if(!res.ok) throw new Error('Error al guardar el ensamble');
        
        await fetchBuilds();
        closeBuildModal();
    } catch(err) {
        showAdminNotice(err.message, 'error');
    }
};
