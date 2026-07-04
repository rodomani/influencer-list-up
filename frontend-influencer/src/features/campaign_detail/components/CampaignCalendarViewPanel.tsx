import { type FormEvent, useState } from "react";
import type {
  CampaignCalendarEvent,
  CampaignCalendarEventType,
  CampaignCalendarMonth,
  CampaignCustomCalendarEvent,
} from "../types";
import {
  campaignCustomCalendarEventTypeLabel,
  campaignCalendarEventClassName,
  campaignCalendarEventLabel,
  formatCalendarEventDate,
} from "../logic/campaignCalendar";

type CustomCalendarEventPayload = {
  title: string;
  eventDate: string;
  eventType: CampaignCalendarEventType;
  description: string;
};

type CampaignCalendarViewPanelProps = {
  months: CampaignCalendarMonth[];
  events: CampaignCalendarEvent[];
  customEvents: CampaignCustomCalendarEvent[];
  loading: boolean;
  customEventsLoading: boolean;
  customEventsError: string | null;
  persistenceReady: boolean;
  creatingCalendarEvent: boolean;
  deletingCalendarEventId: number | null;
  onCreateCustomEvent: (payload: CustomCalendarEventPayload) => Promise<boolean>;
  onDeleteCustomEvent: (eventId: number) => Promise<void>;
};

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
const CUSTOM_EVENT_TYPE_OPTIONS = [
  { value: "review", label: "内容確認" },
  { value: "deliverable", label: "納品・支払い" },
  { value: "influencer", label: "候補者対応" },
  { value: "campaign", label: "投稿予定" },
  { value: "task", label: "レポート" },
  { value: "custom", label: "その他" },
] as const satisfies Array<{ value: CampaignCalendarEventType; label: string }>;

