import React from "react";
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AlertProps {
  variant?: "error" | "success" | "info" | "warning";
  children: React.ReactNode;
  className?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

const variantStyles = {
  error: "bg-red-50 text-red-700 border-red-200",
  success: "bg-emerald-50 text-emerald-800 border-emerald-200",
  info: "bg-blue-50 text-[#1E3A5F] border-blue-200",
  warning: "bg-amber-50 text-amber-900 border-amber-200",
};

const icons = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
};

/** Mensaje inline reutilizable para errores de red, validaciones y confirmaciones. */
export const Alert: React.FC<AlertProps> = ({
  variant = "info",
  children,
  className,
  onRetry,
  retryLabel = "Reintentar",
}) => {
  const Icon = icons[variant];

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-xl border p-3 text-xs",
        variantStyles[variant],
        className
      )}
    >
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <div className="flex-1 space-y-1.5">
        <div>{children}</div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="font-bold underline underline-offset-2 hover:no-underline"
          >
            {retryLabel}
          </button>
        )}
      </div>
    </div>
  );
};
