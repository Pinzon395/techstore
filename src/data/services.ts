/**
 * Servicios - agregador de categorias.
 *
 * Los datos viven en src/data/services/*.ts para mantener cada cluster
 * separado y escalable. Mantener los slugs estables evita romper URLs SEO.
 */
import type { ServiceCategory, ServiceItem } from './services/types';
import { laptopCategory } from './services/laptop';
import { pcCategory } from './services/pc';
import { consolaCategory } from './services/consola';
import { telefonoCategory } from './services/telefono';
import { impresoraCategory } from './services/impresora';
import { b2bCategory } from './services/b2b';
import { redesCategory } from './services/redes';
import { macCategory } from './services/mac';

export type { ServiceItem, ServiceCategory } from './services/types';

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  laptopCategory,
  pcCategory,
  consolaCategory,
  telefonoCategory,
  macCategory,
  impresoraCategory,
  b2bCategory,
  redesCategory,
];

export const SERVICE_ROUTES = SERVICE_CATEGORIES.flatMap((category) =>
  category.services
    .filter((service) => !service.customUrl)
    .map((service) => ({
      params: { categoria: category.slug, servicio: service.slug },
      props: { category, service },
      path: `/servicios/${category.slug}/${service.slug}`,
    }))
);

/** Helper para obtener una categoria por slug */
export function getCategory(slug: string): ServiceCategory | undefined {
  return SERVICE_CATEGORIES.find((c) => c.slug === slug);
}

/** Helper para obtener un servicio dentro de una categoria */
export function getService(categorySlug: string, serviceSlug: string): { category: ServiceCategory; service: ServiceItem } | undefined {
  const category = getCategory(categorySlug);
  if (!category) return undefined;
  const service = category.services.find((s) => s.slug === serviceSlug);
  if (!service) return undefined;
  return { category, service };
}
