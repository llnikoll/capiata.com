import React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, rows = 4, ...props }, ref) => (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold text-gray-700">{label}</label>
      )}
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          "w-full rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent transition-all disabled:opacity-50",
          error && "border-red-500 focus:ring-red-500",
          className
        )}
        {...props}
      />
      {error ? (
        <p className="text-xs text-red-500">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-gray-400">{helperText}</p>
      ) : null}
    </div>
  )
);
Textarea.displayName = "Textarea";
