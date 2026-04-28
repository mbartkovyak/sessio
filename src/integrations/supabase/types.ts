Initialising login role...
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      _config: {
        Row: {
          key: string
          value: string | null
        }
        Insert: {
          key: string
          value?: string | null
        }
        Update: {
          key?: string
          value?: string | null
        }
        Relationships: []
      }
      abonament_types: {
        Row: {
          created_at: string
          currency: string
          duration_days: number | null
          id: string
          is_active: boolean
          name: string
          price: number | null
          school_id: string
          sessions_count: number | null
        }
        Insert: {
          created_at?: string
          currency?: string
          duration_days?: number | null
          id?: string
          is_active?: boolean
          name: string
          price?: number | null
          school_id: string
          sessions_count?: number | null
        }
        Update: {
          created_at?: string
          currency?: string
          duration_days?: number | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number | null
          school_id?: string
          sessions_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "abonament_types_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      abonament_usage: {
        Row: {
          created_at: string
          id: string
          player_abonament_id: string
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          player_abonament_id: string
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          player_abonament_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "abonament_usage_player_abonament_id_fkey"
            columns: ["player_abonament_id"]
            isOneToOne: false
            referencedRelation: "player_abonaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abonament_usage_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          hidden: boolean
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          hidden?: boolean
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          hidden?: boolean
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          training_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          training_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          training_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: true
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      favourite_schools: {
        Row: {
          created_at: string
          id: string
          school_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          school_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          school_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favourite_schools_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      join_requests: {
        Row: {
          created_at: string
          id: string
          status: string
          training_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          training_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          training_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "join_requests_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_abonaments: {
        Row: {
          abonament_type_id: string
          activated_at: string | null
          created_at: string
          expires_at: string | null
          id: string
          player_id: string
          school_id: string
          sessions_remaining: number | null
          sessions_total: number | null
          status: string
        }
        Insert: {
          abonament_type_id: string
          activated_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          player_id: string
          school_id: string
          sessions_remaining?: number | null
          sessions_total?: number | null
          status?: string
        }
        Update: {
          abonament_type_id?: string
          activated_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          player_id?: string
          school_id?: string
          sessions_remaining?: number | null
          sessions_total?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_abonaments_abonament_type_id_fkey"
            columns: ["abonament_type_id"]
            isOneToOne: false
            referencedRelation: "abonament_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_abonaments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_abonaments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string
          first_name: string | null
          full_name: string | null
          id: string
          is_placeholder: boolean
          language: string | null
          last_name: string | null
          onboarding_complete: boolean | null
          phone: string | null
          preferred_sports: string[] | null
          primary_goal: string | null
          questionnaire_complete: boolean
          role: string | null
          school_id: string | null
          setup_guide_dismissed: boolean
          sport: string | null
          venues: Json | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          full_name?: string | null
          id: string
          is_placeholder?: boolean
          language?: string | null
          last_name?: string | null
          onboarding_complete?: boolean | null
          phone?: string | null
          preferred_sports?: string[] | null
          primary_goal?: string | null
          questionnaire_complete?: boolean
          role?: string | null
          school_id?: string | null
          setup_guide_dismissed?: boolean
          sport?: string | null
          venues?: Json | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_placeholder?: boolean
          language?: string | null
          last_name?: string | null
          onboarding_complete?: boolean | null
          phone?: string | null
          preferred_sports?: string[] | null
          primary_goal?: string | null
          questionnaire_complete?: boolean
          role?: string | null
          school_id?: string | null
          setup_guide_dismissed?: boolean
          sport?: string | null
          venues?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string
          device_id: string
          id: string
          last_seen_at: string
          platform: string
          target: string
          transport: string
          updated_at: string
          user_id: string
          web_keys: Json | null
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: string
          last_seen_at?: string
          platform: string
          target: string
          transport: string
          updated_at?: string
          user_id: string
          web_keys?: Json | null
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: string
          last_seen_at?: string
          platform?: string
          target?: string
          transport?: string
          updated_at?: string
          user_id?: string
          web_keys?: Json | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          coach_id: string
          coach_response: string | null
          created_at: string
          id: string
          rating: number
          reviewer_id: string
          text: string | null
          training_id: string | null
        }
        Insert: {
          coach_id: string
          coach_response?: string | null
          created_at?: string
          id?: string
          rating: number
          reviewer_id: string
          text?: string | null
          training_id?: string | null
        }
        Update: {
          coach_id?: string
          coach_response?: string | null
          created_at?: string
          id?: string
          rating?: number
          reviewer_id?: string
          text?: string | null
          training_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      school_members: {
        Row: {
          coach_id: string
          id: string
          joined_at: string
          school_id: string
          status: string
        }
        Insert: {
          coach_id: string
          id?: string
          joined_at?: string
          school_id: string
          status?: string
        }
        Update: {
          coach_id?: string
          id?: string
          joined_at?: string
          school_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_members_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_members_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          description: string | null
          id: string
          invite_code: string
          is_listed: boolean
          logo_url: string | null
          name: string
          owner_id: string
          sport: string[] | null
          updated_at: string
          venues: Json | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          invite_code?: string
          is_listed?: boolean
          logo_url?: string | null
          name: string
          owner_id: string
          sport?: string[] | null
          updated_at?: string
          venues?: Json | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          invite_code?: string
          is_listed?: boolean
          logo_url?: string | null
          name?: string
          owner_id?: string
          sport?: string[] | null
          updated_at?: string
          venues?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "schools_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_attendance: {
        Row: {
          confirmed_at: string | null
          created_at: string
          declined_at: string | null
          id: string
          reminder_count: number
          reminder_sent_at: string | null
          session_id: string
          status: string
          user_id: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          declined_at?: string | null
          id?: string
          reminder_count?: number
          reminder_sent_at?: string | null
          session_id: string
          status?: string
          user_id: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          declined_at?: string | null
          id?: string
          reminder_count?: number
          reminder_sent_at?: string | null
          session_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_members: {
        Row: {
          id: string
          joined_at: string
          role: string
          training_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string
          training_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          training_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_members_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_open_spots: {
        Row: {
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          id: string
          session_id: string
          status: string
          training_id: string
        }
        Insert: {
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          id?: string
          session_id: string
          status?: string
          training_id: string
        }
        Update: {
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          id?: string
          session_id?: string
          status?: string
          training_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_open_spots_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_open_spots_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_open_spots_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sessions: {
        Row: {
          attendance_marked_at: string | null
          attendance_reminder_sent: boolean
          created_at: string
          end_time: string
          id: string
          notes: string | null
          session_date: string
          start_time: string
          status: string
          training_id: string
        }
        Insert: {
          attendance_marked_at?: string | null
          attendance_reminder_sent?: boolean
          created_at?: string
          end_time: string
          id?: string
          notes?: string | null
          session_date: string
          start_time: string
          status?: string
          training_id: string
        }
        Update: {
          attendance_marked_at?: string | null
          attendance_reminder_sent?: boolean
          created_at?: string
          end_time?: string
          id?: string
          notes?: string | null
          session_date?: string
          start_time?: string
          status?: string
          training_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      trainings: {
        Row: {
          allow_waitlist: boolean
          booking_mode: string
          cancel_deadline_hours: number
          cancel_enabled: boolean
          coach_id: string
          confirmation_window_hours: number | null
          created_at: string
          day_of_week: number
          day_schedules: Json | null
          days_of_week: number[] | null
          drop_in_policy: string
          end_date: string | null
          end_time: string
          id: string
          invite_code: string
          is_active: boolean
          is_recurring: boolean | null
          max_players: number | null
          name: string
          no_response_behavior: string
          notification_channel: string
          recurrence_pattern: string
          school_id: string | null
          sport: string
          start_date: string | null
          start_time: string
          type: string
          updated_at: string
          venue: string
          visibility: string
        }
        Insert: {
          allow_waitlist?: boolean
          booking_mode?: string
          cancel_deadline_hours?: number
          cancel_enabled?: boolean
          coach_id: string
          confirmation_window_hours?: number | null
          created_at?: string
          day_of_week: number
          day_schedules?: Json | null
          days_of_week?: number[] | null
          drop_in_policy?: string
          end_date?: string | null
          end_time: string
          id?: string
          invite_code?: string
          is_active?: boolean
          is_recurring?: boolean | null
          max_players?: number | null
          name: string
          no_response_behavior?: string
          notification_channel?: string
          recurrence_pattern?: string
          school_id?: string | null
          sport: string
          start_date?: string | null
          start_time: string
          type?: string
          updated_at?: string
          venue: string
          visibility?: string
        }
        Update: {
          allow_waitlist?: boolean
          booking_mode?: string
          cancel_deadline_hours?: number
          cancel_enabled?: boolean
          coach_id?: string
          confirmation_window_hours?: number | null
          created_at?: string
          day_of_week?: number
          day_schedules?: Json | null
          days_of_week?: number[] | null
          drop_in_policy?: string
          end_date?: string | null
          end_time?: string
          id?: string
          invite_code?: string
          is_active?: boolean
          is_recurring?: boolean | null
          max_players?: number | null
          name?: string
          no_response_behavior?: string
          notification_channel?: string
          recurrence_pattern?: string
          school_id?: string | null
          sport?: string
          start_date?: string | null
          start_time?: string
          type?: string
          updated_at?: string
          venue?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainings_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_deduct_session: { Args: { p_session_id: string }; Returns: number }
      claim_spot: {
        Args: { p_player_id: string; p_spot_id: string }
        Returns: Json
      }
      claim_training_spot: {
        Args: { p_player_id: string; p_spot_id: string }
        Returns: Json
      }
      create_placeholder_athlete: {
        Args: {
          p_email?: string
          p_first_name: string
          p_last_name: string
          p_phone?: string
          p_school_id: string
        }
        Returns: string
      }
      deduct_abonament_session: {
        Args: { p_player_abonament_id: string; p_session_id: string }
        Returns: undefined
      }
      delete_my_account: { Args: never; Returns: undefined }
      delete_orphan_sessions: {
        Args: { p_removed_isodows: number[]; p_training_id: string }
        Returns: number
      }
      ensure_my_profile: {
        Args: never
        Returns: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string
          first_name: string | null
          full_name: string | null
          id: string
          is_placeholder: boolean
          language: string | null
          last_name: string | null
          onboarding_complete: boolean | null
          phone: string | null
          preferred_sports: string[] | null
          primary_goal: string | null
          questionnaire_complete: boolean
          role: string | null
          school_id: string | null
          setup_guide_dismissed: boolean
          sport: string | null
          venues: Json | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      expire_stale_abonaments: { Args: never; Returns: Json }
      generate_sessions_for_group: {
        Args: { p_group_id: string }
        Returns: Json
      }
      generate_sessions_for_training: {
        Args: { p_training_id: string }
        Returns: Json
      }
      get_coach_upcoming_sessions: {
        Args: { p_coach_id: string; p_days?: number }
        Returns: {
          booking_mode: string
          coach_avatar_url: string | null
          coach_id: string
          coach_name: string | null
          drop_in_policy: string
          end_time: string
          invite_code: string
          is_recurring: boolean | null
          session_date: string
          session_id: string
          sport: string
          start_time: string
          training_id: string
          training_name: string
          type: string
        }[]
      }
      get_my_conversations: {
        Args: never
        Returns: {
          conversation_id: string
          dm_avatar_url: string
          dm_user_id: string
          dm_user_name: string
          hidden: boolean
          last_message_at: string
          last_message_content: string
          last_message_sender_name: string
          training_id: string
          training_name: string
          training_sport: string
          unread_count: number
        }[]
      }
      get_my_unread_count: { Args: never; Returns: number }
      get_my_upcoming_sessions: {
        Args: { p_from_date?: string; p_to_date?: string }
        Returns: {
          attendance_id: string
          attendance_status: string
          coach_avatar_url: string
          coach_full_name: string
          coach_id: string
          confirmation_window_hours: number
          confirmed_at: string
          declined_at: string
          end_time: string
          is_active: boolean
          max_players: number
          session_date: string
          session_id: string
          session_status: string
          sport: string
          start_time: string
          training_id: string
          training_name: string
          venue: string
        }[]
      }
      get_school_upcoming_sessions: {
        Args: { p_days?: number; p_school_id: string }
        Returns: {
          booking_mode: string
          coach_avatar_url: string | null
          coach_id: string
          coach_name: string | null
          drop_in_policy: string
          end_time: string
          invite_code: string
          is_recurring: boolean | null
          session_date: string
          session_id: string
          sport: string
          start_time: string
          training_id: string
          training_name: string
          type: string
        }[]
      }
      get_training_member_count: {
        Args: { p_training_id: string }
        Returns: number
      }
      get_upcoming_sessions: {
        Args: { p_limit?: number; p_training_id: string }
        Returns: {
          end_time: string
          id: string
          session_date: string
          start_time: string
          status: string
        }[]
      }
      handle_no_response_deadline: { Args: never; Returns: Json }
      is_group_member: {
        Args: { _group_id: string; _player_id: string }
        Returns: boolean
      }
      is_school_owner_of_training: {
        Args: { p_training_id: string }
        Returns: boolean
      }
      is_training_member: {
        Args: { _player_id: string; _training_id: string }
        Returns: boolean
      }
      join_single_session: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      merge_placeholder_into_user: {
        Args: { p_placeholder_id: string; p_real_user_id: string }
        Returns: undefined
      }
      owns_school: { Args: { p_school_id: string }; Returns: boolean }
      process_confirmation_window: { Args: never; Returns: Json }
      undo_abonament_deduction: {
        Args: { p_player_abonament_id: string; p_session_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
A new version of Supabase CLI is available: v2.84.2 (currently installed v2.75.0)
We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli
