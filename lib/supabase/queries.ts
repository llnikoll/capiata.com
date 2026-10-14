import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseQueryError } from "./errors";
import type {
  AdminStats,
  Business,
  BusinessUpdateInput,
  Category,
  FavoriteWithListing,
  Listing,
  ListingStatus,
  ListingType,
  Profile,
  ProfileUpdateInput,
  Report,
  ReportReason,
  ReportWithRelations,
} from "@/lib/types";

/**
 * Capa de acceso a datos. Todas las funciones reciben un cliente Supabase
 * (browser o server) y lanzan SupabaseQueryError cuando la operación falla,
 * para que la interfaz pueda distinguir "vacío" de "error de red".
 *
 * Ninguna función usa datos simulados: el contenido proviene exclusivamente
 * de las tablas public.* y de Supabase Storage.
 */

const PROFILE_COLUMNS =
  "id, username, full_name, avatar_url, phone, bio, city, neighborhood, user_type, is_verified, is_blocked, created_at";

const BUSINESS_COLUMNS =
  "id, user_id, business_name, logo_url, description, category, phone, whatsapp, address, schedule, social_links, created_at";

/** Columnas de una publicación con sus relaciones embebidas (perfil, comercio, imágenes, categoría). */
export const LISTING_SELECT = `
  id, user_id, business_id, type, category_id, title, slug, description,
  price, currency, location, neighborhood, contact_whatsapp, contact_phone,
  contact_method, status, views_count, created_at, updated_at,
  category:categories(id, name, slug, icon, color, description, is_active, listing_count),
  profile:profiles(${PROFILE_COLUMNS}),
  business:businesses(${BUSINESS_COLUMNS}),
  images:listing_images(id, listing_id, image_url, position)
`;

export interface ListingQueryOptions {
  type?: ListingType;
  categorySlug?: string;
  neighborhood?: string;
  searchQuery?: string;
  sort?: "newest" | "price_asc" | "price_desc";
  limit?: number;
  offset?: number;
  /** Incluye publicaciones pausadas/eliminadas (panel del dueño o admin). */
  includeAllStatuses?: boolean;
}

function fail(message: string, error: unknown): never {
  if (error instanceof SupabaseQueryError) throw error;
  throw new SupabaseQueryError(message, error);
}

/** Limpia caracteres con significado en la sintaxis de filtros de PostgREST. */
function sanitizeSearchTerm(term: string): string {
  return term.replace(/[,()%\\*]/g, " ").trim();
}

function sortImages(listing: Listing): Listing {
  if (listing.images?.length) {
    listing.images = [...listing.images].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }
  return listing;
}

/* ------------------------------------------------------------------ */
/* Publicaciones                                                       */
/* ------------------------------------------------------------------ */

