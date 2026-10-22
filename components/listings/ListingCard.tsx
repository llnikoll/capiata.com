"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Listing } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { useFavoritesContext } from "@/components/providers/FavoritesProvider";
import {
  formatPrice,
  formatRelativeDate,
  buildWhatsAppUrl,
  generateWhatsAppMessage,
} from "@/lib/utils";
import { MapPin, Phone, Heart, Eye, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ListingCardProps {
  listing: Listing;
  onFavoriteToggle?: (id: string) => void;
  isFavorite?: boolean;
}

export const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  onFavoriteToggle,
  isFavorite = false,
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const sharedFavorites = useFavoritesContext();
  const isOffer = listing.type === "OFFER";

  // Sin controlador externo (favoritos) la tarjeta gestiona su favorito con el
  // proveedor global; anónimos van al login para poder guardarla.
  const isFav = onFavoriteToggle ? isFavorite : sharedFavorites.isFavorite(listing.id);
  const handleFavorite = () => {
    if (onFavoriteToggle) {
      onFavoriteToggle(listing.id);
      return;
    }
    if (sharedFavorites.hasUser) {
      void sharedFavorites.toggleFavorite(listing.id);
    } else {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  };

  const mainImage =
    listing.images && listing.images.length > 0 && !imageFailed
      ? listing.images[0].image_url
      : null;

  const whatsappUrl = listing.contact_whatsapp
    ? buildWhatsAppUrl(
        listing.contact_whatsapp,
        generateWhatsAppMessage(listing.title, listing.type)
      )
    : null;

  const publisherName =
    listing.business?.business_name || listing.profile?.full_name || listing.profile?.username;
  const publisherAvatar = listing.business?.logo_url || listing.profile?.avatar_url;

  return (
    <div className="group rounded-2xl bg-white border border-gray-100 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden relative">
      {/* Top Banner Image or Placeholder */}
      <div className="relative w-full h-44 bg-gray-100 overflow-hidden">
        {mainImage ? (
          <Image
            src={mainImage}
            alt={listing.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div
            className={`w-full h-full flex flex-col items-center justify-center gap-1 p-4 text-center ${
              isOffer ? "bg-amber-50" : "bg-blue-50"
            }`}
          >
            {imageFailed ? (
              <ImageOff className="w-6 h-6 text-gray-400" />
            ) : null}
            <span
              className={`text-4xl font-black opacity-20 ${
                isOffer ? "text-[#F5B800]" : "text-[#1E3A5F]"
              }`}
            >
              {isOffer ? "OFREZCO" : "BUSCO"}
            </span>
          </div>
        )}

        {/* Badge OFFER/REQUEST */}
        <div className="absolute top-3 left-3 z-10">
          <Badge type={listing.type} />
        </div>

        {/* Favorite Button */}
        <button
          onClick={handleFavorite}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/90 backdrop-blur-sm text-gray-700 hover:text-red-500 hover:bg-white transition-colors shadow-sm"
          aria-label={isFav ? "Quitar de favoritos" : "Guardar en favoritos"}
        >
          <Heart className={`w-4 h-4 ${isFav ? "fill-red-500 text-red-500" : ""}`} />
        </button>

        {/* Price tag over image */}
        {listing.price !== null && Number(listing.price) > 0 && (
          <div className="absolute bottom-3 right-3 z-10 bg-[#1E3A5F] text-white px-2.5 py-1 rounded-lg text-xs font-bold shadow-md">
            {formatPrice(Number(listing.price))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          {/* Metadata top: neighborhood & date */}
          <div className="flex items-center justify-between text-[11px] text-gray-400 font-medium mb-1">
            <span className="flex items-center gap-1 text-gray-600 font-semibold truncate max-w-[160px]">
              <MapPin className="w-3 h-3 text-[#F5B800] shrink-0" />
              {listing.neighborhood || listing.location || "Capiatá"}
            </span>
            <span suppressHydrationWarning>{formatRelativeDate(listing.created_at)}</span>
          </div>

          {/* Title */}
          <Link href={`/publicacion/${listing.slug}`}>
            <h3 className="font-bold text-gray-900 text-base leading-snug line-clamp-2 hover:text-[#1E3A5F] transition-colors">
              {listing.title}
            </h3>
          </Link>

          {/* Description snippet */}
          <p className="text-xs text-gray-500 line-clamp-2 mt-1.5 leading-relaxed">
            {listing.description}
          </p>

          {listing.category?.name && (
            <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wide text-[#1E3A5F] bg-blue-50 px-2 py-0.5 rounded-md">
              {listing.category.name}
            </span>
          )}
        </div>

        {/* Publisher */}
        {publisherName && (
          <div className="flex items-center gap-2 pt-1">
            <Avatar src={publisherAvatar} name={publisherName} size="sm" />
            {listing.profile?.username ? (
              <Link
                href={`/usuario/${listing.profile.username}`}
                className="text-[11px] font-semibold text-gray-600 hover:text-[#1E3A5F] truncate"
              >
                {publisherName}
              </Link>
            ) : (
              <span className="text-[11px] font-semibold text-gray-600 truncate">
                {publisherName}
              </span>
            )}
          </div>
        )}

        {/* Footer actions */}
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
          {/* Views count */}
          <div className="flex items-center gap-1 text-[11px] text-gray-400">
            <Eye className="w-3.5 h-3.5" />
            <span>{listing.views_count || 0}</span>
          </div>

          {/* WhatsApp Direct Action */}
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs hover:shadow-md transition-all"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Contactar</span>
            </a>
          ) : (
            <Link href={`/publicacion/${listing.slug}`}>
              <Button variant="outline" size="sm">
                Ver detalle
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
