import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { BookmarkContactInfo } from "../types";

type BookmarkContactVaultProps = {
  value: BookmarkContactInfo;
  updating: boolean;
  error: string | null;
  persistenceReady: boolean;
  onSave: (contactInfo: BookmarkContactInfo) => Promise<boolean>;
};

const CONTACT_FIELDS: Array<{
  key: keyof BookmarkContactInfo;
  label: string;
  type?: "text" | "email" | "url" | "date" | "textarea";
  placeholder?: string;
}> = [
  { key: "email", label: "Email", type: "email", placeholder: "example@example.com" },
  { key: "agency", label: "Agency", type: "text", placeholder: "ABC Agency" },
  { key: "dmUrl", label: "DM URL", type: "url", placeholder: "https://instagram.com/..." },
  { key: "preferredMethod", label: "Preferred Method", type: "text", placeholder: "email" },
  { key: "lastContactedAt", label: "Last Contacted", type: "date" },
  { key: "responseSpeed", label: "Response Speed", type: "text", placeholder: "2-3 days" },
  { key: "contactPerson", label: "Contact Person", type: "text", placeholder: "Manager name" },
  { key: "phone", label: "Phone", type: "text", placeholder: "+82 ..." },
  { key: "nextFollowUpAt", label: "Next Follow-up", type: "date" },
  { key: "notes", label: "Notes", type: "textarea", placeholder: "CRM note" },
];

export function BookmarkContactVault({
  value,
  updating,
  error,
  persistenceReady,
  onSave,
}: BookmarkContactVaultProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const isDirty = useMemo(
    () => CONTACT_FIELDS.some(({ key }) => draft[key] !== value[key]),
    [draft, value]
  );

  return (
    <div
      className="border-t border-slate-200 bg-[#f9fafb] px-5 py-4 sm:px-7"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="deco-label">連絡先ボールト</p>
          <p className="mt-1 text-xs text-muted-foreground">
            ブックマークを軽量CRMとして管理できます。
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={updating || !isDirty || !persistenceReady}
          onClick={async () => {
            await onSave(draft);
          }}
        >
          {updating ? "保存中..." : "連絡先を保存"}
        </Button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {CONTACT_FIELDS.filter((field) => field.type !== "textarea").map((field) => (
          <label key={field.key} className="grid gap-2 text-sm font-bold text-slate-800">
            <span>{field.label}</span>
            <input
              type={field.type ?? "text"}
              value={draft[field.key]}
              disabled={updating || !persistenceReady}
              placeholder={field.placeholder}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  [field.key]: event.target.value,
                }))
              }
              className="h-10 w-full border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
          </label>
        ))}
      </div>

      <label className="mt-3 grid gap-2 text-sm font-bold text-slate-800">
        <span>Notes</span>
        <textarea
          value={draft.notes}
          disabled={updating || !persistenceReady}
          placeholder="Internal CRM note"
          onChange={(event) =>
            setDraft((prev) => ({
              ...prev,
              notes: event.target.value,
            }))
          }
          className="min-h-24 w-full resize-y border border-slate-300 bg-white px-3 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 disabled:cursor-not-allowed disabled:bg-slate-50"
        />
      </label>

      {!persistenceReady && (
        <p className="mt-3 text-sm text-slate-700">
          連絡先ボールトを使うには、user_bookmarks の contact_info カラムをSupabaseへ反映してください。
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-700">エラー: {error}</p>}
    </div>
  );
}
