"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

type ProfileData = {
  full_name: string | null;
  avatar_url: string | null;
  user_type: string;
  neighborhood: string | null;
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = React.useState<any>(null);
  const [profile, setProfile] = React.useState<ProfileData | null>(null);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setUser(user);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, user_type, neighborhood")
        .eq("id", user.id)
        .maybeSingle<ProfileData>();

      setProfile(profile);
      setLoading(false);
    }

    loadUser();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/70 flex items-center justify-center">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  }

  return (
    <DashboardShell user={user} profile={profile}>
      {children}
    </DashboardShell>
  );
}
