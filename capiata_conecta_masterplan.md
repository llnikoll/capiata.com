# 🗺️ CAPIATÁ CONECTA — PLAN MAESTRO DE DESARROLLO

> **Documento de referencia para retomar el trabajo en cualquier plataforma o sesión.**
> Actualizar los checkboxes conforme avance el desarrollo.

---

## 📌 CONTEXTO DEL PROYECTO

| Campo | Valor |
|---|---|
| **Nombre** | Capiatá Conecta |
| **Tipo** | Directorio local + Clasificados (NO e-commerce) |
| **Ciudad** | Capiatá, Paraguay |
| **Concepto clave** | OFREZCO ↔ BUSCO (sin compras, sin pagos) |
| **Stack elegido** | Next.js 14 + TypeScript + Tailwind CSS + Supabase |
| **Hosting** | Vercel |
| **Repo** | `c:\Users\jakao\Proyectos\capiata.com` |

---

## 🔑 REGLAS DE NEGOCIO (NO OLVIDAR)

> [!IMPORTANT]
> - ❌ Sin carrito de compras
> - ❌ Sin checkout
> - ❌ Sin pagos online (no Stripe, no Mercado Pago)
> - ❌ Sin comisiones por ventas
> - ❌ Sin gestión de envíos
> - ✅ Solo facilita el **contacto** entre personas
> - ✅ "Pedido" = "Estoy buscando algo" (NO una compra)

---

## 🎨 SISTEMA DE DISEÑO

| Elemento | Valor |
|---|---|
| **Color primario** | Azul oscuro `#1E3A5F` |
| **Color acción** | Amarillo `#F5B800` |
| **Fondo** | Blanco `#FFFFFF` |
| **Fondo secundario** | Gris claro `#F4F6F8` |
| **Tipografía** | Inter / Plus Jakarta Sans (Google Fonts) |
| **Bordes** | Redondeados (`rounded-xl`) |
| **Sombras** | Suaves (`shadow-md`) |
| **Mobile First** | ✅ Obligatorio |

---

## 📁 ESTRUCTURA DE CARPETAS OBJETIVO

```
capiata.com/
├── app/                        # Next.js App Router
│   ├── (public)/               # Rutas públicas
│   │   ├── page.tsx            # Landing
│   │   ├── explorar/           # Listado general
│   │   ├── categoria/[slug]/   # Por categoría
│   │   ├── publicacion/[slug]/ # Detalle publicación
│   │   └── usuario/[username]/ # Perfil público
│   ├── (auth)/                 # Autenticación
│   │   ├── login/
│   │   └── registro/
│   ├── (dashboard)/            # Área privada usuario
│   │   ├── mi-cuenta/
│   │   ├── mis-publicaciones/
│   │   ├── crear-publicacion/
│   │   ├── favoritos/
│   │   └── configuracion/
│   ├── (admin)/                # Panel administrativo
│   │   ├── usuarios/
│   │   ├── publicaciones/
│   │   ├── categorias/
│   │   └── reportes/
│   └── api/                    # API Routes
├── components/
│   ├── ui/                     # Componentes base (Button, Card, Input...)
│   ├── layout/                 # Navbar, Footer, Sidebar
│   ├── listings/               # Tarjetas, formularios de publicación
│   ├── search/                 # Buscador, filtros
│   └── profile/                # Perfil usuario/negocio
├── lib/
│   ├── supabase/               # Cliente Supabase
│   ├── hooks/                  # Custom hooks
│   ├── utils/                  # Helpers
│   └── types/                  # TypeScript types
├── public/                     # Assets estáticos
└── supabase/
    ├── migrations/             # SQL migrations
    └── seed.sql                # Datos iniciales
```

---

## 🗄️ BASE DE DATOS — ESQUEMA COMPLETO

