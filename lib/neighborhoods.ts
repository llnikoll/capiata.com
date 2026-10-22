import slugify from "slugify";
import { CAPIATA_NEIGHBORHOODS } from "@/lib/types";

export interface NeighborhoodOption {
  slug: string;
  name: string;
}

/**
 * Barrios de Capiatá con su slug para las URLs amigables (/barrio/posta-ybycua).
 * Se deriva de la lista canónica para que el nombre real viaje siempre igual.
 */
export const NEIGHBORHOODS: NeighborhoodOption[] = CAPIATA_NEIGHBORHOODS.map((name) => ({
  slug: slugify(name, { lower: true, strict: true }),
  name,
}));

export function getNeighborhoodBySlug(slug: string): NeighborhoodOption | null {
  return NEIGHBORHOODS.find((neighborhood) => neighborhood.slug === slug) ?? null;
}
