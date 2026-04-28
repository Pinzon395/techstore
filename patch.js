const fs = require('fs');

const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.html'));
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // WhatsApp links
    content = content.replace(/href="javascript:void\(0\);?"(\s*onclick="smartWaRedirect)/g, 'href="https://wa.me/529986690777"$1');

    // Social Links
    content = content.replace(/<a href="https:\/\/www\.facebook\.com[^"]*"([^>]*)>/g, '<a href="https://www.facebook.com/people/Pixon-PC/61556271364935/" aria-label="Facebook Pixon PC"$1>');
    content = content.replace(/<a href="https:\/\/www\.instagram\.com[^"]*"([^>]*)>/g, '<a href="https://www.instagram.com/pixonpc/" aria-label="Instagram Pixon PC"$1>');
    content = content.replace(/<a href="https:\/\/www\.tiktok\.com[^"]*"([^>]*)>/g, '<a href="https://www.tiktok.com/@pixonpc" aria-label="TikTok Pixon PC"$1>');

    // Google Maps Iframe
    content = content.replace(/<iframe([^>]*src="https:\/\/www\.google\.com\/maps[^"]*"[^>]*)>/g, (match, p1) => {
        if (!p1.includes('title=')) return `<iframe title="Mapa de ubicación Pixon PC Cancún"${p1}>`;
        return match;
    });

    // Privacidad / Garantía underline
    content = content.replace(/<a href="\/privacidad"\s*style="([^"]*)">/g, (match, p1) => {
        if (!p1.includes('text-decoration')) return `<a href="/privacidad" style="${p1} text-decoration: underline;">`;
        return match;
    });
    content = content.replace(/<a href="\/garantia"\s*style="([^"]*)">/g, (match, p1) => {
        if (!p1.includes('text-decoration')) return `<a href="/garantia" style="${p1} text-decoration: underline;">`;
        return match;
    });

    // CSP Meta
    if (!content.includes('Content-Security-Policy')) {
        content = content.replace('</head>', '    <meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests; block-all-mixed-content">\n</head>');
    }

    // H4 heading fixes in index.html (just to be absolutely safe)
    content = content.replace(/<h4 style="font-size:1\.1rem; line-height:1\.3;">\s*Reparación Empresa Impresora en Banco\s*<\/h4>/g, '<p style="font-size:1.1rem; line-height:1.3; font-weight:700; margin:0;">Reparación Empresa Impresora en Banco</p>');

    fs.writeFileSync(file, content);
});

console.log('HTML files patched successfully!');
