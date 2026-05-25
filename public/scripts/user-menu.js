/**
 * ============================================================
 *  auth-ui.js — Navbar dinámica de autenticación
 *  Llena #nav-auth-area (desktop) y #nav-auth-area-mobile
 *  con base en la sesión activa de /api/me
 * ============================================================
 */

'use strict';

if (window.__pixonUserMenuLoaded) {
    // El layout lo carga globalmente; algunas vistas antiguas tambien lo incluyen.
} else {
window.__pixonUserMenuLoaded = true;

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Defiere `cb` a tiempo idle del navegador para no robar recursos a la
 * carga visual de la pagina. Fallback a setTimeout para Safari (no
 * soporta requestIdleCallback) — el timeout de 2000ms garantiza que
 * el callback corra como muy tarde 2s despues, incluso si el thread
 * principal sigue ocupado.
 */
function whenIdle(cb) {
    if ('requestIdleCallback' in window) {
        window.requestIdleCallback(cb, { timeout: 2000 });
    } else {
        setTimeout(cb, 1);
    }
}

function getAdminHref() {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') {
        return 'https://pixon.com.mx/admin';
    }
    return '/admin';
}

async function fetchCurrentUser() {
    try {
        const res = await fetch('/api/me', { credentials: 'include' });
        const data = await res.json();
        return data.user || null;
    } catch (_) {
        return null;
    }
}

function initAuthUI() {
    // 1) Render inmediato del estado "no logueado" — reserva el espacio
    //    del boton y evita layout shift mientras llega /api/me
    renderDesktopAuth(null);
    renderMobileAuth(null);

    // 2) Defiere la llamada a /api/me hasta que el navegador este idle.
    //    Si hay sesion activa, re-renderiza con el avatar; la mayoria
    //    de visitas son anonimas y se quedan con el render inicial.
    whenIdle(async () => {
        const user = await fetchCurrentUser();
        if (user) {
            renderDesktopAuth(user);
            renderMobileAuth(user);
            setupProfileListeners();
        }
    });
}

