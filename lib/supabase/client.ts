import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, assertSupabaseEnv } from "./env";

/**
 * Cliente de Supabase para componentes de cliente (navegador).
 *
 * Se memoiza a nivel de módulo: crear múltiples instancias rompe los canales
 * de Realtime (cada instancia abre su propia conexión) y duplica listeners
 * de `onAuthStateChange`.
 */
let browserClient: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  assertSupabaseEnv();

  if (!browserClient) {
    browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    });
  }

  return browserClient;
}
