import { compressImage } from "@/lib/images";
import { supabase } from "@/lib/supabase";
import { toDayString } from "@/lib/dates";
import type { Photo } from "@/lib/types";

export const PHOTOS_BUCKET = "photos";
const URL_TTL_SECONDS = 60 * 60;

// Uploads to "<couple_id>/<uuid>.<ext>" (the storage policies key on that folder) and records the row.
export async function uploadPhoto(
  coupleId: string,
  file: File,
  values: { taken_on?: string; is_special?: boolean; caption?: string | null } = {},
): Promise<Photo> {
  const db = supabase();
  const blob = await compressImage(file);
  const ext = blob.type === "image/jpeg" ? "jpg" : (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const path = `${coupleId}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await db.storage.from(PHOTOS_BUCKET).upload(path, blob, { contentType: blob.type || file.type });
  if (upErr) throw upErr;
  const { data, error } = await db
    .from("photos")
    .insert({ storage_path: path, taken_on: toDayString(new Date(file.lastModified)), ...values })
    .select("*")
    .single();
  if (error) {
    await db.storage.from(PHOTOS_BUCKET).remove([path]);
    throw error;
  }
  return data;
}

export async function signedUrls(paths: string[], bucket = PHOTOS_BUCKET): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data } = await supabase().storage.from(bucket).createSignedUrls(paths, URL_TTL_SECONDS);
  return Object.fromEntries((data ?? []).flatMap((s) => (s.path && s.signedUrl ? [[s.path, s.signedUrl]] : [])));
}
