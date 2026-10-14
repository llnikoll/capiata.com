#!/usr/bin/env node
/**
 * E2E autenticado contra el proyecto real de Supabase.
 *
 *   node scripts/e2e-authenticated.mjs --email test@x.com --password "..." 
 *   (o definir E2E_TEST_EMAIL / E2E_TEST_PASSWORD en .env.local)
 *
 * Crea datos de prueba reales (publicación, imagen, avatar, comercio, favorito
 * y reporte), verifica Realtime y RLS de extremo a extremo, y BORRA todo lo que
 * creó antes de terminar (incluso si algo falla).
 */
import { readFileSync, existsSync } from "node:fs";

const args = process.argv.slice(2);
const argValue = (name) => {
  const index = args.indexOf(`--${name}`);
  return index !== -1 ? args[index + 1] : undefined;
};

function loadEnv() {
  const env = { ...process.env };
  if (!existsSync(".env.local")) return env;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    if (!line.includes("=") || line.trim().startsWith("#")) continue;
    const i = line.indexOf("=");
    const name = line.slice(0, i).trim();
    if (!env[name]) env[name] = line.slice(i + 1).trim();
  }
  return env;
}

const env = loadEnv();
const BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const EMAIL = argValue("email") ?? env.E2E_TEST_EMAIL;
const PASSWORD = argValue("password") ?? env.E2E_TEST_PASSWORD;

