import React from "react";
import Link from "next/link";
import {
  Bike,
  Building,
  Briefcase,
  Car,
  Dog,
  Dumbbell,
  GraduationCap,
  Heart,
  Home,
  PartyPopper,
  ShoppingBag,
  Smartphone,
  Tag,
  Utensils,
  Wrench,
  LucideIcon,
} from "lucide-react";
import { Category } from "@/lib/types";

/** Iconos reales usados por las categorías; evita importar todo lucide-react. */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Wrench,
  Home,
  Utensils,
  ShoppingBag,
  Smartphone,
  Car,
  Heart,
  GraduationCap,
  Building,
  Briefcase,
  Dog,
  PartyPopper,
  Dumbbell,
  Tag,
};

interface CategoryCardProps {
  category: Category | {
    name: string;
    slug: string;
    icon: string;
    color?: string;
    description?: string;
    listing_count?: number;
  };
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ category }) => {
  const IconComponent = CATEGORY_ICONS[category.icon] ?? Tag;

  return (
    <Link
      href={`/categoria/${category.slug}`}
      className="group p-4 rounded-2xl bg-white border border-gray-100 hover:border-gray-200 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col items-start justify-between gap-3 relative overflow-hidden"
    >
      <div className="flex items-center justify-between w-full">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold transition-transform group-hover:scale-110 shadow-sm"
          style={{ backgroundColor: category.color || "#1E3A5F" }}
        >
          <IconComponent className="w-6 h-6" />
        </div>
        {"listing_count" in category && category.listing_count !== undefined && (
          <span className="text-[11px] font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-full border border-gray-100">
            {category.listing_count} anuncios
          </span>
        )}
      </div>

      <div>
        <h3 className="font-bold text-gray-900 text-sm group-hover:text-[#1E3A5F] transition-colors line-clamp-1">
          {category.name}
        </h3>
        {category.description && (
          <p className="text-[11px] text-gray-500 line-clamp-2 mt-1 leading-relaxed">
            {category.description}
          </p>
        )}
      </div>
    </Link>
  );
};
