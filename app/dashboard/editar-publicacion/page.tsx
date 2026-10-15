import React, { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getListingById } from "@/lib/supabase/queries";
import { ListingForm } from "@/components/listings/ListingForm";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Editar Publicación",
  robots: { index: false, follow: false },
};

/**
 * Edición de una publicación propia: /dashboard/editar-publicacion?id=<uuid>
 *
 * El id viaja como query param (y no como segmento dinámico) porque un
 * segmento `[id]` bajo el layout —que es un componente de cliente— rompe la
 * validación de prerender de Next 16. Igual, la carga se hace en el servidor
 * con la sesión del usuario: RLS garantiza que sólo el dueño pueda leer y
 * editar, y acá además se valida la propiedad antes de renderizar el formulario.
 */
export default function EditarPublicacionPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  return (
    <Suspense fallback={<EditFormSkeleton />}>
      <EditarPublicacionContent searchParams={searchParams} />
    </Suspense>
  );
}

async function EditarPublicacionContent({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  if (!id) {
    return (
      <div className="space-y-4">
        <Alert variant="error">
          No indicaste qué publicación querés editar.
        </Alert>
        <Link href="/dashboard/mis-publicaciones">
          <Button variant="outline">Volver a mis publicaciones</Button>
        </Link>
      </div>
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Alert variant="info">
        Necesitás iniciar sesión para editar una publicación.{" "}
        <Link
          href={`/login?redirect=${encodeURIComponent(`/dashboard/editar-publicacion?id=${id}`)}`}
          className="font-bold underline"
        >
          Iniciar sesión
        </Link>
      </Alert>
    );
  }

  const listing = await getListingById(supabase, id);

  if (!listing || listing.user_id !== user.id) {
    return (
      <div className="space-y-4">
        <Alert variant="error">
          No encontramos esa publicación entre las tuyas. Puede que la hayas eliminado.
        </Alert>
        <Link href="/dashboard/mis-publicaciones">
          <Button variant="outline">Volver a mis publicaciones</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs space-y-2">
        <h1 className="text-2xl font-black text-gray-900">Editar Publicación</h1>
        <p className="text-xs text-gray-500">
          Actualizá el texto, el precio, la categoría, el barrio o las fotos. El enlace
          compartido de tu publicación no cambia.
        </p>
        <Link
          href={`/publicacion/${listing.slug}`}
          className="inline-block text-xs font-bold text-[#1E3A5F] hover:underline"
        >
          Ver la publicación pública
        </Link>
      </div>

      <ListingForm mode="edit" listing={listing} />
    </div>
  );
}

function EditFormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-32 bg-gray-200 rounded-3xl animate-pulse" />
      <div className="h-[520px] bg-gray-200 rounded-3xl animate-pulse" />
    </div>
  );
}
