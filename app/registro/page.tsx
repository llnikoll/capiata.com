"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { User, Mail, Lock, Phone, UserPlus, Store } from "lucide-react";
import { CAPIATA_NEIGHBORHOODS, UserType } from "@/lib/types";

export default function RegistroPage() {
  const [userType, setUserType] = useState<UserType>("person");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [neighborhood, setNeighborhood] = useState<string>(CAPIATA_NEIGHBORHOODS[0]);
  const [password, setPassword] = useState("");

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    alert("¡Cuenta creada exitosamente!");
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
            className="w-full font-bold shadow-md"
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Crear Cuenta Gratis
          </Button>
        </form>

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
