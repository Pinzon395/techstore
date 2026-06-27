import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'docs', 'projectlibre-software-project');

const dayMs = 24 * 60 * 60 * 1000;
const projectStart = new Date('2026-05-11T09:00:00-05:00');
const projectEnd = new Date('2026-08-10T18:00:00-05:00');
const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

const resources = [
  { id: 1, name: 'Gerente de proyecto', initials: 'GP', type: 'Mano de obra', role: 'Project Manager', rate: 850, notes: 'Control de alcance, cronograma, presupuesto, riesgos y comunicación con dirección.' },
  { id: 2, name: 'Product Owner', initials: 'PO', type: 'Mano de obra', role: 'Product Owner', rate: 720, notes: 'Prioriza backlog, valida valor de negocio y acepta entregables.' },
  { id: 3, name: 'Scrum Master', initials: 'SM', type: 'Mano de obra', role: 'Scrum Master', rate: 650, notes: 'Facilita ceremonias, remueve bloqueos y cuida el flujo del equipo.' },
  { id: 4, name: 'Analista de negocio', initials: 'AN', type: 'Mano de obra', role: 'Business Analyst', rate: 620, notes: 'Levantamiento, reglas de negocio, historias de usuario y criterios de aceptación.' },
  { id: 5, name: 'Diseñador UX/UI', initials: 'UX', type: 'Mano de obra', role: 'UX/UI Designer', rate: 580, notes: 'Arquitectura de información, prototipos, sistema visual y pruebas de usabilidad.' },
  { id: 6, name: 'Desarrollador frontend', initials: 'FE', type: 'Mano de obra', role: 'Frontend Engineer', rate: 650, notes: 'Interfaz web, accesibilidad, responsive, integración con API y estados de UI.' },
  { id: 7, name: 'Desarrollador backend', initials: 'BE', type: 'Mano de obra', role: 'Backend Engineer', rate: 700, notes: 'API, base de datos, autenticación, lógica de negocio e integraciones.' },
  { id: 8, name: 'Ingeniero QA', initials: 'QA', type: 'Mano de obra', role: 'QA Engineer', rate: 480, notes: 'Plan de pruebas, ejecución funcional, regresión, evidencias y defectos.' },
  { id: 9, name: 'DevOps / Cloud', initials: 'DO', type: 'Mano de obra', role: 'DevOps Engineer', rate: 760, notes: 'CI/CD, ambientes, monitoreo, backups y despliegue.' },
  { id: 10, name: 'Especialista seguridad', initials: 'SEC', type: 'Mano de obra', role: 'Security Engineer', rate: 820, notes: 'Modelo de amenazas, revisión OWASP, hardening y validación de controles.' },
  { id: 11, name: 'Servidor cloud staging/prod', initials: 'CLD', type: 'Arrendamiento', role: 'Infraestructura cloud', rate: 0, cost: 4200, notes: 'Arrendamiento estimado por 3 meses: VPS administrado, base de datos, backups y monitoreo.' },
  { id: 12, name: 'Licencias colaboración y diseño', initials: 'LIC', type: 'Arrendamiento', role: 'SaaS de equipo', rate: 0, cost: 3750, notes: 'Figma, Jira/Confluence, gestor de repositorios privado y almacenamiento de evidencias por 3 meses.' },
  { id: 13, name: 'Equipo de pruebas y periféricos', initials: 'MAT', type: 'Material', role: 'Material QA', rate: 0, cost: 26000, notes: 'Dispositivos de prueba, cables, adaptadores, disco externo de respaldos y periféricos.' },
];

const phases = [
  { id: 'P1', name: 'Inicio y descubrimiento' },
  { id: 'P2', name: 'Análisis y diseño funcional' },
  { id: 'P3', name: 'Arquitectura y preparación técnica' },
  { id: 'P4', name: 'Construcción del producto' },
  { id: 'P5', name: 'Pruebas, seguridad y estabilización' },
  { id: 'P6', name: 'Despliegue, cierre y transferencia' },
];

