import type {
  Campaign,
  CampaignInfluencerAccount,
  CampaignInfluencerMetric,
  CampaignRecommendedInfluencer,
} from "../types";
import {
  latestCampaignInfluencerMetric,
  splitCampaignInfluencerKeywords,
} from "./campaignInfluencerFormatters";

const normalizeMetric = (value: number | null | undefined) =>
  typeof value === "number" && value > 0 ? value : 0;

const logScore = (value: number, maxValue: number) => {
  if (value <= 0 || maxValue <= 0) return 0;
  return Math.log10(value + 1) / Math.log10(maxValue + 1);
};

const goalTermsByType = [
  {
    terms: ["認知", "awareness", "流入", "接触", "ブランド"],
    reason: "認知拡大向けの候補です。",
  },
  {
    terms: ["購入", "conversion", "問い合わせ", "クリック", "行動"],
    reason: "成果につながる導線づくりに向いています。",
  },
  {
    terms: ["ugc", "口コミ", "投稿", "拡散", "コミュニティ"],
    reason: "UGCや口コミ創出との相性があります。",
  },
  {
    terms: ["新商品", "ローンチ", "発売", "告知", "サービス"],
    reason: "新商品告知の文脈に合わせやすい候補です。",
  },
  {
    terms: ["イベント", "来場", "予約", "登録", "期間限定"],
    reason: "イベント集客や期限付き施策に使いやすい候補です。",
  },
  {
    terms: ["長期", "アンバサダー", "継続", "信頼", "ファン"],
    reason: "継続的な発信に向いた候補です。",
  },
];

const buildGoalFit = (campaign: Campaign | undefined, account: CampaignInfluencerAccount) => {
  const goal = `${campaign?.goal ?? ""} ${campaign?.description ?? ""}`.toLowerCase();
  if (!goal.trim()) return { score: 0, reasons: [] };

  const keywords = splitCampaignInfluencerKeywords(account.keywords);
  const keywordMatches = keywords.filter((keyword) => {
    const normalizedKeyword = keyword.toLowerCase();
    return (
      normalizedKeyword.length > 1 &&
      (goal.includes(normalizedKeyword) || normalizedKeyword.includes(goal))
    );
  });

  const templateMatches = goalTermsByType.filter((template) =>
    template.terms.some((term) => goal.includes(term.toLowerCase()))
  );

  const score = Math.min(1, keywordMatches.length * 0.18 + templateMatches.length * 0.22);
  const reasons = [
    ...keywordMatches.slice(0, 2).map((keyword) => `目標とキーワード「${keyword}」が近いです。`),
    ...templateMatches.slice(0, 1).map((template) => template.reason),
  ];

  return { score, reasons };
};

const completionScore = (account: CampaignInfluencerAccount, metric: CampaignInfluencerMetric | null) => {
  const checks = [
    Boolean(account.profile_image_url),
    Boolean(account.platform),
    Boolean(account.keywords),
    Boolean(metric),
    normalizeMetric(metric?.followers) > 0,
  ];
  return checks.filter(Boolean).length / checks.length;
};

export const buildCampaignRecommendations = ({
  campaign,
  accounts,
  excludedAccountIds,
  limit = 6,
}: {
  campaign: Campaign | undefined;
  accounts: CampaignInfluencerAccount[];
  excludedAccountIds: number[];
  limit?: number;
}): CampaignRecommendedInfluencer[] => {
  const excluded = new Set(excludedAccountIds);
  const candidates = accounts.filter((account) => !excluded.has(account.id));
  const metrics = candidates.map((account) => latestCampaignInfluencerMetric(account.accounts_metrics));
  const maxFollowers = Math.max(...metrics.map((metric) => normalizeMetric(metric?.followers)), 0);
  const maxLikes = Math.max(...metrics.map((metric) => normalizeMetric(metric?.maximum_likes)), 0);
  const maxPosts = Math.max(...metrics.map((metric) => normalizeMetric(metric?.posts)), 0);

  return candidates
    .map((account) => {
      const latestMetric = latestCampaignInfluencerMetric(account.accounts_metrics);
      const followers = normalizeMetric(latestMetric?.followers);
      const maximumLikes = normalizeMetric(latestMetric?.maximum_likes);
      const posts = normalizeMetric(latestMetric?.posts);
      const goalFit = buildGoalFit(campaign, account);

      const score =
        logScore(followers, maxFollowers) * 35 +
        logScore(maximumLikes, maxLikes) * 22 +
        logScore(posts, maxPosts) * 14 +
        goalFit.score * 24 +
        completionScore(account, latestMetric) * 5;

      const reasons = [
        ...goalFit.reasons,
        followers > 0 ? "フォロワー規模が候補比較で強いです。" : "",
        maximumLikes > 0 ? "最大いいね数から反応の見込みがあります。" : "",
        posts > 0 ? "投稿実績が確認できます。" : "",
      ].filter(Boolean);

      return {
        ...account,
        latestMetric,
        recommendationScore: Math.round(Math.min(100, score)),
        recommendationReasons: reasons.slice(0, 3),
      };
    })
    .filter((account) => account.recommendationScore > 0)
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
    .slice(0, limit);
};
