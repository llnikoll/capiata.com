"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Megaphone, PlusCircle, Edit3, Trash2, PauseCircle, PlayCircle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MOCK_LISTINGS } from "@/lib/mock-data";
import { formatPrice } from "@/lib/utils";

export default function MisPublicacionesPage() {
  const [listings, setListings] = useState(
    MOCK_LISTINGS.filter((item) => item.type === "OFFER")
  );

  const toggleStatus = (id: string) => {
    setListings((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: item.status === "active" ? "paused" : "active" }
          : item
      )
    );
  };

  const deleteListing = (id: string) => {
    if (confirm("¿Estás seguro de eliminar este anuncio?")) {
      setListings((prev) => prev.filter((item) => item.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F5B800]/15 text-gray-950 text-xs font-bold border border-[#F5B800]/30">
            <Megaphone className="w-3.5 h-3.5 text-[#D4A000]" />
            <span>OFREZCO</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900">
            Mis Anuncios de Ofertas
          </h1>
          <p className="text-xs text-gray-500">
            Administrá tus publicaciones activas o pausadas.
          </p>
        </div>

        <Link href="/crear-publicacion?tipo=OFFER">
          <Button variant="accent" leftIcon={<PlusCircle className="w-4 h-4" />}>
            + Nueva Oferta
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden divide-y divide-gray-100">
        {listings.map((item) => (
          <div key={item.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    item.status === "active"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {item.status === "active" ? "ACTIVA" : "PAUSADA"}
                </span>
                <span className="text-xs text-gray-400 flex items-center gap-0.5">
                  <MapPin className="w-3 h-3 text-[#F5B800]" />
                  {item.neighborhood}
                </span>
              </div>
              <h3 className="font-bold text-gray-900 text-base">{item.title}</h3>
              {item.price && (
                <span className="text-sm font-black text-[#1E3A5F]">
                  {formatPrice(item.price)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleStatus(item.id)}
                leftIcon={
                  item.status === "active" ? (
                    <PauseCircle className="w-4 h-4 text-amber-600" />
                  ) : (
                    <PlayCircle className="w-4 h-4 text-emerald-600" />
                  )
                }
              >
                {item.status === "active" ? "Pausar" : "Activar"}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => alert("Editar publicación...")}
                leftIcon={<Edit3 className="w-4 h-4" />}
              >
                Editar
              </Button>

              <button
                onClick={() => deleteListing(item.id)}
                className="p-2 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
