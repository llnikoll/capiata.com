"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { KeyRound, Bell, CheckCircle2 } from "lucide-react";
import { passwordFormSchema, validateForm, type FieldErrors } from "@/lib/validation";
import { createClient } from "@/lib/supabase/client";
import { toErrorMessage } from "@/lib/supabase/errors";
import { useAuthUser } from "@/lib/hooks/useAuthUser";

type NotificationPrefs = {
  newRequests: boolean;
  similarListings: boolean;
};

const DEFAULT_PREFS: NotificationPrefs = { newRequests: true, similarListings: true };

export default function ConfiguracionPage() {
  const { user } = useAuthUser();

  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUpdated, setIsUpdated] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsMessage, setPrefsMessage] = useState<string | null>(null);
  const [prefsError, setPrefsError] = useState<string | null>(null);

  // Preferencias guardadas en los metadatos del usuario en Supabase Auth.
  useEffect(() => {
    const stored = user?.user_metadata?.notification_prefs as NotificationPrefs | undefined;
    if (stored) {
      setPrefs({
        newRequests: stored.newRequests ?? true,
        similarListings: stored.similarListings ?? true,
      });
    }
  }, [user]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setIsUpdated(false);

    const parsed = validateForm(passwordFormSchema, { newPassword: newPass, confirmPassword: confirmPass });
    if (!parsed.success) {
      setFieldErrors(parsed.errors);
      setPasswordError("Revisá los datos ingresados.");
      return;
    }

    setFieldErrors({});
    setIsUpdating(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
      if (error) throw error;

      setIsUpdated(true);
      setNewPass("");
      setConfirmPass("");
      setTimeout(() => setIsUpdated(false), 4000);
    } catch (error) {
      setPasswordError(toErrorMessage(error, "No pudimos actualizar la contraseña."));
    } finally {
      setIsUpdating(false);
    }
  };

  const savePrefs = async (next: NotificationPrefs) => {
    setPrefs(next);
    setPrefsSaving(true);
    setPrefsError(null);
    setPrefsMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: { notification_prefs: next },
      });
      if (error) throw error;

      setPrefsMessage("Preferencias guardadas");
      setTimeout(() => setPrefsMessage(null), 3000);
    } catch (error) {
      setPrefsError(toErrorMessage(error, "No pudimos guardar tus preferencias."));
    } finally {
      setPrefsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs space-y-2">
        <h1 className="text-2xl font-black text-gray-900">Configuración de Cuenta</h1>
        <p className="text-xs text-gray-500">
          Administrá tus preferencias de seguridad y privacidad.
        </p>
      </div>

      {/* Cambiar Contraseña */}
      <form
        onSubmit={handlePasswordChange}
        noValidate
        className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs space-y-5"
      >
        <div className="flex items-center gap-2 font-bold text-gray-900 text-sm pb-2 border-b border-gray-100">
          <KeyRound className="w-4 h-4 text-[#1E3A5F]" /> Cambiar Contraseña
        </div>

        {passwordError && <Alert variant="error">{passwordError}</Alert>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Nueva contraseña"
            type="password"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            error={fieldErrors.newPassword}
            disabled={isUpdating}
            required
          />

          <Input
            label="Confirmar nueva contraseña"
            type="password"
            value={confirmPass}
            onChange={(e) => setConfirmPass(e.target.value)}
            error={fieldErrors.confirmPassword}
            disabled={isUpdating}
            required
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button type="submit" variant="primary" isLoading={isUpdating} disabled={isUpdating}>
            {isUpdating ? "Actualizando..." : "Actualizar Contraseña"}
          </Button>

          {isUpdated && (
            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Contraseña actualizada
            </span>
          )}
        </div>
      </form>

      {/* Notificaciones */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs space-y-4">
        <div className="flex items-center gap-2 font-bold text-gray-900 text-sm pb-2 border-b border-gray-100">
          <Bell className="w-4 h-4 text-[#1E3A5F]" /> Preferencias de Notificación
        </div>

        {prefsError && <Alert variant="error">{prefsError}</Alert>}

        <div className="space-y-3 text-xs text-gray-700">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.newRequests}
              disabled={prefsSaving}
              onChange={(e) => savePrefs({ ...prefs, newRequests: e.target.checked })}
              className="w-4 h-4 text-[#1E3A5F] rounded"
            />
            <span>Recibir alertas sobre nuevos pedidos (BUSCO) en mi barrio</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.similarListings}
              disabled={prefsSaving}
              onChange={(e) => savePrefs({ ...prefs, similarListings: e.target.checked })}
              className="w-4 h-4 text-[#1E3A5F] rounded"
            />
            <span>Notificaciones sobre publicaciones similares a mis búsquedas</span>
          </label>
        </div>

        {prefsMessage && (
          <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> {prefsMessage}
          </span>
        )}
      </div>
    </div>
  );
}
