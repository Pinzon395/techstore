const fs = require('fs');

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
let changed = 0;

files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    let original = content;

    // Removes .html from absolute internal links in standard hrefs
    content = content.replace(/href="\/([^"]+)\.html"/g, 'href="/$1"');
    
    // Removes .html from relative links to known pages
    const pages = ['index', 'paquetes', 'ensambles', 'catalogo', 'comentarios', 'contacto', 'mantenimiento-mac', 'preguntas-frecuentes', 'privacidad', 'garantia'];
    pages.forEach(p => {
        const regex = new RegExp(`href=["']${p}\\.html['"]`, 'g');
        content = content.replace(regex, `href="/${p}"`);
    });

    // Special case for Javascript window.location.href='/page.html'
    content = content.replace(/window\.location\.href='\/([^']+)\.html'/g, "window.location.href='/$1'");
    content = content.replace(/window\.location\.href="\/([^"]+)\.html"/g, 'window.location.href="/$1"');

    // Fix the index shortcut
    content = content.replace(/href="\/index"/g, 'href="/"');
    content = content.replace(/window\.location\.href="\/index"/g, 'window.location.href="/"');
    content = content.replace(/window\.location\.href='\/index'/g, "window.location.href='/'");

    if (content !== original) {
        fs.writeFileSync(f, content);
        changed++;
    }
});

console.log('URLs limpiadas en ' + changed + ' vistas.');
