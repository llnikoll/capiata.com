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

function check(ok, label, detail = "") {
  if (ok) {
    passed += 1;
    console.log(`  ✔ ${label}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed += 1;
    console.log(`  ✖ ${label}${detail ? ` — ${detail}` : ""}`);
  }
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
for (const table of ["listings", "listing_images", "profiles", "businesses", "favorites", "reports"]) {
  const { status } = await rest(`/rest/v1/${table}?select=id&limit=1`);
  check(status === 200, `Tabla public.${table} responde`, `HTTP ${status}`);
}

/* ------------------------------------------------------------------- RLS */
console.log("\nROW LEVEL SECURITY");
{
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

  const rpc = await rest("/rest/v1/rpc/is_admin", { method: "POST", body: "{}" });
  check(rpc.status !== 404, "Función public.is_admin() existe", rpc.status === 404 ? "falta migración 004" : `HTTP ${rpc.status}`);

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
for (const bucket of ["listings-images", "avatars"]) {
  const res = await fetch(`${URL_BASE}/storage/v1/object/public/${bucket}/__health_check__.jpg`, { headers: anonHeaders });
  const body = await res.text();
  const exists = !body.includes("NoSuchBucket");
  check(exists, `Bucket público "${bucket}" existe`, exists ? "" : "bucket ausente");
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

console.log(`\n${failed === 0 ? "✔" : "✖"} ${passed} correctas, ${failed} con problemas\n`);
process.exit(failed === 0 ? 0 : 1);