export async function getListings(
  supabase: SupabaseClient,
  options: ListingQueryOptions = {}
): Promise<Listing[]> {
  let query = supabase.from("listings").select(LISTING_SELECT);

  if (!options.includeAllStatuses) {
    query = query.eq("status", "active");
  }

  if (options.type) {
    query = query.eq("type", options.type);
  }

  if (options.categorySlug) {
    const categoryId = await getCategoryIdBySlug(supabase, options.categorySlug);
    if (!categoryId) return [];
    query = query.eq("category_id", categoryId);
  }

  if (options.neighborhood) {
    query = query.eq("neighborhood", options.neighborhood);
  }

  if (options.searchQuery) {
    const term = sanitizeSearchTerm(options.searchQuery);
    if (term) {
      query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
    }
  }

  switch (options.sort) {
    case "price_asc":
      query = query.order("price", { ascending: true, nullsFirst: false });
      break;
    case "price_desc":
      query = query.order("price", { ascending: false, nullsFirst: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const limit = options.limit ?? 60;
  const offset = options.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) fail("No pudimos cargar las publicaciones.", error);

  return ((data ?? []) as unknown as Listing[]).map(sortImages);
}

export async function getListingBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<Listing | null> {
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (error) fail("No pudimos cargar la publicación.", error);
  if (!data) return null;

  return sortImages(data as unknown as Listing);
}

export async function getRelatedListings(
  supabase: SupabaseClient,
  input: { categoryId: string; excludeListingId: string; limit?: number }
): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("status", "active")
    .eq("category_id", input.categoryId)
    .neq("id", input.excludeListingId)
    .order("created_at", { ascending: false })
    .limit(input.limit ?? 3);

  if (error) fail("No pudimos cargar publicaciones relacionadas.", error);

  return ((data ?? []) as unknown as Listing[]).map(sortImages);
}

/** Incrementa el contador de vistas. Es best-effort: nunca rompe la vista. */
export async function incrementListingViews(
  supabase: SupabaseClient,
  listingId: string
): Promise<void> {
  const { error } = await supabase.rpc("increment_views", { listing_id: listingId });
  if (error) {
    // No es crítico para el usuario: la vista se muestra igual.
    return;
  }
}

/** Publicaciones del usuario autenticado (activas, pausadas y pendientes). */
export async function getUserListings(
  supabase: SupabaseClient,
  userId: string,
  type?: ListingType
): Promise<Listing[]> {
  let query = supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("user_id", userId)
    .in("status", ["active", "paused", "pending"])
    .order("created_at", { ascending: false });

  if (type) query = query.eq("type", type);

  const { data, error } = await query;
  if (error) fail("No pudimos cargar tus publicaciones.", error);

  return ((data ?? []) as unknown as Listing[]).map(sortImages);
}

export async function updateListingStatus(
  supabase: SupabaseClient,
  input: { listingId: string; userId: string; status: ListingStatus }
): Promise<void> {
  const { error } = await supabase
    .from("listings")
    .update({ status: input.status })
    .eq("id", input.listingId)
    .eq("user_id", input.userId);

  if (error) fail("No pudimos actualizar el estado de la publicación.", error);
}

export async function softDeleteListing(
  supabase: SupabaseClient,
  input: { listingId: string; userId?: string }
): Promise<void> {
  let query = supabase
    .from("listings")
    .update({ status: "deleted" })
    .eq("id", input.listingId);

  if (input.userId) query = query.eq("user_id", input.userId);

  const { error } = await query;
  if (error) fail("No pudimos eliminar la publicación.", error);
}

/* ------------------------------------------------------------------ */
/* Categorías y comercios                                              */
/* ------------------------------------------------------------------ */

export async function getCategories(supabase: SupabaseClient): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, icon, color, description, is_active, listing_count")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) fail("No pudimos cargar las categorías.", error);

  return (data ?? []) as unknown as Category[];
}

async function getCategoryIdBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (error) fail("No pudimos resolver la categoría seleccionada.", error);
  return data?.id ?? null;
}

export async function getBusinesses(
  supabase: SupabaseClient,
  options?: { limit?: number }
): Promise<Business[]> {
  const { data, error } = await supabase
    .from("businesses")
    .select(BUSINESS_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 60);

  if (error) fail("No pudimos cargar los comercios.", error);

  return (data ?? []) as unknown as Business[];
}

export async function getBusinessByUser(
  supabase: SupabaseClient,
  userId: string
): Promise<Business | null> {
  const { data, error } = await supabase
    .from("businesses")
    .select(BUSINESS_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) fail("No pudimos cargar tu perfil de comercio.", error);

  return (data as unknown as Business) ?? null;
}

/** Crea o actualiza el comercio del usuario (uno por usuario en esta fase). */
export async function saveBusiness(
  supabase: SupabaseClient,
  userId: string,
  input: BusinessUpdateInput,
  existingId?: string | null
): Promise<Business> {
  if (existingId) {
    const { data, error } = await supabase
      .from("businesses")
      .update(input)
      .eq("id", existingId)
      .eq("user_id", userId)
      .select(BUSINESS_COLUMNS)
      .single();

    if (error) fail("No pudimos guardar los datos del comercio.", error);
    return data as unknown as Business;
  }

  const { data, error } = await supabase
    .from("businesses")
    .insert({ ...input, user_id: userId })
    .select(BUSINESS_COLUMNS)
    .single();

  if (error) fail("No pudimos crear el perfil de comercio.", error);
  return data as unknown as Business;
}

/* ------------------------------------------------------------------ */
/* Perfiles                                                            */
/* ------------------------------------------------------------------ */

export async function getProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error) fail("No pudimos cargar tu perfil.", error);

  return (data as unknown as Profile) ?? null;
}

/** Perfil público por nombre de usuario (lectura abierta a cualquier visitante). */
export async function getProfileByUsername(
  supabase: SupabaseClient,
  username: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("username", username)
    .maybeSingle();

  if (error) fail("No pudimos cargar el perfil.", error);

  return (data as unknown as Profile) ?? null;
}

/** Publicaciones activas de un usuario, para su perfil público. */
export async function getActiveListingsByUser(
  supabase: SupabaseClient,
  userId: string,
  limit = 24
): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) fail("No pudimos cargar las publicaciones del perfil.", error);

  return ((data ?? []) as unknown as Listing[]).map(sortImages);
}

export async function updateProfile(
  supabase: SupabaseClient,
  userId: string,
  input: ProfileUpdateInput
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update(input)
    .eq("id", userId)
    .select(PROFILE_COLUMNS)
    .single();

  if (error) fail("No pudimos guardar tu perfil.", error);
  return data as unknown as Profile;
}

