function smartWaRedirect(url) {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) { window.location.href = url; } else { window.open(url, '_blank'); }
  }

  function openTab(evt, tabId) {
    const trigger = evt?.currentTarget || null;
    const root = trigger?.closest('.tabs-container') || document;
    root.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
    root.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    (root.querySelector(`#${CSS.escape(tabId)}`) || document.getElementById(tabId))?.classList.add('active');
    trigger?.classList.add('active');
  }
window.openTab = openTab;

if (document.querySelector('#commentForm, .comment-form-container')) {
  const commentsScript = document.createElement('script');
  commentsScript.src = '/scripts/comments.js';
  commentsScript.defer = true;
  document.head.appendChild(commentsScript);
}

  

  const counters = document.querySelectorAll('.animated-counter');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const counter = entry.target;
        const target = parseInt(counter.dataset.target || '0');
        let count = 0;
        const timer = setInterval(() => { count += target / 50; if (count >= target) { counter.textContent = target.toString(); clearInterval(timer); } else { counter.textContent = Math.floor(count).toString(); } }, 30);
        observer.unobserve(counter);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(c => observer.observe(c));

  window.addEventListener('DOMContentLoaded', () => {
    const poster = document.getElementById('hero-poster');
    const wrapper = document.getElementById('hero-yt-wrapper');
    const hero = document.getElementById('inicio');
    if (!poster || !wrapper || !hero) return;

    let heroIsVisible = true;
    let iframe = null;
    let iframeLoaded = false;
    const command = (func) => {
      iframe?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*');
    };

    const loadHeroVideo = () => {
      if (iframeLoaded || !heroIsVisible) return;
      iframeLoaded = true;
      iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/cbKre_xAFlo?autoplay=1&mute=1&loop=1&playlist=cbKre_xAFlo&controls=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;
      iframe.className = 'bg-video-iframe';
      iframe.title = 'Video de fondo Pixon PC';
      iframe.loading = 'lazy';
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
      iframe.style.opacity = '0';
      iframe.style.transition = 'opacity 0.8s ease-in-out';

      iframe.addEventListener('load', () => {
        if (!iframe) return;
        iframe.style.opacity = '1';
        poster.style.opacity = '0';
        window.setTimeout(() => poster.remove(), 800);
        if (heroIsVisible) {
          command('playVideo');
          window.setTimeout(() => command('playVideo'), 600);
        }
      });

      wrapper.appendChild(iframe);
    };

    const scheduleHeroVideo = () => {
      const ric = window.requestIdleCallback;
      window.setTimeout(() => {
        if (ric) {
          ric(loadHeroVideo, { timeout: 1800 });
        } else {
          loadHeroVideo();
        }
      }, 1200);
    };

    const conn = navigator.connection;
    const skipHeroVideo = document.documentElement.classList.contains('low-end-mode') ||
      (conn && (conn.saveData || /2g|3g/.test(conn.effectiveType || '')));
    if (!skipHeroVideo) {
      scheduleHeroVideo();
    }

    if ('IntersectionObserver' in window) {
      const heroVideoObserver = new IntersectionObserver((entries) => {
        heroIsVisible = entries.some(entry => entry.isIntersecting);
        command(heroIsVisible ? 'playVideo' : 'pauseVideo');
      }, { threshold: 0.2 });
      heroVideoObserver.observe(hero);
    }

    document.addEventListener('visibilitychange', () => {
      command(document.hidden || !heroIsVisible ? 'pauseVideo' : 'playVideo');
    });
  });

  document.querySelectorAll('.specialty-card').forEach(card => {
    card.removeAttribute('onclick');
    card.addEventListener('click', function(e) {
      if (e.target.closest('button')) return;
      if (this.classList.contains('active')) { this.classList.remove('active'); return; }
      document.querySelectorAll('.specialty-card.active').forEach(c => c.classList.remove('active'));
      this.classList.add('active');
    });
  });

  document.querySelectorAll('#paquetes .tab-btn[data-tab-target]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      openTab(event, btn.dataset.tabTarget || 'tab-residential');
    });
  });

  const catalogGrid = document.querySelector('[data-catalog-grid]');
  const catalogFilters = Array.from(document.querySelectorAll('[data-catalog-filter]'));
  const catalogMore = document.querySelector('[data-catalog-more]');
  const catalogCollapse = document.querySelector('[data-catalog-collapse]');
  const catalogStatus = document.querySelector('[data-catalog-status]');

  if (catalogGrid && catalogFilters.length) {
    const cards = Array.from(catalogGrid.querySelectorAll('[data-category]'));
    const initialLimit = Number(catalogGrid.dataset.initialLimit || 4);
    const step = Number(catalogGrid.dataset.step || 4);
    let activeFilter = catalogFilters.find((button) => button.classList.contains('active'))?.dataset.catalogFilter || 'Todos';
    let visibleLimit = initialLimit;

    const renderCatalog = ({ reset = false } = {}) => {
      if (reset) visibleLimit = initialLimit;

      const matches = cards.filter((card) => activeFilter === 'Todos' || card.dataset.category === activeFilter);
      const visibleCards = matches.slice(0, visibleLimit);

      cards.forEach((card) => {
        const isVisible = visibleCards.includes(card);
        card.hidden = !isVisible;
        card.classList.toggle('catalog-card-visible', isVisible);
      });

      catalogFilters.forEach((button) => {
        const isActive = button.dataset.catalogFilter === activeFilter;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });

      if (catalogStatus) {
        const filterLabel = activeFilter === 'Todos' ? 'vistas disponibles' : `vistas de ${activeFilter}`;
        catalogStatus.textContent = `Mostrando ${visibleCards.length} de ${matches.length} ${filterLabel}.`;
      }

      if (catalogMore) {
        const hasMore = visibleCards.length < matches.length;
        catalogMore.hidden = !hasMore;
        catalogMore.textContent = hasMore
          ? `Ver mas servicios (${matches.length - visibleCards.length})`
          : 'No hay mas servicios';
      }

      if (catalogCollapse) {
        catalogCollapse.hidden = visibleCards.length <= initialLimit;
      }
    };

    catalogFilters.forEach((button) => {
      button.addEventListener('click', () => {
        activeFilter = button.dataset.catalogFilter || 'Todos';
        renderCatalog({ reset: true });
      });
    });

    catalogMore?.addEventListener('click', () => {
      visibleLimit += step;
      renderCatalog();
    });

    catalogCollapse?.addEventListener('click', () => {
      visibleLimit = initialLimit;
      renderCatalog();
      catalogGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    renderCatalog({ reset: true });
  }

  document.querySelectorAll('.before-after-slider').forEach((slider) => {
    const input = slider.querySelector('input[type="range"]');
    if (!input) return;
    const updateReveal = () => slider.style.setProperty('--reveal', `${input.value}%`);
    input.addEventListener('input', updateReveal);
    updateReveal();
  });

  const initReviewExpands = (root = document) => {
    root.querySelectorAll('[data-review-text]').forEach((textBox) => {
      const button = textBox.parentElement?.querySelector('[data-review-toggle]');
      if (!button) return;

      const paragraph = textBox.querySelector('p') || textBox;
      const lineHeight = Number.parseFloat(getComputedStyle(paragraph).lineHeight || '24') || 24;
      const collapsedHeight = lineHeight * 3;
      textBox.style.maxHeight = `${collapsedHeight}px`;
      textBox.classList.remove('expanded');
      button.setAttribute('aria-expanded', 'false');
      button.textContent = 'Ver mas';
      button.hidden = textBox.scrollHeight <= collapsedHeight + 2;

      if (button.dataset.reviewBound === 'true') return;
      button.dataset.reviewBound = 'true';
      button.addEventListener('click', () => {
        const isExpanded = textBox.classList.toggle('expanded');
        button.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
        button.textContent = isExpanded ? 'Ver menos' : 'Ver mas';
        textBox.style.maxHeight = isExpanded ? `${textBox.scrollHeight}px` : `${collapsedHeight}px`;
      });
    });
  };

  const renderGoogleReviews = (reviews, target) => {
    if (!Array.isArray(reviews) || !reviews.length || !target) return;
    const safeReviews = reviews
      .filter((review) => Number(review.rating || review.reviewRating || 0) >= 4)
      .slice(0, 5);
    if (!safeReviews.length) return;
    target.innerHTML = safeReviews.map((review) => {
      const name = review.author_name || review.name || review.author || 'Usuario de Google';
      const date = review.relative_time_description || review.date || review.time_description || 'fecha visible en Google';
      const rating = Number(review.rating || review.reviewRating || 5);
      const text = review.text || review.reviewBody || 'Reseña verificada en Google.';
      const photo = review.profile_photo_url || '';
      const avatar = photo
        ? `<img src="${photo}" alt="Foto de perfil de ${name}" width="44" height="44" loading="lazy" referrerpolicy="no-referrer">`
        : name.charAt(0);
      return `<article class="google-review-card"><div class="review-avatar" aria-hidden="true">${avatar}</div><div><div class="review-card-head"><h3>${name}</h3><p class="review-stars" aria-label="${rating} estrellas">${'★'.repeat(Math.round(rating))}</p></div><p class="review-date">${date}</p><div class="review-text" data-review-text><p>${text}</p></div><button class="review-more" type="button" data-review-toggle hidden aria-expanded="false">Ver mas</button></div></article>`;
    }).join('');
    initReviewExpands(target);
  };

  const reviewSection = document.querySelector('[data-google-reviews]');
  if (reviewSection) initReviewExpands(reviewSection);
  if (reviewSection && 'IntersectionObserver' in window) {
    const reviewObserver = new IntersectionObserver(async (entries, obs) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      obs.disconnect();
      try {
        const response = await fetch(`/api/reviews/google?r=${Date.now()}`, { headers: { Accept: 'application/json' } });
        if (!response.ok) return;
        const data = await response.json();
        if (data.place_id) {
          const mapsLink = reviewSection.querySelector('[data-google-maps-link]');
          if (mapsLink) {
            mapsLink.href = `https://search.google.com/local/writereview?placeid=${encodeURIComponent(data.place_id)}`;
          }
        }
        if (data.rating && data.total) {
          const summary = reviewSection.querySelector('[data-google-review-summary]');
          if (summary) {
            summary.textContent = `${Number(data.rating).toFixed(1)} estrellas basado en ${data.total} opiniones de Google`;
          }
        }
        renderGoogleReviews(data.reviews || [], reviewSection.querySelector('[data-review-list]'));
      } catch (_) {}
    }, { rootMargin: '180px 0px' });
    reviewObserver.observe(reviewSection);
  }

  const tiktokSection = document.getElementById('evidencia-real');
  if (tiktokSection && 'IntersectionObserver' in window) {
    const tiktokObserver = new IntersectionObserver((entries, obs) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      obs.disconnect();
      if (!document.querySelector('script[src="https://www.tiktok.com/embed.js"]')) {
        const script = document.createElement('script');
        script.src = 'https://www.tiktok.com/embed.js';
        script.async = true;
        document.body.appendChild(script);
      }
    }, { rootMargin: '220px 0px' });
    tiktokObserver.observe(tiktokSection);
  }

  window.addEventListener('DOMContentLoaded', () => {
    const worksSection = document.getElementById('trabajos');
    if (!worksSection) return;
let activeRepairVideo = null;
    let repairVideoToken = 0;

    const sendVideoCommand = (iframe, func) => {
      iframe?.contentWindow?.postMessage(JSON.stringify({
        event: 'command',
        func,
        args: [],
      }), '*');
    };

    const showRepairThumb = (state) => {
      state.thumb.style.opacity = '';
      state.thumb.style.pointerEvents = '';
      state.thumb.removeAttribute('aria-pressed');
    };

    const hideRepairThumb = (state) => {
      state.thumb.style.opacity = '0';
      state.thumb.style.pointerEvents = 'none';
      state.thumb.setAttribute('aria-pressed', 'true');
    };

    const pauseRepairVideo = (state) => {
      if (!state) return;
      sendVideoCommand(state.iframe, 'pauseVideo');
      state.iframe?.remove();
      state.iframe = null;
      state.pauseButton?.remove();
      state.pauseButton = null;
      showRepairThumb(state);
      if (activeRepairVideo === state) {
        activeRepairVideo = null;
      }
    };

    const pauseOtherRepairVideos = (nextState) => {
      if (activeRepairVideo && activeRepairVideo !== nextState) {
        pauseRepairVideo(activeRepairVideo);
      }
    };

    const loadRepairVideo = (thumb) => {
      const wrapper = thumb.closest('.video-wrapper');
      const videoId = thumb.dataset.videoId;
      if (!wrapper || !videoId) return;

      const existingState = activeRepairVideo?.thumb === thumb ? activeRepairVideo : null;
      if (existingState?.iframe) {
        pauseRepairVideo(existingState);
        return;
      }

      const state = existingState || {
        wrapper,
        thumb,
        iframe: null,
        pauseButton: null,
        token: 0,
      };

      pauseOtherRepairVideos(state);

      const token = ++repairVideoToken;
      state.token = token;
      activeRepairVideo = state;
      state.thumb.style.pointerEvents = 'none';
      state.thumb.setAttribute('aria-pressed', 'true');

      wrapper.querySelectorAll('iframe, .repair-video-pause').forEach((element) => element.remove());

      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=0&playsinline=1&controls=0&rel=0&modestbranding=1&showinfo=0&enablejsapi=1&disablekb=1&origin=${encodeURIComponent(window.location.origin)}`;
      iframe.title = thumb.getAttribute('aria-label') || 'Video de reparación Pixon PC';
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
      iframe.setAttribute('allowfullscreen', '');
      iframe.style.position = 'absolute';
      iframe.style.inset = '0';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = '0';
      iframe.style.zIndex = '2';
      iframe.style.left = '0';
      iframe.style.top = '0';
      iframe.style.transform = 'none';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      iframe.style.transition = 'opacity 0.2s ease';

      const pauseButton = document.createElement('button');
      pauseButton.type = 'button';
      pauseButton.className = 'repair-video-pause';
      pauseButton.setAttribute('aria-label', 'Pausar video');
      pauseButton.innerHTML = '<svg class="fa-icon" aria-hidden="true"><use href="/assets/icons/sprite.svg#fa-pause"/></svg><span>Pausar</span>';
      pauseButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (activeRepairVideo === state) {
          pauseRepairVideo(state);
        }
      });

      state.iframe = iframe;
      state.pauseButton = pauseButton;
      wrapper.appendChild(iframe);
      wrapper.appendChild(pauseButton);

      iframe.addEventListener('load', () => {
        if (activeRepairVideo !== state || state.token !== token) {
          iframe.remove();
          pauseButton.remove();
          return;
        }
        iframe.style.opacity = '1';
        hideRepairThumb(state);
        sendVideoCommand(iframe, 'playVideo');
        window.setTimeout(() => {
          if (activeRepairVideo === state && state.token === token) {
            sendVideoCommand(iframe, 'playVideo');
          }
        }, 500);
      });
    };

    worksSection.querySelectorAll('.video-lazy-thumb').forEach((thumb) => {
      thumb.addEventListener('click', (event) => {
        event.preventDefault();
        loadRepairVideo(thumb);
      });
      thumb.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        loadRepairVideo(thumb);
      });
    });

    worksSection.querySelectorAll('.video-wrapper').forEach((wrapper) => {
      wrapper.addEventListener('click', (event) => {
        const target = event.target;
        if (target.closest('.video-lazy-thumb')) return;
        if (activeRepairVideo?.wrapper === wrapper) {
          pauseRepairVideo(activeRepairVideo);
        }
      });
    });

    window.addEventListener('message', (event) => {
      if (!String(event.origin).includes('youtube')) return;
      if (!activeRepairVideo?.iframe || event.source !== activeRepairVideo.iframe.contentWindow) return;

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.event === 'infoDelivery' && data?.info?.playerState === 0) {
          pauseRepairVideo(activeRepairVideo);
        }
      } catch {
        // YouTube also sends non-JSON messages; those are not relevant here.
      }
    });

    if ('IntersectionObserver' in window) {
      const repairVideoObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (activeRepairVideo?.wrapper === entry.target && (!entry.isIntersecting || entry.intersectionRatio < 0.25)) {
            pauseRepairVideo(activeRepairVideo);
          }
        });
      }, { threshold: [0, 0.25, 0.5, 1] });

      worksSection.querySelectorAll('.video-wrapper').forEach((wrapper) => {
        repairVideoObserver.observe(wrapper);
      });
    }
  });
