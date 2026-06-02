import type { ServiceCategory } from './types';

// Categoria preparada para el cluster B2B. No se agrega al agregador hasta
// definir rutas comerciales dedicadas sin interferir con /empresas.
export const b2bCategory: ServiceCategory = {
  id: 'b2b',
  slug: 'b2b',
  title: 'B2B',
  icon: 'fa-building-shield',
  blurb: 'Soporte TI para empresas',
  heroBg: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)',
  services: [
    {
      slug: 'soporte-ti-empresas',
      label: 'Soporte TI para empresas',
      customUrl: '/empresas',
      seoKeyword: 'Soporte TI para empresas en Cancun',
      intro: 'Mesa de ayuda, mantenimiento preventivo, reportes y soporte para oficinas, hoteles y negocios en Cancun.',
      bullets: ['Atencion por ticket', 'Reportes para administracion', 'Soporte a equipos, red e impresoras'],
    },
  ],
};
