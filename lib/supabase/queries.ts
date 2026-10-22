import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseQueryError } from "./errors";
import type {
  AdminStats,
  Business,
  BusinessImage,
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

  // Adjuntamos el detalle de PostgREST (código, mensaje, detalle y sugerencia)
  // para que la interfaz muestre la causa real y no un mensaje genérico.
  const detail = describePostgrestError(error);
  throw new SupabaseQueryError(detail ? `${message} [${detail}]` : message, error);
}

function describePostgrestError(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;

  const { code, message, details, hint } = error as {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
  };

  const parts = [code, message, details, hint].filter(
    (part): part is string => Boolean(part) && part !== "null"
  );

  return parts.length > 0 ? parts.join(" · ") : null;
}

function sortImages(listing: Listing): Listing {
  if (listing.images?.length) {
    listing.images = [...listing.images].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }
  return listing;
}

function sortBusinessImages(images: BusinessImage[]): BusinessImage[] {
  return [...images].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

/* ------------------------------------------------------------------ */
/* Publicaciones                                                       */
/* ------------------------------------------------------------------ */

/**
 * Normaliza el texto de búsqueda igual que la columna `listings.search_text`
 * (minúsculas y sin tildes), para que "reparacion" encuentre "Reparación".
 */
export function normalizeSearchTerm(term: string): string {
  return term
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[,()%\\*]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** ¿El error indica que la columna search_text todavía no existe? */
function isMissingSearchColumn(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { code, message } = error as { code?: string; message?: string };
  return (
    (code === "PGRST204" || code === "42703") && Boolean(message?.includes("search_text"))
  );
}

export async function getListings(
  supabase: SupabaseClient,
  options: ListingQueryOptions = {}
): Promise<Listing[]> {
  const term = options.searchQuery ? normalizeSearchTerm(options.searchQuery) : "";

  const buildQuery = (searchMode: "normalized" | "legacy") => {
    let query = supabase.from("listings").select(LISTING_SELECT);

    if (!options.includeAllStatuses) {
      query = query.eq("status", "active");
    }

    if (options.type) {
      query = query.eq("type", options.type);
    }

    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    if (options.neighborhood) {
      query = query.eq("neighborhood", options.neighborhood);
    }

    if (term) {
      // `search_text` está en minúsculas y sin tildes (migración 005).
      query =
        searchMode === "normalized"
          ? query.ilike("search_text", `%${term}%`)
          : query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
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

    return query.range(offset, offset + limit - 1);
  };

  const categoryId = options.categorySlug
    ? await getCategoryIdBySlug(supabase, options.categorySlug)
    : null;

  if (options.categorySlug && !categoryId) return [];

  let { data, error } = await buildQuery("normalized");

  // Si la migración 005 aún no se aplicó, seguimos funcionando con la búsqueda
  // anterior (sensible a tildes) en lugar de romper el listado.
  if (error && term && isMissingSearchColumn(error)) {
    ({ data, error } = await buildQuery("legacy"));
  }

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

/** Publicación por id (el dueño la ve aunque esté pausada; RLS filtra el resto). */
export async function getListingById(
  supabase: SupabaseClient,
  listingId: string
): Promise<Listing | null> {
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("id", listingId)
    .maybeSingle();

  if (error) fail("No pudimos cargar la publicación.", error);
  if (!data) return null;

  return sortImages(data as unknown as Listing);
}

/**
 * Campos editables de una publicación.
 *
 * IMPORTANTE: las claves deben ser EXACTAMENTE los nombres de las columnas
 * (`category_id`, `contact_whatsapp`, …) porque el objeto se envía tal cual a
 * PostgREST; una clave en formato JavaScript provoca un error 400 PGRST204.
 */
export interface ListingUpdateInput {
  type: ListingType;
  category_id: string;
  title: string;
  description: string;
  price: number | null;
  neighborhood: string;
  contact_whatsapp: string;
}

/**
 * Guarda los cambios de una publicación existente.
 * El slug NO se modifica para no romper los enlaces ya compartidos.
 *
 * La mutación NO usa recursos embebidos (solo `select("id")`): los embeds en
 * mutaciones son frágiles y devuelven 400 ante cambios de esquema. La versión
 * completa se relee después con `getListingById`.
 */
export async function updateListing(
  supabase: SupabaseClient,
  input: { listingId: string; userId: string; values: ListingUpdateInput }
): Promise<Listing> {
  // Payload explícito: sólo columnas reales de public.listings.
  const payload = {
    type: input.values.type,
    category_id: input.values.category_id,
    title: input.values.title,
    description: input.values.description,
    price: input.values.price,
    neighborhood: input.values.neighborhood,
    contact_whatsapp: input.values.contact_whatsapp,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("listings")
    .update(payload)
    .eq("id", input.listingId)
    .eq("user_id", input.userId)
    .select("id");

  if (error) fail("No pudimos guardar los cambios de la publicación.", error);

  if (!data || data.length === 0) {
    throw new SupabaseQueryError(
      "No se actualizó ninguna fila: la publicación no existe, no te pertenece o la sesión expiró. " +
        "Recargá la página y volvé a iniciar sesión si el problema continúa."
    );
  }

  const updated = await getListingById(supabase, input.listingId);
  if (!updated) {
    throw new SupabaseQueryError("La publicación se actualizó pero no pudimos volver a leerla.");
  }

  return updated;
}

/** Quita filas de imágenes de una publicación (RLS exige ser el dueño). */
export async function deleteListingImages(
  supabase: SupabaseClient,
  imageIds: string[]
): Promise<void> {
  if (imageIds.length === 0) return;

  const { error } = await supabase.from("listing_images").delete().in("id", imageIds);
  if (error) fail("No pudimos quitar las fotos seleccionadas.", error);
}

/** Agrega imágenes nuevas con su posición final y devuelve las filas creadas. */
export async function insertListingImages(
  supabase: SupabaseClient,
  rows: Array<{ listingId: string; url: string; position: number }>
): Promise<Array<{ id: string; image_url: string; position: number }>> {
  if (rows.length === 0) return [];

  const { data, error } = await supabase
    .from("listing_images")
    .insert(
      rows.map((row) => ({
        listing_id: row.listingId,
        image_url: row.url,
        position: row.position,
      }))
    )
    .select("id, image_url, position");

  if (error) fail("No pudimos guardar las fotos nuevas.", error);

  return (data ?? []) as Array<{ id: string; image_url: string; position: number }>;
}

/** Reordena la galería (se usa para definir la portada). */
export async function updateListingImagePositions(
  supabase: SupabaseClient,
  updates: Array<{ id: string; position: number }>
): Promise<void> {
  for (const update of updates) {
    const { error } = await supabase
      .from("listing_images")
      .update({ position: update.position })
      .eq("id", update.id);

    if (error) fail("No pudimos reordenar las fotos.", error);
  }
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

/** Categoría completa por slug (para precargar el formulario de edición). */
export async function getCategoryBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<Category | null> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, icon, color, description, is_active, listing_count")
    .eq("slug", slug)
    .maybeSingle();

  if (error) fail("No pudimos cargar la categoría.", error);

  return (data as unknown as Category) ?? null;
}

export async function getBusinesses(
  supabase: SupabaseClient,
  options?: { limit?: number }
): Promise<Business[]> {
  // El username permite que cada tarjeta del directorio enlace a su tienda.
  const { data, error } = await supabase
    .from("businesses")
    .select(`${BUSINESS_COLUMNS}, profile:profiles(username, is_verified)`)
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
/* Galería de la tienda                                                */
/* ------------------------------------------------------------------ */

export async function getBusinessImages(
  supabase: SupabaseClient,
  businessId: string
): Promise<BusinessImage[]> {
  const { data, error } = await supabase
    .from("business_images")
    .select("id, business_id, image_url, position, created_at")
    .eq("business_id", businessId);

  if (error) fail("No pudimos cargar las fotos de la tienda.", error);

  return sortBusinessImages((data ?? []) as unknown as BusinessImage[]);
}

export async function insertBusinessImages(
  supabase: SupabaseClient,
  rows: Array<{ businessId: string; url: string; position: number }>
): Promise<BusinessImage[]> {
  if (rows.length === 0) return [];

  const { data, error } = await supabase
    .from("business_images")
    .insert(
      rows.map((row) => ({
        business_id: row.businessId,
        image_url: row.url,
        position: row.position,
      }))
    )
    .select("id, business_id, image_url, position, created_at");

  if (error) fail("No pudimos guardar las fotos de la tienda.", error);

  return (data ?? []) as unknown as BusinessImage[];
}

export async function deleteBusinessImages(
  supabase: SupabaseClient,
  imageIds: string[]
): Promise<void> {
  if (imageIds.length === 0) return;

  const { error } = await supabase.from("business_images").delete().in("id", imageIds);
  if (error) fail("No pudimos quitar las fotos seleccionadas.", error);
}

export async function updateBusinessImagePositions(
  supabase: SupabaseClient,
  updates: Array<{ id: string; position: number }>
): Promise<void> {
  for (const update of updates) {
    const { error } = await supabase
      .from("business_images")
      .update({ position: update.position })
      .eq("id", update.id);

    if (error) fail("No pudimos reordenar las fotos de la tienda.", error);
  }
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

/** Cupo de fotos de la vitrina del usuario (10 por defecto en la base). */
export async function getProfilePhotoLimit(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("profiles")
    .select("photo_limit")
    .eq("id", userId)
    .maybeSingle();

  if (error) fail("No pudimos cargar tu cupo de fotos.", error);

  return data?.photo_limit ?? 10;
}

/** Marca la cuenta como comercio al abrir su tienda. */
export async function setUserAsBusiness(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ user_type: "business" })
    .eq("id", userId);

  if (error) fail("No pudimos marcar tu cuenta como comercio.", error);
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
    .select(`${PROFILE_COLUMNS}, is_admin, photo_limit`)
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 100);

  if (error) fail("No pudimos cargar los usuarios.", error);

  return (data ?? []) as unknown as Profile[];
}

export async function updateProfileModeration(
  supabase: SupabaseClient,
  profileId: string,
  patch: { is_verified?: boolean; is_blocked?: boolean; photo_limit?: number }
): Promise<void> {
  const { error } = await supabase.from("profiles").update(patch).eq("id", profileId);
  if (error) fail("No pudimos actualizar el estado del usuario.", error);
}

/** Cuántas fotos de vitrina usó cada cuenta (panel admin). */
export async function getBusinessPhotoUsage(
  supabase: SupabaseClient
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("business_images")
    .select("business_id, business:businesses(user_id)");

  if (error) fail("No pudimos contar las fotos de las tiendas.", error);

  const usage: Record<string, number> = {};
  for (const row of (data ?? []) as unknown as Array<{
    business: { user_id: string } | null;
  }>) {
    const userId = row.business?.user_id;
    if (userId) usage[userId] = (usage[userId] ?? 0) + 1;
  }

  return usage;
}

/** Usuarios con tienda, para el sitemap. */
export async function getStoreUsernames(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase
    .from("businesses")
    .select("profile:profiles(username)");

  if (error) fail("No pudimos cargar las tiendas.", error);

  return ((data ?? []) as unknown as Array<{ profile: { username: string } | null }>)
    .map((row) => row.profile?.username)
    .filter((username): username is string => Boolean(username));
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
