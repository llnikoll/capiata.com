import React, { Suspense } from "react";
import type { Metadata } from "next";
import { createPublicClient } from "@/lib/supabase/public";
import { getListingBySlug } from "@/lib/supabase/queries";
import { ListingDetail, ListingDetailSkeleton } from "./ListingDetail";

interface PageProps {
  params: Promise<{ slug: string }>;
}

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://capiata.com";

/**
 * Metadatos por publicación. No usa cookies ni la sesión del visitante, por lo
 * que puede cachearse y compartirse entre usuarios.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const listing = await getListingBySlug(createPublicClient(), slug);
    if (!listing) {
      return { title: "Publicación no encontrada", robots: { index: false, follow: false } };
    }

    return {
      title: listing.title,
      description: listing.description.slice(0, 160),
      alternates: { canonical: `${SITE_URL}/publicacion/${listing.slug}` },
      openGraph: {
        title: listing.title,
        description: listing.description.slice(0, 160),
        url: `${SITE_URL}/publicacion/${listing.slug}`,
        type: "article",
        locale: "es_PY",
      },
      // La imagen de la vista previa la genera app/publicacion/[slug]/opengraph-image.tsx
      // con los datos reales: título, precio, barrio y la foto de la publicación.
      twitter: {
        card: "summary_large_image",
        title: listing.title,
        description: listing.description.slice(0, 160),
      },
      robots: { index: true, follow: true },
    };
  } catch {
    return {};
  }
}

/**
 * El detalle depende de `params` y de datos vivos, así que el contenido se
 * transmite desde un límite de Suspense: el shell estático se sirve al instante
 * y la publicación llega por streaming. Cualquier visitante (con o sin cuenta)
 * puede verla.
 */
export default function ListingDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={<ListingDetailSkeleton />}>
      <ListingDetailContent params={params} />
    </Suspense>
  );
}

async function ListingDetailContent({ params }: PageProps) {
  const { slug } = await params;
  return <ListingDetail slug={slug} />;
}
