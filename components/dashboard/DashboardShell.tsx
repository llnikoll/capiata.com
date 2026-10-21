"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Megaphone,
  HelpCircle,
  Heart,
  User,
  Settings,
  PlusCircle,
  LogOut,
  ChevronRight,
  MessageSquare,
  Store,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

type ProfileData = {
  full_name: string | null;
  avatar_url: string | null;
  user_type: string;
  neighborhood: string | null;
  is_blocked?: boolean;
};

const sidebarLinks = [
  {
    name: "Inicio",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Mis Publicaciones (OFREZCO)",
    href: "/dashboard/mis-publicaciones",
    icon: Megaphone,
  },
  {
    name: "Mis Pedidos (BUSCO)",
    href: "/dashboard/mis-pedidos",
    icon: HelpCircle,
  },
  {
    name: "Mis Favoritos",
    href: "/dashboard/favoritos",
    icon: Heart,
  },
  {
    name: "Mensajes",
    href: "/dashboard/mensajes",
    icon: MessageSquare,
  },
  {
    name: "Mi Tienda Online",
    href: "/dashboard/mi-tienda",
    icon: Store,
  },
  {
    name: "Mi Perfil",
    href: "/dashboard/mi-cuenta",
    icon: User,
  },
  {
    name: "Configuración",
    href: "/dashboard/configuracion",
    icon: Settings,
  },
];

type DashboardShellProps = {
  children: React.ReactNode;
  user: Pick<SupabaseUser, "email" | "user_metadata">;
  profile: ProfileData | null;
  profileError?: string | null;
};

export function DashboardShell({
  children,
  user,
  profile,
  profileError,
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const displayName =
    profile?.full_name || user.user_metadata?.full_name || user.email || "Usuario";
  const neighborhood =
    profile?.neighborhood || user.user_metadata?.neighborhood || "Capiatá";
  const userType = profile?.user_type || user.user_metadata?.user_type || "person";
  const accountLabel =
    userType === "business" ? "Emprendimiento de Capiatá" : `Vecino de ${neighborhood}`;

  const handleSignOut = async () => {
    setIsSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gray-50/70 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <aside className="lg:col-span-3 bg-white rounded-3xl border border-gray-100 p-5 shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <Avatar src={profile?.avatar_url} name={displayName} size="lg" />
              <div className="flex flex-col min-w-0">
                <h4 className="font-bold text-gray-900 text-sm truncate">{displayName}</h4>
                <span className="text-[11px] text-gray-500 truncate">{user.email}</span>
                <span className="inline-block bg-blue-50 text-[#1E3A5F] text-[10px] font-bold px-2 py-0.5 rounded-md mt-1 w-fit">
                  {accountLabel}
                </span>
              </div>
            </div>

            <nav className="space-y-1">
              {sidebarLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? "bg-[#1E3A5F] text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? "text-[#F5B800]" : "text-gray-400"}`} />
                      <span>{link.name}</span>
                    </div>
                    {isActive && <ChevronRight className="w-4 h-4 text-white/60" />}
                  </Link>
                );
              })}
            </nav>

            {profileError && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900">
                {profileError}
              </div>
            )}

            <div className="pt-4 border-t border-gray-100 space-y-2">
              <Link href="/crear-publicacion">
                <Button
                  variant="accent"
                  size="sm"
                  className="w-full justify-center shadow-xs"
                  leftIcon={<PlusCircle className="w-4 h-4" />}
                >
                  Publicar Gratis
                </Button>
              </Link>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <LogOut className="w-4 h-4" />
                {isSigningOut ? "Cerrando..." : "Cerrar Sesión"}
              </button>
            </div>
          </aside>

          <main className="lg:col-span-9 space-y-6">
            {profile?.is_blocked && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">
                <strong>Tu cuenta está bloqueada.</strong> No podés publicar ni editar
                publicaciones hasta que un administrador la revise. Tus anuncios publicados
                siguen visibles.
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
