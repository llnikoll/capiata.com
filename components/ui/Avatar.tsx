import React from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";

export interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = "md",
  className,
}) => {
  const sizeMap = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-base",
    xl: "w-20 h-20 text-xl",
  };

  const pxSizeMap = {
    sm: 32,
    md: 40,
    lg: 56,
    xl: 80,
  };

  const getInitials = (str?: string | null) => {
    if (!str) return "U";
    return str
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (src) {
    return (
      <div
        className={cn(
          "relative rounded-full overflow-hidden bg-gray-100 border border-gray-200 shrink-0",
          sizeMap[size],
          className
        )}
      >
        <Image
          src={src}
          alt={name || "Avatar"}
          width={pxSizeMap[size]}
          height={pxSizeMap[size]}
          className="object-cover w-full h-full"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-full bg-[#1E3A5F] text-white font-bold flex items-center justify-center shrink-0 shadow-inner",
        sizeMap[size],
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
};
