import React, { Suspense } from "react";
import type { Metadata } from "next";
import { MensajesView } from "./MensajesView";

export const metadata: Metadata = {
  title: "Mis Mensajes",
  robots: { index: false, follow: false },
};

/**
 * Bandeja de entrada. La conversación activa viaja como query param (`?c=id`)
 * porque un segmento dinámico bajo el layout del dashboard rompe el prerender
 * de Next 16 (ver app/dashboard/editar-publicacion/page.tsx).
 */
export default function MensajesPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <div className="h-32 bg-gray-200 rounded-3xl animate-pulse" />
          <div className="h-96 bg-gray-200 rounded-3xl animate-pulse" />
        </div>
      }
    >
      <MensajesView />
    </Suspense>
  );
}
