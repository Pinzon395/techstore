/**
 * ============================================================
 *  PIXON PC — comments.js  v2.0
 * ============================================================
 *
 *  ARQUITECTURA DE DATOS:
 *  ┌─────────────────────────────────────────────────────────┐
 *  │  1. Intenta leer/guardar en el servidor SQLite          │
 *  │     GET  /api/comments  → lista de comentarios          │
 *  │     POST /api/comments  → guardar nuevo comentario      │
 *  │  2. Si el servidor no está disponible: localStorage     │
 *  │     (fallback automático sin errores visibles al user)  │
 *  └─────────────────────────────────────────────────────────┘
 *
 *  CARRUSEL — SPEC EXACTA:
 *  ┌─────────────────────────────────────────────────────────┐
 *  │  Container: overflow:hidden (NUNCA overflow-x:auto)     │
 *  │  Scroll:    100% controlado por JS via scrollLeft       │
 *  │  Grid:      grid-template-rows: repeat(2, auto)         │
 *  │             grid-auto-flow: column                      │
 *  │  Cards:     clamp(260px, 28vw, 400px) — zoom resilient  │
 *  │  Loop:      2x duplicate: scrollLeft -= halfWidth       │
 *  │  Desktop:   auto-scroll via rAF, pausa en hover/click   │
 *  │  Mobile:    mismo auto-scroll + drag con pointer events │
 *  │  Edges:     mask-image fade (izq/der)                   │
 *  └─────────────────────────────────────────────────────────┘
 * ============================================================
 */

