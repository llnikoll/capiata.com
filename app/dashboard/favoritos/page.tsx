"use client";

import React from "react";
import Link from "next/link";
import { useFavorites } from "@/lib/hooks/useFavorites";
import { ListingCard } from "@/components/listings/ListingCard";
import { Heart, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { EmptyState, ListingGridSkeleton } from "@/components/ui/EmptyState";

export default function FavoritosPage() {
  const { favorites, toggleFavorite, isFavorite, loading, error, reload } = useFavorites();

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs space-y-2">
        <div className="flex items-center gap-2 text-red-500 font-bold text-xs uppercase tracking-wider">
          <Heart className="w-4 h-4 fill-red-500" /> Mis Anuncios Favoritos
        </div>
        <h1 className="text-2xl font-black text-gray-900">Publicaciones Guardadas</h1>
        <p className="text-xs text-gray-500">
          Acá se listan los productos, servicios y pedidos que marcaste con el corazón ♡. Se guardan en tu cuenta.
        </p>
      </div>

      {error && (
        <Alert variant="error" onRetry={reload}>
          {error}
        </Alert>
      )}

      {loading ? (
        <ListingGridSkeleton count={3} />
      ) : favorites.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onFavoriteToggle={toggleFavorite}
              isFavorite={isFavorite(listing.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Heart className="w-12 h-12" />}
          title="No tenés anuncios guardados en favoritos"
          description="Explorá la comunidad y presioná el botón ♡ para guardar lo que te interese."
          action={
            <Link href="/explorar">
              <Button variant="primary" leftIcon={<Search className="w-4 h-4" />}>
                Explorar Anuncios
              </Button>
            </Link>
          }
        />
      )}
    </div>
  );
}
