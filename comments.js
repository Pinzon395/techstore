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
        DUPLICATES:      8,     // veces que se duplica el track para el loop
    };

    /* ────────────────────────────────────────────────────────
       API BASE
    ──────────────────────────────────────────────────────── */
    const API_BASE = (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'
    )
        ? `${window.location.protocol}//${window.location.hostname}:3000/api`
        : '/api';

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

    /** Obtiene todos los comentarios de la API (sin caché) */
    async function fetchComments() {
        try {
            const res = await fetch(`${API_BASE}/comments?r=${Date.now()}`, {
                signal: AbortSignal.timeout(4000)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            // Guardar copia offline
            try { localStorage.setItem('pixon_comments_v3', JSON.stringify(data)); } catch (_) {}
            return data;
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
            headers: { 'Content-Type': 'application/json' },
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
        let paused = false;
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

        function step(ts) {
            if (dead) return;
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
            rafId = requestAnimationFrame(step);
        }
        rafId = requestAnimationFrame(step);

        function pause() {
            paused = true;
            lastInteraction = Date.now();
            clearTimeout(timer);
        }

        function resume(delay) {
            lastInteraction = Date.now();
            clearTimeout(timer);
            timer = setTimeout(() => {
                if (!track.querySelector('.comment-item.lifted')) {
                    paused = false;
                    lastTs = null;
                }
            }, delay || CONFIG.RESUME_HOVER_MS);
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
                cancelAnimationFrame(rafId);
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
    function starsHTML(n) {
        let html = '';
        for (let i = 1; i <= 5; i++) {
            html += i <= n
                ? '<i class="fa-solid fa-star"></i>'
                : '<i class="fa-regular fa-star"></i>';
        }
        return html;
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
        card.innerHTML = `
            <div class="header">
                <h5>${esc(c.name)}</h5>
                <div class="stars">${starsHTML(c.stars)}</div>
            </div>
            <p>"${esc(c.text)}"</p>
        `;
        return card;
    }

    /* ═══════════════════════════════════════════════════════
       INICIALIZACIÓN
    ═══════════════════════════════════════════════════════ */
    document.addEventListener('DOMContentLoaded', () => {

        const commentBox  = document.getElementById('commentsBox');
        const commentForm = document.getElementById('addCommentForm');
        const starIcons   = document.querySelectorAll('#star-rating i');
        const container   = document.querySelector('.comments-marquee-container');
        const liveIndicator = document.getElementById('comments-live-indicator');

        if (!commentBox || !container) return;

        /* ── Estado ───────────────────────────────────────── */
        let currentRating = 5;
        let carousel = null;
        let allComments = [];  // lista maestra en memoria (más recientes primero)
        let sseSource = null;  // EventSource activo

        /* ── Estrellas interactivas ──────────────────────── */
        function paintStars(rating) {
            starIcons.forEach(star => {
                const val = parseInt(star.getAttribute('data-val'));
                star.style.color = val <= rating ? '#f59e0b' : '#cbd5e1';
                star.classList.toggle('active', val <= rating);
            });
        }
        starIcons.forEach(star => {
            star.addEventListener('click', () => {
                currentRating = parseInt(star.getAttribute('data-val'));
                paintStars(currentRating);
            });
            star.addEventListener('mouseenter', () =>
                paintStars(parseInt(star.getAttribute('data-val'))));
            star.addEventListener('mouseleave', () => paintStars(currentRating));
        });
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
                // Duplicar CONFIG.DUPLICATES veces para el loop infinito
                commentBox.innerHTML = '';
                for (let d = 0; d < CONFIG.DUPLICATES; d++) {
                    comments.forEach(c => commentBox.appendChild(buildCard(c)));
                }
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

        /* ── ENVÍO DEL FORMULARIO ────────────────────────── */
        if (commentForm) {
            commentForm.addEventListener('submit', async e => {
                e.preventDefault();
                const name = document.getElementById('commenterName').value.trim();
                const text = document.getElementById('commenterText').value.trim();
                if (!name || !text) return;

                const btn = document.getElementById('submitCommentBtn');
                if (btn) { btn.disabled = true; btn.textContent = 'Publicando…'; }

                try {
                    // El servidor ya hace el broadcastComment → el SSE propio lo recibirá
                    // pero prependComment tiene protección de duplicados (por id)
                    await saveComment({ name, stars: currentRating, text });

                    // Reset formulario
                    document.getElementById('commenterName').value = '';
                    document.getElementById('commenterText').value = '';
                    currentRating = 5;
                    paintStars(currentRating);

                    if (btn) {
                        btn.disabled = false;
                        btn.innerHTML = '¡Publicado! ✓';
                        btn.style.background = '#10b981';
                        setTimeout(() => {
                            btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Publicar Comentario';
                            btn.style.background = '';
                        }, 2500);
                    }

                    // Si SSE no está conectado, recargar manualmente
                    if (!sseSource || sseSource.readyState === EventSource.CLOSED) {
                        await loadAll();
                    }

                } catch (err) {
                    if (btn) { btn.disabled = false; btn.textContent = 'Publicar Comentario'; }
                    alert('Error al publicar: ' + err.message);
                }
            });
        }

        /* ── INICIO — IntersectionObserver ──────────────── */
        let hasRendered = false;

        function startUp() {
            if (hasRendered) return;
            hasRendered = true;
            loadAll().then(() => connectSSE());
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

            const section = document.getElementById('comentarios') || container;
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
    });

})();
