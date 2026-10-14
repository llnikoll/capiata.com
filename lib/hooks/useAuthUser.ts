"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

interface UseAuthUserResult {
  user: User | null;
  loading: boolean;
  /** Error de configuración (variables de entorno faltantes), si lo hubiera. */
  configError: string | null;
}

/**
 * Estado de sesión compartido. Escucha `onAuthStateChange` para que la interfaz
 * reaccione a login/logout sin recargar la página.
 */
export function useAuthUser(): UseAuthUserResult {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    try {
      const supabase = createClient();

      supabase.auth
        .getUser()
        .then(({ data }) => {
          if (!active) return;
          setUser(data.user ?? null);
          setLoading(false);
        })
        .catch(() => {
          if (!active) return;
          setLoading(false);
        });

      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!active) return;
        setUser(session?.user ?? null);
        setLoading(false);
      });

      unsubscribe = () => data.subscription.unsubscribe();
    } catch (error) {
      setConfigError(
        error instanceof Error ? error.message : "No pudimos inicializar la sesión."
      );
      setLoading(false);
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  return { user, loading, configError };
}
