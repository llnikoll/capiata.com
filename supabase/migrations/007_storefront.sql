-- ============================================================================
-- Migration: 007_storefront.sql
-- Capiatá Conecta — vitrina de cada cuenta (tienda) y cupo de fotos
--
-- Ejecutar completo en el SQL Editor de Supabase. Es idempotente.
--
-- Contenido:
--   1. Cupo de fotos por cuenta (profiles.photo_limit, por defecto 10)
--   2. Una tienda por cuenta
--   3. Galería de la tienda (business_images) + RLS
--   4. Cupo efectivo aplicado por trigger (la base es la autoridad)
--   5. Protección de columnas privilegiadas del perfil
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. CUPO DE FOTOS POR CUENTA
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS photo_limit INT NOT NULL DEFAULT 10;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_photo_limit_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_photo_limit_check
      CHECK (photo_limit >= 0 AND photo_limit <= 1000);
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. UNA TIENDA POR CUENTA
-- ---------------------------------------------------------------------------
-- Si este índice falla, hay filas duplicadas en businesses. Detectarlas con:
--   SELECT user_id, count(*) FROM public.businesses GROUP BY 1 HAVING count(*) > 1;
-- y dejar una sola antes de volver a ejecutar la migración.
CREATE UNIQUE INDEX IF NOT EXISTS businesses_user_id_key
  ON public.businesses (user_id);

-- ---------------------------------------------------------------------------
-- 3. GALERÍA DE LA TIENDA
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS business_images_business_id_idx
  ON public.business_images (business_id);

ALTER TABLE public.business_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business images are readable by everyone" ON public.business_images;
CREATE POLICY "Business images are readable by everyone"
  ON public.business_images FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can manage images of their business" ON public.business_images;
CREATE POLICY "Users can manage images of their business"
  ON public.business_images FOR ALL TO authenticated
  USING (
    NOT public.is_blocked()
    AND EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = business_images.business_id
        AND businesses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    NOT public.is_blocked()
    AND EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = business_images.business_id
        AND businesses.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage all business images" ON public.business_images;
CREATE POLICY "Admins can manage all business images"
  ON public.business_images FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4. CUPO EFECTIVO DE FOTOS
-- ---------------------------------------------------------------------------
-- Compara la cantidad actual de fotos de la tienda con profiles.photo_limit
-- del dueño. Un INSERT de más se rechaza aunque el cliente lo intente.
CREATE OR REPLACE FUNCTION public.enforce_business_image_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit INT;
  v_used INT;
BEGIN
  SELECT p.photo_limit
    INTO v_limit
  FROM public.businesses b
  JOIN public.profiles p ON p.id = b.user_id
  WHERE b.id = NEW.business_id;

  IF v_limit IS NULL THEN
    RAISE EXCEPTION 'La tienda indicada no existe.';
  END IF;

  SELECT count(*)
    INTO v_used
  FROM public.business_images
  WHERE business_id = NEW.business_id
    AND (TG_OP = 'INSERT' OR id <> NEW.id);

  IF v_used >= v_limit THEN
    RAISE EXCEPTION
      'Límite de % foto(s) alcanzado para esta cuenta. Pedí al administrador que amplíe tu cupo.',
      v_limit
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS business_images_enforce_limit ON public.business_images;
CREATE TRIGGER business_images_enforce_limit
  BEFORE INSERT OR UPDATE OF business_id ON public.business_images
  FOR EACH ROW EXECUTE FUNCTION public.enforce_business_image_limit();

-- ---------------------------------------------------------------------------
-- 5. COLUMNAS PRIVILEGIADAS DEL PERFIL
-- ---------------------------------------------------------------------------
-- La política "Users can update their own profile" permite actualizar
-- cualquier columna de la propia fila. Sin este trigger, un usuario podría
-- auto-promoverse a admin, quitarse el bloqueo o subirse el cupo de fotos.
-- El SQL Editor y el service role (sin auth.uid()) conservan el control total.
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    NEW.is_admin := OLD.is_admin;
    NEW.is_verified := OLD.is_verified;
    NEW.is_blocked := OLD.is_blocked;
    NEW.photo_limit := OLD.photo_limit;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_privileges ON public.profiles;
CREATE TRIGGER profiles_protect_privileges
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileges();

-- Refrescamos la caché de esquema de la API REST.
NOTIFY pgrst, 'reload schema';
