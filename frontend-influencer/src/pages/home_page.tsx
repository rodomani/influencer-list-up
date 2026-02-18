import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type Users = {
  id: string;
  profile_id: string | null;
  account_name: string;
  platform: string;
  account_url: string;
  caption: string | null;
  keywords: string | null;
  is_verified: string | null;
  profile_image_url: string | undefined;
};

export function HomeScreen() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<Users[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCampaigns = async () => {
      const { data, error: fetchError } = await supabase
        .from("sns_accounts")
        .select("*")
        .limit(10);

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setUsers(data ?? []);
      }
      setLoading(false);
    };

    fetchCampaigns();
  });
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="section-title font-display">インフルエンサーリスト</div>
        <div className="section-subtitle">進行中の案件にすぐアクセス。</div>
      </div>
      {loading && (
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      )}
      {error && <p className="text-sm text-red-600">エラー: {error}</p>}

      {!loading && users.length > 0 && (
        <div className="space-y-4">
          <h2 className="section-title">進行中</h2>
          <Carousel opts={{ align: "start" }} className="w-full px-12">
            <CarouselContent>
              {(() => {
                const base = users
                  .filter((user) => user.profile_id === null)
                  .slice(0, 12);
                const items = [...base, { id: "__search_more__" } as Users];
                const chunks: Users[][] = [];
                for (let i = 0; i < items.length; i += 6) {
                  chunks.push(items.slice(i, i + 6));
                }
                return chunks.map((chunk, pageIndex) => (
                  <CarouselItem
                    key={`page-${pageIndex}`}
                    className="basis-full"
                  >
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {chunk.map((user) => {
                        if (user.id === "__search_more__") {
                          return (
                            <Card
                              key="search-more"
                              className="cursor-pointer border-dashed transition hover:border-primary hover:shadow-sm"
                              role="button"
                              tabIndex={0}
                              onClick={() => navigate("/search/search")}
                              onKeyDown={(event) => {
                                if (
                                  event.key === "Enter" ||
                                  event.key === " "
                                ) {
                                  event.preventDefault();
                                  navigate("/search/search");
                                }
                              }}
                            >
                              <CardHeader>
                                <CardTitle className="text-lg font-display">
                                  もっと検索
                                </CardTitle>
                                <CardDescription>
                                  条件を変えて探してみよう。
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="text-sm text-muted-foreground">
                                クリックして検索ページへ
                              </CardContent>
                            </Card>
                          );
                        }

                        return (
                          <Card
                            key={user.id}
                            className="cursor-pointer transition hover:border-primary hover:shadow-sm"
                            role="button"
                            tabIndex={0}
                            onClick={() =>
                              navigate(`/search/influencer/${user.id}`)
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                navigate(`/search/influencer/${user.id}`);
                              }
                            }}
                          >
                            <CardHeader>
                              <CardTitle className="text-lg font-display flex items-center justify-between gap-3">
                                <span className="truncate">
                                  {user.account_name}
                                </span>
                                {user.profile_image_url ? (
                                  <img
                                    src={user.profile_image_url}
                                    alt={`${user.account_name} profile`}
                                    className="h-14 w-14 shrink-0 rounded-full object-cover"
                                    loading="lazy"
                                  />
                                ) : null}
                              </CardTitle>
                              <CardDescription className="line-clamp-1">
                                {user.platform}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <p className="text-sm text-foreground">
                                キーワード: {user.keywords ?? "なし"}
                              </p>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {user.caption ?? "自己紹介がまだないよ。"}
                              </p>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </CarouselItem>
                ));
              })()}
            </CarouselContent>
            <CarouselPrevious className="-left-4" />
            <CarouselNext className="-right-4" />
          </Carousel>
        </div>
      )}
    </div>
  );
}
