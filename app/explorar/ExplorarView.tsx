"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Filter, MapPin, Tag, ArrowUpDown, X, Radio, Loader2 } from "lucide-react";
import { ListingCard } from "@/components/listings/ListingCard";
import { CAPIATA_NEIGHBORHOODS, type ListingType } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { EmptyState, ListingGridSkeleton } from "@/components/ui/EmptyState";
import { useListings } from "@/lib/hooks/useListings";
import { useCategories } from "@/lib/hooks/useCategories";

type SortBy = "newest" | "price_asc" | "price_desc";

const PAGE_SIZE = 24;

export function ExplorarView() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Filtros iniciales tomados de la URL (?q=&tipo=&categoria=&barrio=&orden=)
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [typeFilter, setTypeFilter] = useState<ListingType | "ALL">(() => {
    const tipo = searchParams.get("tipo");
    return tipo === "OFFER" || tipo === "REQUEST" ? tipo : "ALL";
  });
  const [categoryFilter, setCategoryFilter] = useState(
    () => searchParams.get("categoria") ?? ""
  );
  const [neighborhoodFilter, setNeighborhoodFilter] = useState(
    () => searchParams.get("barrio") ?? ""
  );
  const [sortBy, setSortBy] = useState<SortBy>(() => {
    const orden = searchParams.get("orden");
    return orden === "price_asc" || orden === "price_desc" ? orden : "newest";
  });

  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const { categories } = useCategories();

  // Debounce del texto de búsqueda para no golpear la base en cada tecla.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(timer);
  }, [query]);

  const options = useMemo(
    () => ({
      type: typeFilter === "ALL" ? undefined : typeFilter,
      categorySlug: categoryFilter || undefined,
      neighborhood: neighborhoodFilter || undefined,
      searchQuery: debouncedQuery.trim() || undefined,
      sort: sortBy,
      limit,
    }),
    [typeFilter, categoryFilter, neighborhoodFilter, debouncedQuery, sortBy, limit]
  );

  const { listings, loading, refreshing, error, live, reload } = useListings(options);

  // Mantenemos la URL sincronizada para poder compartir búsquedas.
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());
    if (typeFilter !== "ALL") params.set("tipo", typeFilter);
    if (categoryFilter) params.set("categoria", categoryFilter);
    if (neighborhoodFilter) params.set("barrio", neighborhoodFilter);
    if (sortBy !== "newest") params.set("orden", sortBy);

    const search = params.toString();
    const nextUrl = `${window.location.pathname}${search ? `?${search}` : ""}`;
    window.history.replaceState(null, "", nextUrl);
  }, [debouncedQuery, typeFilter, categoryFilter, neighborhoodFilter, sortBy]);

  const clearFilters = () => {
    setQuery("");
    setDebouncedQuery("");
    setTypeFilter("ALL");
    setCategoryFilter("");
    setNeighborhoodFilter("");
    setSortBy("newest");
    setLimit(PAGE_SIZE);
  };

  const hasFilters =
    Boolean(debouncedQuery.trim()) ||
    typeFilter !== "ALL" ||
    Boolean(categoryFilter) ||
    Boolean(neighborhoodFilter);

  const changeTypeFilter = (value: ListingType | "ALL") => {
    setTypeFilter(value);
    setLimit(PAGE_SIZE);
  };

  return (
    <div className="py-8 bg-gray-50/50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Page Header */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
              Explorar Publicaciones en Capiatá
            </h1>
            {live && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                <Radio className="w-3 h-3 animate-pulse" /> EN VIVO
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-gray-500 max-w-2xl">
            Encontrá servicios, productos en venta o pedidos publicados por tus vecinos de Capiatá.
          </p>

          {/* Quick Tabs: ALL / OFFER / REQUEST */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              onClick={() => changeTypeFilter("ALL")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                typeFilter === "ALL"
                  ? "bg-[#1E3A5F] text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Todas las publicaciones
            </button>
            <button
              onClick={() => changeTypeFilter("OFFER")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                typeFilter === "OFFER"
                  ? "bg-[#F5B800] text-gray-950 shadow-sm"
                  : "bg-amber-50 text-[#D4A000] border border-amber-200 hover:bg-amber-100"
              }`}
            >
              📣 OFREZCO
            </button>
            <button
              onClick={() => changeTypeFilter("REQUEST")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                typeFilter === "REQUEST"
                  ? "bg-[#1E3A5F] text-white shadow-sm"
                  : "bg-blue-50 text-[#1E3A5F] border border-blue-200 hover:bg-blue-100"
              }`}
            >
              🔍 BUSCO / Pedidos
            </button>
          </div>
        </div>

        {/* Filters and Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Filters */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-5 h-fit">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <span className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-[#1E3A5F]" /> Filtros de Búsqueda
              </span>
              <button
                onClick={clearFilters}
                className="text-xs text-red-500 hover:underline flex items-center gap-0.5"
              >
                <X className="w-3 h-3" /> Limpiar
              </button>
            </div>

            {/* Keyword Search */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">Palabra clave</label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ej: plomero, moto..."
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-gray-50 border border-gray-200 text-xs focus:ring-2 focus:ring-[#1E3A5F] focus:outline-none"
                />
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3" />
              </div>
            </div>

            {/* Category Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-[#1E3A5F]" /> Categoría
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setLimit(PAGE_SIZE);
                }}
                className="w-full h-10 px-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-800 focus:ring-2 focus:ring-[#1E3A5F]"
              >
                <option value="">Todas las categorías</option>
                {categories.map((cat) => (
                  <option key={cat.slug} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Barrio Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#F5B800]" /> Barrio de Capiatá
              </label>
              <select
                value={neighborhoodFilter}
                onChange={(e) => {
                  setNeighborhoodFilter(e.target.value);
                  setLimit(PAGE_SIZE);
                }}
                className="w-full h-10 px-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-800 focus:ring-2 focus:ring-[#1E3A5F]"
              >
                <option value="">Todos los barrios</option>
                {CAPIATA_NEIGHBORHOODS.map((barrio) => (
                  <option key={barrio} value={barrio}>
                    {barrio}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Order */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-gray-600" /> Ordenar por
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="w-full h-10 px-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-800 focus:ring-2 focus:ring-[#1E3A5F]"
              >
                <option value="newest">Más recientes</option>
                <option value="price_asc">Menor precio</option>
                <option value="price_desc">Mayor precio</option>
              </select>
            </div>
          </div>

          {/* Listings Grid */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between text-xs text-gray-500 px-1">
              <span className="inline-flex items-center gap-2">
                {loading
                  ? "Cargando resultados…"
                  : listings.length === 0
                    ? "Sin resultados"
                    : (
                      <>
                        Mostrando <strong>{listings.length}</strong>{" "}
                        {listings.length === 1 ? "publicación" : "publicaciones"}
                      </>
                    )}
                {refreshing && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
              </span>
              {hasFilters && (
                <button onClick={clearFilters} className="hover:underline">
                  Quitar filtros
                </button>
              )}
            </div>

            {error ? (
              <Alert variant="error" onRetry={reload}>
                {error}
              </Alert>
            ) : loading ? (
              <ListingGridSkeleton count={6} />
            ) : listings.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {listings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>

                {listings.length === limit && (
                  <div className="flex justify-center pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setLimit((current) => current + PAGE_SIZE)}
                    >
                      Cargar más publicaciones
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                icon={<Search className="w-12 h-12" />}
                title={
                  hasFilters
                    ? "No encontramos resultados para tu búsqueda"
                    : "Todavía no hay publicaciones"
                }
                description={
                  hasFilters
                    ? "Probá cambiando los filtros o sé el primero en publicar lo que ofrecés o buscás en tu barrio."
                    : "Sé el primero en publicar lo que ofrecés o buscás en Capiatá."
                }
                action={
                  hasFilters ? (
                    <Button variant="accent" onClick={clearFilters}>
                      Limpiar Filtros
                    </Button>
                  ) : (
                    <Button variant="accent" onClick={() => router.push("/crear-publicacion")}>
                      Crear Publicación
                    </Button>
                  )
                }
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
