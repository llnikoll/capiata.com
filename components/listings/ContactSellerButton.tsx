"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { createClient } from "@/lib/supabase/client";
import { startConversation } from "@/lib/supabase/messaging";
import { toErrorMessage } from "@/lib/supabase/errors";
import { useAuthUser } from "@/lib/hooks/useAuthUser";

interface ContactSellerButtonProps {
  listingId: string;
  listingSlug: string;
  ownerId: string;
}

/**
 * Inicia (o retoma) la conversación interna con el autor de la publicación.
 * A los visitantes sin cuenta los lleva al login y de vuelta a la publicación.
 */
export function ContactSellerButton({
  listingId,
  listingSlug,
  ownerId,
}: ContactSellerButtonProps) {
  const router = useRouter();
  const { user, loading } = useAuthUser();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // El dueño no necesita escribirse a sí mismo.
  if (!loading && user?.id === ownerId) return null;

  const handleClick = async () => {
    setError(null);

    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(`/publicacion/${listingSlug}`)}`);
      return;
    }

    setIsStarting(true);
    try {
      const supabase = createClient();
      const conversationId = await startConversation(supabase, {
        listingId,
        currentUserId: user.id,
        otherUserId: ownerId,
      });
      router.push(`/dashboard/mensajes?c=${conversationId}`);
    } catch (startError) {
      setError(toErrorMessage(startError, "No pudimos iniciar la conversación."));
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        size="lg"
        className="w-full"
        isLoading={isStarting}
        onClick={handleClick}
        leftIcon={<MessageSquare className="w-4 h-4" />}
      >
        Enviar mensaje por la plataforma
      </Button>
      {error && <Alert variant="error">{error}</Alert>}
    </div>
  );
}
