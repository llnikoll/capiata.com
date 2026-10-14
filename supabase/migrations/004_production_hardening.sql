-- ============================================================================
-- Migration: 004_production_hardening.sql
-- Capiatá Conecta — preparación para producción
--
-- Ejecutar completo en el SQL Editor de Supabase. Es idempotente: puede
-- correrse varias veces sin romper datos existentes.
--
-- Contenido:
--   1. Alta de perfiles robusta (trigger corregido)
--   2. Rol de administrador + políticas RLS de moderación
--   3. Políticas RLS de reportes y favoritos
--   4. Trigger de updated_at
--   5. Buckets de Storage (listings-images, avatars) + políticas
--   6. Supabase Realtime para el feed público
--   7. Índices de rendimiento
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. ALTA DE PERFILES (trigger corregido y a prueba de colisiones)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username TEXT;
BEGIN
  v_username := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'username', ''),
    split_part(COALESCE(NEW.email, 'usuario@capiata.local'), '@', 1)
  );

  -- Evitamos chocar con el UNIQUE(username) de una cuenta previa.
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username AND id <> NEW.id) THEN
    v_username := v_username || '-' || substr(NEW.id::text, 1, 8);
  END IF;

  INSERT INTO public.profiles (
    id, username, full_name, avatar_url, phone, city, neighborhood, user_type
  )
  VALUES (
    NEW.id,
    v_username,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'name', ''),
      split_part(COALESCE(NEW.email, 'vecino'), '@', 1)
    ),
    NULLIF(NEW.raw_user_meta_data->>'avatar_url', ''),
    NULLIF(COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone), ''),
    'Capiatá',
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'neighborhood', ''), 'Centro'),
    CASE
      WHEN NEW.raw_user_meta_data->>'user_type' = 'business' THEN 'business'
      ELSE 'person'
    END
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 2. ROL DE ADMINISTRADOR
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Helper SECURITY DEFINER: evita recursión al usarse dentro de políticas.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid()), FALSE);
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- El usuario puede crear su propia fila de perfil (alta por OAuth/registro).
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles"
  ON public.profiles FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Una vez aplicado, promové tu cuenta a administrador:
--   UPDATE public.profiles SET is_admin = TRUE WHERE id = '<TU_USER_ID>';

-- ---------------------------------------------------------------------------
-- 3. POLÍTICAS DE MODERACIÓN (listings, imágenes, comercios, reportes, favoritos)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage all listings" ON public.listings;
CREATE POLICY "Admins can manage all listings"
  ON public.listings FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage all listing images" ON public.listing_images;
CREATE POLICY "Admins can manage all listing images"
  ON public.listing_images FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage all businesses" ON public.businesses;
CREATE POLICY "Admins can manage all businesses"
  ON public.businesses FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Reportes: cualquier usuario autenticado denuncia, sólo el staff los lee todos.
DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
CREATE POLICY "Users can create reports"
  ON public.reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users can read their own reports" ON public.reports;
CREATE POLICY "Users can read their own reports"
  ON public.reports FOR SELECT
  USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Admins can manage reports" ON public.reports;
CREATE POLICY "Admins can manage reports"
  ON public.reports FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- El dueño de una publicación puede ver cuántas veces la guardaron.
DROP POLICY IF EXISTS "Owners can read favorites of their listings" ON public.favorites;
CREATE POLICY "Owners can read favorites of their listings"
  ON public.favorites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = favorites.listing_id AND l.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 4. TRIGGER updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS listings_set_updated_at ON public.listings;
CREATE TRIGGER listings_set_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. STORAGE: buckets públicos y políticas por carpeta de usuario
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listings-images', 'listings-images', TRUE, 5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE
  SET public = TRUE,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 'avatars', TRUE, 5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE
  SET public = TRUE,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public can view capiata media" ON storage.objects;
CREATE POLICY "Public can view capiata media"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('listings-images', 'avatars'));

DROP POLICY IF EXISTS "Users upload own capiata media" ON storage.objects;
CREATE POLICY "Users upload own capiata media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('listings-images', 'avatars')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users update own capiata media" ON storage.objects;
CREATE POLICY "Users update own capiata media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('listings-images', 'avatars')
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id IN ('listings-images', 'avatars')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users delete own capiata media" ON storage.objects;
CREATE POLICY "Users delete own capiata media"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id IN ('listings-images', 'avatars')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- 6. REALTIME: el feed público se actualiza sin recargar la página
-- ---------------------------------------------------------------------------
ALTER TABLE public.listings REPLICA IDENTITY FULL;
ALTER TABLE public.listing_images REPLICA IDENTITY FULL;
ALTER TABLE public.businesses REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.listings;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.listing_images;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.businesses;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. ÍNDICES DE RENDIMIENTO
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS listings_status_created_at_idx
  ON public.listings (status, created_at DESC);
CREATE INDEX IF NOT EXISTS listings_category_id_idx
  ON public.listings (category_id);
CREATE INDEX IF NOT EXISTS listings_user_id_idx
  ON public.listings (user_id);
CREATE INDEX IF NOT EXISTS listings_neighborhood_idx
  ON public.listings (neighborhood);
CREATE INDEX IF NOT EXISTS listing_images_listing_id_idx
  ON public.listing_images (listing_id);
CREATE INDEX IF NOT EXISTS favorites_listing_id_idx
  ON public.favorites (listing_id);
CREATE INDEX IF NOT EXISTS reports_status_created_at_idx
  ON public.reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS listings_title_trgm_idx
  ON public.listings USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS listings_description_trgm_idx
  ON public.listings USING gin (description gin_trgm_ops);

-- Refrescamos la caché de esquema de la API REST.
NOTIFY pgrst, 'reload schema';
