import { Input } from "@/components/ui/input"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { useNavigate, useLocation } from "react-router-dom"
import { type DateRange } from "react-day-picker"
import { Calendar } from "@/components/ui/calendar"
import React from "react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"

export function CampaignEditScreen() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const campaign = state?.campaign
  const { user } = useAuth()

  const [formValues, setFormValues] = React.useState({
    name: campaign?.name ?? "",
    description: campaign?.description ?? "",
    budget: campaign?.budget?.toString() ?? "",
    goal: campaign?.goal ?? "",
  })
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(() => {
    if (campaign?.start_date && campaign?.end_date) {
      return {
        from: new Date(campaign.start_date),
        to: new Date(campaign.end_date),
      }
    }
    return undefined
  })

  if (!campaign) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-red-600">編集するキャンペーンがないよ。</p>
        <Button variant="outline" onClick={() => navigate("/campaign")}>
          一覧に戻る
        </Button>
      </div>
    )
  }

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    field: keyof typeof formValues
  ) => {
    setFormValues((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleUpdate = async () => {
    if (!user) {
      setError("ログインしてから編集してね。")
      return
    }

    if (!dateRange?.from || !dateRange?.to) {
      setError("開始日と終了日を選んでね。")
      return
    }

    setSubmitting(true)
    setError(null)

    const { name, description, budget, goal } = formValues
    const { error: updateError } = await supabase
      .from("campaigns")
      .update({
        name,
        description,
        start_date: dateRange.from.toISOString().split("T")[0],
        end_date: dateRange.to.toISOString().split("T")[0],
        budget: budget ? Number(budget) : null,
        goal,
      })
      .eq("id", campaign.id)
      .eq("user_id", user.id)

    setSubmitting(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    navigate("/campaign/detail", { state: { campaign: { ...campaign, ...formValues, start_date: dateRange.from.toISOString().split("T")[0], end_date: dateRange.to.toISOString().split("T")[0], budget: budget ? Number(budget) : null } } })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="section-title font-display">キャンペーン編集</div>
          <div className="section-subtitle">内容を整えておこう。</div>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          戻る
        </Button>
      </div>
      <FieldSet>
        <FieldLegend className="font-display text-lg">キャンペーン詳細</FieldLegend>
        <FieldGroup className="flex-row items-start gap-4">
          <Field className="flex-1 min-w-[220px] basis-0 w-auto">
            <FieldLabel htmlFor="name">キャンペーン名</FieldLabel>
            <Input
              id="name"
              value={formValues.name}
              onChange={(event) => handleInputChange(event, "name")}
            />
          </Field>
          <Field className="flex-1 min-w-[220px] basis-0 w-auto">
            <FieldLabel htmlFor="description">説明</FieldLabel>
            <Input
              id="description"
              value={formValues.description}
              onChange={(event) => handleInputChange(event, "description")}
            />
          </Field>
          <Field className="flex-1 min-w-[220px] basis-0 w-auto">
            <FieldLabel htmlFor="budget">予算</FieldLabel>
            <Input
              id="budget"
              type="number"
              value={formValues.budget}
              onChange={(event) => handleInputChange(event, "budget")}
            />
          </Field>
          <Field className="flex-1 min-w-[220px] basis-0 w-auto">
            <FieldLabel htmlFor="goal">目標</FieldLabel>
            <Input
              id="goal"
              value={formValues.goal}
              onChange={(event) => handleInputChange(event, "goal")}
            />
          </Field>
        </FieldGroup>
        <div>
          <Button onClick={() => navigate("/search/search", { state: { campaign } })}>
            インフルエンサーを追加
          </Button>
        </div>
        <FieldGroup className="flex-col items-start gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">期間</p>
            <p className="text-xs text-muted-foreground">
              開始日と終了日を選んでね。
            </p>
          </div>
          <Calendar
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={setDateRange}
            numberOfMonths={2}
            className="rounded-lg border shadow-sm"
          />
        </FieldGroup>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button
          variant="outline"
          onClick={handleUpdate}
          disabled={submitting}
        >
          {submitting ? "更新中..." : "更新する"}
        </Button>
      </FieldSet>
    </div>
  )
}
