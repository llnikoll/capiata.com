import React, { Suspense } from "react";
import type { Metadata } from "next";
import { RegistroForm } from "./RegistroForm";

export const metadata: Metadata = {
  title: "Crear Cuenta",
  description:
    "Registrate gratis en Capiatá Conecta como vecino o emprendimiento y publicá tus ofertas y pedidos.",
};

export default function RegistroPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 bg-gray-50/50 min-h-screen flex items-center justify-center">
          <div className="max-w-lg w-full mx-4 h-[600px] bg-gray-200 rounded-3xl animate-pulse" />
        </div>
      }
    >
      <RegistroForm />
    </Suspense>
  );
}
