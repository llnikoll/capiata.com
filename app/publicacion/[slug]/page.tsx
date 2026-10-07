import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatPrice, formatRelativeDate, buildWhatsAppUrl, generateWhatsAppMessage } from "@/lib/utils";
import { MOCK_LISTINGS } from "@/lib/mock-data";
import {
  MapPin,
  Phone,
  Share2,
  Heart,
  ChevronLeft,
  Eye,
  Calendar,
  ShieldAlert,
} from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return MOCK_LISTINGS.map((l) => ({ slug: l.slug }));
}

export default async function ListingDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  const listing = MOCK_LISTINGS.find((l) => l.slug === slug) || MOCK_LISTINGS[0];

  const isOffer = listing.type === "OFFER";
  const whatsappMessage = generateWhatsAppMessage(listing.title, listing.type);
  const whatsappUrl = listing.contact_whatsapp
    ? buildWhatsAppUrl(listing.contact_whatsapp, whatsappMessage)
    : null;

  return (
    <div className="py-8 bg-gray-50/50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Back Link */}
        <Link
          href="/explorar"
          className="inline-flex items-center gap-1 text-xs font-bold text-[#1E3A5F] hover:underline"
        >
          <ChevronLeft className="w-4 h-4" /> Volver a Explorar
        </Link>

        {/* Main Card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-md overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-0">
          {/* Image / Visual Header */}
          <div className="md:col-span-6 bg-gray-100 relative min-h-[300px] md:min-h-[450px]">
            {listing.images && listing.images.length > 0 ? (
              <Image
                src={listing.images[0].image_url}
                alt={listing.title}
                fill
                priority
                className="object-cover"
              />
            ) : (
              <div
                className={`w-full h-full flex flex-col items-center justify-center p-8 text-center ${
                  isOffer ? "bg-amber-50" : "bg-blue-50"
                }`}
              >
                <span
                  className={`text-6xl font-black opacity-25 ${
                    isOffer ? "text-[#F5B800]" : "text-[#1E3A5F]"
                  }`}
                >
                  {isOffer ? "OFREZCO" : "BUSCO"}
                </span>
                <p className="text-xs text-gray-400 mt-2">Publicación sin fotos adjuntas</p>
              </div>
            )}

            <div className="absolute top-4 left-4 z-10">
              <Badge type={listing.type} size="md" />
            </div>
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

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">
                {listing.title}
              </h1>

              {/* Price */}
              {listing.price !== null && (
                <div className="text-2xl sm:text-3xl font-black text-[#1E3A5F] bg-blue-50/70 p-3 rounded-xl inline-block">
                  {formatPrice(listing.price)}
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
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full"
                >
                  <Button
                    variant="accent"
                    size="lg"
                    leftIcon={<Phone className="w-5 h-5 text-gray-950" />}
                    className="w-full shadow-lg bg-emerald-500 hover:bg-emerald-600 text-white border-0"
                  >
                    Contactar por WhatsApp
                  </Button>
                </a>
              )}

              <div className="flex items-center justify-between text-xs text-gray-400 pt-2">
                <div className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  <span>{listing.views_count} visualizaciones</span>
                </div>

                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-1 text-gray-600 hover:text-red-500">
                    <Heart className="w-4 h-4" /> Favorito
                  </button>
                  <button className="flex items-center gap-1 text-gray-600 hover:text-gray-900">
                    <Share2 className="w-4 h-4" /> Compartir
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
      </div>
    </div>
  );
}