if (!BASE || !ANON) {
  console.error("✖ Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}
if (!EMAIL || !PASSWORD) {
  console.error("✖ Indicá --email y --password (o E2E_TEST_EMAIL / E2E_TEST_PASSWORD en .env.local)");
  process.exit(1);
}

const anonHeaders = { apikey: ANON, Authorization: `Bearer ${ANON}` };
let authHeaders = anonHeaders;
let userId = null;

let passed = 0;
let failed = 0;

function check(ok, label, detail = "") {
  if (ok) {
    passed += 1;
    console.log(`  ✔ ${label}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed += 1;
    console.log(`  ✖ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function api(path, { method = "GET", body, headers = {}, prefer } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* binario o vacío */
  }
  return { status: res.status, json, text };
}

const stamp = Date.now();

// Imagen PNG 1x1 válida para probar el pipeline de Storage.
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
  "base64"
);

const created = {
  listingId: null,
  listingSlug: null,
  favoriteId: null,
  reportId: null,
  businessId: null,
  objects: [],
  previousProfile: null,
};

console.log(`\n▶ E2E autenticado contra ${BASE}\n`);
console.log("AUTENTICACIÓN");
{
  const login = await api("/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: anonHeaders,
    body: { email: EMAIL, password: PASSWORD },
  });

  if (!login.json?.access_token) {
    check(false, "Login con email/contraseña", `${login.status} ${login.text.slice(0, 160)}`);
    console.log("\n✖ Sin sesión no se puede continuar.\n");
    process.exit(1);
  }

  userId = login.json.user.id;
  authHeaders = { apikey: ANON, Authorization: `Bearer ${login.json.access_token}` };
  check(true, "Login con email/contraseña", `user_id=${userId}`);
}

/**
 * Borra todo lo creado por la prueba y restaura el perfil original.
 * Se ejecuta SIEMPRE (incluso si una verificación falla o se interrumpe).
 */
async function cleanup() {
  console.log("\nLIMPIEZA");

  if (created.reportId) {
    const res = await api(`/rest/v1/reports?id=eq.${created.reportId}`, { method: "DELETE", headers: authHeaders });
    check(res.status < 300, "Reporte de prueba eliminado", `HTTP ${res.status}`);
  }
  if (created.favoriteId) {
    const res = await api(`/rest/v1/favorites?id=eq.${created.favoriteId}`, { method: "DELETE", headers: authHeaders });
    check(res.status < 300, "Favorito de prueba eliminado", `HTTP ${res.status}`);
  }
  if (created.listingId) {
    const images = await api(`/rest/v1/listing_images?listing_id=eq.${created.listingId}`, {
      method: "DELETE",
      headers: authHeaders,
    });
    const del = await api(`/rest/v1/listings?id=eq.${created.listingId}`, { method: "DELETE", headers: authHeaders });
    check(images.status < 300 && del.status < 300, "Publicación e imágenes eliminadas", `HTTP ${del.status}`);
  }
  if (created.businessId) {
    const res = await api(`/rest/v1/businesses?id=eq.${created.businessId}`, { method: "DELETE", headers: authHeaders });
    check(res.status < 300, "Comercio de prueba eliminado", `HTTP ${res.status}`);
  }
  for (const object of created.objects) {
    const res = await fetch(`${BASE}/storage/v1/object/${object.bucket}/${object.path}`, {
      method: "DELETE",
      headers: authHeaders,
    });
    check(res.status < 300, `Objeto borrado de Storage (${object.bucket})`, `HTTP ${res.status}`);
  }
  if (created.previousProfile) {
    const restore = await api(`/rest/v1/profiles?id=eq.${userId}`, {
      method: "PATCH",
      headers: authHeaders,
      body: {
        full_name: created.previousProfile.full_name,
        phone: created.previousProfile.phone,
        bio: created.previousProfile.bio,
        neighborhood: created.previousProfile.neighborhood,
        avatar_url: created.previousProfile.avatar_url,
      },
      prefer: "return=representation",
    });
    const restored = restore.json?.[0];
    check(
      restore.status < 300 && restored?.full_name === created.previousProfile.full_name,
      "Perfil restaurado a sus valores originales",
      `full_name="${restored?.full_name ?? "?"}"`
    );
  }

  const leftovers = await api(`/rest/v1/listings?slug=eq.e2e-publicacion-${stamp}&select=id`, { headers: anonHeaders });
  check(leftovers.json?.length === 0, "No quedan datos de prueba en el feed público");
}

process.on("SIGINT", async () => {
  console.log("\n⚠ Interrumpido: ejecutando limpieza...");
  await cleanup();
  process.exit(130);
});

try {

/* ---------------------------------------------------------- perfil propio */
console.log("\nPERFIL (RLS: cada usuario edita sólo el suyo)");
{
  const mine = await api(`/rest/v1/profiles?id=eq.${userId}&select=*`, { headers: authHeaders });
  const profile = mine.json?.[0];
  check(Boolean(profile), "Perfil auto-creado por el trigger de alta");
  created.previousProfile = profile ?? null;

  const others = await api(`/rest/v1/profiles?id=neq.${userId}&select=id,username&limit=1`, {
    headers: authHeaders,
  });
  const other = others.json?.[0];
  if (other) {
    const tamper = await api(`/rest/v1/profiles?id=eq.${other.id}`, {
      method: "PATCH",
      headers: authHeaders,
      body: { full_name: "HACKED BY E2E" },
      prefer: "return=representation",
    });
    check(
      Array.isArray(tamper.json) && tamper.json.length === 0,
      "No puedo modificar el perfil de otro usuario",
      `filas afectadas: ${Array.isArray(tamper.json) ? tamper.json.length : tamper.status}`
    );
  } else {
    check(true, "No hay otros perfiles para probar aislamiento (se omite)");
  }
}

/* ------------------------------------------------------- storage + avatar */
console.log("\nSTORAGE Y PERFIL DE COMERCIO");
{
  const avatarPath = `${userId}/e2e-${stamp}.png`;
  const upload = await fetch(`${BASE}/storage/v1/object/avatars/${avatarPath}`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "image/png", "x-upsert": "true" },
    body: TINY_PNG,
  });
  const uploaded = await upload.json().catch(() => null);
  check(upload.status === 200, "Subida de avatar al bucket avatars", `HTTP ${upload.status}`);
  if (upload.status === 200) created.objects.push({ bucket: "avatars", path: avatarPath });

  const publicUrl = `${BASE}/storage/v1/object/public/avatars/${avatarPath}`;
  const readable = await fetch(publicUrl, { headers: anonHeaders });
  check(readable.status === 200, "Avatar accesible por URL pública", `HTTP ${readable.status}`);

  if (created.previousProfile) {
    const patch = await api(`/rest/v1/profiles?id=eq.${userId}`, {
      method: "PATCH",
      headers: authHeaders,
      body: {
        full_name: `E2E ${stamp}`,
        phone: "595981000111",
        bio: "Perfil de prueba automatizada",
        neighborhood: "Torremolinos",
        avatar_url: publicUrl,
      },
      prefer: "return=representation",
    });
    check(patch.json?.[0]?.avatar_url === publicUrl, "Perfil guarda el avatar y los datos personales");
  }

  const business = await api("/rest/v1/businesses", {
    method: "POST",
    headers: authHeaders,
    body: {
      user_id: userId,
      business_name: `E2E Comercio ${stamp}`,
      description: "Comercio de prueba automatizada",
      category: "Varios y Ocasión",
      phone: "595981000111",
      whatsapp: "595981000111",
      address: "Torremolinos, Capiatá",
      schedule: "Lun a Vie 08:00 a 18:00",
      logo_url: publicUrl,
    },
    prefer: "return=representation",
  });
  created.businessId = business.json?.[0]?.id ?? null;
  check(Boolean(created.businessId), "Perfil de comercio creado", business.status === 201 ? "" : business.text.slice(0, 120));

  const publicBusiness = await api(`/rest/v1/businesses?id=eq.${created.businessId}&select=id`, { headers: anonHeaders });
  check(publicBusiness.json?.length === 1, "El comercio es visible públicamente (anon)");
}

/* -------------------------------------------- publicación + imagen + feed */
console.log("\nPUBLICACIÓN, IMAGEN Y FEED PÚBLICO");
{
  const categories = await api("/rest/v1/categories?select=id,slug&slug=eq.servicios-tecnicos", { headers: anonHeaders });
  const categoryId = categories.json?.[0]?.id;
  check(Boolean(categoryId), "Categoría resuelta desde la base");

  const imagePath = `${userId}/e2e-${stamp}.png`;
  const upload = await fetch(`${BASE}/storage/v1/object/listings-images/${imagePath}`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "image/png", "x-upsert": "true" },
    body: TINY_PNG,
  });
  check(upload.status === 200, "Subida de foto al bucket listings-images", `HTTP ${upload.status}`);
  if (upload.status === 200) created.objects.push({ bucket: "listings-images", path: imagePath });
  const imageUrl = `${BASE}/storage/v1/object/public/listings-images/${imagePath}`;

  const listing = await api("/rest/v1/listings", {
    method: "POST",
    headers: authHeaders,
    body: {
      user_id: userId,
      type: "OFFER",
      category_id: categoryId,
      title: `E2E Publicación ${stamp}`,
      slug: `e2e-publicacion-${stamp}`,
      description: "Publicación creada por la prueba E2E automatizada. Se elimina al finalizar.",
      price: 123456,
      currency: "GS",
      location: "Capiatá",
      neighborhood: "Torremolinos",
      contact_whatsapp: "595981000111",
      contact_method: ["whatsapp"],
      status: "active",
    },
    prefer: "return=representation",
  });

  created.listingId = listing.json?.[0]?.id ?? null;
  created.listingSlug = listing.json?.[0]?.slug ?? null;
  check(Boolean(created.listingId), "Publicación creada por el usuario autenticado", listing.status === 201 ? "" : listing.text.slice(0, 160));

  const imageRow = await api("/rest/v1/listing_images", {
    method: "POST",
    headers: authHeaders,
    body: { listing_id: created.listingId, image_url: imageUrl, position: 0 },
    prefer: "return=representation",
  });
  check(Boolean(imageRow.json?.[0]?.id), "Imagen vinculada a la publicación");

  const feed = await api(
    `/rest/v1/listings?slug=eq.${created.listingSlug}&select=title,price,neighborhood,profile:profiles(username),category:categories(name),images:listing_images(image_url)`,
    { headers: anonHeaders }
  );
  const visible = feed.json?.[0];
  check(Boolean(visible), "La publicación aparece en el feed público (anon)");
  check(visible?.images?.[0]?.image_url === imageUrl, "La imagen viaja con la publicación");
  check(visible?.profile?.username === created.previousProfile?.username, "El feed incluye los datos del usuario");
  check(visible?.category?.name === "Servicios Técnicos y Oficios", "El feed incluye la categoría");

  const search = await api("/rest/v1/listings?select=slug&title=ilike.*E2E*", { headers: anonHeaders });
  check(Array.isArray(search.json), "Búsqueda por palabra clave responde");

  const otherListing = await api(`/rest/v1/listings?user_id=neq.${userId}&select=id,slug&limit=1`, { headers: anonHeaders });
  if (otherListing.json?.[0]) {
    const tamper = await api(`/rest/v1/listings?id=eq.${otherListing.json[0].id}`, {
      method: "PATCH",
      headers: authHeaders,
      body: { title: "HACKED BY E2E" },
      prefer: "return=representation",
    });
    check(
      Array.isArray(tamper.json) && tamper.json.length === 0,
      "No puedo modificar la publicación de otro usuario",
      `filas afectadas: ${Array.isArray(tamper.json) ? tamper.json.length : tamper.status}`
    );
  }

  const anonInsert = await api("/rest/v1/listings", {
    method: "POST",
    headers: anonHeaders,
    body: { user_id: userId, type: "OFFER", title: "anon", slug: `anon-${stamp}`, description: "x", category_id: categoryId },
  });
  check(anonInsert.status === 401 || anonInsert.status === 403, "Anónimo no puede publicar", `HTTP ${anonInsert.status}`);
}

