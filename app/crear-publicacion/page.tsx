"use client";

import React, { useState } from "react";
import { Megaphone, HelpCircle, Upload, CheckCircle2, ArrowRight, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DEFAULT_CATEGORIES, CAPIATA_NEIGHBORHOODS, ListingType } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

export default function CrearPublicacionPage() {
  const [type, setType] = useState<ListingType>("OFFER");
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState(DEFAULT_CATEGORIES[0].slug);
  const [neighborhood, setNeighborhood] = useState<string>(CAPIATA_NEIGHBORHOODS[0]);
  const [price, setPrice] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      const isValidType = file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp";
      const isValidSize = file.size <= 1024 * 1024; // 1MB max
      return isValidType && isValidSize;
    });

    if (validFiles.length > 0) {
      setImages([...images, ...validFiles]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        alert("Debes iniciar sesión para publicar");
        window.location.href = "/login";
        return;
      }

      // Upload images to Supabase Storage
      const uploadedImages = [];
      for (const file of images) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { data, error } = await supabase.storage
          .from('listings-images')
          .upload(filePath, file);

        if (error) {
          console.error("Error uploading image:", error);
          continue;
        }

        if (data) {
          uploadedImages.push({
            url: data.path,
            position: uploadedImages.length,
          });
        }
      }

      // Create listing
      const { data: category } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", categoryId)
        .single();

      if (!category) {
        alert("Error: Categoría no encontrada");
        setUploading(false);
        return;
      }

      const slug = `${title.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')}-${Date.now()}`;

      const { data: listing, error: listingError } = await supabase
        .from("listings")
        .insert({
          user_id: user.id,
          type,
          category_id: category.id,
          title,
          slug,
          description,
          price: price ? parseFloat(price) : null,
          currency: "GS",
          location: "Capiatá",
          neighborhood,
          contact_whatsapp: whatsapp,
          contact_method: ["whatsapp"],
          status: "active",
        })
        .select()
        .single();

      if (listingError) {
        alert("Error al crear la publicación: " + listingError.message);
        setUploading(false);
        return;
      }

      // Upload images to listing_images table
      for (const img of uploadedImages) {
        await supabase.from("listing_images").insert({
          listing_id: listing.id,
          image_url: img.url,
          position: img.position,
        });
      }

      setIsSubmitted(true);
    } catch (error) {
      console.error("Error:", error);
      alert("Error al crear la publicación. Intentalo de nuevo.");
    } finally {
      setUploading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="py-16 bg-gray-50/50 min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-gray-100 shadow-xl text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-gray-900">
            ¡Tu publicación fue creada con éxito!
          </h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            Ya está disponible públicamente en Capiatá Conecta. Los vecinos interesados podrán contactarte directamente por WhatsApp.
          </p>
          <div className="pt-3 flex flex-col gap-2">
            <a href="/explorar">
              <Button variant="primary" className="w-full">
                Ver en Explorar
              </Button>
            </a>
            <button
              onClick={() => setIsSubmitted(false)}
              className="text-xs text-[#1E3A5F] font-bold hover:underline py-2"
            >
              Publicar otro anuncio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-10 bg-gray-50/50 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-gray-900">
            Crear Nueva Publicación
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Publicá gratis en Capiatá Conecta. Sin comisiones ni intermediarios.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          {/* STEP 1: Tipo de Publicación */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              1. ¿Qué querés hacer?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType("OFFER")}
                className={`p-4 rounded-2xl border-2 text-left flex flex-col gap-2 transition-all ${
                  type === "OFFER"
                    ? "border-[#F5B800] bg-amber-50/50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2 text-[#D4A000] font-black text-sm">
                  <Megaphone className="w-5 h-5" /> OFREZCO
                </div>
                <p className="text-[11px] text-gray-500 leading-tight">
                  Tengo un producto, servicio o trabajo para ofrecer a la comunidad.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setType("REQUEST")}
                className={`p-4 rounded-2xl border-2 text-left flex flex-col gap-2 transition-all ${
                  type === "REQUEST"
                    ? "border-[#1E3A5F] bg-blue-50/50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2 text-[#1E3A5F] font-black text-sm">
                  <HelpCircle className="w-5 h-5" /> BUSCO (Pedido)
                </div>
                <p className="text-[11px] text-gray-500 leading-tight">
                  Necesito contratar un servicio o estoy buscando algo específico.
                </p>
              </button>
            </div>
          </div>

          {/* STEP 2: Título y Categoría */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Título de la publicación"
              placeholder={type === "OFFER" ? "Ej: Servicio técnico de plomería" : "Ej: Busco pintor para casa"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <Select
              label="Categoría"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              options={DEFAULT_CATEGORIES.map((cat) => ({
                value: cat.slug,
                label: cat.name,
              }))}
            />
          </div>

          {/* STEP 3: Barrio y Precio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              label="Precio o Presupuesto estimado (Guaraníes)"
              placeholder="Ej: 150000 (dejar en blanco si es a convenir)"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          {/* STEP 4: WhatsApp de Contacto */}
          <Input
            label="Número de WhatsApp para contacto directo"
            placeholder="Ej: 0981123456"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            required
            helperText="Los interesados te enviarán un mensaje directo a este número."
          />

          {/* STEP 5: Descripción */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">
              Descripción detallada
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explicá en detalle lo que ofrecés o buscás..."
              className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              required
            />
          </div>

          {/* STEP 6: Fotos */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">
              Fotos (opcional)
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleImageUpload}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-gray-300 transition-colors cursor-pointer bg-gray-50/50"
            >
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-xs text-gray-600 font-semibold">
                Hacé clic o arrastrá fotos aquí
              </p>
              <p className="text-[10px] text-gray-400 mt-1">PNG, JPG, WebP hasta 1MB</p>
            </label>

            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                {images.map((file, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded-xl border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SUBMIT BUTTON */}
          <Button
            type="submit"
            variant="accent"
            size="lg"
            isLoading={uploading}
            disabled={uploading}
            className="w-full font-extrabold shadow-md"
            rightIcon={!uploading ? <ArrowRight className="w-5 h-5" /> : undefined}
          >
            {uploading ? "Publicando..." : "Publicar Gratis en Capiatá"}
          </Button>
        </form>
      </div>
    </div>
  );
}
