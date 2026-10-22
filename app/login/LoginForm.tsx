"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Mail, Lock, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toErrorMessage } from "@/lib/supabase/errors";
import { GoogleIcon } from "@/components/ui/GoogleIcon";
import { safeRedirectPath } from "@/lib/utils";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirectPath(searchParams.get("redirect"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        setErrorMessage(
          error.message || "No pudimos iniciar sesión. Revisá tus datos e intentalo de nuevo."
        );
        return;
      }

      setSuccessMessage("Sesión iniciada. Te estamos llevando a tu panel.");
      router.push(redirectTo);
      router.refresh();
    } catch (error) {
      setErrorMessage(toErrorMessage(error, "No pudimos iniciar sesión."));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage("Escribí tu correo electrónico para enviarte el enlace de recuperación.");
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/configuracion`,
      });

      if (error) {
        setErrorMessage(error.message || "No pudimos enviar el correo de recuperación.");
        return;
      }

      setSuccessMessage(
        "Te enviamos un correo con las instrucciones para restablecer tu contraseña."
      );
    } catch (error) {
      setErrorMessage(toErrorMessage(error, "No pudimos enviar el correo de recuperación."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      });

      if (error) {
        setErrorMessage(error.message || "Error al iniciar sesión con Google.");
      }
    } catch (error) {
      setErrorMessage(toErrorMessage(error, "Error al iniciar sesión con Google."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="py-16 bg-gray-50/50 min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full mx-4 bg-white p-8 rounded-3xl border border-gray-100 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#1E3A5F] text-[#F5B800] font-black text-2xl flex items-center justify-center mx-auto">
            C
          </div>
          <h1 className="text-2xl font-black text-gray-900">Ingresar a Capiatá Conecta</h1>
          <p className="text-xs text-gray-500">
            Accedé a tu cuenta para gestionar tus publicaciones
          </p>
        </div>

        {errorMessage && <Alert variant="error">{errorMessage}</Alert>}
        {successMessage && <Alert variant="success">{successMessage}</Alert>}

        <form onSubmit={handleLogin} noValidate className="space-y-4">
          <Input
            label="Correo electrónico"
            type="email"
            placeholder="tuemail@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
            disabled={isLoading}
            required
          />

          <Input
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
            disabled={isLoading}
            required
          />

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={handlePasswordReset}
              className="text-xs text-[#1E3A5F] font-semibold hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full shadow-md"
            leftIcon={<LogIn className="w-4 h-4" />}
          >
            Iniciar Sesión
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-white text-gray-500">o continuá con</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="lg"
          isLoading={isLoading}
          className="w-full shadow-sm border-gray-300"
          onClick={handleGoogleLogin}
        >
          <GoogleIcon />
          Continuar con Google
        </Button>

        <div className="text-center text-xs text-gray-500 pt-4 border-t border-gray-100">
          ¿No tenés cuenta aún?{" "}
          <Link href="/registro" className="text-[#1E3A5F] font-bold hover:underline">
            Registrate gratis
          </Link>
        </div>
      </div>
    </div>
  );
}
