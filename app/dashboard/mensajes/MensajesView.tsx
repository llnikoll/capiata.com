"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  MessageSquare,
  Send,
  ChevronLeft,
  Loader2,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { useConversations } from "@/lib/hooks/useConversations";
import { useMessages } from "@/lib/hooks/useMessages";
import { useAuthUser } from "@/lib/hooks/useAuthUser";
import { Avatar } from "@/components/ui/Avatar";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { cn, formatRelativeDate } from "@/lib/utils";
import type { ConversationSummary } from "@/lib/types";

function participantName(summary: ConversationSummary): string {
  return (
    summary.otherParticipant?.full_name ||
    summary.otherParticipant?.username ||
    "Usuario de Capiatá"
  );
}

export function MensajesView() {
  const searchParams = useSearchParams();
  const { user } = useAuthUser();

  const [activeId, setActiveId] = useState<string | null>(searchParams.get("c"));
  const [draft, setDraft] = useState("");

  const {
    summaries,
    loading,
    error,
    reload: reloadInbox,
  } = useConversations();
  const {
    messages,
    loading: loadingMessages,
    sending,
    error: messagesError,
    send,
    reload: reloadThread,
  } = useMessages(activeId);

  const active = useMemo(
    () => summaries.find((summary) => summary.conversation.id === activeId) ?? null,
    [summaries, activeId]
  );

  // Si no hay conversación seleccionada (o el id de la URL no es mía), abrimos la primera.
  useEffect(() => {
    if (loading || summaries.length === 0) return;
    if (activeId && summaries.some((summary) => summary.conversation.id === activeId)) return;
    setActiveId(summaries[0].conversation.id);
  }, [activeId, summaries, loading]);

  // Mantenemos la URL compartible sin recargar la página.
  useEffect(() => {
    const url = activeId ? `/dashboard/mensajes?c=${activeId}` : "/dashboard/mensajes";
    window.history.replaceState(null, "", url);
  }, [activeId]);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.trim() || sending) return;
    const ok = await send(draft);
    if (ok) setDraft("");
  };

  if (loading) {
    return (
      <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center text-sm text-gray-500">
        Cargando tus conversaciones...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#1E3A5F] font-bold text-xs uppercase tracking-wider">
            <MessageSquare className="w-4 h-4" /> Mensajería
          </div>
          <h1 className="text-2xl font-black text-gray-900">Mis mensajes</h1>
          <p className="text-xs text-gray-500">
            Conversaciones con otros vecinos y emprendedores de Capiatá, sin salir de la plataforma.
          </p>
        </div>
        <button
          type="button"
          onClick={reloadInbox}
          className="text-xs font-bold text-gray-500 hover:text-gray-800 flex items-center gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </button>
      </div>

      {error && (
        <Alert variant="error" onRetry={reloadInbox}>
          {error}
        </Alert>
      )}

      {summaries.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="w-12 h-12" />}
          title="Todavía no tenés conversaciones"
          description="Cuando escribas a alguien desde una publicación (o te escriban a vos), la conversación aparece acá."
          action={
            <Link href="/explorar">
              <Button variant="primary">Explorar publicaciones</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Bandeja */}
          <div
            className={cn(
              "lg:col-span-4 bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden",
              activeId && "hidden lg:block"
            )}
          >
            <div className="divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
              {summaries.map((summary) => {
                const isActive = summary.conversation.id === activeId;
                return (
                  <button
                    key={summary.conversation.id}
                    type="button"
                    onClick={() => setActiveId(summary.conversation.id)}
                    className={cn(
                      "w-full text-left p-4 flex gap-3 transition-colors",
                      isActive ? "bg-blue-50/70" : "hover:bg-gray-50"
                    )}
                  >
                    <Avatar
                      src={summary.otherParticipant?.avatar_url}
                      name={participantName(summary)}
                      size="md"
                    />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-gray-900 truncate">
                          {participantName(summary)}
                        </span>
                        {summary.unreadCount > 0 && (
                          <span className="shrink-0 text-[10px] font-bold bg-[#F5B800] text-gray-950 rounded-full px-1.5 py-0.5">
                            {summary.unreadCount}
                          </span>
                        )}
                      </div>
                      {summary.conversation.listing?.title && (
                        <p className="text-[11px] text-[#1E3A5F] font-semibold truncate">
                          {summary.conversation.listing.title}
                        </p>
                      )}
                      <p className="text-[11px] text-gray-500 truncate">
                        {summary.lastMessage?.content ?? "Conversación iniciada"}
                      </p>
                      <p className="text-[10px] text-gray-400" suppressHydrationWarning>
                        {formatRelativeDate(summary.conversation.last_message_at)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hilo */}
          <div
            className={cn(
              "lg:col-span-8 bg-white rounded-3xl border border-gray-100 shadow-xs flex flex-col min-h-[60vh]",
              !activeId && "hidden lg:flex"
            )}
          >
            {active ? (
              <>
                <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveId(null)}
                    className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                    aria-label="Volver a la bandeja"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <Avatar
                    src={active.otherParticipant?.avatar_url}
                    name={participantName(active)}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {participantName(active)}
                    </p>
                    {active.otherParticipant?.username && (
                      <Link
                        href={`/usuario/${active.otherParticipant.username}`}
                        className="text-[11px] text-[#1E3A5F] font-semibold hover:underline"
                      >
                        Ver perfil público
                      </Link>
                    )}
                  </div>
                  {active.conversation.listing?.slug && (
                    <Link
                      href={`/publicacion/${active.conversation.listing.slug}`}
                      className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-[#1E3A5F] hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Ver publicación
                    </Link>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[55vh] bg-gray-50/40">
                  {loadingMessages ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="text-center text-xs text-gray-400 py-8">
                      Todavía no hay mensajes. Escribí el primero para empezar la conversación.
                    </p>
                  ) : (
                    messages.map((message) => {
                      const mine = message.sender_id === user?.id;
                      return (
                        <div
                          key={message.id}
                          className={cn("flex", mine ? "justify-end" : "justify-start")}
                        >
                          <div
                            className={cn(
                              "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-line break-words",
                              mine
                                ? "bg-[#1E3A5F] text-white rounded-br-sm"
                                : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm"
                            )}
                          >
                            {message.content}
                            <div
                              className={cn(
                                "text-[10px] mt-1",
                                mine ? "text-white/60" : "text-gray-400"
                              )}
                              suppressHydrationWarning
                            >
                              {formatRelativeDate(message.created_at)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {messagesError && (
                  <div className="px-4 pt-3">
                    <Alert variant="error" onRetry={reloadThread}>
                      {messagesError}
                    </Alert>
                  </div>
                )}

                <form onSubmit={handleSend} className="p-4 border-t border-gray-100 flex gap-2">
                  <textarea
                    rows={1}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void handleSend(event);
                      }
                    }}
                    placeholder="Escribí un mensaje..."
                    maxLength={2000}
                    className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={sending}
                    disabled={!draft.trim() || sending}
                    leftIcon={<Send className="w-4 h-4" />}
                  >
                    Enviar
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-xs text-gray-400">
                Elegí una conversación para ver los mensajes.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
