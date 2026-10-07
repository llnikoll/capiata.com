export type ListingType = "OFFER" | "REQUEST";
export type ListingStatus = "active" | "paused" | "deleted" | "pending";
export type UserType = "person" | "business";
export type ReportReason =
  | "scam"
  | "fake"
  | "prohibited"
  | "spam"
  | "offensive"
  | "wrong"
  | "other";

export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
  city: string;
  neighborhood: string | null;
  user_type: UserType;
  is_verified: boolean;
  is_blocked: boolean;
  created_at: string;
}

export interface Business {
  id: string;
  user_id: string;
  business_name: string;
  logo_url: string | null;
  description: string | null;
  category: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  schedule: string | null;
  social_links: {
    facebook?: string;
    instagram?: string;
    website?: string;
  } | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color?: string;
  description?: string;
  is_active: boolean;
  listing_count: number;
}

export interface ListingImage {
  id: string;
  listing_id: string;
  image_url: string;
  position: number;
}

export interface Listing {
  id: string;
  user_id: string;
  business_id?: string | null;
  type: ListingType;
  category_id: string;
  category?: Category;
  profile?: Profile;
  business?: Business;
  title: string;
  slug: string;
  description: string;
  price: number | null;
  currency: string;
  location: string;
  neighborhood: string | null;
  contact_whatsapp: string | null;
  contact_phone: string | null;
  contact_method: string[];
  status: ListingStatus;
  views_count: number;
  created_at: string;
  updated_at: string;
  images?: ListingImage[];
}

export interface Favorite {
  id: string;
  user_id: string;
  listing_id: string;
  created_at: string;
  listing?: Listing;
}

export interface Report {
  id: string;
  reporter_id: string;
  listing_id: string;
  reason: ReportReason;
  description: string | null;
  status: "pending" | "reviewed" | "resolved";
  created_at: string;
}

// Capiatá Neighborhoods (Barrios de Capiatá)
export const CAPIATA_NEIGHBORHOODS = [
  "Centro",
  "Posta Ybycuá",
  "Posta Ybyraró",
  "Ruta 1 - Km 16",
  "Ruta 1 - Km 18",
  "Ruta 1 - Km 20",
  "Ruta 2 - Km 15",
  "Ruta 2 - Km 17",
  "Ruta 2 - Km 19",
  "Ruta 2 - Km 21",
  "Aldana Cañada",
  "Campo Verde",
  "Candelaria",
  "San Roque",
  "San Juan",
  "Costa Salinas",
  "Loma Clavel",
  "Naranjaty",
  "Toledo Cañada",
  "Urucuty",
  "Villa Virginia",
  "Otros barrios",
] as const;

// Categorías predefinidas para Capiatá Conecta
export const DEFAULT_CATEGORIES: Array<{
  name: string;
  slug: string;
  icon: string;
  color: string;
  description: string;
}> = [
  {
    name: "Servicios Técnicos y Oficios",
    slug: "servicios-tecnicos",
    icon: "Wrench",
    color: "#1E3A5F",
    description: "Electricidad, plomería, mecánica, reparaciones y soporte técnico",
  },
  {
    name: "Construcción y Hogar",
    slug: "construccion-hogar",
    icon: "Home",
    color: "#D97706",
    description: "Materiales, albañilería, pintura, fletes, muebles y jardinería",
  },
  {
    name: "Gastronomía y Comidas",
    slug: "gastronomia-comidas",
    icon: "Utensils",
    color: "#DC2626",
    description: "Rotiserías, bocaditos, tortas, minutas y catering para eventos",
  },
  {
    name: "Moda y Calzados",
    slug: "moda-calzados",
    icon: "ShoppingBag",
    color: "#EC4899",
    description: "Ropa, calzados, accesorios, confección y arreglos",
  },
  {
    name: "Electrónica y Celulares",
    slug: "electronica-celulares",
    icon: "Smartphone",
    color: "#2563EB",
    description: "Celulares, computadoras, accesorios y servicio de reparación",
  },
  {
    name: "Vehículos y Motos",
    slug: "vehiculos-motos",
    icon: "Car",
    color: "#059669",
    description: "Autos, motos, repuestos, talleres y mantenimiento",
  },
  {
    name: "Salud y Belleza",
    slug: "salud-belleza",
    icon: "Heart",
    color: "#8B5CF6",
    description: "Peluquería, barbería, manicura, farmacia y cuidado personal",
  },
  {
    name: "Educación y Clases",
    slug: "educacion-clases",
    icon: "GraduationCap",
    color: "#0284C7",
    description: "Tutorías escolares, cursos particulares, idiomas y talleres",
  },
  {
    name: "Inmuebles y Alquileres",
    slug: "inmuebles-alquileres",
    icon: "Building",
    color: "#4B5563",
    description: "Casas, terrenos, departamentos, salones comerciales y alquileres",
  },
  {
    name: "Empleos y Trabajo",
    slug: "empleos-trabajo",
    icon: "Briefcase",
    color: "#15803D",
    description: "Ofertas laborales, personas buscando empleo y trabajos temporales",
  },
  {
    name: "Mascotas y Animales",
    slug: "mascotas-animales",
    icon: "Dog",
    color: "#F59E0B",
    description: "Veterinarias, alimentos, accesorios, peluquería canina y adopción",
  },
  {
    name: "Eventos y Fiestas",
    slug: "eventos-fiestas",
    icon: "PartyPopper",
    color: "#9333EA",
    description: "Decoración, alquiler de sillas/mesas, sonido, animación e inflables",
  },
  {
    name: "Deportes y Hobbies",
    slug: "deportes-hobbies",
    icon: "Dumbbell",
    color: "#06B6D4",
    description: "Bicicletas, equipos deportivos, instrumentos musicales y artesanías",
  },
  {
    name: "Varios y Ocasión",
    slug: "varios-ocasion",
    icon: "Tag",
    color: "#64748B",
    description: "Artículos variados, usados en buen estado y oportunidad",
  },
];
