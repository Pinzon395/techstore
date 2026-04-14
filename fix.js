const fs = require('fs');
let c = fs.readFileSync('script.js', 'utf8');
const start = '/* a) Hero HTML5 Video */';
const end = 'function loadVideoFromThumb(thumb) {';
const startIdx = c.indexOf(start);
const endIdx = c.indexOf(end);
if(startIdx === -1 || Math.abs(startIdx) > 99999 || endIdx === -1) {
    console.log('not found');
    process.exit(1);
}

const rep = `/* a) Hero YouTube Video con Poster */
window.addEventListener('DOMContentLoaded', () => {
    const poster = document.getElementById('hero-poster');
    const wrapper = document.getElementById('hero-yt-wrapper');
    if (poster && wrapper) {
        const iframe = document.createElement('iframe');
        iframe.src = 'https://www.youtube.com/embed/cbKre_xAFlo?autoplay=1&mute=1&loop=1&playlist=cbKre_xAFlo&controls=0&rel=0&modestbranding=1&showinfo=0&enablejsapi=1&disablekb=1';
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
        iframe.setAttribute('allowfullscreen', '');
        iframe.className = 'bg-video-iframe';
        iframe.style.opacity = '0';
        iframe.style.transition = 'opacity 0.8s ease-in-out';

        wrapper.appendChild(iframe);

        const onYouTubeMessageHero = (e) => {
            if (e.origin !== "https://www.youtube.com") return;
            try {
                const data = JSON.parse(e.data);
                if (data.event === 'infoDelivery' && data.info && data.info.playerState === 1) {
                    if (e.source === iframe.contentWindow) {
                        iframe.style.opacity = '1';
                        poster.style.opacity = '0';
                        setTimeout(() => poster.remove(), 800);
                        window.removeEventListener('message', onYouTubeMessageHero);
                    }
                }
            } catch(err) {}
        };
        window.addEventListener('message', onYouTubeMessageHero);

        // Fallback: Si YouTube tarda mucho o bloquea el evento
        setTimeout(() => {
            if (poster && poster.parentNode) {
                iframe.style.opacity = '1';
                poster.style.opacity = '0';
                setTimeout(() => poster.remove(), 800);
                window.removeEventListener('message', onYouTubeMessageHero);
            }
        }, 3500);
    }
});

/**
 * b) YouTube Videos
 */
const isMobile = window.innerWidth < 768;

function postMessageToPlayer(iframe, func, args = []) {
    if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({
            event: 'command',
            func: func,
            args: args
        }), '*');
    }
}

// Observer MÓVIL y DESKTOP
let playObserver = null;
if ('IntersectionObserver' in window) {
    playObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const iframe = entry.target.querySelector('iframe');
            if (!iframe) return;
            if (isMobile) {
                if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
                    postMessageToPlayer(iframe, 'playVideo');
                } else if (!entry.isIntersecting || entry.intersectionRatio < 0.6) {
                    postMessageToPlayer(iframe, 'pauseVideo');
                }
            } else {
                if (entry.isIntersecting && entry.intersectionRatio > 0) {
                    postMessageToPlayer(iframe, 'playVideo');
                } else if (!entry.isIntersecting || entry.intersectionRatio === 0) {
                    postMessageToPlayer(iframe, 'pauseVideo');
                }
            }
        });
    }, { threshold: [0, 0.1, 0.6] });
}

`;

fs.writeFileSync('script.js', c.substring(0, startIdx) + (c.includes('\r\n') ? rep.replace(/\n/g, '\r\n') : rep) + c.substring(endIdx));
console.log('success');
