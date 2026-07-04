export type SupabaseErrorLike = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

export const readableSupabaseError = (error: SupabaseErrorLike | null | undefined) => {
  if (!error) return "Supabase request failed.";

  const message = [
    error.message,
    error.details,
    error.hint,
    error.code ? `code: ${error.code}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return message || "Supabase request failed.";
};

const errorText = (error: SupabaseErrorLike) =>
  [error.message, error.details, error.hint].filter(Boolean).join(" ").toLowerCase();

export const errorMentionsIdentifier = (
  error: SupabaseErrorLike,
  identifiers: string[]
) => {
  const text = errorText(error);
  return identifiers.some((identifier) => text.includes(identifier.toLowerCase()));
};

export const isMissingSchemaObjectError = (
  error: SupabaseErrorLike,
  identifiers: string[]
) => {
  if (
    (error.code === "PGRST205" || error.code === "42P01") &&
    errorMentionsIdentifier(error, identifiers)
  ) {
    return true;
  }

  if (
    (error.code === "PGRST204" || error.code === "42703") &&
    errorMentionsIdentifier(error, identifiers)
  ) {
    return true;
  }

  return false;
};
