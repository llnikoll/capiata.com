"use client";

import { useMemo, useSyncExternalStore } from "react";

const FAVORITES_STORAGE_KEY = "capiata_favorites_ids";
const FAVORITES_CHANGED_EVENT = "capiata:favorites-changed";

function readStoredFavorites() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function getSnapshot() {
  return JSON.stringify(readStoredFavorites());
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(FAVORITES_CHANGED_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(FAVORITES_CHANGED_EVENT, callback);
  };
}

export function useFavorites() {
  const favoriteSnapshot = useSyncExternalStore(subscribe, getSnapshot, () => "[]");
  const favoriteIds = useMemo<string[]>(() => JSON.parse(favoriteSnapshot), [favoriteSnapshot]);

  const toggleFavorite = (id: string) => {
    const current = readStoredFavorites();
    const exists = current.includes(id);
    const next = exists ? current.filter((item: string) => item !== id) : [...current, id];

    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(FAVORITES_CHANGED_EVENT));
    } catch {
      // Ignorar
    }
  };

  const isFavorite = (id: string) => favoriteIds.includes(id);

  return { favoriteIds, toggleFavorite, isFavorite, isLoaded: true };
}
