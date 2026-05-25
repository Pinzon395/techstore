'use strict';

const API_BASE = '/api';
let allComments = [];
let allRepairs = [];
let allBuilds = [];
let currentFilter = 'all'; // all, pending, approved
let analyticsData = null;
let analyticsDailyData = [];
let analyticsTopPagesError = null;
let analyticsDailyError = null;
let allUsers = [];
let dashboardStatsUpdater = null;
let activeRepairTicket = null;
let appointmentConfig = { settings: [], exceptions: [] };
let adminAppointments = [];
let activeAppointmentFilter = 'today';
let pendingDeleteRepairId = null;

// M8 — header CSRF que el backend exige en POST/PUT/DELETE.
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
            fetchBuilds(),
            fetchAnalytics()
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

        // Configurar Tabs Principales
        const tabBtns = document.querySelectorAll('.admin-tab');
        const viewDashboard = document.getElementById('view-dashboard');
        const viewComments = document.getElementById('view-comments');
        const viewUsers = document.getElementById('view-users');
        const viewFaqs = document.getElementById('view-faqs');
        const viewRepairs = document.getElementById('view-repairs');
        const viewBuilds = document.getElementById('view-builds');
        const subtitle = document.getElementById('admin-subtitle');

        function updateDashboardStats() {
            const pendingComments = allComments.filter(c => c.approved === 0).length;
            setStatNumber('stat-comments-pending', pendingComments);
            setStatNumber('stat-users', allUsers.length);
            setStatNumber('stat-faqs-unanswered', allUnanswered.length);

            if (analyticsData) {
                setStatNumber('stat-total-views', analyticsData.totalViews || 0);
                setStatNumber('stat-today-views', analyticsData.todayViews || 0);
                setStatNumber('stat-unique-today', analyticsData.uniqueToday || 0);
                renderTopPages();
                renderDailyChart();
            }
        }
        dashboardStatsUpdater = updateDashboardStats;

        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                tabBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                const targetView = e.target.getAttribute('data-view');
                viewDashboard.style.display = 'none';
                viewComments.style.display = 'none';
                viewUsers.style.display = 'none';
                viewFaqs.style.display = 'none';
                if(viewRepairs) viewRepairs.style.display = 'none';
                if(viewBuilds) viewBuilds.style.display = 'none';

                if (targetView === 'dashboard') {
                    viewDashboard.style.display = 'block';
                    subtitle.textContent = 'Resumen general de tu plataforma.';
                    updateDashboardStats();
                } else if (targetView === 'comments') {
                    viewComments.style.display = 'block';
                    subtitle.textContent = 'Revisa, aprueba y gestiona los comentarios de los clientes.';
                } else if (targetView === 'users') {
                    viewUsers.style.display = 'block';
                    subtitle.textContent = 'Directorio de usuarios registrados en la plataforma.';
                } else if (targetView === 'faqs') {
                    viewFaqs.style.display = 'block';
                    subtitle.textContent = 'Gestiona las preguntas frecuentes y las dudas sin responder.';
                } else if (targetView === 'repairs') {
                    if(viewRepairs) viewRepairs.style.display = 'block';
                    subtitle.textContent = 'Administra los tickets de reparación y mantenimientos.';
                } else if (targetView === 'builds') {
                    if(viewBuilds) viewBuilds.style.display = 'block';
                    subtitle.textContent = 'Gestiona los paquetes y ensambles pre-configurados.';
                }
            });
        });
        
        // Initial dashboard stats population
        setTimeout(updateDashboardStats, 1000);

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
        alert('Error: ' + err.message);
    }
}

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

