"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Megaphone, Trash2, Eye, MapPin, RefreshCw } from "lucide-react";
import { formatPrice, formatDateTime } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { getAdminListings, softDeleteListing } from "@/lib/supabase/queries";
import { toErrorMessage } from "@/lib/supabase/errors";
import type { Listing } from "@/lib/types";

export default function AdminPublicacionesPage() {
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const data = await getAdminListings(supabase);
      setItems(data);
      setError(null);
    } catch (loadError) {
      setError(toErrorMessage(loadError, "No pudimos cargar las publicaciones."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = async (listing: Listing) => {
    if (!window.confirm("¿Ocultar esta publicación de forma permanente?")) return;

    setPendingId(listing.id);
    setItems((current) => current.filter((item) => item.id !== listing.id));

    try {
      const supabase = createClient();
      await softDeleteListing(supabase, { listingId: listing.id });
      setError(null);
    } catch (deleteError) {
      setError(toErrorMessage(deleteError, "No pudimos eliminar la publicación."));
      await load();
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-700">
        <div>
          <h1 className="text-xl font-black text-white">Gestión Global de Publicaciones</h1>
          <p className="text-xs text-gray-400">
            {loading ? "Cargando..." : `Total: ${items.length} publicaciones registradas`}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="text-xs font-bold text-gray-400 hover:text-white flex items-center gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </button>
      </div>

      {error && <Alert variant="error" onRetry={load}>{error}</Alert>}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-900 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="p-10 rounded-2xl bg-gray-900 border border-gray-700 text-center space-y-2">
          <Megaphone className="w-10 h-10 text-gray-600 mx-auto" />
          <p className="text-sm font-bold text-white">No hay publicaciones registradas</p>
          <p className="text-xs text-gray-400">
            Cuando los vecinos publiquen, aparecerán acá para su moderación.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-700 rounded-2xl bg-gray-900 border border-gray-700 overflow-hidden">
          {items.map((listing) => (
            <div
              key={listing.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      listing.type === "OFFER"
                        ? "bg-[#F5B800] text-gray-950"
                        : "bg-[#1E3A5F] text-white"
                    }`}
                  >
                    {listing.type}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      listing.status === "active"
                        ? "bg-emerald-900/70 text-emerald-200"
                        : "bg-gray-700 text-gray-300"
                    }`}
                  >
                    {listing.status.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#F5B800]" />
                    {listing.neighborhood}
                  </span>
                  <span className="text-[11px] text-gray-500">
                    {formatDateTime(listing.created_at)}
                  </span>
                </div>
                <h3 className="font-bold text-white text-sm truncate">{listing.title}</h3>
                <div className="flex items-center gap-3">
                  {listing.price !== null && Number(listing.price) > 0 && (
                    <span className="text-xs font-bold text-[#F5B800]">
                      {formatPrice(Number(listing.price))}
                    </span>
                  )}
                  <span className="text-[11px] text-gray-400">
                    {listing.profile?.full_name || listing.profile?.username || "Usuario"}
                  </span>
                  <span className="text-[11px] text-gray-500">
                    {listing.views_count} vistas
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link href={`/publicacion/${listing.slug}`} target="_blank">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-300 hover:text-white"
                    leftIcon={<Eye className="w-4 h-4" />}
                  >
                    Ver
                  </Button>
                </Link>
                <button
                  onClick={() => handleDelete(listing)}
                  disabled={pendingId === listing.id}
                  className="p-2 rounded-xl text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors disabled:opacity-50"
                  title="Ocultar publicación"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
