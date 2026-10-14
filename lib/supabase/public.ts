import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, assertSupabaseEnv } from "./env";

/**
 * Cliente anónimo sin cookies ni sesión, apto para lecturas públicas en el
 * servidor (metadatos, sitemap, perfiles y publicaciones visibles para todos).
 *
 * No lee `cookies()`, por lo que puede usarse dentro de funciones `'use cache'`.
 */
export function createPublicClient(): SupabaseClient {
  assertSupabaseEnv();

  return createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "X-Client-Info": "capiata-conecta/public" } },
  });
}
