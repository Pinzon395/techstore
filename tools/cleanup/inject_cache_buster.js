const fs = require('fs');
const path = require('path');

const scriptToInject = `
<script>
  // Pixon Cache Buster - Obliga a recargar si la versión cambia
  (function() {
    var currentVersion = '2.1.0';
    var userVersion = localStorage.getItem('pixon_version');
    if (userVersion !== currentVersion) {
      localStorage.clear();
      sessionStorage.clear();
      if ('caches' in window) {
        caches.keys().then(function(names) {
          for (let name of names) caches.delete(name);
        });
      }
      // Si existiera algún Service Worker viejo (de la PWA anterior), desinstalarlo
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
          for(let registration of registrations) {
            registration.unregister();
          }
        });
      }
      localStorage.setItem('pixon_version', currentVersion);
      window.location.reload(true);
    }
  })();
</script>
`;

const files = fs.readdirSync(process.cwd()).filter(f => f.endsWith('.html'));

let changed = 0;
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    
    // Solo inyectar si no existe ya
    if (!content.includes('Pixon Cache Buster')) {
        // Insertarlo justo después de <head>
        content = content.replace(/<head>/i, `<head>\n${scriptToInject}`);
        fs.writeFileSync(f, content, 'utf8');
        changed++;
    }
});

console.log(`Cache buster inyectado en ${changed} archivos HTML.`);