/* ---------------------------------------------------- favoritos y reportes */
console.log("\nFAVORITOS Y REPORTES");
{
  const favorite = await api("/rest/v1/favorites", {
    method: "POST",
    headers: authHeaders,
    body: { user_id: userId, listing_id: created.listingId },
    prefer: "return=representation",
  });
  created.favoriteId = favorite.json?.[0]?.id ?? null;
  check(Boolean(created.favoriteId), "Favorito guardado en la base");

  const ownFavorites = await api(`/rest/v1/favorites?user_id=eq.${userId}&select=listing_id`, { headers: authHeaders });
  check(ownFavorites.json?.some((row) => row.listing_id === created.listingId), "El favorito se lee desde Supabase");

  const received = await api(
    `/rest/v1/favorites?select=id,listings!inner(user_id)&listings.user_id=eq.${userId}`,
    { headers: authHeaders, prefer: "count=exact" }
  );
  check(received.status === 200, "Métrica de favoritos recibidos (dueño de la publicación)", `HTTP ${received.status}`);

  const anonFavorites = await api("/rest/v1/favorites?select=id", { headers: anonHeaders });
  check(anonFavorites.json?.length === 0 || anonFavorites.status >= 400, "Anónimo no ve favoritos ajenos", `HTTP ${anonFavorites.status}`);

  const report = await api("/rest/v1/reports", {
    method: "POST",
    headers: authHeaders,
    body: {
      reporter_id: userId,
      listing_id: created.listingId,
      reason: "other",
      description: "Prueba E2E automatizada (se elimina al finalizar)",
    },
    prefer: "return=representation",
  });
  created.reportId = report.json?.[0]?.id ?? null;
  check(Boolean(created.reportId), "Reporte guardado en la base");

  const anonReports = await api("/rest/v1/reports?select=id", { headers: anonHeaders });
  check(anonReports.json?.length === 0 || anonReports.status >= 400, "Anónimo no puede leer reportes", `HTTP ${anonReports.status}`);
}

