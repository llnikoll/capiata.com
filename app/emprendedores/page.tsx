"use client";

import React, { useEffect, useState } from "react";
import { BusinessCard } from "@/components/home/BusinessCard";
import { getBusinesses } from "@/lib/supabase/queries";
import { Store, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { Business } from "@/lib/types";

export default function EmprendedoresPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBusinesses() {
      const data = await getBusinesses();
      setBusinesses(data);
      setLoading(false);
    }
    loadBusinesses();
  }, []);

  return (
    <div className="py-10 bg-gray-50/50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#1E3A5F] text-xs font-bold">
              <Store className="w-4 h-4" /> Directoria de Comercios de Capiatá
            </div>
            <h1 className="text-3xl font-black text-gray-900">
              Emprendedores y Negocios Locales
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
              Apoyá al comercio capiateño. Conocé los emprendimientos, talleres, panaderías y locales de servicios de nuestra ciudad.
            </p>
          </div>

          <Link href="/registro?tipo=emprendedor" className="shrink-0">
            <Button variant="accent" size="lg" leftIcon={<PlusCircle className="w-5 h-5" />}>
              Registrar Mi Comercio
            </Button>
          </Link>
        </div>

        {/* Business Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : businesses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {businesses.map((business) => (
              <BusinessCard key={business.id} business={business} />
            ))}
          </div>
        ) : (
          <div className="bg-white p-12 rounded-2xl border border-gray-100 text-center space-y-4">
            <Store className="w-12 h-12 text-gray-300 mx-auto" />
            <h3 className="font-bold text-gray-800 text-lg">
              Aún no hay comercios registrados
            </h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Registrá tu emprendimiento y conocé más clientes en Capiatá.
            </p>
            <Link href="/registro?tipo=emprendedor">
              <Button variant="accent">Registrar Mi Comercio</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
