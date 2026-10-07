import React from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import { Category } from "@/lib/types";

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
  // Dynamically resolve icon component
  const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[category.icon] || Icons.Tag;

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
          <span className="text-[11px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-full border border-gray-100">
            {category.listing_count} anuncios
          </span>
        )}
      </div>

      <div>
        <h4 className="font-bold text-gray-900 text-sm group-hover:text-[#1E3A5F] transition-colors line-clamp-1">
          {category.name}
        </h4>
        {category.description && (
          <p className="text-[11px] text-gray-500 line-clamp-2 mt-1 leading-relaxed">
            {category.description}
          </p>
        )}
      </div>
    </Link>
  );
};
