"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldAlert,
  LayoutDashboard,
  Megaphone,
  Users,
  Flag,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";

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
