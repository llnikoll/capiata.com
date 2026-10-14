import React, { Suspense } from "react";
import { ExplorarView } from "./ExplorarView";
import { ListingGridSkeleton } from "@/components/ui/EmptyState";

/**
 * La vista de exploración lee `searchParams` (API de runtime) y mantiene un
 * canal de Realtime, por eso se renderiza dentro de un límite de Suspense:
 * el shell estático se envía al instante y los resultados llegan por streaming.
 */
export default function ExplorarPage() {
  return (
    <Suspense
      fallback={
        <div className="py-8 bg-gray-50/50 min-h-screen">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="h-40 bg-gray-200 rounded-2xl animate-pulse" />
            <ListingGridSkeleton count={6} />
          </div>
        </div>
      }
    >
      <ExplorarView />
    </Suspense>
  );
}
