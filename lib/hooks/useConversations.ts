"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getConversationSummaries } from "@/lib/supabase/messaging";
import { toErrorMessage } from "@/lib/supabase/errors";
import { useAuthUser } from "./useAuthUser";
import type { ConversationSummary } from "@/lib/types";

let channelCounter = 0;

export interface UseConversationsResult {
  summaries: ConversationSummary[];
  loading: boolean;
  error: string | null;
  totalUnread: number;
  reload: () => void;
}

/**
 * Bandeja de entrada del usuario con actualización en tiempo real:
 * cualquier mensaje nuevo (propio o recibido) reordena y actualiza la lista.
 */
export function useConversations(): UseConversationsResult {
  const { user, loading: authLoading } = useAuthUser();
  const [summaries, setSummaries] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    if (!user) {
      setSummaries([]);
      setLoading(authLoading);
      return;
    }

    const requestId = ++requestIdRef.current;

    try {
      const supabase = createClient();
      const data = await getConversationSummaries(supabase, user.id);
      if (requestId !== requestIdRef.current) return;
      setSummaries(data);
      setError(null);
    } catch (loadError) {
      if (requestId !== requestIdRef.current) return;
      setError(toErrorMessage(loadError, "No pudimos cargar tus conversaciones."));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!user) return;

    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const scheduleReload = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (!cancelled) void load();
      }, 400);
    };

    try {
      const supabase = createClient();
      channelCounter += 1;

      channel = supabase
        .channel(`messaging-inbox-${channelCounter}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "messages" },
          scheduleReload
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "conversations" },
          scheduleReload
        )
        .subscribe();
    } catch {
      // Sin Realtime la bandeja sigue funcionando con la carga inicial.
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (channel) {
        try {
          void createClient().removeChannel(channel);
        } catch {
          /* noop */
        }
      }
    };
  }, [user, load]);

  return {
    summaries,
    loading,
    error,
    totalUnread: summaries.reduce((total, item) => total + item.unreadCount, 0),
    reload: () => {
      void load();
    },
  };
}