/* --------------------------------------------------------------- realtime */
console.log("\nREALTIME (feed en vivo)");
{
  const socketUrl = `${BASE.replace("https", "wss")}/realtime/v1/websocket?apikey=${ANON}&vsn=1.0.0`;
  const accessToken = authHeaders.Authorization.replace("Bearer ", "");

  const eventReceived = await new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), 15000);
    const ws = new WebSocket(socketUrl);
    let joined = false;

    const finish = (value) => {
      clearTimeout(timer);
      try {
        ws.close();
      } catch {
        /* noop */
      }
      resolve(value);
    };

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          topic: "realtime:e2e",
          event: "phx_join",
          payload: {
            access_token: accessToken,
            config: {
              broadcast: { self: false },
              presence: { key: "" },
              postgres_changes: [{ event: "*", schema: "public", table: "listings" }],
            },
          },
          ref: "1",
        })
      );
    };

    ws.onmessage = async (message) => {
      const payload = JSON.parse(message.data);

      if (!joined && payload.event === "phx_reply" && payload.payload?.status === "ok") {
        joined = true;
        // Disparamos un cambio real una vez suscritos.
        await fetch(`${BASE}/rest/v1/listings?id=eq.${created.listingId}`, {
          method: "PATCH",
          headers: { ...authHeaders, "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify({ title: `E2E Publicación ${stamp} (realtime)` }),
        }).catch(() => null);
      }

      if (payload.event === "postgres_changes") {
        const data = payload.payload?.data ?? {};
        const table = data.table ?? payload.payload?.table;
        const type = data.eventType ?? data.type;
        if (table === "listings" && (type === "UPDATE" || type === "INSERT")) finish(true);
      }
    };

    ws.onerror = () => finish(false);
  });

  check(eventReceived, "El cambio llega en vivo por Supabase Realtime", eventReceived ? "" : "no llegó el evento (¿tabla fuera de la publicación supabase_realtime?)");
}

/* --------------------------------------------------------------- limpieza */
} finally {
  await cleanup();
}

console.log(`\n${failed === 0 ? "✔" : "✖"} ${passed} correctas, ${failed} con problemas\n`);
process.exit(failed === 0 ? 0 : 1);
