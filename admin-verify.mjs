import { readFileSync } from "node:fs";
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    })
);
const H = { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` };
const profiles = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?select=username,full_name,is_admin,is_blocked&order=created_at.asc`, { headers: H }).then((r) => r.json());
for (const p of profiles) {
  console.log(`${p.is_admin ? "👑 ADMIN" : "       "} ${p.is_blocked ? "🚫 BLOQUEADO" : "            "} @${p.username.padEnd(26)} ${p.full_name ?? ""}`);
}
console.log(`\nAdministradores: ${profiles.filter((p) => p.is_admin).length}/${profiles.length}`);
