import type { InfluencerDetail } from "../types";
import { formatDateYmd } from "../logic/formatters";

type InfluencerDetailsPanelProps = {
  influencer: InfluencerDetail;
  keywordList: string[];
};

export function InfluencerDetailsPanel({ influencer, keywordList }: InfluencerDetailsPanelProps) {
  return (
    <section className="deco-stat">
      <div className="deco-label">詳細</div>
      <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
        <div>性別: {influencer.gender ?? "未設定"}</div>
        <div>キーワード: {keywordList.length ? keywordList.join(", ") : "なし"}</div>
        <div>
          プロフィールURL:{" "}
          {influencer.account_url ? (
            <a
              href={influencer.account_url}
              target="_blank"
              rel="noreferrer"
              className="deco-link"
            >
              {influencer.account_url}
            </a>
          ) : (
            "未設定"
          )}
        </div>
        <div>最終更新: {formatDateYmd(influencer.last_profile_scraped_at)}</div>
      </div>
    </section>
  );
}
