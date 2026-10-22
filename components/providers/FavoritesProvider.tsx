"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { addFavorite, getFavoriteIds, removeFavorite } from "@/lib/supabase/queries";
import { useAuthUser } from "@/lib/hooks/useAuthUser";

interface FavoritesContextValue {
  isFavorite: (listingId: string) => boolean;
  toggleFavorite: (listingId: string) => Promise<void>;
  hasUser: boolean;
}

const FavoritesContext = createContext<FavoritesContextValue>({
  isFavorite: () => false,
  toggleFavorite: async () => undefined,
  hasUser: false,
});

/**
 * Comparte los IDs de favoritos con todas las tarjetas del feed. Sólo trae
 * `listing_id` (nada de publicaciones completas) y se carga una vez por sesión.
 */
export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuthUser();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  React.useEffect(() => {
    let active = true;

    if (user) {
      (async () => {
        const ids = await getFavoriteIds(createClient(), user.id).catch(() => []);
        if (active) setFavoriteIds(ids);
      })();
    } else if (!authLoading) {
      setFavoriteIds([]);
    }

    return () => {
      active = false;
    };
  }, [user, authLoading]);

  const toggleFavorite = useCallback(
    async (listingId: string) => {
      if (!user) return;
      setFavoriteIds((current) =>
        current.includes(listingId)
          ? current.filter((id) => id !== listingId)
          : [...current, listingId]
      );
      try {
        const supabase = createClient();
        if (favoriteIds.includes(listingId)) {
          await removeFavorite(supabase, user.id, listingId);
        } else {
          await addFavorite(supabase, user.id, listingId);
        }
      } catch {
        // Sin errores en pantalla para no interrumpir el feed; el estado se
        // reconcilia con la próxima navegación.
        setFavoriteIds(await getFavoriteIds(createClient(), user.id).catch(() => []));
      }
    },
    [user, favoriteIds]
  );

  return (
    <FavoritesContext.Provider
      value={{
        isFavorite: (listingId) => favoriteIds.includes(listingId),
        toggleFavorite,
        hasUser: Boolean(user),
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavoritesContext(): FavoritesContextValue {
  return useContext(FavoritesContext);
}
