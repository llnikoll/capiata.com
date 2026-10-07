"use client";

import React, { useState } from "react";
import { Flag, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { ReportReason } from "@/lib/types";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingTitle: string;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  listingTitle,
}) => {
  const [reason, setReason] = useState<ReportReason>("scam");
  const [description, setDescription] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      onClose();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-gray-100 space-y-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100"
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
              Estás reportando: <strong>"{listingTitle}"</strong>
            </p>

            <Select
              label="Motivo del reporte"
              value={reason}
              onChange={(e) => setReason(e.target.value as ReportReason)}
              options={[
                { value: "scam", label: "Posible estafa o engaño" },
                { value: "fake", label: "Información o precio falso" },
                { value: "prohibited", label: "Producto o servicio prohibido" },
                { value: "spam", label: "Publicación duplicada o spam" },
                { value: "offensive", label: "Contenido ofensivo o inapropiado" },
                { value: "wrong", label: "Categoría incorrecta" },
                { value: "other", label: "Otro motivo" },
              ]}
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
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancelar
              </Button>
              <Button variant="danger" size="sm" type="submit" leftIcon={<Flag className="w-4 h-4" />}>
                Enviar Reporte
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
