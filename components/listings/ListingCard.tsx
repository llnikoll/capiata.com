import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Listing } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { formatPrice, formatRelativeDate, buildWhatsAppUrl, generateWhatsAppMessage } from "@/lib/utils";
import { MapPin, Phone, Heart, Eye } from "lucide-react";
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
  const isOffer = listing.type === "OFFER";
  const mainImage = listing.images && listing.images.length > 0
    ? listing.images[0].image_url
    : null;

  const whatsappMessage = generateWhatsAppMessage(listing.title, listing.type);
  const whatsappUrl = listing.contact_whatsapp
    ? buildWhatsAppUrl(listing.contact_whatsapp, whatsappMessage)
    : null;

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
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center p-4 text-center ${isOffer ? "bg-amber-50" : "bg-blue-50"}`}>
            <span className={`text-4xl font-black opacity-20 ${isOffer ? "text-[#F5B800]" : "text-[#1E3A5F]"}`}>
              {isOffer ? "OFREZCO" : "BUSCO"}
            </span>
          </div>
        )}

        {/* Badge OFFER/REQUEST */}
        <div className="absolute top-3 left-3 z-10">
          <Badge type={listing.type} />
        </div>

        {/* Favorite Button */}
        {onFavoriteToggle && (
          <button
            onClick={() => onFavoriteToggle(listing.id)}
            className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/90 backdrop-blur-sm text-gray-700 hover:text-red-500 hover:bg-white transition-colors shadow-sm"
            aria-label="Guardar en favoritos"
          >
            <Heart className={`w-4 h-4 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
          </button>
        )}

        {/* Price tag over image */}
        {listing.price !== null && listing.price > 0 && (
          <div className="absolute bottom-3 right-3 z-10 bg-[#1E3A5F] text-white px-2.5 py-1 rounded-lg text-xs font-bold shadow-md">
            {formatPrice(listing.price)}
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
        </div>

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
