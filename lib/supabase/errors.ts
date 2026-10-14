/**
 * Error de datos de la aplicación. Se lanza cuando una consulta o mutación
 * contra Supabase falla, para que la interfaz pueda mostrar un estado de error
 * en lugar de un estado vacío silencioso.
 */
export class SupabaseQueryError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "SupabaseQueryError";
    this.cause = cause;
  }
}

/** Mensaje seguro para mostrar al usuario ante un error desconocido. */
export function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof SupabaseQueryError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
