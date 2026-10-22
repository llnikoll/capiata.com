import React, { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Store, CheckCircle2, ChevronLeft, Clock, Radio } from "lucide-react";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { createPublicClient } from "@/lib/supabase/public";
import {
  getActiveListingsByUser,
  getBusinessByUser,
  getProfileByUsername,
} from "@/lib/supabase/queries";
import { Avatar } from "@/components/ui/Avatar";
import { ListingCard } from "@/components/listings/ListingCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { buildWhatsAppUrl } from "@/lib/utils";

interface PageProps {
  params: Promise<{ username: string }>;
}

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://capiata.com";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;

  try {
    const profile = await getProfileByUsername(createPublicClient(), username);
    if (!profile) return {};

    const name = profile.full_name || profile.username;

    return {
      title: `${name} — Perfil en Capiatá Conecta`,
      description:
        profile.bio ||
        `Perfil de ${name} en Capiatá Conecta. Publicaciones y datos de contacto en Capiatá, Paraguay.`,
      alternates: { canonical: `${SITE_URL}/usuario/${profile.username}` },
      openGraph: {
        title: `${name} — Capiatá Conecta`,
        description: profile.bio || `Perfil de ${name} en Capiatá Conecta.`,
        url: `${SITE_URL}/usuario/${profile.username}`,
        type: "profile",
        locale: "es_PY",
        ...(profile.avatar_url ? { images: [{ url: profile.avatar_url }] } : {}),
      },
    };
  } catch {
    return {};
  }
}

export default function PublicProfilePage({ params }: PageProps) {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent params={params} />
    </Suspense>
  );
}

async function ProfileContent({ params }: PageProps) {
  const { username } = await params;
  const supabase = createPublicClient();

  const profile = await getProfileByUsername(supabase, username);

  if (!profile) {
    notFound();
  }

  const [business, listings] = await Promise.all([
    getBusinessByUser(supabase, profile.id),
    getActiveListingsByUser(supabase, profile.id),
  ]);

  const displayName = business?.business_name || profile.full_name || profile.username;
  const whatsapp = business?.whatsapp || profile.phone;
  const whatsappUrl = whatsapp
    ? buildWhatsAppUrl(whatsapp, `Hola ${displayName}, te escribo desde Capiatá Conecta.`)
    : null;

  return (
    <div className="py-8 bg-gray-50/50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <Link
          href="/explorar"
          className="inline-flex items-center gap-1 text-xs font-bold text-[#1E3A5F] hover:underline"
        >
          <ChevronLeft className="w-4 h-4" /> Volver a Explorar
        </Link>

        {/* Profile header */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xs p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <Avatar
              src={business?.logo_url || profile.avatar_url}
              name={displayName}
              size="xl"
            />

            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black text-gray-900 truncate">{displayName}</h1>
                {profile.is_verified && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> VERIFICADO
                  </span>
                )}
                <Badge variant={profile.user_type === "business" ? "primary" : "secondary"}>
                  {profile.user_type === "business" ? "COMERCIO" : "VECINO"}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#F5B800]" />
                  {profile.neighborhood || "Capiatá"}, {profile.city}
                </span>
                <span className="text-gray-400">@{profile.username}</span>
              </div>

              {profile.bio && (
                <p className="text-sm text-gray-600 leading-relaxed pt-1">{profile.bio}</p>
              )}
            </div>

            {whatsappUrl && (
              <WhatsAppButton
                href={whatsappUrl}
                label="WhatsApp"
                size="md"
                className="shrink-0"
              />
            )}
          </div>

          {business && (
            <div className="pt-5 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-600">
              <div className="space-y-2">
                {business.category && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-[#1E3A5F] font-bold">
                    <Store className="w-3.5 h-3.5" /> {business.category}
                  </span>
                )}
                {business.description && (
                  <p className="leading-relaxed">{business.description}</p>
                )}
              </div>
              <div className="space-y-2">
                {business.address && (
                  <p className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#F5B800]" /> {business.address}
                  </p>
                )}
                {business.schedule && (
                  <p className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-400" /> {business.schedule}
                  </p>
                )}
                {business.social_links?.instagram && (
                  <a
                    href={business.social_links.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#1E3A5F] font-bold hover:underline block"
                  >
                    Instagram
                  </a>
                )}
                <Link
                  href={`/tienda/${profile.username}`}
                  className="inline-flex items-center gap-1 text-[#1E3A5F] font-bold hover:underline"
                >
                  <Store className="w-3.5 h-3.5" /> Visitar la tienda
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Listings */}
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
              icon={<Radio className="w-10 h-10" />}
              title="Sin publicaciones activas"
              description={`${displayName} todavía no tiene publicaciones visibles en Capiatá Conecta.`}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="py-8 bg-gray-50/50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="bg-white rounded-3xl border border-gray-100 p-8 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gray-200 animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