/* ── Desktop: #nav-auth-area ── */
function renderDesktopAuth(user) {
    const area = document.getElementById('nav-auth-area');
    if (!area) return;

    if (!user) {
        const returnTo = encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);
        area.innerHTML = `
            <a href="/auth/google?returnTo=${returnTo}" class="btn btn-primary nav-login-btn" id="btn-login-navbar">
                Iniciar Sesión&nbsp;<i class="fa-brands fa-google"></i>
            </a>`;
        return;
    }

    const isAdmin   = user.role === 'admin';
    const firstName = (user.name || 'Usuario').split(' ')[0];
    const avatar    = user.avatar
        || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'U')}&background=2563eb&color=fff`;
    const adminGear = document.getElementById('nav-admin-gear');
    if (adminGear) {
        adminGear.style.display = isAdmin ? 'inline-flex' : 'none';
        adminGear.href = getAdminHref();
    }
    const adminHref = getAdminHref();

    area.innerHTML = `
        <div class="nav-user-wrapper" id="nav-user-wrapper">
            <button class="nav-avatar-btn" id="nav-avatar-btn" aria-label="Menú de usuario" aria-expanded="false">
                <img src="${escapeHtml(avatar)}"
                     alt="${escapeHtml(user.name)}"
                     class="nav-avatar-img"
                     onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'U')}&background=2563eb&color=fff'">
                <span class="nav-user-name">${escapeHtml(firstName)}</span>
                <i class="fa-solid fa-chevron-down nav-chevron"></i>
            </button>
            <div class="nav-dropdown" id="nav-dropdown" role="menu">
                <div class="nav-dropdown-header">
                    <img src="${escapeHtml(avatar)}" alt="${escapeHtml(user.name)}" class="nav-dropdown-avatar">
                    <div class="nav-dropdown-info">
                        <span class="nav-dropdown-name">${escapeHtml(user.name)}</span>
                        <span class="nav-dropdown-email">${escapeHtml(user.email)}</span>
                        ${isAdmin ? '<span class="nav-badge-admin">Admin</span>' : ''}
                    </div>
                </div>
                <div class="nav-dropdown-divider"></div>
                ${isAdmin ? `
                <a href="${adminHref}" class="nav-dropdown-item" id="nav-item-admin" role="menuitem">
                    <i class="fa-solid fa-gauge-high"></i> Panel de Admin
                </a>` : ''}
                <button class="nav-dropdown-item" id="nav-item-profile" role="menuitem" style="width:100%; text-align:left; border:none; background:transparent; font-family:inherit; cursor:pointer;">
                    <i class="fa-solid fa-user-pen"></i> Completar Perfil
                </button>
                <a href="/auth/logout" class="nav-dropdown-item nav-dropdown-logout" id="nav-item-logout" role="menuitem">
                    <i class="fa-solid fa-right-from-bracket"></i> Cerrar sesión
                </a>
            </div>
        </div>`;

    // Toggle dropdown
    const avatarBtn = document.getElementById('nav-avatar-btn');
    const dropdown  = document.getElementById('nav-dropdown');

    if (avatarBtn && dropdown) {
        avatarBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropdown.classList.toggle('open');
            avatarBtn.setAttribute('aria-expanded', String(isOpen));
        });

        // Cerrar al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && e.target !== avatarBtn) {
                dropdown.classList.remove('open');
                avatarBtn.setAttribute('aria-expanded', 'false');
            }
        });

        // Cerrar con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                dropdown.classList.remove('open');
                avatarBtn.setAttribute('aria-expanded', 'false');
            }
        });
    }
}

/* ── Mobile: #nav-auth-area-mobile ── */
function renderMobileAuth(user) {
    const area = document.getElementById('nav-auth-area-mobile');
    if (!area) return;

    if (!user) {
        const returnTo = encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);
        area.innerHTML = `
            <a href="/auth/google?returnTo=${returnTo}" class="nav-links nav-login-mobile" id="btn-login-mobile">
                <i class="fa-brands fa-google"></i>&nbsp;Iniciar Sesión
            </a>`;
        return;
    }

    const isAdmin   = user.role === 'admin';
    const firstName = (user.name || 'Usuario').split(' ')[0];
    const adminHref = getAdminHref();

    area.innerHTML = `
        <span class="nav-mobile-username">
            <i class="fa-solid fa-circle-user"></i>&nbsp;${escapeHtml(firstName)}
        </span>
        ${isAdmin ? `
        <a href="${adminHref}" class="nav-links nav-admin-mobile" id="btn-admin-mobile">
            <i class="fa-solid fa-gear"></i>&nbsp;Panel de Admin
        </a>` : ''}
        <button class="nav-links" id="nav-item-profile-mobile" style="width:100%; text-align:left; border:none; background:transparent; font-family:inherit; cursor:pointer; color:#94a3b8; font-weight:600; padding:12px 15px; border-radius:8px; display:flex; align-items:center; gap:8px;">
            <i class="fa-solid fa-user-pen"></i>&nbsp;Completar Perfil
        </button>
        <a href="/auth/logout" class="nav-links nav-logout-mobile" id="btn-logout-mobile">
            <i class="fa-solid fa-right-from-bracket"></i>&nbsp;Cerrar sesión
        </a>`;
}

/* ── Lógica del Perfil (Modal para Celular) ── */
function setupProfileListeners() {
    const btnDesktop = document.getElementById('nav-item-profile');
    const btnMobile = document.getElementById('nav-item-profile-mobile');

    if (btnDesktop) btnDesktop.addEventListener('click', openProfileModal);
    if (btnMobile) btnMobile.addEventListener('click', openProfileModal);
}

function openProfileModal() {
    let modal = document.getElementById('profile-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'profile-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(8px);
            z-index: 10000; display: flex; align-items: center; justify-content: center;
            opacity: 0; transition: opacity 0.3s;
        `;
        modal.innerHTML = `
            <div style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95)); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 20px; padding: 30px; width: 90%; max-width: 400px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); position: relative; transform: translateY(20px); transition: transform 0.3s;">
                <button id="close-profile-modal" style="position: absolute; top: 15px; right: 15px; background: none; border: none; color: #94a3b8; font-size: 1.5rem; cursor: pointer;"><i class="fa-solid fa-xmark"></i></button>
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="width: 60px; height: 60px; border-radius: 50%; background: rgba(99, 102, 241, 0.15); color: #6366f1; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; margin: 0 auto 15px;">
                        <i class="fa-solid fa-mobile-screen"></i>
                    </div>
                    <h2 style="color: #f1f5f9; font-size: 1.4rem; margin-bottom: 5px; font-family: var(--font-heading);">Completar Perfil</h2>
                    <p style="color: #94a3b8; font-size: 0.9rem;">Agrega tu número de celular para que podamos contactarte rápidamente sobre tus reparaciones.</p>
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: #cbd5e1; font-size: 0.85rem; font-weight: 600; margin-bottom: 8px;">Número de Celular</label>
                    <input type="tel" id="profile-phone-input" placeholder="Ej. 998 123 4567" style="width: 100%; padding: 12px 15px; background: rgba(0, 0, 0, 0.2); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 8px; color: #f1f5f9; font-size: 1rem; outline: none; box-sizing: border-box; transition: border-color 0.2s;">
                </div>
                <button id="btn-save-profile" style="width: 100%; background: #6366f1; color: #fff; border: none; padding: 14px; border-radius: 8px; font-weight: 700; font-size: 1rem; cursor: pointer; transition: background 0.2s; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);">
                    Guardar Celular
                </button>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('close-profile-modal').addEventListener('click', () => {
            modal.style.opacity = '0';
            modal.children[0].style.transform = 'translateY(20px)';
            setTimeout(() => modal.remove(), 300);
        });

        document.getElementById('btn-save-profile').addEventListener('click', async () => {
            const phone = document.getElementById('profile-phone-input').value.trim();
            if (phone.length < 10) {
                alert('Por favor, ingresa un número de celular válido de al menos 10 dígitos.');
                return;
            }

            const btn = document.getElementById('btn-save-profile');
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Guardando...';
            btn.disabled = true;

            try {
                const res = await fetch('/api/me/profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
                    credentials: 'include',
                    body: JSON.stringify({ phone })
                });
                const data = await res.json();
                if (res.ok) {
                    btn.innerHTML = '<i class="fa-solid fa-check"></i> Guardado';
                    btn.style.background = '#10b981';
                    setTimeout(() => {
                        modal.style.opacity = '0';
                        setTimeout(() => modal.remove(), 300);
                    }, 1000);
                } else {
                    throw new Error(data.error || 'Error al guardar');
                }
            } catch (err) {
                alert(err.message);
                btn.innerHTML = 'Guardar Celular';
                btn.disabled = false;
            }
        });
    }

    // Trigger animation
    setTimeout(() => {
        modal.style.opacity = '1';
        modal.children[0].style.transform = 'translateY(0)';
    }, 10);
}

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthUI);
} else {
    initAuthUI();
}

}
