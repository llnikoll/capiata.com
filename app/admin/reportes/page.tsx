"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Flag, CheckCircle2, Trash2, RefreshCw, Eye } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { createClient } from "@/lib/supabase/client";
import { getAdminReports, softDeleteListing, updateReportStatus } from "@/lib/supabase/queries";
import { toErrorMessage } from "@/lib/supabase/errors";
import { formatDateTime } from "@/lib/utils";
import { REPORT_REASONS, type ReportWithRelations } from "@/lib/types";

const REASON_LABELS: Record<string, string> = Object.fromEntries(
  REPORT_REASONS.map((reason) => [reason.value, reason.label])
);

type StatusFilter = "pending" | "all";

export default function AdminReportesPage() {
  const [reports, setReports] = useState<ReportWithRelations[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const data = await getAdminReports(supabase);
      setReports(data);
      setError(null);
    } catch (loadError) {
      setError(toErrorMessage(loadError, "No pudimos cargar los reportes."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resolveReport = async (report: ReportWithRelations, status: "resolved" | "reviewed") => {
    setPendingId(report.id);
    setReports((current) =>
      current.map((item) => (item.id === report.id ? { ...item, status } : item))
    );

    try {
      const supabase = createClient();
      await updateReportStatus(supabase, report.id, status);
      setError(null);
    } catch (updateError) {
      setError(toErrorMessage(updateError, "No pudimos actualizar el reporte."));
      await load();
    } finally {
      setPendingId(null);
    }
  };

  const deleteListingAndResolve = async (report: ReportWithRelations) => {
    if (!window.confirm("¿Eliminar la publicación denunciada y resolver el reporte?")) return;

    setPendingId(report.id);

    try {
      const supabase = createClient();
      await softDeleteListing(supabase, { listingId: report.listing_id });
      await updateReportStatus(supabase, report.id, "resolved");
      setReports((current) =>
        current.map((item) => (item.id === report.id ? { ...item, status: "resolved" } : item))
      );
      setError(null);
    } catch (deleteError) {
      setError(toErrorMessage(deleteError, "No pudimos eliminar la publicación denunciada."));
      await load();
    } finally {
      setPendingId(null);
    }
  };

  const visible = filter === "pending" ? reports.filter((r) => r.status === "pending") : reports;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-700">
        <div>
          <h1 className="text-xl font-black text-white">Denuncias y Moderación de Anuncios</h1>
          <p className="text-xs text-gray-400">
            Revisión comunitaria de publicaciones reportadas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter("pending")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              filter === "pending"
                ? "bg-[#F5B800] text-gray-950"
                : "bg-gray-900 text-gray-300 hover:bg-gray-700"
            }`}
          >
            Pendientes ({reports.filter((r) => r.status === "pending").length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              filter === "all"
                ? "bg-[#F5B800] text-gray-950"
                : "bg-gray-900 text-gray-300 hover:bg-gray-700"
            }`}
          >
            Todos ({reports.length})
          </button>
          <button
            type="button"
            onClick={load}
            className="text-xs font-bold text-gray-400 hover:text-white flex items-center gap-1 px-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {error && <Alert variant="error" onRetry={load}>{error}</Alert>}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-900 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="p-10 rounded-2xl bg-gray-900 border border-gray-700 text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <p className="text-sm font-bold text-white">
            {filter === "pending" ? "No hay denuncias pendientes" : "Todavía no hay denuncias"}
          </p>
          <p className="text-xs text-gray-400">
            Las publicaciones reportadas por los vecinos aparecerán en esta lista.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-700 rounded-2xl bg-gray-900 border border-gray-700 overflow-hidden">
          {visible.map((report) => (
            <div
              key={report.id}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-900/80 text-red-200 flex items-center gap-1">
                    <Flag className="w-3 h-3" /> {REASON_LABELS[report.reason] ?? report.reason}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      report.status === "pending"
                        ? "bg-amber-900/80 text-amber-200"
                        : "bg-emerald-900/80 text-emerald-200"
                    }`}
                  >
                    {report.status === "pending" ? "PENDIENTE" : "RESUELTO"}
                  </span>
                  <span className="text-[11px] text-gray-500">
                    {formatDateTime(report.created_at)}
                  </span>
                </div>

                <h3 className="font-bold text-white text-base truncate">
                  {report.listing?.title ?? "Publicación no disponible"}
                </h3>

                {report.description && (
                  <p className="text-xs text-gray-300 line-clamp-2">{report.description}</p>
                )}

                <p className="text-xs text-gray-400">
                  Reportado por:{" "}
                  <span className="text-gray-300 font-semibold">
                    {report.reporter?.full_name || report.reporter?.username || "Usuario"}
                  </span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {report.listing?.slug && (
                  <Link href={`/publicacion/${report.listing.slug}`} target="_blank">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-300 hover:text-white"
                      leftIcon={<Eye className="w-4 h-4" />}
                    >
                      Ver
                    </Button>
                  </Link>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  isLoading={pendingId === report.id}
                  disabled={report.status !== "pending"}
                  onClick={() => resolveReport(report, "reviewed")}
                  className="text-gray-300 border-gray-600 hover:bg-gray-800"
                  leftIcon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                >
                  Desestimar
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  isLoading={pendingId === report.id}
                  onClick={() => deleteListingAndResolve(report)}
                  leftIcon={<Trash2 className="w-4 h-4" />}
                >
                  Eliminar Anuncio
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
