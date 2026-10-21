"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Alert } from "@/components/ui/Alert";
import { CAPIATA_NEIGHBORHOODS, type UserType } from "@/lib/types";
import { Save, CheckCircle2, ExternalLink, Store, Upload } from "lucide-react";
import { profileFormSchema, validateForm, type FieldErrors } from "@/lib/validation";
import { createClient } from "@/lib/supabase/client";
import { getProfile, updateProfile } from "@/lib/supabase/queries";
import {
  AVATARS_BUCKET,
  deleteImageByPublicUrl,
  uploadPublicImage,
  validateImageFile,
} from "@/lib/supabase/storage";
import { toErrorMessage } from "@/lib/supabase/errors";
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

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [neighborhood, setNeighborhood] = useState<string>(CAPIATA_NEIGHBORHOODS[0]);
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [userType, setUserType] = useState<UserType>("person");
  const [username, setUsername] = useState<string | null>(null);

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
        const profile = await getProfile(supabase, user.id);

        if (!active) return;

        if (profile) {
          setFullName(profile.full_name ?? "");
          setPhone(profile.phone ?? "");
          setBio(profile.bio ?? "");
          setAvatarUrl(profile.avatar_url);
          setUsername(profile.username);
          setUserType(profile.user_type);
          if (profile.neighborhood) setNeighborhood(profile.neighborhood);
        } else {
          setLoadError(
            "No encontramos tu perfil en la base. Cerrá sesión y volvé a entrar para regenerarlo."
          );
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

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setIsSaved(false);
    setFieldErrors({});

    if (!user) return;

    const parsed = validateForm(profileFormSchema, {
      fullName,
      phone,
      neighborhood,
      bio,
    });

    if (!parsed.success) {
      setFieldErrors(parsed.errors);
      setSaveError("Revisá los campos marcados antes de guardar.");
      return;
    }

    setIsSaving(true);

    try {
      const supabase = createClient();

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

      await updateProfile(supabase, user.id, {
        full_name: fullName.trim(),
        phone: phone.trim(),
        bio: bio.trim() || null,
        neighborhood,
        city: "Capiatá",
        user_type: userType,
        avatar_url: nextAvatarUrl,
      });

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
          Mantené actualizada tu información de contacto para que tus vecinos puedan comunicarse
          con vos.
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

      <Link
        href="/dashboard/mi-tienda"
        className="flex items-center justify-between gap-3 bg-[#1E3A5F] text-white p-4 rounded-2xl hover:bg-[#162C48] transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-bold">
          <Store className="w-4 h-4 text-[#F5B800]" />
          {userType === "business" ? "Administrar mi tienda online" : "Crear mi tienda online"}
        </span>
        <ExternalLink className="w-4 h-4 text-white/70" />
      </Link>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs space-y-6"
      >
        {saveError && <Alert variant="error">{saveError}</Alert>}

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
