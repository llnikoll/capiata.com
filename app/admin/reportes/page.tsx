"use client";

import React, { useState } from "react";
import { Flag, CheckCircle2, Trash2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ReportItem {
  id: string;
  listingTitle: string;
  reason: string;
  reporter: string;
  date: string;
  status: "pending" | "resolved";
}

const INITIAL_REPORTS: ReportItem[] = [
  {
    id: "r-1",
    listingTitle: "Venta de Vapores y Cigarrillos Electrónicos",
    reason: "Producto prohibido",
    reporter: "vecino_123",
    date: "Hace 2 horas",
    status: "pending",
  },
  {
    id: "r-2",
    listingTitle: "Moto Taiga sin Cédula Verde ni Papeles",
    reason: "Información o precio falso",
    reporter: "mariag",
    date: "Hace 5 horas",
    status: "pending",
  },
  {
    id: "r-3",
    listingTitle: "Prestamos Personales Inmediatos sin Requisitos",
    reason: "Posible estafa o engaño",
    reporter: "carlos_cap",
    date: "Ayer",
    status: "pending",
  },
];

export default function AdminReportesPage() {
  const [reports, setReports] = useState(INITIAL_REPORTS);

  const resolveReport = (id: string) => {
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "resolved" } : r))
    );
  };

  const deleteListingAndResolve = (id: string) => {
    if (confirm("¿Eliminar la publicación denunciada y resolver reporte?")) {
      setReports((prev) => prev.filter((r) => r.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-700">
        <div>
          <h1 className="text-xl font-black text-white">Denuncias y Moderación de Anuncios</h1>
          <p className="text-xs text-gray-400">Revisión comunitaria de publicaciones reportadas</p>
        </div>
      </div>

      <div className="divide-y divide-gray-700 rounded-2xl bg-gray-900 border border-gray-700 overflow-hidden">
        {reports.map((report) => (
          <div key={report.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-900/80 text-red-200 flex items-center gap-1">
                  <Flag className="w-3 h-3" /> {report.reason}
                </span>
                <span className="text-xs text-gray-400">{report.date}</span>
              </div>
              <h3 className="font-bold text-white text-base">{report.listingTitle}</h3>
              <p className="text-xs text-gray-400">
                Reportado por: <span className="text-gray-300 font-semibold">{report.reporter}</span>
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => resolveReport(report.id)}
                className="text-gray-300 border-gray-600 hover:bg-gray-800"
                leftIcon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              >
                {report.status === "resolved" ? "Resuelto" : "Desestimar"}
              </Button>

              <Button
                variant="danger"
                size="sm"
                onClick={() => deleteListingAndResolve(report.id)}
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                Eliminar Anuncio
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
