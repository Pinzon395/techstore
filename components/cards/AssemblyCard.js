/**
 * components/cards/AssemblyCard.js
 * Tarjeta de ensamble PC tipo e-commerce dinámica.
 * Uso: <assembly-card id="gaming-1"></assembly-card>
 * Los datos vienen del catálogo definido aquí abajo.
 */

const WA_PHONE = '529986690777';
const buildWaUrl = (msg) => {
    const text = msg ? encodeURIComponent(msg) : encodeURIComponent('Hola, me gustaría cotizar un servicio.');
    return `https://wa.me/${WA_PHONE}?text=${text}`;
};

const ASSEMBLIES = {
    'gaming-mid': {
        name: 'PC Gamer Mid-Range',
        subtitle: 'La bestia del 1080p — frame rate extremo',
        image: '/assets/images/ensamble-pc-gamer-cancun.jpeg',
        price: '$18,500',
        badge: 'Más vendida',
        badgeColor: '#3b82f6',
        specs: [
            { icon: 'fa-microchip', label: 'CPU', value: 'Intel Core i5-13600K' },
            { icon: 'fa-display', label: 'GPU', value: 'RTX 4060 Ti 8GB' },
            { icon: 'fa-memory', label: 'RAM', value: '16GB DDR5 5600MHz' },
            { icon: 'fa-hard-drive', label: 'Almacenamiento', value: '1TB M.2 NVMe Gen4' },
            { icon: 'fa-plug', label: 'Fuente', value: '750W 80+ Gold' },
        ],
        fps: [
            { game: 'Fortnite', fps: '180+', icon: '🎯' },
            { game: 'Apex Legends', fps: '160+', icon: '🔫' },
            { game: 'Warzone', fps: '120+', icon: '💣' },
        ],
        waMessage: 'Hola, me interesa la PC Gamer Mid-Range con i5-13600K y RTX 4060 Ti. ¿Está disponible?',
    },
    'gaming-high': {
        name: 'PC Gamer High-End',
        subtitle: 'Sin compromisos — máximo FPS en 1440p',
        image: '/assets/images/ensamble-pc-gamer-cancun.jpeg',
        price: '$32,000',
        badge: 'Top Performance',
        badgeColor: '#f59e0b',
        specs: [
            { icon: 'fa-microchip', label: 'CPU', value: 'Intel Core i7-14700K' },
            { icon: 'fa-display', label: 'GPU', value: 'RTX 4070 Ti SUPER 16GB' },
            { icon: 'fa-memory', label: 'RAM', value: '32GB DDR5 6000MHz' },
            { icon: 'fa-hard-drive', label: 'Almacenamiento', value: '2TB M.2 NVMe Gen4' },
            { icon: 'fa-plug', label: 'Fuente', value: '850W 80+ Gold' },
        ],
        fps: [
            { game: 'Fortnite', fps: '240+', icon: '🎯' },
            { game: 'Apex Legends', fps: '200+', icon: '🔫' },
            { game: 'Cyberpunk 2077', fps: '100+ (RT)', icon: '🌆' },
        ],
        waMessage: 'Hola, me interesa la PC Gamer High-End con i7-14700K y RTX 4070 Ti SUPER. ¿Está disponible?',
    },
};

