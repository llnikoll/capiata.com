"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCategories } from "@/lib/supabase/queries";
import { toErrorMessage } from "@/lib/supabase/errors";
import { DEFAULT_CATEGORIES, type Category } from "@/lib/types";

export interface CategoryOption {
  id?: string;
  name: string;
  slug: string;
  icon: string;
  color?: string;
  description?: string;
  listing_count?: number;
}

/** Taxonomía de respaldo: sólo se usa si la tabla `categories` no responde. */
const FALLBACK_CATEGORIES: CategoryOption[] = DEFAULT_CATEGORIES.map((category) => ({
  name: category.name,
  slug: category.slug,
  icon: category.icon,
  color: category.color,
  description: category.description,
}));

/**
 * Categorías activas desde Supabase. Si la consulta falla se informa el error y
 * se mantiene la taxonomía por defecto para no romper la navegación del sitio.
 */
export function useCategories() {
  const [categories, setCategories] = useState<CategoryOption[]>(FALLBACK_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const data = await getCategories(supabase);
      const mapped: CategoryOption[] = (data as Category[]).map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        icon: category.icon,
        color: category.color,
        description: category.description,
        listing_count: category.listing_count,
      }));

      if (mapped.length > 0) {
        setCategories(mapped);
        setUsingFallback(false);
      } else {
        setCategories(FALLBACK_CATEGORIES);
        setUsingFallback(true);
      }
      setError(null);
    } catch (loadError) {
      setCategories(FALLBACK_CATEGORIES);
      setUsingFallback(true);
      setError(toErrorMessage(loadError, "No pudimos cargar las categorías."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    categories,
    loading,
    error,
    usingFallback,
    reload: () => {
      void load();
    },
  };
}
