const fs = require('fs');
const html = fs.readFileSync('pages/info/preguntas-frecuentes.html', 'utf8');

const faqs = [];
const blocks = html.split('<h2 class="faq-category-title"');

for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const categoryMatch = block.match(/>\s*<i class="([^"]+)"><\/i>\s*([^<]+)<\/h2>/);
    if (!categoryMatch) continue;
    
    const icon = categoryMatch[1].trim();
    const category = categoryMatch[2].trim();
    
    const gridMatch = block.split('<div class="faq-page-grid">')[1];
    if (!gridMatch) continue;
    
    // We only want the items inside this grid, so let's split by '<div class="faq-item"'
    const items = gridMatch.split('<div class="faq-item"');
    for (let j = 1; j < items.length; j++) {
        // stop if we hit another category or end of section
        if (items[j].includes('faq-category-title')) break; // shouldn't happen based on split

        const qMatch = items[j].match(/<span>(.*?)<\/span>/);
        const aMatch = items[j].match(/<div class="faq-answer-inner">([\s\S]*?)<\/div>/);
        
        if (qMatch && aMatch) {
            const question = qMatch[1].trim();
            const answer = aMatch[1].trim().replace(/\s+/g, ' ');
            faqs.push({ category, icon, question, answer });
        }
    }
}

fs.writeFileSync('server/faqs_seed.json', JSON.stringify(faqs, null, 2));
console.log('Extracted ' + faqs.length + ' FAQs.');
