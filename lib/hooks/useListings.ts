"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getListings, type ListingQueryOptions } from "@/lib/supabase/queries";
import { toErrorMessage } from "@/lib/supabase/errors";
import type { Listing } from "@/lib/types";

export interface UseListingsResult {
  listings: Listing[];
  /** Primera carga (todavía no hay datos en pantalla). */
  loading: boolean;
  /** Recarga en curso con datos ya visibles. */
  refreshing: boolean;
  error: string | null;
  /** `true` cuando el canal de Realtime está conectado. */
  live: boolean;
  reload: () => void;
}

let channelCounter = 0;

/**
 * Carga publicaciones desde Supabase y las mantiene sincronizadas en tiempo real.
 *
 * El feed es de acceso universal: cualquier visitante (registrado o no) recibe
 * los cambios porque la suscripción usa la clave anónima y las políticas RLS
 * permiten leer publicaciones activas, perfiles e imágenes en forma pública.
 */
export function useListings(
  options: ListingQueryOptions = {},
  config: { realtime?: boolean } = {}
): UseListingsResult {
  const realtime = config.realtime ?? true;
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  const optionsKey = useMemo(() => JSON.stringify(options), [options]);
  const requestIdRef = useRef(0);
  const hasLoadedRef = useRef(false);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    if (hasLoadedRef.current) {
      setRefreshing(true);
    }

    try {
      const supabase = createClient();
      const data = await getListings(supabase, JSON.parse(optionsKey) as ListingQueryOptions);

      // Ignoramos respuestas de peticiones obsoletas.
      if (requestId !== requestIdRef.current) return;

      setListings(data);
      setError(null);
    } catch (loadError) {
      if (requestId !== requestIdRef.current) return;
      setError(toErrorMessage(loadError, "No pudimos cargar las publicaciones."));
    } finally {
      if (requestId === requestIdRef.current) {
        hasLoadedRef.current = true;
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [optionsKey]);

  useEffect(() => {
    void load();
  }, [load]);

  // Suscripción a cambios en tiempo real (INSERT/UPDATE/DELETE).
  useEffect(() => {
    if (!realtime) return;

    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const scheduleReload = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (!cancelled) void load();
      }, 350);
    };

    try {
      const supabase = createClient();
      channelCounter += 1;

      channel = supabase
        .channel(`listings-feed-${channelCounter}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "listings" }, scheduleReload)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "listing_images" },
          scheduleReload
        )
        .subscribe((status) => {
          if (cancelled) return;
          setLive(status === "SUBSCRIBED");
        });
    } catch {
      // Sin Realtime el feed sigue funcionando con la carga inicial.
      setLive(false);
    }

    return () => {
      cancelled = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      if (channel) {
        const supabase = createClient();
        void supabase.removeChannel(channel);
      }
      setLive(false);
    };
  }, [realtime, load]);

  return {
    listings,
    loading,
    refreshing,
    error,
    live,
    reload: () => {
      void load();
    },
  };
}
