export type CampaignGoalTemplate = {
  id: string;
  label: string;
  goal: string;
  description: string;
};

export const CAMPAIGN_GOAL_TEMPLATES: CampaignGoalTemplate[] = [
  {
    id: "awareness",
    label: "認知拡大",
    goal: "ブランド認知を高め、対象ユーザーへの接触回数とプロフィール流入を増やす。",
    description: "新規ユーザーにブランドやサービスを知ってもらうキャンペーン。",
  },
  {
    id: "product_launch",
    label: "新商品告知",
    goal: "新商品や新サービスの特徴を伝え、発売初期の関心と保存数を伸ばす。",
    description: "ローンチ時の話題化と初動反応を重視。",
  },
  {
    id: "conversion",
    label: "購入促進",
    goal: "投稿経由のクリック、問い合わせ、購入など具体的な行動につなげる。",
    description: "成果につながる導線と訴求力を重視。",
  },
  {
    id: "ugc",
    label: "UGC創出",
    goal: "ユーザー投稿や口コミにつながる体験価値を広げ、自然な投稿量を増やす。",
    description: "コミュニティ内での会話と二次拡散を狙う。",
  },
  {
    id: "event",
    label: "イベント集客",
    goal: "イベントや期間限定施策への参加意欲を高め、来場・予約・登録を増やす。",
    description: "期限のある施策で行動を促す。",
  },
  {
    id: "ambassador",
    label: "長期アンバサダー",
    goal: "継続的な発信を通じてブランド理解と信頼を積み上げ、長期的なファン化を促す。",
    description: "単発投稿より継続関係を重視。",
  },
];
