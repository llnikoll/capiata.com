"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Mail, Lock, LogIn } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Iniciando sesión...");
  };

  return (
    <div className="py-16 bg-gray-50/50 min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full mx-4 bg-white p-8 rounded-3xl border border-gray-100 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#1E3A5F] text-[#F5B800] font-black text-2xl flex items-center justify-center mx-auto">
            C
          </div>
          <h1 className="text-2xl font-black text-gray-900">
            Ingresar a Capiatá Conecta
          </h1>
          <p className="text-xs text-gray-500">
            Accedé a tu cuenta para gestionar tus publicaciones
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
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
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
            required
          />

          <div className="flex items-center justify-end">
            <a href="#" className="text-xs text-[#1E3A5F] font-semibold hover:underline">
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full shadow-md"
            leftIcon={<LogIn className="w-4 h-4" />}
          >
            Iniciar Sesión
          </Button>
        </form>

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
