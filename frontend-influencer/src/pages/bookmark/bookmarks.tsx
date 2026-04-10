import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import star from "@/assets/star.jpeg";
import starToggle from "@/assets/star-2.jpeg";
import { supabase } from "@/lib/supabase";

type MetricsRow = {
  maximum_likes: number | null;
  posts: number | null;
  followers: number | null;
  metric_date?: string | null;
};

type InfluencerRowFromDB = {
  id: number;
  platform: string;
  account_name: string;
  gender: string | null;
  keywords: string | null;
  profile_image_url: string | null;
  accounts_metrics?: MetricsRow[] | null;
  last_profile_scraped_at: string | null;
  bookmarks: string[] | null;
};

type InfluencerNormalized = {
  id: number;
  platform: string;
  account_name: string;
  profile_image_url?: string | null;
  gender: string | null;
  keywords: string | null;
  accounts_metrics: MetricsRow | null;
  last_profile_scraped_at: string | null;
  bookmarks: string[];
};

export function Bookmarks() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [influencers, setInfluencers] = useState<InfluencerNormalized[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatDateYmd = (value: string | null) => {
    if (!value) return "N/A";
    const iso = value.includes("T") ? value : value.replace(" ", "T");
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "N/A";
    const ymd = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
    return ymd.replace(/-/g, "/");
  };

  useEffect(() => {
    const fetchBookmarked = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("sns_accounts")
        .select(
          `
          id,
          platform,
          account_name,
          gender,
          keywords,
          profile_image_url,
          last_profile_scraped_at,
          bookmarks,
          accounts_metrics(maximum_likes, posts, followers, metric_date)
        `
        )
        .contains("bookmarks", [user.id])
        .order("metric_date", {
          foreignTable: "accounts_metrics",
          ascending: false,
        });

      if (error) {
        setError(error.message);
        setInfluencers([]);
        setLoading(false);
        return;
      }

      const rows = (data as InfluencerRowFromDB[]) ?? [];
      const pickLatest = (
        m: MetricsRow[] | null | undefined
      ): MetricsRow | null => (Array.isArray(m) && m.length > 0 ? m[0] : null);

      const normalized: InfluencerNormalized[] = rows.map((r) => ({
        id: r.id,
        platform: r.platform,
        account_name: r.account_name,
        gender: r.gender,
        keywords: r.keywords,
        profile_image_url: r.profile_image_url,
        accounts_metrics: pickLatest(r.accounts_metrics),
        last_profile_scraped_at: r.last_profile_scraped_at,
        bookmarks: r.bookmarks ?? [],
      }));

      setInfluencers(normalized);
      setLoading(false);
    };

    fetchBookmarked();
  }, [user]);

  const handleToggleBookmark = async (influencer: InfluencerNormalized) => {
    if (!user) return;
    const alreadyBookmarked = influencer.bookmarks.includes(user.id);
    const updatedBookmarks = alreadyBookmarked
      ? influencer.bookmarks.filter((id) => id !== user.id)
      : [...influencer.bookmarks, user.id];

    setInfluencers((prev) => {
      if (!alreadyBookmarked) {
        return prev.map((row) =>
          row.id === influencer.id ? { ...row, bookmarks: updatedBookmarks } : row
        );
      }
      return prev.filter((row) => row.id !== influencer.id);
    });

    const { error } = await supabase
      .from("sns_accounts")
      .update({ bookmarks: updatedBookmarks })
      .eq("id", influencer.id);

    if (error) {
      setError(error.message);
      setInfluencers((prev) =>
        prev.map((row) =>
          row.id === influencer.id ? { ...row, bookmarks: influencer.bookmarks } : row
        )
      );
    }
  };

  return (
    <div className="min-h-screen min-w-270 px-4">
      <div className="pb-5 flex justify-end">
        <Button variant="outline" onClick={() => navigate("/search/search")}>
          Back to Search
        </Button>
      </div>

      {!user && (
        <p className="text-sm text-muted-foreground">
          Please log in to view your bookmarks.
        </p>
      )}
      {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
      {error && <p className="text-sm text-red-600">Error: {error}</p>}

      {!loading && !error && user && influencers.length === 0 && (
        <p className="text-sm text-muted-foreground">No bookmarked influencers.</p>
      )}

      <div className="grid gap-4">
        {influencers.map((influencer) => {
          const metrics = influencer.accounts_metrics;
          const keywordList =
            typeof influencer.keywords === "string"
              ? influencer.keywords
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              : [];

          return (
            <Card
              key={influencer.id}
              className="w-full cursor-pointer transition-shadow hover:shadow-md"
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/search/influencer/${influencer.id}`)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  navigate(`/search/influencer/${influencer.id}`);
                }
              }}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <CardTitle className="pb-2">
                    {influencer.account_name}
                  </CardTitle>
                  <div className="flex flex-col items-center gap-2">
                    {influencer.profile_image_url ? (
                      <img
                        src={influencer.profile_image_url}
                        alt={`${influencer.account_name} profile`}
                        className="h-16 w-16 shrink-0 rounded-full object-cover"
                        loading="lazy"
                      />
                    ) : null}
                    {user ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="border-0"
                        aria-pressed={influencer.bookmarks.includes(user.id)}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleToggleBookmark(influencer);
                        }}
                      >
                        {influencer.bookmarks.includes(user.id) ? (
                          <img
                            src={starToggle}
                            alt="favorite"
                            className="h-5 w-5"
                          />
                        ) : (
                          <img src={star} alt="favorite" className="h-5 w-5" />
                        )}
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col gap-4 md:flex-row md:gap-6">
                  <CardDescription className="flex-1">
                    <div className="font-medium text-foreground">
                      Information
                    </div>
                    <div className="flex flex-col text-muted-foreground">
                      <span>Platform: {influencer.platform}</span>
                      <span>
                        Keywords:{" "}
                        {keywordList.length ? keywordList.join(", ") : "N/A"}
                      </span>
                      <span>
                        Last Updated:{" "}
                        {formatDateYmd(influencer.last_profile_scraped_at)}
                      </span>
                    </div>
                  </CardDescription>

                  <CardDescription className="flex-1">
                    <div className="font-medium text-foreground">Metrics</div>
                    <div className="flex flex-col text-muted-foreground">
                      <span>Posts: {metrics?.posts ?? "N/A"}</span>
                      <span>Followers: {metrics?.followers ?? "N/A"}</span>
                      <span>Max Likes: {metrics?.maximum_likes ?? "N/A"}</span>
                    </div>
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
