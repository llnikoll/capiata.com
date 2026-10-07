import { MetadataRoute } from "next";
import { DEFAULT_CATEGORIES } from "@/lib/types";
import { MOCK_LISTINGS } from "@/lib/mock-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://capiata.com";

  // Dynamic category routes
  const categoryRoutes: MetadataRoute.Sitemap = DEFAULT_CATEGORIES.map((cat) => ({
    url: `${baseUrl}/categoria/${cat.slug}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  // Dynamic listing detail routes
  const listingRoutes: MetadataRoute.Sitemap = MOCK_LISTINGS.map((listing) => ({
    url: `${baseUrl}/publicacion/${listing.slug}`,
    lastModified: new Date(listing.updated_at || listing.created_at),
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  // Static main pages
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

  return [...staticRoutes, ...categoryRoutes, ...listingRoutes];
}
