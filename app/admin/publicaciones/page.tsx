"use client";

import React, { useState } from "react";
import { MOCK_LISTINGS } from "@/lib/mock-data";
import { Button } from "@/components/ui/Button";
import { Megaphone, Trash2, Eye, MapPin } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";

export default function AdminPublicacionesPage() {
  const [items, setItems] = useState(MOCK_LISTINGS);

  const handleDelete = (id: string) => {
    if (confirm("¿Eliminar publicación de forma permanente?")) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-700">
        <div>
          <h1 className="text-xl font-black text-white">Gestión Global de Publicaciones</h1>
          <p className="text-xs text-gray-400">Total: {items.length} anuncios registrados</p>
        </div>
      </div>

      <div className="divide-y divide-gray-700 rounded-2xl bg-gray-900 border border-gray-700 overflow-hidden">
        {items.map((listing) => (
          <div key={listing.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    listing.type === "OFFER"
                      ? "bg-[#F5B800] text-gray-950"
                      : "bg-[#1E3A5F] text-white"
                  }`}
                >
                  {listing.type}
                </span>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#F5B800]" />
                  {listing.neighborhood}
                </span>
              </div>
              <h3 className="font-bold text-white text-sm truncate">{listing.title}</h3>
              {listing.price && (
                <span className="text-xs font-bold text-[#F5B800]">
                  {formatPrice(listing.price)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Link href={`/publicacion/${listing.slug}`} target="_blank">
                <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white" leftIcon={<Eye className="w-4 h-4" />}>
                  Ver
                </Button>
              </Link>
              <button
                onClick={() => handleDelete(listing.id)}
                className="p-2 rounded-xl text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
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
