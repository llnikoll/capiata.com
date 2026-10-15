"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Megaphone,
  HelpCircle,
  PlusCircle,
  Trash2,
  PauseCircle,
  PlayCircle,
  MapPin,
  Eye,
  RefreshCw,
  Edit3,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatPrice, formatRelativeDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { getUserListings, softDeleteListing, updateListingStatus } from "@/lib/supabase/queries";
import { toErrorMessage } from "@/lib/supabase/errors";
import { useAuthUser } from "@/lib/hooks/useAuthUser";
import type { Listing, ListingType } from "@/lib/types";

interface MyListingsManagerProps {
  type: ListingType;
}

/**
 * Gestión real de las publicaciones del usuario: pausar/activar y eliminar
 * contra Supabase (RLS limita cada operación al dueño).
 */
export function MyListingsManager({ type }: MyListingsManagerProps) {
  const { user, loading: authLoading } = useAuthUser();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const isOffer = type === "OFFER";

  const load = useCallback(async () => {
    if (!user) {
      setLoading(authLoading);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const data = await getUserListings(supabase, user.id, type);
      setListings(data);
      setError(null);
    } catch (loadError) {
      setError(toErrorMessage(loadError, "No pudimos cargar tus publicaciones."));
    } finally {
      setLoading(false);
    }
  }, [user, authLoading, type]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleStatus = async (listing: Listing) => {
    if (!user) return;
    const nextStatus = listing.status === "active" ? "paused" : "active";

    setPendingId(listing.id);
    // Optimista: cambiamos el estado en pantalla y confirmamos contra la base.
    setListings((current) =>
      current.map((item) => (item.id === listing.id ? { ...item, status: nextStatus } : item))
    );

    try {
      const supabase = createClient();
      await updateListingStatus(supabase, {
        listingId: listing.id,
        userId: user.id,
        status: nextStatus,
      });
      setError(null);
    } catch (statusError) {
      setError(toErrorMessage(statusError, "No pudimos actualizar el estado."));
      await load();
    } finally {
      setPendingId(null);
    }
  };

  const deleteListing = async (listing: Listing) => {
    if (!user) return;
    if (!window.confirm("¿Estás seguro de eliminar este anuncio?")) return;

    setPendingId(listing.id);
    setListings((current) => current.filter((item) => item.id !== listing.id));

    try {
      const supabase = createClient();
      await softDeleteListing(supabase, { listingId: listing.id, userId: user.id });
      setError(null);
    } catch (deleteError) {
      setError(toErrorMessage(deleteError, "No pudimos eliminar el anuncio."));
      await load();
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
              isOffer
                ? "bg-[#F5B800]/15 text-gray-950 border-[#F5B800]/30"
                : "bg-[#1E3A5F]/10 text-[#1E3A5F] border-[#1E3A5F]/20"
            }`}
          >
            {isOffer ? (
              <Megaphone className="w-3.5 h-3.5 text-[#D4A000]" />
            ) : (
              <HelpCircle className="w-3.5 h-3.5 text-[#1E3A5F]" />
            )}
            <span>{isOffer ? "OFREZCO" : "BUSCO"}</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900">
            {isOffer ? "Mis Anuncios de Ofertas" : "Mis Pedidos Publicados"}
          </h1>
          <p className="text-xs text-gray-500">
            {isOffer
              ? "Administrá tus publicaciones activas o pausadas."
              : "Publicaciones donde estás buscando un producto o servicio en Capiatá."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            className="text-xs font-bold text-gray-500 hover:text-gray-800 flex items-center gap-1 px-2 py-1"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Actualizar
          </button>
          <Link href={`/crear-publicacion?tipo=${type}`}>
            <Button
              variant={isOffer ? "accent" : "primary"}
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              {isOffer ? "+ Nueva Oferta" : "+ Nuevo Pedido"}
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <Alert variant="error" onRetry={load}>
          {error}
        </Alert>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <EmptyState
          icon={
            isOffer ? <Megaphone className="w-12 h-12" /> : <HelpCircle className="w-12 h-12" />
          }
          title={isOffer ? "Todavía no publicaste ofertas" : "Todavía no publicaste pedidos"}
          description={
            isOffer
              ? "Publicá lo que ofrecés y tus vecinos te contactarán por WhatsApp."
              : "Contá qué estás buscando y la comunidad de Capiatá te ayudará."
          }
          action={
            <Link href={`/crear-publicacion?tipo=${type}`}>
              <Button variant={isOffer ? "accent" : "primary"}>
                {isOffer ? "Crear Oferta" : "Crear Pedido"}
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden divide-y divide-gray-100">
          {listings.map((item) => (
            <div
              key={item.id}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
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
                  <span className="text-xs text-gray-400 flex items-center gap-0.5">
                    <Eye className="w-3 h-3" /> {item.views_count}
                  </span>
                  <span className="text-xs text-gray-400" suppressHydrationWarning>
                    {formatRelativeDate(item.created_at)}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 text-base truncate">{item.title}</h3>
                {item.price !== null && Number(item.price) > 0 ? (
                  <span className="text-sm font-black text-[#1E3A5F]">
                    {isOffer ? formatPrice(Number(item.price)) : `Presupuesto: ${formatPrice(Number(item.price))}`}
                  </span>
                ) : (
                  !isOffer && (
                    <span className="text-xs font-medium text-gray-400">Presupuesto a convenir</span>
                  )
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Link href={`/publicacion/${item.slug}`}>
                  <Button variant="ghost" size="sm">
                    Ver
                  </Button>
                </Link>

                <Link href={`/dashboard/editar-publicacion?id=${item.id}`}>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Edit3 className="w-4 h-4 text-[#1E3A5F]" />}
                  >
                    Editar
                  </Button>
                </Link>

                <Button
                  variant="outline"
                  size="sm"
                  isLoading={pendingId === item.id}
                  onClick={() => toggleStatus(item)}
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

                <button
                  onClick={() => deleteListing(item)}
                  disabled={pendingId === item.id}
                  className="p-2 rounded-xl text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                  title="Eliminar"
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
