import { MetadataRoute } from "next";
import { createPublicClient } from "@/lib/supabase/public";
import { getCategories, getListings, getStoreUsernames } from "@/lib/supabase/queries";
import { NEIGHBORHOODS } from "@/lib/neighborhoods";

/**
 * Sitemap dinámico: categorías, barrios y publicaciones activas reales de Supabase.
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

  // Los barrios son una lista fija: siempre se pueden indexar.
  const barrioRoutes: MetadataRoute.Sitemap = NEIGHBORHOODS.map((neighborhood) => ({
    url: `${baseUrl}/barrio/${neighborhood.slug}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.7,
  }));

  try {
    const supabase = createPublicClient();
    const [categories, listings, storeUsernames] = await Promise.all([
      getCategories(supabase),
      getListings(supabase, { limit: 500, sort: "newest" }),
      getStoreUsernames(supabase),
    ]);

    const categoryRoutes: MetadataRoute.Sitemap = categories.map((category) => ({
      url: `${baseUrl}/categoria/${category.slug}`,
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

    const storeRoutes: MetadataRoute.Sitemap = storeUsernames.map((username) => ({
      url: `${baseUrl}/tienda/${username}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    return [
      ...staticRoutes,
      ...categoryRoutes,
      ...barrioRoutes,
      ...listingRoutes,
      ...storeRoutes,
    ];
  } catch {
    return [...staticRoutes, ...barrioRoutes];
  }
}
