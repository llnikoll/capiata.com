"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { KeyRound, Bell, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function ConfiguracionPage() {
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [isUpdated, setIsUpdated] = useState(false);

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      alert("Las contraseñas no coinciden");
      return;
    }
    setIsUpdated(true);
    setCurrentPass("");
    setNewPass("");
    setConfirmPass("");
    setTimeout(() => setIsUpdated(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs space-y-2">
        <h1 className="text-2xl font-black text-gray-900">
          Configuración de Cuenta
        </h1>
        <p className="text-xs text-gray-500">
          Administrá tus preferencias de seguridad y privacidad.
        </p>
      </div>

      {/* Cambiar Contraseña */}
      <form onSubmit={handlePasswordChange} className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs space-y-5">
        <div className="flex items-center gap-2 font-bold text-gray-900 text-sm pb-2 border-b border-gray-100">
          <KeyRound className="w-4 h-4 text-[#1E3A5F]" /> Cambiar Contraseña
        </div>

        <Input
          label="Contraseña actual"
          type="password"
          value={currentPass}
          onChange={(e) => setCurrentPass(e.target.value)}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Nueva contraseña"
            type="password"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            required
          />

          <Input
            label="Confirmar nueva contraseña"
            type="password"
            value={confirmPass}
            onChange={(e) => setConfirmPass(e.target.value)}
            required
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" variant="primary">
            Actualizar Contraseña
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

        <div className="space-y-3 text-xs text-gray-700">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" defaultChecked className="w-4 h-4 text-[#1E3A5F] rounded" />
            <span>Recibir alertas sobre nuevos pedidos (BUSCO) en mi barrio</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" defaultChecked className="w-4 h-4 text-[#1E3A5F] rounded" />
            <span>Notificaciones sobre publicaciones similares a mis búsquedas</span>
          </label>
        </div>
      </div>
    </div>
  );
}
