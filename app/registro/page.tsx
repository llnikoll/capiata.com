"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { User, Mail, Lock, Phone, UserPlus, Store, CheckCircle2, AlertCircle } from "lucide-react";
import { CAPIATA_NEIGHBORHOODS, UserType } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

export default function RegistroPage() {
  const router = useRouter();
  const [userType, setUserType] = useState<UserType>("person");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [neighborhood, setNeighborhood] = useState<string>(CAPIATA_NEIGHBORHOODS[0]);
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const supabase = createClient();
    const emailValue = email.trim().toLowerCase();
    const username =
      emailValue
        .split("@")[0]
        ?.normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9_]/gi, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase() || "usuario";

    const { data, error } = await supabase.auth.signUp({
      email: emailValue,
      password,
      options: {
        data: {
          username: `${username}-${crypto.randomUUID().slice(0, 8)}`,
          full_name: fullName.trim(),
          phone: phone.trim(),
          neighborhood,
          user_type: userType,
        },
      },
    });

    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message || "Error al crear la cuenta. Intentalo de nuevo.");
      return;
    }

    if (data.session) {
      setSuccessMessage("¡Cuenta creada con éxito! Te estamos llevando a tu panel.");
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1000);
      return;
    }

    setSuccessMessage("¡Cuenta creada con éxito! Revisá tu correo para confirmar la cuenta y luego iniciá sesión.");
    setTimeout(() => {
      router.push("/login");
    }, 3000);
  };

  const handleGoogleRegister = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message || "Error al registrarse con Google.");
      return;
    }
  };

  return (
    <div className="py-12 bg-gray-50/50 min-h-screen flex items-center justify-center">
      <div className="max-w-lg w-full mx-4 bg-white p-8 rounded-3xl border border-gray-100 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black text-gray-900">
            Crear Cuenta en Capiatá Conecta
          </h1>
          <p className="text-xs text-gray-500">
            Sumate a la red local y conectá con tus vecinos
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

        {errorMessage && (
          <div className="bg-red-50 text-red-700 p-3 rounded-xl border border-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl border border-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <Input
            label={userType === "person" ? "Nombre y Apellido" : "Nombre del Comercio / Emprendimiento"}
            placeholder={userType === "person" ? "Ej: Juan Pérez" : "Ej: Panadería San José"}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            leftIcon={<User className="w-4 h-4" />}
            required
          />

          <Input
            label="Correo electrónico"
            type="email"
            placeholder="tuemail@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
            required
          />

          <Input
            label="Teléfono / WhatsApp"
            placeholder="0981123456"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            leftIcon={<Phone className="w-4 h-4" />}
            required
          />

          <Select
            label="Barrio en Capiatá"
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            options={CAPIATA_NEIGHBORHOODS.map((b) => ({
              value: b,
              label: b,
            }))}
          />

          <Input
            label="Contraseña"
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
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
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continuar con Google
        </Button>

        <div className="text-center text-xs text-gray-500 pt-4 border-t border-gray-100">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="text-[#1E3A5F] font-bold hover:underline">
            Iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