const tasks = [
  {
    "id": 1,
    "phase": "P1",
    "name": "Acta de constitución y alcance inicial",
    "duration": 2,
    "start": "2026-05-11",
    "preds": [],
    "type": "Duración fija",
    "resources": [
      [
        1,
        12
      ],
      [
        2,
        8
      ]
    ],
    "deliverable": "Project charter firmado, objetivos SMART, restricciones, supuestos y patrocinador definido.",
    "critical": true
  },
  {
    "id": 2,
    "phase": "P1",
    "name": "Identificación de interesados y matriz RACI",
    "duration": 2,
    "start": "2026-05-13",
    "preds": [
      1
    ],
    "type": "Trabajo fijo",
    "resources": [
      [
        1,
        8
      ],
      [
        4,
        8
      ]
    ],
    "deliverable": "Mapa de stakeholders, canales de comunicación, responsables y aprobadores por frente.",
    "critical": true
  },
  {
    "id": 3,
    "phase": "P1",
    "name": "Plan de comunicación y gobierno del proyecto",
    "duration": 2,
    "start": "2026-05-13",
    "preds": [
      1
    ],
    "type": "Duración fija",
    "resources": [
      [
        1,
        10
      ],
      [
        3,
        6
      ]
    ],
    "deliverable": "Cadencia de reuniones, formato de minutas, tablero de decisiones y reglas de escalamiento.",
    "critical": false
  },
  {
    "id": 4,
    "phase": "P1",
    "name": "Levantamiento de necesidades con usuarios clave",
    "duration": 5,
    "start": "2026-05-15",
    "preds": [
      2,
      3
    ],
    "type": "Trabajo fijo",
    "resources": [
      [
        4,
        28
      ],
      [
        2,
        12
      ],
      [
        5,
        10
      ]
    ],
    "deliverable": "Entrevistas, pain points, oportunidades, restricciones operativas y flujo actual documentado.",
    "critical": true
  },
  {
    "id": 5,
    "phase": "P1",
    "name": "Backlog inicial priorizado",
    "duration": 3,
    "start": "2026-05-22",
    "preds": [
      4
    ],
    "type": "Trabajo fijo",
    "resources": [
      [
        2,
        12
      ],
      [
        4,
        18
      ],
      [
        1,
        6
      ]
    ],
    "deliverable": "Épicas, historias candidatas, criterios de prioridad y primera versión del MVP.",
    "critical": true
  },
  {
    "id": 6,
    "phase": "P1",
    "name": "Kickoff formal con equipo y sponsor",
    "duration": 1,
    "start": "2026-05-27",
    "preds": [
      5
    ],
    "type": "Hito",
    "resources": [
      [
        1,
        4
      ],
      [
        2,
        2
      ],
      [
        3,
        2
      ]
    ],
    "deliverable": "Presentación de alcance, calendario, riesgos iniciales y acuerdos de trabajo.",
    "critical": true,
    "milestone": true
  },
  {
    "id": 7,
    "phase": "P2",
    "name": "Historias de usuario y criterios de aceptación",
    "duration": 5,
    "start": "2026-05-28",
    "preds": [
      6
    ],
    "type": "Trabajo fijo",
    "resources": [
      [
        4,
        30
      ],
      [
        2,
        18
      ],
      [
        8,
        8
      ]
    ],
    "deliverable": "Historias INVEST con criterios Given/When/Then y reglas de negocio verificables.",
    "critical": true
  },
  {
    "id": 8,
    "phase": "P2",
    "name": "Modelo de dominio y reglas de negocio",
    "duration": 4,
    "start": "2026-06-04",
    "preds": [
      7
    ],
    "type": "Trabajo fijo",
    "resources": [
      [
        4,
        18
      ],
      [
        7,
        18
      ],
      [
        2,
        8
      ]
    ],
    "deliverable": "Entidades, relaciones, estados, validaciones y glosario funcional.",
    "critical": true
  },
  {
    "id": 9,
    "phase": "P2",
    "name": "Taller de requisitos no funcionales",
    "duration": 2,
    "start": "2026-06-04",
    "preds": [
      7
    ],
    "type": "Duraci?n fija",
    "resources": [
      [
        4,
        8
      ],
      [
        7,
        6
      ],
      [
        9,
        4
      ],
      [
        10,
        4
      ]
    ],
    "deliverable": "Requisitos de disponibilidad, rendimiento, seguridad, mantenibilidad y soporte priorizados.",
    "critical": false
  },
  {
    "id": 10,
    "phase": "P2",
    "name": "Mapa de navegación y arquitectura de información",
    "duration": 3,
    "start": "2026-05-28",
    "preds": [
      6
    ],
    "type": "Duración fija",
    "resources": [
      [
        5,
        20
      ],
      [
        4,
        8
      ]
    ],
    "deliverable": "Sitemap, flujos principales y jerarquía de pantallas para MVP.",
    "critical": false
  },
  {
    "id": 11,
    "phase": "P2",
    "name": "Wireframes de flujos principales",
    "duration": 5,
    "start": "2026-06-02",
    "preds": [
      10
    ],
    "type": "Trabajo fijo",
    "resources": [
      [
        5,
        32
      ],
      [
        2,
        6
      ],
      [
        6,
        6
      ]
    ],
    "deliverable": "Wireframes mobile/desktop de onboarding, dashboard, alta, edición, búsqueda y reportes.",
    "critical": false
  },
  {
    "id": 12,
    "phase": "P2",
    "name": "Prototipo visual y mini sistema de diseño",
    "duration": 5,
    "start": "2026-06-09",
    "preds": [
      11
    ],
    "type": "Trabajo fijo",
    "resources": [
      [
        5,
        36
      ],
      [
        6,
        8
      ],
      [
        2,
        6
      ]
    ],
    "deliverable": "Componentes, tokens visuales, estados, layout responsive y prototipo navegable.",
    "critical": false
  },
  {
    "id": 13,
    "phase": "P2",
    "name": "Plan de pruebas funcionales y trazabilidad",
    "duration": 3,
    "start": "2026-06-04",
    "preds": [
      7
    ],
    "type": "Trabajo fijo",
    "resources": [
      [
        8,
        20
      ],
      [
        4,
        8
      ]
    ],
    "deliverable": "Matriz historia-prueba, escenarios positivos/negativos y estrategia de regresión.",
    "critical": false
  },
  {
    "id": 14,
    "phase": "P2",
    "name": "Validacion de prototipo con usuarios clave",
    "duration": 2,
    "start": "2026-06-16",
    "preds": [
      12
    ],
    "type": "Trabajo fijo",
    "resources": [
      [
        5,
        10
      ],
      [
        2,
        6
      ],
      [
        4,
        6
      ]
    ],
    "deliverable": "Hallazgos de usabilidad, ajustes priorizados y aprobacion del flujo visual principal.",
    "critical": false
  },
  {
    "id": 15,
    "phase": "P3",
    "name": "Diseño de arquitectura técnica",
    "duration": 4,
    "start": "2026-06-10",
    "preds": [
      8
    ],
    "type": "Trabajo fijo",
    "resources": [
      [
        7,
        22
      ],
      [
        9,
        12
      ],
      [
        10,
        6
      ]
    ],
    "deliverable": "Arquitectura lógica, componentes, integración, ambientes, NFR y decisiones ADR.",
    "critical": true
  },
  {
    "id": 16,
    "phase": "P3",
    "name": "Modelo de datos y migraciones iniciales",
    "duration": 4,
    "start": "2026-06-16",
    "preds": [
      15
    ],
    "type": "Trabajo fijo",
    "resources": [
      [
        7,
        26
      ],
      [
        4,
        6
      ]
    ],
    "deliverable": "DER, migraciones base, índices principales y datos semilla para desarrollo.",
    "critical": true
  },
  {
    "id": 17,
    "phase": "P3",
    "name": "Estrategia de API y contratos de integracion",
    "duration": 3,
    "start": "2026-06-16",
    "preds": [
      15
    ],
    "type": "Trabajo fijo",
    "resources": [
      [
        7,
        18
      ],
      [
        6,
        6
      ],
      [
        8,
        6
      ]
    ],
    "deliverable": "OpenAPI, contratos de request/response, codigos de error y criterios de versionado.",
    "critical": false
  },
  {
    "id": 18,
    "phase": "P3",
    "name": "Configuración de repositorio, ramas y calidad",
    "duration": 2,
    "start": "2026-06-10",
    "preds": [
      15
    ],
    "type": "Unidades fijas",
    "resources": [
      [
        9,
        10
      ],
      [
        6,
        4
      ],
      [
        7,
        4
      ]
    ],
    "deliverable": "Repositorio, estrategia de ramas, linters, convenciones de commits y PR template.",
    "critical": false
  },
  {
    "id": 19,
    "phase": "P3",
    "name": "Pipeline CI/CD y ambientes dev/staging",
    "duration": 4,
    "start": "2026-06-12",
    "preds": [
      18
    ],
    "type": "Unidades fijas",
    "resources": [
      [
        9,
        24
      ],
      [
        7,
        6
      ],
      [
        11,
        1
      ]
    ],
    "deliverable": "Build automatizado, pruebas en CI, despliegue a staging, variables y secretos protegidos.",
    "critical": false
  },
  {
    "id": 20,
    "phase": "P3",
    "name": "Arquitectura de seguridad y permisos",
    "duration": 3,
    "start": "2026-06-16",
    "preds": [
      15
    ],
    "type": "Trabajo fijo",
    "resources": [
      [
        10,
        18
      ],
      [
        7,
        8
      ],
      [
        2,
        4
      ]
    ],
    "deliverable": "Roles, permisos, políticas de sesión, requisitos OWASP y controles de auditoría.",
    "critical": true
  },
  {
    "id": 21,
    "phase": "P3",
    "name": "Plan de respaldo y recuperacion tecnica",
    "duration": 2,
    "start": "2026-06-22",
    "preds": [
      19
    ],
    "type": "Unidades fijas",
    "resources": [
      [
        9,
        10
      ],
      [
        7,
        4
      ],
      [
        11,
        1
      ]
    ],
    "deliverable": "Politica de backups, retencion, restauracion probada y responsables de continuidad.",
    "critical": false
  },
  {
    "id": 22,
    "phase": "P4",
    "name": "Base del frontend y layout responsive",
    "duration": 5,
    "start": "2026-06-16",
    "preds": [
      12,
      18
    ],
    "type": "Trabajo fijo",
    "resources": [
      [
        6,
        34
      ],
      [
        5,
        8
      ]
    ],
    "deliverable": "Shell de aplicación, navegación, layout responsive, estilos base y estados vacíos.",
    "critical": false
  },
  {
    "id": 23,
    "phase": "P4",
    "name": "API de autenticación y gestión de usuarios",
    "duration": 6,
    "start": "2026-06-22",
    "preds": [
      16,
      20
    ],
    "type": "Trabajo fijo",
    "resources": [
      [
        7,
        42
      ],
      [
        10,
        8
      ],
      [
        8,
        4
      ]
    ],
    "deliverable": "Login, recuperación, sesiones, perfiles, roles y pruebas unitarias de seguridad básica.",
    "critical": true
  },
  {
    "id": 24,
    "phase": "P4",
    "name": "Módulo de catálogo/entidades principales",
    "duration": 7,
    "start": "2026-06-22",
    "preds": [
      16
    ],
    "type": "Trabajo fijo",
    "resources": [
      [
        7,
        38
      ],
      [
        6,
        28
      ],
      [
        8,
        6
      ]
    ],
    "deliverable": "CRUD principal, validaciones, paginación, filtros y manejo de errores.",
    "critical": true
  },
  {
    "id": 25,
    "phase": "P4",
    "name": "Gestion de roles y permisos en UI/API",
    "duration": 4,
    "start": "2026-06-30",
    "preds": [
      23,
      20
    ],
    "type": "Trabajo fijo",
    "resources": [
      [
        7,
        18
      ],
      [
        6,
        16
      ],
      [
        10,
        6
      ],
      [
        8,
        4
      ]
    ],
    "deliverable": "Permisos aplicados en frontend y backend, casos negativos y evidencias de acceso.",
    "critical": true
  },
  {
    "id": 26,
    "phase": "P4",
    "name": "Flujo transaccional principal",
    "duration": 8,
    "start": "2026-07-01",
    "preds": [
      23,
      24,
      25
    ],
    "type": "Trabajo fijo",
    "resources": [
      [
        7,
        48
      ],
      [
        6,
        38
      ],
      [
        4,
        8
      ],
      [
        8,
        8
      ]
    ],
    "deliverable": "Proceso completo de negocio con estados, confirmaciones, reglas y bitácora.",
    "critical": true
  },
  {
    "id": 27,
    "phase": "P4",
    "name": "Dashboard operativo y KPIs",
    "duration": 5,
    "start": "2026-07-01",
    "preds": [
      24
    ],
    "type": "Trabajo fijo",
    "resources": [
      [
        6,
        30
      ],
      [
        7,
        16
      ],
      [
        2,
        6
      ]
    ],
    "deliverable": "Indicadores, tarjetas de estado, filtros por periodo y vista para responsables.",
    "critical": false
  },
  {
    "id": 28,
    "phase": "P4",
    "name": "Integracion con servicio externo simulado",
    "duration": 3,
    "start": "2026-07-08",
    "preds": [
      26
    ],
    "type": "Unidades fijas",
    "resources": [
      [
        7,
        14
      ],
      [
        9,
        6
      ],
      [
        8,
        4
      ]
    ],
    "deliverable": "Adaptador de integracion, manejo de errores, reintentos y pruebas con datos simulados.",
    "critical": false
  },
  {
    "id": 29,
    "phase": "P4",
    "name": "Notificaciones y correos transaccionales",
    "duration": 4,
    "start": "2026-07-13",
    "preds": [
      26
    ],
    "type": "Trabajo fijo",
    "resources": [
      [
        7,
        20
      ],
      [
        6,
        8
      ],
      [
        9,
        6
      ]
    ],
    "deliverable": "Plantillas, disparadores, preferencias básicas y registro de envíos.",
    "critical": true
  },
  {
    "id": 30,
    "phase": "P4",
    "name": "Reportes exportables y búsqueda avanzada",
    "duration": 5,
    "start": "2026-07-08",
    "preds": [
      27
    ],
    "type": "Trabajo fijo",
    "resources": [
      [
        6,
        24
      ],
      [
        7,
        22
      ],
      [
        8,
        4
      ]
    ],
    "deliverable": "Búsqueda por criterios, exportación CSV/PDF y vista imprimible.",
    "critical": false
  },
  {
    "id": 31,
    "phase": "P4",
    "name": "Integración de analítica, logs y auditoría",
    "duration": 4,
    "start": "2026-07-13",
    "preds": [
      26,
      19
    ],
    "type": "Unidades fijas",
    "resources": [
      [
        9,
        16
      ],
      [
        7,
        14
      ],
      [
        10,
        4
      ]
    ],
    "deliverable": "Eventos críticos, logs estructurados, tablero de errores y trazabilidad de acciones.",
    "critical": true
  },
  {
    "id": 32,
    "phase": "P4",
    "name": "Ajustes de accesibilidad y responsive final",
    "duration": 3,
    "start": "2026-07-15",
    "preds": [
      22,
      14
    ],
    "type": "Trabajo fijo",
    "resources": [
      [
        6,
        14
      ],
      [
        5,
        10
      ],
      [
        8,
        4
      ]
    ],
    "deliverable": "Checklist WCAG basico, correcciones responsive y validacion visual en resoluciones clave.",
    "critical": false
  },
  {
    "id": 33,
    "phase": "P5",
    "name": "Pruebas unitarias y de integración",
    "duration": 3,
    "start": "2026-07-17",
    "preds": [
      29,
      31
    ],
    "type": "Trabajo fijo",
    "resources": [
      [
        8,
        24
      ],
      [
        6,
        12
      ],
      [
        7,
        16
      ]
    ],
    "deliverable": "Suite automatizada en CI para servicios, componentes críticos y contratos de API.",
    "critical": true
  },
  {
    "id": 34,
    "phase": "P5",
    "name": "Pruebas funcionales end-to-end",
    "duration": 4,
    "start": "2026-07-22",
    "preds": [
      33,
      30
    ],
    "type": "Trabajo fijo",
    "resources": [
      [
        8,
        34
      ],
      [
        6,
        8
      ],
      [
        7,
        8
      ],
      [
        13,
        1
      ]
    ],
    "deliverable": "Ejecución E2E de flujos principales con evidencias, defectos y severidad.",
    "critical": true
  },
  {
    "id": 35,
    "phase": "P5",
    "name": "Pruebas de usabilidad y ajustes de experiencia",
    "duration": 2,
    "start": "2026-07-24",
    "preds": [
      32,
      34
    ],
    "type": "Duraci?n fija",
    "resources": [
      [
        5,
        10
      ],
      [
        4,
        6
      ],
      [
        2,
        4
      ],
      [
        8,
        4
      ]
    ],
    "deliverable": "Sesiones cortas con usuarios, hallazgos priorizados y cambios de experiencia aprobados.",
    "critical": false
  },
  {
    "id": 36,
    "phase": "P5",
    "name": "Pruebas de rendimiento y optimización",
    "duration": 3,
    "start": "2026-07-28",
    "preds": [
      34
    ],
    "type": "Unidades fijas",
    "resources": [
      [
        9,
        16
      ],
      [
        7,
        10
      ],
      [
        6,
        8
      ]
    ],
    "deliverable": "Medición de carga, optimización de consultas, bundles y tiempos de respuesta.",
    "critical": true
  },
  {
    "id": 37,
    "phase": "P5",
    "name": "Revisión de seguridad OWASP y hardening",
    "duration": 3,
    "start": "2026-07-28",
    "preds": [
      34
    ],
    "type": "Trabajo fijo",
    "resources": [
      [
        10,
        24
      ],
      [
        7,
        8
      ],
      [
        9,
        8
      ]
    ],
    "deliverable": "Checklist OWASP, revisión de permisos, headers, secretos, dependencias y hallazgos cerrados.",
    "critical": false
  },
  {
    "id": 38,
    "phase": "P5",
    "name": "Corrección de defectos y regresión",
    "duration": 3,
    "start": "2026-07-31",
    "preds": [
      36,
      37,
      35
    ],
    "type": "Trabajo fijo",
    "resources": [
      [
        6,
        22
      ],
      [
        7,
        26
      ],
      [
        8,
        26
      ]
    ],
    "deliverable": "Defectos críticos y mayores corregidos, regresión completa y reporte de estabilidad.",
    "critical": true
  },
  {
    "id": 39,
    "phase": "P5",
    "name": "Revision de deuda tecnica y refactor menor",
    "duration": 2,
    "start": "2026-08-03",
    "preds": [
      38
    ],
    "type": "Trabajo fijo",
    "resources": [
      [
        7,
        12
      ],
      [
        6,
        10
      ],
      [
        9,
        4
      ]
    ],
    "deliverable": "Refactors acotados, eliminacion de deuda prioritaria y verificacion de no regresion.",
    "critical": false
  },
  {
    "id": 40,
    "phase": "P5",
    "name": "UAT con usuarios clave y acta de aceptación",
    "duration": 2,
    "start": "2026-08-05",
    "preds": [
      38
    ],
    "type": "Duración fija",
    "resources": [
      [
        2,
        12
      ],
      [
        4,
        8
      ],
      [
        8,
        16
      ],
      [
        1,
        6
      ]
    ],
    "deliverable": "Pruebas de aceptación, observaciones priorizadas y acta de aprobación del MVP.",
    "critical": true
  },
  {
    "id": 41,
    "phase": "P6",
    "name": "Plan de despliegue y rollback",
    "duration": 2,
    "start": "2026-08-06",
    "preds": [
      38
    ],
    "type": "Duración fija",
    "resources": [
      [
        9,
        16
      ],
      [
        1,
        6
      ],
      [
        7,
        6
      ]
    ],
    "deliverable": "Runbook, ventanas, responsables, checklist, respaldo y estrategia de reversa.",
    "critical": true
  },
  {
    "id": 42,
    "phase": "P6",
    "name": "Capacitación y manual operativo",
    "duration": 2,
    "start": "2026-08-06",
    "preds": [
      38
    ],
    "type": "Trabajo fijo",
    "resources": [
      [
        4,
        12
      ],
      [
        2,
        10
      ],
      [
        5,
        8
      ],
      [
        12,
        1
      ]
    ],
    "deliverable": "Manual de usuario, sesión de capacitación, preguntas frecuentes y guía de soporte inicial.",
    "critical": false
  },
  {
    "id": 43,
    "phase": "P6",
    "name": "Preparacion de mesa de ayuda y soporte inicial",
    "duration": 1,
    "start": "2026-08-07",
    "preds": [
      42
    ],
    "type": "Trabajo fijo",
    "resources": [
      [
        3,
        4
      ],
      [
        4,
        4
      ],
      [
        8,
        4
      ],
      [
        1,
        2
      ]
    ],
    "deliverable": "Canales de soporte, matriz de escalamiento, SLAs iniciales y responsables de atencion.",
    "critical": false
  },
  {
    "id": 44,
    "phase": "P6",
    "name": "Migracion inicial y validacion de datos productivos",
    "duration": 1,
    "start": "2026-08-07",
    "preds": [
      41,
      16
    ],
    "type": "Unidades fijas",
    "resources": [
      [
        7,
        8
      ],
      [
        9,
        8
      ],
      [
        4,
        4
      ]
    ],
    "deliverable": "Carga inicial, validacion de consistencia, respaldo previo y evidencia de conciliacion.",
    "critical": true
  },
  {
    "id": 45,
    "phase": "P6",
    "name": "Despliegue a producción y monitoreo inicial",
    "duration": 1,
    "start": "2026-08-10",
    "preds": [
      40,
      41,
      44
    ],
    "type": "Unidades fijas",
    "resources": [
      [
        9,
        18
      ],
      [
        7,
        8
      ],
      [
        6,
        4
      ],
      [
        11,
        1
      ]
    ],
    "deliverable": "Release productivo, smoke test, monitoreo, métricas y bitácora de lanzamiento.",
    "critical": true
  },
  {
    "id": 46,
    "phase": "P6",
    "name": "Hiper-cuidado post lanzamiento",
    "duration": 1,
    "start": "2026-08-10",
    "preds": [
      45
    ],
    "type": "Duraci?n fija",
    "resources": [
      [
        9,
        6
      ],
      [
        7,
        6
      ],
      [
        8,
        6
      ],
      [
        2,
        2
      ]
    ],
    "deliverable": "Monitoreo reforzado, registro de incidencias tempranas y decisiones de estabilizacion.",
    "critical": true
  },
  {
    "id": 47,
    "phase": "P6",
    "name": "Entrega de documentacion tecnica y operativa",
    "duration": 1,
    "start": "2026-08-10",
    "preds": [
      42,
      45
    ],
    "type": "Trabajo fijo",
    "resources": [
      [
        4,
        6
      ],
      [
        7,
        4
      ],
      [
        9,
        4
      ],
      [
        1,
        2
      ]
    ],
    "deliverable": "Repositorio documental, manual tecnico, runbook final y evidencias de transferencia.",
    "critical": false
  },
  {
    "id": 48,
    "phase": "P6",
    "name": "Cierre administrativo y lecciones aprendidas",
    "duration": 1,
    "start": "2026-08-10",
    "preds": [
      43,
      46,
      47
    ],
    "type": "Hito",
    "resources": [
      [
        1,
        8
      ],
      [
        3,
        4
      ],
      [
        2,
        4
      ]
    ],
    "deliverable": "Cierre de proyecto, costos reales vs planeados, retrospectiva y backlog post-MVP.",
    "critical": true,
    "milestone": true
  }
];

