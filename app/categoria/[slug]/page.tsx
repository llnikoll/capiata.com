import React, { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, MapPin, Tag } from "lucide-react";
import { createPublicClient } from "@/lib/supabase/public";
import { getCategories, getCategoryBySlug, getListings } from "@/lib/supabase/queries";
import { ListingCollectionGrid } from "@/components/listings/ListingCollectionGrid";
import { CollectionJsonLd } from "@/components/seo/JsonLd";
import { ListingGridSkeleton } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { NEIGHBORHOODS, getNeighborhoodBySlug } from "@/lib/neighborhoods";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://capiata.com";
const LIMIT = 48;

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ barrio?: string }>;
}

/**
 * Página indexable por categoría: /categoria/servicios-tecnicos
 * Admite el filtro opcional ?barrio=slug para la combinación
 * "categoría en barrio" (se marca noindex si tiene pocas publicaciones).
 */
export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const { barrio } = await searchParams;
    const supabase = createPublicClient();
    const category = await getCategoryBySlug(supabase, slug);
    if (!category) {
      return { title: "Categoría no encontrada", robots: { index: false, follow: false } };
    }

    const neighborhood = barrio ? getNeighborhoodBySlug(barrio) : null;
    const listings = await getListings(supabase, {
      categorySlug: slug,
      neighborhood: neighborhood?.name,
      limit: LIMIT,
    });

    const title = neighborhood
      ? `${category.name} en ${neighborhood.name}, Capiatá`
      : `${category.name} en Capiatá`;

    const description = neighborhood
      ? `${listings.length} publicación(es) de ${category.name.toLowerCase()} en ${neighborhood.name}, Capiatá. Contactá directo por WhatsApp, sin comisiones.`
      : `${category.description ?? category.name}. Publicaciones de vecinos y emprendedores de Capiatá: ofertas y pedidos con contacto directo por WhatsApp.`;

    const canonical = `${SITE_URL}/categoria/${slug}${neighborhood ? `?barrio=${barrio}` : ""}`;

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: { title, description, url: canonical, type: "website", locale: "es_PY" },
      // Las combinaciones con poco contenido no se indexan (evita páginas vacías).
      robots:
        neighborhood && listings.length < 3
          ? { index: false, follow: true }
          : { index: true, follow: true },
    };
  } catch {
    return {};
  }
}

export default function CategoriaPage({ params, searchParams }: PageProps) {
  return (
    <Suspense fallback={<CollectionSkeleton />}>
      <CategoriaContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function CategoriaContent({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { barrio } = await searchParams;

  const supabase = createPublicClient();
  const category = await getCategoryBySlug(supabase, slug);

  if (!category) {
    notFound();
  }

  const neighborhood = barrio ? getNeighborhoodBySlug(barrio) : null;

  const [listings, categories] = await Promise.all([
    getListings(supabase, {
      categorySlug: slug,
      neighborhood: neighborhood?.name,
      limit: LIMIT,
    }),
    getCategories(supabase),
  ]);

  const canonical = `${SITE_URL}/categoria/${slug}${neighborhood ? `?barrio=${barrio}` : ""}`;

  return (
    <div className="py-8 bg-gray-50/50 min-h-screen">
      <CollectionJsonLd
        name={
          neighborhood
            ? `${category.name} en ${neighborhood.name}, Capiatá`
            : `${category.name} en Capiatá`
        }
        description={category.description ?? category.name}
        url={canonical}
        items={listings.map((listing) => ({
          name: listing.title,
          url: `${SITE_URL}/publicacion/${listing.slug}`,
        }))}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Migas de pan */}
        <nav className="flex flex-wrap items-center gap-1 text-xs text-gray-500">
          <Link href="/" className="hover:text-[#1E3A5F] font-semibold">
            Inicio
          </Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/explorar" className="hover:text-[#1E3A5F] font-semibold">
            Explorar
          </Link>
          <ChevronRight className="w-3 h-3" />
          {neighborhood ? (
            <>
              <Link href={`/categoria/${slug}`} className="hover:text-[#1E3A5F] font-semibold">
                {category.name}
              </Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-gray-700 font-semibold">{neighborhood.name}</span>
            </>
          ) : (
            <span className="text-gray-700 font-semibold">{category.name}</span>
          )}
        </nav>

        {/* Encabezado */}
        <header className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs space-y-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-[#1E3A5F] text-xs font-bold">
            <Tag className="w-3.5 h-3.5" /> Categoría
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
            {neighborhood ? `${category.name} en ${neighborhood.name}` : category.name}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 max-w-3xl leading-relaxed">
            {category.description ? `${category.description}. ` : ""}
            {listings.length > 0
              ? `Hay ${listings.length} publicación(es) disponibles`
              : "Todavía no hay publicaciones"}
            {neighborhood ? ` en ${neighborhood.name}, Capiatá` : " en Capiatá"}. El contacto es
            directo por WhatsApp, sin comisiones ni intermediarios.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Link href={`/explorar?categoria=${slug}`}>
              <Button variant="outline" size="sm">
                Ver con filtros y ordenamiento
              </Button>
            </Link>
            <Link href={`/crear-publicacion?tipo=OFFER`}>
              <Button variant="accent" size="sm">
                Publicar en esta categoría
              </Button>
            </Link>
            {neighborhood && (
              <Link href={`/barrio/${neighborhood.slug}`}>
                <Button variant="ghost" size="sm">
                  Todo {neighborhood.name}
                </Button>
              </Link>
            )}
          </div>
        </header>

        <ListingCollectionGrid
          listings={listings}
          emptyTitle={
            neighborhood
              ? `Sin publicaciones de ${category.name} en ${neighborhood.name}`
              : `Sin publicaciones en ${category.name}`
          }
          emptyDescription="Sé el primero en publicar en esta categoría y aparecé acá. Es gratis y el contacto es directo por WhatsApp."
          emptyActionHref="/crear-publicacion?tipo=OFFER"
          emptyActionLabel="Publicar gratis"
        />

        {/* Enlaces internos: barrios de Capiatá */}
        <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-[#F5B800]" /> {category.name} por barrio
          </h2>
          <div className="flex flex-wrap gap-2">
            {NEIGHBORHOODS.map((option) => (
              <Link
                key={option.slug}
                href={`/categoria/${slug}?barrio=${option.slug}`}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 hover:border-[#1E3A5F] hover:text-[#1E3A5F] transition-colors"
              >
                {option.name}
              </Link>
            ))}
          </div>
        </section>

        {/* Enlaces internos: otras categorías */}
        <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-gray-900">Otras categorías</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {categories
              .filter((item) => item.slug !== slug)
              .map((item) => (
                <Link
                  key={item.slug}
                  href={`/categoria/${item.slug}`}
                  className="text-xs font-semibold px-3 py-2 rounded-xl bg-gray-50 border border-gray-100 text-gray-700 hover:border-[#1E3A5F] hover:text-[#1E3A5F] transition-colors"
                >
                  {item.name}
                  {item.listing_count > 0 && (
                    <span className="text-gray-500 font-normal"> · {item.listing_count}</span>
                  )}
                </Link>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function CollectionSkeleton() {
  return (
    <div className="py-8 bg-gray-50/50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="h-4 w-56 bg-gray-200 rounded animate-pulse" />
        <div className="h-40 bg-gray-200 rounded-3xl animate-pulse" />
        <ListingGridSkeleton count={6} />
      </div>
    </div>
  );
}
