import React, { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Iniciar Sesión",
  description:
    "Ingresá a tu cuenta de Capiatá Conecta para gestionar tus publicaciones, favoritos y datos de contacto.",
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 bg-gray-50/50 min-h-screen flex items-center justify-center">
          <div className="max-w-md w-full mx-4 h-[520px] bg-gray-200 rounded-3xl animate-pulse" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
