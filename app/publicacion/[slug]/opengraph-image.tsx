import { ImageResponse } from "next/og";
import { createPublicClient } from "@/lib/supabase/public";
import { getListingBySlug } from "@/lib/supabase/queries";

export const alt = "Publicación en Capiatá Conecta";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Vista previa que se ve al compartir una publicación por WhatsApp o redes.
 *
 * Se genera con los datos reales de la publicación (título, precio, barrio,
 * categoría y su primera foto). Si algo falla —o la publicación no existe—
 * se devuelve una tarjeta genérica de Capiatá Conecta, nunca un error.
 */
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

async function fetchPhotoAsDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const type = response.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_PHOTO_BYTES) return null;

    return `data:${type};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let title = "Capiatá Conecta";
  let price = "Clasificados de Capiatá";
  let neighborhood = "Capiatá, Paraguay";
  let category = "Ofertas y pedidos de vecinos";
  let isOffer = true;
  let photo: string | null = null;

  try {
    const listing = await getListingBySlug(createPublicClient(), slug);

    if (listing) {
      title = listing.title;
      isOffer = listing.type === "OFFER";
      price =
        listing.price !== null && Number(listing.price) > 0
          ? `${Number(listing.price).toLocaleString("es-PY")} Gs.`
          : listing.type === "OFFER"
            ? "Precio a convenir"
            : "Presupuesto a convenir";
      neighborhood = listing.neighborhood || listing.location || "Capiatá";
      category = listing.category?.name ?? "Clasificados locales";

      const firstImage = listing.images?.[0]?.image_url;
      if (firstImage) photo = await fetchPhotoAsDataUrl(firstImage);
    }
  } catch {
    // Sin datos de la publicación mostramos la tarjeta institucional.
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          backgroundColor: "#1E3A5F",
          fontFamily: "Noto Sans, sans-serif",
        }}
      >
        {/* Contenido textual */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flex: 1,
            padding: "56px 48px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 56,
                height: 56,
                borderRadius: 16,
                backgroundColor: "#F5B800",
                color: "#111827",
                fontSize: 32,
                fontWeight: 900,
              }}
            >
              C
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ color: "#FFFFFF", fontSize: 30, fontWeight: 900, letterSpacing: -0.5 }}>
                CAPIATÁ.COM
              </div>
              <div style={{ color: "#F5B800", fontSize: 17, fontWeight: 700 }}>
                {category}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                padding: "8px 18px",
                borderRadius: 999,
                backgroundColor: isOffer ? "#F5B800" : "#FFFFFF",
                color: isOffer ? "#111827" : "#1E3A5F",
                fontSize: 22,
                fontWeight: 900,
              }}
            >
              {isOffer ? "OFREZCO" : "BUSCO"}
            </div>

            <div
              style={{
                color: "#FFFFFF",
                fontSize: title.length > 60 ? 46 : 56,
                fontWeight: 900,
                lineHeight: 1.12,
              }}
            >
              {truncate(title, 96)}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 6 }}>
              <div style={{ color: "#F5B800", fontSize: 40, fontWeight: 900 }}>{price}</div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: "#C7D2E3",
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            <div style={{ display: "flex" }}>📍 {neighborhood}</div>
            <div style={{ display: "flex", color: "#7F94B4" }}>·</div>
            <div style={{ display: "flex" }}>capiata.com</div>
          </div>
        </div>

        {/* Foto de la publicación */}
        {photo && (
          <div style={{ display: "flex", width: 470, height: "100%" }}>
            {/* satori necesita un <img> plano */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo}
              alt=""
              width={470}
              height={630}
              style={{ width: 470, height: 630, objectFit: "cover" }}
            />
          </div>
        )}
      </div>
    ),
    { ...size }
  );
}
