export interface LocalServiceArea {
  slug: string;
  name: string;
  searchName: string;
  priority: 1 | 2 | 3;
}

export const LOCAL_SERVICE_AREAS: LocalServiceArea[] = [
  {
    slug: "cancun-centro",
    name: "Cancún Centro",
    searchName: "Cancún Centro",
    priority: 1,
  },
  {
    slug: "zona-hotelera",
    name: "Zona Hotelera",
    searchName: "Zona Hotelera Cancún",
    priority: 1,
  },
  {
    slug: "bonampak",
    name: "Bonampak",
    searchName: "Avenida Bonampak Cancún",
    priority: 2,
  },
  {
    slug: "kabah",
    name: "Kabah",
    searchName: "Avenida Kabah Cancún",
    priority: 2,
  },
  {
    slug: "huayacan",
    name: "Huayacán",
    searchName: "Avenida Huayacán Cancún",
    priority: 2,
  },
  {
    slug: "plaza-las-americas",
    name: "Plaza Las Americas",
    searchName: "Plaza Las Americas Cancún",
    priority: 3,
  },
];

export function getPrimaryLocalServiceAreas(limit = 4) {
  return LOCAL_SERVICE_AREAS.filter((area) => area.priority <= 2).slice(
    0,
    limit,
  );
}
