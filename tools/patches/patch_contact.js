const fs = require('fs');

const files = ['ensambles.html', 'contacto.html'];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Find coverage-area
    const coverageStart = content.indexOf('<div class="coverage-area" id="cobertura"');
    if (coverageStart === -1) {
        console.log("no coverageStart in " + file);
        return;
    }
    
    // Find the end by looking for <div class="map-container">
    const mapStart = content.indexOf('<div class="map-container">', coverageStart);
    if (mapStart === -1) {
        console.log("no mapStart in " + file);
        return;
    }
    
    const coverageBlock = content.substring(coverageStart, mapStart).trim();
    
    // Cut it out
    content = content.replace(content.substring(coverageStart, mapStart), '\n                    ');
    
    // Find where to insert it in right column
    // The right column starts with <div class="contact-right">
    // Inside it is <div class="contact-form glass-card"...>
    // We want to insert just after this form.
    // The form ends with \n                    </div> before \n                </div>  (the end of contact-right).
    // Let's use `</div>\n                </div>\n            </div>\n        </div>\n    </section>` to anchor
    const searchString = '</div>\n                </div>\n            </div>\n        </div>\n    </section>';
    const insertPoint = content.indexOf(searchString);
    if (insertPoint !== -1) {
        content = content.substring(0, insertPoint) + '\n                    ' + coverageBlock + '\n                ' + content.substring(insertPoint);
        fs.writeFileSync(file, content);
        console.log(`Patched ${file}`);
    } else {
        // Fallback: search for contact block regex
        const fallbackSearch = '</div>\n                </div>\n            </div>\n        </div>';
        const fallbackPoint = content.indexOf(fallbackSearch, content.indexOf('contact-right'));
        if (fallbackPoint !== -1) {
             content = content.substring(0, fallbackPoint) + '\n                    ' + coverageBlock + '\n                ' + content.substring(fallbackPoint);
             fs.writeFileSync(file, content);
             console.log(`Patched fallback ${file}`);
        } else {
             console.log(`Anchor not found in ${file}`);
        }
    }
});