(function () {
    'use strict';

    /* ────────────────────────────────────────────────────────────
       CONFIGURACIÓN — Cambia solo aquí para ajustar comportamiento
    ──────────────────────────────────────────────────────────── */
    const CONFIG = {
        SCROLL_SPEED:       38,     // px/s — velocidad del auto-scroll
        RESUME_HOVER_MS:    700,    // ms de espera al quitar el cursor
        RESUME_DRAG_MS:     1300,   // ms de espera al soltar en móvil
        RESUME_CLICK_MS:    900,    // ms tras dejar un comentario levantado
        COMMENTS_PER_PAGE:  4,      // comentarios por "página" en el botón ver más
        DT_CAP:             0.05,   // cap de delta-time (evita jumps al volver al tab)
    };

    /* ────────────────────────────────────────────────────────────
       ENDPOINT DE LA API
       En desarrollo: http://localhost:3000/api/comments
       En producción (pizon.com.mx): /api/comments (mismo dominio)
    ──────────────────────────────────────────────────────────── */
    const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `${window.location.protocol}//${window.location.hostname}:3000/api`
        : '/api';

    /* ────────────────────────────────────────────────────────────
       COMENTARIOS SEMILLA — solo se usan si el servidor Y
       localStorage están vacíos. Una vez sembrados, no vuelven.
    ──────────────────────────────────────────────────────────── */
    const SEED = [
        { name: 'Eduardo Álvarez',    stars: 5, text: 'Excelente servicio, dejé mi PC y todas las instalaciones se veían muy limpias y de calidad. Todo un experto.' },
        { name: 'Ana Maria Martínez', stars: 5, text: 'Pensé que mi equipo estaba perdido, pero me salvaron y además recuperó velocidad. Rápido y confiable.' },
        { name: 'Carlos Rodríguez',   stars: 5, text: 'Mi laptop gamer quedó como nueva. Las temperaturas bajaron 25 °C después del mantenimiento Pro. Recomendado 100%.' },
        { name: 'Laura Gómez',        stars: 5, text: 'Llevé mi impresora que nadie quería reparar. En Pixon PC la dejaron lista en menos de 2 horas. Increíble.' },
    ];

    /* ═══════════════════════════════════════════════════════════
       CAPA DE DATOS — Solo estas 2 funciones tocan el backend.
       Al migrar o cambiar el servidor, solo editas aquí.
    ═══════════════════════════════════════════════════════════ */

    /**
     * fetchComments() — Obtiene todos los comentarios.
     * Intenta API → cae a localStorage si falla.
     * @returns {Promise<Array>}
     */
    async function fetchComments() {
        try {
            const res = await fetch(`${API_BASE}/comments`, {
                signal: AbortSignal.timeout(3000) // no esperar más de 3s
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            // Cachear en localStorage como backup offline
            localStorage.setItem('pixon_comments', JSON.stringify(data));
            return data;
        } catch (err) {
            // Servidor caído o sin conexión → usar localStorage
            console.info('ℹ️  API no disponible, usando localStorage:', err.message);
            const raw = localStorage.getItem('pixon_comments');
            if (raw) return JSON.parse(raw);
            // Primera vez sin servidor: sembrar comentarios de ejemplo
            localStorage.setItem('pixon_comments', JSON.stringify(SEED));
            return [...SEED];
        }
    }

    /**
     * saveComment(data) — Persiste un comentario nuevo.
     * Intenta API → cae a localStorage si falla.
     * @param {{name:string, stars:number, text:string}} data
     * @returns {Promise<object>}
     */
    async function saveComment(data) {
        try {
            const res = await fetch(`${API_BASE}/comments`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(data),
                signal:  AbortSignal.timeout(5000)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (err) {
            console.info('ℹ️  Guardando en localStorage:', err.message);
            const all = JSON.parse(localStorage.getItem('pixon_comments') || '[]');
            all.push(data);
            localStorage.setItem('pixon_comments', JSON.stringify(all));
            return data;
        }
    }

    /* ═══════════════════════════════════════════════════════════
       MOTOR DEL CARRUSEL
       Un solo controlador que funciona en desktop Y móvil.
       La diferencia: en móvil agregamos drag via pointer events.
    ═══════════════════════════════════════════════════════════ */

    /**
     * mountCarousel(container, track) — Monta el carrusel.
     * @param {HTMLElement} container — .comments-marquee-container (overflow:hidden)
     * @param {HTMLElement} track    — .comment-list (el grid scrollable)
     * @returns {{ destroy: Function }}
     */
    function mountCarousel(container, track) {
        const S         = CONFIG.SCROLL_SPEED;
        let paused      = false;    
        let rafId       = null;     
        let lastTs      = null;     
        let timer       = null;     
        let halfWidth   = 0;        
        let dead        = false;    
        let lastInteraction = Date.now();

        // Calcular en el proximo frame para que layout exista
        requestAnimationFrame(() => requestAnimationFrame(() => {
            halfWidth = track.scrollWidth / 2;
        }));

        function step(ts) {
            if (dead) return;
            if (!lastTs) lastTs = ts;
            const dt = Math.min((ts - lastTs) / 1000, CONFIG.DT_CAP);
            lastTs = ts;

            // Recalcular dinámicamente si cambia el DOM/Ventana (~1 vez por segundo)
            if (Math.round(ts) % 60 === 0) {
                halfWidth = track.scrollWidth / 2;
            }

            // Failsafe antimuerte: si está pausado sin arrastrar ni hacer click y pasaron 2s
            if (paused && !isDragging && !track.querySelector('.comment-item.lifted')) {
                if (Date.now() - lastInteraction > 2000) {
                    paused = false;
                }
            }

            if (!paused && halfWidth > 0) {
                container.scrollLeft += S * dt;
                // Margen de -1 para evitar topes nativos del navegador por redondeo
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

        function onMouseEnter()  { pause(); }
        function onMouseLeave()  { resume(CONFIG.RESUME_HOVER_MS); }
        container.addEventListener('mouseenter', onMouseEnter);
        container.addEventListener('mouseleave', onMouseLeave);

        let isDragging   = false;
        let dragStartX   = 0;
        let scrollAtDrag = 0;

        function onPointerDown(e) {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            isDragging   = true;
            dragStartX   = e.clientX;
            scrollAtDrag = container.scrollLeft;
            pause();
            container.setPointerCapture(e.pointerId);
        }

        function onPointerMove(e) {
            if (!isDragging) return;
            // update interaction stamp
            lastInteraction = Date.now();
            const delta = dragStartX - e.clientX;
            let newScroll = scrollAtDrag + delta;
            
            // Loop manual si arrastra al borde
            if (halfWidth > 0) {
                if (newScroll >= halfWidth) newScroll -= halfWidth;
                if (newScroll < 0)         newScroll += halfWidth;
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

        container.addEventListener('pointerdown', onPointerDown);
        container.addEventListener('pointermove',  onPointerMove);
        container.addEventListener('pointerup',    onPointerUp);
        container.addEventListener('pointercancel', onPointerUp);
        // Evitar bug si el mouse sale sin soltar (leave en capturing a veces falla)
        document.addEventListener('pointerup', onPointerUp);

        const cardHandlers = []; 

        function attachCardClick(card) {
            function onClick(e) {
                if (isDragging) return;
                lastInteraction = Date.now();

                const wasLifted = card.classList.contains('lifted');
                track.querySelectorAll('.comment-item.lifted')
                     .forEach(c => c.classList.remove('lifted'));

                if (!wasLifted) {
                    card.classList.add('lifted');
                    pause();
                    setTimeout(() => {
                        const cL = card.offsetLeft;
                        const cW = card.offsetWidth;
                        const sW = container.offsetWidth;
                        // Centrar forzando un loop safe
                        let targetScroll = cL - (sW / 2) + (cW / 2);
                        if (targetScroll < 0) targetScroll += halfWidth;
                        container.scrollLeft = targetScroll;
                    }, 50);
                } else {
                    resume(CONFIG.RESUME_CLICK_MS);
                }
            }
            card.addEventListener('click', onClick);
            cardHandlers.push({ card, onClick });
        }

        track.querySelectorAll('.comment-item').forEach(attachCardClick);

        function onDocClick(e) {
            if (!container.contains(e.target)) {
                track.querySelectorAll('.comment-item.lifted')
                     .forEach(c => c.classList.remove('lifted'));
                resume(400);
            }
        }
        document.addEventListener('click', onDocClick);

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
            destroy() {
                dead = true;
                cancelAnimationFrame(rafId);
                clearTimeout(timer);
                mutObs.disconnect();
                container.removeEventListener('mouseenter',   onMouseEnter);
                container.removeEventListener('mouseleave',   onMouseLeave);
                container.removeEventListener('pointerdown',  onPointerDown);
                container.removeEventListener('pointermove',  onPointerMove);
                container.removeEventListener('pointerup',    onPointerUp);
                container.removeEventListener('pointercancel', onPointerUp);
                document.removeEventListener('click', onDocClick);
                document.removeEventListener('pointerup', onPointerUp);
                cardHandlers.forEach(({ card, onClick }) =>
                    card.removeEventListener('click', onClick));
            }
        };
    }

    /* ═══════════════════════════════════════════════════════════
       PÁGINA: INICIALIZACIÓN
    ═══════════════════════════════════════════════════════════ */
    document.addEventListener('DOMContentLoaded', () => {

        /* Referencias al DOM */
        const commentBox  = document.getElementById('commentsBox');
        const commentForm = document.getElementById('addCommentForm');
        const starIcons   = document.querySelectorAll('#star-rating i');
        const container   = document.querySelector('.comments-marquee-container');
        const loadMoreBtn = document.getElementById('loadMoreComments');

        // Salir silenciosamente si los elementos no existen en esta página
        if (!commentBox || !container) return;

        /* Estado de la UI */
        let currentRating = 5;
        let visibleCount  = CONFIG.COMMENTS_PER_PAGE;
        let carousel      = null; // referencia al controlador activo

        /* ── ESTRELLAS interactivas ───────────────────────────── */
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

        /* ── HTML de N estrellas ─────────────────────────────── */
        function starsHTML(n) {
            let html = '';
            for (let i = 1; i <= 5; i++) {
                html += i <= n
                    ? '<i class="fa-solid fa-star"></i>'
                    : '<i class="fa-regular fa-star"></i>';
            }
            return html;
        }

        /* ── Sanitizador XSS ─────────────────────────────────── */
        function esc(str) {
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        /* ── RENDER PRINCIPAL ────────────────────────────────────
           1. Destruye el carrusel previo (evitar memory leaks)
           2. Obtiene comentarios (API o localStorage)
           3. Duplica los comentarios exactamente 2x para el loop
           4. Inyecta en el DOM
           5. Monta el carrusel
        ─────────────────────────────────────────────────────── */
        async function renderComments() {
            // Destruir el carrusel antes de borrar el DOM
            if (carousel) {
                carousel.destroy();
                carousel = null;
            }

            const all      = await fetchComments();
            // Más recientes primero
            const reversed = all.slice().reverse();
            const toShow   = reversed.slice(0, visibleCount);

            // Duplicar exactamente 2x para el loop perfecto
            // halfWidth = scrollWidth / 2 → al llegar, scrollLeft -= halfWidth
            const toRender = [...toShow, ...toShow];

            commentBox.innerHTML = '';
            toRender.forEach(c => {
                const card = document.createElement('div');
                card.className = 'comment-item';
                card.innerHTML = `
                    <div class="header">
                        <h5>${esc(c.name)}</h5>
                        <div class="stars">${starsHTML(c.stars)}</div>
                    </div>
                    <p>"${esc(c.text)}"</p>
                `;
                commentBox.appendChild(card);
            });

            // Esperar al siguiente paint para medir scrollWidth
            setTimeout(() => {
                carousel = mountCarousel(container, commentBox);
            }, 150);

            // Botón "ver más"
            if (loadMoreBtn) {
                const hasMore = reversed.length > visibleCount;
                loadMoreBtn.style.display = hasMore ? 'inline-flex' : 'none';
                if (hasMore) {
                    loadMoreBtn.textContent =
                        `Ver más comentarios (${reversed.length - visibleCount} restantes)`;
                }
            }
        }

        /* ── VER MÁS ─────────────────────────────────────────── */
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                visibleCount += CONFIG.COMMENTS_PER_PAGE;
                renderComments();
            });
        }

        /* ── ENVÍO DEL FORMULARIO ────────────────────────────── */
        if (commentForm) {
            commentForm.addEventListener('submit', async e => {
                e.preventDefault();
                const name = document.getElementById('commenterName').value.trim();
                const text = document.getElementById('commenterText').value.trim();
                if (!name || !text) return;

                // Deshabilitar botón mientras guarda
                const btn = document.getElementById('submitCommentBtn');
                if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }

                await saveComment({ name, stars: currentRating, text });

                // Reset formulario
                document.getElementById('commenterName').value = '';
                document.getElementById('commenterText').value = '';
                currentRating = 5;
                paintStars(currentRating);
                visibleCount = CONFIG.COMMENTS_PER_PAGE;

                // Feedback visual de éxito
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '¡Publicado! ✓';
                    btn.style.background = '#10b981';
                    setTimeout(() => {
                        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Publicar Comentario';
                        btn.style.background = '';
                    }, 2500);
                }

                renderComments();
            });
        }

        /* ── INICIO LAZY (Rendimiento) ─────────────────────────
           Solo cargamos/renderizamos si el usuario está cerca.
           Además, pausamos la animación si sale de la pantalla.
        ─────────────────────────────────────────────────────── */
        let hasRendered = false;
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        // Entró a pantalla (o cerca)
                        if (!hasRendered) {
                            hasRendered = true;
                            renderComments();
                        } else if (carousel) {
                            carousel.resume(0); // reanuda animacion
                        }
                    } else {
                        // Salió de la pantalla: pausa para ahorrar batería/CPU
                        if (carousel) carousel.pause();
                    }
                });
            }, { rootMargin: '300px' }); // Actuar 300px antes de llegar
            
            const section = document.getElementById('comentarios') || container;
            observer.observe(section);
        } else {
            // Fallback navegadores viejos
            renderComments();
        }

        /* ── RE-INIT AL REDIMENSIONAR ────────────────────────── */
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(renderComments, 350);
        }, { passive: true });
    });

})(); // IIFE — encapsula para no contaminar el scope global
