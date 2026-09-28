
async function testPage(url, name) {
  const res = await fetch(url);
  const html = await res.text();
  console.log('=== ' + name + ' ===');
  console.log('URL:', url);
  console.log('Status:', res.status);
  
  // Title
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  console.log('Title:', titleMatch ? titleMatch[1] : 'NONE');

  // Meta description
  const metaDescMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  console.log('Description:', metaDescMatch ? metaDescMatch[1] : 'NONE');

  // Canonical
  const canonMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  console.log('Canonical:', canonMatch ? canonMatch[1] : 'NONE');

  // Robots
  const robotsMatch = html.match(/<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i);
  console.log('Robots:', robotsMatch ? robotsMatch[1] : 'NONE');

  // H1 matches
  const h1Matches = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
  console.log('H1 count:', h1Matches.length);
  h1Matches.forEach((h, i) => console.log(`  H1 #${i+1}: ${h.replace(/<[^>]+>/g, '').trim()}`));

  // H2 count
  const h2Matches = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/gi) || [];
  console.log('H2 count:', h2Matches.length);
  h2Matches.slice(0, 8).forEach((h, i) => console.log(`  H2 #${i+1}: ${h.replace(/<[^>]+>/g, '').trim()}`));

  // Check WhatsApp buttons
  const waMatches = html.match(/wa\.me\/529986690777/gi) || [];
  console.log('WhatsApp links count:', waMatches.length);

  // Check Ticket form or ticket section
  const ticketMatches = html.match(/ticket/gi) || [];
  console.log('Ticket references count:', ticketMatches.length);

  // Check Cancun local zones
  const zones = ['Cancún Centro', 'Zona Hotelera', 'Huayacán', 'Cumbres', 'Bonfil', 'Polígono Sur', 'Puerto Cancún', 'Bonampak', 'Tulum'];
  const foundZones = zones.filter(z => html.includes(z));
  console.log('Found zones:', foundZones.join(', '));

  // Check NAP
  const napPixon = html.includes('Pixon PC');
  const napAddress = html.includes('Hacienda Chimay') || html.includes('77539');
  const napPhone = html.includes('998') && html.includes('669');
  console.log('NAP present:', { Pixon: napPixon, Address: napAddress, Phone: napPhone });

  // Check cross-links
  if (name.includes('AVANZADA')) {
    console.log('Links to reparacion-pantalla-iphone:', html.includes('/servicios/telefono/reparacion-pantalla-iphone'));
  } else {
    console.log('Links to reparacion-iphone:', html.includes('/servicios/telefono/reparacion-iphone'));
  }
}

(async () => {
  await testPage('http://localhost:4321/servicios/telefono/reparacion-iphone', 'REPARACION-IPHONE (AVANZADA)');
  console.log('\n----------------------------------------\n');
  await testPage('http://localhost:4321/servicios/telefono/reparacion-pantalla-iphone', 'REPARACION-PANTALLA-IPHONE (PANTALLA)');
})();
