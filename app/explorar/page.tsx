"use client";

import React, { useState, useMemo } from "react";
import { Search, Filter, MapPin, Tag, ArrowUpDown, X } from "lucide-react";
import { ListingCard } from "@/components/listings/ListingCard";
import { DEFAULT_CATEGORIES, CAPIATA_NEIGHBORHOODS, ListingType } from "@/lib/types";
import { MOCK_LISTINGS } from "@/lib/mock-data";
import { Button } from "@/components/ui/Button";

export default function ExplorarPage() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<ListingType | "ALL">("ALL");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [neighborhoodFilter, setNeighborhoodFilter] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc">("newest");

  const filteredListings = useMemo(() => {
    return MOCK_LISTINGS.filter((item) => {
      // Type filter
      if (typeFilter !== "ALL" && item.type !== typeFilter) return false;
      // Category filter
      if (categoryFilter && item.category_id !== categoryFilter) return false;
      // Neighborhood filter
      if (neighborhoodFilter && item.neighborhood !== neighborhoodFilter) return false;
      // Query filter
      if (query.trim()) {
        const q = query.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesDesc = item.description.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === "price_asc") return (a.price || 0) - (b.price || 0);
      if (sortBy === "price_desc") return (b.price || 0) - (a.price || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [query, typeFilter, categoryFilter, neighborhoodFilter, sortBy]);

  const clearFilters = () => {
    setQuery("");
    setTypeFilter("ALL");
    setCategoryFilter("");
    setNeighborhoodFilter("");
    setSortBy("newest");
  };

  return (
    <div className="py-8 bg-gray-50/50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Page Header */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
            Explorar Publicaciones en Capiatá
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 max-w-2xl">
            Encontrá servicios, productos en venta o pedidos publicados por tus vecinos de Capiatá.
          </p>

          {/* Quick Tabs: ALL / OFFER / REQUEST */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              onClick={() => setTypeFilter("ALL")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                typeFilter === "ALL"
                  ? "bg-[#1E3A5F] text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Todos ({MOCK_LISTINGS.length})
            </button>
            <button
              onClick={() => setTypeFilter("OFFER")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                typeFilter === "OFFER"
                  ? "bg-[#F5B800] text-gray-950 shadow-sm"
                  : "bg-amber-50 text-[#D4A000] border border-amber-200 hover:bg-amber-100"
              }`}
            >
              📣 OFREZCO ({MOCK_LISTINGS.filter((l) => l.type === "OFFER").length})
            </button>
            <button
              onClick={() => setTypeFilter("REQUEST")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                typeFilter === "REQUEST"
                  ? "bg-[#1E3A5F] text-white shadow-sm"
                  : "bg-blue-50 text-[#1E3A5F] border border-blue-200 hover:bg-blue-100"
              }`}
            >
              🔍 BUSCO / Pedidos ({MOCK_LISTINGS.filter((l) => l.type === "REQUEST").length})
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
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-800 focus:ring-2 focus:ring-[#1E3A5F]"
              >
                <option value="">Todas las categorías</option>
                {DEFAULT_CATEGORIES.map((cat) => (
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
                onChange={(e) => setNeighborhoodFilter(e.target.value)}
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
                onChange={(e) => setSortBy(e.target.value as any)}
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
              <span>
                Mostrando <strong>{filteredListings.length}</strong> publicación(es)
              </span>
            </div>

            {filteredListings.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredListings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <div className="bg-white p-12 rounded-2xl border border-gray-100 text-center space-y-4">
                <Search className="w-12 h-12 text-gray-300 mx-auto" />
                <h3 className="font-bold text-gray-800 text-lg">
                  No encontramos resultados para tu búsqueda
                </h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  Probá cambiando los filtros o sé el primero en publicar lo que ofrecés o buscás en tu barrio.
                </p>
                <Button variant="accent" onClick={clearFilters}>
                  Limpiar Filtros
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
