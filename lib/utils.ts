import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combina clases Tailwind sin conflictos */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formatea precio en guaraníes */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat("es-PY", {
    style: "currency",
    currency: "PYG",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

/** Formatea fecha relativa (ej: "hace 2 horas") */
export function formatRelativeDate(date: string | Date, nowInput?: Date): string {
  const d = new Date(date);
  const now = nowInput || (typeof window !== "undefined" ? new Date() : new Date("2026-10-06T23:50:00.000Z"));
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Hace un momento";
  if (minutes < 60) return `Hace ${minutes} min`;
  if (hours < 24) return `Hace ${hours} hora${hours !== 1 ? "s" : ""}`;
  if (days < 7) return `Hace ${days} día${days !== 1 ? "s" : ""}`;
  return d.toLocaleDateString("es-PY");
}

/** Genera mensaje de WhatsApp para una publicación */
export function generateWhatsAppMessage(
  listingTitle: string,
  listingType: "OFFER" | "REQUEST"
): string {
  if (listingType === "OFFER") {
    return encodeURIComponent(
      `Hola, vi tu publicación "${listingTitle}" en Capiatá Conecta y estoy interesado/a. ¿Podés darme más información?`
    );
  }
  return encodeURIComponent(
    `Hola, vi tu pedido "${listingTitle}" en Capiatá Conecta. Creo que puedo ayudarte. ¿Hablamos?`
  );
}

/** Genera URL de WhatsApp */
export function buildWhatsAppUrl(phone: string, message: string): string {
  const clean = phone.replace(/\D/g, "");
  return `https://wa.me/${clean}?text=${message}`;
}

/** Trunca texto */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}
