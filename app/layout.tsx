import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Capiatá Conecta — Red Local de Ofertas y Pedidos",
    template: "%s | Capiatá Conecta",
  },
  description:
    "Plataforma comunitaria de Capiatá para conectar vecinos, emprendedores y comercios. Publicá lo que ofrecés o buscá lo que necesitás. Sin compras, sin pagos.",
  keywords: ["Capiatá", "clasificados", "emprendedores", "servicios", "Paraguay", "Posta Ybycuá", "Posta Ybyraró"],
  openGraph: {
    type: "website",
    locale: "es_PY",
    url: "https://capiata.com",
    siteName: "Capiatá Conecta",
    title: "Capiatá Conecta — Encontrá lo que necesitás en Capiatá",
    description:
      "Conectamos personas, emprendedores y comercios de Capiatá. Publicá ofertas o pedidos. Sin ventas, sin pagos.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Capiatá Conecta",
    description: "La plataforma de Capiatá para conectar personas y emprendedores.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-50/50 text-gray-900 font-sans selection:bg-[#F5B800] selection:text-gray-950">
        <Navbar />
        <main className="flex-1 w-full">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
