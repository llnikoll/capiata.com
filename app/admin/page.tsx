"use client";

import React from "react";
import { Users, Megaphone, Flag, Store, CheckCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-black text-white">Resumen General de la Plataforma</h1>
        <p className="text-xs text-gray-400">
          Estadísticas en tiempo real de publicaciones, usuarios y reportes comunitarios en Capiatá.
        </p>
      </div>

      {/* Admin KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-gray-900 border border-gray-700 space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold">Usuarios Totales</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <span className="text-3xl font-black text-white">1,240</span>
          <span className="text-[11px] text-emerald-400 font-medium">+42 esta semana</span>
        </div>

        <div className="p-5 rounded-2xl bg-gray-900 border border-gray-700 space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold">Anuncios Activos</span>
            <Megaphone className="w-4 h-4 text-[#F5B800]" />
          </div>
          <span className="text-3xl font-black text-white">385</span>
          <span className="text-[11px] text-gray-400 font-medium">OFREZCO / BUSCO</span>
        </div>

        <div className="p-5 rounded-2xl bg-gray-900 border border-gray-700 space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold">Comercios Registrados</span>
            <Store className="w-4 h-4 text-purple-400" />
          </div>
          <span className="text-3xl font-black text-white">64</span>
          <span className="text-[11px] text-purple-300 font-medium">Emprendimientos Capiatá</span>
        </div>

        <div className="p-5 rounded-2xl bg-gray-900 border border-gray-700 space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold">Reportes Pendientes</span>
            <Flag className="w-4 h-4 text-red-400" />
          </div>
          <span className="text-3xl font-black text-amber-400">3</span>
          <span className="text-[11px] text-amber-300 font-medium">Requieren revisión</span>
        </div>
      </div>

      {/* Pending Action Box */}
      <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-[#F5B800] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-white text-sm">3 denuncias pendientes de revisión</h4>
            <p className="text-xs text-amber-200/80">
              Hay publicaciones reportadas por vecinos de Capiatá por posible spam o categoría errónea.
            </p>
          </div>
        </div>

        <Link href="/admin/reportes">
          <Button variant="accent" size="sm">
            Revisar Reportes
          </Button>
        </Link>
      </div>
    </div>
  );
}
