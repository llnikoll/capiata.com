import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseQueryError } from "./errors";
import type {
  Conversation,
  ConversationSummary,
  Message,
  Profile,
} from "@/lib/types";

/**
 * Mensajería interna entre usuarios.
 *
 * Todas las operaciones pasan por RLS: sólo los dos participantes de una
 * conversación pueden leerla y escribir en ella (migración 006).
 */

const CONVERSATION_SELECT =
  "id, listing_id, participant_a, participant_b, last_message_at, created_at, " +
  "listing:listings(id, title, slug, type, images:listing_images(id, listing_id, image_url, position))";

const MESSAGE_SELECT = "id, conversation_id, sender_id, content, is_read, created_at";

type OtherParticipant = Pick<Profile, "id" | "username" | "full_name" | "avatar_url">;

function fail(message: string, error: unknown): never {
  if (error instanceof SupabaseQueryError) throw error;
  const detail =
    error && typeof error === "object" && "message" in error
      ? ` [${(error as { code?: string }).code ?? ""} ${(error as { message?: string }).message ?? ""}]`.trim()
      : "";
  throw new SupabaseQueryError(`${message}${detail}`, error);
}

/** Ordena el par de participantes igual que el índice único de la base. */
function orderPair(userA: string, userB: string): [string, string] {
  return userA < userB ? [userA, userB] : [userB, userA];
}

export async function getConversations(
  supabase: SupabaseClient,
  userId: string
): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select(CONVERSATION_SELECT)
    .or(`participant_a.eq.${userId},participant_b.eq.${userId}`)
    .order("last_message_at", { ascending: false })
    .limit(100);

  if (error) fail("No pudimos cargar tus conversaciones.", error);

  const conversations = (data ?? []) as unknown as Conversation[];
  return conversations.map((conversation) => {
    if (conversation.listing?.images?.length) {
      conversation.listing.images = [...conversation.listing.images].sort(
        (a, b) => (a.position ?? 0) - (b.position ?? 0)
      );
    }
    return conversation;
  });
}

export async function getProfilesByIds(
  supabase: SupabaseClient,
  ids: string[]
): Promise<OtherParticipant[]> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .in("id", unique);

  if (error) fail("No pudimos cargar los perfiles de las conversaciones.", error);
  return (data ?? []) as unknown as OtherParticipant[];
}

/** Últimos mensajes de cada conversación (una sola consulta, se agrupa en memoria). */
export async function getMessagesByConversations(
  supabase: SupabaseClient,
  conversationIds: string[],
  limit = 200
): Promise<Message[]> {
  if (conversationIds.length === 0) return [];

  const { data, error } = await supabase
    .from("messages")
    .select(MESSAGE_SELECT)
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) fail("No pudimos cargar los últimos mensajes.", error);
  return (data ?? []) as unknown as Message[];
}

/** No leídos por conversación, calculado en la base con agrupación. */
export async function getUnreadCounts(
  supabase: SupabaseClient
): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc("my_unread_counts");

  if (error) fail("No pudimos calcular los mensajes sin leer.", error);

  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as Array<{ conversation_id: string; unread: number }>) {
    counts[row.conversation_id] = Number(row.unread);
  }
  return counts;
}

/** Resumen listo para la bandeja de entrada. */
export async function getConversationSummaries(
  supabase: SupabaseClient,
  userId: string
): Promise<ConversationSummary[]> {
  const conversations = await getConversations(supabase, userId);
  if (conversations.length === 0) return [];

  const ids = conversations.map((conversation) => conversation.id);
  const otherIds = conversations.map((conversation) =>
    conversation.participant_a === userId ? conversation.participant_b : conversation.participant_a
  );

  const [messages, profiles, unread] = await Promise.all([
    getMessagesByConversations(supabase, ids),
    getProfilesByIds(supabase, otherIds),
    getUnreadCounts(supabase),
  ]);

  const lastByConversation = new Map<string, Message>();
  for (const message of messages) {
    if (!lastByConversation.has(message.conversation_id)) {
      lastByConversation.set(message.conversation_id, message);
    }
  }

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

  return conversations.map((conversation) => {
    const otherId =
      conversation.participant_a === userId ? conversation.participant_b : conversation.participant_a;

    return {
      conversation,
      otherParticipant: profileById.get(otherId) ?? null,
      lastMessage: lastByConversation.get(conversation.id) ?? null,
      unreadCount: unread[conversation.id] ?? 0,
    };
  });
}

export async function getMessages(
  supabase: SupabaseClient,
  conversationId: string,
  limit = 200
): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select(MESSAGE_SELECT)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) fail("No pudimos cargar los mensajes.", error);
  return (data ?? []) as unknown as Message[];
}

/**
 * Devuelve el id del hilo entre dos usuarios para una publicación,
 * creándolo si todavía no existe.
 */
export async function startConversation(
  supabase: SupabaseClient,
  input: { listingId: string | null; currentUserId: string; otherUserId: string }
): Promise<string> {
  if (input.currentUserId === input.otherUserId) {
    throw new SupabaseQueryError("No podés iniciar una conversación con vos mismo.");
  }

  const [a, b] = orderPair(input.currentUserId, input.otherUserId);

  let existingQuery = supabase
    .from("conversations")
    .select("id")
    .eq("participant_a", a)
    .eq("participant_b", b);

  existingQuery = input.listingId
    ? existingQuery.eq("listing_id", input.listingId)
    : existingQuery.is("listing_id", null);

  const { data: existing, error: findError } = await existingQuery.limit(1).maybeSingle();

  if (findError) fail("No pudimos comprobar si ya existe la conversación.", findError);
  if (existing?.id) return existing.id;

  const { data: created, error: insertError } = await supabase
    .from("conversations")
    .insert({
      listing_id: input.listingId,
      participant_a: a,
      participant_b: b,
    })
    .select("id")
    .single();

  if (insertError) fail("No pudimos iniciar la conversación.", insertError);
  return created.id;
}

export async function sendMessage(
  supabase: SupabaseClient,
  input: { conversationId: string; senderId: string; content: string }
): Promise<Message> {
  const content = input.content.trim();

  if (!content) {
    throw new SupabaseQueryError("El mensaje no puede estar vacío.");
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: input.conversationId,
      sender_id: input.senderId,
      content: content.slice(0, 2000),
    })
    .select(MESSAGE_SELECT)
    .single();

  if (error) fail("No pudimos enviar el mensaje.", error);
  return data as unknown as Message;
}

/** Marca como leídos los mensajes recibidos en la conversación. */
export async function markConversationRead(
  supabase: SupabaseClient,
  input: { conversationId: string; userId: string }
): Promise<void> {
  const { error } = await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("conversation_id", input.conversationId)
    .eq("is_read", false)
    .neq("sender_id", input.userId);

  if (error) fail("No pudimos marcar los mensajes como leídos.", error);
}
