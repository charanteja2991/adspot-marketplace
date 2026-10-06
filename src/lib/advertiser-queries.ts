import { supabase } from "@/integrations/supabase/client";
import type { BillboardWithImages } from "@/lib/queries";

const IMAGE_SELECT = "id,url,alt_text,sort_order,is_cover";

/** A saved row whose billboard is null has been unpublished/hidden (deleted rows cascade away). */
export type SavedEntry = { id: string; billboard_id: string; created_at: string; billboard: BillboardWithImages | null };

export async function fetchSavedEntries(userId: string): Promise<SavedEntry[]> {
  const { data, error } = await supabase
    .from("saved_billboards")
    .select(`id, billboard_id, created_at, billboards(*, billboard_images(${IMAGE_SELECT}))`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    billboard_id: row.billboard_id,
    created_at: row.created_at,
    billboard: (row.billboards as unknown as BillboardWithImages | null) ?? null,
  }));
}

export async function removeSavedEntry(userId: string, entryId: string) {
  const { error } = await supabase.from("saved_billboards").delete().eq("id", entryId).eq("user_id", userId);
  if (error) throw error;
}

export type AdvertiserProfile = {
  display_name: string;
  company_name: string;
  city: string;
  bio: string;
  phone: string;
  contact_email: string;
};

export async function fetchAdvertiserProfile(userId: string): Promise<AdvertiserProfile> {
  const [{ data: p, error: e1 }, { data: c, error: e2 }] = await Promise.all([
    supabase.from("profiles").select("display_name,company_name,city,bio").eq("id", userId).maybeSingle(),
    supabase.from("profile_contacts").select("phone,contact_email").eq("id", userId).maybeSingle(),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  return {
    display_name: p?.display_name ?? "",
    company_name: p?.company_name ?? "",
    city: p?.city ?? "",
    bio: p?.bio ?? "",
    phone: c?.phone ?? "",
    contact_email: c?.contact_email ?? "",
  };
}

/** Only editable fields are sent; role and ownership live elsewhere and are never touched here. */
export async function updateAdvertiserProfile(userId: string, input: AdvertiserProfile) {
  const clean = (v: string) => (v.trim() ? v.trim() : null);
  const { error: e1 } = await supabase
    .from("profiles")
    .update({
      display_name: input.display_name.trim() || "Member",
      company_name: clean(input.company_name),
      city: clean(input.city),
      bio: clean(input.bio),
    })
    .eq("id", userId);
  if (e1) throw e1;
  const { error: e2 } = await supabase
    .from("profile_contacts")
    .upsert({ id: userId, phone: clean(input.phone), contact_email: clean(input.contact_email) });
  if (e2) throw e2;
}

export async function fetchAdvertiserStats(userId: string) {
  const [saved, requests] = await Promise.all([
    supabase.from("saved_billboards").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("booking_requests").select("id", { count: "exact", head: true }).eq("advertiser_id", userId),
  ]);
  if (saved.error) throw saved.error;
  if (requests.error) throw requests.error;
  return { saved: saved.count ?? 0, requests: requests.count ?? 0 };
}
