"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Flag, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { REPORT_REASONS, type ReportReason } from "@/lib/types";
import { reportFormSchema, validateForm } from "@/lib/validation";
import { createClient } from "@/lib/supabase/client";
import { createReport } from "@/lib/supabase/queries";
import { toErrorMessage } from "@/lib/supabase/errors";
import { useAuthUser } from "@/lib/hooks/useAuthUser";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  listingTitle: string;
}

/**
 * Envía una denuncia real a la tabla public.reports (requiere sesión, según RLS).
 */
export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  listingId,
  listingTitle,
}) => {
  const { user } = useAuthUser();
  const [reason, setReason] = useState<ReportReason>("scam");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const reset = () => {
    setReason("scam");
    setDescription("");
    setError(null);
    setIsSubmitted(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError("Necesitás iniciar sesión para reportar una publicación.");
      return;
    }

    const parsed = validateForm(reportFormSchema, { reason, description });
    if (!parsed.success) {
      setError(Object.values(parsed.errors)[0] ?? "Revisá los datos del reporte.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createReport(createClient(), {
        reporterId: user.id,
        listingId,
        reason: parsed.data.reason,
        description: parsed.data.description.trim() || null,
      });
      setIsSubmitted(true);
      setTimeout(() => {
        reset();
        onClose();
      }, 2500);
    } catch (submitError) {
      setError(toErrorMessage(submitError, "No pudimos enviar el reporte."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-gray-100 space-y-4 relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        {isSubmitted ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="font-bold text-gray-900 text-lg">Reporte Recibido</h3>
            <p className="text-xs text-gray-500">
              Gracias por ayudar a mantener segura la comunidad de Capiatá Conecta. Revisaremos la publicación a la brevedad.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
              <AlertTriangle className="w-5 h-5" /> Reportar Publicación
            </div>

            <p className="text-xs text-gray-600">
              Estás reportando: <strong>{listingTitle}</strong>
            </p>

            {error && (
              <Alert variant="error">
                {error}
                {!user && (
                  <>
                    {" "}
                    <Link href="/login" className="font-bold underline">
                      Iniciar sesión
                    </Link>
                  </>
                )}
              </Alert>
            )}

            <Select
              label="Motivo del reporte"
              value={reason}
              onChange={(e) => setReason(e.target.value as ReportReason)}
              options={REPORT_REASONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
            />

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">
                Detalles adicionales (opcional)
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explicá brevemente por qué reportás esta publicación..."
                className="w-full rounded-xl border border-gray-200 p-3 text-xs focus:ring-2 focus:ring-[#1E3A5F] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="sm"
                type="submit"
                isLoading={isSubmitting}
                leftIcon={<Flag className="w-4 h-4" />}
              >
                Enviar Reporte
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
