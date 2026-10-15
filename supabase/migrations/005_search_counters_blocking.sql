-- ============================================================================
-- Migration: 005_search_counters_blocking.sql
-- Capiatá Conecta — búsqueda sin tildes, contadores de categoría y bloqueo real
--
-- Ejecutar completo en el SQL Editor de Supabase. Es idempotente.
--
-- Contenido:
--   1. Búsqueda insensible a tildes y mayúsculas (columna search_text + índice)
--   2. Contador de publicaciones activas por categoría (trigger + backfill)
--   3. Bloqueo efectivo de usuarios en las políticas de escritura
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. BÚSQUEDA SIN TILDES
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- `unaccent()` depende del diccionario de la base, por lo que no es IMMUTABLE y
-- no puede indexarse directamente. Este envoltorio sí lo es (patrón habitual).
CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
  SELECT public.unaccent('public.unaccent', $1);
$$;

-- Texto normalizado (minúsculas y sin tildes) de cada publicación.
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS search_text TEXT;

CREATE OR REPLACE FUNCTION public.listings_set_search_text()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_text := lower(
    public.immutable_unaccent(
      coalesce(NEW.title, '') || ' ' || coalesce(NEW.description, '')
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS listings_set_search_text ON public.listings;
CREATE TRIGGER listings_set_search_text
  BEFORE INSERT OR UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.listings_set_search_text();

-- Rellenamos las filas existentes (el trigger recalcula en cada UPDATE).
UPDATE public.listings
SET search_text = lower(
  public.immutable_unaccent(coalesce(title, '') || ' ' || coalesce(description, ''))
);

CREATE INDEX IF NOT EXISTS listings_search_text_trgm_idx
  ON public.listings USING gin (search_text gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- 2. CONTADOR DE PUBLICACIONES ACTIVAS POR CATEGORÍA
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_category_listing_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  IF TG_OP <> 'INSERT' THEN
    v_ids := v_ids || OLD.category_id;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    v_ids := v_ids || NEW.category_id;
  END IF;

  UPDATE public.categories c
  SET listing_count = sub.total
  FROM (
    SELECT c2.id, count(l.id) AS total
    FROM public.categories c2
    LEFT JOIN public.listings l
      ON l.category_id = c2.id AND l.status = 'active'
    WHERE c2.id = ANY(v_ids)
    GROUP BY c2.id
  ) AS sub
  WHERE c.id = sub.id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS listings_sync_category_count ON public.listings;
CREATE TRIGGER listings_sync_category_count
  AFTER INSERT OR UPDATE OF status, category_id OR DELETE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.sync_category_listing_count();

-- Recalculamos todos los contadores una vez para corregir los que quedaron en 0.
UPDATE public.categories c
SET listing_count = COALESCE(sub.total, 0)
FROM (
  SELECT c2.id, count(l.id) AS total
  FROM public.categories c2
  LEFT JOIN public.listings l
    ON l.category_id = c2.id AND l.status = 'active'
  GROUP BY c2.id
) AS sub
WHERE c.id = sub.id;

-- ---------------------------------------------------------------------------
-- 3. BLOQUEO EFECTIVO DE USUARIOS
-- ---------------------------------------------------------------------------
-- Un perfil con is_blocked = true no puede crear ni modificar publicaciones,
-- imágenes ni comercios. Puede seguir navegando y borrando su contenido.
CREATE OR REPLACE FUNCTION public.is_blocked()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT p.is_blocked FROM public.profiles p WHERE p.id = auth.uid()), FALSE);
$$;

GRANT EXECUTE ON FUNCTION public.is_blocked() TO anon, authenticated;

DROP POLICY IF EXISTS "Users can create listings" ON public.listings;
CREATE POLICY "Users can create listings"
  ON public.listings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND NOT public.is_blocked());

DROP POLICY IF EXISTS "Users can update their own listings" ON public.listings;
CREATE POLICY "Users can update their own listings"
  ON public.listings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND NOT public.is_blocked())
  WITH CHECK (auth.uid() = user_id AND NOT public.is_blocked());

DROP POLICY IF EXISTS "Users can manage images of their listings" ON public.listing_images;
CREATE POLICY "Users can manage images of their listings"
  ON public.listing_images FOR ALL TO authenticated
  USING (
    NOT public.is_blocked()
    AND EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = listing_images.listing_id
        AND listings.user_id = auth.uid()
    )
  )
  WITH CHECK (
    NOT public.is_blocked()
    AND EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = listing_images.listing_id
        AND listings.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage their own business" ON public.businesses;
CREATE POLICY "Users can manage their own business"
  ON public.businesses FOR ALL TO authenticated
  USING (auth.uid() = user_id AND NOT public.is_blocked())
  WITH CHECK (auth.uid() = user_id AND NOT public.is_blocked());

NOTIFY pgrst, 'reload schema';
