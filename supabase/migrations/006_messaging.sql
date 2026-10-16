-- ============================================================================
-- Migration: 006_messaging.sql
-- Capiatá Conecta — mensajería interna entre usuarios
--
-- Ejecutar completo en el SQL Editor de Supabase. Es idempotente.
--
-- Contenido:
--   1. Tablas conversations y messages
--   2. Trigger que mantiene conversations.last_message_at
--   3. RLS: sólo los participantes leen y escriben sus conversaciones
--   4. RPC my_unread_counts() para los contadores de no leídos
--   5. Realtime para los mensajes nuevos
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. TABLAS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  -- Nombres de FK explícitos: PostgREST los usa para incrustar los perfiles.
  participant_a UUID NOT NULL
    CONSTRAINT conversations_participant_a_fkey REFERENCES public.profiles(id) ON DELETE CASCADE,
  participant_b UUID NOT NULL
    CONSTRAINT conversations_participant_b_fkey REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT conversations_distinct_participants CHECK (participant_a <> participant_b)
);

-- Un solo hilo por publicación y par de personas (sin importar el orden).
CREATE UNIQUE INDEX IF NOT EXISTS conversations_pair_listing_idx
  ON public.conversations (
    COALESCE(listing_id, '00000000-0000-0000-0000-000000000000'::uuid),
    LEAST(participant_a, participant_b),
    GREATEST(participant_a, participant_b)
  );

CREATE INDEX IF NOT EXISTS conversations_participant_a_idx
  ON public.conversations (participant_a, last_message_at DESC);
CREATE INDEX IF NOT EXISTS conversations_participant_b_idx
  ON public.conversations (participant_b, last_message_at DESC);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(btrim(content)) BETWEEN 1 AND 2000),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_conversation_created_idx
  ON public.messages (conversation_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 2. TRIGGER: mantiene la fecha del último mensaje
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.messages_touch_conversation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_touch_conversation ON public.messages;
CREATE TRIGGER messages_touch_conversation
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.messages_touch_conversation();

-- ---------------------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Conversaciones: sólo los participantes.
DROP POLICY IF EXISTS "Participants read their conversations" ON public.conversations;
CREATE POLICY "Participants read their conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (auth.uid() IN (participant_a, participant_b));

DROP POLICY IF EXISTS "Users start conversations they participate in" ON public.conversations;
CREATE POLICY "Users start conversations they participate in"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IN (participant_a, participant_b)
    AND NOT public.is_blocked()
    AND participant_a <> participant_b
    AND (
      listing_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.listings l
        WHERE l.id = listing_id AND l.status <> 'deleted'
      )
    )
  );

DROP POLICY IF EXISTS "Participants update their conversations" ON public.conversations;
CREATE POLICY "Participants update their conversations"
  ON public.conversations FOR UPDATE TO authenticated
  USING (auth.uid() IN (participant_a, participant_b))
  WITH CHECK (auth.uid() IN (participant_a, participant_b));

-- Mensajes: sólo los participantes del hilo.
DROP POLICY IF EXISTS "Participants read messages" ON public.messages;
CREATE POLICY "Participants read messages"
  ON public.messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND auth.uid() IN (c.participant_a, c.participant_b)
    )
  );

DROP POLICY IF EXISTS "Participants send messages" ON public.messages;
CREATE POLICY "Participants send messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND NOT public.is_blocked()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND auth.uid() IN (c.participant_a, c.participant_b)
    )
  );

-- Marcar como leídos sólo los mensajes recibidos (nunca los propios).
DROP POLICY IF EXISTS "Recipients mark messages as read" ON public.messages;
CREATE POLICY "Recipients mark messages as read"
  ON public.messages FOR UPDATE TO authenticated
  USING (
    sender_id <> auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND auth.uid() IN (c.participant_a, c.participant_b)
    )
  )
  WITH CHECK (sender_id <> auth.uid());

-- ---------------------------------------------------------------------------
-- 4. CONTADOR DE NO LEÍDOS
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_unread_counts()
RETURNS TABLE (conversation_id UUID, unread BIGINT)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT m.conversation_id, count(*)::bigint AS unread
  FROM public.messages m
  JOIN public.conversations c ON c.id = m.conversation_id
  WHERE auth.uid() IN (c.participant_a, c.participant_b)
    AND m.sender_id <> auth.uid()
    AND NOT m.is_read
  GROUP BY m.conversation_id;
$$;

GRANT EXECUTE ON FUNCTION public.my_unread_counts() TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. REALTIME
-- ---------------------------------------------------------------------------
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END;
$$;

NOTIFY pgrst, 'reload schema';
