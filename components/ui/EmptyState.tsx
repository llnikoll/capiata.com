import React from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/** Estado vacío consistente para listados sin registros. */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => (
  <div
    className={cn(
      "bg-white p-12 rounded-2xl border border-gray-100 text-center space-y-4",
      className
    )}
  >
    {icon && <div className="flex justify-center text-gray-300">{icon}</div>}
    <h3 className="font-bold text-gray-800 text-lg">{title}</h3>
    {description && (
      <p className="text-xs text-gray-500 max-w-md mx-auto">{description}</p>
    )}
    {action && <div className="flex justify-center">{action}</div>}
  </div>
);

/** Esqueleto de carga para grillas de publicaciones. */
export const ListingGridSkeleton: React.FC<{ count?: number; className?: string }> = ({
  count = 3,
  className,
}) => (
  <div
    className={cn(
      "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6",
      className
    )}
    aria-hidden="true"
  >
    {Array.from({ length: count }).map((_, index) => (
      <div
        key={index}
        className="h-64 bg-gray-200 rounded-2xl animate-pulse"
      />
    ))}
  </div>
);
