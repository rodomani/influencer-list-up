import { supabase } from "@/lib/supabase";
import type { InfluencerCompareRow, PostActivityRow } from "../types";
import { timestampToMs } from "../logic/compareFormatters";

const attachPostActivity = (
  rows: InfluencerCompareRow[],
  posts: PostActivityRow[]
): InfluencerCompareRow[] => {
  const activityByAccount = new Map<
    number,
    {
      latest_posted_at: string | null;
      latest_activity_at: string | null;
      latest_post_link: string | null;
    }
  >();

  posts.forEach((post) => {
    const current = activityByAccount.get(post.account_id) ?? {
      latest_posted_at: null,
      latest_activity_at: null,
      latest_post_link: null,
    };

    if (timestampToMs(post.posted_at) > timestampToMs(current.latest_posted_at)) {
      current.latest_posted_at = post.posted_at;
      current.latest_post_link = post.link;
    }

    const newestActivity =
      timestampToMs(post.scraped_at) > timestampToMs(post.posted_at)
        ? post.scraped_at
        : post.posted_at;

    if (timestampToMs(newestActivity) > timestampToMs(current.latest_activity_at)) {
      current.latest_activity_at = newestActivity;
    }

    activityByAccount.set(post.account_id, current);
  });

  return rows.map((row) => ({
    ...row,
    ...activityByAccount.get(row.id),
  }));
};

export const fetchInfluencersForCompare = async (ids: number[]) => {
  const { data, error } = await supabase
    .from("sns_accounts")
    .select(
      `
      id,
      platform,
      account_name,
      account_url,
      profile_image_url,
      gender,
      keywords,
      last_profile_scraped_at,
      accounts_metrics(maximum_likes, posts, followers, metric_date)
    `
    )
    .in("id", ids)
    .order("metric_date", { foreignTable: "accounts_metrics", ascending: false });

  if (error) throw error;

  const rows = ((data as InfluencerCompareRow[]) ?? []).sort(
    (a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)
  );

  const postResponse = await supabase
    .from("posts")
    .select("account_id, posted_at, scraped_at, link")
    .in("account_id", ids);

  if (postResponse.error) throw postResponse.error;

  return attachPostActivity(rows, (postResponse.data as PostActivityRow[]) ?? []);
};
