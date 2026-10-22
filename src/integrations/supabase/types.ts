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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          created_at: string
          id: string
          offscreen: boolean
          position: number
          session_id: string
          strand: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          offscreen?: boolean
          position?: number
          session_id: string
          strand: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          offscreen?: boolean
          position?: number
          session_id?: string
          strand?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_versions: {
        Row: {
          activity_id: string
          age_band: string
          id: string
          instructions: string
          kid_title: string
          minutes: number
        }
        Insert: {
          activity_id: string
          age_band: string
          id?: string
          instructions: string
          kid_title: string
          minutes?: number
        }
        Update: {
          activity_id?: string
          age_band?: string
          id?: string
          instructions?: string
          kid_title?: string
          minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "activity_versions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      child_activity_progress: {
        Row: {
          activity_id: string
          child_id: string
          completed_at: string
          parent_id: string
        }
        Insert: {
          activity_id: string
          child_id: string
          completed_at?: string
          parent_id: string
        }
        Update: {
          activity_id?: string
          child_id?: string
          completed_at?: string
          parent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_activity_progress_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_activity_progress_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_activity_progress_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      child_badges: {
        Row: {
          child_id: string
          earned_at: string
          parent_id: string
          unit_id: string
        }
        Insert: {
          child_id: string
          earned_at?: string
          parent_id: string
          unit_id: string
        }
        Update: {
          child_id?: string
          earned_at?: string
          parent_id?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_badges_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_badges_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_badges_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      child_controls: {
        Row: {
          child_id: string
          daily_minutes: number | null
          parent_id: string
          read_aloud: boolean
          studio_games: boolean
          studio_stories: boolean
          updated_at: string
        }
        Insert: {
          child_id: string
          daily_minutes?: number | null
          parent_id: string
          read_aloud?: boolean
          studio_games?: boolean
          studio_stories?: boolean
          updated_at?: string
        }
        Update: {
          child_id?: string
          daily_minutes?: number | null
          parent_id?: string
          read_aloud?: boolean
          studio_games?: boolean
          studio_stories?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_controls_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: true
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_controls_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      child_session_progress: {
        Row: {
          child_id: string
          completed_at: string
          parent_id: string
          session_id: string
        }
        Insert: {
          child_id: string
          completed_at?: string
          parent_id: string
          session_id: string
        }
        Update: {
          child_id?: string
          completed_at?: string
          parent_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_session_progress_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_session_progress_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_session_progress_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          age: number
          age_band: string | null
          avatar: string
          bugley_stage: string | null
          created_at: string
          credential_hash: string
          credential_salt: string
          id: string
          login_kind: string
          nickname: string
          parent_id: string
        }
        Insert: {
          age: number
          age_band?: string | null
          avatar: string
          bugley_stage?: string | null
          created_at?: string
          credential_hash: string
          credential_salt: string
          id?: string
          login_kind: string
          nickname: string
          parent_id: string
        }
        Update: {
          age?: number
          age_band?: string | null
          avatar?: string
          bugley_stage?: string | null
          created_at?: string
          credential_hash?: string
          credential_salt?: string
          id?: string
          login_kind?: string
          nickname?: string
          parent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "children_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_requests: {
        Row: {
          age_range: string
          city_state: string
          created_at: string
          email: string
          families_count: number
          group_name: string
          id: string
          leader_name: string
          notes: string | null
        }
        Insert: {
          age_range: string
          city_state: string
          created_at?: string
          email: string
          families_count: number
          group_name: string
          id?: string
          leader_name: string
          notes?: string | null
        }
        Update: {
          age_range?: string
          city_state?: string
          created_at?: string
          email?: string
          families_count?: number
          group_name?: string
          id?: string
          leader_name?: string
          notes?: string | null
        }
        Relationships: []
      }
      parental_consents: {
        Row: {
          adult_attested: boolean
          agreed_at: string
          consent_text: string
          consent_version: string
          id: string
          parent_id: string
        }
        Insert: {
          adult_attested: boolean
          agreed_at?: string
          consent_text: string
          consent_version: string
          id?: string
          parent_id: string
        }
        Update: {
          adult_attested?: boolean
          agreed_at?: string
          consent_text?: string
          consent_version?: string
          id?: string
          parent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parental_consents_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      printables: {
        Row: {
          created_at: string
          file_path: string
          id: string
          session_id: string
          title: string
        }
        Insert: {
          created_at?: string
          file_path: string
          id?: string
          session_id: string
          title: string
        }
        Update: {
          created_at?: string
          file_path?: string
          id?: string
          session_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "printables_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          family_setup_completed_at: string | null
          first_name: string
          id: string
          last_name: string
        }
        Insert: {
          created_at?: string
          family_setup_completed_at?: string | null
          first_name: string
          id: string
          last_name: string
        }
        Update: {
          created_at?: string
          family_setup_completed_at?: string | null
          first_name?: string
          id?: string
          last_name?: string
        }
        Relationships: []
      }
      seasons: {
        Row: {
          created_at: string
          description: string
          id: string
          number: number
          published: boolean
          title: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          number: number
          published?: boolean
          title: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          number?: number
          published?: boolean
          title?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          created_at: string
          id: string
          parent_primer: string
          script: string
          title: string
          unit_id: string
          week_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          parent_primer?: string
          script?: string
          title: string
          unit_id: string
          week_number: number
        }
        Update: {
          created_at?: string
          id?: string
          parent_primer?: string
          script?: string
          title?: string
          unit_id?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "sessions_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          badge_description: string
          badge_name: string
          created_at: string
          dinner_question: string
          family_question: string
          id: string
          lead_strand: string
          mission_project: string
          number: number
          season_id: string
          story_prompt: string
          title: string
        }
        Insert: {
          badge_description?: string
          badge_name?: string
          created_at?: string
          dinner_question?: string
          family_question?: string
          id?: string
          lead_strand: string
          mission_project?: string
          number: number
          season_id: string
          story_prompt?: string
          title: string
        }
        Update: {
          badge_description?: string
          badge_name?: string
          created_at?: string
          dinner_question?: string
          family_question?: string
          id?: string
          lead_strand?: string
          mission_project?: string
          number?: number
          season_id?: string
          story_prompt?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waitlist_signups: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          kids_count: number
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          kids_count: number
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          kids_count?: number
          source?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_parent: { Args: never; Returns: boolean }
      session_is_published: { Args: { _session_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin"],
    },
  },
} as const
