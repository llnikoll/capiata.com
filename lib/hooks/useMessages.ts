"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getMessages, markConversationRead, sendMessage } from "@/lib/supabase/messaging";
import { toErrorMessage } from "@/lib/supabase/errors";
import { useAuthUser } from "./useAuthUser";
import type { Message } from "@/lib/types";

let channelCounter = 0;

/** Agrega sin duplicar (el mensaje puede llegar por respuesta y por Realtime). */
function mergeMessage(current: Message[], incoming: Message): Message[] {
  if (current.some((message) => message.id === incoming.id)) return current;

  return [...current, incoming].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

export interface UseMessagesResult {
  messages: Message[];
  loading: boolean;
  sending: boolean;
  error: string | null;
  send: (content: string) => Promise<boolean>;
  reload: () => void;
}

/** Mensajes de una conversación, con Realtime y marcado de leídos. */
export function useMessages(conversationId: string | null): UseMessagesResult {
  const { user } = useAuthUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(Boolean(conversationId));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markRead = useCallback(async () => {
    if (!conversationId || !user) return;
    try {
      const supabase = createClient();
      await markConversationRead(supabase, { conversationId, userId: user.id });
    } catch {
      // El marcado de leído no debe romper la lectura.
    }
  }, [conversationId, user]);

  const load = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const data = await getMessages(supabase, conversationId);
      setMessages(data);
      setError(null);
      void markRead();
    } catch (loadError) {
      setError(toErrorMessage(loadError, "No pudimos cargar los mensajes."));
    } finally {
      setLoading(false);
    }
  }, [conversationId, markRead]);

  useEffect(() => {
    void load();
  }, [load]);

  // Realtime limitado a esta conversación.
  useEffect(() => {
    if (!conversationId) return;

    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;

    try {
      const supabase = createClient();
      channelCounter += 1;

      channel = supabase
        .channel(`conversation-${channelCounter}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const incoming = payload.new as Message;
            setMessages((current) => mergeMessage(current, incoming));
            if (incoming.sender_id !== user?.id) void markRead();
          }
        )
        .subscribe();
    } catch {
      // Sin Realtime el hilo se actualiza al recargar.
    }

    return () => {
      if (channel) {
        try {
          void createClient().removeChannel(channel);
        } catch {
          /* noop */
        }
      }
    };
  }, [conversationId, user, markRead]);

  const send = useCallback(
    async (content: string): Promise<boolean> => {
      if (!conversationId || !user) return false;

      const trimmed = content.trim();
      if (!trimmed) return false;

      setSending(true);
      setError(null);

      try {
        const supabase = createClient();
        const created = await sendMessage(supabase, {
          conversationId,
          senderId: user.id,
          content: trimmed,
        });
        setMessages((current) => mergeMessage(current, created));
        return true;
      } catch (sendError) {
        setError(toErrorMessage(sendError, "No pudimos enviar el mensaje."));
        return false;
      } finally {
        setSending(false);
      }
    },
    [conversationId, user]
  );

  return {
    messages,
    loading,
    sending,
    error,
    send,
    reload: () => {
      void load();
    },
  };
}
