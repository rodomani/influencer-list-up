import { Input } from "@/components/ui/input"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldDescription,
  FieldTitle
} from "@/components/ui/field"

import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"

export function SearchScreen() {
  const RANGE_MIN = 0
  const RANGE_MAX = 10_000_000

  const [likeValue, setLikeValue] = useState([RANGE_MIN, RANGE_MAX])
  const [postValue, setPostValue] = useState([RANGE_MIN, RANGE_MAX])
  const [followerValue, setFollowerValue] = useState([RANGE_MIN, RANGE_MAX])
  const [keywords, setKeywords] = useState<string[]>([])
  const [isKeywordMenuOpen, setIsKeywordMenuOpen] = useState(false)
  const [platforms, setPlatforms] = useState<string[]>([])
  const [platformError, setPlatformError] = useState<string | null>(null)
  const [username, setUsername] = useState("")
  const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([])
  const [campaignLoading, setCampaignLoading] = useState(false)
  const [campaignError, setCampaignError] = useState<string | null>(null)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | undefined>(undefined)
  const navigate = useNavigate()
  const { user } = useAuth()

  const [keywordOptions, setKeywordOptions] = useState<string[]>([])
  const [keywordLoading, setKeywordLoading] = useState(false)
  const [keywordError, setKeywordError] = useState<string | null>(null)

  const handleRangeInputChange = (
    nextRaw: number,
    index: 0 | 1,
    current: number[],
    setter: React.Dispatch<React.SetStateAction<number[]>>
  ) => {
    if (Number.isNaN(nextRaw)) return
    const clamped = Math.min(Math.max(nextRaw, RANGE_MIN), RANGE_MAX)
    const updated = [...current] as [number, number]
    updated[index] = clamped
    if (updated[0] > updated[1]) {
      index === 0 ? (updated[1] = clamped) : (updated[0] = clamped)
    }
    setter(updated)
  }

  const toggleKeyword = (value: string) => {
    setKeywords((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    )
  }

  const togglePlatform = (value: string) => {
    setPlatforms((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    )
  }

  useEffect(() => {
    const fetchCampaigns = async () => {
      if (!user) return
      setCampaignLoading(true)
      setCampaignError(null)
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
      if (error) {
        setCampaignError(error.message)
      } else {
        setCampaigns(data ?? [])
      }
      setCampaignLoading(false)
    }

    fetchCampaigns()
  }, [user])

  useEffect(() => {
    const fetchKeywords = async () => {
      setKeywordLoading(true)
      setKeywordError(null)
      const { data, error } = await supabase
        .from("sns_accounts")
        .select("keywords")
        .not("keywords", "is", null)

      if (error) {
        setKeywordError(error.message)
        setKeywordOptions([])
      } else {
        const flattened = (data ?? []).flatMap((row) => {
          const value = (row as { keywords?: string | null }).keywords
          if (!value) return []
          return value
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        })
        const unique = Array.from(new Set(flattened)).sort((a, b) => a.localeCompare(b))
        setKeywordOptions(unique)
      }
      setKeywordLoading(false)
    }

    fetchKeywords()
  }, [])

  const handleSearch = () => {
    if (platforms.length === 0) {
      setPlatformError("プラットフォームを1つ以上選んでね。")
      return
    }
    setPlatformError(null)
    const filters = {
      platforms,
      username,
      keywords,
      likes: likeValue,
      posts: postValue,
      followers: followerValue,
      campaignId: selectedCampaignId,
    }
    navigate("/search/search_results", { state: { filters } })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="section-title font-display">インフルエンサー検索</div>
        <div className="section-subtitle">プラットフォームや指標で絞り込もう。</div>
      </div>
      <FieldSet >
        <FieldLegend className="font-display text-lg">絞り込み</FieldLegend>
        <FieldGroup className="flex-row items-start gap-4">
        {/* Platform Dropdown Bar */}
        <Field className="flex-1 min-w-[220px] basis-0 w-auto">
          <FieldLabel htmlFor="platform">プラットフォーム</FieldLabel>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className={`justify-between ${platformError ? "border-red-500 text-red-600" : ""}`}
              >
                {platforms.length > 0 ? platforms.join(", ") : "プラットフォームを選ぶ"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              {["instagram", "x", "tiktok", "youtube"].map((option) => (
                <DropdownMenuCheckboxItem
                  key={option}
                  checked={platforms.includes(option)}
                  onCheckedChange={() => togglePlatform(option)}
                  onSelect={(event) => event.preventDefault()}
                >
                  {option}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {platformError && (
            <p className="mt-1 text-xs text-red-600">{platformError}</p>
          )}
        </Field>
        {/* Username Input Field */}
        <Field className="flex-1 min-w-[220px] basis-0 w-auto">
          <FieldLabel htmlFor="username">ユーザー名</FieldLabel>
          <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
        </Field>
        {/* Content Keyword Multi-select */}
        <Field className="flex min-w-[220px] basis-0 w-auto">
          <FieldLabel htmlFor="keyword">キーワード</FieldLabel>
          <DropdownMenu
            open={isKeywordMenuOpen}
            onOpenChange={setIsKeywordMenuOpen}
          >
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="justify-between opacity-50">
                {keywords.length > 0
                  ? keywords.join(", ")
                  : "キーワードを選ぶ"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              {keywordLoading && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">読み込み中...</div>
              )}
              {!keywordLoading && keywordOptions.length === 0 && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  {keywordError ? "キーワードの取得に失敗したよ。" : "キーワードがないよ。"}
                </div>
              )}
              {keywordOptions.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option}
                  checked={keywords.includes(option)}
                  onCheckedChange={() => toggleKeyword(option)}
                  onSelect={(event) => event.preventDefault()}
                >
                  {option}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {keywords.length > 0 && (
            <div className="mt-2 flex gap-2">
              {keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-xs"
                >
                  {keyword}
                </span>
              ))}
            </div>
          )}
        </Field>
        </FieldGroup>
        <FieldGroup className="flex-row items-start gap-4">
        <Field className="flex-1 min-w-[220px] basis-0 w-auto">
        <FieldTitle>いいね数の範囲</FieldTitle>
        <FieldDescription>
          (
          <span className="font-medium tabular-nums">{likeValue[0]}</span> -{" "}
          <span className="font-medium tabular-nums">{likeValue[1]}</span>).
        </FieldDescription>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            min={RANGE_MIN}
            max={RANGE_MAX}
            value={likeValue[0]}
            onChange={(event) =>
              handleRangeInputChange(
                Number(event.target.value),
                0,
                likeValue,
                setLikeValue
              )
            }
            className="w-28"
          />
          <span className="text-muted-foreground">〜</span>
          <Input
            type="number"
            inputMode="numeric"
            min={RANGE_MIN}
            max={RANGE_MAX}
            value={likeValue[1]}
            onChange={(event) =>
              handleRangeInputChange(
                Number(event.target.value),
                1,
                likeValue,
                setLikeValue
              )
            }
            className="w-28"
          />
        </div>
        <Slider
          value={likeValue}
          onValueChange={setLikeValue}
          max={RANGE_MAX}
          min={RANGE_MIN}
          step={10}
          className="mt-2 w-full"
          aria-label="いいね数の範囲"
        />
      </Field>
      <Field className="flex-1 min-w-[220px] basis-0 w-auto">
        <FieldTitle>投稿数の範囲</FieldTitle>
        <FieldDescription>
           (
          <span className="font-medium tabular-nums">{postValue[0]}</span> -{" "}
          <span className="font-medium tabular-nums">{postValue[1]}</span>).
        </FieldDescription>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            min={RANGE_MIN}
            max={RANGE_MAX}
            value={postValue[0]}
            onChange={(event) =>
              handleRangeInputChange(
                Number(event.target.value),
                0,
                postValue,
                setPostValue
              )
            }
            className="w-28"
          />
          <span className="text-muted-foreground">〜</span>
          <Input
            type="number"
            inputMode="numeric"
            min={RANGE_MIN}
            max={RANGE_MAX}
            value={postValue[1]}
            onChange={(event) =>
              handleRangeInputChange(
                Number(event.target.value),
                1,
                postValue,
                setPostValue
              )
            }
            className="w-28"
          />
        </div>
        <Slider
          value={postValue}
          onValueChange={setPostValue}
          max={RANGE_MAX}
          min={RANGE_MIN}
          step={10}
          className="mt-2 w-full"
          aria-label="投稿数の範囲"
        />
      </Field>
      <Field className="flex-1 min-w-[220px] basis-0 w-auto">
        <FieldTitle>フォロワー数の範囲</FieldTitle>
        <FieldDescription>
           (
          <span className="font-medium tabular-nums">{followerValue[0]}</span> -{" "}
          <span className="font-medium tabular-nums">{followerValue[1]}</span>).
        </FieldDescription>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            min={RANGE_MIN}
            max={RANGE_MAX}
            value={followerValue[0]}
            onChange={(event) =>
              handleRangeInputChange(
                Number(event.target.value),
                0,
                followerValue,
                setFollowerValue
              )
            }
            className="w-28"
          />
          <span className="text-muted-foreground">〜</span>
          <Input
            type="number"
            inputMode="numeric"
            min={RANGE_MIN}
            max={RANGE_MAX}
            value={followerValue[1]}
            onChange={(event) =>
              handleRangeInputChange(
                Number(event.target.value),
                1,
                followerValue,
                setFollowerValue
              )
            }
            className="w-28"
          />
        </div>
        <Slider
          value={followerValue}
          onValueChange={setFollowerValue}
          max={RANGE_MAX}
          min={RANGE_MIN}
          step={10}
          className="mt-2 w-full"
          aria-label="フォロワー数の範囲"
        />
      </Field>
        </FieldGroup>
        <Field className="flex-1 min-w-[220px] basis-0 w-auto">
        <FieldLabel htmlFor="campaign">キャンペーン</FieldLabel>
          <Select
            value={selectedCampaignId}
            onValueChange={(value) => setSelectedCampaignId(value)}
            disabled={campaignLoading || campaigns.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={campaignLoading ? "読み込み中..." : "キャンペーンを選ぶ"} />
            </SelectTrigger>
            <SelectContent>
              {campaignError && (
                <SelectItem value="error" disabled>
                  {campaignError}
                </SelectItem>
              )}
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="flex flex-wrap items-center gap-2 md:flex-row">
        <Button variant="outline" onClick={handleSearch}>検索する</Button>
      </div>
      </FieldSet>
    </div>
  )
}
