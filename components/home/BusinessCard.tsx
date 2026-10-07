import React from "react";
import Link from "next/link";
import { Business } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { MapPin, Phone, CheckCircle2, Clock } from "lucide-react";
import { buildWhatsAppUrl } from "@/lib/utils";

export const BusinessCard: React.FC<{ business: Business }> = ({ business }) => {
  const whatsappUrl = business.whatsapp
    ? buildWhatsAppUrl(
        business.whatsapp,
        encodeURIComponent(`Hola ${business.business_name}, vi tu comercio en Capiatá Conecta y quiero consultar...`)
      )
    : null;

  return (
    <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between gap-4">
      <div className="flex items-start gap-3.5">
        <Avatar src={business.logo_url} name={business.business_name} size="lg" />
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="font-bold text-gray-900 text-base truncate">
              {business.business_name}
            </h4>
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          </div>
          {business.category && (
            <span className="text-xs font-semibold text-[#1E3A5F] bg-blue-50 px-2 py-0.5 rounded-md inline-block w-fit mt-0.5">
              {business.category}
            </span>
          )}
          {business.address && (
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1 truncate">
              <MapPin className="w-3 h-3 text-[#F5B800] shrink-0" />
              {business.address}
            </p>
          )}
        </div>
      </div>

      {business.description && (
        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed bg-gray-50/50 p-2.5 rounded-xl border border-gray-100">
          {business.description}
        </p>
      )}

      {business.schedule && (
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <span>{business.schedule}</span>
        </div>
      )}

      <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
        <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
          Comercio de Capiatá
        </span>

        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </a>
        )}
      </div>
    </div>
  );
};