```sql
-- USERS (manejado por Supabase Auth + tabla extra)
profiles (
  id UUID PRIMARY KEY REFERENCES auth.users,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  bio TEXT,
  city TEXT DEFAULT 'Capiatá',
  neighborhood TEXT,
  user_type TEXT CHECK (user_type IN ('person', 'business')),
  is_verified BOOLEAN DEFAULT FALSE,
  is_blocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- NEGOCIOS
businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
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
)

-- CATEGORÍAS
categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT,
  color TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  listing_count INT DEFAULT 0
)

-- PUBLICACIONES (núcleo del sistema)
listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  business_id UUID REFERENCES businesses(id),
  type TEXT CHECK (type IN ('OFFER', 'REQUEST')) NOT NULL,
  category_id UUID REFERENCES categories(id),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price NUMERIC,
  currency TEXT DEFAULT 'GS',
  location TEXT DEFAULT 'Capiatá',
  neighborhood TEXT,
  contact_whatsapp TEXT,
  contact_phone TEXT,
  contact_method TEXT[],
  status TEXT DEFAULT 'active' CHECK (status IN ('active','paused','deleted','pending')),
  views_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

-- IMÁGENES DE PUBLICACIONES
listing_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  position INT DEFAULT 0
)

-- FAVORITOS
favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  listing_id UUID REFERENCES listings(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, listing_id)
)

-- REPORTES
reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES profiles(id),
  listing_id UUID REFERENCES listings(id),
  reason TEXT CHECK (reason IN ('scam','fake','prohibited','spam','offensive','wrong','other')),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','reviewed','resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- MENSAJES (preparado para Fase 2)
conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id),
  participant_a UUID REFERENCES profiles(id),
  participant_b UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
)

messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  sender_id UUID REFERENCES profiles(id),
  content TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

---

## ✅ CHECKLIST — FASE 1 (MVP)

### 🔧 ETAPA 0 — CONFIGURACIÓN INICIAL
- [ ] Crear proyecto Next.js 14 con TypeScript
  ```bash
  npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false
  ```
- [ ] Instalar dependencias clave
  ```bash
  npm install @supabase/supabase-js @supabase/ssr lucide-react clsx tailwind-merge
  npm install @hookform/resolvers react-hook-form zod
  npm install next-seo date-fns slugify
  ```
- [ ] Crear proyecto en Supabase (supabase.com)
- [ ] Configurar variables de entorno `.env.local`
  ```env
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
  NEXT_PUBLIC_APP_URL=http://localhost:3000
  ```
- [ ] Configurar cliente Supabase (`lib/supabase/client.ts` y `server.ts`)
- [ ] Configurar Tailwind con colores personalizados (azul/amarillo)
- [ ] Configurar fuente Inter en `layout.tsx`
- [ ] Crear layout base con Navbar y Footer
- [ ] Commit inicial: `git init && git add . && git commit -m "chore: setup inicial"`

---

### 🎨 ETAPA 1 — SISTEMA DE DISEÑO Y COMPONENTES BASE
- [ ] Definir tokens de color en `tailwind.config.ts`
  - `primary: #1E3A5F` (azul oscuro)
  - `accent: #F5B800` (amarillo)
- [ ] Componente `Button` (variantes: primary, secondary, outline, ghost)
- [ ] Componente `Card`
- [ ] Componente `Input` + `Textarea` + `Select`
- [ ] Componente `Badge` (OFREZCO azul / BUSCO amarillo)
- [ ] Componente `Avatar`
- [ ] Componente `Modal`
- [ ] Componente `Spinner` / Loading skeleton
- [ ] Navbar responsive con menú hamburguesa
- [ ] Footer con links
- [ ] Verificar responsive en mobile/tablet/desktop

---

### 🏠 ETAPA 2 — LANDING PAGE
- [ ] **Hero** con imagen de Capiatá de fondo
  - [ ] Generar imagen panorámica de Capiatá con IA
  - [ ] Título y subtítulo
  - [ ] Buscador grande
  - [ ] Botones "Quiero ofrecer algo" / "Estoy buscando algo"
