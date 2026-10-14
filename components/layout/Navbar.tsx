"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  PlusCircle,
  Menu,
  X,
  User,
  MapPin,
  Megaphone,
  Briefcase,
  HelpCircle,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

export const Navbar = () => {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    }

    checkAuth();

    const { data: { subscription } } = createClient().auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/explorar?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs">
      {/* Top micro banner */}
      <div className="bg-[#1E3A5F] text-white text-[11px] font-medium py-1 px-4 text-center flex items-center justify-center gap-2">
        <span className="inline-block bg-[#F5B800] text-gray-950 font-bold px-1.5 py-0.5 rounded text-[10px] uppercase">
          Directorio Local
        </span>
        <span>
          Capiatá Conecta: conectando personas y emprendimientos de Capiatá sin comisiones ni pagos online.
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-10 h-10 rounded-xl bg-[#1E3A5F] flex items-center justify-center text-[#F5B800] font-black text-xl shadow-md group-hover:scale-105 transition-transform">
              C
            </div>
            <div className="flex flex-col">
              <span className="font-black text-lg tracking-tight text-[#1E3A5F] leading-none">
                CAPIATÁ<span className="text-[#F5B800]">.</span>COM
              </span>
              <span className="text-[10px] text-gray-500 font-semibold tracking-wide flex items-center gap-0.5">
                <MapPin className="w-2.5 h-2.5 text-[#F5B800]" /> Capiatá, PY
              </span>
            </div>
          </Link>

          {/* Buscador Rápido (Desktop) */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex flex-1 max-w-md items-center relative"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="¿Qué necesitás o buscás en Capiatá? Ej: plomero, moto, heladera..."
              className="w-full h-10 pl-9 pr-4 rounded-xl bg-gray-100/80 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:bg-white transition-all"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
          </form>

          {/* Nav Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-gray-700">
            <Link
              href="/explorar"
              className="hover:text-[#1E3A5F] transition-colors flex items-center gap-1"
            >
              Explorar
            </Link>
            <Link
              href="/explorar?tipo=OFFER"
              className="hover:text-[#1E3A5F] transition-colors flex items-center gap-1 text-[#D4A000]"
            >
              <Megaphone className="w-4 h-4" /> Ofertas
            </Link>
            <Link
              href="/explorar?tipo=REQUEST"
              className="hover:text-[#1E3A5F] transition-colors flex items-center gap-1 text-[#1E3A5F]"
            >
              Pedidos
            </Link>
            <Link
              href="/emprendedores"
              className="hover:text-[#1E3A5F] transition-colors flex items-center gap-1"
            >
              <Briefcase className="w-4 h-4 text-gray-500" /> Emprendedores
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2.5">
            <Link href="/crear-publicacion">
              <Button
                variant="accent"
                size="sm"
                leftIcon={<PlusCircle className="w-4 h-4" />}
                className="shadow-sm"
              >
                Publicar Gratis
              </Button>
            </Link>

            {!loading && (
              <>
                {user ? (
                  <>
                    <Link href="/dashboard" className="hidden sm:inline-flex">
                      <Button variant="ghost" size="sm" leftIcon={<User className="w-4 h-4" />}>
                        Mi Panel
                      </Button>
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="hidden sm:inline-flex p-2 rounded-xl text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Cerrar sesión"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <Link href="/login" className="hidden sm:inline-flex">
                    <Button variant="ghost" size="sm" leftIcon={<User className="w-4 h-4" />}>
                      Ingresar
                    </Button>
                  </Link>
                )}
              </>
            )}

            {/* Mobile menu trigger */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
              aria-label="Menú principal"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white px-4 pt-3 pb-6 space-y-4 animate-fade-in shadow-xl">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en Capiatá..."
              className="w-full h-10 pl-9 pr-4 rounded-xl bg-gray-100 border border-gray-200 text-sm"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          </form>

          <div className="grid grid-cols-2 gap-2 text-sm font-medium pt-2">
            <Link
              href="/explorar"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 text-gray-800 hover:bg-gray-100"
            >
              <Search className="w-4 h-4 text-[#1E3A5F]" /> Explorar Todo
            </Link>
            <Link
              href="/explorar?tipo=OFFER"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2 p-3 rounded-xl bg-[#F5B800]/10 text-gray-950 font-bold border border-[#F5B800]/30"
            >
              <Megaphone className="w-4 h-4 text-[#D4A000]" /> OFREZCO
            </Link>
            <Link
              href="/explorar?tipo=REQUEST"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2 p-3 rounded-xl bg-[#1E3A5F]/10 text-[#1E3A5F] font-bold border border-[#1E3A5F]/20"
            >
              <HelpCircle className="w-4 h-4 text-[#1E3A5F]" /> BUSCO (Pedidos)
            </Link>
            <Link
              href="/emprendedores"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 text-gray-800 hover:bg-gray-100"
            >
              <Briefcase className="w-4 h-4 text-gray-600" /> Emprendedores
            </Link>
          </div>

          <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
            {!loading && (
              <>
                {user ? (
                  <>
                    <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full justify-center">
                        Mi Panel
                      </Button>
                    </Link>
                    <button
                      onClick={() => {
                        handleSignOut();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-sm text-red-600 font-semibold py-2 rounded-xl hover:bg-red-50 transition-colors"
                    >
                      Cerrar Sesión
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full justify-center">
                        Iniciar Sesión
                      </Button>
                    </Link>
                    <Link href="/registro" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="primary" className="w-full justify-center">
                        Crear Cuenta Gratis
                      </Button>
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
