"use client";

import React, { createContext, useContext } from "react";
import { useFavorites } from "@/lib/hooks/useFavorites";
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
 * Carga los favoritos una sola vez por sesión y los comparte con todas las
 * tarjetas del feed, para que el corazón funcione desde explorar, home,
 * categoría, barrio y perfil sin esperar permisos por página.
 */
export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { user } = useAuthUser();

  return (
    <FavoritesContext.Provider
      value={{ isFavorite, toggleFavorite, hasUser: Boolean(user) }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavoritesContext(): FavoritesContextValue {
  return useContext(FavoritesContext);
}