- [ ] **Sección Categorías** (14 categorías con iconos y contador)
- [ ] **Sección "Últimas Publicaciones"** (tarjetas OFREZCO)
- [ ] **Sección "Lo que busca la gente"** (tarjetas BUSCO)
- [ ] **Sección "Emprendedores Destacados"**
- [ ] **Sección "¿Cómo funciona?"** (3 pasos: Registrate → Publicá → Conectá)
- [ ] **CTA final** (doble botón)
- [ ] **Aviso visible**: "No realizamos ventas ni pagos"
- [ ] Verificar SEO: title, meta description, OG tags
- [ ] Verificar responsive

---

### 🔐 ETAPA 3 — AUTENTICACIÓN
- [ ] Ejecutar migrations de BD en Supabase
  - [ ] Tabla `profiles`
  - [ ] Tabla `categories` + seed con las 14 categorías
  - [ ] Configurar RLS (Row Level Security) en todas las tablas
- [ ] Página de **Registro** (`/registro`)
  - [ ] Selector tipo: Persona / Emprendedor
  - [ ] Formulario con validación (Zod)
  - [ ] Crear perfil en `profiles` al registrarse
- [ ] Página de **Inicio de sesión** (`/login`)
  - [ ] Email + contraseña
  - [ ] Link "¿Olvidaste tu contraseña?"
- [ ] Recuperación de contraseña (Supabase email)
- [ ] Protección de rutas privadas (middleware)
- [ ] Navbar cambia al autenticarse (Mi Cuenta en lugar de Login/Registro)
- [ ] Cerrar sesión

---

### 👤 ETAPA 4 — PERFILES
- [ ] Tabla `businesses` + RLS
- [ ] Página pública de perfil (`/usuario/[username]`)
  - [ ] Avatar, nombre, bio, ciudad, barrio
  - [ ] Badge "Verificado" (si aplica)
  - [ ] Botón "Contactar por WhatsApp"
  - [ ] Lista de publicaciones del usuario
  - [ ] Para negocios: nombre comercial, logo, horarios, redes
- [ ] Editar perfil (dashboard)
  - [ ] Subir foto de perfil → Supabase Storage
  - [ ] Editar datos básicos
  - [ ] Para negocios: logo, descripción, WhatsApp, redes

---

### 📋 ETAPA 5 — PUBLICACIONES
- [ ] Crear tablas `listings`, `listing_images` + RLS
- [ ] Formulario "Crear Publicación" (`/crear-publicacion`)
  - [ ] **Paso 1**: ¿Qué querés publicar? → OFREZCO / BUSCO
  - [ ] **Paso 2**: Categoría
  - [ ] **Paso 3**: Título, descripción
  - [ ] **Paso 4**: Fotos (múltiples, Supabase Storage)
  - [ ] **Paso 5**: Precio (opcional), ubicación, barrio
  - [ ] **Paso 6**: Forma de contacto (WhatsApp / Teléfono / Mensaje)
  - [ ] Generar slug automático desde el título
  - [ ] Validación completa con Zod
- [ ] Página detalle OFREZCO (`/publicacion/[slug]`)
  - [ ] Badge amarillo "OFREZCO"
  - [ ] Galería de imágenes
  - [ ] Datos del publicador
  - [ ] Botón "Contactar por WhatsApp" (mensaje predefinido)
  - [ ] Botón "Guardar en favoritos"
  - [ ] Botón "Reportar"
  - [ ] Contador de vistas (incrementar al visitar)
- [ ] Página detalle BUSCO (`/publicacion/[slug]`)
  - [ ] Badge azul "BUSCO"
  - [ ] Botón "Tengo algo para ofrecer" → contactar
- [ ] Editar publicación
- [ ] Pausar / eliminar publicación
- [ ] Listar publicaciones por categoría (`/categoria/[slug]`)

---

### 🔍 ETAPA 6 — BÚSQUEDA Y FILTROS
- [ ] Búsqueda global full-text (Supabase `to_tsvector`)
- [ ] Página de resultados (`/explorar`)
  - [ ] Filtro: Todos / OFREZCO / BUSCO
  - [ ] Filtro: Categoría
  - [ ] Filtro: Barrio
  - [ ] Filtro: Precio mínimo / máximo
  - [ ] Filtro: Fecha
  - [ ] Ordenar: Más recientes / Precio menor / Precio mayor
