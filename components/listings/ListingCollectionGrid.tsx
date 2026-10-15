import React from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { ListingCard } from "@/components/listings/ListingCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import type { Listing } from "@/lib/types";

interface ListingCollectionGridProps {
  listings: Listing[];
  emptyTitle: string;
  emptyDescription: string;
  emptyActionHref?: string;
  emptyActionLabel?: string;
}

/** Grilla de publicaciones para las páginas de colección (categoría / barrio). */
export const ListingCollectionGrid: React.FC<ListingCollectionGridProps> = ({
  listings,
  emptyTitle,
  emptyDescription,
  emptyActionHref = "/crear-publicacion",
  emptyActionLabel = "Publicar gratis",
}) => {
  if (listings.length === 0) {
    return (
      <EmptyState
        icon={<Search className="w-12 h-12" />}
        title={emptyTitle}
        description={emptyDescription}
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link href={emptyActionHref}>
              <Button variant="accent">{emptyActionLabel}</Button>
            </Link>
            <Link href="/explorar">
              <Button variant="outline">Ver todas las publicaciones</Button>
            </Link>
          </div>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
};
