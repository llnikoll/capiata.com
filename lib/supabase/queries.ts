import { createClient } from "./client";
import { Listing, Business, Category } from "@/lib/types";

// Get all active listings with their related data
export async function getListings(options?: {
  type?: "OFFER" | "REQUEST";
  categorySlug?: string;
  neighborhood?: string;
  searchQuery?: string;
  limit?: number;
}): Promise<Listing[]> {
  const supabase = createClient();

  let query = supabase
    .from("listings")
    .select(`
      *,
      category:categories(*),
      profile:profiles(*),
      business:businesses(*),
      images:listing_images(*)
    `)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (options?.type) {
    query = query.eq("type", options.type);
  }

  if (options?.categorySlug) {
    query = query.eq("category.slug", options.categorySlug);
  }

  if (options?.neighborhood) {
    query = query.eq("neighborhood", options.neighborhood);
  }

  if (options?.searchQuery) {
    query = query.or(`title.ilike.%${options.searchQuery}%,description.ilike.%${options.searchQuery}%`);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching listings:", error);
    return [];
  }

  return data || [];
}

// Get a single listing by slug
export async function getListingBySlug(slug: string): Promise<Listing | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("listings")
    .select(`
      *,
      category:categories(*),
      profile:profiles(*),
      business:businesses(*),
      images:listing_images(*)
    `)
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (error) {
    console.error("Error fetching listing:", error);
    return null;
  }

  return data;
}

// Get all businesses
export async function getBusinesses(): Promise<Business[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching businesses:", error);
    return [];
  }

  return data || [];
}

// Get all categories
export async function getCategories(): Promise<Category[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching categories:", error);
    return [];
  }

  return data || [];
}

// Increment view count for a listing
export async function incrementListingViews(listingId: string): Promise<void> {
  const supabase = createClient();

  await supabase.rpc("increment_views", { listing_id: listingId });
}
