"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Alert } from "@/components/ui/Alert";
import { CAPIATA_NEIGHBORHOODS, DEFAULT_CATEGORIES } from "@/lib/types";
import { Save, CheckCircle2, Store, Upload, ExternalLink } from "lucide-react";
import { businessFormSchema, profileFormSchema, validateForm, type FieldErrors } from "@/lib/validation";
import { createClient } from "@/lib/supabase/client";
import { getBusinessByUser, getProfile, saveBusiness, updateProfile } from "@/lib/supabase/queries";
import {
  AVATARS_BUCKET,
  deleteImageByPublicUrl,
  uploadPublicImage,
  validateImageFile,
} from "@/lib/supabase/storage";
import { toErrorMessage } from "@/lib/supabase/errors";
import { normalizeWhatsAppNumber } from "@/lib/utils";
import { useAuthUser } from "@/lib/hooks/useAuthUser";

export default function MiCuentaPage() {
  const { user, loading: authLoading } = useAuthUser();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  // Perfil personal
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [neighborhood, setNeighborhood] = useState<string>(CAPIATA_NEIGHBORHOODS[0]);
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Perfil de comercio
  const [isBusiness, setIsBusiness] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [businessCategory, setBusinessCategory] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessSchedule, setBusinessSchedule] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessWhatsapp, setBusinessWhatsapp] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [username, setUsername] = useState<string | null>(null);

  // Carga de datos reales del usuario autenticado.
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
        const [profile, business] = await Promise.all([
          getProfile(supabase, user.id),
          getBusinessByUser(supabase, user.id),
        ]);

        if (!active) return;

        if (profile) {
          setFullName(profile.full_name ?? "");
          setPhone(profile.phone ?? "");
          setBio(profile.bio ?? "");
          setAvatarUrl(profile.avatar_url);
          setUsername(profile.username);
          if (profile.neighborhood) setNeighborhood(profile.neighborhood);
          setIsBusiness(profile.user_type === "business");
        } else {
          setLoadError(
            "No encontramos tu perfil en la base. Cerrá sesión y volvé a entrar para regenerarlo."
          );
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
          setLogoUrl(business.logo_url);
        } else {
          setBusinessName(profile?.full_name ?? "");
          setBusinessPhone(profile?.phone ?? "");
          setBusinessWhatsapp(profile?.phone ? normalizeWhatsAppNumber(profile.phone) : "");
        }
      } catch (error) {
        if (active) {
          setLoadError(toErrorMessage(error, "No pudimos cargar tu perfil."));
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [user, authLoading]);

  // Previsualización del avatar seleccionado.
  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  // Previsualización del logo del comercio.
  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null);
      return;
    }
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const error = validateImageFile(file);
    if (error) {
      setAvatarError(error);
      return;
    }

    setAvatarError(null);
    setAvatarFile(file);
  };

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

    const profileParsed = validateForm(profileFormSchema, {
      fullName,
      phone,
      neighborhood,
      bio,
    });

    const businessParsed = businessFormSchema.safeParse({
      businessName,
      description: businessDescription,
      category: businessCategory,
      phone: businessPhone,
      whatsapp: businessWhatsapp,
      address: businessAddress,
      schedule: businessSchedule,
    });

    const errors: FieldErrors = {};
    if (!profileParsed.success) Object.assign(errors, profileParsed.errors);
    if (isBusiness && !businessParsed.success) {
      for (const issue of businessParsed.error.issues) {
        errors[`business.${issue.path.join(".")}`] = issue.message;
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSaveError("Revisá los campos marcados antes de guardar.");
      return;
    }

    setIsSaving(true);

    try {
      const supabase = createClient();

      // 1. Avatar (opcional): sube la nueva imagen y reemplaza la referencia.
      let nextAvatarUrl = avatarUrl;
      if (avatarFile) {
        const previousAvatar = avatarUrl;
        nextAvatarUrl = await uploadPublicImage(supabase, AVATARS_BUCKET, avatarFile, user.id);
        if (previousAvatar) {
          await deleteImageByPublicUrl(supabase, AVATARS_BUCKET, previousAvatar).catch(
            () => undefined
          );
        }
      }

      // 2. Perfil personal (RLS: sólo el propio usuario puede actualizarlo).
      await updateProfile(supabase, user.id, {
        full_name: fullName.trim(),
        phone: phone.trim(),
        bio: bio.trim() || null,
        neighborhood,
        city: "Capiatá",
        user_type: isBusiness ? "business" : "person",
        avatar_url: nextAvatarUrl,
      });

      // 3. Perfil de comercio (RLS: sólo el dueño puede crear/editar su comercio).
      if (isBusiness) {
        if (businessParsed.success) {
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

          const saved = await saveBusiness(
            supabase,
            user.id,
            {
              business_name: businessParsed.data.businessName,
              description: businessParsed.data.description || null,
              category: businessParsed.data.category || null,
              phone: businessParsed.data.phone || null,
              whatsapp: normalizeWhatsAppNumber(businessParsed.data.whatsapp) || null,
              address: businessParsed.data.address || null,
              schedule: businessParsed.data.schedule || null,
              logo_url: nextLogoUrl,
            },
            businessId
          );

          setBusinessId(saved.id);
          setLogoUrl(saved.logo_url);
          setLogoFile(null);
        }
      }

      setAvatarUrl(nextAvatarUrl);
      setAvatarFile(null);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 4000);
    } catch (error) {
      setSaveError(toErrorMessage(error, "No pudimos guardar los cambios."));
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="text-gray-500 text-sm">Cargando tu perfil...</div>;
  }

  const displayName = fullName || user?.email || "Usuario";

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs space-y-2">
        <h1 className="text-2xl font-black text-gray-900">Mi Perfil y Datos Personales</h1>
        <p className="text-xs text-gray-500">
          Mantené actualizada tu información de contacto para que tus vecinos puedan comunicarse con vos.
        </p>
        {username && (
          <Link
            href={`/usuario/${username}`}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#1E3A5F] hover:underline"
          >
            Ver mi perfil público <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {loadError && <Alert variant="error">{loadError}</Alert>}

      <form
        onSubmit={handleSubmit}
        noValidate
        className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs space-y-6"
      >
        {saveError && <Alert variant="error">{saveError}</Alert>}

        {/* Avatar section */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-6 border-b border-gray-100">
          <Avatar src={avatarPreview || avatarUrl} name={displayName} size="xl" />
          <div className="space-y-1.5">
            <h4 className="font-bold text-gray-900 text-sm">Foto de Perfil</h4>
            <p className="text-[11px] text-gray-500">
              JPG, PNG, WebP o AVIF hasta 5 MB. Se guarda en Supabase Storage.
            </p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              id="avatar-upload"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <label htmlFor="avatar-upload">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F]/5 text-xs font-semibold cursor-pointer">
                <Upload className="w-3.5 h-3.5" /> Cambiar foto
              </span>
            </label>
            {avatarError && <p className="text-xs text-red-500">{avatarError}</p>}
            {avatarFile && (
              <p className="text-[11px] text-emerald-600 font-semibold">
                Nueva foto lista para guardar: {avatarFile.name}
              </p>
            )}
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Nombre y Apellido"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            error={fieldErrors.fullName}
            required
          />

          <Input
            label="Teléfono / WhatsApp"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={fieldErrors.phone}
            required
          />
        </div>

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

        <Textarea
          label="Biografía o presentación personal"
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          error={fieldErrors.bio}
          maxLength={400}
        />

        {/* Business Profile Toggle */}
        <div className="pt-6 border-t border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
              <Store className="w-4 h-4 text-[#1E3A5F]" /> Perfil de Comercio / Emprendimiento
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isBusiness}
                onChange={(e) => setIsBusiness(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1E3A5F]"></div>
            </label>
          </div>

          {isBusiness && (
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <Avatar
                  src={logoPreview || logoUrl}
                  name={businessName || displayName}
                  size="lg"
                />
                <div className="space-y-1.5">
                  <h5 className="font-bold text-gray-900 text-xs">Logo del comercio</h5>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    id="logo-upload"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                  <label htmlFor="logo-upload">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F]/5 text-xs font-semibold cursor-pointer">
                      <Upload className="w-3.5 h-3.5" /> Cambiar logo
                    </span>
                  </label>
                  {logoError && <p className="text-xs text-red-500">{logoError}</p>}
                </div>
              </div>

              <Input
                label="Nombre Comercial"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                error={fieldErrors["business.businessName"]}
              />

              <Select
                label="Rubro o categoría"
                value={businessCategory}
                onChange={(e) => setBusinessCategory(e.target.value)}
                error={fieldErrors["business.category"]}
                options={[
                  { value: "", label: "Sin categoría" },
                  ...DEFAULT_CATEGORIES.map((cat) => ({
                    value: cat.name,
                    label: cat.name,
                  })),
                ]}
              />

              <Textarea
                label="Descripción del comercio"
                rows={3}
                value={businessDescription}
                onChange={(e) => setBusinessDescription(e.target.value)}
                error={fieldErrors["business.description"]}
                maxLength={600}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Dirección del local o zona"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  error={fieldErrors["business.address"]}
                />
                <Input
                  label="Horario de atención"
                  value={businessSchedule}
                  onChange={(e) => setBusinessSchedule(e.target.value)}
                  error={fieldErrors["business.schedule"]}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Teléfono del comercio"
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(e.target.value)}
                  error={fieldErrors["business.phone"]}
                />
                <Input
                  label="WhatsApp del comercio"
                  value={businessWhatsapp}
                  onChange={(e) => setBusinessWhatsapp(e.target.value)}
                  error={fieldErrors["business.whatsapp"]}
                  helperText="Se guarda en formato internacional para el enlace de WhatsApp."
                />
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex flex-wrap items-center gap-3 pt-4">
          <Button
            type="submit"
            variant="accent"
            size="lg"
            isLoading={isSaving}
            disabled={isSaving || !user}
            className="font-bold shadow-md"
            leftIcon={<Save className="w-4 h-4" />}
          >
            {isSaving ? "Guardando..." : "Guardar Cambios"}
          </Button>

          {isSaved && (
            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Cambios guardados correctamente
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
