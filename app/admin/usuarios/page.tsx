"use client";

import React, { useState } from "react";
import { Users, CheckCircle2, Ban, ShieldCheck, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface UserItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  neighborhood: string;
  type: "person" | "business";
  isVerified: boolean;
  isBlocked: boolean;
}

const INITIAL_USERS: UserItem[] = [
  {
    id: "1",
    name: "Juan Pérez",
    email: "juan.perez@ejemplo.com",
    phone: "0981 123 456",
    neighborhood: "Posta Ybycuá",
    type: "person",
    isVerified: true,
    isBlocked: false,
  },
  {
    id: "2",
    name: "Taller Mecánico El Rey",
    email: "taller.elrey@ejemplo.com",
    phone: "0981 555 111",
    neighborhood: "Ruta 2 - Km 19",
    type: "business",
    isVerified: true,
    isBlocked: false,
  },
  {
    id: "3",
    name: "María Gómez",
    email: "maria.gomez@ejemplo.com",
    phone: "0971 999 888",
    neighborhood: "Centro",
    type: "person",
    isVerified: false,
    isBlocked: false,
  },
];

export default function AdminUsuariosPage() {
  const [users, setUsers] = useState(INITIAL_USERS);

  const toggleVerify = (id: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, isVerified: !u.isVerified } : u))
    );
  };

  const toggleBlock = (id: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, isBlocked: !u.isBlocked } : u))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-700">
        <div>
          <h1 className="text-xl font-black text-white">Gestión de Usuarios y Comercios</h1>
          <p className="text-xs text-gray-400">Verificación de perfiles y control de acceso</p>
        </div>
      </div>

      <div className="divide-y divide-gray-700 rounded-2xl bg-gray-900 border border-gray-700 overflow-hidden">
        {users.map((user) => (
          <div key={user.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    user.type === "business"
                      ? "bg-purple-900/80 text-purple-200"
                      : "bg-blue-900/80 text-blue-200"
                  }`}
                >
                  {user.type === "business" ? "COMERCIO" : "VECINO"}
                </span>
                {user.isVerified && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-900/80 text-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> VERIFICADO
                  </span>
                )}
                {user.isBlocked && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-900/80 text-red-200">
                    BLOQUEADO
                  </span>
                )}
              </div>
              <h3 className="font-bold text-white text-sm">{user.name}</h3>
              <div className="text-xs text-gray-400 flex items-center gap-3">
                <span>{user.email}</span>
                <span>• {user.phone}</span>
                <span className="flex items-center gap-0.5 text-gray-400">
                  <MapPin className="w-3 h-3 text-[#F5B800]" /> {user.neighborhood}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={user.isVerified ? "outline" : "accent"}
                size="sm"
                onClick={() => toggleVerify(user.id)}
                leftIcon={<ShieldCheck className="w-4 h-4" />}
              >
                {user.isVerified ? "Quitar Verificación" : "Verificar"}
              </Button>

              <Button
                variant={user.isBlocked ? "primary" : "danger"}
                size="sm"
                onClick={() => toggleBlock(user.id)}
                leftIcon={<Ban className="w-4 h-4" />}
              >
                {user.isBlocked ? "Desbloquear" : "Bloquear"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
