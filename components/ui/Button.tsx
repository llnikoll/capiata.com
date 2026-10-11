import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      children,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      type = "button",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]";

    const variants = {
      primary:
        "bg-gradient-to-r from-[#1E3A5F] to-[#152B47] text-white hover:from-[#152B47] hover:to-[#0F1E33] focus:ring-[#1E3A5F] shadow-lg hover:shadow-xl shadow-[#1E3A5F]/30 border border-[#1E3A5F]/20",
      secondary:
        "bg-gray-100 text-gray-800 hover:bg-gray-200 focus:ring-gray-300 border border-gray-200",
      accent:
        "bg-gradient-to-r from-[#F5B800] to-[#D4A000] text-gray-950 hover:from-[#D4A000] hover:to-[#B89200] focus:ring-[#F5B800] shadow-lg hover:shadow-xl shadow-[#F5B800]/30 font-bold border border-[#F5B800]/20",
      outline:
        "border-2 border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F]/5 focus:ring-[#1E3A5F]",
      ghost:
        "text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-300",
      danger:
        "bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 focus:ring-red-500 shadow-lg",
    };

    const sizes = {
      sm: "text-xs px-3 py-1.5 gap-1.5 min-h-[32px]",
      md: "text-sm px-4 py-2.5 gap-2 min-h-[42px]",
      lg: "text-base px-6 py-3.5 gap-2.5 min-h-[50px]",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" />
        ) : (
          leftIcon
        )}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";
