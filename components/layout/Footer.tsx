import React from "react";
import Link from "next/link";
import { MapPin, Heart, ShieldCheck, PhoneCall, AlertCircle } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-[#1E3A5F] text-white pt-12 pb-8 border-t-4 border-[#F5B800]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-white/10">
          {/* Columna 1: Marca & Misión */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#F5B800] text-gray-950 font-black text-xl flex items-center justify-center">
                C
              </div>
              <span className="font-black text-xl tracking-tight text-white">
                CAPIATÁ<span className="text-[#F5B800]">.COM</span>
              </span>
            </div>
            <p className="text-gray-300 text-xs leading-relaxed">
              La plataforma comunitarias de clasificados y negocios locales de Capiatá, Paraguay.
              Facilitamos el contacto directo entre vecinos, trabajadores independientes y comercios.
            </p>
            <div className="flex items-center gap-2 text-xs text-[#F5B800] font-medium bg-white/5 p-2.5 rounded-lg border border-white/10">
              <MapPin className="w-4 h-4 shrink-0" />
              <span>Capiatá, Departamento Central — Paraguay</span>
            </div>
          </div>

          {/* Columna 2: Enlaces Rápidos */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-[#F5B800] uppercase tracking-wider">
              Navegación
            </h4>
            <ul className="space-y-2 text-xs text-gray-300">
              <li>
                <Link href="/explorar" className="hover:text-white transition-colors">
                  Explorar todo
                </Link>
              </li>
              <li>
                <Link href="/explorar?tipo=OFFER" className="hover:text-white transition-colors">
                  Publicaciones OFREZCO
                </Link>
              </li>
              <li>
                <Link href="/explorar?tipo=REQUEST" className="hover:text-white transition-colors">
                  Pedidos de la gente (BUSCO)
                </Link>
              </li>
              <li>
                <Link href="/emprendedores" className="hover:text-white transition-colors">
                  Directorio de Emprendedores
                </Link>
              </li>
              <li>
                <Link href="/crear-publicacion" className="hover:text-white transition-colors font-semibold text-[#F5B800]">
                  + Crear Publicación Gratis
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 3: Categorías Populares */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-[#F5B800] uppercase tracking-wider">
              Categorías
            </h4>
            <ul className="space-y-2 text-xs text-gray-300">
              <li>
                <Link href="/categoria/servicios-tecnicos" className="hover:text-white transition-colors">
                  Servicios Técnicos y Oficios
                </Link>
              </li>
              <li>
                <Link href="/categoria/gastronomia-comidas" className="hover:text-white transition-colors">
                  Gastronomía y Comidas
                </Link>
              </li>
              <li>
                <Link href="/categoria/construccion-hogar" className="hover:text-white transition-colors">
                  Construcción y Hogar
                </Link>
              </li>
              <li>
                <Link href="/categoria/vehiculos-motos" className="hover:text-white transition-colors">
                  Vehículos y Motos
                </Link>
              </li>
              <li>
                <Link href="/categoria/empleos-trabajo" className="hover:text-white transition-colors">
                  Empleos y Trabajo
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 4: Transparencia & Regla de Negocio */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-[#F5B800] uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Plataforma Gratuita
            </h4>
            <div className="bg-[#152B47] p-3.5 rounded-xl border border-white/10 text-xs text-gray-300 space-y-2">
              <div className="flex items-start gap-2 text-amber-300 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Importante:</span>
              </div>
              <p className="leading-normal text-[11px]">
                Capiatá Conecta no gestiona cobros, envíos ni comisiones. El acuerdo y pago se realiza directamente entre las partes (vía WhatsApp o en persona).
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 gap-4">
          <p>© 2026 Capiatá Conecta (capiata.com). Todos los derechos reservados.</p>
          <div className="flex items-center gap-1">
            <span>Hecho con</span>
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
            <span>para la comunidad de Capiatá</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
