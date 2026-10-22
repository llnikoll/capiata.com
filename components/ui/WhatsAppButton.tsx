import React from "react";
import { Phone } from "lucide-react";

const SIZES: Record<"sm" | "md" | "lg", string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5 rounded-xl",
  md: "px-4 py-2.5 text-sm gap-2 rounded-xl",
  lg: "px-6 py-3 text-sm sm:text-base gap-2.5 rounded-2xl",
};

interface WhatsAppButtonProps {
  href: string;
  label?: string;
  size?: keyof typeof SIZES;
  fullWidth?: boolean;
  className?: string;
}

/** CTA de WhatsApp único en todo el sitio (un solo verde, un solo estilo). */
export const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
  href,
  label = "Contactar",
  size = "sm",
  fullWidth = false,
  className = "",
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className={`inline-flex items-center justify-center font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-xs hover:shadow-md transition-all ${SIZES[size]} ${fullWidth ? "w-full" : ""} ${className}`}
  >
    <Phone className={size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5"} />
    <span>{label}</span>
  </a>
);
