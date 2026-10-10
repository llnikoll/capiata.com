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
