"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import slugify from "slugify";
import {
  Megaphone,
  HelpCircle,
  Upload,
  CheckCircle2,
  ArrowRight,
  X,
  AlertCircle,
  Star,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Alert } from "@/components/ui/Alert";
import { CAPIATA_NEIGHBORHOODS, type Listing, type ListingType } from "@/lib/types";
import { listingFormSchema, validateForm, type FieldErrors } from "@/lib/validation";
import { createClient } from "@/lib/supabase/client";
import {
  deleteListingImages,
  getBusinessByUser,
  getCategoryBySlug,
  getProfile,
  insertListingImages,
  updateListing,
  updateListingImagePositions,
} from "@/lib/supabase/queries";
import {
  LISTING_IMAGES_BUCKET,
  deleteImageByPublicUrl,
  uploadPublicImage,
  validateImageFile,
} from "@/lib/supabase/storage";
import { SupabaseQueryError, toErrorMessage } from "@/lib/supabase/errors";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeWhatsAppNumber } from "@/lib/utils";
import { useAuthUser } from "@/lib/hooks/useAuthUser";
import { useCategories } from "@/lib/hooks/useCategories";

const MAX_IMAGES = 6;

/** Aviso para cuentas bloqueadas por moderación (el bloqueo real lo aplica RLS). */
function BlockedNotice() {
  return (
    <Alert variant="error">
      <strong>Tu cuenta está bloqueada.</strong>
      <p className="mt-1">
        Un administrador de Capiatá Conecta la marcó como bloqueada, así que por ahora no podés
        publicar ni editar publicaciones. Podés seguir navegando el contenido del sitio.
      </p>
    </Alert>
  );
}

type ImageItem =
  | { kind: "existing"; id: string; url: string }
  | { kind: "new"; file: File; previewUrl: string };

interface ListingFormProps {
  mode: "create" | "edit";
  /** Obligatorio en modo edición. */
  listing?: Listing | null;
  /** Tipo inicial en modo creación (viene de ?tipo=OFFER|REQUEST). */
  initialType?: ListingType;
}

/**
 * Formulario único para crear y editar publicaciones.
 *
 * - Crear: sube las fotos, crea la fila y la vincula a las imágenes.
 * - Editar: conserva el slug, actualiza los datos y sincroniza la galería
 *   (quita, agrega y reordena fotos, borrando también los archivos huérfanos).
 */
