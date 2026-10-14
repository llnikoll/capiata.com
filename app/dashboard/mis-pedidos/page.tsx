import React from "react";
import type { Metadata } from "next";
import { MyListingsManager } from "@/components/dashboard/MyListingsManager";

export const metadata: Metadata = {
  title: "Mis Pedidos (BUSCO)",
};

export default function MisPedidosPage() {
  return <MyListingsManager type="REQUEST" />;
}
