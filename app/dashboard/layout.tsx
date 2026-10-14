"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useAuthUser } from "@/lib/hooks/useAuthUser";
import { createClient } from "@/lib/supabase/client";
import { getProfile } from "@/lib/supabase/queries";
import type { Profile } from "@/lib/types";
import { Alert } from "@/components/ui/Alert";

/**
 * Layout del área privada. Verifica la sesión y carga el perfil real del
 * usuario para mostrarlo en la barra lateral de todo el panel.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading: authLoading, configError } = useAuthUser();
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = React.useState(true);
  const [profileError, setProfileError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!authLoading && !configError && !user) {
      router.replace("/login?redirect=/dashboard");
    }
  }, [authLoading, configError, user, router]);

  React.useEffect(() => {
    if (!user) {
      setProfileLoading(authLoading);
      return;
    }

    let active = true;

    (async () => {
      try {
        const supabase = createClient();
        const data = await getProfile(supabase, user.id);
        if (!active) return;
        setProfile(data);
        setProfileError(
          data ? null : "Tu perfil todavía no está creado. Cerrá sesión y volvé a ingresar."
        );
      } catch (error) {
        if (!active) return;
        setProfileError(
          error instanceof Error ? error.message : "No pudimos cargar tu perfil."
        );
      } finally {
        if (active) setProfileLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [user, authLoading]);

  if (configError) {
    return (
      <div className="min-h-screen bg-gray-50/70 flex items-center justify-center p-6">
        <div className="max-w-lg w-full">
          <Alert variant="error">{configError}</Alert>
        </div>
      </div>
    );
  }

  if (authLoading || (user && profileLoading)) {
    return (
      <div className="min-h-screen bg-gray-50/70 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Cargando tu panel...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50/70 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Redirigiendo al inicio de sesión...</div>
      </div>
    );
  }

  return (
    <DashboardShell user={user} profile={profile} profileError={profileError}>
      {children}
    </DashboardShell>
  );
}
