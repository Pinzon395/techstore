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
        const viewComments = document.getElementById('view-comments');
        const viewUsers = document.getElementById('view-users');
        const subtitle = document.getElementById('admin-subtitle');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                tabBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                const targetView = e.target.getAttribute('data-view');
                if (targetView === 'comments') {
                    viewComments.style.display = 'block';
                    viewUsers.style.display = 'none';
                    subtitle.textContent = 'Revisa, aprueba y gestiona los comentarios de los clientes.';
                } else if (targetView === 'users') {
                    viewComments.style.display = 'none';
                    viewUsers.style.display = 'block';
                    subtitle.textContent = 'Directorio de usuarios registrados en la plataforma.';
                }
            });
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
