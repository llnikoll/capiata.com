-- ============================================================================
-- Migration: 008_security_hardening.sql
-- Capiatá Conecta — endurecimiento de funciones expuestas a anon
--
-- Ejecutar completo en el SQL Editor de Supabase. Es idempotente.
--
-- Contenido:
--   1. increment_views(): fija search_path y sólo cuenta publicaciones activas
--   2. Topes anti-abuso por usuario (publicaciones, mensajes, reportes)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. increment_views
-- ---------------------------------------------------------------------------
-- Antes: SECURITY DEFINER sin search_path y sin filtrar estado; cualquiera
-- podía inflar el contador de cualquier publicación (incluidas las borradas).
CREATE OR REPLACE FUNCTION public.increment_views(listing_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.listings AS l
  SET views_count = COALESCE(l.views_count, 0) + 1
  WHERE l.id = increment_views.listing_id
    AND l.status = 'active';
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_views(UUID) TO authenticated, anon;

-- ---------------------------------------------------------------------------
-- 2. TOPES ANTI-ABUSO
-- ---------------------------------------------------------------------------
-- Límites generosos para uso normal; cortan el spam automatizado por cuenta.
-- Si algún día hacen falta límites más finos, mover a un rate limiter dedicado.
CREATE OR REPLACE FUNCTION public.enforce_user_quotas()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW; -- SQL Editor / service role
  END IF;

  IF TG_TABLE_NAME = 'listings' THEN
    SELECT count(*) INTO v_recent
    FROM public.listings
    WHERE user_id = auth.uid() AND created_at > NOW() - INTERVAL '1 hour';

    IF v_recent >= 10 THEN
      RAISE EXCEPTION 'Alcanzaste el máximo de 10 publicaciones por hora. Probá más tarde.'
        USING ERRCODE = 'check_violation';
    END IF;

  ELSIF TG_TABLE_NAME = 'messages' THEN
    SELECT count(*) INTO v_recent
    FROM public.messages
    WHERE sender_id = auth.uid() AND created_at > NOW() - INTERVAL '1 minute';

    IF v_recent >= 20 THEN
      RAISE EXCEPTION 'Estás enviando mensajes demasiado rápido. Esperá un momento.'
        USING ERRCODE = 'check_violation';
    END IF;

  ELSIF TG_TABLE_NAME = 'reports' THEN
    SELECT count(*) INTO v_recent
    FROM public.reports
    WHERE reporter_id = auth.uid() AND created_at > NOW() - INTERVAL '1 hour';

    IF v_recent >= 5 THEN
      RAISE EXCEPTION 'Ya enviaste varios reportes en la última hora. Gracias por avisar.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS listings_enforce_user_quotas ON public.listings;
CREATE TRIGGER listings_enforce_user_quotas
  BEFORE INSERT ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_user_quotas();

DROP TRIGGER IF EXISTS messages_enforce_user_quotas ON public.messages;
CREATE TRIGGER messages_enforce_user_quotas
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_user_quotas();

DROP TRIGGER IF EXISTS reports_enforce_user_quotas ON public.reports;
CREATE TRIGGER reports_enforce_user_quotas
  BEFORE INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.enforce_user_quotas();

NOTIFY pgrst, 'reload schema';
