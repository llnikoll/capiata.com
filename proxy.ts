import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

/**
 * Proxy (antiguo middleware) de Next.js 16.
 *
 * 1. Refresca la sesión de Supabase en cada petición para que las cookies de
 *    auth no expiren mientras el usuario navega.
 * 2. Hace una verificación optimista de acceso: las rutas que requieren sesión
 *    (publicar, panel y administración) redirigen al login. La autorización
 *    real la aplican las políticas RLS de Supabase en cada consulta.
 *
 * La lectura pública del feed NO está protegida: cualquier visitante puede ver
 * las publicaciones sin registrarse.
 */
const PROTECTED_PREFIXES = ["/dashboard", "/admin", "/crear-publicacion"];

export async function proxy(request: NextRequest) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  try {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;
    const isProtected = PROTECTED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );

    if (isProtected && !user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = `?redirect=${encodeURIComponent(pathname + request.nextUrl.search)}`;
      return NextResponse.redirect(loginUrl);
    }
  } catch {
    // Nunca bloqueamos la navegación por un fallo del refresco de sesión.
    return response;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|auth/callback|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml|json)$).*)",
  ],
};
