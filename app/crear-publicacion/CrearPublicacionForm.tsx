"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import slugify from "slugify";
import {
  Megaphone,
  HelpCircle,
  Upload,
  CheckCircle2,
  ArrowRight,
  X,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Alert } from "@/components/ui/Alert";
import { CAPIATA_NEIGHBORHOODS, type ListingType } from "@/lib/types";
import { listingFormSchema, validateForm, type FieldErrors } from "@/lib/validation";
import { createClient } from "@/lib/supabase/client";
import { getBusinessByUser, getCategories, getProfile } from "@/lib/supabase/queries";
import {
  LISTING_IMAGES_BUCKET,
  deleteImageByPublicUrl,
  uploadPublicImage,
  validateImageFile,
} from "@/lib/supabase/storage";
import { SupabaseQueryError, toErrorMessage } from "@/lib/supabase/errors";
import { normalizeWhatsAppNumber } from "@/lib/utils";
import { useAuthUser } from "@/lib/hooks/useAuthUser";
import { useCategories } from "@/lib/hooks/useCategories";

const MAX_IMAGES = 6;

export function CrearPublicacionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuthUser();
  const { categories } = useCategories();

  const [type, setType] = useState<ListingType>(() =>
    searchParams.get("tipo") === "REQUEST" ? "REQUEST" : "OFFER"
  );
  const [title, setTitle] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [price, setPrice] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);

  // Prefill con los datos del perfil real del usuario.
  useEffect(() => {
    if (!user) return;
    let active = true;

    (async () => {
      try {
        const supabase = createClient();
        const profile = await getProfile(supabase, user.id);
        if (!active) return;

        if (profile?.phone) setWhatsapp((current) => current || profile.phone!);
        if (profile?.neighborhood) setNeighborhood((current) => current || profile.neighborhood!);
      } catch {
        // El prefill es opcional: el usuario puede completar los campos.
      }
    })();

    return () => {
      active = false;
    };
  }, [user]);

  // Selección por defecto de categoría y barrio cuando llegan los datos.
  useEffect(() => {
    if (!categorySlug && categories.length > 0) setCategorySlug(categories[0].slug);
  }, [categories, categorySlug]);

  useEffect(() => {
    if (!neighborhood) setNeighborhood(CAPIATA_NEIGHBORHOODS[0]);
  }, [neighborhood]);

  // Previsualizaciones con revocación de object URLs.
  useEffect(() => {
    const urls = images.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [images]);

  // Ruta protegida: sin sesión no se puede crear contenido.
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?redirect=/crear-publicacion");
    }
  }, [authLoading, user, router]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    setUploadError(null);

    const accepted: File[] = [];
    for (const file of files) {
      const error = validateImageFile(file);
      if (error) {
        setUploadError(error);
        continue;
      }
      accepted.push(file);
    }

    if (accepted.length === 0) return;

    setImages((current) => {
      const next = [...current, ...accepted].slice(0, MAX_IMAGES);
      if (current.length + accepted.length > MAX_IMAGES) {
        setUploadError(`Podés adjuntar hasta ${MAX_IMAGES} fotos por publicación.`);
      }
      return next;
    });
  };

  const removeImage = (index: number) => {
    setImages((current) => current.filter((_, i) => i !== index));
    setUploadError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setFieldErrors({});

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
      setSubmitError("Revisá los campos marcados antes de publicar.");
      return;
    }

    if (!user) {
      router.replace("/login?redirect=/crear-publicacion");
      return;
    }

    setIsSubmitting(true);
    const uploadedUrls: string[] = [];

    try {
      const supabase = createClient();

      // 1. Imágenes primero, para poder limpiarlas si algo falla después.
      for (const file of images) {
        const url = await uploadPublicImage(supabase, LISTING_IMAGES_BUCKET, file, user.id);
        uploadedUrls.push(url);
      }

      // 2. Resolver la categoría real de la base.
      const allCategories = await getCategories(supabase);
      const category = allCategories.find((item) => item.slug === parsed.data.categorySlug);
      if (!category) {
        throw new SupabaseQueryError(
          "La categoría seleccionada ya no está disponible. Elegí otra."
        );
      }

      // 3. Vincular el comercio del usuario, si tiene uno.
      const business = await getBusinessByUser(supabase, user.id);

      const baseSlug = slugify(parsed.data.title, { lower: true, strict: true }).slice(0, 80);
      const slug = `${baseSlug || "publicacion"}-${Date.now().toString(36)}`;

      const { data: listing, error: listingError } = await supabase
        .from("listings")
        .insert({
          user_id: user.id,
          business_id: business?.id ?? null,
          type: parsed.data.type,
          category_id: category.id,
          title: parsed.data.title,
          slug,
          description: parsed.data.description,
          price: parsed.data.price === "" ? null : Number(parsed.data.price),
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

      // 4. Asociar las imágenes a la publicación.
      if (uploadedUrls.length > 0) {
        const { error: imagesError } = await supabase.from("listing_images").insert(
          uploadedUrls.map((url, index) => ({
            listing_id: listing.id,
            image_url: url,
            position: index,
          }))
        );

        if (imagesError) {
          throw new SupabaseQueryError(
            "La publicación se creó pero no pudimos guardar las fotos. " + imagesError.message,
            imagesError
          );
        }
      }

      setCreatedSlug(listing.slug);
      router.refresh();
    } catch (error) {
      // Limpieza: evitamos archivos huérfanos en Storage.
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

      setSubmitError(toErrorMessage(error, "No pudimos crear la publicación. Intentalo de nuevo."));
    } finally {
      setIsSubmitting(false);
    }
  };

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
                setImages([]);
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
        ) : !user ? (
          <Alert variant="info">
            Necesitás iniciar sesión para publicar.{" "}
            <Link href="/login?redirect=/crear-publicacion" className="font-bold underline">
              Iniciar sesión
            </Link>
          </Alert>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6"
          >
            {submitError && <Alert variant="error">{submitError}</Alert>}

            {/* STEP 1: Tipo de Publicación */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                1. ¿Qué querés hacer?
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

            {/* STEP 2: Título y Categoría */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Título de la publicación"
                placeholder={
                  type === "OFFER"
                    ? "Ej: Servicio técnico de plomería"
                    : "Ej: Busco pintor para casa"
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
                options={categories.map((cat) => ({
                  value: cat.slug,
                  label: cat.name,
                }))}
              />
            </div>

            {/* STEP 3: Barrio y Precio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Barrio en Capiatá"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                error={fieldErrors.neighborhood}
                options={CAPIATA_NEIGHBORHOODS.map((b) => ({
                  value: b,
                  label: b,
                }))}
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

            {/* STEP 4: WhatsApp de Contacto */}
            <Input
              label="Número de WhatsApp para contacto directo"
              placeholder="Ej: 0981123456"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              error={fieldErrors.contactWhatsapp}
              required
              helperText="Los interesados te enviarán un mensaje directo a este número."
            />

            {/* STEP 5: Descripción */}
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

            {/* STEP 6: Fotos */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">
                Fotos (opcional, hasta {MAX_IMAGES})
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                multiple
                onChange={handleImageUpload}
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

              {previews.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                  {previews.map((preview, index) => (
                    <div key={preview} className="relative group">
                      {/* Vista previa local del archivo seleccionado */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={preview}
                        alt={`Vista previa ${index + 1}`}
                        className="w-full h-32 object-cover rounded-xl border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                        aria-label={`Quitar foto ${index + 1}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SUBMIT BUTTON */}
            <Button
              type="submit"
              variant="accent"
              size="lg"
              isLoading={isSubmitting}
              disabled={isSubmitting}
              className="w-full font-extrabold shadow-md"
              rightIcon={!isSubmitting ? <ArrowRight className="w-5 h-5" /> : undefined}
            >
              {isSubmitting ? "Publicando..." : "Publicar Gratis en Capiatá"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
