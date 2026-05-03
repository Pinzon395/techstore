const fs = require('fs');

function updateCSS(filePath) {
    if (!fs.existsSync(filePath)) return;
    let css = fs.readFileSync(filePath, 'utf8');

    // 1. Rename 768px -> 750px
    css = css.replace(/768px/g, '750px');
    
    // 2. Rename 769px -> 751px
    css = css.replace(/769px/g, '751px');

    // 3. Remove .contact-grid 1fr from 1100px
    // Find .contact-grid { grid-template-columns: 1fr; gap: 30px } inside 1100px
    css = css.replace(/\.contact-grid\s*\{\s*grid-template-columns:\s*1fr;\s*gap:\s*30px\s*\}/g, '');
    css = css.replace(/\.contact-grid\s*\{\s*grid-template-columns:\s*1fr\s*\}/g, '');

    // 4. Remove .components-grid 1fr from 992px
    css = css.replace(/\.components-grid\s*\{\s*grid-template-columns:\s*1fr\s*\}/g, '');

    fs.writeFileSync(filePath, css, 'utf8');
    console.log(`Updated ${filePath}`);
}

updateCSS('styles/style.css');
updateCSS('styles/style.min.css');
updateCSS('assets/css/index.css'); // just in case
