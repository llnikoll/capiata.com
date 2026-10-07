import React from "react";
import { Listing, Business } from "@/lib/types";

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
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
};

export const BusinessJsonLd: React.FC<{ business: Business }> = ({ business }) => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: business.business_name,
    description: business.description,
    address: {
      "@type": "PostalAddress",
      streetAddress: business.address || "Capiatá",
      addressLocality: "Capiatá",
      addressRegion: "Central",
      addressCountry: "PY",
    },
    ...(business.logo_url && { image: business.logo_url }),
    ...(business.phone && { telephone: business.phone }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
};
