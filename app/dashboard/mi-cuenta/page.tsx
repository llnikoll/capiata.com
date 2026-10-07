"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { CAPIATA_NEIGHBORHOODS } from "@/lib/types";
import { Save, CheckCircle2, Store } from "lucide-react";

export default function MiCuentaPage() {
  const [fullName, setFullName] = useState("Juan Pérez");
  const [phone, setPhone] = useState("0981 123 456");
  const [neighborhood, setNeighborhood] = useState<string>("Posta Ybycuá");
  const [bio, setBio] = useState("Técnico independiente especializado en instalación y mantenimiento.");
  const [isSaved, setIsSaved] = useState(false);

  // Business profile state
  const [isBusiness, setIsBusiness] = useState(true);
  const [businessName, setBusinessName] = useState("Servicios JP Capiatá");
  const [address, setAddress] = useState("Ruta 1 Km 18, Capiatá");
  const [schedule, setSchedule] = useState("Lun a Sáb: 08:00 a 18:00 hs");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs space-y-2">
        <h1 className="text-2xl font-black text-gray-900">
          Mi Perfil y Datos Personales
        </h1>
        <p className="text-xs text-gray-500">
          Mantené actualizada tu información de contacto para que tus vecinos puedan comunicarse con vos.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs space-y-6">
        {/* Avatar section */}
        <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
          <Avatar name={fullName} size="xl" />
          <div className="space-y-1">
            <h4 className="font-bold text-gray-900 text-sm">Foto de Perfil</h4>
            <Button variant="outline" size="sm">
              Cambiar foto
            </Button>
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Nombre y Apellido"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <Input
            label="Teléfono / WhatsApp"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>

        <Select
          label="Barrio en Capiatá"
          value={neighborhood}
          onChange={(e) => setNeighborhood(e.target.value)}
          options={CAPIATA_NEIGHBORHOODS.map((b) => ({
            value: b,
            label: b,
          }))}
        />

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-700">
            Biografía o presentación personal
          </label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
          />
        </div>

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
              <Input
                label="Nombre Comercial"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Dirección del local o zona"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
                <Input
                  label="Horario de atención"
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3 pt-4">
          <Button
            type="submit"
            variant="accent"
            size="lg"
            className="font-bold shadow-md"
            leftIcon={<Save className="w-4 h-4" />}
          >
            Guardar Cambios
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
