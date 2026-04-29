const fs = require('fs');

const indexContent = fs.readFileSync('index.html', 'utf8');

// Extract the contact section from index.html
const contactStartIdx = indexContent.indexOf('<section class="contact section-padding" id="contacto">');
const contactEndIdx = indexContent.indexOf('</section>', contactStartIdx) + 10;

if (contactStartIdx === -1 || contactEndIdx === -1) {
    console.error("Could not extract contact section from index.html");
    process.exit(1);
}

const contactSectionHTML = indexContent.substring(contactStartIdx, contactEndIdx);

// Apply to all HTML files that have a contact section
const files = fs.readdirSync('.').filter(f => f.endsWith('.html') && f !== 'index.html');
let synced = 0;

files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    const start = content.indexOf('<section class="contact section-padding" id="contacto">');
    if (start !== -1) {
        const end = content.indexOf('</section>', start) + 10;
        if (end !== -1) {
            content = content.substring(0, start) + contactSectionHTML + content.substring(end);
            fs.writeFileSync(f, content);
            synced++;
            console.log("Synced contact section in " + f);
        }
    }
});

console.log("Synced " + synced + " files.");
