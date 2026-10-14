"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Users, Megaphone, Flag, Store, AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { createClient } from "@/lib/supabase/client";
import { getAdminReports, getAdminStats } from "@/lib/supabase/queries";
import { toErrorMessage } from "@/lib/supabase/errors";
import { formatDateTime } from "@/lib/utils";
import type { AdminStats, ReportWithRelations } from "@/lib/types";

const EMPTY_STATS: AdminStats = { users: 0, listings: 0, businesses: 0, pendingReports: 0 };

const REASON_LABELS: Record<string, string> = {
  scam: "Posible estafa",
  fake: "Información falsa",
  prohibited: "Producto prohibido",
  spam: "Spam o duplicado",
  offensive: "Contenido ofensivo",
  wrong: "Categoría incorrecta",
  other: "Otro motivo",
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats>(EMPTY_STATS);
  const [pending, setPending] = useState<ReportWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const [statsData, reports] = await Promise.all([
        getAdminStats(supabase),
        getAdminReports(supabase),
      ]);

      setStats(statsData);
      setPending(reports.filter((report) => report.status === "pending").slice(0, 5));
      setError(null);
    } catch (loadError) {
      setError(toErrorMessage(loadError, "No pudimos cargar las estadísticas del panel."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-white">Resumen General de la Plataforma</h1>
          <p className="text-xs text-gray-400">
            Estadísticas reales de publicaciones, usuarios y reportes comunitarios en Capiatá.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="text-xs font-bold text-gray-400 hover:text-white flex items-center gap-1 self-start"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </button>
      </div>

      {error && <Alert variant="error" onRetry={load}>{error}</Alert>}

      {/* Admin KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-gray-900 border border-gray-700 space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold">Usuarios Totales</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <span className="text-3xl font-black text-white">
            {loading ? "…" : stats.users}
          </span>
          <span className="text-[11px] text-gray-400 font-medium">Perfiles registrados</span>
        </div>

        <div className="p-5 rounded-2xl bg-gray-900 border border-gray-700 space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold">Publicaciones</span>
            <Megaphone className="w-4 h-4 text-[#F5B800]" />
          </div>
          <span className="text-3xl font-black text-white">
            {loading ? "…" : stats.listings}
          </span>
          <span className="text-[11px] text-gray-400 font-medium">OFREZCO / BUSCO activas</span>
        </div>

        <div className="p-5 rounded-2xl bg-gray-900 border border-gray-700 space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold">Comercios Registrados</span>
            <Store className="w-4 h-4 text-purple-400" />
          </div>
          <span className="text-3xl font-black text-white">
            {loading ? "…" : stats.businesses}
          </span>
          <span className="text-[11px] text-purple-300 font-medium">Emprendimientos Capiatá</span>
        </div>

        <div className="p-5 rounded-2xl bg-gray-900 border border-gray-700 space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold">Reportes Pendientes</span>
            <Flag className="w-4 h-4 text-red-400" />
          </div>
          <span className="text-3xl font-black text-amber-400">
            {loading ? "…" : stats.pendingReports}
          </span>
          <span className="text-[11px] text-amber-300 font-medium">Requieren revisión</span>
        </div>
      </div>

      {/* Pending Action Box */}
      {stats.pendingReports > 0 && (
        <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-[#F5B800] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-white text-sm">
                {stats.pendingReports} denuncia(s) pendiente(s) de revisión
              </h4>
              <p className="text-xs text-amber-200/80">
                Publicaciones reportadas por vecinos de Capiatá que esperan moderación.
              </p>
            </div>
          </div>

          <Link href="/admin/reportes">
            <Button variant="accent" size="sm">
              Revisar Reportes
            </Button>
          </Link>
        </div>
      )}

      {/* Recent pending reports */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-white">Últimas denuncias pendientes</h2>

        {loading ? (
          <div className="h-24 bg-gray-900 rounded-2xl animate-pulse" />
        ) : pending.length === 0 ? (
          <div className="p-6 rounded-2xl bg-gray-900 border border-gray-700 text-xs text-gray-400">
            No hay denuncias pendientes. La comunidad está al día. ✅
          </div>
        ) : (
          <div className="divide-y divide-gray-700 rounded-2xl bg-gray-900 border border-gray-700 overflow-hidden">
            {pending.map((report) => (
              <div key={report.id} className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-900/80 text-red-200">
                      {REASON_LABELS[report.reason] ?? report.reason}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {formatDateTime(report.created_at)}
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-sm truncate">
                    {report.listing?.title ?? "Publicación eliminada"}
                  </h3>
                </div>
                <Link href="/admin/reportes" className="shrink-0">
                  <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                    Revisar
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
