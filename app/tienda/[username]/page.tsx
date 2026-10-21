import React, { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  Clock,
  Globe,
  AtSign,
  Share2,
  MapPin,
  Phone,
  Store,
} from "lucide-react";
import { createPublicClient } from "@/lib/supabase/public";
import {
  getActiveListingsByUser,
  getBusinessByUser,
  getBusinessImages,
  getProfileByUsername,
} from "@/lib/supabase/queries";
import { Avatar } from "@/components/ui/Avatar";
import { ListingCard } from "@/components/listings/ListingCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { BusinessJsonLd } from "@/components/seo/JsonLd";
import { buildWhatsAppUrl, toExternalUrl } from "@/lib/utils";

interface PageProps {
  params: Promise<{ username: string }>;
}

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://capiata.com";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;

  try {
    const supabase = createPublicClient();
    const profile = await getProfileByUsername(supabase, username);
    if (!profile) return {};

    const business = await getBusinessByUser(supabase, profile.id);
    if (!business) return {};

    const images = await getBusinessImages(supabase, business.id);
    const cover = images[0]?.image_url || business.logo_url;

    return {
      title: `${business.business_name} — Tienda en Capiatá`,
      description:
        business.description ||
        `Visitá la tienda de ${business.business_name} en Capiatá: fotos, productos y contacto directo por WhatsApp.`,
      alternates: { canonical: `${SITE_URL}/tienda/${profile.username}` },
      openGraph: {
        title: `${business.business_name} — Capiatá Conecta`,
        description: business.description || `Tienda de ${business.business_name} en Capiatá.`,
        url: `${SITE_URL}/tienda/${profile.username}`,
        type: "website",
        locale: "es_PY",
        ...(cover ? { images: [{ url: cover }] } : {}),
      },
    };
  } catch {
    return {};
  }
}

export default function StorePage({ params }: PageProps) {
  return (
    <Suspense fallback={<StoreSkeleton />}>
      <StoreContent params={params} />
    </Suspense>
  );
}

async function StoreContent({ params }: PageProps) {
  const { username } = await params;
  const supabase = createPublicClient();

  const profile = await getProfileByUsername(supabase, username);
  if (!profile) notFound();

  const business = await getBusinessByUser(supabase, profile.id);
  if (!business) redirect(`/usuario/${profile.username}`);

  const [images, listings] = await Promise.all([
    getBusinessImages(supabase, business.id),
    getActiveListingsByUser(supabase, profile.id),
  ]);

  const displayName = business.business_name;
  const whatsapp = business.whatsapp || business.phone || profile.phone;
  const whatsappUrl = whatsapp
    ? buildWhatsAppUrl(whatsapp, `Hola ${displayName}, te escribo desde tu tienda en Capiatá Conecta.`)
    : null;

  const socialLinks = [
    { label: "Instagram", icon: AtSign, href: toExternalUrl(business.social_links?.instagram) },
    { label: "Facebook", icon: Share2, href: toExternalUrl(business.social_links?.facebook) },
    { label: "Sitio web", icon: Globe, href: toExternalUrl(business.social_links?.website) },
  ].filter((link): link is { label: string; icon: typeof Globe; href: string } =>
    Boolean(link.href)
  );

  const cover = images[0]?.image_url;

  return (
    <div className="py-8 bg-gray-50/50 min-h-screen">
      <BusinessJsonLd
        business={{ ...business, images, profile: { username: profile.username } }}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <Link
          href="/emprendedores"
          className="inline-flex items-center gap-1 text-xs font-bold text-[#1E3A5F] hover:underline"
        >
          <ChevronLeft className="w-4 h-4" /> Volver a Emprendedores
        </Link>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt={`Portada de ${displayName}`}
              className="w-full h-48 sm:h-72 object-cover"
            />
          ) : (
            <div className="w-full h-32 bg-gradient-to-r from-[#1E3A5F] to-[#2C5282] flex items-center justify-center">
              <Store className="w-12 h-12 text-white/30" />
            </div>
          )}

          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-5">
              <div className="-mt-16 sm:-mt-20 shrink-0">
                <div className="p-1 bg-white rounded-full shadow-sm w-fit">
                  <Avatar src={business.logo_url} name={displayName} size="xl" />
                </div>
              </div>

              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-gray-900">{displayName}</h1>
                  {profile.is_verified && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> VERIFICADO
                    </span>
                  )}
                  <Badge variant="primary">TIENDA</Badge>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                  {business.category && (
                    <span className="inline-flex items-center gap-1 font-bold text-[#1E3A5F]">
                      <Store className="w-3.5 h-3.5" /> {business.category}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#F5B800]" />
                    {business.address || `${profile.neighborhood || "Capiatá"}, ${profile.city}`}
                  </span>
                </div>

                {business.description && (
                  <p className="text-sm text-gray-600 leading-relaxed pt-1">{business.description}</p>
                )}
              </div>

              {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                  <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-colors">
                    <Phone className="w-4 h-4" /> WhatsApp
                  </span>
                </a>
              )}
            </div>

            <div className="pt-5 border-t border-gray-100 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-600">
              {business.schedule && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gray-400" /> {business.schedule}
                </span>
              )}
              {socialLinks.map(({ label, icon: Icon, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[#1E3A5F] font-bold hover:underline"
                >
                  <Icon className="w-3.5 h-3.5" /> {label}
                </a>
              ))}
              {business.phone && business.phone !== whatsapp && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-gray-400" /> {business.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        {images.length > 0 && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xs p-6 sm:p-8 space-y-4">
            <h2 className="text-lg font-black text-gray-900">Fotos de la tienda</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((image, index) => (
                <a
                  key={image.id}
                  href={image.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative group block"
                  aria-label={`Ver foto ${index + 1} de ${displayName}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.image_url}
                    alt={`${displayName} — foto ${index + 1}`}
                    className="w-full h-40 sm:h-48 object-cover rounded-2xl border border-gray-100 group-hover:opacity-90 transition-opacity"
                    loading="lazy"
                  />
                  {index === 0 && (
                    <span className="absolute bottom-2 left-2 bg-[#F5B800] text-gray-950 text-[10px] font-bold px-2 py-0.5 rounded-md">
                      PORTADA
                    </span>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-lg font-black text-gray-900">
            Publicaciones activas ({listings.length})
          </h2>

          {listings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Store className="w-10 h-10" />}
              title="Todavía no hay publicaciones"
              description={`${displayName} aún no cargó productos o servicios en su tienda.`}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function StoreSkeleton() {
  return (
    <div className="py-8 bg-gray-50/50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
          <div className="h-56 bg-gray-200 animate-pulse" />
          <div className="p-8 space-y-3">
            <div className="h-8 w-56 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
