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
          role: "super_admin" | "admin" | "school" | "instructor" | "client" | "enterprise";
          avatar_url: string | null;
          client_message: string | null;
          last_login_at: string | null;
          beta_terms_accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          role?: "super_admin" | "admin" | "school" | "instructor" | "client" | "enterprise";
          avatar_url?: string | null;
          client_message?: string | null;
          last_login_at?: string | null;
          beta_terms_accepted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          display_name?: string | null;
          role?: "super_admin" | "admin" | "school" | "instructor" | "client" | "enterprise";
          avatar_url?: string | null;
          client_message?: string | null;
          last_login_at?: string | null;
          beta_terms_accepted_at?: string | null;
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
          age: number | null;
          start_date: string | null;
          next_follow_up_date: string | null;
          current_sleep_score: number | null;
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
          age?: number | null;
          start_date?: string | null;
          next_follow_up_date?: string | null;
          current_sleep_score?: number | null;
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
          age?: number | null;
          start_date?: string | null;
          next_follow_up_date?: string | null;
          current_sleep_score?: number | null;
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
      sleep_analyses: {
        Row: {
          id: string;
          client_id: string;
          instructor_id: string;
          analysis_date: string;
          sleep_data: Json;
          lifestyle_data: Json;
          analysis_result: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          instructor_id: string;
          analysis_date?: string;
          sleep_data?: Json;
          lifestyle_data?: Json;
          analysis_result?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          instructor_id?: string;
          analysis_date?: string;
          sleep_data?: Json;
          lifestyle_data?: Json;
          analysis_result?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sleep_analyses_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      sleep_journeys: {
        Row: {
          id: string;
          client_id: string;
          instructor_id: string;
          recorded_at: string;
          sleep_score: number | null;
          hrv: number | null;
          stress: number | null;
          achievement_rate: number | null;
          instructor_comment: string;
          next_goal: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          instructor_id: string;
          recorded_at?: string;
          sleep_score?: number | null;
          hrv?: number | null;
          stress?: number | null;
          achievement_rate?: number | null;
          instructor_comment?: string;
          next_goal?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          instructor_id?: string;
          recorded_at?: string;
          sleep_score?: number | null;
          hrv?: number | null;
          stress?: number | null;
          achievement_rate?: number | null;
          instructor_comment?: string;
          next_goal?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sleep_journeys_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      homework: {
        Row: {
          id: string;
          client_id: string;
          instructor_id: string;
          title: string;
          description: string;
          start_date: string;
          due_date: string;
          frequency: string;
          priority: string;
          status: string;
          progress: number;
          client_message: string;
          instructor_comment: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          instructor_id: string;
          title: string;
          description?: string;
          start_date?: string;
          due_date: string;
          frequency?: string;
          priority?: string;
          status?: string;
          progress?: number;
          client_message?: string;
          instructor_comment?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          instructor_id?: string;
          title?: string;
          description?: string;
          start_date?: string;
          due_date?: string;
          frequency?: string;
          priority?: string;
          status?: string;
          progress?: number;
          client_message?: string;
          instructor_comment?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "homework_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      follow_up_records: {
        Row: {
          id: string;
          client_id: string;
          instructor_id: string;
          follow_up_date: string;
          method: string;
          sleep_score: number | null;
          client_changes: string;
          instructor_notes: string;
          next_action: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          instructor_id: string;
          follow_up_date?: string;
          method?: string;
          sleep_score?: number | null;
          client_changes?: string;
          instructor_notes?: string;
          next_action?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          instructor_id?: string;
          follow_up_date?: string;
          method?: string;
          sleep_score?: number | null;
          client_changes?: string;
          instructor_notes?: string;
          next_action?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "follow_up_records_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          id: string;
          client_id: string;
          instructor_id: string;
          analysis_id: string | null;
          report_data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          instructor_id: string;
          analysis_id?: string | null;
          report_data?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          instructor_id?: string;
          analysis_id?: string | null;
          report_data?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reports_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_analysis_id_fkey";
            columns: ["analysis_id"];
            isOneToOne: false;
            referencedRelation: "sleep_analyses";
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
          category: string;
          media_type: string;
          media_url: string;
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
          category?: string;
          media_type?: string;
          media_url?: string;
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
          category?: string;
          media_type?: string;
          media_url?: string;
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
      client_messages: {
        Row: {
          id: string;
          client_id: string;
          instructor_id: string;
          sender_role: string;
          sender_id: string;
          body: string;
          read_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          instructor_id: string;
          sender_role: string;
          sender_id: string;
          body: string;
          read_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          instructor_id?: string;
          sender_role?: string;
          sender_id?: string;
          body?: string;
          read_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_messages_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      client_notifications: {
        Row: {
          id: string;
          client_id: string;
          kind: string;
          title: string;
          body: string;
          href: string;
          read_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          kind: string;
          title?: string;
          body?: string;
          href?: string;
          read_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          kind?: string;
          title?: string;
          body?: string;
          href?: string;
          read_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_notifications_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      client_goal_progress: {
        Row: {
          id: string;
          client_id: string;
          instructor_id: string | null;
          title: string;
          description: string;
          category: string;
          target_value: number | null;
          current_value: number | null;
          unit: string;
          progress_percent: number;
          status: string;
          starts_on: string | null;
          target_on: string | null;
          achieved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          instructor_id?: string | null;
          title: string;
          description?: string;
          category?: string;
          target_value?: number | null;
          current_value?: number | null;
          unit?: string;
          progress_percent?: number;
          status?: string;
          starts_on?: string | null;
          target_on?: string | null;
          achieved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          instructor_id?: string | null;
          title?: string;
          description?: string;
          category?: string;
          target_value?: number | null;
          current_value?: number | null;
          unit?: string;
          progress_percent?: number;
          status?: string;
          starts_on?: string | null;
          target_on?: string | null;
          achieved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_goal_progress_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      journey_stages: {
        Row: {
          id: string;
          stage_number: number;
          code: string;
          title: string;
          subtitle: string;
          description: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id: string;
          stage_number: number;
          code: string;
          title: string;
          subtitle: string;
          description?: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          stage_number?: number;
          code?: string;
          title?: string;
          subtitle?: string;
          description?: string;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      achievement_master: {
        Row: {
          id: string;
          code: string;
          title: string;
          description: string;
          category: string;
          icon_key: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id: string;
          code: string;
          title: string;
          description?: string;
          category?: string;
          icon_key?: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          title?: string;
          description?: string;
          category?: string;
          icon_key?: string;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      journey_progress: {
        Row: {
          id: string;
          client_id: string;
          instructor_id: string | null;
          current_stage_id: string;
          stage_status: string;
          achievement_rate: number;
          improvement_rate: number | null;
          streak_days: number;
          next_goal: string;
          score_trend: Json;
          entered_at: string | null;
          completed_at: string | null;
          last_synced_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          instructor_id?: string | null;
          current_stage_id: string;
          stage_status?: string;
          achievement_rate?: number;
          improvement_rate?: number | null;
          streak_days?: number;
          next_goal?: string;
          score_trend?: Json;
          entered_at?: string | null;
          completed_at?: string | null;
          last_synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          instructor_id?: string | null;
          current_stage_id?: string;
          stage_status?: string;
          achievement_rate?: number;
          improvement_rate?: number | null;
          streak_days?: number;
          next_goal?: string;
          score_trend?: Json;
          entered_at?: string | null;
          completed_at?: string | null;
          last_synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "journey_progress_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: true;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "journey_progress_current_stage_id_fkey";
            columns: ["current_stage_id"];
            isOneToOne: false;
            referencedRelation: "journey_stages";
            referencedColumns: ["id"];
          },
        ];
      };
      client_achievements: {
        Row: {
          id: string;
          client_id: string;
          achievement_id: string;
          unlocked_at: string;
          source: string;
          meta: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          achievement_id: string;
          unlocked_at?: string;
          source?: string;
          meta?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          achievement_id?: string;
          unlocked_at?: string;
          source?: string;
          meta?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_achievements_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_achievements_achievement_id_fkey";
            columns: ["achievement_id"];
            isOneToOne: false;
            referencedRelation: "achievement_master";
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
          portal_enabled: boolean;
          current_goal_summary: string;
          improvement_target_score: number | null;
          notification_prefs: Json;
          last_portal_seen_at: string | null;
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
          portal_enabled?: boolean;
          current_goal_summary?: string;
          improvement_target_score?: number | null;
          notification_prefs?: Json;
          last_portal_seen_at?: string | null;
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
          portal_enabled?: boolean;
          current_goal_summary?: string;
          improvement_target_score?: number | null;
          notification_prefs?: Json;
          last_portal_seen_at?: string | null;
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
          analysis_date: string | null;
          sleep_score: number | null;
          sleep_duration: number | null;
          sleep_efficiency: number | null;
          deep_sleep: number | null;
          awakenings: number | null;
          sleep_latency: number | null;
          spo2: number | null;
          hrv: number | null;
          resting_heart_rate: number | null;
          sleep_onset_time: string | null;
          wake_time: string | null;
          skin_temperature_value: string | null;
          skin_temperature_type: string | null;
          skin_temperature_unit: string;
          stress_average: string | null;
          stress_level: string | null;
          stress_series: Json;
          ocr_source_images: Json;
          ocr_confidence: Json;
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
          analysis_date?: string | null;
          sleep_score?: number | null;
          sleep_duration?: number | null;
          sleep_efficiency?: number | null;
          deep_sleep?: number | null;
          awakenings?: number | null;
          sleep_latency?: number | null;
          spo2?: number | null;
          hrv?: number | null;
          resting_heart_rate?: number | null;
          sleep_onset_time?: string | null;
          wake_time?: string | null;
          skin_temperature_value?: string | null;
          skin_temperature_type?: string | null;
          skin_temperature_unit?: string;
          stress_average?: string | null;
          stress_level?: string | null;
          stress_series?: Json;
          ocr_source_images?: Json;
          ocr_confidence?: Json;
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
          analysis_date?: string | null;
          sleep_score?: number | null;
          sleep_duration?: number | null;
          sleep_efficiency?: number | null;
          deep_sleep?: number | null;
          awakenings?: number | null;
          sleep_latency?: number | null;
          spo2?: number | null;
          hrv?: number | null;
          resting_heart_rate?: number | null;
          sleep_onset_time?: string | null;
          wake_time?: string | null;
          skin_temperature_value?: string | null;
          skin_temperature_type?: string | null;
          skin_temperature_unit?: string;
          stress_average?: string | null;
          stress_level?: string | null;
          stress_series?: Json;
          ocr_source_images?: Json;
          ocr_confidence?: Json;
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
      beta_feedback: {
        Row: {
          id: string;
          user_id: string;
          user_email: string | null;
          user_display_name: string | null;
          category: string;
          target_screen: string;
          severity: string;
          content: string;
          reproduction_steps: string;
          device: string;
          browser: string;
          current_url: string;
          screen_name: string;
          device_type: string;
          browser_info: string;
          app_version: string;
          usability_rating: number | null;
          priority: string;
          status: string;
          admin_memo: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          user_email?: string | null;
          user_display_name?: string | null;
          category: string;
          target_screen: string;
          severity?: string;
          content: string;
          reproduction_steps?: string;
          device?: string;
          browser?: string;
          current_url?: string;
          screen_name?: string;
          device_type?: string;
          browser_info?: string;
          app_version?: string;
          usability_rating?: number | null;
          priority?: string;
          status?: string;
          admin_memo?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          user_email?: string | null;
          user_display_name?: string | null;
          category?: string;
          target_screen?: string;
          severity?: string;
          content?: string;
          reproduction_steps?: string;
          device?: string;
          browser?: string;
          current_url?: string;
          screen_name?: string;
          device_type?: string;
          browser_info?: string;
          app_version?: string;
          usability_rating?: number | null;
          priority?: string;
          status?: string;
          admin_memo?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "beta_feedback_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      release_notes: {
        Row: {
          id: string;
          version: string;
          released_at: string;
          title: string;
          changes: Json;
          improvements: Json;
          is_current: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          version: string;
          released_at: string;
          title: string;
          changes?: Json;
          improvements?: Json;
          is_current?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          version?: string;
          released_at?: string;
          title?: string;
          changes?: Json;
          improvements?: Json;
          is_current?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      usage_statistics: {
        Row: {
          id: string;
          period_label: string;
          average_session_minutes: number;
          mobile_share_percent: number;
          pc_share_percent: number;
          tablet_share_percent: number;
          top_screens: Json;
          drop_off_points: Json;
          is_mock: boolean;
          captured_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          period_label?: string;
          average_session_minutes?: number;
          mobile_share_percent?: number;
          pc_share_percent?: number;
          tablet_share_percent?: number;
          top_screens?: Json;
          drop_off_points?: Json;
          is_mock?: boolean;
          captured_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          period_label?: string;
          average_session_minutes?: number;
          mobile_share_percent?: number;
          pc_share_percent?: number;
          tablet_share_percent?: number;
          top_screens?: Json;
          drop_off_points?: Json;
          is_mock?: boolean;
          captured_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      system_health: {
        Row: {
          id: string;
          component_id: string;
          label: string;
          status: string;
          detail: string;
          latency_ms: number | null;
          sort_order: number;
          checked_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          component_id: string;
          label: string;
          status?: string;
          detail?: string;
          latency_ms?: number | null;
          sort_order?: number;
          checked_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          component_id?: string;
          label?: string;
          status?: string;
          detail?: string;
          latency_ms?: number | null;
          sort_order?: number;
          checked_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      roadmap_items: {
        Row: {
          id: string;
          horizon: string;
          version_label: string;
          title: string;
          summary: string;
          status: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          horizon: string;
          version_label: string;
          title: string;
          summary?: string;
          status?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          horizon?: string;
          version_label?: string;
          title?: string;
          summary?: string;
          status?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      licenses: {
        Row: {
          id: string;
          user_id: string;
          user_email: string | null;
          user_display_name: string | null;
          license_number: string;
          certification_level: string;
          certified_at: string;
          expires_at: string;
          status: string;
          status_history: Json;
          admin_memo: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          user_email?: string | null;
          user_display_name?: string | null;
          license_number: string;
          certification_level: string;
          certified_at: string;
          expires_at: string;
          status?: string;
          status_history?: Json;
          admin_memo?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          user_email?: string | null;
          user_display_name?: string | null;
          license_number?: string;
          certification_level?: string;
          certified_at?: string;
          expires_at?: string;
          status?: string;
          status_history?: Json;
          admin_memo?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "licenses_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          license_id: string | null;
          plan: string;
          billing_cycle: string;
          monthly_amount: number;
          yearly_amount: number;
          status: string;
          current_period_start: string;
          current_period_end: string;
          next_renewal_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          license_id?: string | null;
          plan: string;
          billing_cycle?: string;
          monthly_amount?: number;
          yearly_amount?: number;
          status?: string;
          current_period_start: string;
          current_period_end: string;
          next_renewal_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          license_id?: string | null;
          plan?: string;
          billing_cycle?: string;
          monthly_amount?: number;
          yearly_amount?: number;
          status?: string;
          current_period_start?: string;
          current_period_end?: string;
          next_renewal_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_license_id_fkey";
            columns: ["license_id"];
            isOneToOne: false;
            referencedRelation: "licenses";
            referencedColumns: ["id"];
          },
        ];
      };
      certificates: {
        Row: {
          id: string;
          user_id: string;
          license_id: string;
          certificate_number: string;
          holder_name: string;
          issued_at: string;
          verification_code: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          license_id: string;
          certificate_number: string;
          holder_name?: string;
          issued_at: string;
          verification_code: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          license_id?: string;
          certificate_number?: string;
          holder_name?: string;
          issued_at?: string;
          verification_code?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "certificates_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "certificates_license_id_fkey";
            columns: ["license_id"];
            isOneToOne: false;
            referencedRelation: "licenses";
            referencedColumns: ["id"];
          },
        ];
      };
      continuing_education: {
        Row: {
          id: string;
          user_id: string;
          license_id: string;
          hours_completed: number;
          credits_earned: number;
          required_hours: number;
          renewal_requirement: string;
          period_start: string;
          period_end: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          license_id: string;
          hours_completed?: number;
          credits_earned?: number;
          required_hours?: number;
          renewal_requirement?: string;
          period_start: string;
          period_end: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          license_id?: string;
          hours_completed?: number;
          credits_earned?: number;
          required_hours?: number;
          renewal_requirement?: string;
          period_start?: string;
          period_end?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "continuing_education_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "continuing_education_license_id_fkey";
            columns: ["license_id"];
            isOneToOne: false;
            referencedRelation: "licenses";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_history: {
        Row: {
          id: string;
          user_id: string;
          subscription_id: string | null;
          amount: number;
          currency: string;
          paid_at: string;
          method: string;
          description: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subscription_id?: string | null;
          amount?: number;
          currency?: string;
          paid_at?: string;
          method?: string;
          description?: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subscription_id?: string | null;
          amount?: number;
          currency?: string;
          paid_at?: string;
          method?: string;
          description?: string;
          status?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_history_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_history_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
          },
        ];
      };
      certification_levels: {
        Row: {
          id: string;
          label: string;
          label_en: string;
          sort_order: number;
          description: string;
          renewal_months: number;
          ce_hours_required: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          label: string;
          label_en?: string;
          sort_order?: number;
          description?: string;
          renewal_months?: number;
          ce_hours_required?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          label?: string;
          label_en?: string;
          sort_order?: number;
          description?: string;
          renewal_months?: number;
          ce_hours_required?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      certified_schools: {
        Row: {
          id: string;
          code: string;
          name: string;
          name_kana: string;
          region: string;
          prefecture: string;
          address: string;
          representative_name: string;
          contact_email: string;
          contact_phone: string;
          status: string;
          certified_at: string;
          admin_memo: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          name_kana?: string;
          region?: string;
          prefecture?: string;
          address?: string;
          representative_name?: string;
          contact_email?: string;
          contact_phone?: string;
          status?: string;
          certified_at?: string;
          admin_memo?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          name_kana?: string;
          region?: string;
          prefecture?: string;
          address?: string;
          representative_name?: string;
          contact_email?: string;
          contact_phone?: string;
          status?: string;
          certified_at?: string;
          admin_memo?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      certified_instructors: {
        Row: {
          id: string;
          user_id: string;
          school_id: string | null;
          level_id: string;
          instructor_number: string;
          display_name: string;
          email: string;
          status: string;
          certified_at: string;
          renews_at: string;
          usage_start_date: string | null;
          suspended_at: string | null;
          withdrawn_at: string | null;
          last_renewed_at: string | null;
          status_history: Json;
          admin_memo: string;
          created_at: string;
          updated_at: string;
          profile_image_url: string | null;
          public_display_name: string;
          legal_name: string;
          show_legal_name: boolean;
          headline: string;
          bio: string;
          career: string;
          activity_area: string;
          service_area: string;
          online_available: boolean;
          yoga_specialties: string[];
          pilates_specialties: string[];
          specialties: string[];
          available_programs: string[];
          instagram_url: string;
          website_url: string;
          contact_email: string;
          is_public: boolean;
          recommendation_note: string;
          display_order: number;
          profile_updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          school_id?: string | null;
          level_id: string;
          instructor_number: string;
          display_name?: string;
          email?: string;
          status?: string;
          certified_at: string;
          renews_at: string;
          usage_start_date?: string | null;
          suspended_at?: string | null;
          withdrawn_at?: string | null;
          last_renewed_at?: string | null;
          status_history?: Json;
          admin_memo?: string;
          created_at?: string;
          updated_at?: string;
          profile_image_url?: string | null;
          public_display_name?: string;
          legal_name?: string;
          show_legal_name?: boolean;
          headline?: string;
          bio?: string;
          career?: string;
          activity_area?: string;
          service_area?: string;
          online_available?: boolean;
          yoga_specialties?: string[];
          pilates_specialties?: string[];
          specialties?: string[];
          available_programs?: string[];
          instagram_url?: string;
          website_url?: string;
          contact_email?: string;
          is_public?: boolean;
          recommendation_note?: string;
          display_order?: number;
          profile_updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          school_id?: string | null;
          level_id?: string;
          instructor_number?: string;
          display_name?: string;
          email?: string;
          status?: string;
          certified_at?: string;
          renews_at?: string;
          usage_start_date?: string | null;
          suspended_at?: string | null;
          withdrawn_at?: string | null;
          last_renewed_at?: string | null;
          status_history?: Json;
          admin_memo?: string;
          created_at?: string;
          updated_at?: string;
          profile_image_url?: string | null;
          public_display_name?: string;
          legal_name?: string;
          show_legal_name?: boolean;
          headline?: string;
          bio?: string;
          career?: string;
          activity_area?: string;
          service_area?: string;
          online_available?: boolean;
          yoga_specialties?: string[];
          pilates_specialties?: string[];
          specialties?: string[];
          available_programs?: string[];
          instagram_url?: string;
          website_url?: string;
          contact_email?: string;
          is_public?: boolean;
          recommendation_note?: string;
          display_order?: number;
          profile_updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "certified_instructors_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "certified_instructors_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "certified_schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "certified_instructors_level_id_fkey";
            columns: ["level_id"];
            isOneToOne: false;
            referencedRelation: "certification_levels";
            referencedColumns: ["id"];
          },
        ];
      };
      instructor_licenses: {
        Row: {
          id: string;
          instructor_id: string;
          certification_level_id: string;
          certification_name: string;
          license_number: string;
          issued_at: string;
          expires_at: string;
          status: string;
          required_education_hours: number;
          completed_education_hours: number;
          renewal_status: string;
          renewal_requested_at: string | null;
          admin_note: string;
          verification_code: string;
          issuer_name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          instructor_id: string;
          certification_level_id: string;
          certification_name?: string;
          license_number: string;
          issued_at: string;
          expires_at: string;
          status?: string;
          required_education_hours?: number;
          completed_education_hours?: number;
          renewal_status?: string;
          renewal_requested_at?: string | null;
          admin_note?: string;
          verification_code?: string;
          issuer_name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          instructor_id?: string;
          certification_level_id?: string;
          certification_name?: string;
          license_number?: string;
          issued_at?: string;
          expires_at?: string;
          status?: string;
          required_education_hours?: number;
          completed_education_hours?: number;
          renewal_status?: string;
          renewal_requested_at?: string | null;
          admin_note?: string;
          verification_code?: string;
          issuer_name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "instructor_licenses_instructor_id_fkey";
            columns: ["instructor_id"];
            isOneToOne: true;
            referencedRelation: "certified_instructors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "instructor_licenses_certification_level_id_fkey";
            columns: ["certification_level_id"];
            isOneToOne: false;
            referencedRelation: "certification_levels";
            referencedColumns: ["id"];
          },
        ];
      };
      school_courses: {
        Row: {
          id: string;
          school_id: string;
          title: string;
          course_type: string;
          level_id: string | null;
          starts_on: string | null;
          ends_on: string | null;
          capacity: number;
          enrolled_count: number;
          completed_count: number;
          status: string;
          instructor_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          title: string;
          course_type?: string;
          level_id?: string | null;
          starts_on?: string | null;
          ends_on?: string | null;
          capacity?: number;
          enrolled_count?: number;
          completed_count?: number;
          status?: string;
          instructor_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          title?: string;
          course_type?: string;
          level_id?: string | null;
          starts_on?: string | null;
          ends_on?: string | null;
          capacity?: number;
          enrolled_count?: number;
          completed_count?: number;
          status?: string;
          instructor_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "school_courses_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "certified_schools";
            referencedColumns: ["id"];
          },
        ];
      };
      school_students: {
        Row: {
          id: string;
          school_id: string;
          course_id: string | null;
          display_name: string;
          email: string;
          status: string;
          enrolled_at: string;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          course_id?: string | null;
          display_name: string;
          email?: string;
          status?: string;
          enrolled_at?: string;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          course_id?: string | null;
          display_name?: string;
          email?: string;
          status?: string;
          enrolled_at?: string;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "school_students_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "certified_schools";
            referencedColumns: ["id"];
          },
        ];
      };
      ops_notifications: {
        Row: {
          id: string;
          kind: string;
          audience: string;
          title: string;
          body: string;
          href: string | null;
          published_at: string;
          expires_at: string | null;
          is_pinned: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          kind: string;
          audience?: string;
          title: string;
          body?: string;
          href?: string | null;
          published_at?: string;
          expires_at?: string | null;
          is_pinned?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          kind?: string;
          audience?: string;
          title?: string;
          body?: string;
          href?: string | null;
          published_at?: string;
          expires_at?: string | null;
          is_pinned?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ops_events: {
        Row: {
          id: string;
          title: string;
          event_type: string;
          region: string;
          starts_at: string;
          ends_at: string | null;
          capacity: number;
          registered_count: number;
          status: string;
          school_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          event_type?: string;
          region?: string;
          starts_at: string;
          ends_at?: string | null;
          capacity?: number;
          registered_count?: number;
          status?: string;
          school_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          event_type?: string;
          region?: string;
          starts_at?: string;
          ends_at?: string | null;
          capacity?: number;
          registered_count?: number;
          status?: string;
          school_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ops_events_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "certified_schools";
            referencedColumns: ["id"];
          },
        ];
      };
      beta_instructor_invitations: {
        Row: {
          id: string;
          code: string;
          instructor_name: string;
          instructor_email: string;
          start_date: string;
          status: string;
          email_subject: string;
          email_body: string;
          terms_required: boolean;
          terms_accepted_at: string | null;
          sent_at: string | null;
          accepted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          instructor_name: string;
          instructor_email: string;
          start_date: string;
          status?: string;
          email_subject?: string;
          email_body?: string;
          terms_required?: boolean;
          terms_accepted_at?: string | null;
          sent_at?: string | null;
          accepted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          instructor_name?: string;
          instructor_email?: string;
          start_date?: string;
          status?: string;
          email_subject?: string;
          email_body?: string;
          terms_required?: boolean;
          terms_accepted_at?: string | null;
          sent_at?: string | null;
          accepted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      feature_requests: {
        Row: {
          id: string;
          title: string;
          description: string;
          category: string;
          priority: string;
          vote_count: number;
          status: string;
          planned_for: string | null;
          submitted_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string;
          category?: string;
          priority?: string;
          vote_count?: number;
          status?: string;
          planned_for?: string | null;
          submitted_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          category?: string;
          priority?: string;
          vote_count?: number;
          status?: string;
          planned_for?: string | null;
          submitted_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      bug_reports: {
        Row: {
          id: string;
          title: string;
          description: string;
          severity: string;
          status: string;
          reporter_name: string;
          affected_screen: string;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string;
          severity?: string;
          status?: string;
          reporter_name?: string;
          affected_screen?: string;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          severity?: string;
          status?: string;
          reporter_name?: string;
          affected_screen?: string;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      weekly_reports: {
        Row: {
          id: string;
          week_label: string;
          week_start: string;
          week_end: string;
          achievements: Json;
          challenges: Json;
          improvement_proposals: Json;
          is_mock: boolean;
          generated_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          week_label: string;
          week_start: string;
          week_end: string;
          achievements?: Json;
          challenges?: Json;
          improvement_proposals?: Json;
          is_mock?: boolean;
          generated_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          week_label?: string;
          week_start?: string;
          week_end?: string;
          achievements?: Json;
          challenges?: Json;
          improvement_proposals?: Json;
          is_mock?: boolean;
          generated_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      beta_metrics: {
        Row: {
          id: string;
          period_label: string;
          active_certified_instructors: number;
          active_clients: number;
          weekly_analysis_count: number;
          average_continuation_rate: number;
          average_improvement_rate: number;
          feedback_response_rate: number;
          weekly_new_registrations: number;
          weekly_series: Json;
          captured_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          period_label?: string;
          active_certified_instructors?: number;
          active_clients?: number;
          weekly_analysis_count?: number;
          average_continuation_rate?: number;
          average_improvement_rate?: number;
          feedback_response_rate?: number;
          weekly_new_registrations?: number;
          weekly_series?: Json;
          captured_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          period_label?: string;
          active_certified_instructors?: number;
          active_clients?: number;
          weekly_analysis_count?: number;
          average_continuation_rate?: number;
          average_improvement_rate?: number;
          feedback_response_rate?: number;
          weekly_new_registrations?: number;
          weekly_series?: Json;
          captured_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      product_backlog: {
        Row: {
          id: string;
          title: string;
          summary: string;
          status: string;
          priority: string;
          module: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          summary?: string;
          status?: string;
          priority?: string;
          module?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          summary?: string;
          status?: string;
          priority?: string;
          module?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      invitations: {
        Row: {
          id: string;
          code: string;
          instructor_id: string;
          instructor_email: string | null;
          instructor_name: string | null;
          client_name: string;
          client_email: string;
          client_id: string | null;
          status: string;
          email_subject: string;
          email_body: string;
          expires_at: string;
          sent_at: string | null;
          accepted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          instructor_id: string;
          instructor_email?: string | null;
          instructor_name?: string | null;
          client_name: string;
          client_email: string;
          client_id?: string | null;
          status?: string;
          email_subject?: string;
          email_body?: string;
          expires_at: string;
          sent_at?: string | null;
          accepted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          instructor_id?: string;
          instructor_email?: string | null;
          instructor_name?: string | null;
          client_name?: string;
          client_email?: string;
          client_id?: string | null;
          status?: string;
          email_subject?: string;
          email_body?: string;
          expires_at?: string;
          sent_at?: string | null;
          accepted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invitations_instructor_id_fkey";
            columns: ["instructor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          actor_email: string | null;
          actor_role: string | null;
          action: string;
          resource_type: string | null;
          resource_id: string | null;
          summary: string;
          payload: Json;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          actor_email?: string | null;
          actor_role?: string | null;
          action: string;
          resource_type?: string | null;
          resource_id?: string | null;
          summary?: string;
          payload?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          actor_email?: string | null;
          actor_role?: string | null;
          action?: string;
          resource_type?: string | null;
          resource_id?: string | null;
          summary?: string;
          payload?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      commercial_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          user_email: string | null;
          user_display_name: string | null;
          plan_id: string;
          status: string;
          billing_cycle: string;
          current_period_end: string | null;
          mock_note: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          user_email?: string | null;
          user_display_name?: string | null;
          plan_id: string;
          status?: string;
          billing_cycle?: string;
          current_period_end?: string | null;
          mock_note?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          user_email?: string | null;
          user_display_name?: string | null;
          plan_id?: string;
          status?: string;
          billing_cycle?: string;
          current_period_end?: string | null;
          mock_note?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "commercial_subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      evidence_session_surveys: {
        Row: {
          id: string;
          anonymous_key: string;
          analysis_id: string | null;
          client_anonymous_key: string | null;
          satisfaction: number;
          understanding: number;
          homework_likelihood: number;
          next_appointment: string;
          free_comment: string;
          app_version: string;
          submitted_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          anonymous_key: string;
          analysis_id?: string | null;
          client_anonymous_key?: string | null;
          satisfaction: number;
          understanding: number;
          homework_likelihood: number;
          next_appointment?: string;
          free_comment?: string;
          app_version?: string;
          submitted_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          anonymous_key?: string;
          analysis_id?: string | null;
          client_anonymous_key?: string | null;
          satisfaction?: number;
          understanding?: number;
          homework_likelihood?: number;
          next_appointment?: string;
          free_comment?: string;
          app_version?: string;
          submitted_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      evidence_morning_surveys: {
        Row: {
          id: string;
          anonymous_key: string;
          survey_date: string;
          sleep_satisfaction: number;
          morning_mood: number;
          daytime_condition: number;
          free_comment: string;
          app_version: string;
          submitted_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          anonymous_key: string;
          survey_date: string;
          sleep_satisfaction: number;
          morning_mood: number;
          daytime_condition: number;
          free_comment?: string;
          app_version?: string;
          submitted_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          anonymous_key?: string;
          survey_date?: string;
          sleep_satisfaction?: number;
          morning_mood?: number;
          daytime_condition?: number;
          free_comment?: string;
          app_version?: string;
          submitted_at?: string;
          created_at?: string;
        };
        Relationships: [];
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
      ensure_my_certified_instructor: {
        Args: Record<string, never>;
        Returns: Database["public"]["Tables"]["certified_instructors"]["Row"];
      };
      get_my_instructor_license_bundle: {
        Args: Record<string, never>;
        Returns: Json;
      };
      request_instructor_license_renewal: {
        Args: { p_license_id: string };
        Returns: Database["public"]["Tables"]["instructor_licenses"]["Row"];
      };
      verify_instructor_license: {
        Args: { p_code: string };
        Returns: {
          license_number: string;
          certification_name: string;
          holder_name: string;
          issued_at: string;
          expires_at: string;
          status: string;
          issuer_name: string;
        }[];
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
      peek_invitation_by_code: {
        Args: { p_code: string };
        Returns: Database["public"]["Tables"]["invitations"]["Row"][];
      };
      accept_invitation_by_code: {
        Args: {
          p_code: string;
          p_client_id?: string | null;
        };
        Returns: Database["public"]["Tables"]["invitations"]["Row"];
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