- [ ] Buscador en Navbar (acceso rápido)
- [ ] URL con parámetros para compartir búsquedas
  - Ej: `/explorar?q=moto&tipo=OFFER&categoria=vehiculos`

---

### ❤️ ETAPA 7 — FAVORITOS
- [ ] Crear tabla `favorites` + RLS
- [ ] Botón ♡ en tarjetas (toggle)
- [ ] Página "Mis Favoritos" en dashboard
- [ ] Solo disponible para usuarios autenticados

---

### 📊 ETAPA 8 — DASHBOARD DEL USUARIO
- [ ] Layout dashboard con sidebar
- [ ] **Inicio**: estadísticas (publicaciones, vistas, contactos, favoritos)
- [ ] **Mi Perfil**: ver y editar
- [ ] **Mis Publicaciones**: lista con estado (activa/pausada)
- [ ] **Crear Publicación**: acceso directo
- [ ] **Mis Pedidos**: publicaciones tipo BUSCO
- [ ] **Favoritos**: lista guardada
- [ ] **Configuración**: cambiar contraseña, notificaciones
- [ ] Panel especial para **Emprendedores**: nombre negocio, logo, estadísticas

---

### 🚩 ETAPA 9 — MODERACIÓN
- [ ] Crear tabla `reports` + RLS
- [ ] Botón "Reportar publicación" en cada publicación
  - [ ] Modal con motivos (estafa, spam, falso, prohibido, ofensivo, incorrecto, otro)
  - [ ] Campo descripción opcional
- [ ] Guardar reporte en BD

---

### 🛡️ ETAPA 10 — PANEL ADMINISTRADOR
- [ ] Proteger rutas `/admin` (solo rol admin en Supabase)
- [ ] Asignar rol admin vía Supabase dashboard
- [ ] **Dashboard admin**: usuarios, publicaciones, reportes (contadores)
- [ ] **Gestión usuarios**: listar, bloquear, desbloquear, eliminar
- [ ] **Gestión publicaciones**: listar, aprobar, ocultar, eliminar
- [ ] **Gestión categorías**: crear, editar, activar/desactivar
- [ ] **Gestión reportes**: ver reportes, marcar como revisado/resuelto
- [ ] **Verificar usuarios**: marcar perfil como verificado

---

### 🌐 ETAPA 11 — SEO Y PRODUCCIÓN
- [ ] `next-seo` configurado globalmente
- [ ] Meta tags dinámicos por publicación
- [ ] Open Graph (título, descripción, imagen)
- [ ] URLs amigables: `/publicacion/motocicleta-honda-150cc`
- [ ] Sitemap dinámico (`/sitemap.xml`)
- [ ] `robots.txt`
- [ ] Schema.org para publicaciones (JSON-LD)
- [ ] Rendimiento: optimización de imágenes con `next/image`
- [ ] Deploy en Vercel
  - [ ] Configurar variables de entorno en Vercel
  - [ ] Dominio personalizado (si aplica)
- [ ] Prueba final end-to-end:
  - [ ] Flujo "buscar sin registro" ✅
  - [ ] Flujo "registrarse y publicar" ✅
  - [ ] Flujo "buscar y contactar por WhatsApp" ✅
  - [ ] Panel administrador ✅

---

## ✅ CHECKLIST — FASE 2

- [ ] Mensajería interna entre usuarios
- [ ] Notificaciones (in-app)
- [ ] Notificaciones por email (Supabase + Resend)
- [ ] Notificaciones por WhatsApp (Twilio / WATI)
- [ ] Sistema de verificación de usuarios
- [ ] Mapa con ubicaciones aproximadas (Mapbox / Leaflet)
- [ ] Estadísticas avanzadas para emprendedores
- [ ] Sistema de reputación / calificaciones
- [ ] Compartir publicaciones (redes sociales)
- [ ] "Negocios destacados" con destacado pagado
- [ ] App móvil (React Native / Expo) — evaluación

---

## ✅ CHECKLIST — FASE 3 (IA)

