"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Megaphone,
  Eye,
  Heart,
  PlusCircle,
  ArrowUpRight,
  MapPin,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatPrice } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { getFavorites, getProfile, getReceivedFavoritesCount, getUserListings } from "@/lib/supabase/queries";
import { toErrorMessage } from "@/lib/supabase/errors";
import { useAuthUser } from "@/lib/hooks/useAuthUser";
import type { Listing } from "@/lib/types";

function getFirstName(name?: string | null) {
  return name?.trim().split(/\s+/)[0] || "vecino";
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuthUser();
  const [firstName, setFirstName] = useState("vecino");
  const [userListings, setUserListings] = useState<Listing[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [receivedCount, setReceivedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) {
      setLoading(authLoading);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const [profile, listings, favorites, received] = await Promise.all([
        getProfile(supabase, user.id),
        getUserListings(supabase, user.id),
        getFavorites(supabase, user.id),
        getReceivedFavoritesCount(supabase, user.id),
      ]);

      const metadataName =
        typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null;

      setFirstName(getFirstName(profile?.full_name || metadataName));
      setUserListings(listings);
      setSavedCount(favorites.length);
      setReceivedCount(received);
    } catch (loadError) {
      setError(toErrorMessage(loadError, "No pudimos cargar tu panel."));
    } finally {
      setLoading(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const totalViews = userListings.reduce((sum, item) => sum + (item.views_count || 0), 0);
  const activeListings = userListings.filter((item) => item.status === "active").length;

  if (loading) {
    return <div className="text-gray-500 text-sm">Cargando tu panel...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-gray-900">¡Hola, {firstName}! 👋</h1>
          <p className="text-xs text-gray-500">
            Bienvenido a tu panel de Capiatá Conecta. Acá podés administrar tus anuncios y pedidos.
          </p>
        </div>

        <Link href="/crear-publicacion">
          <Button variant="accent" leftIcon={<PlusCircle className="w-4 h-4" />}>
            Crear Publicación
          </Button>
        </Link>
      </div>

      {error && (
        <Alert variant="error" onRetry={loadData}>
          {error}
        </Alert>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold">Publicaciones</span>
            <Megaphone className="w-4 h-4 text-[#1E3A5F]" />
          </div>
          <span className="text-3xl font-black text-gray-900">{userListings.length}</span>
          <span className="text-[11px] text-emerald-600 font-medium">
            {activeListings} activa(s) en Capiatá
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold">Visualizaciones</span>
            <Eye className="w-4 h-4 text-blue-500" />
          </div>
          <span className="text-3xl font-black text-gray-900">{totalViews}</span>
          <span className="text-[11px] text-gray-400 font-medium">Total de vistas acumuladas</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold">Favoritos recibidos</span>
            <Heart className="w-4 h-4 text-red-500" />
          </div>
          <span className="text-3xl font-black text-gray-900">{receivedCount}</span>
          <span className="text-[11px] text-gray-400 font-medium">
            Vecinos que guardaron tus ítems
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold">Mis guardados</span>
            <Heart className="w-4 h-4 text-[#F5B800]" />
          </div>
          <span className="text-3xl font-black text-gray-900">{savedCount}</span>
          <Link
            href="/dashboard/favoritos"
            className="text-[11px] text-[#1E3A5F] font-bold hover:underline"
          >
            Ver mis favoritos
          </Link>
        </div>
      </div>

      {/* Mis Publicaciones Recientes */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-base">Tus Anuncios Recientes</h3>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadData}
              className="text-xs font-bold text-gray-500 hover:text-gray-800 flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Actualizar
            </button>
            <Link
              href="/dashboard/mis-publicaciones"
              className="text-xs font-bold text-[#1E3A5F] hover:underline flex items-center gap-0.5"
            >
              Ver todos <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {userListings.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {userListings.slice(0, 5).map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        item.type === "OFFER"
                          ? "bg-[#F5B800] text-gray-950"
                          : "bg-[#1E3A5F] text-white"
                      }`}
                    >
                      {item.type}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        item.status === "active"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {item.status === "active" ? "ACTIVA" : item.status === "paused" ? "PAUSADA" : "PENDIENTE"}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-0.5">
                      <MapPin className="w-3 h-3 text-[#F5B800]" />
                      {item.neighborhood}
                    </span>
                  </div>
                  <h4 className="font-bold text-gray-900 text-sm truncate">{item.title}</h4>
                  {item.price !== null && Number(item.price) > 0 && (
                    <span className="text-xs font-black text-[#1E3A5F]">
                      {formatPrice(Number(item.price))}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/publicacion/${item.slug}`}>
                    <Button variant="outline" size="sm">
                      Ver anuncio
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Megaphone className="w-12 h-12" />}
            title="Aún no tenés publicaciones"
            description="Creá tu primer anuncio para empezar a conectar con tus vecinos."
            action={
              <Link href="/crear-publicacion">
                <Button variant="accent" size="sm">
                  Crear Publicación
                </Button>
              </Link>
            }
            className="border-0 p-8"
          />
        )}
      </div>
    </div>
  );
}
