import { useState } from "react";
import type { ChangeEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { DateRange } from "react-day-picker";
import type { Campaign, CampaignEditFormValues } from "../types";
import { updateCampaign } from "./campaignEditQueries";
import {
  buildCampaignUpdatePayload,
  initialCampaignDateRange,
  initialCampaignFormValues,
} from "../logic/campaignEditFormatters";

type CampaignEditLocationState = {
  campaign?: Campaign;
};

export const useCampaignEdit = (userId: string | undefined) => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const campaign = (state as CampaignEditLocationState | null)?.campaign;

  const [formValues, setFormValues] = useState<CampaignEditFormValues>(() =>
    initialCampaignFormValues(campaign)
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() =>
    initialCampaignDateRange(campaign)
  );

  const goBack = () => {
    navigate(-1);
  };

  const goToCampaignList = () => {
    navigate("/campaign");
  };

  const goToInfluencerSearch = () => {
    if (!campaign) return;
    navigate("/search/search", { state: { campaign } });
  };

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    field: keyof CampaignEditFormValues
  ) => {
    setFormValues((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleGoalTemplateSelect = (goal: string) => {
    setFormValues((prev) => ({ ...prev, goal }));
  };

  const handleUpdate = async () => {
    if (!campaign) return;

    if (!userId) {
      setError("ログインしてから編集してね。");
      return;
    }

    if (!dateRange?.from || !dateRange?.to) {
      setError("開始日と終了日を選んでね。");
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = buildCampaignUpdatePayload(formValues, dateRange);

    try {
      await updateCampaign({
        campaignId: campaign.id,
        userId,
        payload,
      });

      navigate("/campaign/detail", {
        state: {
          campaign: {
            ...campaign,
            ...formValues,
            start_date: payload.start_date,
            end_date: payload.end_date,
            budget: payload.budget,
            internal_memo: payload.internal_memo,
          },
        },
      });
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : String(updateError));
    } finally {
      setSubmitting(false);
    }
  };

  return {
    campaign,
    formValues,
    submitting,
    error,
    dateRange,
    setDateRange,
    goBack,
    goToCampaignList,
    goToInfluencerSearch,
    handleInputChange,
    handleGoalTemplateSelect,
    handleUpdate,
  };
};
