export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: unknown }
  | Json[];

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type TableDef<
  Row,
  Insert = Partial<Row>,
  Update = Partial<Insert>,
  Relationships extends Relationship[] = []
> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationships;
};

export type Database = {
  public: {
    Tables: {
      users: TableDef<{
        id: string;
        email: string;
        name: string;
        company: string | null;
        role: string | null;
        timezone: string;
        language: string;
        created_at: string;
        updated_at: string | null;
        email_verified: boolean;
      }>;
      campaigns: TableDef<
        {
          id: number | string;
          user_id: string | null;
          name: string | null;
          description: string | null;
          start_date: string | null;
          end_date: string | null;
          budget: number | null;
          goal: string | null;
          status: string | null;
          created_at: string;
          updated_at: string | null;
          influencers: string | null;
          internal_memo: string | null;
        },
        Partial<{
          id: number | string;
          user_id: string | null;
          name: string | null;
          description: string | null;
          start_date: string | null;
          end_date: string | null;
          budget: number | null;
          goal: string | null;
          status: string | null;
          influencers: string | null;
          internal_memo: string | null;
        }>
      >;
      campaign_influencers: TableDef<
        {
          id: number;
          campaign_id: number | string;
          account_id: number;
          status: string | null;
          notes: string | null;
          quoted_price: number | null;
          deliverables: string | null;
          deliverable_status: string | null;
          deliverable_due_date: string | null;
          added_at: string | null;
          updated_at: string | null;
        },
        Partial<{
          id: number;
          campaign_id: number | string;
          account_id: number;
          status: string | null;
          notes: string | null;
          quoted_price: number | null;
          deliverables: string | null;
          deliverable_status: string | null;
          deliverable_due_date: string | null;
          added_at: string | null;
          updated_at: string | null;
        }>,
        Partial<{
          id: number;
          campaign_id: number | string;
          account_id: number;
          status: string | null;
          notes: string | null;
          quoted_price: number | null;
          deliverables: string | null;
          deliverable_status: string | null;
          deliverable_due_date: string | null;
          added_at: string | null;
          updated_at: string | null;
        }>,
        [
          {
            foreignKeyName: "campaign_influencers_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "sns_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaign_influencers_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          }
        ]
      >;
      campaign_tasks: TableDef<
        {
          id: number;
          campaign_id: number | string;
          title: string;
          completed: boolean;
          position: number;
          created_at: string;
          updated_at: string;
        },
        Partial<{
          id: number;
          campaign_id: number | string;
          title: string;
          completed: boolean;
          position: number;
          created_at: string;
          updated_at: string;
        }>
      >;
      campaign_calendar_events: TableDef<
        {
          id: number;
          campaign_id: number | string;
          title: string;
          event_date: string;
          event_type: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        },
        Partial<{
          id: number;
          campaign_id: number | string;
          title: string;
          event_date: string;
          event_type: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        }>
      >;
      sns_accounts: TableDef<{
        id: number;
        profile_id: string | null;
        platform: string;
        country: string | null;
        email: string | null;
        language: string | null;
        gender: string | null;
        caption: string | null;
        account_url: string;
        account_name: string;
        is_verified: boolean | null;
        profile_image_url: string | null;
        business_account: boolean | null;
        does_livestream: boolean | null;
        created_at: string;
        updated_at: string | null;
        keywords: string | null;
        platform_user_id: string | null;
        platform_profile_id: string | null;
        last_profile_scraped_at: string | null;
        last_posts_scraped_at: string | null;
      }>;
      accounts_metrics: TableDef<
        {
          id: number;
          account_id: number;
          posts: number | null;
          followers: number | null;
          following: number | null;
          profile_views: number | null;
          metric_date: string;
          videos: number | null;
          created_at: string;
          maximum_likes: number | null;
        },
        Partial<{
          id: number;
          account_id: number;
          posts: number | null;
          followers: number | null;
          following: number | null;
          profile_views: number | null;
          metric_date: string;
          videos: number | null;
          created_at: string;
          maximum_likes: number | null;
        }>,
        Partial<{
          id: number;
          account_id: number;
          posts: number | null;
          followers: number | null;
          following: number | null;
          profile_views: number | null;
          metric_date: string;
          videos: number | null;
          created_at: string;
          maximum_likes: number | null;
        }>,
        [
          {
            foreignKeyName: "accounts_metrics_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "sns_accounts";
            referencedColumns: ["id"];
          }
        ]
      >;
      posts: TableDef<
        {
          id: number;
          account_id: number | null;
          media_type: string | number | null;
          content_text: string | null;
          link: string | null;
          posted_at: string | null;
          scraped_at: string | null;
          caption: string | null;
          campaign_id: number | null;
          collaboration_id: number | null;
          external_post_id: string | null;
        },
        Partial<{
          id: number;
          account_id: number | null;
          media_type: string | number | null;
          content_text: string | null;
          link: string | null;
          posted_at: string | null;
          scraped_at: string | null;
          caption: string | null;
          campaign_id: number | null;
          collaboration_id: number | null;
          external_post_id: string | null;
        }>
      >;
      influencer_average_comment_analysis: TableDef<{
        id: number;
        created_at: string;
        avg_sentiment: number | null;
        avg_toxicity: number | null;
        avg_emotion: Json | null;
        avg_language: Json | null;
        avg_topics: Json | null;
        avg_conversion_intent_rate: number | null;
        updated_at: string | null;
        account_id: number | null;
        posts_count: number | null;
        avg_spam_rate: number | null;
        sum_sampled_total: number | null;
        window: string | null;
        avg_hate_score: number | null;
        sum_filtered_total: number | null;
      }>;
      analysis_job_runs: TableDef<
        {
          id: number;
          analysis_name: string;
          account_id: number;
          platform: string | null;
          status: string;
          rows_written: number | null;
          error_message: string | null;
          details: Json | null;
          analysis_version: string | null;
          started_at: string | null;
          finished_at: string | null;
          created_at: string | null;
        },
        Partial<{
          id: number;
          analysis_name: string;
          account_id: number;
          platform: string | null;
          status: string;
          rows_written: number | null;
          error_message: string | null;
          details: Json | null;
          analysis_version: string | null;
          started_at: string | null;
          finished_at: string | null;
          created_at: string | null;
        }>
      >;
      user_bookmarks: TableDef<
        {
          id: number;
          user_id: string;
          account_id: number;
          priority: string | null;
          personal_rating: number | null;
          candidate_readiness: string | null;
          risk_level: string | null;
          risk_notes: string | null;
          estimated_price_min: number | null;
          estimated_price_max: number | null;
          price_note: string | null;
          price_checked_at: string | null;
          contact_info: Json;
          saved_snapshot: Json | null;
          research_checklist: Json;
          saved_reason: string | null;
          private_memo: string | null;
          saved_source: string | null;
          saved_source_detail: Json;
          created_at: string;
          updated_at: string;
        },
        Partial<{
          id: number;
          user_id: string;
          account_id: number;
          priority: string | null;
          personal_rating: number | null;
          candidate_readiness: string | null;
          risk_level: string | null;
          risk_notes: string | null;
          estimated_price_min: number | null;
          estimated_price_max: number | null;
          price_note: string | null;
          price_checked_at: string | null;
          contact_info: Json;
          saved_snapshot: Json | null;
          research_checklist: Json;
          saved_reason: string | null;
          private_memo: string | null;
          saved_source: string | null;
          saved_source_detail: Json;
          created_at: string;
          updated_at: string;
        }>
      >;
      bookmark_folders: TableDef<
        {
          id: number;
          user_id: string;
          name: string;
          created_at: string | null;
          updated_at: string | null;
        },
        Partial<{
          id: number;
          user_id: string;
          name: string;
          created_at: string | null;
          updated_at: string | null;
        }>
      >;
      bookmark_folder_items: TableDef<
        {
          id: number;
          folder_id: number;
          bookmark_id: number;
          created_at: string | null;
        },
        Partial<{
          id: number;
          folder_id: number;
          bookmark_id: number;
          created_at: string | null;
        }>
      >;
      bookmark_tags: TableDef<
        {
          id: number;
          user_id: string;
          name: string;
          created_at: string | null;
          updated_at: string | null;
        },
        Partial<{
          id: number;
          user_id: string;
          name: string;
          created_at: string | null;
          updated_at: string | null;
        }>
      >;
      bookmark_tag_items: TableDef<
        {
          id: number;
          tag_id: number;
          bookmark_id: number;
          created_at: string | null;
        },
        Partial<{
          id: number;
          tag_id: number;
          bookmark_id: number;
          created_at: string | null;
        }>
      >;
    };
    Views: {
      latest_account_metrics: {
        Row: {
          account_id: number | null;
          followers: number | null;
          posts: number | null;
          maximum_likes: number | null;
          metric_date: string | null;
        };
        Relationships: [];
      };
      influencer_latest_activity: {
        Row: {
          account_id: number | null;
          latest_posted_at: string | null;
          latest_activity_at: string | null;
          first_posted_at: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      search_influencers: {
        Args: {
          p_platforms?: string[] | null;
          p_username?: string | null;
          p_keywords?: string[] | null;
          p_min_followers?: number | null;
          p_max_followers?: number | null;
          p_min_likes?: number | null;
          p_max_likes?: number | null;
          p_min_posts?: number | null;
          p_max_posts?: number | null;
          p_sort?: string | null;
          p_limit?: number | null;
          p_offset?: number | null;
        };
        Returns: {
          id: number;
          platform: string;
          account_name: string;
          gender: string | null;
          keywords: string | null;
          profile_image_url: string | null;
          followers: number | null;
          posts: number | null;
          maximum_likes: number | null;
          metric_date: string | null;
          latest_posted_at: string | null;
          latest_activity_at: string | null;
          first_posted_at: string | null;
          posting_span_days: number | null;
          bookmark_count: number | null;
          total_count: number | null;
        }[];
      };
      recommend_influencers_for_campaign: {
        Args: {
          p_campaign_id: number;
          p_goal?: string | null;
          p_budget?: number | null;
          p_excluded_account_ids?: number[] | null;
          p_limit?: number | null;
        };
        Returns: {
          id: number;
          platform: string;
          account_name: string;
          profile_image_url: string | null;
          gender: string | null;
          keywords: string | null;
          followers: number | null;
          posts: number | null;
          maximum_likes: number | null;
          metric_date: string | null;
          recommendation_score: number | null;
          recommendation_reasons: Json | null;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
