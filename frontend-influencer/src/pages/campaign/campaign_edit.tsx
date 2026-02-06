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
      <div className="space-y-4">
        <p className="text-sm text-red-600">No campaign to edit.</p>
        <Button variant="outline" onClick={() => navigate("/campaign")}>
          Back to Campaigns
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
      setError("You must be signed in to edit a campaign.")
      return
    }

    if (!dateRange?.from || !dateRange?.to) {
      setError("Please select a start and end date.")
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
    <div className="space-y-4">
      <Button variant="outline" onClick={() => navigate(-1)}>
        Back
      </Button>
      <FieldSet>
        <FieldLegend>Edit Campaign</FieldLegend>
        <FieldGroup className="flex-row items-start gap-4">
          <Field className="flex-1 min-w-[220px] basis-0 w-auto">
            <FieldLabel htmlFor="name">Campaign name</FieldLabel>
            <Input
              id="name"
              value={formValues.name}
              onChange={(event) => handleInputChange(event, "name")}
            />
          </Field>
          <Field className="flex-1 min-w-[220px] basis-0 w-auto">
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <Input
              id="description"
              value={formValues.description}
              onChange={(event) => handleInputChange(event, "description")}
            />
          </Field>
          <Field className="flex-1 min-w-[220px] basis-0 w-auto">
            <FieldLabel htmlFor="budget">Budget</FieldLabel>
            <Input
              id="budget"
              type="number"
              value={formValues.budget}
              onChange={(event) => handleInputChange(event, "budget")}
            />
          </Field>
          <Field className="flex-1 min-w-[220px] basis-0 w-auto">
            <FieldLabel htmlFor="goal">Goal</FieldLabel>
            <Input
              id="goal"
              value={formValues.goal}
              onChange={(event) => handleInputChange(event, "goal")}
            />
          </Field>
        </FieldGroup>
        <div>
          <Button onClick={() => navigate("/search/search", { state: { campaign } })}>
            Add Influencer
          </Button>
        </div>
        <FieldGroup className="flex-col items-start gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">Campaign Dates</p>
            <p className="text-xs text-muted-foreground">
              Select the start and end date for this campaign.
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
          {submitting ? "Updating..." : "Update Campaign"}
        </Button>
      </FieldSet>
    </div>
  )
}