class AssemblyCard extends HTMLElement {
    connectedCallback() {
        const id = this.getAttribute('card-id');
        const data = ASSEMBLIES[id];
        if (!data) {
            this.innerHTML = `<p style="color:red;">Tarjeta no encontrada: ${id}</p>`;
            return;
        }

        const specsHTML = data.specs.map(s => `
            <li style="display:flex; align-items:center; gap:10px; padding:7px 0; border-bottom:1px solid #f1f5f9; font-size:0.85rem;">
                <span style="width:30px; text-align:center; color:#3b82f6;">
                    <i class="fa-solid ${s.icon}"></i>
                </span>
                <span style="color:#64748b; min-width:90px;">${s.label}</span>
                <strong style="color:#1e293b;">${s.value}</strong>
            </li>`).join('');

        const fpsHTML = data.fps.map(f => `
            <div style="text-align:center; padding:8px 12px; background:#f8fafc; border-radius:8px; flex:1;">
                <div style="font-size:1.1rem;">${f.icon}</div>
                <div style="font-size:0.72rem; color:#64748b; margin:2px 0;">${f.game}</div>
                <div style="font-weight:800; color:#3b82f6; font-size:1rem;">${f.fps}</div>
                <div style="font-size:0.65rem; color:#94a3b8;">FPS avg</div>
            </div>`).join('');

        this.innerHTML = `
        <div style="
            background:#fff;
            border-radius:16px;
            box-shadow:0 8px 30px rgba(0,0,0,0.08);
            overflow:hidden;
            border:1px solid #e2e8f0;
            transition:transform 0.3s ease, box-shadow 0.3s ease;
            position:relative;
        " onmouseover="this.style.transform='translateY(-6px)'; this.style.boxShadow='0 20px 40px rgba(59,130,246,0.15)'"
           onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 8px 30px rgba(0,0,0,0.08)'">
            
            <!-- Badge -->
            <div style="
                position:absolute;
                top:12px;
                left:12px;
                background:${data.badgeColor};
                color:#fff;
                font-size:0.72rem;
                font-weight:700;
                padding:4px 10px;
                border-radius:20px;
                z-index:2;
                letter-spacing:0.5px;
            ">${data.badge}</div>

            <!-- Imagen -->
            <div style="height:200px; overflow:hidden; position:relative;">
                <img 
                    src="${data.image}" 
                    alt="${data.name}" 
                    loading="lazy"
                    style="width:100%; height:100%; object-fit:cover; display:block;"
                >
                <div style="
                    position:absolute; inset:0;
                    background:linear-gradient(to top, rgba(15,23,42,0.6) 0%, transparent 60%);
                "></div>
                <div style="
                    position:absolute; bottom:12px; left:16px;
                    color:#fff;
                ">
                    <div style="font-size:1.3rem; font-weight:800;">${data.price} <span style="font-size:0.75rem; font-weight:500; opacity:0.8;">MXN</span></div>
                </div>
            </div>

            <!-- Contenido -->
            <div style="padding:18px;">
                <h3 style="font-size:1.1rem; font-weight:800; color:#1e293b; margin:0 0 4px;">${data.name}</h3>
                <p style="font-size:0.8rem; color:#64748b; margin:0 0 14px;">${data.subtitle}</p>

                <!-- Specs -->
                <ul style="list-style:none; padding:0; margin:0 0 14px;">
                    ${specsHTML}
                </ul>

                <!-- FPS Estimados -->
                <div style="margin-bottom:16px;">
                    <p style="font-size:0.72rem; font-weight:700; color:#94a3b8; letter-spacing:1px; margin-bottom:8px;">FPS ESTIMADOS</p>
                    <div style="display:flex; gap:8px;">
                        ${fpsHTML}
                    </div>
                </div>

                <!-- CTA -->
                <button
                    onclick="window.open(buildWaUrl(data.waMessage), '_blank', 'noopener')"
                    style="
                        width:100%;
                        background:linear-gradient(135deg, #25D366, #128C7E);
                        color:#fff;
                        border:none;
                        border-radius:10px;
                        padding:12px;
                        font-size:0.9rem;
                        font-weight:700;
                        cursor:pointer;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        gap:8px;
                        transition:opacity 0.2s;
                    "
                    onmouseover="this.style.opacity='0.9'"
                    onmouseout="this.style.opacity='1'"
                    title="${data.waMessage}"
                >
                    <i class="fa-brands fa-whatsapp" style="font-size:1.1rem;"></i>
                    Cotizar este ensamble
                </button>
            </div>
        </div>`;
    }
}

customElements.define('assembly-card', AssemblyCard);
