"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Megaphone,
  HelpCircle,
  ShieldCheck,
  ArrowRight,
  UserPlus,
  Sparkles,
  MapPin,
  Store,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CategoryCard } from "@/components/home/CategoryCard";
import { ListingCard } from "@/components/listings/ListingCard";
import { BusinessCard } from "@/components/home/BusinessCard";
import { Alert } from "@/components/ui/Alert";
import { EmptyState, ListingGridSkeleton } from "@/components/ui/EmptyState";
import { CAPIATA_NEIGHBORHOODS } from "@/lib/types";
import { useListings } from "@/lib/hooks/useListings";
import { useBusinesses } from "@/lib/hooks/useBusinesses";
import { useCategories } from "@/lib/hooks/useCategories";
import { formatPrice, generateWhatsAppMessage, buildWhatsAppUrl } from "@/lib/utils";

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedNeighborhood, setSelectedNeighborhood] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const {
    listings: offerListings,
    loading: offersLoading,
    error: offersError,
    live,
    reload: reloadOffers,
  } = useListings({ type: "OFFER", limit: 3 });

  const {
    listings: requestListings,
    loading: requestsLoading,
    error: requestsError,
    reload: reloadRequests,
  } = useListings({ type: "REQUEST", limit: 2 });

  const { businesses, loading: businessesLoading, error: businessesError } = useBusinesses({
    limit: 3,
  });

  const { categories } = useCategories();

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (selectedNeighborhood) params.set("barrio", selectedNeighborhood);
    if (selectedCategory) params.set("categoria", selectedCategory);
    const search = params.toString();
    router.push(search ? `/explorar?${search}` : "/explorar");
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* 🚀 HERO SECTION */}
      <section className="relative bg-gradient-to-b from-[#1E3A5F] via-[#152B47] to-[#1E3A5F] text-white pt-16 pb-24 overflow-hidden">
        {/* Background decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#F5B800]/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 -left-24 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Local Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-[#F5B800] shadow-sm">
              <Sparkles className="w-4 h-4" />
              <span>Red Comunitaria Exclusiva para Capiatá</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
              Encontrá, ofrecé y pedí en{" "}
              <span className="text-[#F5B800] underline underline-offset-8 decoration-[#F5B800]/40">
                Capiatá
              </span>
            </h1>

            <p className="text-base sm:text-lg text-gray-200 font-normal leading-relaxed max-w-2xl mx-auto">
              Conectamos directamente a vecinos, profesionales y emprendimientos locales.
              Publicá lo que hacés o encontrá exactamente lo que estás buscando.
            </p>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link href="/crear-publicacion?tipo=OFFER">
                <Button
                  variant="accent"
                  size="lg"
                  leftIcon={<Megaphone className="w-5 h-5 text-gray-950" />}
                  className="shadow-lg hover:scale-105 transition-transform"
                >
                  Quiero ofrecer algo
                </Button>
              </Link>

              <Link href="/crear-publicacion?tipo=REQUEST">
                <Button
                  variant="outline"
                  size="lg"
                  leftIcon={<HelpCircle className="w-5 h-5 text-white" />}
                  className="border-white/30 text-white hover:bg-white/10 shadow-lg hover:scale-105 transition-transform"
                >
                  Estoy buscando algo
                </Button>
              </Link>
            </div>
          </div>

          {/* 🔍 BIG SEARCH BAR CARD */}
          <div className="mt-12 max-w-4xl mx-auto">
            <form
              onSubmit={handleHeroSearch}
              className="bg-white p-3 sm:p-4 rounded-2xl shadow-2xl border border-gray-100 text-gray-900 grid grid-cols-1 sm:grid-cols-12 gap-3"
            >
              {/* Keyword Input */}
              <div className="sm:col-span-5 relative flex items-center">
                <Search className="w-5 h-5 text-gray-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="¿Qué servicio o producto buscás?"
                  className="w-full h-12 pl-11 pr-4 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:bg-white transition-all"
                />
              </div>

              {/* Barrio Select */}
              <div className="sm:col-span-3 relative flex items-center">
                <MapPin className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
                <select
                  value={selectedNeighborhood}
                  onChange={(e) => setSelectedNeighborhood(e.target.value)}
                  className="w-full h-12 pl-9 pr-3 rounded-xl bg-gray-50 border border-gray-200 text-xs sm:text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                >
                  <option value="">Todo Capiatá</option>
                  {CAPIATA_NEIGHBORHOODS.map((barrio) => (
                    <option key={barrio} value={barrio}>
                      {barrio}
                    </option>
                  ))}
                </select>
              </div>

              {/* Categoría Select */}
              <div className="sm:col-span-2 relative flex items-center">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full h-12 px-3 rounded-xl bg-gray-50 border border-gray-200 text-xs sm:text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                >
                  <option value="">Todas</option>
                  {categories.map((cat) => (
                    <option key={cat.slug} value={cat.slug}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Submit Button */}
              <div className="sm:col-span-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full h-12 rounded-xl text-sm font-bold shadow-md"
                >
                  Buscar
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* 🛡️ TRANSPARENCY NOTICE BANNER */}
      <section className="bg-amber-50 border-y border-amber-200/80 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-950 text-xs sm:text-sm font-medium">
            <div className="flex items-center gap-2.5 text-center sm:text-left">
              <ShieldCheck className="w-5 h-5 text-[#D4A000] shrink-0" />
              <span>
                <strong>100% Directo y Gratuito:</strong> Capiatá Conecta no vende ni cobra nada. Te contactás directo por WhatsApp con el anunciante.
              </span>
            </div>
            <Link
              href="#como-funciona"
              className="text-[#1E3A5F] font-bold hover:underline shrink-0 flex items-center gap-1"
            >
              ¿Cómo funciona? <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 📁 CATEGORIES SECTION */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#1E3A5F]">
                Rubros y Servicios
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
                Explorá por Categorías
              </h2>
            </div>
            <Link
              href="/explorar"
              className="text-sm font-bold text-[#1E3A5F] hover:text-[#152B47] flex items-center gap-1"
            >
              Ver todas las categorías <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3.5">
            {categories.map((category) => (
              <CategoryCard key={category.slug} category={category} />
            ))}
          </div>
        </div>
      </section>

      {/* 📣 LATEST OFFERS (OFREZCO) */}
      <section className="py-16 bg-gray-50/70 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F5B800]/15 text-gray-950 text-xs font-bold border border-[#F5B800]/30">
                  <Megaphone className="w-3.5 h-3.5 text-[#D4A000]" />
                  <span>OFREZCO</span>
                </div>
                {live && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                    <Radio className="w-3 h-3 animate-pulse" />
                    EN VIVO
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
                Últimas Ofertas de la Comunidad
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Servicios, productos y trabajos ofrecidos por vecinos y emprendedores de Capiatá.
              </p>
            </div>
            <Link
              href="/explorar?tipo=OFFER"
              className="text-sm font-bold text-[#1E3A5F] hover:underline flex items-center gap-1 shrink-0"
            >
              Ver más ofertas <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {offersError ? (
            <Alert variant="error" onRetry={reloadOffers}>
              {offersError}
            </Alert>
          ) : offersLoading ? (
            <ListingGridSkeleton count={3} />
          ) : offerListings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {offerListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Megaphone className="w-12 h-12" />}
              title="Aún no hay ofertas publicadas"
              description="Sé el primero en ofrecer un servicio o producto en Capiatá."
              action={
                <Link href="/crear-publicacion?tipo=OFFER">
                  <Button variant="accent">Publicar Oferta</Button>
                </Link>
              }
            />
          )}
        </div>
      </section>

      {/* 🔍 COMMUNITY REQUESTS (BUSCO) */}
      <section className="py-16 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1E3A5F]/10 text-[#1E3A5F] text-xs font-bold border border-[#1E3A5F]/20 mb-2">
                <HelpCircle className="w-3.5 h-3.5 text-[#1E3A5F]" />
                <span>BUSCO (Pedidos)</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
                Lo que está buscando la gente en Capiatá
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                ¿Tenés lo que necesitan o podés brindar el servicio? Contactalos directamente.
              </p>
            </div>
            <Link
              href="/explorar?tipo=REQUEST"
              className="text-sm font-bold text-[#1E3A5F] hover:underline flex items-center gap-1 shrink-0"
            >
              Ver todos los pedidos <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {requestsError ? (
            <Alert variant="error" onRetry={reloadRequests}>
              {requestsError}
            </Alert>
          ) : requestsLoading ? (
            <ListingGridSkeleton count={2} className="lg:grid-cols-2" />
          ) : requestListings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
              {requestListings.map((listing) => (
                <div
                  key={listing.id}
                  className="p-6 rounded-2xl bg-gradient-to-br from-blue-50/50 to-white border border-blue-100/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1E3A5F] bg-blue-100/80 px-2.5 py-1 rounded-lg">
                        BUSCO / PEDIDO
                      </span>
                      <span className="text-xs text-gray-500 font-semibold flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#F5B800]" />
                        {listing.neighborhood || listing.location}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 leading-snug">
                      {listing.title}
                    </h3>
                    <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">
                      {listing.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
                    {listing.price ? (
                      <span className="text-sm font-black text-[#1E3A5F]">
                        Presupuesto: {formatPrice(Number(listing.price))}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-gray-400">
                        Presupuesto a convenir
                      </span>
                    )}

                    {listing.contact_whatsapp && (
                      <a
                        href={buildWhatsAppUrl(
                          listing.contact_whatsapp,
                          generateWhatsAppMessage(listing.title, listing.type)
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="accent" size="sm">
                          Tengo esto / Puedo ayudar
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<HelpCircle className="w-12 h-12" />}
              title="Aún no hay pedidos publicados"
              description="¿Estás buscando algo? Publicá tu pedido y la comunidad te ayudará."
              action={
                <Link href="/crear-publicacion?tipo=REQUEST">
                  <Button variant="primary">Publicar Pedido</Button>
                </Link>
              }
            />
          )}
        </div>
      </section>

      {/* 🏢 EMPRENDEDORES DE CAPIATÁ */}
      <section className="py-16 bg-gray-50/70 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#1E3A5F]">
                Comercios Locales
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
                Emprendedores de Capiatá
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Conocé talleres, tiendas y negocios destacados de nuestra ciudad.
              </p>
            </div>
            <Link
              href="/emprendedores"
              className="text-sm font-bold text-[#1E3A5F] hover:underline flex items-center gap-1 shrink-0"
            >
              Ver todos los comercios <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {businessesError ? (
            <Alert variant="error">{businessesError}</Alert>
          ) : businessesLoading ? (
            <ListingGridSkeleton count={3} />
          ) : businesses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {businesses.slice(0, 3).map((b) => (
                <BusinessCard key={b.id} business={b} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Store className="w-12 h-12" />}
              title="Aún no hay comercios registrados"
              description="Registrá tu emprendimiento y conocé más clientes en Capiatá."
              action={
                <Link href="/registro?tipo=emprendedor">
                  <Button variant="accent">Registrar Mi Comercio</Button>
                </Link>
              }
            />
          )}
        </div>
      </section>

      {/* ❓ HOW IT WORKS */}
      <section id="como-funciona" className="py-20 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
          <div className="max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1E3A5F]">
              Fácil, Rápido y Directo
            </span>
            <h2 className="text-3xl font-black text-gray-900">
              ¿Cómo funciona Capiatá Conecta?
            </h2>
            <p className="text-sm text-gray-600">
              Sin registros complicados ni tarjetas de crédito. En solo 3 pasos entrás en contacto con tu comunidad.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col items-center text-center space-y-4 relative">
              <div className="w-14 h-14 rounded-2xl bg-[#1E3A5F] text-[#F5B800] flex items-center justify-center font-black text-2xl shadow-md">
                1
              </div>
              <h3 className="text-lg font-bold text-gray-900">Creá tu Cuenta Gratis</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Ingresá tus datos básicos o registrá tu emprendimiento en menos de 1 minuto.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col items-center text-center space-y-4 relative">
              <div className="w-14 h-14 rounded-2xl bg-[#F5B800] text-gray-950 flex items-center justify-center font-black text-2xl shadow-md">
                2
              </div>
              <h3 className="text-lg font-bold text-gray-900">Publicá tu Oferta o Pedido</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Describí qué ofrecés o qué estás buscando en tu barrio con fotos y precio estimado.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col items-center text-center space-y-4 relative">
              <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-2xl shadow-md">
                3
              </div>
              <h3 className="text-lg font-bold text-gray-900">Conectá por WhatsApp</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Los interesados te contactarán directo a tu WhatsApp para acordar sin intermediarios.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 📣 FINAL CTA BANNER */}
      <section className="py-16 bg-[#1E3A5F] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-black">
            Sumate hoy a la red local de Capiatá
          </h2>
          <p className="text-sm sm:text-base text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Miles de vecinos y emprendedores de Posta Ybycuá, Posta Ybyraró, Ruta 1 y 2 buscan y ofrecen servicios todos los días.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link href="/registro">
              <Button variant="accent" size="lg" leftIcon={<UserPlus className="w-5 h-5" />}>
                Crear Mi Cuenta Gratis
              </Button>
            </Link>
            <Link href="/explorar">
              <Button variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10">
                Explorar Publicaciones
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
