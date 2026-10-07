"use client";

import React from "react";
import { useFavorites } from "@/lib/hooks/useFavorites";
import { MOCK_LISTINGS } from "@/lib/mock-data";
import { ListingCard } from "@/components/listings/ListingCard";
import { Heart, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default function FavoritosPage() {
  const { favoriteIds, toggleFavorite, isFavorite } = useFavorites();

  // If no stored favorites yet, show mock sample or empty state
  const favoriteListings = MOCK_LISTINGS.filter(
    (item) => favoriteIds.includes(item.id) || favoriteIds.length === 0
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs space-y-2">
        <div className="flex items-center gap-2 text-red-500 font-bold text-xs uppercase tracking-wider">
          <Heart className="w-4 h-4 fill-red-500" /> Mis Anuncios Favoritos
        </div>
        <h1 className="text-2xl font-black text-gray-900">
          Publicaciones Guardadas
        </h1>
        <p className="text-xs text-gray-500">
          Acá se listan los productos, servicios y pedidos que marcaste con el corazón ♡.
        </p>
      </div>

      {favoriteListings.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {favoriteListings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onFavoriteToggle={toggleFavorite}
              isFavorite={isFavorite(listing.id) || true}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center space-y-4">
          <Heart className="w-12 h-12 text-gray-300 mx-auto" />
          <h3 className="font-bold text-gray-800 text-lg">
            No tenés anuncios guardados en favoritos
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Explorá la comunidad y presioná el botón ♡ para guardar lo que te interese.
          </p>
          <Link href="/explorar">
            <Button variant="primary" leftIcon={<Search className="w-4 h-4" />}>
              Explorar Anuncios
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
