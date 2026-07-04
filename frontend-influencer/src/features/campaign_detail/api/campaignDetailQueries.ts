import { supabase } from "@/lib/supabase";

const readableSupabaseError = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const maybeError = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };
    return [
      typeof maybeError.message === "string" ? maybeError.message : null,
      typeof maybeError.details === "string" ? maybeError.details : null,
      typeof maybeError.hint === "string" ? maybeError.hint : null,
      typeof maybeError.code === "string" ? `code: ${maybeError.code}` : null,
    ]
      .filter(Boolean)
      .join(" ");
  }
  return "不明なエラーが発生しました。";
};

export const updateCampaignInternalMemo = async ({
  campaignId,
  userId,
  internalMemo,
}: {
  campaignId: number | string;
  userId: string;
  internalMemo: string;
}) => {
  const { error } = await supabase
    .from("campaigns")
    .update({ internal_memo: internalMemo })
    .eq("id", campaignId)
    .eq("user_id", userId);

  if (error) throw new Error(readableSupabaseError(error));
};
