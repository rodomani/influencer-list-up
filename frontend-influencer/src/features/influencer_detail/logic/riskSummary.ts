import type {
  InfluencerAverageCommentAnalysis,
  MetricsRow,
  PostActivitySummary,
  RiskItem,
  RiskSummary,
  SimilarBenchmark,
} from "../types";
import { ageInDays, clampScore } from "./formatters";
import { commentQualityScore } from "./influencerScore";

const riskLevel = (points: number): RiskItem["level"] => {
  if (points >= 24) return "高";
  if (points >= 12) return "中";
  return "低";
};

export const buildRiskSummary = ({
  metrics,
  postActivity,
  averageAnalysis,
  influencerScore,
  freshestDate,
  similarBenchmark,
}: {
  metrics: MetricsRow | null;
  postActivity: PostActivitySummary | null;
  averageAnalysis: InfluencerAverageCommentAnalysis | null;
  influencerScore: number;
  freshestDate: string | null;
  similarBenchmark: SimilarBenchmark | null;
}): RiskSummary => {
  const items: RiskItem[] = [];
  let score = 0;

  const addRisk = (label: string, points: number, description: string) => {
    score += points;
    items.push({ label, level: riskLevel(points), description });
  };

  const dataAge = ageInDays(freshestDate);
  if (dataAge == null) {
    addRisk("データ鮮度", 28, "利用できる更新日がなく、判断材料の信頼度が低い状態です。");
  } else if (dataAge > 90) {
    addRisk("データ鮮度", 26, `最新データが${dataAge}日前で、現在の状況とずれている可能性があります。`);
  } else if (dataAge > 30) {
    addRisk("データ鮮度", 14, `最新データが${dataAge}日前です。重要な判断前に再取得を推奨します。`);
  } else {
    addRisk("データ鮮度", 4, "データは比較的新しく、鮮度面の懸念は小さいです。");
  }

  const postAge = ageInDays(postActivity?.latest_posted_at);
  if (postAge == null) {
    items.push({
      label: "活動状況",
      level: "不明",
      description: "最新投稿が確認できないため、活動リスクはスコアに加算していません。必要に応じてデータを再取得してください。",
    });
  } else if (postAge > 90) {
    addRisk("活動状況", 24, `最新投稿が${postAge}日前で、休眠アカウントの可能性があります。`);
  } else if (postAge > 45) {
    addRisk("活動状況", 13, `最新投稿が${postAge}日前です。投稿頻度はやや低めです。`);
  } else {
    addRisk("活動状況", 3, "直近の投稿が確認でき、活動面のリスクは低めです。");
  }

  const followers = typeof metrics?.followers === "number" && metrics.followers > 0 ? metrics.followers : 0;
  const maximumLikes =
    typeof metrics?.maximum_likes === "number" && metrics.maximum_likes > 0 ? metrics.maximum_likes : 0;
  const engagementProxy = followers > 0 ? maximumLikes / followers : 0;
  if (followers === 0 || maximumLikes === 0) {
    addRisk("反応率", 18, "フォロワー数または最大いいね数が不足しており、反応力を評価しにくい状態です。");
  } else if (engagementProxy < 0.005) {
    addRisk("反応率", 20, "フォロワー規模に対して最大いいね数が低く、反応率に注意が必要です。");
  } else if (engagementProxy < 0.02) {
    addRisk("反応率", 10, "反応率は控えめです。候補比較時はコメント品質も確認してください。");
  } else {
    addRisk("反応率", 3, "フォロワー規模に対する反応は良好です。");
  }

  const quality = commentQualityScore(averageAnalysis);
  if (!averageAnalysis) {
    addRisk("コメント品質", 10, "コメント分析が未取得のため、品質リスクは暫定評価です。");
  } else if (quality < 45) {
    addRisk("コメント品質", 22, "スパム、毒性、感情面の指標からコメント品質に懸念があります。");
  } else if (quality < 65) {
    addRisk("コメント品質", 12, "コメント品質は平均よりやや弱めです。起用前に投稿別の反応を確認してください。");
  } else {
    addRisk("コメント品質", 4, "コメント品質は安定しており、大きな懸念は少ないです。");
  }

  const missingFields = [
    metrics?.followers,
    metrics?.posts,
    metrics?.maximum_likes,
    postActivity?.latest_posted_at,
    postActivity?.latest_activity_at,
  ].filter((value) => value == null || value === "").length;
  if (missingFields >= 3) {
    addRisk("情報不足", 18, "重要な指標が複数不足しており、比較精度が下がります。");
  } else if (missingFields > 0) {
    addRisk("情報不足", 8, "一部の重要指標が未取得です。判断時は不足項目を確認してください。");
  } else {
    addRisk("情報不足", 2, "主要な判断材料はそろっています。");
  }

  if (influencerScore < 45) {
    addRisk("総合評価", 18, "インフルエンサースコアが低く、総合的な起用優先度は慎重に見たい候補です。");
  } else if (influencerScore < 65) {
    addRisk("総合評価", 9, "インフルエンサースコアは中位です。目的との相性を重視して判断してください。");
  } else {
    addRisk("総合評価", 3, "インフルエンサースコアは良好で、総合評価面のリスクは低めです。");
  }

  if (similarBenchmark && similarBenchmark.overallTopPercent > 70) {
    addRisk("類似比較", 14, "類似アカウント内での順位が低めです。代替候補との比較を推奨します。");
  } else if (similarBenchmark && similarBenchmark.overallTopPercent > 40) {
    addRisk("類似比較", 7, "類似アカウント内では中位です。強みが campaign 目的に合うか確認してください。");
  } else if (similarBenchmark) {
    addRisk("類似比較", 2, "類似アカウント内でも上位に入り、相対評価は良好です。");
  }

  const normalizedScore = clampScore(score);
  if (normalizedScore >= 70) {
    return {
      level: "高リスク",
      score: normalizedScore,
      message: "起用前にデータ再取得、活動状況、コメント品質を確認してください。",
      className: "border-red-200 bg-red-50 text-red-800",
      barClassName: "bg-red-500",
      items,
    };
  }
  if (normalizedScore >= 38) {
    return {
      level: "中リスク",
      score: normalizedScore,
      message: "大きな問題は限定的ですが、弱い指標を確認してから判断すると安全です。",
      className: "border-amber-300 bg-amber-50 text-amber-900",
      barClassName: "bg-amber-500",
      items,
    };
  }
  return {
    level: "低リスク",
    score: normalizedScore,
    message: "主要指標はおおむね安定しており、候補として検討しやすい状態です。",
    className: "border-[#046307]/25 bg-[#046307]/5 text-[#046307]",
    barClassName: "bg-[#046307]",
    items,
  };
};
