"use client";

import React, { useState } from "react";
import Link from "next/link";
import { HelpCircle, PlusCircle, Edit3, Trash2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MOCK_LISTINGS } from "@/lib/mock-data";
import { formatPrice } from "@/lib/utils";

export default function MisPedidosPage() {
  const [requests, setRequests] = useState(
    MOCK_LISTINGS.filter((item) => item.type === "REQUEST")
  );

  const deleteRequest = (id: string) => {
    if (confirm("¿Estás seguro de eliminar este pedido?")) {
      setRequests((prev) => prev.filter((item) => item.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1E3A5F]/10 text-[#1E3A5F] text-xs font-bold border border-[#1E3A5F]/20">
            <HelpCircle className="w-3.5 h-3.5 text-[#1E3A5F]" />
            <span>BUSCO</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900">
            Mis Pedidos Publicados
          </h1>
          <p className="text-xs text-gray-500">
            Publicaciones donde estás buscando un producto o servicio en Capiatá.
          </p>
        </div>

        <Link href="/crear-publicacion?tipo=REQUEST">
          <Button variant="primary" leftIcon={<PlusCircle className="w-4 h-4" />}>
            + Nuevo Pedido
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden divide-y divide-gray-100">
        {requests.map((item) => (
          <div key={item.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-[#1E3A5F]">
                  BUSCO
                </span>
                <span className="text-xs text-gray-400 flex items-center gap-0.5">
                  <MapPin className="w-3 h-3 text-[#F5B800]" />
                  {item.neighborhood}
                </span>
              </div>
              <h3 className="font-bold text-gray-900 text-base">{item.title}</h3>
              {item.price ? (
                <span className="text-sm font-black text-[#1E3A5F]">
                  Presupuesto: {formatPrice(item.price)}
                </span>
              ) : (
                <span className="text-xs font-medium text-gray-400">Presupuesto a convenir</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => alert("Editar pedido...")}
                leftIcon={<Edit3 className="w-4 h-4" />}
              >
                Editar
              </Button>

              <button
                onClick={() => deleteRequest(item.id)}
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
