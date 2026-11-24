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
      daily_category_history: {
        Row: {
          constraint_type: string
          count: number
          created_at: string
          date: string
          id: string
          updated_at: string
        }
        Insert: {
          constraint_type: string
          count?: number
          created_at?: string
          date: string
          id?: string
          updated_at?: string
        }
        Update: {
          constraint_type?: string
          count?: number
          created_at?: string
          date?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_ticket_history: {
        Row: {
          created: number
          created_at: string
          date: string
          feeder: number
          id: string
          in_progress: number
          resolved: number
          ritel: number
          sla_ok: number
          total: number
          updated_at: string
        }
        Insert: {
          created?: number
          created_at?: string
          date: string
          feeder?: number
          id?: string
          in_progress?: number
          resolved?: number
          ritel?: number
          sla_ok?: number
          total?: number
          updated_at?: string
        }
        Update: {
          created?: number
          created_at?: string
          date?: string
          feeder?: number
          id?: string
          in_progress?: number
          resolved?: number
          ritel?: number
          sla_ok?: number
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      daily_user_ticket_history: {
        Row: {
          created_at: string
          date: string
          id: string
          total_created: number
          total_resolved: number
          updated_at: string
          user_id: string | null
          user_name: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          total_created?: number
          total_resolved?: number
          updated_at?: string
          user_id?: string | null
          user_name: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          total_created?: number
          total_resolved?: number
          updated_at?: string
          user_id?: string | null
          user_name?: string
        }
        Relationships: []
      }
      incident_archive: {
        Row: {
          archived_at: string
          category: string | null
          constraint_type: string | null
          created_at: string
          created_by_name: string | null
          created_by_user_id: string | null
          customer_name: string | null
          hostname: string | null
          id: string
          reopen_count: number
          resolution_minutes: number | null
          resolved_at: string | null
          resolved_by_name: string | null
          resolved_by_user_id: string | null
          serpo: string | null
          service_id: string | null
          status: string
          ticket_id: string
          ticket_result: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string
          category?: string | null
          constraint_type?: string | null
          created_at: string
          created_by_name?: string | null
          created_by_user_id?: string | null
          customer_name?: string | null
          hostname?: string | null
          id?: string
          reopen_count?: number
          resolution_minutes?: number | null
          resolved_at?: string | null
          resolved_by_name?: string | null
          resolved_by_user_id?: string | null
          serpo?: string | null
          service_id?: string | null
          status: string
          ticket_id: string
          ticket_result?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string
          category?: string | null
          constraint_type?: string | null
          created_at?: string
          created_by_name?: string | null
          created_by_user_id?: string | null
          customer_name?: string | null
          hostname?: string | null
          id?: string
          reopen_count?: number
          resolution_minutes?: number | null
          resolved_at?: string | null
          resolved_by_name?: string | null
          resolved_by_user_id?: string | null
          serpo?: string | null
          service_id?: string | null
          status?: string
          ticket_id?: string
          ticket_result?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      master_data_uploads: {
        Row: {
          created_at: string
          file_name: string
          id: string
          summary: Json | null
          total_records: number
          uploaded_by_name: string
          uploaded_by_user_id: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          summary?: Json | null
          total_records?: number
          uploaded_by_name: string
          uploaded_by_user_id?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          summary?: Json | null
          total_records?: number
          uploaded_by_name?: string
          uploaded_by_user_id?: string | null
        }
        Relationships: []
      }
      noc_evaluation_activity_logs: {
        Row: {
          action: string
          actor_kind: string
          actor_name: string | null
          actor_user_id: string | null
          created_at: string
          evaluation_id: string
          from_status: string | null
          id: string
          note: string | null
          to_status: string | null
        }
        Insert: {
          action: string
          actor_kind: string
          actor_name?: string | null
          actor_user_id?: string | null
          created_at?: string
          evaluation_id: string
          from_status?: string | null
          id?: string
          note?: string | null
          to_status?: string | null
        }
        Update: {
          action?: string
          actor_kind?: string
          actor_name?: string | null
          actor_user_id?: string | null
          created_at?: string
          evaluation_id?: string
          from_status?: string | null
          id?: string
          note?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "noc_evaluation_activity_logs_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "noc_evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      noc_evaluation_answers: {
        Row: {
          created_at: string
          evaluation_id: string
          id: string
          reason: string
          revision_number: number
          submitted_by: string
          submitted_by_name: string | null
        }
        Insert: {
          created_at?: string
          evaluation_id: string
          id?: string
          reason: string
          revision_number: number
          submitted_by: string
          submitted_by_name?: string | null
        }
        Update: {
          created_at?: string
          evaluation_id?: string
          id?: string
          reason?: string
          revision_number?: number
          submitted_by?: string
          submitted_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "noc_evaluation_answers_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "noc_evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      noc_evaluation_attachments: {
        Row: {
          answer_id: string | null
          attachment_type: string
          created_at: string
          evaluation_id: string
          file_name: string | null
          file_path: string
          file_size: number
          id: string
          mime_type: string
          uploaded_by: string
        }
        Insert: {
          answer_id?: string | null
          attachment_type: string
          created_at?: string
          evaluation_id: string
          file_name?: string | null
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          uploaded_by: string
        }
        Update: {
          answer_id?: string | null
          attachment_type?: string
          created_at?: string
          evaluation_id?: string
          file_name?: string | null
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "noc_evaluation_attachments_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "noc_evaluation_answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "noc_evaluation_attachments_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "noc_evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      noc_evaluation_notifications: {
        Row: {
          created_at: string
          evaluation_code: string
          evaluation_id: string
          id: string
          link: string
          read_at: string | null
          summary: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          evaluation_code: string
          evaluation_id: string
          id?: string
          link: string
          read_at?: string | null
          summary?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          evaluation_code?: string
          evaluation_id?: string
          id?: string
          link?: string
          read_at?: string | null
          summary?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "noc_evaluation_notifications_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "noc_evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      noc_evaluations: {
        Row: {
          answered_at: string | null
          closed_at: string | null
          code: string
          created_at: string
          customer_information: string
          id: string
          opened_at: string | null
          problem: string
          recipient_name: string | null
          recipient_team: string | null
          recipient_user_id: string
          sender_name: string | null
          sender_user_id: string
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          answered_at?: string | null
          closed_at?: string | null
          code?: string
          created_at?: string
          customer_information: string
          id?: string
          opened_at?: string | null
          problem: string
          recipient_name?: string | null
          recipient_team?: string | null
          recipient_user_id: string
          sender_name?: string | null
          sender_user_id: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          answered_at?: string | null
          closed_at?: string | null
          code?: string
          created_at?: string
          customer_information?: string
          id?: string
          opened_at?: string | null
          problem?: string
          recipient_name?: string | null
          recipient_team?: string | null
          recipient_user_id?: string
          sender_name?: string | null
          sender_user_id?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          content: string
          created_at: string
          created_by_name: string | null
          created_by_user_id: string
          id: string
          tab_key: string
          title: string
        }
        Insert: {
          content?: string
          created_at?: string
          created_by_name?: string | null
          created_by_user_id: string
          id?: string
          tab_key: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by_name?: string | null
          created_by_user_id?: string
          id?: string
          tab_key?: string
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          is_approved: boolean
          last_online: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          is_approved?: boolean
          last_online?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          is_approved?: boolean
          last_online?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      role_change_logs: {
        Row: {
          changed_by: string
          created_at: string
          id: string
          new_role: string
          old_role: string | null
          user_id: string
        }
        Insert: {
          changed_by: string
          created_at?: string
          id?: string
          new_role: string
          old_role?: string | null
          user_id: string
        }
        Update: {
          changed_by?: string
          created_at?: string
          id?: string
          new_role?: string
          old_role?: string | null
          user_id?: string
        }
        Relationships: []
      }
      shift_reports: {
        Row: {
          created_at: string
          date: string
          fat_loss: string | null
          id: string
          issues: string | null
          notes: string | null
          officer: string
          olt_down: string | null
          port_down: string | null
          shift: string
        }
        Insert: {
          created_at?: string
          date: string
          fat_loss?: string | null
          id?: string
          issues?: string | null
          notes?: string | null
          officer: string
          olt_down?: string | null
          port_down?: string | null
          shift: string
        }
        Update: {
          created_at?: string
          date?: string
          fat_loss?: string | null
          id?: string
          issues?: string | null
          notes?: string | null
          officer?: string
          olt_down?: string | null
          port_down?: string | null
          shift?: string
        }
        Relationships: []
      }
      ticket_status_history: {
        Row: {
          changed_by_name: string | null
          changed_by_user_id: string | null
          created_at: string
          id: string
          new_status: string
          old_status: string | null
          reason: string | null
          ticket_id: string
        }
        Insert: {
          changed_by_name?: string | null
          changed_by_user_id?: string | null
          created_at?: string
          id?: string
          new_status: string
          old_status?: string | null
          reason?: string | null
          ticket_id: string
        }
        Update: {
          changed_by_name?: string | null
          changed_by_user_id?: string | null
          created_at?: string
          id?: string
          new_status?: string
          old_status?: string | null
          reason?: string | null
          ticket_id?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          category: string
          constraint_type: string
          contact_user: string | null
          created_at: string
          created_by_name: string | null
          created_by_user_id: string | null
          created_iso: string
          customer_name: string
          fat_id: string
          hostname: string
          id: string
          pending_at: string | null
          pending_by_name: string | null
          pending_by_user_id: string | null
          pending_reason: string | null
          resolved_at: string | null
          resolved_by_name: string | null
          resolved_by_user_id: string | null
          serpo: string
          service_id: string
          sn_ont: string
          status: string
          ticket_id: string
          ticket_result: string
        }
        Insert: {
          category: string
          constraint_type: string
          contact_user?: string | null
          created_at?: string
          created_by_name?: string | null
          created_by_user_id?: string | null
          created_iso: string
          customer_name: string
          fat_id: string
          hostname: string
          id?: string
          pending_at?: string | null
          pending_by_name?: string | null
          pending_by_user_id?: string | null
          pending_reason?: string | null
          resolved_at?: string | null
          resolved_by_name?: string | null
          resolved_by_user_id?: string | null
          serpo: string
          service_id: string
          sn_ont: string
          status?: string
          ticket_id: string
          ticket_result: string
        }
        Update: {
          category?: string
          constraint_type?: string
          contact_user?: string | null
          created_at?: string
          created_by_name?: string | null
          created_by_user_id?: string | null
          created_iso?: string
          customer_name?: string
          fat_id?: string
          hostname?: string
          id?: string
          pending_at?: string | null
          pending_by_name?: string | null
          pending_by_user_id?: string | null
          pending_reason?: string | null
          resolved_at?: string | null
          resolved_by_name?: string | null
          resolved_by_user_id?: string | null
          serpo?: string
          service_id?: string
          sn_ont?: string
          status?: string
          ticket_id?: string
          ticket_result?: string
        }
        Relationships: []
      }
      user_activity_logs: {
        Row: {
          action: string
          created_at: string
          detail: string | null
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          detail?: string | null
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          detail?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_menu_access: {
        Row: {
          created_at: string
          id: string
          path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          path: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          path?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      eviden_answer: {
        Args: { _files: Json; _id: string; _reason: string }
        Returns: number
      }
      eviden_close: { Args: { _id: string; _note: string }; Returns: undefined }
      eviden_create: {
        Args: {
          _customer_information: string
          _problem: string
          _recipient: string
        }
        Returns: string
      }
      eviden_discard_draft: { Args: { _id: string }; Returns: undefined }
      eviden_display_name: { Args: { _uid: string }; Returns: string }
      eviden_get: { Args: { _id: string }; Returns: Json }
      eviden_list: {
        Args: never
        Returns: {
          answer_count: number
          answered_at: string
          closed_at: string
          code: string
          created_at: string
          customer_information: string
          id: string
          opened_at: string
          problem: string
          recipient_name: string
          recipient_team: string
          recipient_user_id: string
          sender_name: string
          sent_at: string
          status: string
          viewer_kind: string
        }[]
      }
      eviden_log: {
        Args: {
          _action: string
          _e: Database["public"]["Tables"]["noc_evaluations"]["Row"]
          _from: string
          _kind: string
          _note: string
          _to: string
        }
        Returns: undefined
      }
      eviden_notify: {
        Args: {
          _e: Database["public"]["Tables"]["noc_evaluations"]["Row"]
          _title: string
          _type: string
          _uid: string
        }
        Returns: undefined
      }
      eviden_notify_admins: {
        Args: {
          _e: Database["public"]["Tables"]["noc_evaluations"]["Row"]
          _skip: string
          _title: string
          _type: string
        }
        Returns: undefined
      }
      eviden_open: { Args: { _id: string }; Returns: undefined }
      eviden_recipients: {
        Args: never
        Returns: {
          display_name: string
          email: string
          team: string
          user_id: string
        }[]
      }
      eviden_register_files: {
        Args: {
          _answer: string
          _e: Database["public"]["Tables"]["noc_evaluations"]["Row"]
          _files: Json
          _type: string
        }
        Returns: number
      }
      eviden_request_revision: {
        Args: { _id: string; _note: string }
        Returns: undefined
      }
      eviden_send: { Args: { _files: Json; _id: string }; Returns: Json }
      eviden_start: { Args: { _id: string }; Returns: undefined }
      eviden_storage_can_read: { Args: { _name: string }; Returns: boolean }
      eviden_storage_can_upload: { Args: { _name: string }; Returns: boolean }
      eviden_viewer_kind: {
        Args: { _e: Database["public"]["Tables"]["noc_evaluations"]["Row"] }
        Returns: string
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved_user: { Args: { _user_id: string }; Returns: boolean }
      recompute_daily_history: {
        Args: { end_date: string; start_date: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "noc" | "reviewer" | "intern" | "superior" | "cs"
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
      app_role: ["admin", "noc", "reviewer", "intern", "superior", "cs"],
    },
  },
} as const
