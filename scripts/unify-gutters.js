const fs = require('fs');
const path = require('path');

const targetFiles = [
  'src/styles/home.css',
  'src/pages/servicios/mantenimiento-preventivo-pc-empresas.astro',
  'src/pages/servicios/consola/xbox/sobrecalentamiento.astro',
  'src/pages/reparacion-controles.astro',
  'src/pages/en/laptop-repair.astro',
  'src/pages/en/phone-repair.astro',
  'src/pages/en/computer-repair.astro',
  'src/pages/en/liquid-damage.astro',
  'src/pages/desarrollo-software-paginas-web-cancun.astro',
  'src/pages/contacto.astro',
  'src/pages/blogs/aplicacion-metal-liquido-cancun.astro',
  'src/pages/blogs/humedad-salitre-calor-cancun.astro',
  'src/pages/blogs/mantenimiento-preventivo-equipos-cancun.astro',
  'src/pages/blogs/reparacion-bisagras-carcasas-laptop-cancun.astro',
  'src/pages/blogs/pasta-termica-vs-metal-liquido.astro',
  'src/pages/blogs/index.astro',
  'src/components/views/ImacMacMiniRepairView.astro',
  'src/components/views/LaptopDataRecoveryView.astro',
  'src/components/views/LenovoLaptopRepairView.astro',
  'src/components/views/PcBlueScreenView.astro',
  'src/components/views/PcLentitudView.astro',
  'src/components/views/PcPowerSupplyView.astro',
  'src/components/views/PhoneNoPowerView.astro',
  'src/components/views/Ps5LiquidMetalCleaningView.astro',
  'src/components/views/PcVirusMalwareView.astro',
  'src/components/views/PhoneLiquidDamageView.astro',
  'src/components/views/PcNoEnciendeView.astro',
  'src/components/views/PcDataRecoveryView.astro',
  'src/components/views/PcComponentInstallationView.astro',
  'src/components/views/LaptopThermalPasteView.astro',
  'src/components/views/LaptopDiagnosticView.astro',
  'src/components/views/HpLaptopRepairView.astro',
  'src/components/views/DellLaptopRepairView.astro',
  'src/components/HeroWithFloatingCards.astro',
  'src/components/DiagnosticSection.astro',
  'src/components/DarkTechnicalSection.astro',
  'src/components/BeforeAfterSection.astro'
];

let replacedTotal = 0;

for (const fileRel of targetFiles) {
  const filePath = path.resolve(fileRel);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${fileRel}`);
    continue;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  let before = content;

  // Replace calc(100% - 32px)
  content = content.replace(/calc\(100%\s*-\s*32px\)/g, 'calc(100% - (var(--page-gutter) * 2))');
  // Replace calc(100% - 40px)
  content = content.replace(/calc\(100%\s*-\s*40px\)/g, 'calc(100% - (var(--page-gutter) * 2))');
  // Replace calc(100% - 2rem)
  content = content.replace(/calc\(100%\s*-\s*2rem\)/g, 'calc(100% - (var(--page-gutter) * 2))');
  // Replace PcLentitud mobile override: width:min(100% - 28px,1180px)
  content = content.replace(/width:\s*min\(100%\s*-\s*28px,\s*1180px\)/g, 'width:min(1180px,calc(100% - (var(--page-gutter) * 2)))');

  if (content !== before) {
    fs.writeFileSync(filePath, content, 'utf8');
    replacedTotal++;
    console.log(`[✓] Updated gutter token in: ${fileRel}`);
  }
}

console.log(`\nUpdated ${replacedTotal} files to use var(--page-gutter).`);
