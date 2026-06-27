export interface LocalServiceArea {
  slug: string;
  name: string;
  searchName: string;
  priority: 1 | 2 | 3;
}

export const LOCAL_SERVICE_AREAS: LocalServiceArea[] = [
  {
    slug: "cancun-centro",
    name: "Cancun Centro",
    searchName: "Cancun Centro",
    priority: 1,
  },
  {
    slug: "zona-hotelera",
    name: "Zona Hotelera",
    searchName: "Zona Hotelera Cancun",
    priority: 1,
  },
  {
    slug: "bonampak",
    name: "Bonampak",
    searchName: "Avenida Bonampak Cancun",
    priority: 2,
  },
  {
    slug: "kabah",
    name: "Kabah",
    searchName: "Avenida Kabah Cancun",
    priority: 2,
  },
  {
    slug: "huayacan",
    name: "Huayacan",
    searchName: "Avenida Huayacan Cancun",
    priority: 2,
  },
  {
    slug: "plaza-las-americas",
    name: "Plaza Las Americas",
    searchName: "Plaza Las Americas Cancun",
    priority: 3,
  },
];

export function getPrimaryLocalServiceAreas(limit = 4) {
  return LOCAL_SERVICE_AREAS.filter((area) => area.priority <= 2).slice(
    0,
    limit,
  );
}
