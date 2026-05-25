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

    scheduleHeroVideo();

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


