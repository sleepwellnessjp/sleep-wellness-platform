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
          role: "super_admin" | "admin" | "instructor" | "client" | "enterprise";
          avatar_url: string | null;
          client_message: string | null;
          last_login_at: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          role?: "super_admin" | "admin" | "instructor" | "client" | "enterprise";
          avatar_url?: string | null;
          client_message?: string | null;
          last_login_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          display_name?: string | null;
          role?: "super_admin" | "admin" | "instructor" | "client" | "enterprise";
          avatar_url?: string | null;
          client_message?: string | null;
          last_login_at?: string | null;
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
          instructor_id: string;
          auth_user_id: string | null;
          name: string;
          name_kana: string | null;
          birth_date: string | null;
          gender: string | null;
          email: string | null;
          phone: string | null;
          registered_at: string | null;
          memo: string | null;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          instructor_id: string;
          auth_user_id?: string | null;
          name: string;
          name_kana?: string | null;
          birth_date?: string | null;
          gender?: string | null;
          email?: string | null;
          phone?: string | null;
          registered_at?: string | null;
          memo?: string | null;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          instructor_id?: string;
          auth_user_id?: string | null;
          name?: string;
          name_kana?: string | null;
          birth_date?: string | null;
          gender?: string | null;
          email?: string | null;
          phone?: string | null;
          registered_at?: string | null;
          memo?: string | null;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      client_guidance_notes: {
        Row: {
          id: string;
          client_id: string;
          owner_id: string;
          content: string;
          note_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          owner_id: string;
          content: string;
          note_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          owner_id?: string;
          content?: string;
          note_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_guidance_notes_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      client_homeworks: {
        Row: {
          id: string;
          client_id: string;
          instructor_id: string;
          title: string;
          description: string;
          assigned_date: string;
          due_date: string;
          is_completed: boolean;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          instructor_id: string;
          title: string;
          description?: string;
          assigned_date?: string;
          due_date: string;
          is_completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          instructor_id?: string;
          title?: string;
          description?: string;
          assigned_date?: string;
          due_date?: string;
          is_completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_homeworks_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      academy_credentials: {
        Row: {
          id: string;
          user_id: string;
          qualification_id: string;
          acquired_at: string;
          expires_at: string;
          renewed_at: string | null;
          certificate_number: string;
          issued_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          qualification_id: string;
          acquired_at: string;
          expires_at: string;
          renewed_at?: string | null;
          certificate_number: string;
          issued_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          qualification_id?: string;
          acquired_at?: string;
          expires_at?: string;
          renewed_at?: string | null;
          certificate_number?: string;
          issued_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      academy_lesson_progress: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string;
          status: string;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lesson_id: string;
          status?: string;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          lesson_id?: string;
          status?: string;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      academy_test_attempts: {
        Row: {
          id: string;
          user_id: string;
          test_id: string;
          score: number;
          max_score: number;
          passed: boolean;
          answers: Json;
          submitted_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          test_id: string;
          score?: number;
          max_score?: number;
          passed?: boolean;
          answers?: Json;
          submitted_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          test_id?: string;
          score?: number;
          max_score?: number;
          passed?: boolean;
          answers?: Json;
          submitted_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      community_announcements: {
        Row: {
          id: string;
          category: string;
          title: string;
          body: string;
          published_at: string;
          pinned: boolean;
          author_name: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category: string;
          title: string;
          body: string;
          published_at?: string;
          pinned?: boolean;
          author_name?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category?: string;
          title?: string;
          body?: string;
          published_at?: string;
          pinned?: boolean;
          author_name?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      community_discussion_posts: {
        Row: {
          id: string;
          author_id: string;
          author_name: string;
          category: string;
          title: string;
          body: string;
          like_count: number;
          comment_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          author_name: string;
          category: string;
          title: string;
          body: string;
          like_count?: number;
          comment_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          author_name?: string;
          category?: string;
          title?: string;
          body?: string;
          like_count?: number;
          comment_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      community_discussion_comments: {
        Row: {
          id: string;
          post_id: string;
          author_id: string;
          author_name: string;
          parent_id: string | null;
          body: string;
          like_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          author_id: string;
          author_name: string;
          parent_id?: string | null;
          body: string;
          like_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          author_id?: string;
          author_name?: string;
          parent_id?: string | null;
          body?: string;
          like_count?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "community_discussion_comments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "community_discussion_posts";
            referencedColumns: ["id"];
          },
        ];
      };
      community_likes: {
        Row: {
          id: string;
          user_id: string;
          target_type: string;
          target_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          target_type: string;
          target_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          target_type?: string;
          target_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      community_case_shares: {
        Row: {
          id: string;
          author_id: string;
          author_name: string;
          age_band: string;
          gender: string;
          challenge: string;
          intervention: string;
          outcome: string;
          attachment_note: string | null;
          like_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          author_name: string;
          age_band: string;
          gender?: string;
          challenge: string;
          intervention: string;
          outcome: string;
          attachment_note?: string | null;
          like_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          author_name?: string;
          age_band?: string;
          gender?: string;
          challenge?: string;
          intervention?: string;
          outcome?: string;
          attachment_note?: string | null;
          like_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      community_knowledge_items: {
        Row: {
          id: string;
          type: string;
          title: string;
          description: string;
          tags: string[];
          href: string | null;
          published_at: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          type: string;
          title: string;
          description?: string;
          tags?: string[];
          href?: string | null;
          published_at?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          type?: string;
          title?: string;
          description?: string;
          tags?: string[];
          href?: string | null;
          published_at?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      community_events: {
        Row: {
          id: string;
          type: string;
          title: string;
          description: string;
          starts_at: string;
          ends_at: string | null;
          location: string;
          capacity: number | null;
          registration_url: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          type: string;
          title: string;
          description?: string;
          starts_at: string;
          ends_at?: string | null;
          location?: string;
          capacity?: number | null;
          registration_url?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          type?: string;
          title?: string;
          description?: string;
          starts_at?: string;
          ends_at?: string | null;
          location?: string;
          capacity?: number | null;
          registration_url?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      community_message_threads: {
        Row: {
          id: string;
          participant_a: string;
          participant_b: string;
          last_message: string;
          last_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          participant_a: string;
          participant_b: string;
          last_message?: string;
          last_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          participant_a?: string;
          participant_b?: string;
          last_message?: string;
          last_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      community_messages: {
        Row: {
          id: string;
          thread_id: string;
          sender_id: string;
          body: string;
          sent_at: string;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          thread_id: string;
          sender_id: string;
          body: string;
          sent_at?: string;
          read_at?: string | null;
        };
        Update: {
          id?: string;
          thread_id?: string;
          sender_id?: string;
          body?: string;
          sent_at?: string;
          read_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "community_messages_thread_id_fkey";
            columns: ["thread_id"];
            isOneToOne: false;
            referencedRelation: "community_message_threads";
            referencedColumns: ["id"];
          },
        ];
      };
      client_appointments: {
        Row: {
          id: string;
          client_id: string;
          owner_id: string;
          title: string;
          start_date: string;
          start_time: string | null;
          duration_minutes: number;
          time_zone: string;
          location_type: string;
          location: string;
          description: string;
          google_event_id: string | null;
          google_calendar_id: string | null;
          sync_status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          owner_id: string;
          title?: string;
          start_date: string;
          start_time?: string | null;
          duration_minutes?: number;
          time_zone?: string;
          location_type?: string;
          location?: string;
          description?: string;
          google_event_id?: string | null;
          google_calendar_id?: string | null;
          sync_status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          owner_id?: string;
          title?: string;
          start_date?: string;
          start_time?: string | null;
          duration_minutes?: number;
          time_zone?: string;
          location_type?: string;
          location?: string;
          description?: string;
          google_event_id?: string | null;
          google_calendar_id?: string | null;
          sync_status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_appointments_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
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
      platform_settings: {
        Row: {
          id: string;
          brand_primary: string;
          brand_accent: string;
          logo_url: string;
          terms_of_service: string;
          privacy_policy: string;
          contact_email: string;
          contact_phone: string;
          contact_note: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          brand_primary?: string;
          brand_accent?: string;
          logo_url?: string;
          terms_of_service?: string;
          privacy_policy?: string;
          contact_email?: string;
          contact_phone?: string;
          contact_note?: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          brand_primary?: string;
          brand_accent?: string;
          logo_url?: string;
          terms_of_service?: string;
          privacy_policy?: string;
          contact_email?: string;
          contact_phone?: string;
          contact_note?: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      system_activity_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          category: "login" | "analysis" | "pdf" | "ai" | "admin" | "other";
          action: string;
          target_type: string | null;
          target_id: string | null;
          summary: string;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          category: "login" | "analysis" | "pdf" | "ai" | "admin" | "other";
          action: string;
          target_type?: string | null;
          target_id?: string | null;
          summary?: string;
          payload?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          category?: "login" | "analysis" | "pdf" | "ai" | "admin" | "other";
          action?: string;
          target_type?: string | null;
          target_id?: string | null;
          summary?: string;
          payload?: Json;
          created_at?: string;
        };
        Relationships: [];
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
      is_community_member: { Args: Record<string, never>; Returns: boolean };
      create_client_with_profile: {
        Args: {
          p_name: string;
          p_name_kana?: string | null;
          p_memo?: string | null;
          p_tags?: string[] | null;
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
      is_linked_client: {
        Args: { p_client_id: string };
        Returns: boolean;
      };
      claim_my_client_portal: {
        Args: Record<string, never>;
        Returns: Database["public"]["Tables"]["clients"]["Row"] | null;
      };
      link_client_portal_user: {
        Args: {
          p_client_id: string;
          p_email?: string | null;
          p_auth_user_id?: string | null;
        };
        Returns: Database["public"]["Tables"]["clients"]["Row"];
      };
      update_own_homework_checks: {
        Args: {
          p_analysis_id: string;
          p_goals: Json;
        };
        Returns: Json;
      };
      set_own_homework_completion: {
        Args: {
          p_homework_id: string;
          p_is_completed: boolean;
        };
        Returns: Database["public"]["Tables"]["client_homeworks"]["Row"];
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
