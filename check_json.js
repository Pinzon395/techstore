const fs = require('fs');
const path = require('path');

function checkJsonLd(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
                checkJsonLd(fullPath);
            }
        } else if (fullPath.endsWith('.html')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const matches = content.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
            
            let faqCount = 0;
            let index = 0;

            for (const match of matches) {
                index++;
                const jsonString = match[1].trim();
                try {
                    const data = JSON.parse(jsonString);
                    
                    let type = data['@type'];
                    if (type === 'FAQPage' || (Array.isArray(type) && type.includes('FAQPage'))) {
                        faqCount++;
                    }
                    
                    if (data['@graph']) {
                        for (const item of data['@graph']) {
                            let type2 = item['@type'];
                            if (type2 === 'FAQPage' || (Array.isArray(type2) && type2.includes('FAQPage'))) {
                                faqCount++;
                            }
                        }
                    }
                } catch (e) {
                    console.log(`JSON ERROR in ${fullPath} (Script #${index}): ${e.message}`);
                }
            }

            if (faqCount > 1) {
                console.log(`DUPLICATE FAQPage in ${fullPath}: Found ${faqCount} schemas`);
            }
        }
    }
}

console.log("Checking JSON-LD syntax and duplicates...");
checkJsonLd('.');
console.log("Done.");