function parseDate(date) {
  return new Date(`${date}T09:00:00-05:00`);
}

function isBusinessDay(date) {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

function addBusinessDays(start, days) {
  const date = new Date(start);
  if (days <= 0) return date;
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    if (isBusinessDay(date)) added++;
  }
  return date;
}

function nextBusinessDay(date) {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  while (!isBusinessDay(next)) next.setDate(next.getDate() + 1);
  next.setHours(9, 0, 0, 0);
  return next;
}

function fmtDate(date) {
  return date.toISOString().slice(0, 10);
}

function fmtDateTime(date, hour = 9) {
  const d = new Date(date);
  d.setHours(hour, hour === 18 ? 0 : 0, 0, 0);
  return d.toISOString().replace(/\.\d{3}Z$/, '');
}

const taskById = new Map(tasks.map((task) => [task.id, task]));
for (const task of tasks) {
  if (task.start) {
    task.startDate = parseDate(task.start);
  } else {
    const latestPredFinish = task.preds
      .map((pred) => taskById.get(pred).finishDate)
      .sort((a, b) => b - a)[0];
    task.startDate = nextBusinessDay(latestPredFinish);
  }
  task.finishDate = task.milestone ? new Date(task.startDate) : addBusinessDays(task.startDate, task.duration - 1);
  task.workHours = task.resources.reduce((sum, [, hours]) => sum + (typeof hours === 'number' ? hours : 0), 0);
  task.laborCost = task.resources.reduce((sum, [resourceId, hours]) => {
    const resource = resources.find((item) => item.id === resourceId);
    if (!resource || resource.rate === 0) return sum;
    return sum + resource.rate * hours;
  }, 0);
  task.fixedCost = task.resources.reduce((sum, [resourceId]) => {
    const resource = resources.find((item) => item.id === resourceId);
    if (!resource || !resource.cost) return sum;
    return sum + resource.cost;
  }, 0);
  task.totalCost = task.laborCost + task.fixedCost;
}

