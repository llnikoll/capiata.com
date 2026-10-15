import React, { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, MapPin, Tag } from "lucide-react";
import { createPublicClient } from "@/lib/supabase/public";
import { getCategories, getListings } from "@/lib/supabase/queries";
import { ListingCollectionGrid } from "@/components/listings/ListingCollectionGrid";
import { CollectionJsonLd } from "@/components/seo/JsonLd";
import { ListingGridSkeleton } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { NEIGHBORHOODS, getNeighborhoodBySlug } from "@/lib/neighborhoods";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://capiata.com";
const LIMIT = 48;

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ categoria?: string }>;
}

/**
 * Página indexable por barrio: /barrio/posta-ybycua
 * Admite el filtro opcional ?categoria=slug para la combinación
 * "categoría en barrio" (se marca noindex si tiene pocas publicaciones).
 */
export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const { categoria } = await searchParams;
    const neighborhood = getNeighborhoodBySlug(slug);
    if (!neighborhood) {
      return { title: "Barrio no encontrado", robots: { index: false, follow: false } };
    }

    const supabase = createPublicClient();
    const categories = await getCategories(supabase);
    const category = categoria
      ? (categories.find((item) => item.slug === categoria) ?? null)
      : null;

    const listings = await getListings(supabase, {
      neighborhood: neighborhood.name,
      categorySlug: category?.slug,
      limit: LIMIT,
    });

    const title = category
      ? `${category.name} en ${neighborhood.name}, Capiatá`
      : `Publicaciones en ${neighborhood.name}, Capiatá`;

    const description = category
      ? `${listings.length} publicación(es) de ${category.name.toLowerCase()} en ${neighborhood.name}. Ofertas y pedidos de vecinos de Capiatá con contacto directo.`
      : `Ofertas y pedidos publicados por vecinos de ${neighborhood.name}, Capiatá. Servicios, productos y trabajos con contacto directo por WhatsApp.`;

    const canonical = `${SITE_URL}/barrio/${slug}${category ? `?categoria=${category.slug}` : ""}`;

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: { title, description, url: canonical, type: "website", locale: "es_PY" },
      robots:
        category && listings.length < 3
          ? { index: false, follow: true }
          : { index: true, follow: true },
    };
  } catch {
    return {};
  }
}

export default function BarrioPage({ params, searchParams }: PageProps) {
  return (
    <Suspense fallback={<CollectionSkeleton />}>
      <BarrioContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function BarrioContent({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { categoria } = await searchParams;

  const neighborhood = getNeighborhoodBySlug(slug);
  if (!neighborhood) {
    notFound();
  }

  const supabase = createPublicClient();

  const [categories, listings] = await Promise.all([
    getCategories(supabase),
    getListings(supabase, { neighborhood: neighborhood.name, limit: LIMIT }),
  ]);

  const activeCategory = categoria
    ? (categories.find((item) => item.slug === categoria) ?? null)
    : null;

  const visibleListings = activeCategory
    ? listings.filter((listing) => listing.category_id === activeCategory.id)
    : listings;

  // Categorías que realmente tienen publicaciones en este barrio.
  const categoriesWithListings = categories.filter((category) =>
    listings.some((listing) => listing.category_id === category.id)
  );

  const canonical = `${SITE_URL}/barrio/${slug}${
    activeCategory ? `?categoria=${activeCategory.slug}` : ""
  }`;

  return (
    <div className="py-8 bg-gray-50/50 min-h-screen">
      <CollectionJsonLd
        name={
          activeCategory
            ? `${activeCategory.name} en ${neighborhood.name}, Capiatá`
            : `Publicaciones en ${neighborhood.name}, Capiatá`
        }
        description={`Ofertas y pedidos de vecinos de ${neighborhood.name}, Capiatá.`}
        url={canonical}
        items={visibleListings.map((listing) => ({
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
          {activeCategory ? (
            <>
              <Link href={`/barrio/${slug}`} className="hover:text-[#1E3A5F] font-semibold">
                {neighborhood.name}
              </Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-gray-700 font-semibold">{activeCategory.name}</span>
            </>
          ) : (
            <span className="text-gray-700 font-semibold">{neighborhood.name}</span>
          )}
        </nav>

        {/* Encabezado */}
        <header className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs space-y-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-[#D4A000] text-xs font-bold">
            <MapPin className="w-3.5 h-3.5" /> Barrio de Capiatá
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
            {activeCategory
              ? `${activeCategory.name} en ${neighborhood.name}`
              : `Publicaciones en ${neighborhood.name}`}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 max-w-3xl leading-relaxed">
            {visibleListings.length > 0
              ? `Hay ${visibleListings.length} publicación(es) de vecinos y emprendedores de ${neighborhood.name}.`
              : `Todavía no hay publicaciones en ${neighborhood.name}.`}{" "}
            El contacto es directo por WhatsApp, sin comisiones ni intermediarios.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Link href={`/explorar?barrio=${encodeURIComponent(neighborhood.name)}`}>
              <Button variant="outline" size="sm">
                Ver con filtros y ordenamiento
              </Button>
            </Link>
            <Link href="/crear-publicacion?tipo=OFFER">
              <Button variant="accent" size="sm">
                Publicar en este barrio
              </Button>
            </Link>
            {activeCategory && (
              <Link href={`/categoria/${activeCategory.slug}`}>
                <Button variant="ghost" size="sm">
                  Todo {activeCategory.name}
                </Button>
              </Link>
            )}
          </div>
        </header>

        <ListingCollectionGrid
          listings={visibleListings}
          emptyTitle={
            activeCategory
              ? `Sin publicaciones de ${activeCategory.name} en ${neighborhood.name}`
              : `Sin publicaciones en ${neighborhood.name}`
          }
          emptyDescription="Sé el primero en publicar en este barrio y aparecé acá. Es gratis y el contacto es directo por WhatsApp."
          emptyActionHref="/crear-publicacion?tipo=OFFER"
          emptyActionLabel="Publicar gratis"
        />

        {/* Categorías con contenido en este barrio (enlaces con datos reales) */}
        {categoriesWithListings.length > 0 && (
          <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-[#1E3A5F]" /> Qué se publica en {neighborhood.name}
            </h2>
            <div className="flex flex-wrap gap-2">
              {categoriesWithListings.map((category) => (
                <Link
                  key={category.slug}
                  href={`/barrio/${slug}?categoria=${category.slug}`}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 hover:border-[#1E3A5F] hover:text-[#1E3A5F] transition-colors"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Otros barrios */}
        <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-gray-900">Otros barrios de Capiatá</h2>
          <div className="flex flex-wrap gap-2">
            {NEIGHBORHOODS.filter((option) => option.slug !== slug).map((option) => (
              <Link
                key={option.slug}
                href={`/barrio/${option.slug}`}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 hover:border-[#1E3A5F] hover:text-[#1E3A5F] transition-colors"
              >
                {option.name}
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
