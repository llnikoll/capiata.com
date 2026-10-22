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
  if (Number.isNaN(d.getTime())) return "";

  const now = nowInput || new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (diff < 0) return "Hace un momento";
  if (minutes < 1) return "Hace un momento";
  if (minutes < 60) return `Hace ${minutes} min`;
  if (hours < 24) return `Hace ${hours} hora${hours !== 1 ? "s" : ""}`;
  if (days < 7) return `Hace ${days} día${days !== 1 ? "s" : ""}`;
  return d.toLocaleDateString("es-PY");
}

/** Formatea una fecha absoluta para el panel administrativo */
export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleString("es-PY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Normaliza un teléfono paraguayo al formato internacional sin signos
 * (ej: "0981 123 456" → "595981123456") para usarlo en enlaces de WhatsApp.
 */
export function normalizeWhatsAppNumber(input: string | null | undefined): string {
  const digits = (input ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("595")) return digits;
  if (digits.startsWith("0")) return `595${digits.slice(1)}`;
  if (digits.length === 9 && digits.startsWith("9")) return `595${digits}`;
  return digits;
}

/** Genera el texto (sin codificar) del mensaje de WhatsApp para una publicación */
export function generateWhatsAppMessage(
  listingTitle: string,
  listingType: "OFFER" | "REQUEST"
): string {
  if (listingType === "OFFER") {
    return `Hola, vi tu publicación "${listingTitle}" en Capiatá Conecta y estoy interesado/a. ¿Podés darme más información?`;
  }
  return `Hola, vi tu pedido "${listingTitle}" en Capiatá Conecta. Creo que puedo ayudarte. ¿Hablamos?`;
}

/** Genera URL de WhatsApp lista para usar (codifica el mensaje) */
export function buildWhatsAppUrl(phone: string, message: string): string {
  return `https://wa.me/${normalizeWhatsAppNumber(phone)}?text=${encodeURIComponent(message)}`;
}

/** Convierte "instagram.com/x" en un enlace absoluto seguro para mostrar. */
export function toExternalUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
