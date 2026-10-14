/**
 * Lectura centralizada de las variables de entorno públicas de Supabase.
 * Falla temprano y con un mensaje claro si la configuración no está presente.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function assertSupabaseEnv(): void {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Falta configurar NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Copiá .env.example a .env.local y completá las credenciales del proyecto Supabase."
    );
  }
}