function renderComments() {
    const grid = document.getElementById('comments-grid');
    grid.innerHTML = '';

    let filtered = allComments;
    if (currentFilter === 'pending') filtered = allComments.filter(c => c.approved === 0);
    if (currentFilter === 'approved') filtered = allComments.filter(c => c.approved === 1);

    if (filtered.length === 0) {
        grid.innerHTML = `<div id="empty-state">No hay comentarios en esta categoría.</div>`;
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

        const isApproved = c.approved === 1;

        const card = document.createElement('div');
        card.className = `admin-card ${isApproved ? 'approved' : 'pending'}`;
        card.innerHTML = `
            <div class="card-header">
                <div>
                    <div class="card-user">${escapeHtml(c.name)}</div>
                    <div class="card-email"><i class="fa-solid fa-envelope"></i> ${escapeHtml(c.user_email || 'Sin correo')}</div>
                </div>
                <div class="status-badge ${isApproved ? 'status-approved' : 'status-pending'}">
                    ${isApproved ? '<i class="fa-solid fa-check"></i> Aprobado' : '<i class="fa-solid fa-clock"></i> Pendiente'}
                </div>
            </div>
            <div>
                <div class="card-stars">${starsHtml}</div>
                <div class="card-date">${date}</div>
            </div>
            <div class="card-text" onclick="this.classList.toggle('expanded')" title="Haz clic para expandir o contraer">${escapeHtml(c.text)}</div>
            <div class="card-actions">
                ${!isApproved ? `
                <button class="btn-admin btn-approve" onclick="approveComment(${c.id})">
                    <i class="fa-solid fa-check"></i> Aprobar
                </button>
                ` : ''}
                <button class="btn-admin btn-delete" onclick="deleteComment(${c.id})">
                    <i class="fa-solid fa-trash"></i> Eliminar
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

window.approveComment = async function(id) {
    if (!confirm('¿Seguro que deseas aprobar este comentario para que aparezca públicamente?')) return;
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
        alert(err.message);
    }
};

window.deleteComment = async function(id) {
    if (!confirm('¿Seguro que deseas eliminar definitivamente este comentario?')) return;
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
        alert(err.message);
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
                const newComment = JSON.parse(e.data);
                // Evitar duplicados
                if (!allComments.some(c => c.id === newComment.id)) {
                    allComments.unshift(newComment); // Añadir al principio
                    renderComments();
                    if (dashboardStatsUpdater) dashboardStatsUpdater();
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

/* ─────────────────────────────────────────────────────────────
   ANALYTICS
───────────────────────────────────────────────────────────── */
async function fetchAnalytics() {
    const [summaryResult, topPagesResult, dailyResult] = await Promise.allSettled([
        fetchJsonOrThrow(`${API_BASE}/admin/analytics/summary`, 'resumen de visitas'),
        fetchJsonOrThrow(`${API_BASE}/admin/analytics/top-pages?days=30&limit=10`, 'páginas más visitadas'),
        fetchJsonOrThrow(`${API_BASE}/admin/analytics/daily?days=14`, 'tráfico diario')
    ]);

    const summary = summaryResult.status === 'fulfilled'
        ? summaryResult.value
        : { totalViews: 0, todayViews: 0, uniqueToday: 0 };
    const topPages = topPagesResult.status === 'fulfilled' && Array.isArray(topPagesResult.value)
        ? topPagesResult.value
        : [];

    analyticsData = { ...summary, topPages };
    analyticsDailyData = dailyResult.status === 'fulfilled' && Array.isArray(dailyResult.value)
        ? dailyResult.value
        : [];
    analyticsTopPagesError = topPagesResult.status === 'rejected' ? topPagesResult.reason : null;
    analyticsDailyError = dailyResult.status === 'rejected' ? dailyResult.reason : null;

    if (dashboardStatsUpdater) dashboardStatsUpdater();
}

async function fetchJsonOrThrow(url, label) {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error(`No se pudo cargar ${label} (HTTP ${res.status})`);
    return res.json();
}

function setStatNumber(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = Number(value || 0).toLocaleString('es-MX');
}

function renderAnalyticsError(err) {
    const message = escapeHtml(err?.message || 'No se pudieron cargar las métricas.');
    const top = document.getElementById('analytics-top-pages');
    const chart = document.getElementById('analytics-chart');
    if (top) top.innerHTML = `<div class="empty-state">Error al cargar páginas más visitadas: ${message}</div>`;
    if (chart) chart.innerHTML = `<div class="empty-state">Error al cargar tráfico diario: ${message}</div>`;
}

function renderTopPagesError(err) {
    const top = document.getElementById('analytics-top-pages');
    if (top) top.innerHTML = `<div class="empty-state">Error al cargar páginas más visitadas: ${escapeHtml(err?.message || 'Error desconocido')}</div>`;
}

function renderDailyChartError(err) {
    const chart = document.getElementById('analytics-chart');
    if (chart) chart.innerHTML = `<div class="empty-state">Error al cargar tráfico diario: ${escapeHtml(err?.message || 'Error desconocido')}</div>`;
}

function renderTopPages() {
    const container = document.getElementById('analytics-top-pages');
    if (!container || !analyticsData?.topPages) return;
    container.innerHTML = '';
    if (analyticsTopPagesError) {
        renderTopPagesError(analyticsTopPagesError);
        return;
    }

    if (analyticsData.topPages.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:#64748b; padding:20px;">Sin datos aún. Las visitas se registran cuando los usuarios navegan.</div>';
        return;
    }

    const list = document.createElement('div');
    list.style.cssText = 'display:flex; flex-direction:column; gap:8px;';

    analyticsData.topPages.forEach((page, i) => {
        const path = page.path || '/';
        const displayPath = path.length > 40 ? path.slice(0, 40) + '…' : path;
        const maxWidth = Math.min((page.views / analyticsData.topPages[0].views) * 100, 100);

        const row = document.createElement('div');
        row.style.cssText = 'display:flex; align-items:center; gap:10px;';
        row.innerHTML = `
            <span style="color:#64748b; font-weight:700; min-width:24px;">${i + 1}</span>
            <div style="flex:1;">
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                    <span style="color:#f1f5f9; font-size:0.9rem;">${escapeHtml(displayPath)}</span>
                    <span style="color:#60a5fa; font-weight:600;">${page.views.toLocaleString('es-MX')}</span>
                </div>
                <div style="height:6px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden;">
                    <div style="height:100%; width:${maxWidth}%; background:linear-gradient(90deg,#3b82f6,#6366f1); border-radius:3px; transition:width 0.5s ease;"></div>
                </div>
            </div>
        `;
        list.appendChild(row);
    });

    container.appendChild(list);
}

function renderDailyChart() {
    const ctx = document.getElementById('analytics-chart');
    if (!ctx) return;
    if (analyticsDailyError) {
        renderDailyChartError(analyticsDailyError);
        return;
    }

    const data = analyticsDailyData || [];
    if (!data.length) {
        ctx.innerHTML = '<div style="text-align:center; color:#64748b; padding:20px;">Sin tráfico diario todavía.</div>';
        return;
    }

            const labels = data.map(d => {
                const parts = d.date.split('-');
                return parts[2] + '/' + parts[1];
            }).reverse();

            const views = data.map(d => d.views).reverse();
            const uniques = data.map(d => d.unique_visitors).reverse();

            const maxVal = Math.max(...views, 1);
            const barHeight = 160;

            const barsContainer = ctx.querySelector('.chart-bars') || document.createElement('div');
            barsContainer.className = 'chart-bars';
            barsContainer.style.cssText = 'display:flex; align-items:flex-end; gap:4px; height:' + barHeight + 'px; padding:0 4px;';

            barsContainer.innerHTML = views.map((v, i) => {
                const h = (v / maxVal) * barHeight;
                const w = Math.max(20, Math.min(40, 600 / data.length));
                return `
                    <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:2px;">
                        <span style="font-size:0.65rem; color:#94a3b8;">${v}</span>
                        <div style="width:100%; height:${h}px; background:linear-gradient(180deg,#3b82f6,#6366f1); border-radius:3px 3px 0 0; transition:height 0.3s ease; min-height:2px;"></div>
                        <span style="font-size:0.6rem; color:#64748b; margin-top:2px;">${labels[i]}</span>
                    </div>
                `;
            }).join('');

            ctx.innerHTML = '';
            ctx.appendChild(barsContainer);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
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
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#64748b;">No hay registros de búsquedas sin respuesta. 🎉</td></tr>`;
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
        `;
        tbody.appendChild(tr);
    });
}

function renderFaqs() {
    const container = document.getElementById('faqs-container');
    if(!container) return;
    container.innerHTML = '';

    const searchTerm = (document.getElementById('faqSearchInput') ? document.getElementById('faqSearchInput').value.toLowerCase() : '');
    const categoryFilter = document.getElementById('faqCategoryFilter')?.value || 'all';

    let filtered = allFaqs;
    if (searchTerm) {
        filtered = allFaqs.filter(f => 
            f.question.toLowerCase().includes(searchTerm) || 
            f.answer.toLowerCase().includes(searchTerm) || 
            f.category.toLowerCase().includes(searchTerm)
        );
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
    if(searchInput) {
        searchInput.addEventListener('input', () => {
            renderFaqs();
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
    if (!confirm('¿Seguro que deseas vaciar el registro de búsquedas sin respuesta?')) return;
    try {
        const res = await fetch(`${API_BASE}/admin/faqs/unanswered`, { method: 'DELETE', headers: CSRF_HEADER, credentials: 'include' });
        if (!res.ok) throw new Error('Error al limpiar');
        allUnanswered = [];
        renderUnanswered();
    } catch (err) {
        alert(err.message);
    }
};

window.addNewFaq = function() {
    document.getElementById('faqModalTitle').textContent = 'Nueva Pregunta';
    document.getElementById('faqId').value = '';
    document.getElementById('faqCategory').value = '';
    document.getElementById('faqIcon').value = 'fa-solid fa-circle-question';
    document.getElementById('faqQuestion').value = '';
    document.getElementById('faqAnswer').value = '';
    document.getElementById('faqOrder').value = '0';
    
    document.getElementById('faqModalOverlay').classList.add('show');
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
        alert('Por favor, completa Categoría, Pregunta y Respuesta.');
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
        alert(err.message);
    }
};

window.deleteAdminFaq = async function(id) {
    if (!confirm('¿Seguro que deseas eliminar esta pregunta frecuente?')) return;
    try {
        const res = await fetch(`${API_BASE}/admin/faqs/${id}`, { method: 'DELETE', headers: CSRF_HEADER, credentials: 'include' });
        if (!res.ok) throw new Error('Error al eliminar FAQ');
        await fetchFaqs();
    } catch (err) {
        alert(err.message);
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
    } catch (err) {
        console.error(err);
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

const REPAIR_DEVICE_SERVICE_OPTIONS = window.PIXON_TICKET_OPTIONSí.services || {
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

const REPAIR_PRIORITY_OPTIONS = window.PIXON_TICKET_OPTIONSí.priorities || {
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
    populateSelectOptions('repairStatusFilter', Object.keys(REPAIR_STATUS_LABELS), 'Todos', REPAIR_STATUS_LABELS);
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
    return allRepairs.filter(r => {
        const service = inferRepairService(r);
        const clientName = getRepairClientName(r);
        const urgency = inferRepairUrgency(r);
        const haystack = normalizeText([r.ticket_code, clientName, r.user_email, r.contact_email, r.contact_phone, r.device_type, r.device_brand, r.device_model, r.reported_issue, r.notes_internal, service, REPAIR_STATUS_LABELS[r.status] || r.status].join(' '));
        return (!filters.search || haystack.includes(filters.search))
            && (filters.status === 'all' || r.status === filters.status)
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
        .filter(([key]) => key !== 'waiting_parts')
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

function renderRepairDetailModal(ticket) {
    activeRepairTicket = ticket;
    const details = parseRepairDetails(ticket);
    const clientName = getRepairClientName(ticket);
    const contactEmail = getRepairContactEmail(ticket);
    const statusColor = REPAIR_STATUS_COLORS[ticket.status] || '#cbd5e1';
    const urgency = inferRepairUrgency(ticket);
    const urgencyLabel = REPAIR_PRIORITY_OPTIONS[urgency]?.label || repairValue(ticket.priority);
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
        <span>Creado: ${escapeHtml(formatRepairDate(ticket.created_at))}</span>
        ${details.isB2b ? '<span>B2B / Empresarial</span>' : ''}
    `;
    if (saveMessage) saveMessage.textContent = '';

    body.innerHTML = `
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
                    </div>
                    <div class="repair-ticket-field-grid">
                        ${renderRepairField('Fecha de cita', formatRepairDate(ticket.appointment_at))}
                        ${renderRepairField('Fecha prometida', formatRepairDate(ticket.promised_at))}
                        ${renderRepairField('Fecha de entrega', formatRepairDate(ticket.delivered_at))}
                        ${renderRepairField('Garantía', formatRepairDate(ticket.warranty_until))}
                    </div>
                    <label class="repair-ticket-label">Diagnóstico técnico<textarea id="repairDetailDiagnostic" class="admin-input" rows="5">${escapeHtml(ticket.diagnostic || '')}</textarea></label>
                    <label class="repair-ticket-label">Notas internas<textarea id="repairDetailNotes" class="admin-input" rows="6">${escapeHtml(ticket.notes_internal || '')}</textarea></label>
                </section>
                <section class="repair-ticket-section repair-ticket-appointment-section">
                    <h3>Cita / Agenda</h3>
                    <div class="repair-ticket-form-grid">
                        <label>Tipo de visita<select id="repairAppointmentType" class="admin-input">${renderAppointmentTypeOptions(ticket.appointment_type || 'Recepción de equipo')}</select></label>
                        <label>Estado de cita<select id="repairAppointmentStatus" class="admin-input">${renderAppointmentStatusOptions(ticket.appointment_status || 'pendiente_confirmacion')}</select></label>
                        <label>Fecha<input id="repairAppointmentDate" class="admin-input" type="date" value="${escapeHtml(ticket.appointment_date || '')}"></label>
                        <label>Hora<input id="repairAppointmentTime" class="admin-input" type="time" value="${escapeHtml(String(ticket.appointment_time || '').slice(0, 5))}"></label>
                    </div>
                    <div class="repair-ticket-field-grid">
                        ${renderRepairField('Como traera el equipo', ticket.appointment_delivery_method)}
                        ${renderRepairField('Estado de cita', APPOINTMENT_STATUS_LABELS[ticket.appointment_status] || ticket.appointment_status)}
                    </div>
                    ${renderRepairText('Comentario de cita', ticket.appointment_note)}
                    <div class="repair-detail-actions">
                        <button class="btn-admin btn-approve" type="button" data-appointment-action="confirmada">Confirmar cita</button>
                        <button class="btn-admin" type="button" data-appointment-action="reagendada">Reagendar</button>
                        <button class="btn-admin btn-delete" type="button" data-appointment-action="cancelada">Cancelar cita</button>
                    </div>
                </section>
            </div>
        </div>
    `;
}

async function openRepairTicket(ticketId) {
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
        if (!res.ok) throw new Error(`load failed: ${res.status}`);
        const data = await res.json();
        const ticket = data.ticket || data.repair || data;
        if (!ticket || !ticket.id) throw new Error('invalid ticket payload');
        renderRepairDetailModal(ticket);
    } catch (err) {
        console.error('No se pudo cargar el detalle por endpoint; usando datos ya cargados en tabla.', err);
        if (fallbackTicket) {
            renderRepairDetailModal(fallbackTicket);
            return;
        }
        body.innerHTML = '<div class="empty-state">No se pudo cargar la información completa del ticket. Intenta de nuevo.</div>';
    }
}

