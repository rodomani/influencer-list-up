import { useState } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { DateRange } from "react-day-picker";
import type { CreateCampaignFormValues } from "../types";
import { createCampaign } from "./createCampaignQueries";
import {
  buildCreateCampaignPayload,
  initialCreateCampaignDateRange,
  initialCreateCampaignFormValues,
} from "../logic/createCampaignFormatters";

export const useCreateCampaign = (userId: string | undefined) => {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState<CreateCampaignFormValues>(() =>
    initialCreateCampaignFormValues()
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() =>
    initialCreateCampaignDateRange()
  );

  const goToCampaignList = () => {
    navigate("/campaign");
  };

  const goToInfluencerSearch = () => {
    navigate("/search/search");
  };

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    field: keyof CreateCampaignFormValues
  ) => {
    setFormValues((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleGoalTemplateSelect = (goal: string) => {
    setFormValues((prev) => ({ ...prev, goal }));
  };

  const handleCreate = async () => {
    if (!userId) {
      setError("ログインしてから作成してね。");
      return;
    }

    if (!dateRange?.from || !dateRange?.to) {
      setError("開始日と終了日を選んでね。");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await createCampaign(
        buildCreateCampaignPayload({
          formValues,
          dateRange,
          userId,
        })
      );
      navigate("/campaign");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : String(createError));
    } finally {
      setSubmitting(false);
    }
  };

  return {
    formValues,
    submitting,
    error,
    dateRange,
    setDateRange,
    goToCampaignList,
    goToInfluencerSearch,
    handleInputChange,
    handleGoalTemplateSelect,
    handleCreate,
  };
};
