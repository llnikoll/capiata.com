"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Images,
  Save,
  Star,
  Store,
  Upload,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Alert } from "@/components/ui/Alert";
import { DEFAULT_CATEGORIES, type BusinessImage } from "@/lib/types";
import { businessFormSchema, validateForm, type FieldErrors } from "@/lib/validation";
import { createClient } from "@/lib/supabase/client";
import {
  deleteBusinessImages,
  getBusinessByUser,
  getBusinessImages,
  getProfile,
  getProfilePhotoLimit,
  insertBusinessImages,
  saveBusiness,
  setUserAsBusiness,
  updateBusinessImagePositions,
} from "@/lib/supabase/queries";
import {
  AVATARS_BUCKET,
  LISTING_IMAGES_BUCKET,
  deleteImageByPublicUrl,
  uploadPublicImage,
  validateImageFile,
} from "@/lib/supabase/storage";
import { toErrorMessage } from "@/lib/supabase/errors";
import { normalizeWhatsAppNumber } from "@/lib/utils";
import { useAuthUser } from "@/lib/hooks/useAuthUser";

const DEFAULT_PHOTO_LIMIT = 10;

export default function MiTiendaPage() {
  const { user, loading: authLoading } = useAuthUser();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isBlocked, setIsBlocked] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  // Datos del negocio
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [businessCategory, setBusinessCategory] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessSchedule, setBusinessSchedule] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessWhatsapp, setBusinessWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  // Galería
  const [images, setImages] = useState<BusinessImage[]>([]);
  const [photoLimit, setPhotoLimit] = useState(DEFAULT_PHOTO_LIMIT);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [pendingPhotoId, setPendingPhotoId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(authLoading);
      return;
    }

    let active = true;

    (async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const supabase = createClient();
        const [profile, business, limit] = await Promise.all([
          getProfile(supabase, user.id),
          getBusinessByUser(supabase, user.id),
          getProfilePhotoLimit(supabase, user.id),
        ]);

        if (!active) return;

        setPhotoLimit(limit);
        if (profile) {
          setUsername(profile.username);
          setIsBlocked(profile.is_blocked);
        }

        if (business) {
          setBusinessId(business.id);
          setBusinessName(business.business_name);
          setBusinessDescription(business.description ?? "");
          setBusinessCategory(business.category ?? "");
          setBusinessAddress(business.address ?? "");
          setBusinessSchedule(business.schedule ?? "");
          setBusinessPhone(business.phone ?? "");
          setBusinessWhatsapp(business.whatsapp ?? "");
          setInstagram(business.social_links?.instagram ?? "");
          setFacebook(business.social_links?.facebook ?? "");
          setWebsite(business.social_links?.website ?? "");
          setLogoUrl(business.logo_url);

          const gallery = await getBusinessImages(supabase, business.id);
          if (active) setImages(gallery);
        } else if (profile) {
          setBusinessName(profile.full_name ?? "");
          setBusinessPhone(profile.phone ?? "");
          setBusinessWhatsapp(profile.phone ? normalizeWhatsAppNumber(profile.phone) : "");
        }
      } catch (error) {
        if (active) setLoadError(toErrorMessage(error, "No pudimos cargar tu tienda."));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [user, authLoading]);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null);
      return;
    }
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const error = validateImageFile(file);
    if (error) {
      setLogoError(error);
      return;
    }

    setLogoError(null);
    setLogoFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setIsSaved(false);
    setFieldErrors({});

    if (!user) return;

    if (isBlocked) {
      setSaveError("Tu cuenta está bloqueada: no podés editar tu tienda por ahora.");
      return;
    }

    const parsed = validateForm(businessFormSchema, {
      businessName,
      description: businessDescription,
      category: businessCategory,
      phone: businessPhone,
      whatsapp: businessWhatsapp,
      address: businessAddress,
      schedule: businessSchedule,
      instagram,
      facebook,
      website,
    });

    if (!parsed.success) {
      setFieldErrors(parsed.errors);
      setSaveError("Revisá los campos marcados antes de guardar.");
      return;
    }

    setIsSaving(true);

    try {
      const supabase = createClient();

      let nextLogoUrl = logoUrl;
      if (logoFile) {
        const previousLogo = logoUrl;
        nextLogoUrl = await uploadPublicImage(supabase, AVATARS_BUCKET, logoFile, user.id);
        if (previousLogo) {
          await deleteImageByPublicUrl(supabase, AVATARS_BUCKET, previousLogo).catch(
            () => undefined
          );
        }
      }

      const socialLinks =
        parsed.data.instagram || parsed.data.facebook || parsed.data.website
          ? {
              instagram: parsed.data.instagram || undefined,
              facebook: parsed.data.facebook || undefined,
              website: parsed.data.website || undefined,
            }
          : null;

      const saved = await saveBusiness(
        supabase,
        user.id,
        {
          business_name: parsed.data.businessName,
          description: parsed.data.description || null,
          category: parsed.data.category || null,
          phone: parsed.data.phone || null,
          whatsapp: normalizeWhatsAppNumber(parsed.data.whatsapp) || null,
          address: parsed.data.address || null,
          schedule: parsed.data.schedule || null,
          social_links: socialLinks,
          logo_url: nextLogoUrl,
        },
        businessId
      );

      setBusinessId(saved.id);
      setLogoUrl(saved.logo_url);
      setLogoFile(null);

      // Abrir la tienda convierte la cuenta en comercio (idempotente).
      await setUserAsBusiness(supabase, user.id);

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 4000);
    } catch (error) {
      setSaveError(toErrorMessage(error, "No pudimos guardar tu tienda."));
    } finally {
      setIsSaving(false);
    }
  };

  const addPhotos = async (files: FileList | null) => {
    const selected = Array.from(files ?? []);
    setPhotoError(null);

    if (selected.length === 0) return;

    if (!businessId) {
      setPhotoError("Guardá los datos de tu tienda antes de subir fotos.");
      return;
    }

    if (!user) return;

    if (images.length + selected.length > photoLimit) {
      setPhotoError(
        `Tu cupo es de ${photoLimit} foto(s) y ya usaste ${images.length}. ` +
          "Quitá alguna o pedí al administrador que amplíe tu cupo."
      );
      return;
    }

    setIsUploadingPhoto(true);

    try {
      const supabase = createClient();
      let position = images.length;

      for (const file of selected) {
        const uploadError = validateImageFile(file);
        if (uploadError) {
          setPhotoError(uploadError);
          continue;
        }

        let url: string | null = null;
        try {
          url = await uploadPublicImage(supabase, LISTING_IMAGES_BUCKET, file, user.id);
          const [inserted] = await insertBusinessImages(supabase, [
            { businessId, url, position },
          ]);
          if (!inserted) throw new Error("La foto se subió pero no se pudo guardar.");

          position += 1;
          setImages((current) => [...current, inserted]);
        } catch (error) {
          // Sin fila en la base el archivo quedaría huérfano.
          if (url) {
            await deleteImageByPublicUrl(supabase, LISTING_IMAGES_BUCKET, url).catch(
              () => undefined
            );
          }
          setPhotoError(toErrorMessage(error, `No pudimos subir "${file.name}".`));
        }
      }
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const removePhoto = async (image: BusinessImage) => {
    setPhotoError(null);
    setPendingPhotoId(image.id);

    try {
      const supabase = createClient();
      await deleteBusinessImages(supabase, [image.id]);
      await deleteImageByPublicUrl(supabase, LISTING_IMAGES_BUCKET, image.image_url).catch(
        () => undefined
      );
      setImages((current) => current.filter((item) => item.id !== image.id));
    } catch (error) {
      setPhotoError(toErrorMessage(error, "No pudimos quitar la foto."));
    } finally {
      setPendingPhotoId(null);
    }
  };

  const makeCover = async (image: BusinessImage) => {
    setPhotoError(null);
    const reordered = [image, ...images.filter((item) => item.id !== image.id)];
    const positioned = reordered.map((item, index) => ({ ...item, position: index }));
    setImages(positioned);

    try {
      const supabase = createClient();
      await updateBusinessImagePositions(
        supabase,
        positioned.map((item, index) => ({ id: item.id, position: index }))
      );
    } catch (error) {
      setPhotoError(toErrorMessage(error, "No pudimos cambiar la portada."));
      const supabase = createClient();
      if (businessId) {
        setImages(await getBusinessImages(supabase, businessId));
      }
    }
  };

  if (loading) {
    return <div className="text-gray-500 text-sm">Cargando tu tienda...</div>;
  }

  const displayName = businessName || user?.email || "Mi tienda";
  const canAddPhotos = images.length < photoLimit;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-gray-900">
              {businessId ? "Mi Tienda Online" : "Creá tu Tienda Online"}
            </h1>
            <p className="text-xs text-gray-500">
              Tu escaparate en Capiatá: datos del negocio, fotos y enlace público para compartir.
            </p>
          </div>

          {businessId && username && (
            <Link
              href={`/tienda/${username}`}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#1E3A5F] hover:underline shrink-0"
            >
              Ver mi tienda <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {loadError && <Alert variant="error">{loadError}</Alert>}

      {isBlocked && (
        <Alert variant="error">
          <strong>Tu cuenta está bloqueada.</strong> Un administrador debe revisarla antes de que
          puedas editar tu tienda.
        </Alert>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs space-y-6"
      >
        {saveError && <Alert variant="error">{saveError}</Alert>}
        {isSaved && (
          <Alert variant="success">
            Datos de la tienda guardados correctamente.
            {businessId && username && (
              <>
                {" "}
                <Link href={`/tienda/${username}`} className="font-bold underline">
                  Ver mi tienda
                </Link>
              </>
            )}
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-6 border-b border-gray-100">
          <Avatar src={logoPreview || logoUrl} name={displayName} size="xl" />
          <div className="space-y-1.5">
            <h4 className="font-bold text-gray-900 text-sm">Logo de la tienda</h4>
            <p className="text-[11px] text-gray-500">
              JPG, PNG, WebP o AVIF hasta 5 MB.
            </p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              id="store-logo-upload"
              className="hidden"
              onChange={handleLogoChange}
              disabled={isBlocked}
            />
            <label htmlFor="store-logo-upload">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F]/5 text-xs font-semibold cursor-pointer">
                <Upload className="w-3.5 h-3.5" /> Cambiar logo
              </span>
            </label>
            {logoError && <p className="text-xs text-red-500">{logoError}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Nombre comercial"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            error={fieldErrors.businessName}
            maxLength={80}
            disabled={isBlocked}
            required
          />

          <Select
            label="Rubro o categoría"
            value={businessCategory}
            onChange={(e) => setBusinessCategory(e.target.value)}
            error={fieldErrors.category}
            disabled={isBlocked}
            options={[
              { value: "", label: "Sin categoría" },
              ...DEFAULT_CATEGORIES.map((cat) => ({ value: cat.name, label: cat.name })),
            ]}
          />
        </div>

        <Textarea
          label="Descripción de la tienda"
          rows={3}
          value={businessDescription}
          onChange={(e) => setBusinessDescription(e.target.value)}
          error={fieldErrors.description}
          maxLength={600}
          disabled={isBlocked}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Dirección del local o zona"
            value={businessAddress}
            onChange={(e) => setBusinessAddress(e.target.value)}
            error={fieldErrors.address}
            maxLength={160}
            disabled={isBlocked}
          />
          <Input
            label="Horario de atención"
            value={businessSchedule}
            onChange={(e) => setBusinessSchedule(e.target.value)}
            error={fieldErrors.schedule}
            maxLength={120}
            disabled={isBlocked}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Teléfono del negocio"
            value={businessPhone}
            onChange={(e) => setBusinessPhone(e.target.value)}
            error={fieldErrors.phone}
            disabled={isBlocked}
          />
          <Input
            label="WhatsApp del negocio"
            value={businessWhatsapp}
            onChange={(e) => setBusinessWhatsapp(e.target.value)}
            error={fieldErrors.whatsapp}
            helperText="Se guarda en formato internacional para el botón de WhatsApp."
            disabled={isBlocked}
          />
        </div>

        <div className="pt-2 border-t border-gray-100 space-y-3">
          <h4 className="font-bold text-gray-900 text-sm">Redes y sitio web</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Instagram"
              placeholder="instagram.com/tutienda"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              error={fieldErrors.instagram}
              maxLength={200}
              disabled={isBlocked}
            />
            <Input
              label="Facebook"
              placeholder="facebook.com/tutienda"
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
              error={fieldErrors.facebook}
              maxLength={200}
              disabled={isBlocked}
            />
            <Input
              label="Sitio web"
              placeholder="tutienda.com.py"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              error={fieldErrors.website}
              maxLength={200}
              disabled={isBlocked}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button
            type="submit"
            variant="accent"
            size="lg"
            isLoading={isSaving}
            disabled={isSaving || isBlocked}
            leftIcon={<Save className="w-4 h-4" />}
          >
            {isSaving ? "Guardando..." : businessId ? "Guardar Cambios" : "Crear Mi Tienda"}
          </Button>
          {isSaved && (
            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Guardado
            </span>
          )}
        </div>
      </form>

      {/* Galería / vitrina */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
            <Images className="w-4 h-4 text-[#1E3A5F]" /> Fotos de la vitrina
          </div>
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
              canAddPhotos ? "bg-blue-50 text-[#1E3A5F]" : "bg-amber-50 text-amber-700"
            }`}
          >
            {images.length}/{photoLimit} fotos
          </span>
        </div>

        <p className="text-[11px] text-gray-500">
          La primera foto es la portada de tu tienda. Podés usar la estrella para cambiarla.
          {!businessId && " Primero guardá los datos de la tienda para habilitar las fotos."}
        </p>

        {photoError && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {photoError}
          </p>
        )}

        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          onChange={(e) => {
            void addPhotos(e.target.files);
            e.target.value = "";
          }}
          className="hidden"
          id="store-photo-upload"
          disabled={!businessId || isBlocked || isUploadingPhoto || !canAddPhotos}
        />
        <label
          htmlFor="store-photo-upload"
          className={`border-2 border-dashed rounded-2xl p-6 text-center transition-colors block ${
            !businessId || isBlocked || !canAddPhotos
              ? "border-gray-200 bg-gray-50/50 cursor-not-allowed opacity-60"
              : "border-gray-200 hover:border-gray-300 bg-gray-50/50 cursor-pointer"
          }`}
        >
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-xs text-gray-600 font-semibold">
            {isUploadingPhoto
              ? "Subiendo fotos..."
              : canAddPhotos
                ? "Hacé clic para agregar fotos"
                : "Cupo completo"}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">
            JPG, PNG, WebP o AVIF hasta 5 MB cada una
          </p>
        </label>

        {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {images.map((image, index) => (
              <div key={image.id} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.image_url}
                  alt={`Foto ${index + 1} de la tienda`}
                  className={`w-full h-32 object-cover rounded-xl border ${
                    index === 0 ? "border-[#F5B800]" : "border-gray-200"
                  }`}
                />
                {index === 0 && (
                  <span className="absolute bottom-2 left-2 bg-[#F5B800] text-gray-950 text-[10px] font-bold px-2 py-0.5 rounded-md">
                    PORTADA
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => void removePhoto(image)}
                  disabled={pendingPhotoId === image.id || isBlocked}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity disabled:opacity-60"
                  aria-label={`Quitar foto ${index + 1}`}
                >
                  <X className="w-4 h-4" />
                </button>
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => void makeCover(image)}
                    disabled={isBlocked}
                    className="absolute bottom-2 right-2 bg-white/90 text-gray-700 p-1.5 rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shadow-sm"
                    aria-label={`Usar la foto ${index + 1} como portada`}
                  >
                    <Star className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {businessId && (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
            <Store className="w-4 h-4 text-[#1E3A5F]" /> Tu enlace público
          </div>
          <p className="text-xs text-gray-500 break-all">
            {username ? `${process.env.NEXT_PUBLIC_APP_URL || ""}/tienda/${username}` : ""}
          </p>
          <p className="text-[11px] text-gray-400">
            Compartilo por WhatsApp para que tus clientes vean tu escaparate.
          </p>
        </div>
      )}
    </div>
  );
}
