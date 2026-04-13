const fs = require('fs');
const files = ['index.html', 'ensambles.html', 'paquetes.html', 'contacto.html', 'catalogo.html'];
for (const file of files) {
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf8');
    
    // Convert button clicks
    content = content.replace(/window\.open\('https:\/\/wa\.me\/([^']*)','_blank'\)/g, "smartWaRedirect('https://wa.me/$1')");
    
    // Note: the return false on some anchors might conflict, but we just replace the href 
    // Actually wait, let's just replace href="https://wa.me/..." target="_blank"
    content = content.replace(/href="https:\/\/wa\.me\/([^"]*)" target="_blank" rel="noopener"/g, "href=\"javascript:void(0);\" onclick=\"smartWaRedirect('https://wa.me/$1')\"");
    content = content.replace(/href="https:\/\/wa\.me\/([^"]*)"/g, "href=\"javascript:void(0);\" onclick=\"smartWaRedirect('https://wa.me/$1')\"");

    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
}
