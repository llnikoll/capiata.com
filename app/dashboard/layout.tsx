"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";

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
    name: "Mi Perfil / Comercio",
    href: "/dashboard/mi-cuenta",
    icon: User,
  },
  {
    name: "Configuración",
    href: "/dashboard/configuracion",
    icon: Settings,
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50/70 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Sidebar (Desktop) */}
          <aside className="lg:col-span-3 bg-white rounded-3xl border border-gray-100 p-5 shadow-xs space-y-6">
            {/* User Info Card */}
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <Avatar name="Juan Pérez" size="lg" />
              <div className="flex flex-col min-w-0">
                <h4 className="font-bold text-gray-900 text-sm truncate">Juan Pérez</h4>
                <span className="text-[11px] text-gray-500 truncate">juan.perez@ejemplo.com</span>
                <span className="inline-block bg-blue-50 text-[#1E3A5F] text-[10px] font-bold px-2 py-0.5 rounded-md mt-1 w-fit">
                  Vecino de Capiatá
                </span>
              </div>
            </div>

            {/* Nav List */}
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

            {/* Quick Action & Logout */}
            <div className="pt-4 border-t border-gray-100 space-y-2">
              <Link href="/crear-publicacion">
                <Button
                  variant="accent"
                  size="sm"
                  className="w-full justify-center shadow-xs"
                  leftIcon={<PlusCircle className="w-4 h-4" />}
                >
                  + Publicar Gratis
                </Button>
              </Link>

              <Link href="/login">
                <button className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors">
                  <LogOut className="w-4 h-4" /> Cerrar Sesión
                </button>
              </Link>
            </div>
          </aside>

          {/* Main Dashboard Content */}
          <main className="lg:col-span-9 space-y-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
