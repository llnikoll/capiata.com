import React from "react";
import { cn } from "@/lib/utils";
import { ListingType } from "@/lib/types";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "offer" | "request" | "primary" | "secondary";
  type?: ListingType;
  size?: "sm" | "md";
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, type, size = "md", children, ...props }, ref) => {
    let resolvedVariant = variant || "secondary";

    if (type === "OFFER") resolvedVariant = "offer";
    if (type === "REQUEST") resolvedVariant = "request";

    const variantStyles = {
      offer: "bg-[#F5B800] text-gray-950 font-bold border border-[#D4A000]/30",
      request: "bg-[#1E3A5F] text-white font-bold",
      primary: "bg-blue-100 text-[#1E3A5F] font-semibold",
      secondary: "bg-gray-100 text-gray-700 font-medium",
    };

    const sizeStyles = {
      sm: "text-[10px] px-2 py-0.5 rounded-md uppercase tracking-wider",
      md: "text-xs px-2.5 py-1 rounded-lg uppercase tracking-wide",
    };

    const content =
      children ||
      (type === "OFFER" ? "OFREZCO" : type === "REQUEST" ? "BUSCO" : null);

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center select-none shadow-2xs",
          variantStyles[resolvedVariant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {content}
      </span>
    );
  }
);
Badge.displayName = "Badge";
