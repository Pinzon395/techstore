import { business } from './business';

const SITE_URL = business.siteUrl;
const BUSINESS_ID = `${SITE_URL}/#business`;
export const SHIPPING_SERVICE_ID = `${SITE_URL}/politica-de-envios-y-devoluciones#envio-cancun`;

type FaqItem = {
  question?: string;
  answer?: string;
};

type BreadcrumbItem = {
  name?: string;
  label?: string;
  url?: string;
  href?: string;
};

type ServiceLike = {
  label?: string;
  slug?: string;
  intro?: string;
  seoKeyword?: string;
  fromPrice?: string;
  heroImage?: string;
  image?: string;
};

type ServiceSchemaInput = {
  service: ServiceLike;
  category?: { title?: string; slug?: string };
  url: string;
  description?: string;
  image?: string;
  areaServed?: object[];
};

export function absoluteUrl(value = '') {
  if (!value) return SITE_URL;
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE_URL}${value.startsWith('/') ? value : `/${value}`}`;
}

export function stripHtml(value = '') {
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildShippingServiceSchema() {
  return {
    '@type': 'ShippingService',
    '@id': SHIPPING_SERVICE_ID,
    name: 'Entrega y recolección coordinada en Cancún',
    description: 'La disponibilidad, cobertura y cualquier cargo de recolección o entrega se confirman según la zona, distancia y tipo de equipo.',
    fulfillmentType: 'FulfillmentTypeDelivery',
    shippingConditions: {
      '@type': 'ShippingConditions',
      shippingDestination: {
        '@type': 'DefinedRegion',
        addressCountry: 'MX',
        addressRegion: 'Quintana Roo',
        addressLocality: 'Cancún',
      },
    },
  };
}

function parsePrice(value?: string) {
  if (!value) return null;
  const match = String(value).replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  return match ? match[0] : null;
}

export function buildLocalBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'ProfessionalService'],
    '@id': BUSINESS_ID,
    name: business.name,
    description:
      'Servicio técnico privado de reparación de computadoras, laptops, celulares e impresoras en Cancún. La recolección y entrega se coordinan según zona, disponibilidad y tipo de equipo. Mantenimiento preventivo, ensamble de PCs gamer, soporte B2B empresarial y atención escrita en inglés.',
    url: SITE_URL,
    telephone: business.phone,
    email: business.email,
    priceRange: '$$',
    image: `${SITE_URL}/LOGOCIRCULAR.png`,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/LOGOCIRCULAR.png`,
      width: 512,
      height: 512,
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Cto. Hacienda Chimay',
      addressLocality: 'Cancún',
      addressRegion: 'Quintana Roo',
      postalCode: '77539',
      addressCountry: 'MX',
    },
    areaServed: [
      { '@type': 'City', name: 'Cancún' },
      { '@type': 'AdministrativeArea', name: 'Quintana Roo' },
    ],
    sameAs: [
      'https://www.facebook.com/people/Pixon-PC/61556271364935/',
      'https://www.instagram.com/pixonpc/',
      'https://www.tiktok.com/@pixonpc',
      'https://www.youtube.com/@pixonpc',
    ],
  };
}

export function buildWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: 'Pixon PC',
    url: `${SITE_URL}/`,
  };
}

export function buildServiceSchema({ service, category, url, description, image, areaServed }: ServiceSchemaInput) {
  const name = service.schemaName || service.seoKeyword || service.label;
  if (!name) return null;

  const price = service.hideSchemaOffer ? null : parsePrice(service.fromPrice);
  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${absoluteUrl(url)}#service`,
    name,
    description: stripHtml(description || service.intro || `Servicio de ${name} en Cancún.`),
    serviceType: service.schemaServiceType || (category?.title ? `${name} - ${category.title}` : name),
    url: absoluteUrl(url),
    provider: { '@id': BUSINESS_ID },
    areaServed: areaServed || [
      { '@type': 'City', name: 'Cancún' },
      { '@type': 'AdministrativeArea', name: 'Quintana Roo' },
    ],
  };

  const schemaImage = image || service.heroImage || service.image;
  if (schemaImage) schema.image = absoluteUrl(schemaImage);

  if (price) {
    schema.offers = {
      '@type': 'Offer',
      url: absoluteUrl(url),
      price,
      priceCurrency: 'MXN',
      description: `Precio desde ${service.fromPrice}. El costo final se confirma con diagnóstico y disponibilidad de refacciones.`,
    };
  }

  return schema;
}

export function buildBreadcrumbSchema(items: BreadcrumbItem[]) {
  const list = items
    .map((item, index) => {
      const name = item.name || item.label;
      const url = item.url || item.href;
      if (!name || !url) return null;
      return {
        '@type': 'ListItem',
        position: index + 1,
        name,
        item: absoluteUrl(url),
      };
    })
    .filter(Boolean);

  if (list.length < 2) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: list,
  };
}

export function buildFAQSchema(faqs?: FaqItem[]) {
  const mainEntity = (faqs || [])
    .map((item) => ({
      question: stripHtml(item.question || ''),
      answer: stripHtml(item.answer || ''),
    }))
    .filter((item) => item.question && item.answer)
    .map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    }));

  if (!mainEntity.length) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity,
  };
}

export function cleanSchemaList(items: any[]) {
  const seen = new Set<string>();
  return items.map((item) => {
    if (!item || typeof item !== 'object') return item;
    const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
    if (!types.some((type) => ['LocalBusiness', 'ProfessionalService', 'Service'].includes(type))) return item;
    // Ratings and reviews must come from a verified, current source. Static page
    // snapshots are not reliable enough to publish as structured data.
    const safe = { ...item };
    delete safe.aggregateRating;
    delete safe.review;
    return safe;
  }).filter((item) => {
    if (!item) return false;
    const type = Array.isArray(item['@type']) ? item['@type'].join('|') : item['@type'];
    const key = `${type || 'schema'}:${item['@id'] || item.url || item.name || JSON.stringify(item).slice(0, 120)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
