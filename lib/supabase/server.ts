import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL, assertSupabaseEnv } from "./env";

/**
 * Cliente de Supabase para Server Components, Server Actions y Route Handlers.
 * Lee/escribe la sesión desde las cookies de la petición.
 */
export async function createClient(): Promise<SupabaseClient> {
  assertSupabaseEnv();

  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Component: las cookies son de solo lectura en el render.
          // El refresco de sesión lo realiza proxy.ts.
        }
      },
    },
  });
}