- [ ] Sugerencia automática de categoría (OpenAI API)
- [ ] Mejora de títulos con IA
- [ ] Mejora de descripciones con IA
- [ ] Detección de duplicados
- [ ] Detección de contenido sospechoso / spam
- [ ] Matching automático BUSCO ↔ OFREZCO
  - Al publicar un BUSCO, mostrar OFREZCOs relacionados
  - Notificar a vendedores sobre pedidos relevantes
- [ ] Recomendaciones personalizadas

---

## 🔄 PROTOCOLO DE RETOMA (para cualquier plataforma)

Si retomás en **VS Code, Cursor, Codex u otra IA**, copiá este prompt de contexto:

```
Estoy desarrollando "Capiatá Conecta", una plataforma local de 
clasificados para Capiatá, Paraguay. NO es e-commerce, no hay 
pagos, no hay carrito. Solo facilita contacto entre personas 
mediante publicaciones tipo OFREZCO / BUSCO.

Stack: Next.js 14 + TypeScript + Tailwind CSS + Supabase
Repo: c:\Users\jakao\Proyectos\capiata.com
Colores: Azul oscuro #1E3A5F, Amarillo #F5B800
Documento maestro: [ver capiata_conecta_masterplan.md]

Última etapa completada: [COMPLETAR AQUÍ]
Próxima tarea: [COMPLETAR AQUÍ]
```

---

## 📦 COMANDOS DE REFERENCIA RÁPIDA

```bash
# Iniciar proyecto
cd c:\Users\jakao\Proyectos\capiata.com
npm run dev

# Instalar dependencias faltantes
npm install [paquete]

# Build de producción
npm run build

# Deploy a Vercel
vercel --prod

# Supabase CLI (si está instalado)
npx supabase db push        # Aplicar migrations
npx supabase db reset       # Resetear BD local
npx supabase gen types typescript --local > lib/types/supabase.ts
```

---

## 📊 ESTADO ACTUAL DEL PROYECTO

| Etapa | Estado | Notas |
|---|---|---|
| 0. Configuración inicial | ✅ Completado | Next.js + Tailwind + Supabase SSR + Types + Migrations + Seed |
| 1. Sistema de diseño | ✅ Completado | Tokens de color, Button, Card, Input, Select, Badge, Avatar, Spinner, Navbar, Footer |
| 2. Landing page | ✅ Completado | Hero, Buscador, Banner Transparencia, 14 Categorías, Ofertas, Pedidos, Emprendedores, 3 Pasos, CTA |
| 3. Autenticación | ✅ Completado | Rutas `/login` y `/registro` (persona y emprendedor), SQL Profiles, Categories & RLS |
| 4. Perfiles y Negocios | ✅ Completado | Directorio `/emprendedores`, BusinessCard con WhatsApp |
| 5. Publicaciones | ✅ Completado | Formulario `/crear-publicacion` (OFREZCO / BUSCO) y Detalle `/publicacion/[slug]` |
| 6. Búsqueda y filtros | ✅ Completado | Página `/explorar` con filtro por tipo, categoría, barrio, query y ordenamiento |
| 7. Favoritos | ✅ Completado | Hook `useFavorites` con localStorage + vista `/dashboard/favoritos` |
| 8. Dashboard | ✅ Completado | Panel `/dashboard` con sidebar, métricas, `/mis-publicaciones`, `/mis-pedidos`, `/mi-cuenta`, `/configuracion` |
| 9. Moderación | ✅ Completado | Componente `ReportModal.tsx` con motivos y denuncias comunitarias |
| 10. Panel Admin | ✅ Completado | Backoffice `/admin`, `/admin/publicaciones`, `/admin/usuarios` y `/admin/reportes` |
| 11. SEO + Deploy | ✅ Completado | Sitemap.xml, robots.txt, Schema.org JSON-LD y pre-rendering de 28 rutas estáticas |

> Leyenda: ⬜ Pendiente | 🟡 En progreso | ✅ Completado | ❌ Bloqueado

---

*Última actualización: 2026-10-06*
