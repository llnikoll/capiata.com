"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getBusinesses } from "@/lib/supabase/queries";
import { toErrorMessage } from "@/lib/supabase/errors";
import type { Business } from "@/lib/types";

let businessChannelCounter = 0;

/**
 * Comercios/emprendimientos con datos reales de Supabase y actualización en
 * tiempo real cuando alguien registra o edita su comercio.
 */
export function useBusinesses(options?: { limit?: number; realtime?: boolean }) {
  const limit = options?.limit ?? 60;
  const realtime = options?.realtime ?? true;

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      const supabase = createClient();
      const data = await getBusinesses(supabase, { limit });
      if (requestId !== requestIdRef.current) return;
      setBusinesses(data);
      setError(null);
    } catch (loadError) {
      if (requestId !== requestIdRef.current) return;
      setError(toErrorMessage(loadError, "No pudimos cargar los comercios."));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!realtime) return;

    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    try {
      const supabase = createClient();
      businessChannelCounter += 1;

      channel = supabase
        .channel(`businesses-feed-${businessChannelCounter}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "businesses" },
          () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => void load(), 350);
          }
        )
        .subscribe();
    } catch {
      // Realtime opcional: la carga inicial ya mostró los datos.
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (channel) {
        const supabase = createClient();
        void supabase.removeChannel(channel);
      }
    };
  }, [realtime, load]);

  return { businesses, loading, error, reload: () => void load() };
}
