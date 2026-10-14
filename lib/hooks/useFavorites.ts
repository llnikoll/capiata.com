"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { addFavorite, getFavorites, removeFavorite } from "@/lib/supabase/queries";
import { toErrorMessage } from "@/lib/supabase/errors";
import { useAuthUser } from "./useAuthUser";
import type { Listing } from "@/lib/types";

export interface UseFavoritesResult {
  /** Publicaciones guardadas por el usuario (con datos completos). */
  favorites: Listing[];
  favoriteIds: string[];
  loading: boolean;
  error: string | null;
  isFavorite: (listingId: string) => boolean;
  toggleFavorite: (listingId: string) => Promise<void>;
  reload: () => void;
}

/**
 * Favoritos persistidos en Supabase (tabla public.favorites) para el usuario
 * autenticado. Requiere sesión: sin usuario la lista queda vacía y el toggle
 * es un no-op controlado por la interfaz.
 */
export function useFavorites(): UseFavoritesResult {
  const { user, loading: authLoading } = useAuthUser();
  const [favorites, setFavorites] = useState<Listing[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      setFavoriteIds([]);
      setLoading(authLoading);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const rows = await getFavorites(supabase, user.id);
      const listings = rows
        .map((row) => row.listing)
        .filter((listing): listing is Listing => Boolean(listing));

      setFavorites(listings);
      setFavoriteIds(rows.map((row) => row.listing_id));
      setError(null);
    } catch (loadError) {
      setError(toErrorMessage(loadError, "No pudimos cargar tus favoritos."));
    } finally {
      setLoading(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleFavorite = useCallback(
    async (listingId: string) => {
      if (!user) return;

      const isCurrentlyFavorite = favoriteIds.includes(listingId);

      // Actualización optimista: la interfaz responde al instante.
      setFavoriteIds((prev) =>
        isCurrentlyFavorite ? prev.filter((id) => id !== listingId) : [...prev, listingId]
      );
      if (isCurrentlyFavorite) {
        setFavorites((prev) => prev.filter((listing) => listing.id !== listingId));
      }

      try {
        const supabase = createClient();
        if (isCurrentlyFavorite) {
          await removeFavorite(supabase, user.id, listingId);
        } else {
          await addFavorite(supabase, user.id, listingId);
          await load();
        }
        setError(null);
      } catch (toggleError) {
        setError(toErrorMessage(toggleError, "No pudimos actualizar el favorito."));
        await load();
      }
    },
    [user, favoriteIds, load]
  );

  return {
    favorites,
    favoriteIds,
    loading,
    error,
    isFavorite: (listingId: string) => favoriteIds.includes(listingId),
    toggleFavorite,
    reload: () => {
      void load();
    },
  };
}
