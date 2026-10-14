import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Intercambia el código de OAuth/magic-link por una sesión y garantiza que el
 * usuario tenga fila en public.profiles (por si el trigger de alta no corrió).
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedNext = requestUrl.searchParams.get("next") ?? "/dashboard";
  const next = requestedNext.startsWith("/") ? requestedNext : "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/login", requestUrl.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin)
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      const email = user.email ?? "";
      const baseUsername =
        email
          .split("@")[0]
          ?.normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9_]/gi, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "")
          .toLowerCase() || "usuario";

      await supabase.from("profiles").insert({
        id: user.id,
        username: `${baseUsername}-${user.id.slice(0, 8)}`,
        full_name:
          (user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined) ??
          null,
        avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
        city: "Capiatá",
        user_type: "person",
      });
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
