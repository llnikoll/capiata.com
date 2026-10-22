import React from "react";
import { Listing, Business } from "@/lib/types";

/**
 * Serializa datos para un <script type="application/ld+json"> escapando los
 * caracteres que permiten cerrar la etiqueta: un título con "</script>" no
 * puede inyectar HTML (XSS almacenado).
 */
function toJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

export const ListingJsonLd: React.FC<{ listing: Listing }> = ({ listing }) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://capiata.com";
  const isOffer = listing.type === "OFFER";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": isOffer ? "Product" : "Demand",
    name: listing.title,
    description: listing.description,
    url: `${baseUrl}/publicacion/${listing.slug}`,
    areaServed: {
      "@type": "City",
      name: "Capiatá",
      addressRegion: "Central",
      addressCountry: "PY",
    },
    ...(listing.price && {
      offers: {
        "@type": "Offer",
        price: listing.price,
        priceCurrency: "PYG",
        availability: "https://schema.org/InStock",
      },
    }),
    ...(listing.images && listing.images.length > 0 && {
      image: listing.images.map((img) => img.image_url),
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: toJsonLd(jsonLd) }}
    />
  );
};

export const BusinessJsonLd: React.FC<{ business: Business }> = ({ business }) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://capiata.com";
  const images = [
    ...(business.images ?? []).map((image) => image.image_url),
    ...(business.logo_url ? [business.logo_url] : []),
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: business.business_name,
    description: business.description,
    ...(business.profile?.username && {
      url: `${baseUrl}/tienda/${business.profile.username}`,
    }),
    address: {
      "@type": "PostalAddress",
      streetAddress: business.address || "Capiatá",
      addressLocality: "Capiatá",
      addressRegion: "Central",
      addressCountry: "PY",
    },
    ...(images.length > 0 && { image: images }),
    ...(business.phone && { telephone: business.phone }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: toJsonLd(jsonLd) }}
    />
  );
};

interface CollectionJsonLdProps {
  name: string;
  description: string;
  url: string;
  items: Array<{ name: string; url: string }>;
}

/**
 * Datos estructurados para las páginas de colección (categoría o barrio):
 * le dicen a Google que es una lista de publicaciones, no contenido suelto.
 */
export const CollectionJsonLd: React.FC<CollectionJsonLdProps> = ({
  name,
  description,
  url,
  items,
}) => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url,
    inLanguage: "es-PY",
    isPartOf: { "@type": "WebSite", name: "Capiatá Conecta", url: "https://capiata.com" },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.slice(0, 20).map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        url: item.url,
      })),
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: toJsonLd(jsonLd) }}
    />
  );
};
