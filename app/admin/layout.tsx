"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShieldAlert,
  LayoutDashboard,
  Megaphone,
  Users,
  Flag,
  ArrowLeft,
  Lock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuthUser } from "@/lib/hooks/useAuthUser";
import { Alert } from "@/components/ui/Alert";

const adminNav = [
  { name: "Resumen Admin", href: "/admin", icon: LayoutDashboard },
  { name: "Publicaciones", href: "/admin/publicaciones", icon: Megaphone },
  { name: "Usuarios y Negocios", href: "/admin/usuarios", icon: Users },
  { name: "Reportes Pendientes", href: "/admin/reportes", icon: Flag },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading, configError } = useAuthUser();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !configError && !user) {
      router.replace("/login?redirect=/admin");
    }
  }, [authLoading, configError, user, router]);

  useEffect(() => {
    if (!user) {
      if (!authLoading) setIsAdmin(false);
      return;
    }

    let active = true;

    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .maybeSingle();

        if (!active) return;

        if (error) {
          setCheckError(
            "No pudimos verificar tu rol de administrador. Verificá que la migración 004 esté aplicada en Supabase."
          );
          setIsAdmin(false);
          return;
        }

        setIsAdmin(Boolean(data?.is_admin));
      } catch {
        if (active) {
          setCheckError("No pudimos verificar tu rol de administrador.");
          setIsAdmin(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [user, authLoading]);

  if (configError) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <div className="max-w-lg w-full">
          <Alert variant="error">{configError}</Alert>
        </div>
      </div>
    );
  }

  if (authLoading || (user && isAdmin === null)) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-300 text-sm">
        Verificando permisos de administrador...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-300 text-sm">
        Redirigiendo al inicio de sesión...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-gray-800 border border-gray-700 rounded-3xl p-8 space-y-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-600 text-white flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-black text-white">Acceso restringido</h1>
          <p className="text-xs text-gray-400">
            Esta sección es exclusiva para administradores de Capiatá Conecta. Tu cuenta no tiene
            el rol <code className="text-amber-400">is_admin</code> habilitado.
          </p>
          {checkError && (
            <div className="text-left">
              <Alert variant="error">{checkError}</Alert>
            </div>
          )}
          <div className="text-left bg-gray-900 border border-gray-700 rounded-2xl p-4">
            <p className="text-[11px] text-gray-400 mb-2">
              Para habilitar un administrador, ejecutá en el SQL Editor de Supabase:
            </p>
            <pre className="text-[11px] text-emerald-300 overflow-x-auto">
{`update public.profiles
set is_admin = true
where id = '${user.id}';`}
            </pre>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Volver a mi panel
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-black">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-black text-xl text-white">
                Panel de Administración Capiatá Conecta
              </h2>
              <span className="text-xs text-amber-400 font-semibold">
                Acceso Administrador — Moderación Global
              </span>
            </div>
          </div>

          <Link
            href="/"
            className="text-xs font-bold text-gray-400 hover:text-white flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al Sitio
          </Link>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {adminNav.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? "bg-[#F5B800] text-gray-950 shadow-md"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Admin Content */}
        <main className="bg-gray-800/80 rounded-3xl p-6 sm:p-8 border border-gray-700 shadow-xl">
          {children}
        </main>
      </div>
    </div>
  );
}
