import { MetadataRoute } from "next";
import { createPublicClient } from "@/lib/supabase/public";
import { getCategories, getListings } from "@/lib/supabase/queries";

/**
 * Sitemap dinámico: categorías y publicaciones activas reales de Supabase.
 * Si la base no responde, se devuelven igual las rutas estáticas para no
 * romper el build ni servir un sitemap vacío.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://capiata.com";

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "always",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/explorar`,
      lastModified: new Date(),
      changeFrequency: "always",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/emprendedores`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/crear-publicacion`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/registro`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ];

  try {
    const supabase = createPublicClient();
    const [categories, listings] = await Promise.all([
      getCategories(supabase),
      getListings(supabase, { limit: 500, sort: "newest" }),
    ]);

    const categoryRoutes: MetadataRoute.Sitemap = categories.map((category) => ({
      url: `${baseUrl}/explorar?categoria=${category.slug}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    }));

    const listingRoutes: MetadataRoute.Sitemap = listings.map((listing) => ({
      url: `${baseUrl}/publicacion/${listing.slug}`,
      lastModified: new Date(listing.updated_at || listing.created_at),
      changeFrequency: "weekly",
      priority: 0.9,
    }));

    return [...staticRoutes, ...categoryRoutes, ...listingRoutes];
  } catch {
    return staticRoutes;
  }
}
