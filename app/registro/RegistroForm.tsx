"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { GoogleIcon } from "@/components/ui/GoogleIcon";
import { User, Mail, Lock, Phone, UserPlus, Store } from "lucide-react";
import { CAPIATA_NEIGHBORHOODS, type UserType } from "@/lib/types";
import { registrationFormSchema, validateForm, type FieldErrors } from "@/lib/validation";
import { createClient } from "@/lib/supabase/client";
import { toErrorMessage } from "@/lib/supabase/errors";
import { normalizeWhatsAppNumber } from "@/lib/utils";



export function RegistroForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [userType, setUserType] = useState<UserType>(() =>
    searchParams.get("tipo") === "emprendedor" ? "business" : "person"
  );
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [neighborhood, setNeighborhood] = useState<string>(CAPIATA_NEIGHBORHOODS[0]);
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setFieldErrors({});

    const parsed = validateForm(registrationFormSchema, {
      fullName,
      email,
      phone,
      password,
    });

    if (!parsed.success) {
      setFieldErrors(parsed.errors);
      setErrorMessage("RevisÃ¡ los campos marcados antes de continuar.");
      setIsLoading(false);
      return;
    }

    const emailValue = parsed.data.email;
    const username =
      emailValue
        .split("@")[0]
        ?.normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9_]/gi, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase() || "usuario";

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: emailValue,
        password: parsed.data.password,
        options: {
          data: {
            username: `${username}-${crypto.randomUUID().slice(0, 8)}`,
            full_name: parsed.data.fullName,
            phone: normalizeWhatsAppNumber(parsed.data.phone),
            neighborhood,
            user_type: userType,
          },
        },
      });

      if (error) {
        setErrorMessage(error.message || "Error al crear la cuenta. Intentalo de nuevo.");
        return;
      }

      if (data.session) {
        const next = userType === "business" ? "/dashboard/mi-tienda" : "/dashboard";
        setSuccessMessage(
          userType === "business"
            ? "Â¡Cuenta creada! Ahora creÃ¡ tu tienda online."
            : "Â¡Cuenta creada con Ã©xito! Te estamos llevando a tu panel."
        );
        router.push(next);
        router.refresh();
        return;
      }

      setSuccessMessage(
        "Â¡Cuenta creada con Ã©xito! RevisÃ¡ tu correo para confirmar la cuenta y luego iniciÃ¡ sesiÃ³n."
      );
      setTimeout(() => router.push("/login"), 3000);
    } catch (error) {
      setErrorMessage(toErrorMessage(error, "Error al crear la cuenta. Intentalo de nuevo."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        setErrorMessage(error.message || "Error al registrarse con Google.");
      }
    } catch (error) {
      setErrorMessage(toErrorMessage(error, "Error al registrarse con Google."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="py-12 bg-gray-50/50 min-h-screen flex items-center justify-center">
      <div className="max-w-lg w-full mx-4 bg-white p-8 rounded-3xl border border-gray-100 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black text-gray-900">Crear Cuenta en CapiatÃ¡ Conecta</h1>
          <p className="text-xs text-gray-500">
            Sumate a la red local y conectÃ¡ con tus vecinos
          </p>
        </div>

        {/* User Type Switcher */}
        <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1.5 rounded-2xl">
          <button
            type="button"
            onClick={() => setUserType("person")}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              userType === "person"
                ? "bg-white text-[#1E3A5F] shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <User className="w-4 h-4" /> Particular / Vecino
          </button>
          <button
            type="button"
            onClick={() => setUserType("business")}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              userType === "business"
                ? "bg-white text-[#1E3A5F] shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Store className="w-4 h-4" /> Emprendimiento
          </button>
        </div>

        {errorMessage && <Alert variant="error">{errorMessage}</Alert>}
        {successMessage && <Alert variant="success">{successMessage}</Alert>}

        <form onSubmit={handleRegister} noValidate className="space-y-4">
          <Input
            label={
              userType === "person"
                ? "Nombre y Apellido"
                : "Nombre del Comercio / Emprendimiento"
            }
            placeholder={userType === "person" ? "Ej: Juan PÃ©rez" : "Ej: PanaderÃ­a San JosÃ©"}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            leftIcon={<User className="w-4 h-4" />}
            error={fieldErrors.fullName}
            required
          />

          <Input
            label="Correo electrÃ³nico"
            type="email"
            placeholder="tuemail@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
            error={fieldErrors.email}
            required
          />

          <Input
            label="TelÃ©fono / WhatsApp"
            placeholder="0981123456"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            leftIcon={<Phone className="w-4 h-4" />}
            error={fieldErrors.phone}
            helperText="Con este nÃºmero te contactarÃ¡n los vecinos por WhatsApp."
            required
          />

          <Select
            label="Barrio en CapiatÃ¡"
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            options={CAPIATA_NEIGHBORHOODS.map((b) => ({
              value: b,
              label: b,
            }))}
          />

          <Input
            label="ContraseÃ±a"
            type="password"
            placeholder="MÃ­nimo 8 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
            error={fieldErrors.password}
            required
          />

          <Button
            type="submit"
            variant="accent"
            size="lg"
            isLoading={isLoading}
            className="w-full font-bold shadow-md"
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Crear Cuenta Gratis
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-white text-gray-500">o registrate con</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="lg"
          isLoading={isLoading}
          className="w-full shadow-sm border-gray-300"
          onClick={handleGoogleRegister}
        >
          <GoogleIcon />
          Continuar con Google
        </Button>

        <div className="text-center text-xs text-gray-500 pt-4 border-t border-gray-100">
          Â¿Ya tenÃ©s cuenta?{" "}
          <Link href="/login" className="text-[#1E3A5F] font-bold hover:underline">
            Iniciar sesiÃ³n
          </Link>
        </div>
      </div>
    </div>
  );
}
