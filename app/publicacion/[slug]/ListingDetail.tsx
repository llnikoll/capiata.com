import React from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getListingBySlug, getRelatedListings } from "@/lib/supabase/queries";
import { ListingJsonLd } from "@/components/seo/JsonLd";
import { ListingDetailView } from "./ListingDetailView";

/**
 * Contenido de la publicación. Se resuelve en tiempo de petición porque depende
 * de `params` y de datos vivos de Supabase (dentro del límite de Suspense del page).
 */
export async function ListingDetail({ slug }: { slug: string }) {
  const supabase = await createClient();
  const listing = await getListingBySlug(supabase, slug);

  if (!listing) {
    notFound();
  }

  const related = await getRelatedListings(supabase, {
    categoryId: listing.category_id,
    excludeListingId: listing.id,
    limit: 3,
  });

  return (
    <>
      <ListingJsonLd listing={listing} />
      <ListingDetailView listing={listing} related={related} />
    </>
  );
}

export function ListingDetailSkeleton() {
  return (
    <div className="py-8 bg-gray-50/50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="bg-white rounded-3xl border border-gray-100 shadow-md overflow-hidden grid grid-cols-1 md:grid-cols-12">
          <div className="md:col-span-6 h-72 md:h-[450px] bg-gray-200 animate-pulse" />
          <div className="md:col-span-6 p-8 space-y-4">
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            <div className="h-8 w-3/4 bg-gray-200 rounded animate-pulse" />
            <div className="h-12 w-40 bg-gray-200 rounded animate-pulse" />
            <div className="h-24 w-full bg-gray-200 rounded animate-pulse" />
            <div className="h-12 w-full bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
