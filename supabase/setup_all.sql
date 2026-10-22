-- ===================================================
-- CAPIATÁ CONECTA — SCRIPT COMPLETO DE CONFIGURACIÓN
-- Copiar y pegar todo este contenido en el SQL Editor de Supabase
-- ===================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  bio TEXT,
  city TEXT DEFAULT 'Capiatá',
  neighborhood TEXT,
  user_type TEXT CHECK (user_type IN ('person', 'business')) DEFAULT 'person',
  is_verified BOOLEAN DEFAULT FALSE,
  is_blocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA BUSINESSES
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  category TEXT,
  phone TEXT,
  whatsapp TEXT,
  address TEXT,
  schedule TEXT,
  social_links JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT NOT NULL,
  color TEXT DEFAULT '#1E3A5F',
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  listing_count INT DEFAULT 0
);

-- 5. TABLA LISTINGS (Publicaciones OFREZCO / BUSCO)
CREATE TABLE IF NOT EXISTS public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  type TEXT CHECK (type IN ('OFFER', 'REQUEST')) NOT NULL,
  category_id UUID NOT NULL REFERENCES public.categories(id),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC,
  currency TEXT DEFAULT 'GS',
  location TEXT DEFAULT 'Capiatá',
  neighborhood TEXT,
  contact_whatsapp TEXT,
  contact_phone TEXT,
  contact_method TEXT[] DEFAULT ARRAY['whatsapp'],
  status TEXT DEFAULT 'active' CHECK (status IN ('active','paused','deleted','pending')),
  views_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLA LISTING_IMAGES
CREATE TABLE IF NOT EXISTS public.listing_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  position INT DEFAULT 0
);

-- 7. TABLA FAVORITES
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, listing_id)
);

