'use strict';

const API_BASE = '/api';
let allComments = [];
let currentFilter = 'all'; // all, pending, approved

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verificar permisos
    const authLoading = document.getElementById('auth-loading');
    const adminContent = document.getElementById('admin-content');
    
    try {
        const meRes = await fetch(`${API_BASE}/me`);
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
        await fetchComments();
        await fetchUsers();
        await fetchFaqs();
        await fetchUnanswered();
        
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
        const subtitle = document.getElementById('admin-subtitle');

        function updateDashboardStats() {
            const pendingComments = allComments.filter(c => c.approved === 0).length;
            document.getElementById('stat-comments-pending').textContent = pendingComments;
            document.getElementById('stat-users').textContent = document.querySelectorAll('#users-tbody tr').length;
            document.getElementById('stat-faqs-unanswered').textContent = allUnanswered.length;
        }

        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                tabBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                const targetView = e.target.getAttribute('data-view');
                viewDashboard.style.display = 'none';
                viewComments.style.display = 'none';
                viewUsers.style.display = 'none';
                viewFaqs.style.display = 'none';

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
        const res = await fetch(`${API_BASE}/admin/comments`);
        if (!res.ok) throw new Error('Error al cargar comentarios');
        allComments = await res.json();
        renderComments();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

async function fetchUsers() {
    try {
        const res = await fetch(`${API_BASE}/admin/users`);
        if (!res.ok) throw new Error('Error al cargar usuarios');
        const users = await res.json();
        renderUsers(users);
    } catch (err) {
        console.error(err);
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
        const res = await fetch(`${API_BASE}/admin/comments/${id}/approve`, { method: 'POST' });
        if (!res.ok) throw new Error('Error al aprobar');
        
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
        const res = await fetch(`${API_BASE}/admin/comments/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Error al eliminar');
        
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
                }
            } catch(err) {
                console.error("SSE parse error", err);
            }
        };

        sse.onerror = () => {
            liveIndicator.style.display = 'none';
            sse.close();
            setTimeout(connectSSE, 10000); // Reconectar en 10s
        };

    } catch (err) {
        console.error("No SSE", err);
    }
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
        const res = await fetch(`${API_BASE}/admin/faqs/unanswered`);
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

    let filtered = allFaqs;
    if (searchTerm) {
        filtered = allFaqs.filter(f => 
            f.question.toLowerCase().includes(searchTerm) || 
            f.answer.toLowerCase().includes(searchTerm) || 
            f.category.toLowerCase().includes(searchTerm)
        );
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

    for (const [cat, data] of Object.entries(grouped)) {
        // Sort items by display order
        data.items.sort((a, b) => a.display_order - b.display_order);

        const catSection = document.createElement('div');
        catSection.innerHTML = `<h3 class="faq-admin-category"><i class="${data.icon || 'fa-solid fa-circle-question'}"></i> ${escapeHtml(cat)}</h3>`;
        
        const grid = document.createElement('div');
        grid.className = 'admin-grid';
        grid.style.marginTop = '15px';

        data.items.forEach(f => {
            const card = document.createElement('div');
            card.className = `admin-card`;
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
}

// Escuchar búsqueda en tiempo real
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('faqSearchInput');
    if(searchInput) {
        searchInput.addEventListener('input', () => {
            renderFaqs();
        });
    }
});

window.clearUnanswered = async function() {
    if (!confirm('¿Seguro que deseas vaciar el registro de búsquedas sin respuesta?')) return;
    try {
        const res = await fetch(`${API_BASE}/admin/faqs/unanswered`, { method: 'DELETE' });
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
            headers: { 'Content-Type': 'application/json' },
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
        const res = await fetch(`${API_BASE}/admin/faqs/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Error al eliminar FAQ');
        await fetchFaqs();
    } catch (err) {
        alert(err.message);
    }
};
