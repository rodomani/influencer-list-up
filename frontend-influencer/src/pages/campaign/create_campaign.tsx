import { Input } from "@/components/ui/input"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { useNavigate } from "react-router-dom"
import { type DateRange } from "react-day-picker"
import { Calendar } from "@/components/ui/calendar"
import React from "react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"

export function CreateCampaignScreen() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [formValues, setFormValues] = React.useState({
    name: "",
    description: "",
    budget: "",
    goal: "",
    status: "ongoing",
  })
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(() => {
    const from = new Date()
    const to = new Date()
    to.setDate(from.getDate() + 7)
    return { from, to }
  })

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    field: keyof typeof formValues
  ) => {
    setFormValues((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleCreate = async () => {
    if (!user) {
      setError("ログインしてから作成してね。")
      return
    }

    if (!dateRange?.from || !dateRange?.to) {
      setError("開始日と終了日を選んでね。")
      return
    }

    setSubmitting(true)
    setError(null)

    const { name, description, budget, goal, status } = formValues
    const { error: insertError } = await supabase.from("campaigns").insert({
      user_id: user.id,
      name,
      description,
      start_date: dateRange.from.toISOString().split("T")[0],
      end_date: dateRange.to.toISOString().split("T")[0],
      budget: budget ? Number(budget) : null,
      goal,
      status,
    })

    setSubmitting(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    navigate("/campaign")
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="section-title font-display">キャンペーン作成</div>
          <div className="section-subtitle">範囲・予算・日程を決めよう。</div>
        </div>
        <Button variant="outline" onClick={() => navigate("/campaign")}>
          一覧に戻る
        </Button>
      </div>
      <FieldSet>
        <FieldLegend className="font-display text-lg">キャンペーン詳細</FieldLegend>
        <FieldGroup className="flex-row items-start gap-4">
          {/* Campaign Name Field */}
          <Field className="flex-1 min-w-[220px] basis-0 w-auto">
            <FieldLabel htmlFor="name">キャンペーン名</FieldLabel>
            <Input
              id="name"
              value={formValues.name}
              onChange={(event) => handleInputChange(event, "name")}
            />
          </Field>
          {/* Description Field */}
          <Field className="flex-1 min-w-[220px] basis-0 w-auto">
            <FieldLabel htmlFor="description">説明</FieldLabel>
            <Input
              id="description"
              value={formValues.description}
              onChange={(event) => handleInputChange(event, "description")}
            />
          </Field>
          {/* Budget Field */}
          <Field className="flex-1 min-w-[220px] basis-0 w-auto">
            <FieldLabel htmlFor="budget">予算</FieldLabel>
            <Input
              id="budget"
              type="number"
              value={formValues.budget}
              onChange={(event) => handleInputChange(event, "budget")}
            />
          </Field>
          {/* Goal Field */}
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
          <Button onClick={() => navigate("/search/search")}>
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
          onClick={handleCreate}
          disabled={submitting}
        >
          {submitting ? "作成中..." : "作成する"}
        </Button>
      </FieldSet>
    </div>
  )
}
