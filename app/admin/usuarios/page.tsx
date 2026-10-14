"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Ban, ShieldCheck, MapPin, Users, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/client";
import { getAdminProfiles, updateProfileModeration } from "@/lib/supabase/queries";
import { toErrorMessage } from "@/lib/supabase/errors";
import type { Profile } from "@/lib/types";

export default function AdminUsuariosPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const data = await getAdminProfiles(supabase);
      setUsers(data);
      setError(null);
    } catch (loadError) {
      setError(toErrorMessage(loadError, "No pudimos cargar los usuarios."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patchUser = async (
    profile: Profile,
    patch: { is_verified?: boolean; is_blocked?: boolean }
  ) => {
    setPendingId(profile.id);
    setUsers((current) =>
      current.map((item) => (item.id === profile.id ? { ...item, ...patch } : item))
    );

    try {
      const supabase = createClient();
      await updateProfileModeration(supabase, profile.id, patch);
      setError(null);
    } catch (patchError) {
      setError(toErrorMessage(patchError, "No pudimos actualizar el estado del usuario."));
      await load();
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-700">
        <div>
          <h1 className="text-xl font-black text-white">Gestión de Usuarios y Comercios</h1>
          <p className="text-xs text-gray-400">
            {loading ? "Cargando..." : `${users.length} perfil(es) registrado(s)`}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="text-xs font-bold text-gray-400 hover:text-white flex items-center gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </button>
      </div>

      {error && <Alert variant="error" onRetry={load}>{error}</Alert>}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-900 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="p-10 rounded-2xl bg-gray-900 border border-gray-700 text-center space-y-2">
          <Users className="w-10 h-10 text-gray-600 mx-auto" />
          <p className="text-sm font-bold text-white">Todavía no hay usuarios registrados</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-700 rounded-2xl bg-gray-900 border border-gray-700 overflow-hidden">
          {users.map((profile) => (
            <div
              key={profile.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Avatar
                  src={profile.avatar_url}
                  name={profile.full_name || profile.username}
                  size="md"
                />
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        profile.user_type === "business"
                          ? "bg-purple-900/80 text-purple-200"
                          : "bg-blue-900/80 text-blue-200"
                      }`}
                    >
                      {profile.user_type === "business" ? "COMERCIO" : "VECINO"}
                    </span>
                    {profile.is_verified && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-900/80 text-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> VERIFICADO
                      </span>
                    )}
                    {profile.is_blocked && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-900/80 text-red-200">
                        BLOQUEADO
                      </span>
                    )}
                    {profile.is_admin && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-900/80 text-amber-200">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-white text-sm truncate">
                    {profile.full_name || profile.username}
                  </h3>
                  <div className="text-xs text-gray-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>@{profile.username}</span>
                    {profile.phone && <span>• {profile.phone}</span>}
                    <span className="flex items-center gap-0.5">
                      <MapPin className="w-3 h-3 text-[#F5B800]" />
                      {profile.neighborhood || "Capiatá"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant={profile.is_verified ? "outline" : "accent"}
                  size="sm"
                  isLoading={pendingId === profile.id}
                  onClick={() => patchUser(profile, { is_verified: !profile.is_verified })}
                  className={profile.is_verified ? "text-gray-300 border-gray-600 hover:bg-gray-800" : ""}
                  leftIcon={<ShieldCheck className="w-4 h-4" />}
                >
                  {profile.is_verified ? "Quitar Verificación" : "Verificar"}
                </Button>

                <Button
                  variant={profile.is_blocked ? "primary" : "danger"}
                  size="sm"
                  isLoading={pendingId === profile.id}
                  onClick={() => patchUser(profile, { is_blocked: !profile.is_blocked })}
                  leftIcon={<Ban className="w-4 h-4" />}
                >
                  {profile.is_blocked ? "Desbloquear" : "Bloquear"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
