import fs from 'node:fs';

const fixes = [
  {
    file: 'src/pages/blogs/pasta-termica-vs-metal-liquido.astro',
    replacements: [
      [
        '<img src="/assets/images/mantenimiento-metal-liquido-cancun.webp" alt="Técnico de Pixon PC aplicando pasta térmica en laptop gamer en Cancún" />',
        '<img src="/assets/images/mantenimiento-metal-liquido-cancun.webp" alt="Técnico de Pixon PC aplicando pasta térmica en laptop gamer en Cancún" loading="lazy" decoding="async" width="800" height="450" />'
      ],
      [
        '<img src="/assets/images/mantenimiento-metal-liquido-cancun.webp" alt="Aplicación controlada de metal líquido en laptop gamer en Cancún Quintana Roo" />',
        '<img src="/assets/images/mantenimiento-metal-liquido-cancun.webp" alt="Aplicación controlada de metal líquido en laptop gamer en Cancún Quintana Roo" loading="lazy" decoding="async" width="800" height="450" />'
      ],
      [
        '<img src="/assets/images/laptop-feliz-limpia.webp" alt="Cambio de pasta térmica en laptop con sobrecalentamiento en Cancún" />',
        '<img src="/assets/images/laptop-feliz-limpia.webp" alt="Cambio de pasta térmica en laptop con sobrecalentamiento en Cancún" loading="lazy" decoding="async" width="800" height="450" />'
      ],
      [
        '<img src="/assets/images/laptop-gamer-rogstrix.webp" alt="Laptop gamer con sobrecalentamiento revisada por Pixon PC en Cancún" />',
        '<img src="/assets/images/laptop-gamer-rogstrix.webp" alt="Laptop gamer con sobrecalentamiento revisada por Pixon PC en Cancún" loading="lazy" decoding="async" width="800" height="450" />'
      ],
      [
        '<img src="/assets/images/mantenimiento-pc-escritorio.webp" alt="Mantenimiento de PC gamer con cambio de pasta térmica en Cancún" />',
        '<img src="/assets/images/mantenimiento-pc-escritorio.webp" alt="Mantenimiento de PC gamer con cambio de pasta térmica en Cancún" loading="lazy" decoding="async" width="800" height="450" />'
      ],
      [
        '<img src="/assets/images/mantenimiento-metal-liquido-cancun.webp" alt="Mantenimiento térmico de consola con pasta térmica en Cancún Quintana Roo" />',
        '<img src="/assets/images/mantenimiento-metal-liquido-cancun.webp" alt="Mantenimiento térmico de consola con pasta térmica en Cancún Quintana Roo" loading="lazy" decoding="async" width="800" height="450" />'
      ],
      [
        '<img src="/assets/images/mantenimiento-macbook-cancun.webp" alt="Mantenimiento térmico de MacBook con pasta térmica en Cancún" />',
        '<img src="/assets/images/mantenimiento-macbook-cancun.webp" alt="Mantenimiento térmico de MacBook con pasta térmica en Cancún" loading="lazy" decoding="async" width="800" height="450" />'
      ]
    ]
  },
  {
    file: 'src/components/views/HotelSupportView.astro',
    replacements: [
      [
        '<img\n              src="/assets/images/reparacion-impresoras-cancun.webp"\n              alt="Mantenimiento preventivo de impresoras y PCs en hoteles de Cancún"\n              class="hsv-split-img"\n            />',
        '<img\n              src="/assets/images/reparacion-impresoras-cancun.webp"\n              alt="Mantenimiento preventivo de impresoras y PCs en hoteles de Cancún"\n              class="hsv-split-img"\n              loading="lazy"\n              decoding="async"\n              width="600"\n              height="400"\n            />'
      ],
      [
        '<img\n            src="/assets/images/mantenimiento-pc-escritorio.webp"\n            alt="Mantenimiento preventivo por lotes de computadoras en Cancún"\n            class="hsv-maintenance-img"\n          />',
        '<img\n            src="/assets/images/mantenimiento-pc-escritorio.webp"\n            alt="Mantenimiento preventivo por lotes de computadoras en Cancún"\n            class="hsv-maintenance-img"\n            loading="lazy"\n            decoding="async"\n            width="600"\n            height="400"\n          />'
      ]
    ]
  },
  {
    file: 'src/components/views/MacBookPreventiveMaintenanceView.astro',
    replacements: [
      [
        '<img src="/assets/images/reparacion-mac-cancun.webp" alt="Limpieza interna MacBook Pro y Air en Cancún" class="card-inline-image" />',
        '<img src="/assets/images/reparacion-mac-cancun.webp" alt="Limpieza interna MacBook Pro y Air en Cancún" class="card-inline-image" loading="lazy" decoding="async" width="400" height="250" />'
      ],
      [
        '<img src="/assets/images/mantenimiento-macbook-cancun.webp" alt="Solución de sobrecalentamiento en MacBook Cancún" class="card-inline-image" />',
        '<img src="/assets/images/mantenimiento-macbook-cancun.webp" alt="Solución de sobrecalentamiento en MacBook Cancún" class="card-inline-image" loading="lazy" decoding="async" width="400" height="250" />'
      ]
    ]
  },
  {
    file: 'src/components/views/MacOSSoftwareView.astro',
    replacements: [
      [
        '<img\n              src="/assets/images/reparacion-mac-cancun.webp"\n              alt="Mac lenta por macOS corrupto — diagnóstico en Cancún"\n              class="mos-split-img"\n            />',
        '<img\n              src="/assets/images/reparacion-mac-cancun.webp"\n              alt="Mac lenta por macOS corrupto — diagnóstico en Cancún"\n              class="mos-split-img"\n              loading="lazy"\n              decoding="async"\n              width="600"\n              height="400"\n            />'
      ],
      [
        '<img\n            src="/assets/images/mac-mini.webp"\n            alt="Migración de datos y respaldo Mac en Cancún — Pixon PC"\n            class="mos-migration-img"\n          />',
        '<img\n            src="/assets/images/mac-mini.webp"\n            alt="Migración de datos y respaldo Mac en Cancún — Pixon PC"\n            class="mos-migration-img"\n            loading="lazy"\n            decoding="async"\n            width="600"\n            height="400"\n          />'
      ]
    ]
  },
  {
    file: 'src/components/views/PcCorrectiveMaintenanceView.astro',
    replacements: [
      [
        '<img src="/assets/images/ensamble-pc-gamer-cancun.webp" alt="Técnico probando componentes de PC en taller Cancún" />',
        '<img src="/assets/images/ensamble-pc-gamer-cancun.webp" alt="Técnico probando componentes de PC en taller Cancún" loading="lazy" decoding="async" width="600" height="400" />'
      ]
    ]
  },
  {
    file: 'src/components/views/PcDeepCleaningView.astro',
    replacements: [
      [
        '<img src="/assets/images/ensamble-pc-gamer-cancun.webp" alt="Técnico realizando limpieza profunda de componentes PC en taller Cancún" />',
        '<img src="/assets/images/ensamble-pc-gamer-cancun.webp" alt="Técnico realizando limpieza profunda de componentes PC en taller Cancún" loading="lazy" decoding="async" width="600" height="400" />'
      ]
    ]
  },
  {
    file: 'src/components/views/PcPreventiveMaintenanceView.astro',
    replacements: [
      [
        '<img src="/assets/images/ensamble-pc-gamer-cancun.webp" alt="Limpieza y ensamble de PC gamer en Cancún" />',
        '<img src="/assets/images/ensamble-pc-gamer-cancun.webp" alt="Limpieza y ensamble de PC gamer en Cancún" loading="lazy" decoding="async" width="600" height="400" />'
      ]
    ]
  }
];

for (const fix of fixes) {
  let content = fs.readFileSync(fix.file, 'utf8');
  let count = 0;
  for (const [target, repl] of fix.replacements) {
    if (content.includes(target)) {
      content = content.replace(target, repl);
      count++;
    } else {
      console.warn(`Target not found in ${fix.file}:`, target.slice(0, 60));
    }
  }
  fs.writeFileSync(fix.file, content, 'utf8');
  console.log(`Updated ${count}/${fix.replacements.length} images in ${fix.file}`);
}
