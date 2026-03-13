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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      coaches: {
        Row: {
          bio: string | null
          city: string | null
          created_at: string
          id: string
          location: string | null
          sport: string | null
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          bio?: string | null
          city?: string | null
          created_at?: string
          id?: string
          location?: string | null
          sport?: string | null
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          bio?: string | null
          city?: string | null
          created_at?: string
          id?: string
          location?: string | null
          sport?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: []
      }
      confirmations: {
        Row: {
          created_at: string | null
          id: string
          player_id: string
          responded_at: string | null
          session_id: string
          status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          player_id: string
          responded_at?: string | null
          session_id: string
          status?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          player_id?: string
          responded_at?: string | null
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "confirmations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "confirmations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string | null
          player_id: string
          status: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string | null
          player_id: string
          status?: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string | null
          player_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          content: string
          created_at: string | null
          group_id: string
          id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          group_id: string
          id?: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          group_id?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          allow_waitlist: boolean
          capacity: number
          coach_id: string
          confirmation_deadline_hours: number
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          invite_code: string
          is_active: boolean
          level: string
          location: string
          name: string
          sport: string
          start_time: string
        }
        Insert: {
          allow_waitlist?: boolean
          capacity?: number
          coach_id: string
          confirmation_deadline_hours?: number
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          invite_code: string
          is_active?: boolean
          level?: string
          location: string
          name: string
          sport: string
          start_time: string
        }
        Update: {
          allow_waitlist?: boolean
          capacity?: number
          coach_id?: string
          confirmation_deadline_hours?: number
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          invite_code?: string
          is_active?: boolean
          level?: string
          location?: string
          name?: string
          sport?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean
          message: string
          related_group_id: string | null
          related_session_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean
          message: string
          related_group_id?: string | null
          related_session_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean
          message?: string
          related_group_id?: string | null
          related_session_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_group_id_fkey"
            columns: ["related_group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_session_id_fkey"
            columns: ["related_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      open_spots: {
        Row: {
          claimed_at: string | null
          claimed_by: string | null
          created_at: string | null
          created_by_decline_of: string | null
          group_id: string
          id: string
          session_id: string
          status: string
        }
        Insert: {
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string | null
          created_by_decline_of?: string | null
          group_id: string
          id?: string
          session_id: string
          status?: string
        }
        Update: {
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string | null
          created_by_decline_of?: string | null
          group_id?: string
          id?: string
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "open_spots_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_spots_created_by_decline_of_fkey"
            columns: ["created_by_decline_of"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_spots_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_spots_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          onboarding_complete: boolean | null
          phone: string | null
          role: string | null
          school_id: string | null
          sport: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          onboarding_complete?: boolean | null
          phone?: string | null
          role?: string | null
          school_id?: string | null
          sport?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          onboarding_complete?: boolean | null
          phone?: string | null
          role?: string | null
          school_id?: string | null
          sport?: string | null
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
        }
        Insert: {
          coach_id: string
          id?: string
          joined_at?: string
          school_id: string
        }
        Update: {
          coach_id?: string
          id?: string
          joined_at?: string
          school_id?: string
        }
        Relationships: [
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
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          sport: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          sport?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          sport?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      session_attendance: {
        Row: {
          confirmed_at: string | null
          created_at: string
          declined_at: string | null
          id: string
          session_id: string
          status: string
          user_id: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          declined_at?: string | null
          id?: string
          session_id: string
          status?: string
          user_id: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          declined_at?: string | null
          id?: string
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
        ]
      }
      sessions: {
        Row: {
          created_at: string | null
          end_time: string
          group_id: string
          id: string
          notes: string | null
          session_date: string
          start_time: string
          status: string
        }
        Insert: {
          created_at?: string | null
          end_time: string
          group_id: string
          id?: string
          notes?: string | null
          session_date: string
          start_time: string
          status?: string
        }
        Update: {
          created_at?: string | null
          end_time?: string
          group_id?: string
          id?: string
          notes?: string | null
          session_date?: string
          start_time?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
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
        ]
      }
      training_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          sender_id: string
          training_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          sender_id: string
          training_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sender_id?: string
          training_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_messages_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
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
          confirmation_window_hours: number
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          invite_code: string
          is_active: boolean
          max_players: number | null
          name: string
          no_response_behavior: string
          notification_channel: string
          recurrence_pattern: string
          school_id: string | null
          sport: string
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
          confirmation_window_hours?: number
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          invite_code?: string
          is_active?: boolean
          max_players?: number | null
          name: string
          no_response_behavior?: string
          notification_channel?: string
          recurrence_pattern?: string
          school_id?: string | null
          sport: string
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
          confirmation_window_hours?: number
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          invite_code?: string
          is_active?: boolean
          max_players?: number | null
          name?: string
          no_response_behavior?: string
          notification_channel?: string
          recurrence_pattern?: string
          school_id?: string | null
          sport?: string
          start_time?: string
          type?: string
          updated_at?: string
          venue?: string
          visibility?: string
        }
        Relationships: [
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
      claim_spot: {
        Args: { p_player_id: string; p_spot_id: string }
        Returns: Json
      }
      claim_training_spot: {
        Args: { p_player_id: string; p_spot_id: string }
        Returns: Json
      }
      generate_sessions_for_group: {
        Args: { p_group_id: string }
        Returns: Json
      }
      generate_sessions_for_training: {
        Args: { p_training_id: string }
        Returns: Json
      }
      handle_no_response_deadline: { Args: never; Returns: Json }
      is_group_member: {
        Args: { _group_id: string; _player_id: string }
        Returns: boolean
      }
      is_training_member: {
        Args: { _player_id: string; _training_id: string }
        Returns: boolean
      }
      process_confirmation_window: { Args: never; Returns: Json }
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
  public: {
    Enums: {},
  },
} as const