const laborTotal = tasks.reduce((sum, task) => sum + task.laborCost, 0);
const materialRentalTotal = resources.filter((r) => r.cost).reduce((sum, r) => sum + r.cost, 0);
const contingency = Math.round((laborTotal + materialRentalTotal) * 0.1);
const total = laborTotal + materialRentalTotal + contingency;

function csvEscape(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function xmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function taskCsv() {
  const rows = [
    ['ID', 'Fase', 'Nombre de tarea', 'Duración días', 'Inicio', 'Fin', 'Predecesoras', 'Tipo de tarea', 'Recursos', 'Entregable', 'Ruta crítica', 'Trabajo horas', 'Costo MXN'],
    ...tasks.map((task) => [
      task.id,
      phases.find((phase) => phase.id === task.phase).name,
      task.name,
      task.duration,
      fmtDate(task.startDate),
      fmtDate(task.finishDate),
      task.preds.join(', '),
      task.type,
      task.resources.map(([id]) => resources.find((resource) => resource.id === id).name).join('; '),
      task.deliverable,
      task.critical ? 'Sí' : 'No',
      task.workHours,
      task.totalCost,
    ]),
  ];
  return rows.map((row) => row.map(csvEscape).join(',')).join('\n');
}

function resourceCsv() {
  const rows = [
    ['ID', 'Recurso', 'Iniciales', 'Tipo', 'Rol', 'Tarifa por hora MXN', 'Costo fijo MXN', 'Notas'],
    ...resources.map((resource) => [resource.id, resource.name, resource.initials, resource.type, resource.role, resource.rate, resource.cost ?? 0, resource.notes]),
  ];
  return rows.map((row) => row.map(csvEscape).join(',')).join('\n');
}

function markdownReport() {
  return `# Proyecto de software - Plan para ProjectLibre

## Resumen ejecutivo

Proyecto de desarrollo de una plataforma web operativa para un equipo de software, planificado del 11 de mayo de 2026 al 10 de agosto de 2026. El plan está construido con 6 fases y ${tasks.length} tareas ejecutables, dependencias finish-to-start principalmente, tareas de trabajo fijo, duración fija, unidades fijas e hitos.

El enfoque cubre todo el ciclo: inicio, descubrimiento, análisis, diseño, arquitectura, construcción, pruebas, seguridad, despliegue, transferencia y cierre. La estimación usa costos realistas en MXN para perfiles senior/mid en México, recursos de arrendamiento cloud/SaaS y materiales de prueba.

## Alcance del producto

La solución propuesta es una aplicación web con autenticación, roles, módulo principal de gestión, flujo transaccional, dashboard, reportes, notificaciones, auditoría, analítica, controles de seguridad, ambientes de staging/producción y documentación operativa.

## Fechas y presupuesto

- Inicio: 11 de mayo de 2026
- Fin planeado: 10 de agosto de 2026
- Duración calendario: 3 meses
- Tareas ejecutables: ${tasks.length}
- Fases: 6
- Recursos: ${resources.length}
- Mano de obra estimada: ${mxn.format(laborTotal)}
- Materiales y arrendamientos: ${mxn.format(materialRentalTotal)}
- Contingencia recomendada 10%: ${mxn.format(contingency)}
- Presupuesto total recomendado: ${mxn.format(total)}

## Ruta crítica

${tasks.filter((task) => task.critical).map((task) => `${task.id}. ${task.name} (${fmtDate(task.startDate)} al ${fmtDate(task.finishDate)})`).join('\n')}

## Tabla de tareas

| ID | Fase | Tarea | Dur. | Inicio | Fin | Pred. | Tipo | Ruta crítica | Costo |
|---:|---|---|---:|---|---|---|---|---|---:|
${tasks.map((task) => `| ${task.id} | ${phases.find((phase) => phase.id === task.phase).name} | ${task.name} | ${task.duration}d | ${fmtDate(task.startDate)} | ${fmtDate(task.finishDate)} | ${task.preds.join(', ') || '-'} | ${task.type} | ${task.critical ? 'Sí' : 'No'} | ${mxn.format(task.totalCost)} |`).join('\n')}

## Hoja de recursos

| ID | Recurso | Tipo | Rol | Tarifa/hora | Costo fijo | Uso |
|---:|---|---|---|---:|---:|---|
${resources.map((resource) => `| ${resource.id} | ${resource.name} | ${resource.type} | ${resource.role} | ${resource.rate ? mxn.format(resource.rate) : '-'} | ${resource.cost ? mxn.format(resource.cost) : '-'} | ${resource.notes} |`).join('\n')}
`;
}

function htmlReport() {
  const start = projectStart;
  const totalDays = Math.round((projectEnd - start) / dayMs) + 1;
  const taskRows = tasks.map((task) => {
    const left = Math.max(0, Math.round((task.startDate - start) / dayMs) / totalDays * 100);
    const width = Math.max(1.2, (Math.round((task.finishDate - task.startDate) / dayMs) + 1) / totalDays * 100);
    return `<tr>
      <td>${task.id}</td>
      <td>${xmlEscape(phases.find((phase) => phase.id === task.phase).name)}</td>
      <td><strong>${xmlEscape(task.name)}</strong><span>${xmlEscape(task.deliverable)}</span></td>
      <td>${task.duration}d</td>
      <td>${fmtDate(task.startDate)}</td>
      <td>${fmtDate(task.finishDate)}</td>
      <td>${task.preds.join(', ') || '-'}</td>
      <td>${xmlEscape(task.type)}</td>
      <td>${task.critical ? 'Sí' : 'No'}</td>
      <td>${mxn.format(task.totalCost)}</td>
      <td class="gantt"><div class="bar ${task.critical ? 'critical' : ''}" style="left:${left}%;width:${width}%"></div></td>
    </tr>`;
  }).join('');

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Proyecto de software - Gantt y recursos</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #071F3A; margin: 0; background: #fff; font-size: 11px; }
    h1 { font-size: 24px; margin: 0 0 6px; color: #071F3A; }
    h2 { font-size: 16px; margin: 18px 0 8px; color: #071F3A; }
    p { margin: 4px 0; line-height: 1.35; }
    .cover { padding: 18px 0 10px; border-bottom: 2px solid #071F3A; margin-bottom: 10px; }
    .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 10px; }
    .metric { border: 1px solid #B7C3D0; padding: 8px; border-radius: 4px; min-height: 48px; }
    .metric b { display: block; font-size: 13px; margin-top: 3px; }
    table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
    th, td { border: 1px solid #CDD6E0; padding: 5px; vertical-align: top; }
    th { background: #EEF3F8; text-align: left; font-weight: 700; }
    td span { display: block; margin-top: 2px; color: #244361; line-height: 1.25; }
    .tasks th:nth-child(3), .tasks td:nth-child(3) { width: 270px; }
    .tasks th:nth-child(11), .tasks td:nth-child(11) { width: 230px; }
    .gantt { position: relative; min-width: 220px; height: 18px; background:
      linear-gradient(90deg, rgba(7,31,58,.08) 1px, transparent 1px) 0 0 / 7.7% 100%; }
    .bar { position: absolute; height: 10px; top: 4px; border-radius: 2px; background: #2B7BB9; }
    .bar.critical { background: #C0372B; }
    .legend { display: flex; gap: 14px; margin: 8px 0; align-items: center; }
    .dot { width: 22px; height: 8px; display: inline-block; border-radius: 2px; margin-right: 5px; background: #2B7BB9; }
    .dot.critical { background: #C0372B; }
    .resources td:nth-child(7) { width: 410px; }
    .page-break { page-break-before: always; }
  </style>
</head>
<body>
  <section class="cover">
    <h1>Proyecto de software: planificación completa para ProjectLibre</h1>
    <p>Aplicación web operativa con autenticación, roles, módulo de gestión, flujo transaccional, dashboard, reportes, notificaciones, auditoría, pruebas, seguridad y despliegue productivo.</p>
    <div class="meta">
      <div class="metric">Inicio<b>11 mayo 2026</b></div>
      <div class="metric">Fin planeado<b>10 agosto 2026</b></div>
      <div class="metric">Fases y tareas<b>6 fases / ${tasks.length} tareas</b></div>
      <div class="metric">Presupuesto recomendado<b>${mxn.format(total)}</b></div>
    </div>
  </section>

  <h2>Ruta crítica</h2>
  <p>${tasks.filter((task) => task.critical).map((task) => `${task.id}`).join(' → ')}</p>
  <p>La ruta crítica atraviesa descubrimiento, reglas de negocio, arquitectura, autenticación, flujo transaccional, pruebas, estabilización, UAT, despliegue y cierre. Cualquier retraso en estas tareas mueve la fecha final.</p>
  <div class="legend"><span><i class="dot critical"></i>Ruta crítica</span><span><i class="dot"></i>Tarea no crítica</span></div>

  <h2>Tabla de tareas y diagrama de Gantt</h2>
  <table class="tasks">
    <thead>
      <tr><th>ID</th><th>Fase</th><th>Tarea y entregable</th><th>Dur.</th><th>Inicio</th><th>Fin</th><th>Pred.</th><th>Tipo</th><th>Crítica</th><th>Costo</th><th>Gantt: mayo-agosto 2026</th></tr>
    </thead>
    <tbody>${taskRows}</tbody>
  </table>

  <section class="page-break">
    <h2>Hoja de recursos</h2>
    <table class="resources">
      <thead><tr><th>ID</th><th>Recurso</th><th>Tipo</th><th>Rol</th><th>Tarifa/hora</th><th>Costo fijo</th><th>Uso planeado</th></tr></thead>
      <tbody>
        ${resources.map((resource) => `<tr><td>${resource.id}</td><td>${xmlEscape(resource.name)}</td><td>${xmlEscape(resource.type)}</td><td>${xmlEscape(resource.role)}</td><td>${resource.rate ? mxn.format(resource.rate) : '-'}</td><td>${resource.cost ? mxn.format(resource.cost) : '-'}</td><td>${xmlEscape(resource.notes)}</td></tr>`).join('')}
      </tbody>
    </table>

    <h2>Resumen de costos</h2>
    <table>
      <tbody>
        <tr><th>Mano de obra</th><td>${mxn.format(laborTotal)}</td></tr>
        <tr><th>Materiales y arrendamientos</th><td>${mxn.format(materialRentalTotal)}</td></tr>
        <tr><th>Contingencia 10%</th><td>${mxn.format(contingency)}</td></tr>
        <tr><th>Total recomendado</th><td>${mxn.format(total)}</td></tr>
      </tbody>
    </table>
  </section>
</body>
</html>`;
}

function projectXml() {
  const taskXml = [];
  let uid = 1;
  for (const phase of phases) {
    const phaseTasks = tasks.filter((task) => task.phase === phase.id);
    taskXml.push(`<Task><UID>${uid}</UID><ID>${uid}</ID><Name>${xmlEscape(phase.name)}</Name><Type>1</Type><IsNull>0</IsNull><CreateDate>${fmtDateTime(projectStart)}</CreateDate><WBS>${phase.id}</WBS><OutlineNumber>${phase.id}</OutlineNumber><OutlineLevel>1</OutlineLevel><Start>${fmtDateTime(phaseTasks[0].startDate)}</Start><Finish>${fmtDateTime(phaseTasks.at(-1).finishDate, 18)}</Finish><Duration>PT${phaseTasks.reduce((s, t) => s + t.duration, 0) * 8}H0M0S</Duration><Summary>1</Summary><Critical>0</Critical></Task>`);
    uid++;
    for (const task of phaseTasks) {
      task.xmlUid = uid;
      taskXml.push(`<Task>
<UID>${uid}</UID><ID>${uid}</ID><Name>${xmlEscape(task.name)}</Name><Type>${task.type === 'Unidades fijas' ? 0 : task.type === 'Duración fija' ? 1 : 2}</Type><IsNull>0</IsNull><CreateDate>${fmtDateTime(projectStart)}</CreateDate><WBS>${phase.id}.${task.id}</WBS><OutlineNumber>${phase.id}.${task.id}</OutlineNumber><OutlineLevel>2</OutlineLevel><Start>${fmtDateTime(task.startDate)}</Start><Finish>${fmtDateTime(task.finishDate, 18)}</Finish><Duration>PT${task.duration * 8}H0M0S</Duration><Work>PT${Math.max(task.workHours, 1)}H0M0S</Work><Milestone>${task.milestone ? 1 : 0}</Milestone><Summary>0</Summary><Critical>${task.critical ? 1 : 0}</Critical><Notes>${xmlEscape(task.deliverable)}</Notes>${task.preds.map((pred) => `<PredecessorLink><PredecessorUID>${taskById.get(pred).xmlUid}</PredecessorUID><Type>1</Type><CrossProject>0</CrossProject><LinkLag>0</LinkLag><LagFormat>7</LagFormat></PredecessorLink>`).join('')}</Task>`);
      uid++;
    }
  }

  const resourceXml = resources.map((resource) => `<Resource><UID>${resource.id}</UID><ID>${resource.id}</ID><Name>${xmlEscape(resource.name)}</Name><Type>${resource.rate ? 1 : 0}</Type><Initials>${xmlEscape(resource.initials)}</Initials><Group>${xmlEscape(resource.type)}</Group><MaxUnits>1</MaxUnits><StandardRate>${resource.rate || 0}</StandardRate><CostPerUse>${resource.cost || 0}</CostPerUse><Notes>${xmlEscape(`${resource.role}. ${resource.notes}`)}</Notes></Resource>`).join('');
  const assignmentXml = tasks.flatMap((task) => task.resources.map(([resourceId, hours]) => `<Assignment><UID>${task.id * 100 + resourceId}</UID><TaskUID>${task.xmlUid}</TaskUID><ResourceUID>${resourceId}</ResourceUID><Units>1</Units><Work>PT${typeof hours === 'number' ? Math.max(hours, 1) : 1}H0M0S</Work></Assignment>`)).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="http://schemas.microsoft.com/project">
<Name>Proyecto software equipos - ${tasks.length} tareas</Name><Title>Proyecto software equipos - ProjectLibre</Title><Company>Plan académico profesional</Company><ScheduleFromStart>1</ScheduleFromStart><StartDate>${fmtDateTime(projectStart)}</StartDate><FinishDate>${fmtDateTime(projectEnd, 18)}</FinishDate><CalendarUID>1</CalendarUID><DefaultStartTime>09:00:00</DefaultStartTime><DefaultFinishTime>18:00:00</DefaultFinishTime><MinutesPerDay>480</MinutesPerDay><MinutesPerWeek>2400</MinutesPerWeek><DaysPerMonth>20</DaysPerMonth><CurrencyCode>MXN</CurrencyCode><CurrencySymbol>$</CurrencySymbol>
<Tasks>${taskXml.join('')}</Tasks>
<Resources>${resourceXml}</Resources>
<Assignments>${assignmentXml}</Assignments>
</Project>`;
}

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, 'tareas_projectlibre.csv'), taskCsv(), 'utf8');
await writeFile(path.join(outDir, 'recursos_projectlibre.csv'), resourceCsv(), 'utf8');
await writeFile(path.join(outDir, 'reporte_proyecto_software.md'), markdownReport(), 'utf8');
await writeFile(path.join(outDir, 'reporte_gantt_projectlibre.html'), htmlReport(), 'utf8');
await writeFile(path.join(outDir, 'proyecto_software_projectlibre.xml'), projectXml(), 'utf8');
await writeFile(path.join(outDir, 'proyecto_software_projectlibre_tmp0.xml'), projectXml(), 'utf8');

try {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.goto(`file://${path.join(outDir, 'reporte_gantt_projectlibre.html').replaceAll('\\', '/')}`, { waitUntil: 'load' });
  await page.pdf({ path: path.join(outDir, 'reporte_gantt_projectlibre.pdf'), format: 'A4', landscape: true, printBackground: true });
  await browser.close();
  console.log(`PDF generado: ${path.join(outDir, 'reporte_gantt_projectlibre.pdf')}`);
} catch (error) {
  console.warn(`No se pudo generar PDF automáticamente: ${error.message}`);
}

console.log(`Archivos generados en ${outDir}`);
console.log(`Costo total recomendado: ${mxn.format(total)}`);
