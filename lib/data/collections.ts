import { createAdminClient } from "../supabase/admin";

export type CollectionStatus = "published" | "draft" | "archived";

export type Collection = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  status: CollectionStatus;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
};

export async function getAllCollections() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch collections: ${error.message}`);
  }

  return data as Collection[];
}

export async function getPublishedCollections() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch published collections: ${error.message}`);
  }

  return data as Collection[];
}

export async function getCollectionBySlug(slug: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    throw new Error(`Failed to fetch collection by slug: ${error.message}`);
  }

  return data as Collection;
}