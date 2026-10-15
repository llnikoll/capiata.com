import React, { Suspense } from "react";
import type { Metadata } from "next";
import { ListingForm } from "@/components/listings/ListingForm";
import type { ListingType } from "@/lib/types";

export const metadata: Metadata = {
  title: "Crear Publicación",
  description:
    "Publicá gratis tu oferta o pedido en Capiatá Conecta. Sin comisiones ni intermediarios.",
};

/**
 * La página lee `?tipo=OFFER|REQUEST` (API de runtime) y la sesión del usuario,
 * por eso el formulario se monta dentro de un límite de Suspense.
 */
export default function CrearPublicacionPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="py-10 bg-gray-50/50 min-h-screen">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="h-10 w-72 mx-auto bg-gray-200 rounded animate-pulse" />
            <div className="h-[600px] bg-gray-200 rounded-3xl animate-pulse" />
          </div>
        </div>
      }
    >
      <CrearPublicacionContent searchParams={searchParams} />
    </Suspense>
  );
}

async function CrearPublicacionContent({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tipo } = await searchParams;
  const initialType: ListingType = tipo === "REQUEST" ? "REQUEST" : "OFFER";

  return <ListingForm mode="create" initialType={initialType} />;
}
