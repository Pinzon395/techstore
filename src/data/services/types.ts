export interface ServiceItem {
  slug: string;       // segmento URL (ej. 'cambio-pantalla')
  label: string;      // título visible (ej. 'Cambio de pantalla')
  /** Oculta el servicio del megamenu principal, pero conserva su ruta dinamica. */
  navHidden?: boolean;
  /** Servicios anidados que se muestran como tercer nivel en el navbar. */
  navChildren?: Pick<ServiceItem, 'slug' | 'label' | 'customUrl'>[];
  intro?: string;     // descripción 1-2 líneas para el hero de la landing
  bullets?: string[]; // beneficios / qué incluye
  fromPrice?: string; // ej. '$650 MXN'
  eta?: string;       // tiempo estimado
  /** Si está presente, el navbar y los hubs apuntan a esta URL EXISTENTE
   *  en lugar de generar una landing nueva en /servicios/[cat]/[slug].
   *  Útil para reutilizar páginas ya hechas (/reparaciones, /paquetes, etc.). */
  customUrl?: string;

  // --- Data extendida (opcional, solo en landings premium) ---
  /** Keyword H1 SEO específica si difiere del label */
  seoKeyword?: string;
  /** H1 final para landings que necesitan una frase SEO mas precisa */
  h1?: string;
  /** Meta tags especificos cuando difieren del patron automatico */
  metaTitle?: string;
  metaDescription?: string;
  /** Overrides puntuales para Schema Service sin alterar el label de navegación. */
  schemaName?: string;
  schemaServiceType?: string;
  /** Evita publicar una oferta cuando el precio depende íntegramente del diagnóstico. */
  hideSchemaOffer?: boolean;
  /** Subtítulo grande bajo el H1 (gancho emocional / problema que resuelve) */
  hook?: string;
  /** "Por qué nosotros"  -  4-6 cards */
  whyUs?: { icon: string; title: string; desc: string }[];
  /** Pasos del proceso paso a paso (timeline) */
  process?: { title: string; desc: string }[];
  /** Bloques educativos (imagen + texto) para enriquecer el contexto */
  educationalBlocks?: { 
    eyebrow: string; 
    title: string; 
    intro: string; 
    imgSrc: string; 
    imgAlt: string; 
    points: { icon: string; title: string; text: string }[]; 
    reverse?: boolean;
  }[];
  /** Problemas comunes que resuelve */
  commonProblems?: { problem: string; solution: string }[];
  /** Marcas/modelos compatibles (chips) */
  compatibleBrands?: string[];
  /** FAQ específica de este servicio */
  faqs?: { question: string; answer: string }[];
  /** Slugs de servicios relacionados de la MISMA categoría a destacar */
  relatedSlugs?: string[];
  /** Texto breve para la tarjeta de servicio relacionado. */
  relatedCardDesc?: string;
  /** Links externos a otras vistas relacionadas (paquetes, FAQ general, etc.) */
  relatedExternal?: { label: string; href: string; icon: string; desc: string }[];
  /** Titulo especifico para la seccion de servicios relacionados */
  relatedTitle?: string;
  /** Titulo y subtitulo especificos para el formulario de ticket */
  ticketTitle?: string;
  ticketSubtitle?: string;
  /** Bloques SEO locales renderizados en ServiceDetailView */
  localSeoTitle?: string;
  localSeoIntro?: string;
  localSeoSections?: {
    id: string;
    eyebrow: string;
    icon?: string;
    title: string;
    copy: string;
    points: string[];
  }[];
  /** Garantía específica (texto corto, ej. "6 meses por escrito") */
  warranty?: string;
  /** Trust Strip - estadísticas de confianza (4 items) */
  trustStats?: { icon: string; value: string; label: string }[];
  /** Sección Especialistas - título + descripción */
  specialistTitle?: string;
  specialistDesc?: string;
  specialistImage?: string;
  /** Galería de tipos de pantalla - badges sobre imágenes */
  screenTypes?: { label: string; desc: string }[];
  /** Antes/Después comparativa */
  beforeAfter?: { before: string[]; after: string[] };
  /** Imagen destacada para hero de upgrade u otros */
  featuredImage?: string;
  /** Imágenes por sección */
  sectionImages?: {
    whyUs?: string;
    process?: string;
    [key: string]: string | undefined;
  };
}

export interface ServiceCategory {
  id: string;
  slug: string;       // segmento URL (ej. 'laptop')
  title: string;
  icon: string;       // clase Font Awesome (sin 'fa-solid ')
  blurb: string;      // descripción corta para navbar
  heroBg?: string;    // gradiente o color para hero
  services: ServiceItem[];
}
