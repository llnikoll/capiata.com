import { z } from "zod";

/**
 * Esquemas de validación compartidos entre formularios del cliente y las
 * mutaciones que se envían a Supabase. Evitan publicar o guardar datos vacíos.
 */

const PHONE_CHARS = /^[0-9+\s().-]+$/;

const phoneSchema = z
  .string()
  .trim()
  .min(9, "Ingresá un teléfono válido (ej: 0981 123 456)")
  .max(20, "El teléfono es demasiado largo")
  .regex(PHONE_CHARS, "El teléfono sólo puede contener números y los signos + - ( )");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const registrationFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "Ingresá tu nombre completo o el de tu comercio")
    .max(80, "El nombre no puede superar los 80 caracteres"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .regex(EMAIL_REGEX, "Ingresá un correo electrónico válido"),
  phone: phoneSchema,
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(72),
});

export type RegistrationFormValues = z.infer<typeof registrationFormSchema>;

const optionalPhoneSchema = z
  .string()
  .trim()
  .max(20, "El teléfono es demasiado largo")
  .refine((value) => value === "" || (value.length >= 9 && PHONE_CHARS.test(value)), {
    message: "Ingresá un teléfono válido o dejalo vacío",
  });

export const listingFormSchema = z.object({
  type: z.enum(["OFFER", "REQUEST"]),
  title: z
    .string()
    .trim()
    .min(8, "El título debe tener al menos 8 caracteres")
    .max(120, "El título no puede superar los 120 caracteres"),
  categorySlug: z.string().trim().min(1, "Elegí una categoría"),
  neighborhood: z.string().trim().min(1, "Elegí tu barrio en Capiatá"),
  price: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || (!Number.isNaN(Number(value)) && Number(value) >= 0),
      "El precio debe ser un número positivo (o quedar vacío si es a convenir)"
    ),
  contactWhatsapp: phoneSchema,
  description: z
    .string()
    .trim()
    .min(20, "La descripción debe tener al menos 20 caracteres")
    .max(2000, "La descripción no puede superar los 2000 caracteres"),
});

export type ListingFormValues = z.infer<typeof listingFormSchema>;

export const profileFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "Ingresá tu nombre y apellido")
    .max(80, "El nombre no puede superar los 80 caracteres"),
  phone: phoneSchema,
  neighborhood: z.string().trim().min(1, "Elegí tu barrio en Capiatá"),
  bio: z
    .string()
    .trim()
    .max(400, "La presentación no puede superar los 400 caracteres"),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

export const businessFormSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(3, "Ingresá el nombre de tu comercio")
    .max(80, "El nombre del comercio no puede superar los 80 caracteres"),
  description: z
    .string()
    .trim()
    .max(600, "La descripción no puede superar los 600 caracteres"),
  category: z.string().trim().max(80, "La categoría es demasiado larga"),
  phone: optionalPhoneSchema,
  whatsapp: optionalPhoneSchema,
  address: z.string().trim().max(160, "La dirección es demasiado larga"),
  schedule: z.string().trim().max(120, "El horario es demasiado largo"),
});

export type BusinessFormValues = z.infer<typeof businessFormSchema>;

export const reportFormSchema = z.object({
  reason: z.enum(["scam", "fake", "prohibited", "spam", "offensive", "wrong", "other"]),
  description: z
    .string()
    .trim()
    .max(500, "Los detalles no pueden superar los 500 caracteres"),
});

export const passwordFormSchema = z
  .object({
    newPassword: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type FieldErrors = Record<string, string>;

/**
 * Ejecuta un esquema Zod y devuelve un mapa plano de errores por campo,
 * listo para mostrarse junto a cada input.
 */
export function validateForm<T extends z.ZodType>(
  schema: T,
  values: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: FieldErrors } {
  const result = schema.safeParse(values);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "form";
    if (!errors[key]) errors[key] = issue.message;
  }

  return { success: false, errors };
}