export function ListingForm({ mode, listing, initialType }: ListingFormProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthUser();
  const { categories } = useCategories();

  const isEdit = mode === "edit";

  const [type, setType] = useState<ListingType>(listing?.type ?? initialType ?? "OFFER");
  const [title, setTitle] = useState(listing?.title ?? "");
  const [categorySlug, setCategorySlug] = useState(listing?.category?.slug ?? "");
  const [neighborhood, setNeighborhood] = useState(listing?.neighborhood ?? "");
  const [price, setPrice] = useState(
    listing?.price !== null && listing?.price !== undefined ? String(listing.price) : ""
  );
  const [whatsapp, setWhatsapp] = useState(listing?.contact_whatsapp ?? "");
  const [description, setDescription] = useState(listing?.description ?? "");
  const [items, setItems] = useState<ImageItem[]>(() =>
    (listing?.images ?? []).map((image) => ({
      kind: "existing" as const,
      id: image.id,
      url: image.image_url,
    }))
  );

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [imageWarnings, setImageWarnings] = useState<string[]>([]);
  const [isBlocked, setIsBlocked] = useState(false);

  const previewUrlsRef = useRef<string[]>([]);

  // Liberamos las URLs de previsualización al desmontar.
  useEffect(
    () => () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current = [];
    },
    []
  );

  // Perfil del usuario: detectamos el bloqueo y (sólo al crear) precargamos
  // los datos de contacto.
  useEffect(() => {
    if (!user) return;
    let active = true;

    (async () => {
      try {
        const supabase = createClient();
        const profile = await getProfile(supabase, user.id);
        if (!active || !profile) return;

        if (profile.is_blocked) setIsBlocked(true);

        if (isEdit) return;

        if (profile.phone) setWhatsapp((current) => current || profile.phone!);
        if (profile.neighborhood) {
          setNeighborhood((current) => current || profile.neighborhood!);
        }
      } catch {
        // El prefill es opcional.
      }
    })();

    return () => {
      active = false;
    };
  }, [isEdit, user]);

  // Valores por defecto en creación.
  useEffect(() => {
    if (isEdit) return;
    if (!categorySlug && categories.length > 0) setCategorySlug(categories[0].slug);
  }, [isEdit, categories, categorySlug]);

  useEffect(() => {
    if (isEdit) return;
    if (!neighborhood) setNeighborhood(CAPIATA_NEIGHBORHOODS[0]);
  }, [isEdit, neighborhood]);

  // Ruta protegida: sin sesión no se puede publicar ni editar.
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(
        isEdit && listing
          ? `/login?redirect=${encodeURIComponent(`/dashboard/editar-publicacion?id=${listing.id}`)}`
          : "/login?redirect=/crear-publicacion"
      );
    }
  }, [authLoading, user, router, isEdit, listing]);

  const categoryOptions = useMemo(() => {
    const base = categories.map((category) => ({ value: category.slug, label: category.name }));
    if (categorySlug && !base.some((option) => option.value === categorySlug)) {
      return [
        { value: categorySlug, label: listing?.category?.name ?? categorySlug },
        ...base,
      ];
    }
    return base;
  }, [categories, categorySlug, listing]);

  const neighborhoodOptions = useMemo(() => {
    const base = CAPIATA_NEIGHBORHOODS.map((barrio) => ({ value: barrio, label: barrio }));
    if (neighborhood && !(CAPIATA_NEIGHBORHOODS as readonly string[]).includes(neighborhood)) {
      return [{ value: neighborhood, label: `${neighborhood} (actual)` }, ...base];
    }
    return base;
  }, [neighborhood]);

  const addImages = (files: FileList | null) => {
    const selected = Array.from(files ?? []);
    setUploadError(null);

    if (selected.length === 0) return;

    const accepted: ImageItem[] = [];
    for (const file of selected) {
      const error = validateImageFile(file);
      if (error) {
        setUploadError(error);
        continue;
      }
      const previewUrl = URL.createObjectURL(file);
      previewUrlsRef.current.push(previewUrl);
      accepted.push({ kind: "new", file, previewUrl });
    }

    if (accepted.length === 0) return;

    setItems((current) => {
      const next = [...current, ...accepted];
      if (next.length > MAX_IMAGES) {
        setUploadError(`Podés adjuntar hasta ${MAX_IMAGES} fotos por publicación.`);
        // Liberamos las que no entran.
        next.slice(MAX_IMAGES).forEach((item) => {
          if (item.kind === "new") {
            URL.revokeObjectURL(item.previewUrl);
            previewUrlsRef.current = previewUrlsRef.current.filter((u) => u !== item.previewUrl);
          }
        });
        return next.slice(0, MAX_IMAGES);
      }
      return next;
    });
  };

  const removeImage = (index: number) => {
    setUploadError(null);
    setItems((current) => {
      const item = current[index];
      if (item?.kind === "new") {
        URL.revokeObjectURL(item.previewUrl);
        previewUrlsRef.current = previewUrlsRef.current.filter((u) => u !== item.previewUrl);
      }
      return current.filter((_, i) => i !== index);
    });
  };

  const makeCover = (index: number) => {
    setItems((current) => {
      if (index === 0) return current;
      const next = [...current];
      const [moved] = next.splice(index, 1);
      return [moved, ...next];
    });
  };

  /**
   * Sube las fotos nuevas y sincroniza la galería de la publicación.
   *
   * Nunca lanza por un problema de fotos: devuelve los avisos para mostrárselos
   * al usuario, de modo que los datos ya guardados nunca se pierdan por una
   * imagen que no se pudo subir (por ejemplo, si falta la política de Storage).
   */
  const syncGallery = async (input: {
    supabase: SupabaseClient;
    userId: string;
    listingId: string;
    currentItems: ImageItem[];
    originalImages: NonNullable<Listing["images"]>;
    uploadedUrls: string[];
  }): Promise<string[]> => {
    const { supabase, userId, listingId, currentItems, originalImages, uploadedUrls } = input;
    const warnings: string[] = [];

    // 1. Subir las fotos nuevas una por una: si una falla, el resto continúa.
    const uploadedByIndex = new Map<number, string>();
    for (let index = 0; index < currentItems.length; index += 1) {
      const item = currentItems[index];
      if (item.kind !== "new") continue;

      try {
        const url = await uploadPublicImage(supabase, LISTING_IMAGES_BUCKET, item.file, userId);
        uploadedByIndex.set(index, url);
        uploadedUrls.push(url);
      } catch (error) {
        warnings.push(`${item.file.name}: ${toErrorMessage(error, "no se pudo subir la foto")}`);
      }
    }

    // 2. Quitar de la base (y de Storage) las fotos que ya no están.
    const keptIds = currentItems
      .filter((item): item is Extract<ImageItem, { kind: "existing" }> => item.kind === "existing")
      .map((item) => item.id);
    const removedIds = originalImages
      .map((image) => image.id)
      .filter((id) => !keptIds.includes(id));

    if (removedIds.length > 0) {
      try {
        await deleteListingImages(supabase, removedIds);
        await Promise.all(
          originalImages
            .filter((image) => removedIds.includes(image.id))
            .map((image) =>
              deleteImageByPublicUrl(supabase, LISTING_IMAGES_BUCKET, image.image_url).catch(
                () => undefined
              )
            )
        );
      } catch (error) {
        warnings.push(`No pudimos quitar una foto: ${toErrorMessage(error, "error")}`);
      }
    }

    // 3. Vincular a la publicación las fotos que sí se subieron.
    const rows = currentItems
      .map((item, index) =>
        item.kind === "new" && uploadedByIndex.has(index)
          ? { listingId, url: uploadedByIndex.get(index)!, position: index }
          : null
      )
      .filter((row): row is { listingId: string; url: string; position: number } => row !== null);

    let inserted: Array<{ id: string; image_url: string; position: number }> = [];
    if (rows.length > 0) {
      try {
        inserted = await insertListingImages(supabase, rows);
      } catch (error) {
        warnings.push(
          `Las fotos se subieron pero no se pudieron vincular: ${toErrorMessage(error, "error")}`
        );
        // Sin fila en la base el archivo quedaría huérfano: lo borramos.
        await Promise.all(
          rows.map((row) =>
            deleteImageByPublicUrl(supabase, LISTING_IMAGES_BUCKET, row.url).catch(() => undefined)
          )
        );
      }
    }

    // 4. Las fotos recién subidas pasan a "existentes": si el usuario guarda de
    //    nuevo, no se vuelven a subir ni se duplican.
    if (inserted.length > 0) {
      const idByUrl = new Map(inserted.map((row) => [row.image_url, row.id]));

      setItems(
        currentItems.map((item, index) => {
          if (item.kind !== "new") return item;

          const url = uploadedByIndex.get(index);
          const id = url ? idByUrl.get(url) : undefined;
          if (!url || !id) return item;

          URL.revokeObjectURL(item.previewUrl);
          previewUrlsRef.current = previewUrlsRef.current.filter(
            (preview) => preview !== item.previewUrl
          );
          return { kind: "existing" as const, id, url };
        })
      );
    }

    // 5. Reordenar para respetar la portada elegida.
    const originalOrder = originalImages.map((image) => image.id);
    const reorder = currentItems
      .map((item, index) => (item.kind === "existing" ? { id: item.id, position: index } : null))
      .filter((row): row is { id: string; position: number } => row !== null)
      .filter((row) => originalOrder.indexOf(row.id) !== row.position);

    if (reorder.length > 0) {
      try {
        await updateListingImagePositions(supabase, reorder);
      } catch (error) {
        warnings.push(`No pudimos reordenar las fotos: ${toErrorMessage(error, "error")}`);
      }
    }

    return warnings;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    setFieldErrors({});
    setIsSaved(false);

    if (isBlocked) {
      setSubmitError(
        "Tu cuenta está bloqueada: no podés publicar ni editar hasta que un administrador la revise."
      );
      return;
    }

    const parsed = validateForm(listingFormSchema, {
      type,
      title,
      categorySlug,
      neighborhood,
      price,
      contactWhatsapp: whatsapp,
      description,
    });

    if (!parsed.success) {
      setFieldErrors(parsed.errors);
      setSubmitError("Revisá los campos marcados antes de guardar.");
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    setIsSubmitting(true);
    setImageWarnings([]);
    const uploadedUrls: string[] = [];

    try {
      const supabase = createClient();

      // 1. Resolvemos la categoría real de la base.
      const category = await getCategoryBySlug(supabase, parsed.data.categorySlug);
      if (!category) {
        throw new SupabaseQueryError(
          "La categoría seleccionada ya no está disponible. Elegí otra."
        );
      }

      const priceValue = parsed.data.price === "" ? null : Number(parsed.data.price);

      if (isEdit && listing) {
        /* ------------------------------- EDICIÓN ------------------------------ */
        // Los datos se guardan PRIMERO: si las fotos fallan, el texto ya quedó.
        await updateListing(supabase, {
          listingId: listing.id,
          userId: user.id,
          values: {
            type: parsed.data.type,
            category_id: category.id,
            title: parsed.data.title,
            description: parsed.data.description,
            price: priceValue,
            neighborhood: parsed.data.neighborhood,
            contact_whatsapp: normalizeWhatsAppNumber(parsed.data.contactWhatsapp),
          },
        });

        const warnings = await syncGallery({
          supabase,
          userId: user.id,
          listingId: listing.id,
          currentItems: items,
          originalImages: listing.images ?? [],
          uploadedUrls,
        });

        setImageWarnings(warnings);
        setIsSaved(true);
        router.refresh();
      } else {
        /* ------------------------------- CREACIÓN ----------------------------- */
        const business = await getBusinessByUser(supabase, user.id);
        const baseSlug = slugify(parsed.data.title, { lower: true, strict: true }).slice(0, 80);
        const slug = `${baseSlug || "publicacion"}-${Date.now().toString(36)}`;

        const { data: created, error: listingError } = await supabase
          .from("listings")
          .insert({
            user_id: user.id,
            business_id: business?.id ?? null,
            type: parsed.data.type,
            category_id: category.id,
            title: parsed.data.title,
            slug,
            description: parsed.data.description,
            price: priceValue,
            currency: "GS",
            location: "Capiatá",
            neighborhood: parsed.data.neighborhood,
            contact_whatsapp: normalizeWhatsAppNumber(parsed.data.contactWhatsapp),
            contact_method: ["whatsapp"],
            status: "active",
          })
          .select("id, slug")
          .single();

        if (listingError) {
          throw new SupabaseQueryError(
            "No pudimos crear la publicación. " + listingError.message,
            listingError
          );
        }

        const warnings = await syncGallery({
          supabase,
          userId: user.id,
          listingId: created.id,
          currentItems: items,
          originalImages: [],
          uploadedUrls,
        });

        setImageWarnings(warnings);
        setCreatedSlug(created.slug);
        router.refresh();
      }
    } catch (error) {
      // Evitamos archivos huérfanos en Storage si algo falló después de subir.
      try {
        const supabase = createClient();
        await Promise.all(
          uploadedUrls.map((url) =>
            deleteImageByPublicUrl(supabase, LISTING_IMAGES_BUCKET, url).catch(() => undefined)
          )
        );
      } catch {
        /* noop */
      }

      setSubmitError(
        toErrorMessage(
          error,
          isEdit
            ? "No pudimos guardar los cambios. Intentalo de nuevo."
            : "No pudimos crear la publicación. Intentalo de nuevo."
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ------------------------------ ÉXITO ---------------------------------- */
  if (createdSlug) {
    return (
      <div className="py-16 bg-gray-50/50 min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-gray-100 shadow-xl text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-gray-900">
            ¡Tu publicación fue creada con éxito!
          </h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            Ya está disponible públicamente en Capiatá Conecta. Los vecinos interesados podrán contactarte directamente por WhatsApp.
          </p>

          {imageWarnings.length > 0 && (
            <Alert variant="warning" className="text-left">
              <strong>No pudimos subir todas las fotos:</strong>
              <ul className="list-disc pl-4 mt-1 space-y-0.5">
                {imageWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
              Podés agregarlas más tarde desde <strong>Editar</strong>.
            </Alert>
          )}
          <div className="pt-3 flex flex-col gap-2">
            <Link href={`/publicacion/${createdSlug}`}>
              <Button variant="primary" className="w-full">
                Ver mi publicación
              </Button>
            </Link>
            <Link href="/explorar">
              <Button variant="outline" className="w-full">
                Ver en Explorar
              </Button>
            </Link>
            <button
              type="button"
              onClick={() => {
                setCreatedSlug(null);
                setTitle("");
                setDescription("");
                setPrice("");
                setItems([]);
              }}
              className="text-xs text-[#1E3A5F] font-bold hover:underline py-2"
            >
              Publicar otro anuncio
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------ FORMULARIO ------------------------------ */
  const form = (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6"
    >
      {submitError && <Alert variant="error">{submitError}</Alert>}

      {imageWarnings.length > 0 && (
        <Alert variant="warning">
          <strong>
            Los datos se guardaron, pero hubo {imageWarnings.length === 1 ? "un problema con una foto" : `problemas con ${imageWarnings.length} fotos`}:
          </strong>
          <ul className="list-disc pl-4 mt-1 space-y-0.5">
            {imageWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </Alert>
      )}

      {isSaved && (
        <Alert variant="success">
          Cambios guardados correctamente.{" "}
          {listing && (
            <Link href={`/publicacion/${listing.slug}`} className="font-bold underline">
              Ver la publicación actualizada
            </Link>
          )}
        </Alert>
      )}

      {/* PASO 1: Tipo de publicación */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
          1. ¿Qué querés {isEdit ? "publicar" : "hacer"}?
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setType("OFFER")}
            className={`p-4 rounded-2xl border-2 text-left flex flex-col gap-2 transition-all ${
              type === "OFFER"
                ? "border-[#F5B800] bg-amber-50/50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-2 text-[#D4A000] font-black text-sm">
              <Megaphone className="w-5 h-5" /> OFREZCO
            </div>
            <p className="text-[11px] text-gray-500 leading-tight">
              Tengo un producto, servicio o trabajo para ofrecer a la comunidad.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setType("REQUEST")}
            className={`p-4 rounded-2xl border-2 text-left flex flex-col gap-2 transition-all ${
              type === "REQUEST"
                ? "border-[#1E3A5F] bg-blue-50/50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-2 text-[#1E3A5F] font-black text-sm">
              <HelpCircle className="w-5 h-5" /> BUSCO (Pedido)
            </div>
            <p className="text-[11px] text-gray-500 leading-tight">
              Necesito contratar un servicio o estoy buscando algo específico.
            </p>
          </button>
        </div>
      </div>

      {/* PASO 2: Título y categoría */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Título de la publicación"
          placeholder={
            type === "OFFER" ? "Ej: Servicio técnico de plomería" : "Ej: Busco pintor para casa"
          }
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={fieldErrors.title}
          maxLength={120}
          required
        />

        <Select
          label="Categoría"
          value={categorySlug}
          onChange={(e) => setCategorySlug(e.target.value)}
          error={fieldErrors.categorySlug}
          options={categoryOptions}
        />
      </div>

      {/* PASO 3: Barrio y precio */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Barrio en Capiatá"
          value={neighborhood}
          onChange={(e) => setNeighborhood(e.target.value)}
          error={fieldErrors.neighborhood}
          options={neighborhoodOptions}
        />

        <Input
          label="Precio o Presupuesto estimado (Guaraníes)"
          placeholder="Ej: 150000 (dejar en blanco si es a convenir)"
          type="number"
          min={0}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          error={fieldErrors.price}
        />
      </div>

      {/* PASO 4: WhatsApp */}
      <Input
        label="Número de WhatsApp para contacto directo"
        placeholder="Ej: 0981123456"
        value={whatsapp}
        onChange={(e) => setWhatsapp(e.target.value)}
        error={fieldErrors.contactWhatsapp}
        required
        helperText="Los interesados te enviarán un mensaje directo a este número."
      />

      {/* PASO 5: Descripción */}
      <Textarea
        label="Descripción detallada"
        rows={4}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Explicá en detalle lo que ofrecés o buscás..."
        error={fieldErrors.description}
        maxLength={2000}
        required
      />

      {/* PASO 6: Fotos */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-700">
          Fotos ({items.length}/{MAX_IMAGES})
        </label>

        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          onChange={(e) => {
            addImages(e.target.files);
            e.target.value = "";
          }}
          className="hidden"
          id="image-upload"
        />
        <label
          htmlFor="image-upload"
          className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-gray-300 transition-colors cursor-pointer bg-gray-50/50 block"
        >
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-xs text-gray-600 font-semibold">
            Hacé clic o arrastrá fotos aquí
          </p>
          <p className="text-[10px] text-gray-400 mt-1">
            JPG, PNG, WebP o AVIF hasta 5 MB cada una
          </p>
        </label>

        {uploadError && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {uploadError}
          </p>
        )}

        {items.length > 0 && (
          <>
            <p className="text-[11px] text-gray-400">
              La primera foto es la portada. Usá la estrella para cambiarla.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {items.map((item, index) => {
                const src = item.kind === "new" ? item.previewUrl : item.url;
                return (
                  <div key={item.kind === "new" ? item.previewUrl : item.id} className="relative group">
                    {/* Vista previa local o imagen ya guardada */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={`Foto ${index + 1}`}
                      className={`w-full h-32 object-cover rounded-xl border ${
                        index === 0 ? "border-[#F5B800]" : "border-gray-200"
                      }`}
                    />
                    {index === 0 && (
                      <span className="absolute bottom-2 left-2 bg-[#F5B800] text-gray-950 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        PORTADA
                      </span>
                    )}
                    {item.kind === "new" && (
                      <span className="absolute top-2 left-2 bg-[#1E3A5F] text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                        NUEVA
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                      aria-label={`Quitar foto ${index + 1}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => makeCover(index)}
                        className="absolute bottom-2 right-2 bg-white/90 text-gray-700 p-1.5 rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shadow-sm"
                        aria-label={`Usar la foto ${index + 1} como portada`}
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button
          type="submit"
          variant="accent"
          size="lg"
          isLoading={isSubmitting}
          disabled={isSubmitting}
          className="w-full sm:w-auto font-extrabold shadow-md"
          leftIcon={isEdit ? <Save className="w-5 h-5" /> : undefined}
          rightIcon={!isSubmitting ? <ArrowRight className="w-5 h-5" /> : undefined}
        >
          {isSubmitting
            ? isEdit
              ? "Guardando..."
              : "Publicando..."
            : isEdit
              ? "Guardar Cambios"
              : "Publicar Gratis en Capiatá"}
        </Button>

        {isEdit && (
          <Link
            href="/dashboard/mis-publicaciones"
            className="text-xs font-bold text-gray-500 hover:text-gray-800"
          >
            Cancelar
          </Link>
        )}
      </div>
    </form>
  );

  if (isEdit) {
    return isBlocked ? <BlockedNotice /> : form;
  }

  return (
    <div className="py-10 bg-gray-50/50 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-gray-900">Crear Nueva Publicación</h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Publicá gratis en Capiatá Conecta. Sin comisiones ni intermediarios.
          </p>
        </div>

        {authLoading ? (
          <div className="bg-white p-8 rounded-3xl border border-gray-100 text-center text-sm text-gray-500">
            Verificando tu sesión...
          </div>
        ) : isBlocked ? (
          <BlockedNotice />
        ) : !user ? (
          <Alert variant="info">
            Necesitás iniciar sesión para publicar.{" "}
            <Link href="/login?redirect=/crear-publicacion" className="font-bold underline">
              Iniciar sesión
            </Link>
          </Alert>
        ) : (
          form
        )}
      </div>
    </div>
  );
}
