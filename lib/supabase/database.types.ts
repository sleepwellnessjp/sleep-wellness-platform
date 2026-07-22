/**
 * Supabase Database typings — Sleep Wellness Platform V1.0
 * Tables from schema.sql + platform-v1.sql
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      roles: {
        Row: {
          id: string;
          label: string;
          description: string;
          permissions: Json;
          created_at: string;
        };
        Insert: {
          id: string;
          label: string;
          description?: string;
          permissions?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          label?: string;
          description?: string;
          permissions?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          role: "super_admin" | "admin" | "instructor" | "client";
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          role?: "super_admin" | "admin" | "instructor" | "client";
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          display_name?: string | null;
          role?: "super_admin" | "admin" | "instructor" | "client";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          name_kana: string | null;
          birth_date: string | null;
          gender: string | null;
          email: string | null;
          phone: string | null;
          registered_at: string | null;
          memo: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          name_kana?: string | null;
          birth_date?: string | null;
          gender?: string | null;
          email?: string | null;
          phone?: string | null;
          registered_at?: string | null;
          memo?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          name_kana?: string | null;
          birth_date?: string | null;
          gender?: string | null;
          email?: string | null;
          phone?: string | null;
          registered_at?: string | null;
          memo?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      client_profiles: {
        Row: {
          id: string;
          client_id: string;
          owner_id: string;
          schema_version: number;
          basic: Json;
          work: Json;
          commute: Json;
          heat_exposure: Json;
          lifestyle: Json;
          caffeine: Json;
          hydration: Json;
          exercise: Json;
          health: Json;
          sleep_environment: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          owner_id: string;
          schema_version?: number;
          basic?: Json;
          work?: Json;
          commute?: Json;
          heat_exposure?: Json;
          lifestyle?: Json;
          caffeine?: Json;
          hydration?: Json;
          exercise?: Json;
          health?: Json;
          sleep_environment?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          owner_id?: string;
          schema_version?: number;
          basic?: Json;
          work?: Json;
          commute?: Json;
          heat_exposure?: Json;
          lifestyle?: Json;
          caffeine?: Json;
          hydration?: Json;
          exercise?: Json;
          health?: Json;
          sleep_environment?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_profiles_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: true;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      weather_records: {
        Row: {
          id: string;
          owner_id: string;
          target_date: string;
          region: string;
          latitude: number | null;
          longitude: number | null;
          temp_max_c: number | null;
          temp_min_c: number | null;
          humidity_percent: number | null;
          pressure_hpa: number | null;
          precipitation_mm: number | null;
          weather_condition: string;
          heat_index_c: number | null;
          sunrise_time: string;
          sunset_time: string;
          source: string;
          fetched_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          target_date: string;
          region?: string;
          latitude?: number | null;
          longitude?: number | null;
          temp_max_c?: number | null;
          temp_min_c?: number | null;
          humidity_percent?: number | null;
          pressure_hpa?: number | null;
          precipitation_mm?: number | null;
          weather_condition?: string;
          heat_index_c?: number | null;
          sunrise_time?: string;
          sunset_time?: string;
          source?: string;
          fetched_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          target_date?: string;
          region?: string;
          latitude?: number | null;
          longitude?: number | null;
          temp_max_c?: number | null;
          temp_min_c?: number | null;
          humidity_percent?: number | null;
          pressure_hpa?: number | null;
          precipitation_mm?: number | null;
          weather_condition?: string;
          heat_index_c?: number | null;
          sunrise_time?: string;
          sunset_time?: string;
          source?: string;
          fetched_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      analyses: {
        Row: {
          id: string;
          client_id: string;
          owner_id: string;
          analyzed_at: string;
          sleep_score: number | null;
          sleep_duration: number | null;
          sleep_efficiency: number | null;
          deep_sleep: number | null;
          awakenings: number | null;
          sleep_latency: number | null;
          spo2: number | null;
          hrv: number | null;
          resting_heart_rate: number | null;
          ocr_data: Json | null;
          confirmed_metrics: Json | null;
          report_payload: Json | null;
          ai_result: Json | null;
          day_context: Json;
          personal_baseline: Json;
          credits_consumed: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          owner_id: string;
          analyzed_at?: string;
          sleep_score?: number | null;
          sleep_duration?: number | null;
          sleep_efficiency?: number | null;
          deep_sleep?: number | null;
          awakenings?: number | null;
          sleep_latency?: number | null;
          spo2?: number | null;
          hrv?: number | null;
          resting_heart_rate?: number | null;
          ocr_data?: Json | null;
          confirmed_metrics?: Json | null;
          report_payload?: Json | null;
          ai_result?: Json | null;
          day_context?: Json;
          personal_baseline?: Json;
          credits_consumed?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          owner_id?: string;
          analyzed_at?: string;
          sleep_score?: number | null;
          sleep_duration?: number | null;
          sleep_efficiency?: number | null;
          deep_sleep?: number | null;
          awakenings?: number | null;
          sleep_latency?: number | null;
          spo2?: number | null;
          hrv?: number | null;
          resting_heart_rate?: number | null;
          ocr_data?: Json | null;
          confirmed_metrics?: Json | null;
          report_payload?: Json | null;
          ai_result?: Json | null;
          day_context?: Json;
          personal_baseline?: Json;
          credits_consumed?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "analyses_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      occupation_master: {
        Row: {
          id: string;
          label: string;
          category:
            | "thermal"
            | "posture"
            | "schedule"
            | "digital"
            | "physical"
            | "sensory"
            | "recovery"
            | "other";
          description: string;
          ai_context: string;
          sleep_relevance: string[];
          sort_order: number;
          is_active: boolean;
          schema_version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          label: string;
          category?:
            | "thermal"
            | "posture"
            | "schedule"
            | "digital"
            | "physical"
            | "sensory"
            | "recovery"
            | "other";
          description?: string;
          ai_context?: string;
          sleep_relevance?: string[];
          sort_order?: number;
          is_active?: boolean;
          schema_version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          label?: string;
          category?:
            | "thermal"
            | "posture"
            | "schedule"
            | "digital"
            | "physical"
            | "sensory"
            | "recovery"
            | "other";
          description?: string;
          ai_context?: string;
          sleep_relevance?: string[];
          sort_order?: number;
          is_active?: boolean;
          schema_version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      client_occupation_attributes: {
        Row: {
          id: string;
          client_id: string;
          owner_id: string;
          attribute_id: string;
          intensity: "mild" | "moderate" | "high" | "unknown";
          notes: string;
          payload: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          owner_id: string;
          attribute_id: string;
          intensity?: "mild" | "moderate" | "high" | "unknown";
          notes?: string;
          payload?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          owner_id?: string;
          attribute_id?: string;
          intensity?: "mild" | "moderate" | "high" | "unknown";
          notes?: string;
          payload?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_occupation_attributes_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_occupation_attributes_attribute_id_fkey";
            columns: ["attribute_id"];
            isOneToOne: false;
            referencedRelation: "occupation_master";
            referencedColumns: ["id"];
          },
        ];
      };
      environment_event_master: {
        Row: {
          id: string;
          label: string;
          category:
            | "travel"
            | "lodging"
            | "transport"
            | "outdoor"
            | "work"
            | "other";
          description: string;
          ai_context: string;
          sleep_relevance: string[];
          payload_schema: Json;
          sort_order: number;
          is_active: boolean;
          schema_version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          label: string;
          category?:
            | "travel"
            | "lodging"
            | "transport"
            | "outdoor"
            | "work"
            | "other";
          description?: string;
          ai_context?: string;
          sleep_relevance?: string[];
          payload_schema?: Json;
          sort_order?: number;
          is_active?: boolean;
          schema_version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          label?: string;
          category?:
            | "travel"
            | "lodging"
            | "transport"
            | "outdoor"
            | "work"
            | "other";
          description?: string;
          ai_context?: string;
          sleep_relevance?: string[];
          payload_schema?: Json;
          sort_order?: number;
          is_active?: boolean;
          schema_version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      analysis_environment_events: {
        Row: {
          id: string;
          analysis_id: string;
          client_id: string;
          owner_id: string;
          event_type_id: string;
          event_date: string | null;
          started_at: string | null;
          ended_at: string | null;
          notes: string;
          payload: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          analysis_id: string;
          client_id: string;
          owner_id: string;
          event_type_id: string;
          event_date?: string | null;
          started_at?: string | null;
          ended_at?: string | null;
          notes?: string;
          payload?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          analysis_id?: string;
          client_id?: string;
          owner_id?: string;
          event_type_id?: string;
          event_date?: string | null;
          started_at?: string | null;
          ended_at?: string | null;
          notes?: string;
          payload?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "analysis_environment_events_analysis_id_fkey";
            columns: ["analysis_id"];
            isOneToOne: false;
            referencedRelation: "analyses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "analysis_environment_events_event_type_id_fkey";
            columns: ["event_type_id"];
            isOneToOne: false;
            referencedRelation: "environment_event_master";
            referencedColumns: ["id"];
          },
        ];
      };
      client_metric_baselines: {
        Row: {
          id: string;
          client_id: string;
          owner_id: string;
          window_days: 30 | 90;
          as_of_date: string;
          metric_key: string;
          sample_count: number;
          avg_value: number | null;
          median_value: number | null;
          min_value: number | null;
          max_value: number | null;
          stddev_value: number | null;
          unit: string;
          source: string;
          computed_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          owner_id: string;
          window_days: 30 | 90;
          as_of_date: string;
          metric_key: string;
          sample_count?: number;
          avg_value?: number | null;
          median_value?: number | null;
          min_value?: number | null;
          max_value?: number | null;
          stddev_value?: number | null;
          unit?: string;
          source?: string;
          computed_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          owner_id?: string;
          window_days?: 30 | 90;
          as_of_date?: string;
          metric_key?: string;
          sample_count?: number;
          avg_value?: number | null;
          median_value?: number | null;
          min_value?: number | null;
          max_value?: number | null;
          stddev_value?: number | null;
          unit?: string;
          source?: string;
          computed_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_metric_baselines_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      programs: {
        Row: {
          id: string;
          client_id: string;
          owner_id: string;
          start_date: string | null;
          current_phase: string;
          next_follow_up_date: string | null;
          progress_label: string;
          status: string;
          goals: Json;
          menu_items: Json;
          instructor_memo: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          owner_id: string;
          start_date?: string | null;
          current_phase?: string;
          next_follow_up_date?: string | null;
          progress_label?: string;
          status?: string;
          goals?: Json;
          menu_items?: Json;
          instructor_memo?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          owner_id?: string;
          start_date?: string | null;
          current_phase?: string;
          next_follow_up_date?: string | null;
          progress_label?: string;
          status?: string;
          goals?: Json;
          menu_items?: Json;
          instructor_memo?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "programs_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: true;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      membership: {
        Row: {
          id: string;
          user_id: string;
          certification_type:
            | "navigator"
            | "melatonin_yoga_instructor"
            | "sleep_wellness_producer";
          certified_at: string | null;
          expires_at: string | null;
          status: "active" | "renewal_pending" | "suspended" | "expired";
          continuing_education: Json;
          admin_memo: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          certification_type:
            | "navigator"
            | "melatonin_yoga_instructor"
            | "sleep_wellness_producer";
          certified_at?: string | null;
          expires_at?: string | null;
          status?: "active" | "renewal_pending" | "suspended" | "expired";
          continuing_education?: Json;
          admin_memo?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          certification_type?:
            | "navigator"
            | "melatonin_yoga_instructor"
            | "sleep_wellness_producer";
          certified_at?: string | null;
          expires_at?: string | null;
          status?: "active" | "renewal_pending" | "suspended" | "expired";
          continuing_education?: Json;
          admin_memo?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "membership_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      monthly_credit: {
        Row: {
          id: string;
          user_id: string;
          year_month: string;
          granted_amount: number;
          used_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          year_month: string;
          granted_amount?: number;
          used_amount?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          year_month?: string;
          granted_amount?: number;
          used_amount?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "monthly_credit_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      credit_transactions: {
        Row: {
          id: string;
          user_id: string;
          type:
            | "monthly_grant"
            | "analysis_use"
            | "purchase"
            | "admin_grant"
            | "admin_adjustment";
          amount: number;
          balance_after: number;
          reference_id: string | null;
          description: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type:
            | "monthly_grant"
            | "analysis_use"
            | "purchase"
            | "admin_grant"
            | "admin_adjustment";
          amount: number;
          balance_after?: number;
          reference_id?: string | null;
          description?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?:
            | "monthly_grant"
            | "analysis_use"
            | "purchase"
            | "admin_grant"
            | "admin_adjustment";
          amount?: number;
          balance_after?: number;
          reference_id?: string | null;
          description?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "credit_transactions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      analysis_history: {
        Row: {
          id: string;
          user_id: string;
          client_id: string | null;
          analysis_id: string | null;
          client_name: string;
          measurement_date: string | null;
          sleep_score: number | null;
          credits_consumed: number;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          client_id?: string | null;
          analysis_id?: string | null;
          client_name?: string;
          measurement_date?: string | null;
          sleep_score?: number | null;
          credits_consumed?: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          client_id?: string | null;
          analysis_id?: string | null;
          client_name?: string;
          measurement_date?: string | null;
          sleep_score?: number | null;
          credits_consumed?: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "analysis_history_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "analysis_history_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "analysis_history_analysis_id_fkey";
            columns: ["analysis_id"];
            isOneToOne: false;
            referencedRelation: "analyses";
            referencedColumns: ["id"];
          },
        ];
      };
      admin_logs: {
        Row: {
          id: string;
          actor_id: string;
          target_user_id: string | null;
          action: string;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id: string;
          target_user_id?: string | null;
          action: string;
          payload?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string;
          target_user_id?: string | null;
          action?: string;
          payload?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "admin_logs_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          body: string;
          type: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          body?: string;
          type?: string;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          body?: string;
          type?: string;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_super_admin: { Args: Record<string, never>; Returns: boolean };
      is_admin_or_above: { Args: Record<string, never>; Returns: boolean };
      create_client_with_profile: {
        Args: {
          p_name: string;
          p_name_kana?: string | null;
          p_memo?: string | null;
        };
        Returns: Database["public"]["Tables"]["clients"]["Row"];
      };
      ensure_client_profile: {
        Args: { p_client_id: string };
        Returns: Database["public"]["Tables"]["client_profiles"]["Row"];
      };
      ensure_monthly_credit: {
        Args: { p_user_id?: string | null };
        Returns: Database["public"]["Tables"]["monthly_credit"]["Row"];
      };
      ensure_instructor_membership: {
        Args: { p_certification_type?: string };
        Returns: Database["public"]["Tables"]["membership"]["Row"];
      };
      get_credit_balance: {
        Args: { p_user_id?: string | null };
        Returns: Json;
      };
      consume_analysis_credit: {
        Args: {
          p_client_name: string;
          p_measurement_date?: string | null;
          p_sleep_score?: number | null;
          p_client_id?: string | null;
          p_analysis_id?: string | null;
        };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type CreditBalanceResult = {
  ok: boolean;
  remaining?: number;
  granted?: number;
  used?: number;
  year_month?: string;
  message?: string;
};

export type ConsumeCreditResult = {
  ok: boolean;
  message: string;
  remaining?: number;
  history_id?: string;
};
