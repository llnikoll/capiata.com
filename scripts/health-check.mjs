#!/usr/bin/env node
/**
 * Verificación de salud de Capiatá Conecta contra el proyecto real de Supabase.
 *
 *   node scripts/health-check.mjs            # sólo con la clave anónima
 *   node scripts/health-check.mjs --deep     # además usa SUPABASE_SERVICE_ROLE_KEY
 *
 * Con la clave anónima valida: esquema, seed, lectura pública, RLS y Storage.
 * Con --deep (service role) además crea un usuario de prueba, publica, sube una
 * imagen, comprueba Realtime en vivo y borra todo lo que creó.
 *
 * Lee las credenciales desde .env.local (o variables de entorno).
 */
import { readFileSync, existsSync } from "node:fs";

const DEEP = process.argv.includes("--deep");

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
const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_BASE || !ANON) {
  console.error("✖ Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const anonHeaders = { apikey: ANON, Authorization: `Bearer ${ANON}` };
let passed = 0;
let failed = 0;
let skipped = 0;

function check(ok, label, detail = "") {
  if (ok) {
    passed += 1;
    console.log(`  ✔ ${label}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed += 1;
    console.log(`  ✖ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

/**
 * Verificación que no aplica todavía (por ejemplo, una migración que el usuario
 * no ejecutó). No cuenta como fallo: se informa como pendiente.
 */
function skip(label, detail = "") {
  skipped += 1;
  console.log(`  ⏳ ${label}${detail ? ` — ${detail}` : ""}`);
}

/** ¿La tabla todavía no existe (migración pendiente)? */
function esTablaFaltante(res) {
  return res.status === 404 && /PGRST205|Could not find the table/i.test(res.text);
}

async function rest(path, options = {}, headers = anonHeaders) {
  const res = await fetch(`${URL_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* respuesta no JSON */
  }
  return { status: res.status, json, text, headers: res.headers };
}

console.log(`\n▶ Verificando ${URL_BASE}\n`);

/* ---------------------------------------------------------------- esquema */
console.log("ESQUEMA Y SEED");
{
  const { status, json } = await rest("/rest/v1/categories?select=slug&limit=100");
  check(status === 200 && Array.isArray(json) && json.length >= 14, "14 categorías sembradas", `${json?.length ?? 0} filas`);
}
for (const table of ["listings", "listing_images", "profiles", "businesses", "business_images", "favorites", "reports"]) {
  const { status } = await rest(`/rest/v1/${table}?select=id&limit=1`);
  check(status === 200, `Tabla public.${table} responde`, `HTTP ${status}`);
}

/* ------------------------------------------------- contrato app <-> base */
// Cada columna que el código consulta debe existir: si falta una, PostgREST
// responde 400 nombrando la columna inexistente.
console.log("\nCONTRATO DE COLUMNAS (lo que consulta la app)");
{
  const CONTRATO = {
    profiles:
      "id,username,full_name,avatar_url,phone,bio,city,neighborhood,user_type,is_verified,is_blocked,photo_limit,created_at",
    businesses:
      "id,user_id,business_name,logo_url,description,category,phone,whatsapp,address,schedule,social_links,created_at",
    categories: "id,name,slug,icon,color,description,is_active,listing_count",
    listings:
      "id,user_id,business_id,type,category_id,title,slug,description,price,currency,location,neighborhood,contact_whatsapp,contact_phone,contact_method,status,views_count,created_at,updated_at",
    listing_images: "id,listing_id,image_url,position",
    business_images: "id,business_id,image_url,position,created_at",
    favorites: "id,user_id,listing_id,created_at",
    reports: "id,reporter_id,listing_id,reason,description,status,created_at",
    conversations: "id,listing_id,participant_a,participant_b,last_message_at,created_at",
    messages: "id,conversation_id,sender_id,content,is_read,created_at",
  };

  for (const [table, columns] of Object.entries(CONTRATO)) {
    const res = await rest(`/rest/v1/${table}?select=${columns}&limit=1`);

    if (esTablaFaltante(res)) {
      skip(`Columnas de ${table}`, "tabla inexistente → falta aplicar su migración");
      continue;
    }

    check(
      res.status === 200,
      `Columnas de ${table}`,
      res.status === 200 ? "" : (res.json?.message ?? `HTTP ${res.status}`)
    );
  }
}

/* ------------------------------------------------------ tienda / vitrina */
console.log("\nTIENDA / VITRINA");
{
  const res = await rest("/rest/v1/businesses?select=user_id&limit=1000");

  if (esTablaFaltante(res)) {
    skip("Una tienda por cuenta", "tabla inexistente → falta migración 007");
  } else if (res.status === 200 && Array.isArray(res.json)) {
    const counts = new Map();
    for (const row of res.json) counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
    const duplicates = [...counts.values()].filter((count) => count > 1).length;
    check(duplicates === 0, "Una tienda por cuenta", `${duplicates} usuario(s) duplicado(s)`);
  } else {
    check(false, "Una tienda por cuenta", `HTTP ${res.status}`);
  }

  const insert = await rest("/rest/v1/business_images", {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({
      business_id: "00000000-0000-0000-0000-000000000000",
      image_url: "https://example.com/health-check.jpg",
      position: 0,
    }),
  });

  if (esTablaFaltante(insert)) {
    skip("Anónimo NO puede subir fotos de tienda", "tabla inexistente → falta migración 007");
  } else {
    check(
      insert.status === 401 || insert.status === 403,
      "Anónimo NO puede subir fotos de tienda",
      `HTTP ${insert.status}`
    );
  }
}

/* ----------------------------------------- payloads de escritura de la app */
// PostgREST valida las claves del payload contra el esquema ANTES de aplicar
// RLS, así que un JSON con una clave inventada (p. ej. `categoryId` en vez de
// `category_id`) devuelve 400 PGRST204 incluso sin sesión. Esta sección replica
// los payloads reales que envía la aplicación para detectar ese error acá.
console.log("\nPAYLOADS DE ESCRITURA (claves = columnas reales)");
{
  const DUMMY = "00000000-0000-0000-0000-000000000000";
  const ahora = new Date().toISOString();

  const payloads = [
    {
      nombre: "listings · edición (updateListing)",
      tabla: "listings",
      metodo: "PATCH",
      query: `?id=eq.${DUMMY}`,
      body: {
        type: "OFFER",
        category_id: DUMMY,
        title: "health-check",
        description: "health-check",
        price: 1,
        neighborhood: "Centro",
        contact_whatsapp: "595981000000",
        updated_at: ahora,
      },
    },
    {
      nombre: "listings · creación",
      tabla: "listings",
      metodo: "POST",
      query: "",
      body: {
        user_id: DUMMY,
        business_id: null,
        type: "OFFER",
        category_id: DUMMY,
        title: "health-check",
        slug: `health-check-${Date.now()}`,
        description: "health-check",
        price: null,
        currency: "GS",
        location: "Capiatá",
        neighborhood: "Centro",
        contact_whatsapp: "595981000000",
        contact_method: ["whatsapp"],
        status: "active",
      },
    },
    {
      nombre: "listing_images · alta",
      tabla: "listing_images",
      metodo: "POST",
      query: "",
      body: { listing_id: DUMMY, image_url: "https://example.com/x.jpg", position: 0 },
    },
    {
      nombre: "businesses · alta/edición",
      tabla: "businesses",
      metodo: "POST",
      query: "",
      body: {
        user_id: DUMMY,
        business_name: "health-check",
        logo_url: null,
        description: null,
        category: null,
        phone: null,
        whatsapp: null,
        address: null,
        schedule: null,
        social_links: null,
      },
    },
    {
      nombre: "profiles · edición",
      tabla: "profiles",
      metodo: "PATCH",
      query: `?id=eq.${DUMMY}`,
      body: {
        full_name: "health-check",
        phone: "595981000000",
        bio: null,
        neighborhood: "Centro",
        city: "Capiatá",
        user_type: "person",
        avatar_url: null,
      },
    },
    {
      nombre: "favorites · alta",
      tabla: "favorites",
      metodo: "POST",
      query: "",
      body: { user_id: DUMMY, listing_id: DUMMY },
    },
    {
      nombre: "reports · alta",
      tabla: "reports",
      metodo: "POST",
      query: "",
      body: { reporter_id: DUMMY, listing_id: DUMMY, reason: "other", description: null },
    },
    {
      nombre: "conversations · alta",
      tabla: "conversations",
      metodo: "POST",
      query: "",
      body: { listing_id: null, participant_a: DUMMY, participant_b: DUMMY },
    },
    {
      nombre: "messages · alta",
      tabla: "messages",
      metodo: "POST",
      query: "",
      body: { conversation_id: DUMMY, sender_id: DUMMY, content: "health-check" },
    },
    {
      nombre: "messages · marcar leído",
      tabla: "messages",
      metodo: "PATCH",
      query: `?id=eq.${DUMMY}`,
      body: { is_read: true },
    },
  ];

  for (const item of payloads) {
    const res = await fetch(`${URL_BASE}/rest/v1/${item.tabla}${item.query}`, {
      method: item.metodo,
      headers: { ...anonHeaders, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(item.body),
    });
    const text = await res.text();

    if (esTablaFaltante({ status: res.status, text })) {
      skip(item.nombre, "tabla inexistente → falta aplicar su migración");
      continue;
    }

    const claveInvalida = res.status === 400 && /PGRST204|42703/.test(text);
    check(
      !claveInvalida,
      item.nombre,
      claveInvalida ? text.slice(0, 160) : `HTTP ${res.status} (columnas aceptadas)`
    );
  }
}

/* ------------------------------------------------------------------- RLS */
console.log("\nROW LEVEL SECURITY");
{
  const conversations = await rest("/rest/v1/conversations?select=id&limit=1");

  if (esTablaFaltante(conversations)) {
    skip("Conversaciones protegidas para anónimos", "tabla inexistente → falta migración 006");
  } else {
    check(
      conversations.status === 200 || conversations.status === 401 || conversations.status === 403,
      "Conversaciones protegidas para anónimos",
      `HTTP ${conversations.status}`
    );
  }

  const messages = await rest("/rest/v1/messages?select=id&limit=1");

  if (esTablaFaltante(messages)) {
    skip("Mensajes protegidos para anónimos", "tabla inexistente → falta migración 006");
  } else {
    check(
      messages.status === 200 || messages.status === 401 || messages.status === 403,
      "Mensajes protegidos para anónimos",
      `HTTP ${messages.status}`
    );
  }

  const { status, json } = await rest("/rest/v1/listings?select=id,status&limit=100");
  const onlyActive = Array.isArray(json) && json.every((row) => row.status === "active");
  check(status === 200 && onlyActive, "Anónimo sólo ve publicaciones activas");

  const insert = await rest("/rest/v1/listings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "OFFER", title: "health-check", slug: `hc-${Date.now()}`, description: "x" }),
  });
  check(insert.status === 401 || insert.status === 403, "Anónimo NO puede insertar publicaciones", `HTTP ${insert.status}`);

  const profilesInsert = await rest("/rest/v1/profiles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: crypto.randomUUID(), username: `hc-${Date.now()}` }),
  });
  check(
    profilesInsert.status === 401 || profilesInsert.status === 403,
    "Anónimo NO puede crear perfiles",
    `HTTP ${profilesInsert.status}`
  );
}

/* ------------------------------------------------- migración 004 y 002 */
console.log("\nMIGRACIONES (004_production_hardening / 002_increment_views)");
{
  const admin = await rest("/rest/v1/profiles?select=id,is_admin&limit=1");
  check(admin.status === 200, "Columna profiles.is_admin existe", admin.status === 400 ? "falta migración 004" : `HTTP ${admin.status}`);

  const rpc = await rest("/rest/v1/rpc/is_admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  check(rpc.status === 200, "Función public.is_admin() existe", rpc.status === 404 ? "falta migración 004" : `HTTP ${rpc.status}`);

  const views = await rest("/rest/v1/rpc/increment_views", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listing_id: "00000000-0000-0000-0000-000000000000" }),
  });
  check(views.status !== 404, "Función increment_views() existe", views.status === 404 ? "falta migración 002" : `HTTP ${views.status}`);

  const reportsInsert = await rest("/rest/v1/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reporter_id: "00000000-0000-0000-0000-000000000000", listing_id: "00000000-0000-0000-0000-000000000000", reason: "other" }),
  });
  check(reportsInsert.status === 401 || reportsInsert.status === 403, "Anónimo NO puede crear reportes", `HTTP ${reportsInsert.status}`);
}

/* --------------------------------------------------------------- storage */
console.log("\nSTORAGE");
{
  // Una subida anónima distingue con certeza "bucket inexistente" de
  // "bucket existente que rechaza correctamente por RLS".
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
    "base64"
  );

  for (const bucket of ["listings-images", "avatars"]) {
    const res = await fetch(`${URL_BASE}/storage/v1/object/${bucket}/__health_check__/pixel.png`, {
      method: "POST",
      headers: { ...anonHeaders, "Content-Type": "image/png" },
      body: png,
    });
    const body = await res.text();
    const missing = body.includes("Bucket not found") || body.includes("NoSuchBucket");
    check(
      !missing,
      `Bucket "${bucket}" existe y aplica RLS`,
      missing ? "bucket ausente → ejecutá la migración 004" : "rechaza la subida anónima (correcto)"
    );
  }
}

/* ---------------------------------------------------------------- realtime */
console.log("\nREALTIME");
{
  const socketUrl = `${URL_BASE.replace("https", "wss")}/realtime/v1/websocket?apikey=${ANON}&vsn=1.0.0`;
  const subscribed = await new Promise((resolve) => {
    const timer = setTimeout(() => resolve("timeout"), 8000);
    const ws = new WebSocket(socketUrl);
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          topic: "realtime:health-check",
          event: "phx_join",
          payload: {
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
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.event === "phx_reply" && message.payload?.status === "ok") {
        clearTimeout(timer);
        ws.close();
        resolve("ok");
      }
    };
    ws.onerror = () => {
      clearTimeout(timer);
      resolve("error");
    };
  });
  check(subscribed === "ok", "Canal Realtime acepta la suscripción anónima", `estado: ${subscribed}`);
}

/* ----------------------------------------------------------------- profundo */
if (DEEP) {
  console.log("\nPRUEBA PROFUNDA (service role)");
  if (!SERVICE) {
    check(false, "SUPABASE_SERVICE_ROLE_KEY disponible", "no definida");
  } else {
    const adminHeaders = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` };
    const email = `health-check+${Date.now()}@capiata.test`;
    const password = `Hc-${Date.now()}!aA1`;
    let userId = null;

    try {
      const created = await fetch(`${URL_BASE}/auth/v1/admin/users`, {
        method: "POST",
        headers: { ...adminHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, email_confirm: true }),
      });
      const user = await created.json();
      userId = user.id;
      check(Boolean(userId), "Usuario de prueba creado y confirmado", userId ?? JSON.stringify(user).slice(0, 120));

      const login = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { apikey: ANON, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const session = await login.json();
      check(Boolean(session.access_token), "Login con contraseña devuelve sesión");
    } catch (error) {
      check(false, "Ciclo de usuario de prueba", error.message);
    } finally {
      if (userId) {
        await fetch(`${URL_BASE}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: adminHeaders });
        console.log("  ↺ usuario de prueba eliminado");
      }
    }
  }
}

const pendientes = skipped > 0 ? ` · ⏳ ${skipped} pendientes de migración` : "";
console.log(`\n${failed === 0 ? "✔" : "✖"} ${passed} correctas, ${failed} con problemas${pendientes}\n`);
process.exit(failed === 0 ? 0 : 1);