function closeRepairTicketModal() {
    const overlay = document.getElementById('repairDetailOverlay');
    if (!overlay) return;
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    activeRepairTicket = null;
}

async function saveRepairTicketChanges() {
    if (!activeRepairTicket) return;
    const saveMessage = document.getElementById('repairDetailSaveMessage');
    const payload = {
        status: document.getElementById('repairDetailStatus')?.value,
        priority: document.getElementById('repairDetailPriority')?.value,
        diagnostic: document.getElementById('repairDetailDiagnostic')?.value || '',
        notes_internal: document.getElementById('repairDetailNotes')?.value || '',
        estimated_cost: document.getElementById('repairDetailEstimatedCost')?.value || null,
        final_cost: document.getElementById('repairDetailFinalCost')?.value || null,
        appointment_type: document.getElementById('repairAppointmentType')?.value || null,
        appointment_status: document.getElementById('repairAppointmentStatus')?.value || 'pendiente_confirmacion',
        appointment_date: document.getElementById('repairAppointmentDate')?.value || null,
        appointment_time: document.getElementById('repairAppointmentTime')?.value || null,
        appointment_datetime: document.getElementById('repairAppointmentDate')?.value && document.getElementById('repairAppointmentTime')?.value
            ? `${document.getElementById('repairAppointmentDate').value} ${document.getElementById('repairAppointmentTime').value}:00`
            : null
    };
    try {
        const res = await fetch(`${API_BASE}/admin/tickets/${activeRepairTicket.id}`, {
            method: 'PATCH',
            headers: JSON_HEADERS,
            credentials: 'include',
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('save failed');
        const data = await res.json();
        const index = allRepairs.findIndex(item => String(item.id) === String(data.ticket.id));
        if (index >= 0) allRepairs[index] = data.ticket;
        renderRepairs();
        renderRepairDetailModal(data.ticket);
        if (saveMessage) saveMessage.textContent = 'Cambios guardados correctamente.';
    } catch (err) {
        console.error(err);
        if (saveMessage) saveMessage.textContent = 'No se pudieron guardar los cambios.';
    }
}

/* ─────────────────────────────────────────────────────────────
   TALLER (REPAIRS) UI
───────────────────────────────────────────────────────────── */

function renderRepairs() {
    const tbody = document.getElementById('repairs-tbody');
    if(!tbody) return;
    tbody.innerHTML = '';

    const filteredRepairs = filterRepairs();
    const summary = document.getElementById('repairFilterSummary');
    if (summary) {
        summary.textContent = `Mostrando ${filteredRepairs.length} de ${allRepairs.length} ticket(s). Usa Abrir para ver la ficha completa del ticket.`;
    }

    if (filteredRepairs.length === 0) {
        const message = allRepairs.length === 0 ? 'Aún no hay tickets registrados.' : 'No hay tickets que coincidan con los filtros.';
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#64748b;">${message}</td></tr>`;
        return;
    }

    filteredRepairs.forEach(r => {
        const date = formatRepairDate(r.created_at);
        const color = REPAIR_STATUS_COLORS[r.status] || '#cbd5e1';
        const clientName = getRepairClientName(r);
        const service = inferRepairService(r);
        const issueDescription = getRepairIssueDescription(r);
        const urgency = inferRepairUrgency(r);
        const urgencyColor = urgency === 'urgent' ? '#ef4444' : urgency === 'work_school' ? '#f59e0b' : urgency === 'quote' ? '#38bdf8' : '#10b981';
        const urgencyLabel = REPAIR_PRIORITY_OPTIONS[urgency]?.label || urgency;

        const tr = document.createElement('tr');
        tr.className = 'repair-row';
        tr.setAttribute('data-ticket-id', r.id);
        tr.setAttribute('tabindex', '0');
        tr.innerHTML = `
            <td style="font-weight: 700; color: #818cf8;">#${escapeHtml(r.ticket_code)}</td>
            <td>${escapeHtml(clientName)}</td>
            <td>${escapeHtml(r.device_type)} ${escapeHtml(r.device_brand || '')}</td>
            <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(issueDescription)}</td>
            <td><span class="user-role-badge" style="background: ${urgencyColor}20; color: ${urgencyColor}; border: 1px solid ${urgencyColor}40;">${escapeHtml(urgencyLabel)}</span></td>
            <td><span class="user-role-badge" style="background: ${color}20; color: ${color}; border: 1px solid ${color}40;">${escapeHtml(REPAIR_STATUS_LABELS[r.status] || r.status)}</span></td>
            <td>${date}</td>
            <td>
                <button class="btn-admin repair-open-btn" type="button" data-open-ticket="${escapeHtml(r.id)}">
                    <i class="fa-solid fa-up-right-from-square"></i> Abrir
                </button>
                <button class="btn-admin btn-delete repair-delete-btn" type="button" data-delete-ticket="${escapeHtml(r.id)}">
                    <i class="fa-solid fa-trash"></i> Eliminar
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
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
    if (!list) return;
    const visibleAppointments = getFilteredAdminAppointments();
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
        alert('Configuración de agenda guardada.');
    } catch (err) {
        alert(err.message);
    }
}

function addAppointmentExceptionFromUI() {
    const date = document.getElementById('appointmentExceptionDate')?.value;
    if (!date) return alert('Selecciona una fecha.');
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
    const overlay = document.getElementById('repairDeleteConfirmOverlay');
    if (!overlay) return;
    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
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
        const summary = document.getElementById('repairFilterSummary');
        if (summary) summary.textContent = 'Ticket eliminado correctamente.';
    } catch (err) {
        alert(err.message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setupRepairModalOptions();
    populateRepairFilters();
    ['repairSearchInput', 'repairStatusFilter', 'repairUrgencyFilter', 'repairDeviceFilter', 'repairServiceFilter'].forEach(id => {
        document.getElementById(id)?.addEventListener(id === 'repairSearchInput' ? 'input' : 'change', () => {
            if (id === 'repairDeviceFilter') refreshRepairServiceFilterOptions();
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
        if (event.key === 'Escape' && document.getElementById('repairDetailOverlay')?.classList.contains('show')) {
            closeRepairTicketModal();
        }
        if (event.key === 'Escape' && document.getElementById('repairDeleteConfirmOverlay')?.classList.contains('show')) {
            closeRepairDeleteConfirm();
        }
    });
});

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
        alert('Por favor, completa todos los campos requeridos.');
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
    } catch(err) {
        alert(err.message);
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
        alert('Título, descripción y precio son obligatorios.');
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
        alert(err.message);
    }
};
