"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { Avatar } from "@/components/ui/Avatar";
import { Alert } from "@/components/ui/Alert";
import { ReportModal } from "@/components/listings/ReportModal";
import { ContactSellerButton } from "@/components/listings/ContactSellerButton";
import { ListingCard } from "@/components/listings/ListingCard";
import {
  formatPrice,
  formatRelativeDate,
  buildWhatsAppUrl,
  generateWhatsAppMessage,
} from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { incrementListingViews } from "@/lib/supabase/queries";
import { useFavorites } from "@/lib/hooks/useFavorites";
import { useAuthUser } from "@/lib/hooks/useAuthUser";
import type { Listing } from "@/lib/types";
import {
  MapPin,
  Share2,
  Heart,
  ChevronLeft,
  Eye,
  Calendar,
  ShieldAlert,
  Flag,
  ImageOff,
  Store,
  CheckCircle2,
  Pencil,
} from "lucide-react";

interface ListingDetailViewProps {
  listing: Listing;
  related: Listing[];
}

export function ListingDetailView({ listing, related }: ListingDetailViewProps) {
  const router = useRouter();
  const { user } = useAuthUser();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [activeImage, setActiveImage] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);

  const isOffer = listing.type === "OFFER";
  const images = listing.images ?? [];
  const currentImage = images[activeImage]?.image_url;
  const whatsappUrl = listing.contact_whatsapp
    ? buildWhatsAppUrl(
        listing.contact_whatsapp,
        generateWhatsAppMessage(listing.title, listing.type)
      )
    : null;

  const publisherName =
    listing.business?.business_name || listing.profile?.full_name || listing.profile?.username;
  const publisherAvatar = listing.business?.logo_url || listing.profile?.avatar_url;
  const favorite = isFavorite(listing.id);

  // Cuenta una vista por sesión (best-effort, no bloquea la interfaz).
  useEffect(() => {
    const key = `capiata:viewed:${listing.id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Sin sessionStorage igual contamos la vista.
    }

    try {
      void incrementListingViews(createClient(), listing.id);
    } catch {
      // Sin configuración de Supabase la vista se muestra igual.
    }
  }, [listing.id]);

  // Si la publicación deja de estar activa (pausada/eliminada por el autor),
  // recargamos para reflejar el estado real.
  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;

    try {
      const supabase = createClient();
      channel = supabase
        .channel(`listing-detail-${listing.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "listings",
            filter: `id=eq.${listing.id}`,
          },
          (payload) => {
            const nextStatus = (payload.new as { status?: string }).status;
            if (nextStatus && nextStatus !== "active") {
              router.refresh();
            }
          }
        )
        .subscribe();
    } catch {
      // Realtime opcional.
    }

    return () => {
      if (channel) {
        try {
          void createClient().removeChannel(channel);
        } catch {
          /* noop */
        }
      }
    };
  }, [listing.id, router]);

  const handleFavorite = async () => {
    setFavoriteError(null);

    if (!user) {
      router.push(`/login?redirect=/publicacion/${listing.slug}`);
      return;
    }

    try {
      await toggleFavorite(listing.id);
    } catch {
      setFavoriteError("No pudimos actualizar tus favoritos. Intentá de nuevo.");
    }
  };

  const handleShare = async () => {
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ title: listing.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareFeedback("Enlace copiado al portapapeles");
      setTimeout(() => setShareFeedback(null), 2500);
    } catch {
      setShareFeedback("Copiá el enlace de la barra de direcciones para compartir");
      setTimeout(() => setShareFeedback(null), 2500);
    }
  };

  return (
    <div className="py-8 bg-gray-50/50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Back Link + acciones del dueño */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/explorar"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#1E3A5F] hover:underline"
          >
            <ChevronLeft className="w-4 h-4" /> Volver a Explorar
          </Link>

          {user?.id === listing.user_id && (
            <Link href={`/dashboard/editar-publicacion?id=${listing.id}`}>
              <Button variant="secondary" size="sm" leftIcon={<Pencil className="w-3.5 h-3.5" />}>
                Editar mi publicación
              </Button>
            </Link>
          )}
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-md overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-0">
          {/* Image / Visual Header */}
          <div className="md:col-span-6 bg-gray-100 relative min-h-[300px] md:min-h-[450px]">
            {currentImage && !imageFailed ? (
              <Image
                src={currentImage}
                alt={listing.title}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <div
                className={`w-full h-full min-h-[300px] flex flex-col items-center justify-center p-8 text-center gap-2 ${
                  isOffer ? "bg-amber-50" : "bg-blue-50"
                }`}
              >
                {images.length > 0 && <ImageOff className="w-6 h-6 text-gray-400" />}
                <span
                  className={`text-6xl font-black opacity-25 ${
                    isOffer ? "text-[#F5B800]" : "text-[#1E3A5F]"
                  }`}
                >
                  {isOffer ? "OFREZCO" : "BUSCO"}
                </span>
                <p className="text-xs text-gray-400 mt-2">
                  {images.length > 0
                    ? "No pudimos cargar la imagen de esta publicación"
                    : "Publicación sin fotos adjuntas"}
                </p>
              </div>
            )}

            <div className="absolute top-4 left-4 z-10">
              <Badge type={listing.type} size="md" />
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="absolute bottom-4 left-4 right-4 z-10 flex gap-2 overflow-x-auto">
                {images.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => {
                      setActiveImage(index);
                      setImageFailed(false);
                    }}
                    className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 bg-white ${
                      index === activeImage ? "border-[#F5B800]" : "border-white/70"
                    }`}
                    aria-label={`Ver foto ${index + 1}`}
                  >
                    <Image
                      src={image.image_url}
                      alt={`${listing.title} — foto ${index + 1}`}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details & Actions */}
          <div className="md:col-span-6 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* Meta Top */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1 font-semibold text-[#1E3A5F]">
                  <MapPin className="w-3.5 h-3.5 text-[#F5B800]" />
                  {listing.neighborhood || listing.location}
                </span>
                <span className="flex items-center gap-1" suppressHydrationWarning>
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  {formatRelativeDate(listing.created_at)}
                </span>
              </div>

              {listing.category?.name && (
                <span className="inline-block text-[10px] font-bold uppercase tracking-wide text-[#1E3A5F] bg-blue-50 px-2 py-0.5 rounded-md">
                  {listing.category.name}
                </span>
              )}

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">
                {listing.title}
              </h1>

              {/* Price */}
              {listing.price !== null && Number(listing.price) > 0 && (
                <div className="text-2xl sm:text-3xl font-black text-[#1E3A5F] bg-blue-50/70 p-3 rounded-xl inline-block">
                  {formatPrice(Number(listing.price))}
                </div>
              )}

              {/* Publisher */}
              {publisherName && (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <Avatar src={publisherAvatar} name={publisherName} size="md" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-gray-900 truncate">
                        {publisherName}
                      </span>
                      {listing.profile?.is_verified && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      )}
                    </div>
                    {listing.business ? (
                      <span className="text-[11px] text-gray-500 flex items-center gap-1">
                        <Store className="w-3 h-3" /> Comercio de Capiatá
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-500">
                        Vecino de {listing.profile?.neighborhood || "Capiatá"}
                      </span>
                    )}
                  </div>
                  {listing.profile?.username && (
                    <Link
                      href={`/usuario/${listing.profile.username}`}
                      className="ml-auto text-[11px] font-bold text-[#1E3A5F] hover:underline shrink-0"
                    >
                      Ver perfil
                    </Link>
                  )}
                </div>
              )}

              {/* Description */}
              <div className="pt-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Descripción
                </h4>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {listing.description}
                </p>
              </div>
            </div>

            {/* Direct Contact Actions */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
              {favoriteError && <Alert variant="error">{favoriteError}</Alert>}
              {shareFeedback && <Alert variant="info">{shareFeedback}</Alert>}

              {whatsappUrl && (
                <WhatsAppButton
                  href={whatsappUrl}
                  label="Contactar por WhatsApp"
                  size="lg"
                  fullWidth
                  className="shadow-lg"
                />
              )}

              {listing.contact_phone && (
                <a href={`tel:${listing.contact_phone}`} className="w-full block">
                  <Button variant="outline" size="md" className="w-full">
                    Llamar al {listing.contact_phone}
                  </Button>                </a>
              )}

              <ContactSellerButton
                listingId={listing.id}
                listingSlug={listing.slug}
                ownerId={listing.user_id}
              />

              <div className="flex items-center justify-between text-xs text-gray-400 pt-2">
                <div className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  <span>{listing.views_count} visualizaciones</span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleFavorite}
                    className={`flex items-center gap-1 hover:text-red-500 ${
                      favorite ? "text-red-500 font-bold" : "text-gray-600"
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${favorite ? "fill-red-500" : ""}`} />
                    {favorite ? "Guardado" : "Favorito"}
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
                  >
                    <Share2 className="w-4 h-4" /> Compartir
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsReportOpen(true)}
                    className="flex items-center gap-1 text-gray-600 hover:text-red-600"
                  >
                    <Flag className="w-4 h-4" /> Reportar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Safety Warning */}
        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-amber-950 text-xs flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-[#D4A000] shrink-0 mt-0.5" />
          <div>
            <strong>Consejo de seguridad:</strong> Capiatá Conecta facilita el contacto directo. Recomendamos realizar entregas o revisiones en lugares públicos o concurridos de Capiatá. No realices transferencias por adelantado sin verificar el producto o servicio.
          </div>
        </div>

        {/* Related listings */}
        {related.length > 0 && (
          <div className="space-y-4 pt-4">
            <h2 className="text-lg font-black text-gray-900">
              Más publicaciones de {listing.category?.name ?? "esta categoría"}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((item) => (
                <ListingCard key={item.id} listing={item} />
              ))}
            </div>
          </div>
        )}
      </div>

      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        listingId={listing.id}
        listingTitle={listing.title}
      />
    </div>
  );
}