-- 8. TABLA REPORTS
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  reason TEXT CHECK (reason IN ('scam','fake','prohibited','spam','offensive','wrong','other')) NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','reviewed','resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TRIGGER DE AUTOCREACIÓN DE PERFIL AL REGISTRARSE
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, phone, neighborhood, user_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario de Capiatá'),
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'neighborhood', 'Centro'),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'person')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 11. POLÍTICAS RLS (POLICIES)
DROP POLICY IF EXISTS "Categories are readable by everyone" ON public.categories;
CREATE POLICY "Categories are readable by everyone" ON public.categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public profiles are readable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are readable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Businesses are readable by everyone" ON public.businesses;
CREATE POLICY "Businesses are readable by everyone" ON public.businesses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own business" ON public.businesses;
CREATE POLICY "Users can manage their own business" ON public.businesses FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Active listings are readable by everyone" ON public.listings;
CREATE POLICY "Active listings are readable by everyone" ON public.listings FOR SELECT USING (status = 'active' OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create listings" ON public.listings;
CREATE POLICY "Users can create listings" ON public.listings FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own listings" ON public.listings;
CREATE POLICY "Users can update their own listings" ON public.listings FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own listings" ON public.listings;
CREATE POLICY "Users can delete their own listings" ON public.listings FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Listing images readable by everyone" ON public.listing_images;
CREATE POLICY "Listing images readable by everyone" ON public.listing_images FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage images of their listings" ON public.listing_images;
CREATE POLICY "Users can manage images of their listings" ON public.listing_images FOR ALL USING (
  EXISTS (SELECT 1 FROM public.listings WHERE listings.id = listing_images.listing_id AND listings.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can read their own favorites" ON public.favorites;
CREATE POLICY "Users can read their own favorites" ON public.favorites FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their favorites" ON public.favorites;
CREATE POLICY "Users can insert their favorites" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their favorites" ON public.favorites;
CREATE POLICY "Users can delete their favorites" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- 12. SEED DE 14 CATEGORÍAS INICIALES
INSERT INTO public.categories (name, slug, icon, color, description) VALUES
('Servicios Técnicos y Oficios', 'servicios-tecnicos', 'Wrench', '#1E3A5F', 'Electricidad, plomería, mecánica, reparaciones y soporte técnico'),
('Construcción y Hogar', 'construccion-hogar', 'Home', '#D97706', 'Materiales, albañilería, pintura, fletes, muebles y jardinería'),
('Gastronomía y Comidas', 'gastronomia-comidas', 'Utensils', '#DC2626', 'Rotiserías, bocaditos, tortas, minutas y catering para eventos'),
('Moda y Calzados', 'moda-calzados', 'ShoppingBag', '#EC4899', 'Ropa, calzados, accesorios, confección y arreglos'),
('Electrónica y Celulares', 'electronica-celulares', 'Smartphone', '#2563EB', 'Celulares, computadoras, accesorios y servicio de reparación'),
('Vehículos y Motos', 'vehiculos-motos', 'Car', '#059669', 'Autos, motos, repuestos, talleres y mantenimiento'),
('Salud y Belleza', 'salud-belleza', 'Heart', '#8B5CF6', 'Peluquería, barbería, manicura, farmacia y cuidado personal'),
('Educación y Clases', 'educacion-clases', 'GraduationCap', '#0284C7', 'Tutorías escolares, cursos particulares, idiomas y talleres'),
('Inmuebles y Alquileres', 'inmuebles-alquileres', 'Building', '#4B5563', 'Casas, terrenos, departamentos, salones comerciales y alquileres'),
('Empleos y Trabajo', 'empleos-trabajo', 'Briefcase', '#15803D', 'Ofertas laborales, personas buscando empleo y trabajos temporales'),
('Mascotas y Animales', 'mascotas-animales', 'Dog', '#F59E0B', 'Veterinarias, alimentos, accesorios, peluquería canina y adopción'),
('Eventos y Fiestas', 'eventos-fiestas', 'PartyPopper', '#9333EA', 'Decoración, alquiler de sillas/mesas, sonido, animación e inflables'),
('Deportes y Hobbies', 'deportes-hobbies', 'Dumbbell', '#06B6D4', 'Bicicletas, equipos deportivos, instrumentos musicales y artesanías'),
('Varios y Ocasión', 'varios-ocasion', 'Tag', '#64748B', 'Artículos variados, usados en buen estado y oportunidad')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 13. ENDURECIMIENTO PARA PRODUCCION
-- (mismo contenido que supabase/migrations/004_production_hardening.sql)
-- Ejecutar despues de las secciones anteriores. Es idempotente.
-- ============================================================================
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

-- ============================================================================
-- 14. CONTADOR DE VISTAS
-- (mismo contenido que supabase/migrations/002_increment_views_function.sql)
-- ============================================================================
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

GRANT EXECUTE ON FUNCTION public.increment_views(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_views(UUID) TO anon;

NOTIFY pgrst, 'reload schema';
-- ============================================================================
-- 15. BUSQUEDA SIN TILDES, CONTADORES Y BLOQUEO
-- (mismo contenido que supabase/migrations/005_search_counters_blocking.sql)
-- Va al final a proposito: redefine las politicas de escritura de la seccion 11.
-- ============================================================================
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

-- ============================================================================
-- 16. MENSAJERIA INTERNA
-- (mismo contenido que supabase/migrations/006_messaging.sql)
-- Depende de la seccion 15 (usa public.is_blocked()).
-- ============================================================================
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

-- ============================================================================
-- 17. TIENDA / VITRINA POR CUENTA (mismo contenido que
--     supabase/migrations/007_storefront.sql)
-- ============================================================================

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

CREATE UNIQUE INDEX IF NOT EXISTS businesses_user_id_key
  ON public.businesses (user_id);

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

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- 18. SEGURIDAD: FUNCIONES Y TOPES ANTI-ABUSO
-- (mismo contenido que supabase/migrations/008_security_hardening.sql)
-- Va al final a proposito: redefine increment_views() de la seccion 14.
-- ============================================================================

-- increment_views(): search_path fijo y solo cuenta publicaciones activas.
-- Cualquiera podia inflar el contador de cualquier publicacion, incluidas las
-- borradas.
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

-- Topes anti-abuso por cuenta. Cortan el spam automatizado; si algun dia hacen
-- falta limites mas finos, mover a un rate limiter dedicado.
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
      RAISE EXCEPTION 'Alcanzaste el maximo de 10 publicaciones por hora. Proba mas tarde.'
        USING ERRCODE = 'check_violation';
    END IF;

  ELSIF TG_TABLE_NAME = 'messages' THEN
    SELECT count(*) INTO v_recent
    FROM public.messages
    WHERE sender_id = auth.uid() AND created_at > NOW() - INTERVAL '1 minute';

    IF v_recent >= 20 THEN
      RAISE EXCEPTION 'Estas enviando mensajes demasiado rapido. Espera un momento.'
        USING ERRCODE = 'check_violation';
    END IF;

  ELSIF TG_TABLE_NAME = 'reports' THEN
    SELECT count(*) INTO v_recent
    FROM public.reports
    WHERE reporter_id = auth.uid() AND created_at > NOW() - INTERVAL '1 hour';

    IF v_recent >= 5 THEN
      RAISE EXCEPTION 'Ya enviaste varios reportes en la ultima hora. Gracias por avisar.'
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