export function CampaignCalendarViewPanel({
  months,
  events,
  customEvents,
  loading,
  customEventsLoading,
  customEventsError,
  persistenceReady,
  creatingCalendarEvent,
  deletingCalendarEventId,
  onCreateCustomEvent,
  onDeleteCustomEvent,
}: CampaignCalendarViewPanelProps) {
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventType, setEventType] = useState<CampaignCalendarEventType>("review");
  const [description, setDescription] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const created = await onCreateCustomEvent({
      title,
      eventDate,
      eventType,
      description,
    });
    if (!created) return;

    setTitle("");
    setEventDate("");
    setEventType("review");
    setDescription("");
  };

  if (loading) {
    return (
      <section className="deco-panel w-full max-w-none min-w-0">
        <p className="deco-label">カレンダー</p>
        <p className="mt-3 text-sm text-muted-foreground">カレンダー情報を読み込み中...</p>
      </section>
    );
  }

  return (
    <section className="deco-panel w-full max-w-none min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="deco-label">カレンダー</p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.12em] text-slate-950">
            キャンペーン予定
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            開始日・終了日・中間確認・候補者追加・納品期限・完了タスク・追加予定を日付ごとに確認できます。
          </p>
        </div>
        <div className="border border-slate-200 bg-[#f9fafb] px-4 py-3 text-right">
          <p className="deco-label">予定数</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{events.length}</p>
        </div>
      </div>

      <div className="mt-5 grid w-full min-w-0 gap-5 xl:grid-cols-2">
        <form
          onSubmit={handleSubmit}
          className="min-w-0 border border-slate-200 bg-white p-5 shadow-[0_18px_60px_-52px_rgba(15,23,42,0.28)]"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="deco-label">予定を追加</p>
              <h3 className="mt-2 text-xl font-black uppercase tracking-[0.1em] text-slate-950">
                カスタム予定
              </h3>
            </div>
            {!persistenceReady && (
              <span className="border border-[#D4AF37]/40 bg-[#fffdf7] px-3 py-2 text-xs font-bold text-slate-700">
                保存準備が必要
              </span>
            )}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-bold text-slate-700">
              予定名
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-11 border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                placeholder="例: 投稿内容の最終確認"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-bold text-slate-700">
              日付
              <input
                type="date"
                value={eventDate}
                onChange={(event) => setEventDate(event.target.value)}
                className="h-11 border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-bold text-slate-700">
              種類
              <select
                value={eventType}
                onChange={(event) =>
                  setEventType(event.target.value as CampaignCalendarEventType)
                }
                className="h-11 border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
              >
                {CUSTOM_EVENT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-bold text-slate-700 md:col-span-2">
              メモ
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="min-h-24 resize-y border border-slate-300 bg-white px-3 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                placeholder="社内で共有したい補足や次のアクションを入力できます。"
              />
            </label>
          </div>

          {customEventsError && (
            <p className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              エラー: {customEventsError}
            </p>
          )}

          <button
            type="submit"
            disabled={creatingCalendarEvent || !title.trim() || !eventDate}
            className="mt-5 inline-flex h-11 items-center justify-center bg-[#046307] px-5 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-[#035306] disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {creatingCalendarEvent ? "追加中..." : "予定を追加"}
          </button>
        </form>

        <div className="min-w-0 border border-slate-200 bg-[#f9fafb] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="deco-label">追加済み予定</p>
              <h3 className="mt-2 text-xl font-black uppercase tracking-[0.1em] text-slate-950">
                手動予定
              </h3>
            </div>
            <p className="text-2xl font-black text-slate-950">{customEvents.length}</p>
          </div>

          {customEventsLoading && (
            <p className="mt-4 text-sm text-muted-foreground">追加予定を読み込み中...</p>
          )}

          {!customEventsLoading && customEvents.length === 0 && (
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              手動で追加した予定はまだありません。
            </p>
          )}

          <div className="mt-4 flex flex-col gap-3">
            {customEvents.map((event) => (
              <article key={event.id} className="border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#D4AF37]">
                      {campaignCustomCalendarEventTypeLabel(event.event_type)}
                    </p>
                    <h4 className="mt-1 text-sm font-black text-slate-950">{event.title}</h4>
                  </div>
                  <p className="text-xs font-black text-slate-700">
                    {formatCalendarEventDate(event.event_date)}
                  </p>
                </div>
                {event.description && (
                  <p className="mt-2 text-sm leading-6 text-slate-600">{event.description}</p>
                )}
                <button
                  type="button"
                  disabled={deletingCalendarEventId === event.id}
                  onClick={() => onDeleteCustomEvent(event.id)}
                  className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500 transition hover:text-red-600 disabled:cursor-not-allowed disabled:text-slate-300"
                >
                  {deletingCalendarEventId === event.id ? "削除中..." : "削除"}
                </button>
              </article>
            ))}
          </div>
        </div>
      </div>

      {events.length === 0 && (
        <div className="deco-stat mt-5">
          <p className="deco-label">予定なし</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            キャンペーン期間や納品期限を設定すると、ここに予定が表示されます。
          </p>
        </div>
      )}

      {months.length > 0 && (
        <div className="mt-5 grid gap-5 2xl:grid-cols-2">
          {months.map((month) => (
            <article key={month.key} className="border border-slate-200 bg-white p-4">
              <h3 className="text-lg font-black uppercase tracking-[0.1em] text-slate-950">
                {month.label}
              </h3>
              <div className="mt-4 grid grid-cols-7 gap-px bg-slate-200 text-center">
                {WEEKDAY_LABELS.map((label) => (
                  <div
                    key={label}
                    className="bg-slate-50 px-2 py-2 text-xs font-black text-slate-500"
                  >
                    {label}
                  </div>
                ))}
                {month.days.map((day) => (
                  <div
                    key={day.key}
                    className={`min-h-28 bg-white p-2 text-left ${
                      day.inMonth ? "text-slate-950" : "text-slate-300"
                    }`}
                  >
                    <div className="text-xs font-black">{day.dayNumber}</div>
                    <div className="mt-2 flex flex-col gap-1">
                      {day.events.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className={`truncate border px-1.5 py-1 text-[10px] font-black ${campaignCalendarEventClassName(event.type)}`}
                          title={`${event.label}: ${event.description}`}
                        >
                          {event.label}
                        </div>
                      ))}
                      {day.events.length > 3 && (
                        <div className="text-[10px] font-bold text-muted-foreground">
                          +{day.events.length - 3}件
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}

      {events.length > 0 && (
        <div className="mt-5 border border-slate-200 bg-[#f9fafb] p-4">
          <p className="deco-label">予定一覧</p>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {events.map((event) => (
              <article
                key={event.id}
                className={`border p-3 ${campaignCalendarEventClassName(event.type)}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em]">
                      {campaignCalendarEventLabel(event.type)}
                    </p>
                    <h3 className="mt-1 text-sm font-black text-slate-950">{event.label}</h3>
                  </div>
                  <p className="text-xs font-black">{formatCalendarEventDate(event.date)}</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{event.description}</p>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
