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

export type { ServiceItem, ServiceCategory } from './services/types';

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  laptopCategory,
  pcCategory,
  consolaCategory,
  telefonoCategory,
  impresoraCategory,
];

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
