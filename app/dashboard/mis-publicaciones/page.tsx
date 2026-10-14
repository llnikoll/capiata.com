import React from "react";
import type { Metadata } from "next";
import { MyListingsManager } from "@/components/dashboard/MyListingsManager";

export const metadata: Metadata = {
  title: "Mis Publicaciones (OFREZCO)",
};

export default function MisPublicacionesPage() {
  return <MyListingsManager type="OFFER" />;
}
