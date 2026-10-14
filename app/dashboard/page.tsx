"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Megaphone,
  Eye,
  Phone,
  Heart,
  PlusCircle,
  ArrowUpRight,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MOCK_LISTINGS } from "@/lib/mock-data";
import { formatPrice } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

type ProfileName = {
  full_name: string | null;
};

function getFirstName(name?: string | null) {
  return name?.trim().split(/\s+/)[0] || "vecino";
}

export default function DashboardPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("vecino");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle<ProfileName>();

      const metadataName =
        typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null;
      setFirstName(getFirstName(profile?.full_name || metadataName));
      setLoading(false);
    }

    loadUser();
  }, [router]);

  const userListings = MOCK_LISTINGS.slice(0, 3);
  const totalViews = userListings.reduce((sum, item) => sum + item.views_count, 0);

  if (loading) {
    return <div className="text-gray-500">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-gray-900">
            ¡Hola, {firstName}! 👋
          </h1>
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

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold">Publicaciones</span>
            <Megaphone className="w-4 h-4 text-[#1E3A5F]" />
          </div>
          <span className="text-3xl font-black text-gray-900">{userListings.length}</span>
          <span className="text-[11px] text-emerald-600 font-medium">Activas en Capiatá</span>
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
            <span className="text-xs font-semibold">Contactos WhatsApp</span>
            <Phone className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-3xl font-black text-gray-900">28</span>
          <span className="text-[11px] text-emerald-600 font-medium">Mensajes recibidos</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold">Guardados</span>
            <Heart className="w-4 h-4 text-red-500" />
          </div>
          <span className="text-3xl font-black text-gray-900">14</span>
          <span className="text-[11px] text-gray-400 font-medium">Vecinos que guardaron tus ítems</span>
        </div>
      </div>

      {/* Mis Publicaciones Recientes */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-base">Tus Anuncios Recientes</h3>
          <Link
            href="/dashboard/mis-publicaciones"
            className="text-xs font-bold text-[#1E3A5F] hover:underline flex items-center gap-0.5"
          >
            Ver todos <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-gray-100">
          {userListings.map((item) => (
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
                  <span className="text-xs text-gray-400 flex items-center gap-0.5">
                    <MapPin className="w-3 h-3 text-[#F5B800]" />
                    {item.neighborhood}
                  </span>
                </div>
                <h4 className="font-bold text-gray-900 text-sm truncate">{item.title}</h4>
                {item.price && (
                  <span className="text-xs font-black text-[#1E3A5F]">
                    {formatPrice(item.price)}
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
      </div>
    </div>
  );
}
