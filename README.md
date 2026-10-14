# Capiatá Conecta

Directorio local y clasificados de Capiatá (Paraguay): red comunitaria **OFREZCO ↔ BUSCO**.
No es e-commerce: no hay carrito, checkout ni pagos online; la plataforma sólo facilita el
contacto directo entre vecinos y emprendedores.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, Cache Components, Partial Prefetching) |
| UI | React 19 + Tailwind CSS 4 + lucide-react |
| Backend | Supabase (Postgres + RLS + Storage + Realtime) |
| Validación | Zod |
| Hosting | Vercel |

## Puesta en marcha

### 1. Variables de entorno

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://<proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Base de datos en Supabase

En el **SQL Editor** del proyecto, ejecutar en este orden:

1. `supabase/setup_all.sql` — esquema completo, RLS, 14 categorías y endurecimiento de
   producción (buckets de Storage, Realtime, rol admin). Es idempotente.
   Alternativa por partes: `supabase/migrations/001_initial_schema.sql` → `002` → `003` → `004_production_hardening.sql`.

2. Habilitar tu cuenta como administradora:

```sql
UPDATE public.profiles SET is_admin = TRUE WHERE id = '<TU_USER_ID>';
```

3. Verificar que existan los buckets públicos `listings-images` y `avatars`
   (los crea la sección 5 de la migración 004).

### 3. Desarrollo

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint
npx tsc --noEmit
npm run build
```

### 4. Verificación contra Supabase

```bash
# Estado de la base: esquema, seed, RLS, migraciones, Storage y Realtime
npm run health-check

# Igual que el anterior + ciclo de usuario de prueba (requiere SUPABASE_SERVICE_ROLE_KEY)
npm run health-check -- --deep

# E2E autenticado real: publica con foto, edita perfil, sube avatar, favoritos,
# reportes, Realtime y limpieza automática de todo lo que creó.
# Requiere un usuario de prueba con email confirmado.
E2E_TEST_EMAIL=... E2E_TEST_PASSWORD=... npm run e2e
# o: npm run e2e -- --email x@y.com --password "..."
```

Las credenciales de los scripts se leen de `.env.local` (ignorado por git) o de
variables de entorno. `SUPABASE_SERVICE_ROLE_KEY` es **opcional** y sólo se usa
con `--deep`; jamás debe llevar el prefijo `NEXT_PUBLIC_`.

## Arquitectura de datos

Todo el contenido proviene de Supabase; no quedan datos simulados en el repositorio.

```
lib/supabase/client.ts    Cliente browser memoizado (Realtime + Auth)
lib/supabase/server.ts    Cliente de servidor con cookies
lib/supabase/public.ts    Cliente anónimo sin sesión (metadatos, sitemap, 'use cache')
lib/supabase/queries.ts   Consultas y mutaciones tipadas
lib/supabase/storage.ts   Subida/borrado de imágenes en Supabase Storage
lib/hooks/useListings.ts  Feed público con Supabase Realtime
lib/hooks/useFavorites.ts Favoritos persistentes del usuario
proxy.ts                  Refresco de sesión + protección de rutas privadas
```

### Reglas de acceso (RLS)

| Tabla | Lectura | Escritura |
|---|---|---|
| `profiles` | pública | sólo el propio usuario (y admins) |
| `businesses` | pública | sólo el dueño (y admins) |
| `categories` | pública | administración |
| `listings` | pública si `status = 'active'` | sólo el autor (y admins) |
| `listing_images` | pública | sólo el autor de la publicación |
| `favorites` | propia (y del dueño de la publicación) | propia |
| `reports` | propia (y admins) | alta autenticada; moderación sólo admins |
| `storage.objects` | pública en los buckets de la app | archivos dentro de `{user_id}/…` |

El feed es de **acceso universal**: cualquier visitante, con o sin cuenta, ve las
publicaciones en tiempo real. Sólo la creación de contenido y el panel requieren sesión.
