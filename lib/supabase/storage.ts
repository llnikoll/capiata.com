import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseQueryError } from "./errors";

/** Buckets públicos usados por la plataforma. */
export const LISTING_IMAGES_BUCKET = "listings-images";
export const AVATARS_BUCKET = "avatars";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

/** Valida tipo y tamaño de una imagen antes de subirla. Devuelve el error o null. */
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return `"${file.name}": formato no permitido. Usá JPG, PNG, WebP o AVIF.`;
  }
  if (file.size === 0) {
    return `"${file.name}": el archivo está vacío.`;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return `"${file.name}": pesa ${mb} MB y el máximo es 5 MB.`;
  }
  return null;
}

function buildObjectPath(userId: string, file: File): string {
  const extension =
    EXTENSION_BY_MIME[file.type] || file.name.split(".").pop()?.toLowerCase() || "jpg";
  const unique =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return `${userId}/${unique}.${extension}`;
}

/**
 * Sube una imagen a un bucket público de Supabase Storage y devuelve su URL pública.
 * La carpeta raíz siempre es el id del usuario, requisito de las políticas RLS.
 */
export async function uploadPublicImage(
  supabase: SupabaseClient,
  bucket: string,
  file: File,
  userId: string,
  options?: { upsert?: boolean }
): Promise<string> {
  const path = buildObjectPath(userId, file);

  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: options?.upsert ?? false,
  });

  if (error) {
    throw new SupabaseQueryError(
      `No pudimos subir la imagen "${file.name}". ${error.message}`,
      error
    );
  }

  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return publicUrlData.publicUrl;
}

/** Extrae el path interno de un objeto a partir de su URL pública de Supabase. */
export function storagePathFromPublicUrl(url: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;

  const path = url.slice(index + marker.length).split("?")[0];
  return path ? decodeURIComponent(path) : null;
}

/** Borra un objeto del bucket a partir de su URL pública. Ignora URLs externas. */
export async function deleteImageByPublicUrl(
  supabase: SupabaseClient,
  bucket: string,
  url: string | null | undefined
): Promise<void> {
  if (!url) return;

  const path = storagePathFromPublicUrl(url, bucket);
  if (!path) return;

  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    throw new SupabaseQueryError(`No pudimos eliminar el archivo anterior. ${error.message}`, error);
  }
}
