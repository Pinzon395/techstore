const fs = require('fs');
let b2b = fs.readFileSync('pages/servicios/b2b.html', 'utf8');
const newCards = fs.readFileSync('b2b_new_cards.html', 'utf8');
const startMarker = '<div class="b2b-grid"';
const endMarker = '<div style="background:rgba(59,130,246,0.05);';

const startIndex = b2b.indexOf(startMarker);
const endIndex = b2b.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    b2b = b2b.slice(0, startIndex) + newCards + '\n            ' + b2b.slice(endIndex);
    fs.writeFileSync('pages/servicios/b2b.html', b2b, 'utf8');
    console.log('Replacement successful');
} else {
    console.log('Markers not found', startIndex, endIndex);
}
