"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BusinessCard } from "@/components/home/BusinessCard";
import { useBusinesses } from "@/lib/hooks/useBusinesses";
import { useAuthUser } from "@/lib/hooks/useAuthUser";
import { getBusinessByUser } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/client";
import { Store, PlusCircle, Radio } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { EmptyState, ListingGridSkeleton } from "@/components/ui/EmptyState";

export default function EmprendedoresPage() {
  const { businesses, loading, error, reload } = useBusinesses();
  const { user, loading: authLoading } = useAuthUser();
  const [hasStore, setHasStore] = useState<boolean | null>(null);

  React.useEffect(() => {
    let active = true;
    setHasStore(null);
    if (authLoading) return;
    if (!user) {
      setHasStore(false);
      return;
    }
    (async () => {
      try {
        const business = await getBusinessByUser(createClient(), user.id).catch(() => null);
        if (active) setHasStore(Boolean(business));
      } catch {
        if (active) setHasStore(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user, authLoading]);

  return (
    <div className="py-10 bg-gray-50/50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#1E3A5F] text-xs font-bold">
              <Store className="w-4 h-4" /> Directorio de Comercios de Capiatá
            </div>
            <h1 className="text-3xl font-black text-gray-900">
              Emprendedores y Negocios Locales
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
              Apoyá al comercio capiateño. Conocé los emprendimientos, talleres, panaderías y locales de servicios de nuestra ciudad.
            </p>
          </div>

          <div className="shrink-0 flex flex-col items-end gap-2">
            <Link
              href={user ? (hasStore ? "/dashboard/mi-tienda" : "/dashboard") : "/registro?tipo=emprendedor"}
            >
              <Button
                variant="accent"
                size="lg"
                leftIcon={user ? <Store className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
              >
                {user ? (hasStore ? "Mi Tienda" : "Abrir Mi Tienda") : "Registrar Mi Comercio"}
              </Button>
            </Link>
            {user && !hasStore && (
              <span className="text-[11px] text-gray-400">
                Tu tienda se maneja desde tu panel, no hace falta registrarte de nuevo.
              </span>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="error" onRetry={reload}>
            {error}
          </Alert>
        )}

        {/* Business Grid */}
        {loading ? (
          <ListingGridSkeleton count={6} className="md:grid-cols-2 lg:grid-cols-3" />
        ) : businesses.length > 0 ? (
          <>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Radio className="w-3.5 h-3.5 text-emerald-500" />
              <span>
                <strong>{businesses.length}</strong> comercio(s) registrado(s) en Capiatá
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {businesses.map((business) => (
                <BusinessCard key={business.id} business={business} />
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            icon={<Store className="w-12 h-12" />}
            title="Aún no hay comercios registrados"
            description="Registrá tu emprendimiento y conocé más clientes en Capiatá."
            action={
              user ? (
                <Link href="/dashboard/mi-tienda">
                  <Button variant="accent" leftIcon={<Store className="w-4 h-4" />}>
                    Abrir Mi Tienda
                  </Button>
                </Link>
              ) : (
                <Link href="/registro?tipo=emprendedor">
                  <Button variant="accent">Registrar Mi Comercio</Button>
                </Link>
              )
            }
          />
        )}
      </div>
    </div>
  );
}
