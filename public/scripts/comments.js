/**
 * ============================================================
 *  PIXON PC — comments.js  v3.0
 * ============================================================
 *
 *  NOVEDADES v3.0:
 *  - SSE (Server-Sent Events): nuevos comentarios aparecen
 *    en tiempo real para TODOS los usuarios sin recargar.
 *  - El carrusel muestra TODOS los comentarios de la DB,
 *    no solo los primeros 4.
 *  - Formulario con manejo de errores del servidor.
 *  - Indicador visual "En vivo" cuando SSE está conectado.
 *
 *  ARQUITECTURA:
 *  GET  /api/comments        → carga inicial (todos los comentarios)
 *  GET  /api/comments/stream → SSE: push de nuevos comentarios
 *  POST /api/comments        → publicar comentario
 *
 *  CARRUSEL — SPEC:
 *  - Container: overflow:hidden
 *  - Scroll: 100% controlado por JS via scrollLeft
 *  - Loop: 8x duplicate → scrollLeft -= halfWidth
 *  - Desktop: auto-scroll via rAF, pausa en hover/click
 *  - Mobile: drag con pointer events
 * ============================================================
 */

(function () {
    'use strict';

    /* ────────────────────────────────────────────────────────
       CONFIGURACIÓN
    ──────────────────────────────────────────────────────── */
    const CONFIG = {
        SCROLL_SPEED:    60,    // px/s
        RESUME_HOVER_MS: 700,
        RESUME_DRAG_MS:  1300,
        RESUME_CLICK_MS: 900,
        DT_CAP:          0.05,  // evita jumps al volver al tab
        MIN_LOOP_CARDS:  14,
        MAX_DUPLICATES:  4,
    };

    function showCommentMessage(section, message, type = 'error') {
        const host = section || document;
        let box = host.querySelector ? host.querySelector('[data-comment-message]') : null;
        if (!box && section) {
            box = document.createElement('div');
            box.setAttribute('data-comment-message', '');
            box.setAttribute('role', 'status');
            box.setAttribute('aria-live', 'polite');
            box.style.cssText = 'margin-top:12px;padding:12px 14px;border-radius:10px;font-weight:700;font-size:.95rem;';
            const form = section.querySelector('#commentForm') || section.querySelector('form');
            if (form) form.appendChild(box);
        }
        if (!box) return;
        box.textContent = message;
        box.style.display = 'block';
        box.style.color = type === 'success' ? '#065f46' : '#991b1b';
        box.style.background = type === 'success' ? '#d1fae5' : '#fee2e2';
        box.style.border = type === 'success' ? '1px solid #10b981' : '1px solid #fca5a5';
    }

    /* ────────────────────────────────────────────────────────
       API BASE
       Siempre relativo: en producción Express sirve la API en el
       mismo host; en dev Vite (5173) proxea /api → Express :3001
       (ver vite.config.js → server.proxy). Nunca hardcodear puertos.
    ──────────────────────────────────────────────────────── */
    const API_BASE = '/api';

    /* ────────────────────────────────────────────────────────
       COMENTARIOS SEMILLA (fallback offline)
    ──────────────────────────────────────────────────────── */
    const SEED = [
        { id: 1, name: 'Eduardo Álvarez',    stars: 5, text: 'Excelente servicio, dejé mi PC y todas las instalaciones se veían muy limpias y de calidad. Todo un experto.' },
        { id: 2, name: 'Ana Maria Martínez', stars: 5, text: 'Pensé que mi equipo estaba perdido, pero me salvaron y además recuperó velocidad. Rápido y confiable.' },
        { id: 3, name: 'Carlos Rodríguez',   stars: 5, text: 'Mi laptop gamer quedó como nueva. Las temperaturas bajaron 25 °C después del mantenimiento Pro. Recomendado 100%.' },
        { id: 4, name: 'Laura Gómez',        stars: 5, text: 'Llevé mi impresora que nadie quería reparar. En Pixon PC la dejaron lista en menos de 2 horas. Increíble.' },
    ];

    /* ═══════════════════════════════════════════════════════
       CAPA DE DATOS
    ═══════════════════════════════════════════════════════ */

    /** Obtiene todos los comentarios de la API + reseñas de Google (sin caché) */
    async function fetchComments() {
        try {
            const [localRes, googleRes] = await Promise.all([
                fetch(`${API_BASE}/comments?r=${Date.now()}`, {
                    signal: AbortSignal.timeout(4000)
                }),
                fetch(`${API_BASE}/reviews/google?r=${Date.now()}`, {
                    signal: AbortSignal.timeout(4000)
                })
            ]);

            let local = [];
            let googleReviews = [];

            if (localRes.ok) {
                local = await localRes.json();
            }

            if (googleRes.ok) {
                const googleData = await googleRes.json();
                // Apuntar el botón "Dejar reseña en Google Maps" al Place ID real
                if (googleData.place_id) {
                    const btn = document.getElementById('btn-google-reviews');
                    if (btn) {
                        btn.href = `https://search.google.com/local/writereview?placeid=${encodeURIComponent(googleData.place_id)}`;
                    }
                }
                if (googleData.reviews && googleData.reviews.length > 0) {
                    googleReviews = googleData.reviews.map(r => ({
                        id: r.id,
                        name: r.name,
                        stars: r.rating,
                        text: r.text,
                        source: 'google',
                        created_at: new Date(r.time * 1000).toISOString()
                    }));
                }
            }

            // Merge: Google reviews first, then local comments
            const merged = [...googleReviews, ...local];

            // Guardar copia offline
            try { localStorage.setItem('pixon_comments_v3', JSON.stringify(merged)); } catch (_) {}
            return merged;
        } catch (err) {
            console.info('API no disponible, usando caché local:', err.message);
            try {
                const raw = localStorage.getItem('pixon_comments_v3');
                if (raw) return JSON.parse(raw);
            } catch (_) {}
            return [...SEED];
        }
    }

    /** Publica un comentario nuevo en la API */
    async function saveComment(data) {
        const res = await fetch(`${API_BASE}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
            body: JSON.stringify(data),
            signal: AbortSignal.timeout(6000)
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.errors ? body.errors.join(' ') : `HTTP ${res.status}`);
        }
        return await res.json();
    }

    /* ═══════════════════════════════════════════════════════
       MOTOR DEL CARRUSEL
    ═══════════════════════════════════════════════════════ */
    function mountCarousel(container, track) {
        const S = CONFIG.SCROLL_SPEED;
        let paused = true;
        let running = false;
        let rafId  = null;
        let lastTs = null;
        let timer  = null;
        let halfWidth = 0;
        let dead = false;
        let lastInteraction = Date.now();
        let liftedTimer = null;

        requestAnimationFrame(() => requestAnimationFrame(() => {
            halfWidth = track.scrollWidth / 2;
        }));

        function stopLoop() {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = null;
            running = false;
            lastTs = null;
        }

        function startLoop() {
            if (dead || running || paused) return;
            running = true;
            rafId = requestAnimationFrame(step);
        }

        function step(ts) {
            if (dead) { stopLoop(); return; }
            if (!lastTs) lastTs = ts;
            const dt = Math.min((ts - lastTs) / 1000, CONFIG.DT_CAP);
            lastTs = ts;

            // Recalcular halfWidth periódicamente
            if (Math.round(ts) % 60 === 0) {
                halfWidth = track.scrollWidth / 2;
            }

            // Failsafe: si está pausado sin arrastrar y pasaron 2s → reanudar
            if (paused && !isDragging && !track.querySelector('.comment-item.lifted')) {
                if (Date.now() - lastInteraction > 2000) paused = false;
            }

            if (!paused && halfWidth > 0) {
                container.scrollLeft += S * dt;
                if (container.scrollLeft >= halfWidth - 1) {
                    container.scrollLeft -= halfWidth;
                }
            }
            if (!paused) {
                rafId = requestAnimationFrame(step);
            } else {
                stopLoop();
            }
        }

        function pause() {
            paused = true;
            lastInteraction = Date.now();
            clearTimeout(timer);
            stopLoop();
        }

        function resume(delay) {
            lastInteraction = Date.now();
            clearTimeout(timer);
            timer = setTimeout(() => {
                if (!track.querySelector('.comment-item.lifted')) {
                    paused = false;
                    lastTs = null;
                    startLoop();
                }
            }, delay ?? CONFIG.RESUME_HOVER_MS);
        }

        function onMouseEnter() { pause(); }
        function onMouseLeave() { resume(CONFIG.RESUME_HOVER_MS); }
        container.addEventListener('mouseenter', onMouseEnter);
        container.addEventListener('mouseleave', onMouseLeave);

        let isDragging = false;
        let dragStartX = 0;
        let scrollAtDrag = 0;

        function onPointerDown(e) {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            isDragging = true;
            dragStartX = e.clientX;
            scrollAtDrag = container.scrollLeft;
            track.querySelectorAll('.comment-item.lifted').forEach(c => c.classList.remove('lifted'));
            clearTimeout(liftedTimer);
            pause();
            container.setPointerCapture(e.pointerId);
        }

        function onPointerMove(e) {
            if (!isDragging) return;
            lastInteraction = Date.now();
            const delta = dragStartX - e.clientX;
            let newScroll = scrollAtDrag + delta;
            if (halfWidth > 0) {
                if (newScroll >= halfWidth) newScroll -= halfWidth;
                if (newScroll < 0) newScroll += halfWidth;
            }
            container.scrollLeft = newScroll;
        }

        function onPointerUp(e) {
            if (isDragging) {
                isDragging = false;
                if (e.pointerId) container.releasePointerCapture(e.pointerId);
                resume(CONFIG.RESUME_DRAG_MS);
            }
        }

        container.addEventListener('pointerdown',  onPointerDown);
        container.addEventListener('pointermove',  onPointerMove);
        container.addEventListener('pointerup',    onPointerUp);
        container.addEventListener('pointercancel', onPointerUp);
        document.addEventListener('pointerup',     onPointerUp);

        const cardHandlers = [];

        function attachCardClick(card) {
            function onClick(e) {
                if (isDragging) return;
                lastInteraction = Date.now();
                const wasLifted = card.classList.contains('lifted');
                track.querySelectorAll('.comment-item.lifted').forEach(c => c.classList.remove('lifted'));
                if (!wasLifted) {
                    card.classList.add('lifted');
                    pause();
                    clearTimeout(liftedTimer);
                    setTimeout(() => {
                        const cL = card.offsetLeft;
                        const cW = card.offsetWidth;
                        const sW = container.offsetWidth;
                        let targetScroll = cL - (sW / 2) + (cW / 2);
                        if (targetScroll < 0) targetScroll += halfWidth;
                        container.scrollLeft = targetScroll;
                    }, 50);
                    liftedTimer = setTimeout(() => {
                        if (card.classList.contains('lifted') && !isDragging) {
                            card.classList.remove('lifted');
                            resume(CONFIG.RESUME_CLICK_MS);
                        }
                    }, 3500);
                } else {
                    clearTimeout(liftedTimer);
                    resume(CONFIG.RESUME_CLICK_MS);
                }
            }
            card.addEventListener('click', onClick);
            cardHandlers.push({ card, onClick });
        }

        track.querySelectorAll('.comment-item').forEach(attachCardClick);

        function onDocClick(e) {
            if (!container.contains(e.target)) {
                track.querySelectorAll('.comment-item.lifted').forEach(c => c.classList.remove('lifted'));
                resume(400);
            }
        }
        document.addEventListener('click', onDocClick);

        // MutationObserver: adjuntar click a cards nuevas (insertas por SSE)
        const mutObs = new MutationObserver(mutations => {
            mutations.forEach(m => {
                m.addedNodes.forEach(node => {
                    if (node.classList && node.classList.contains('comment-item')) {
                        attachCardClick(node);
                    }
                });
            });
        });
        mutObs.observe(track, { childList: true });

        return {
            pause,
            resume,
            recalc() { halfWidth = track.scrollWidth / 2; },
            destroy() {
                dead = true;
                stopLoop();
                clearTimeout(timer);
                mutObs.disconnect();
                container.removeEventListener('mouseenter',  onMouseEnter);
                container.removeEventListener('mouseleave',  onMouseLeave);
                container.removeEventListener('pointerdown', onPointerDown);
                container.removeEventListener('pointermove', onPointerMove);
                container.removeEventListener('pointerup',   onPointerUp);
                container.removeEventListener('pointercancel', onPointerUp);
                document.removeEventListener('click',     onDocClick);
                document.removeEventListener('pointerup', onPointerUp);
                cardHandlers.forEach(({ card, onClick }) =>
                    card.removeEventListener('click', onClick));
            }
        };
    }

    /* ═══════════════════════════════════════════════════════
       HELPERS UI
    ═══════════════════════════════════════════════════════ */
    function starsHTML(n, source) {
        n = parseFloat(n) || 0;
        let html = '<span class="star-display">';
        for (let i = 1; i <= 5; i++) {
            if (n >= i) {
                html += '<span class="star-full"></span>';
            } else if (n >= i - 0.5) {
                html += '<span class="star-half"></span>';
            } else {
                html += '<span class="star-empty"></span>';
            }
        }
        html += '</span>';
        return html;
    }

    function sourceBadgeHTML(source) {
        if (source === 'google') {
            return '<span class="badge-google"><i class="fa-brands fa-google"></i> Google</span>';
        }
        return '';
    }

    function esc(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function buildCard(c) {
        const card = document.createElement('div');
        card.className = 'comment-item';
        card.dataset.id = c.id || '';
        const source = c.source || 'local';
        const badge = sourceBadgeHTML(source);
        card.innerHTML = `
            <div class="header">
                <h5>${esc(c.name)}${badge}</h5>
                <div class="stars">${starsHTML(c.stars, source)}</div>
            </div>
            <p>"${esc(c.text)}"</p>
        `;
        return card;
    }

    /* ═══════════════════════════════════════════════════════
       INICIALIZACIÓN
    ═══════════════════════════════════════════════════════ */
    function initComments() {
        document.querySelectorAll('.comments-marquee-container').forEach(container => {
            if (container.dataset.commentsReady === 'true') return;
            container.dataset.commentsReady = 'true';
            initCommentsInstance(container);
        });
    }

    function initCommentsInstance(container) {
        const root = container.closest('.comments-section-container') || document;
        const commentBox  = root.querySelector('#commentsBox');
        const commentForm = root.querySelector('#addCommentForm');
        const starRoot    = root.querySelector('#star-rating');
        const liveIndicator = root.querySelector('#comments-live-indicator');
        const findInSection = selector => root.querySelector(selector);

        if (!commentBox || !container) return;

        /* ── Estado ───────────────────────────────────────── */
        let currentRating = 5;
        let carousel = null;
        let allComments = [];  // lista maestra en memoria (más recientes primero)
        let sseSource = null;  // EventSource activo

        /* ── Estrellas interactivas (soporta medias) ─────── */
        // Soporta dos modos: nuevo (.star-slot + .star-zone con data-val decimal)
        // y legacy (<i class="fa-star" data-val="1..5">).
        const starZones = starRoot ? starRoot.querySelectorAll('.star-zone') : [];
        const starSlots = starRoot ? starRoot.querySelectorAll('.star-slot') : [];
        const legacyStars = starRoot ? starRoot.querySelectorAll('i.fa-star') : [];
        const ratingLabel = starRoot ? starRoot.querySelector('.rating-label') : null;
        const isHalfMode  = starZones.length === 10;

        function paintStars(rating) {
            if (isHalfMode) {
                starSlots.forEach((slot, idx) => {
                    const base = idx + 1; // 1..5
                    const fg = slot.querySelector('.star-fg');
                    const fillPercent = Math.max(0, Math.min(1, rating - (base - 1))) * 100;
                    const hiddenPercent = 100 - fillPercent;
                    const clip = 'inset(0 ' + hiddenPercent + '% 0 0)';
                    slot.classList.remove('full', 'half');
                    if (fillPercent === 100) {
                        slot.classList.add('full');
                    } else if (fillPercent === 50) {
                        slot.classList.add('half');
                    }
                    if (fg) {
                        fg.style.color = '#f59e0b';
                        fg.style.fill = 'currentColor';
                        fg.style.clipPath = clip;
                        fg.style.webkitClipPath = clip;
                    }
                });
                if (ratingLabel) {
                    if (rating > 0) {
                        ratingLabel.textContent = rating.toFixed(1) + ' / 5.0';
                        ratingLabel.classList.add('has-value');
                    } else {
                        ratingLabel.textContent = '';
                        ratingLabel.classList.remove('has-value');
                    }
                }
            } else {
                legacyStars.forEach(star => {
                    const val = parseInt(star.getAttribute('data-val'));
                    star.style.color = val <= rating ? '#f59e0b' : '#cbd5e1';
                    star.classList.toggle('active', val <= rating);
                });
            }
        }

        if (isHalfMode) {
            starZones.forEach(zone => {
                const v = parseFloat(zone.getAttribute('data-val'));
                zone.addEventListener('click', () => {
                    currentRating = v;
                    paintStars(currentRating);
                });
                zone.addEventListener('mouseenter', () => paintStars(v));
                zone.addEventListener('focus',      () => paintStars(v));
            });
            starRoot.addEventListener('mouseleave', () => paintStars(currentRating));
            starRoot.addEventListener('focusout',   () => paintStars(currentRating));
        } else {
            legacyStars.forEach(star => {
                star.addEventListener('click', () => {
                    currentRating = parseInt(star.getAttribute('data-val'));
                    paintStars(currentRating);
                });
                star.addEventListener('mouseenter', () =>
                    paintStars(parseInt(star.getAttribute('data-val'))));
                star.addEventListener('mouseleave', () => paintStars(currentRating));
            });
        }
        paintStars(currentRating);

        /* ── Renderizar el carrusel ──────────────────────── */
        function renderCarousel(comments) {
            if (carousel) {
                carousel.destroy();
                carousel = null;
            }

            if (!comments.length) {
                commentBox.innerHTML = '<div class="comment-item" style="min-width:260px;text-align:center;opacity:0.6;">Sé el primero en comentar 🌟</div>';
            } else {
                commentBox.innerHTML = '';
                const repeats = Math.max(
                    2,
                    Math.min(CONFIG.MAX_DUPLICATES, Math.ceil(CONFIG.MIN_LOOP_CARDS / comments.length))
                );
                const fragment = document.createDocumentFragment();
                for (let d = 0; d < repeats; d++) {
                    comments.forEach(c => fragment.appendChild(buildCard(c)));
                }
                commentBox.appendChild(fragment);
            }

            setTimeout(() => {
                carousel = mountCarousel(container, commentBox);
                if (carousel) carousel.resume(50);
            }, 150);
        }

        /* ── Carga inicial completa ──────────────────────── */
        async function loadAll() {
            allComments = await fetchComments();
            // Los comentarios vienen DESC del servidor (más nuevos primero)
            // Los mostramos en ese mismo orden en el carrusel
            renderCarousel(allComments);
        }

        /* ── Insertar un comentario nuevo en tiempo real ─── */
        function prependComment(newComment) {
            // Verificar que no sea un duplicado (por id)
            if (allComments.some(c => c.id === newComment.id)) return;

            allComments.unshift(newComment); // agregar al inicio (más reciente)

            // Guardar en caché local actualizado
            try { localStorage.setItem('pixon_comments_v3', JSON.stringify(allComments)); } catch (_) {}

            // Re-renderizar el carrusel con el nuevo comentario incluido
            renderCarousel(allComments);
        }

        /* ── SSE — Recibir comentarios en tiempo real ────── */
        function connectSSE() {
            if (sseSource) {
                sseSource.close();
                sseSource = null;
            }

            try {
                const streamUrl = `${API_BASE}/comments/stream`;
                sseSource = new EventSource(streamUrl);

                sseSource.addEventListener('new-comment', (e) => {
                    try {
                        const comment = JSON.parse(e.data);
                        prependComment(comment);
                        // Flash del indicador "en vivo"
                        if (liveIndicator) {
                            liveIndicator.classList.add('pulse-live');
                            setTimeout(() => liveIndicator.classList.remove('pulse-live'), 1200);
                        }
                    } catch (err) {
                        console.error('SSE parse error:', err);
                    }
                });

                sseSource.addEventListener('db-sync', (e) => {
                    try {
                        // Recargar todo porque la DB cambió (ej. alguien borró un comentario)
                        loadAll();
                        if (liveIndicator) {
                            liveIndicator.classList.add('pulse-live');
                            setTimeout(() => liveIndicator.classList.remove('pulse-live'), 1200);
                        }
                    } catch (err) {
                        console.error('SSE db-sync error:', err);
                    }
                });

                sseSource.onopen = () => {
                    if (liveIndicator) {
                        liveIndicator.style.display = 'inline-flex';
                        liveIndicator.title = 'Conectado en tiempo real';
                    }
                };

                sseSource.onerror = () => {
                    // SSE no disponible (servidor no está corriendo) — silencioso
                    if (liveIndicator) liveIndicator.style.display = 'none';
                    sseSource.close();
                    sseSource = null;
                    // Intentar reconectar en 15s
                    setTimeout(connectSSE, 15000);
                };

            } catch (err) {
                // EventSource no soportado o URL inválida — ignorar
                console.info('SSE no disponible:', err.message);
            }
        }

        /* ── MODAL DE LOGIN (solo se crea una vez) ──────── */
        function createLoginModal() {
            if (document.getElementById('comment-login-modal')) return;

            const overlay = document.createElement('div');
            overlay.id = 'comment-login-modal';
            overlay.style.cssText = `
                position:fixed; inset:0; z-index:99999;
                background:rgba(2,6,23,0.85);
                backdrop-filter:blur(12px);
                -webkit-backdrop-filter:blur(12px);
                display:flex; align-items:center; justify-content:center;
                opacity:0; transition:opacity 0.25s ease;
                padding:20px;
            `;

            overlay.innerHTML = `
                <div id="comment-login-card" style="
                    background:linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.98));
                    border:1px solid rgba(99,102,241,0.3);
                    border-radius:20px;
                    padding:36px 32px;
                    max-width:400px; width:100%;
                    text-align:center;
                    box-shadow:0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.1);
                    transform:translateY(20px) scale(0.97);
                    transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease;
                    opacity:0;
                ">
                    <div style="
                        width:60px; height:60px; border-radius:50%;
                        background:linear-gradient(135deg,#6366f1,#2563eb);
                        display:flex; align-items:center; justify-content:center;
                        margin:0 auto 18px;
                        box-shadow:0 8px 24px rgba(99,102,241,0.4);
                    ">
                        <i class="fa-solid fa-comment" style="color:#fff;font-size:1.4rem;"></i>
                    </div>
                    <h3 style="color:#f1f5f9;font-size:1.25rem;margin:0 0 8px;font-weight:700;">
                        Inicia sesión para comentar
                    </h3>
                    <p style="color:#94a3b8;font-size:0.92rem;line-height:1.6;margin:0 0 24px;">
                        Tu comentario ya está listo. Solo necesitamos verificar que eres una persona real.<br>
                        <strong style="color:#c7d2fe;">Se publicará automáticamente</strong> al iniciar sesión.
                    </p>
                    <a href="/auth/google" id="modal-google-login-btn" style="
                        display:flex; align-items:center; justify-content:center; gap:10px;
                        background:linear-gradient(135deg,#fff,#f8fafc);
                        color:#1e293b; font-weight:700; font-size:0.95rem;
                        padding:13px 24px; border-radius:12px;
                        text-decoration:none;
                        box-shadow:0 4px 16px rgba(0,0,0,0.3);
                        transition:transform 0.15s ease, box-shadow 0.15s ease;
                        border:none; cursor:pointer;
                    "
                    onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.4)'"
                    onmouseout="this.style.transform='';this.style.boxShadow='0 4px 16px rgba(0,0,0,0.3)'"
                    >
                        <i class="fa-brands fa-google" style="font-size:1.1rem;color:#4285f4;"></i>
                        Continuar con Google
                    </a>
                    <button id="modal-cancel-btn" style="
                        display:block; width:100%; margin-top:12px;
                        background:transparent; border:1px solid rgba(148,163,184,0.2);
                        color:#64748b; font-size:0.85rem;
                        padding:9px; border-radius:10px; cursor:pointer;
                        transition:background 0.15s;
                    "
                    onmouseover="this.style.background='rgba(148,163,184,0.1)'"
                    onmouseout="this.style.background='transparent'"
                    >
                        Cancelar — seguir navegando
                    </button>
                </div>
            `;

            document.body.appendChild(overlay);

            // Animación de entrada
            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
                const card = document.getElementById('comment-login-card');
                if (card) {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0) scale(1)';
                }
            });

            // Cerrar al hacer click en el overlay
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeLoginModal();
            });

            // Cerrar con botón cancelar
            document.getElementById('modal-cancel-btn').addEventListener('click', closeLoginModal);

            // Cerrar con Escape
            document.addEventListener('keydown', function escHandler(e) {
                if (e.key === 'Escape') {
                    closeLoginModal();
                    document.removeEventListener('keydown', escHandler);
                }
            });
        }

        function closeLoginModal() {
            const overlay = document.getElementById('comment-login-modal');
            if (!overlay) return;
            const card = document.getElementById('comment-login-card');
            if (card) {
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px) scale(0.97)';
            }
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 300);
        }

        /* ── AUTO-SUBMIT: si viene de login con comentario pendiente ── */
        async function checkPendingComment() {
            try {
                const pending = sessionStorage.getItem('pixon_pending_comment');
                if (!pending) return;

                // Verificar si está autenticado
                const meRes = await fetch(`${API_BASE}/me`, { credentials: 'include' });
                const meData = await meRes.json();
                if (!meData.user) return;

                // Hay sesión Y hay comentario pendiente → auto-submit
                sessionStorage.removeItem('pixon_pending_comment');
                const data = JSON.parse(pending);

                // Mostrar banner de "enviando tu comentario..."
                const btn = findInSection('#submitCommentBtn');
                if (btn) {
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando tu comentario...';
                }

                await saveComment(data);

                // Rellenar el formulario con los datos (para que el usuario los vea)
                const nameEl = findInSection('#commenterName');
                const textEl = findInSection('#commenterText');
                if (nameEl) nameEl.value = data.name;
                if (textEl) textEl.value = data.text;
                currentRating = data.stars;
                paintStars(currentRating);

                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> ¡Comentario enviado! En revisión';
                    btn.style.background = '#10b981';
                    btn.style.color = '#fff';
                    setTimeout(() => {
                        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Publicar Comentario';
                        btn.style.background = '';
                        btn.style.color = '';
                        // Limpiar el form
                        if (nameEl) nameEl.value = '';
                        if (textEl) textEl.value = '';
                        currentRating = 5;
                        paintStars(currentRating);
                    }, 4000);
                }

                if (!sseSource || sseSource.readyState === EventSource.CLOSED) {
                    await loadAll();
                }

            } catch (err) {
                console.info('Auto-submit pendiente falló:', err.message);
                sessionStorage.removeItem('pixon_pending_comment');
            }
        }

        /* ── ENVÍO DEL FORMULARIO ────────────────────────── */
        if (commentForm) {
            commentForm.addEventListener('submit', async e => {
                e.preventDefault();
                const nameEl = findInSection('#commenterName');
                const textEl = findInSection('#commenterText');
                const name = nameEl ? nameEl.value.trim() : '';
                const text = textEl ? textEl.value.trim() : '';
                if (!name || !text) return;

                const btn = findInSection('#submitCommentBtn');

                // Verificar si hay sesión antes de intentar publicar
                try {
                    const meRes = await fetch(`${API_BASE}/me`, { credentials: 'include' });
                    const meData = await meRes.json();

                    if (!meData.user) {
                        // Sin sesión → guardar en sessionStorage y mostrar modal
                        sessionStorage.setItem('pixon_pending_comment', JSON.stringify({
                            name,
                            stars: currentRating,
                            text
                        }));
                        createLoginModal();
                        return;
                    }
                } catch (_) {
                    // Si falla el check de sesión, guardar igual y mostrar modal
                    sessionStorage.setItem('pixon_pending_comment', JSON.stringify({
                        name, stars: currentRating, text
                    }));
                    createLoginModal();
                    return;
                }

                // Hay sesión → publicar directamente
                if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publicando…'; }

                try {
                    await saveComment({ name, stars: currentRating, text });

                    if (nameEl) nameEl.value = '';
                    if (textEl) textEl.value = '';
                    currentRating = 5;
                    paintStars(currentRating);

                    if (btn) {
                        btn.disabled = false;
                        btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> ¡Publicado! En revisión ✓';
                        btn.style.background = '#10b981';
                        setTimeout(() => {
                            btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Publicar Comentario';
                            btn.style.background = '';
                        }, 2500);
                    }

                    if (!sseSource || sseSource.readyState === EventSource.CLOSED) {
                        await loadAll();
                    }

                } catch (err) {
                    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Publicar Comentario'; }
                    showCommentMessage(section, 'No se pudo publicar: ' + err.message, 'error');
                }
            });
        }

        /* ── INICIO — IntersectionObserver ──────────────── */
        let hasRendered = false;

        function startUp() {
            if (hasRendered) return;
            hasRendered = true;
            loadAll().then(() => {
                connectSSE();
                checkPendingComment(); // Auto-submit si viene de login con comentario pendiente
            });
        }

        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        startUp();
                        if (carousel) carousel.resume(0);
                    } else {
                        if (carousel) carousel.pause();
                    }
                });
            }, { rootMargin: '300px' });

            const section = root instanceof Element ? root : container;
            observer.observe(section);
        } else {
            startUp();
        }

        /* ── Re-render al redimensionar ────────────────── */
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (allComments.length) renderCarousel(allComments);
            }, 350);
        }, { passive: true });

        /* ── Limpiar SSE al salir ───────────────────────── */
        window.addEventListener('beforeunload', () => {
            if (sseSource) sseSource.close();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initComments, { once: true });
    } else {
        initComments();
    }

})();