/* ------------------------------------------------------------------ */
/* Favoritos                                                           */
/* ------------------------------------------------------------------ */

export async function getFavorites(
  supabase: SupabaseClient,
  userId: string
): Promise<FavoriteWithListing[]> {
  const { data, error } = await supabase
    .from("favorites")
    .select(`id, user_id, listing_id, created_at, listing:listings(${LISTING_SELECT})`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) fail("No pudimos cargar tus favoritos.", error);

  const favorites = (data ?? []) as unknown as FavoriteWithListing[];
  return favorites.map((favorite) => ({
    ...favorite,
    listing: favorite.listing ? sortImages(favorite.listing) : null,
  }));
}

export async function addFavorite(
  supabase: SupabaseClient,
  userId: string,
  listingId: string
): Promise<void> {
  const { error } = await supabase
    .from("favorites")
    .upsert({ user_id: userId, listing_id: listingId }, { onConflict: "user_id,listing_id" });

  if (error) fail("No pudimos guardar el favorito.", error);
}

export async function removeFavorite(
  supabase: SupabaseClient,
  userId: string,
  listingId: string
): Promise<void> {
  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("listing_id", listingId);

  if (error) fail("No pudimos quitar el favorito.", error);
}

/** Cantidad de veces que otros usuarios guardaron mis publicaciones. */
export async function getReceivedFavoritesCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("favorites")
    .select("id, listings!inner(user_id)", { count: "exact", head: true })
    .eq("listings.user_id", userId);

  if (error) fail("No pudimos contar los favoritos recibidos.", error);

  return count ?? 0;
}

/* ------------------------------------------------------------------ */
/* Reportes                                                            */
/* ------------------------------------------------------------------ */

export async function createReport(
  supabase: SupabaseClient,
  input: {
    reporterId: string;
    listingId: string;
    reason: ReportReason;
    description: string | null;
  }
): Promise<void> {
  const { error } = await supabase.from("reports").insert({
    reporter_id: input.reporterId,
    listing_id: input.listingId,
    reason: input.reason,
    description: input.description,
  });

  if (error) fail("No pudimos enviar el reporte.", error);
}

/* ------------------------------------------------------------------ */
/* Panel administrativo                                                */
/* ------------------------------------------------------------------ */

export async function getAdminStats(supabase: SupabaseClient): Promise<AdminStats> {
  const [users, listings, businesses, pendingReports] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("listings").select("id", { count: "exact", head: true }).neq("status", "deleted"),
    supabase.from("businesses").select("id", { count: "exact", head: true }),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  const firstError = users.error || listings.error || businesses.error || pendingReports.error;
  if (firstError) fail("No pudimos cargar las estadísticas del panel.", firstError);

  return {
    users: users.count ?? 0,
    listings: listings.count ?? 0,
    businesses: businesses.count ?? 0,
    pendingReports: pendingReports.count ?? 0,
  };
}

export async function getAdminListings(
  supabase: SupabaseClient,
  options?: { limit?: number }
): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .neq("status", "deleted")
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 100);

  if (error) fail("No pudimos cargar las publicaciones.", error);

  return ((data ?? []) as unknown as Listing[]).map(sortImages);
}

export async function getAdminProfiles(
  supabase: SupabaseClient,
  options?: { limit?: number }
): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(`${PROFILE_COLUMNS}, is_admin`)
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 100);

  if (error) fail("No pudimos cargar los usuarios.", error);

  return (data ?? []) as unknown as Profile[];
}

export async function updateProfileModeration(
  supabase: SupabaseClient,
  profileId: string,
  patch: { is_verified?: boolean; is_blocked?: boolean }
): Promise<void> {
  const { error } = await supabase.from("profiles").update(patch).eq("id", profileId);
  if (error) fail("No pudimos actualizar el estado del usuario.", error);
}

export async function getAdminReports(supabase: SupabaseClient): Promise<ReportWithRelations[]> {
  const { data, error } = await supabase
    .from("reports")
    .select(
      `id, reporter_id, listing_id, reason, description, status, created_at,
       listing:listings(id, title, slug, status),
       reporter:profiles(id, username, full_name, avatar_url)`
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) fail("No pudimos cargar los reportes.", error);

  return (data ?? []) as unknown as ReportWithRelations[];
}

export async function updateReportStatus(
  supabase: SupabaseClient,
  reportId: string,
  status: Report["status"]
): Promise<void> {
  const { error } = await supabase.from("reports").update({ status }).eq("id", reportId);
  if (error) fail("No pudimos actualizar el reporte.", error);
}
