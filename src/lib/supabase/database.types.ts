export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      audit_events: {
        Row: {
          actor_profile_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          event_type: string
          id: number
          metadata: Json
          organization_id: string
        }
        Insert: {
          actor_profile_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          event_type: string
          id?: never
          metadata?: Json
          organization_id: string
        }
        Update: {
          actor_profile_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          event_type?: string
          id?: never
          metadata?: Json
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      changelog_entries: {
        Row: {
          created_at: string
          created_by: string
          id: string
          organization_id: string
          published_at: string | null
          status: Database["public"]["Enums"]["changelog_status"]
          summary: string
          title: string
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          organization_id: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["changelog_status"]
          summary: string
          title: string
          updated_at?: string
          version: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          organization_id?: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["changelog_status"]
          summary?: string
          title?: string
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "changelog_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "changelog_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      changelog_events: {
        Row: {
          actor_profile_id: string | null
          created_at: string
          entry_id: string
          from_status: Database["public"]["Enums"]["changelog_status"] | null
          id: string
          note: string
          organization_id: string
          to_status: Database["public"]["Enums"]["changelog_status"]
        }
        Insert: {
          actor_profile_id?: string | null
          created_at?: string
          entry_id: string
          from_status?: Database["public"]["Enums"]["changelog_status"] | null
          id?: string
          note: string
          organization_id: string
          to_status: Database["public"]["Enums"]["changelog_status"]
        }
        Update: {
          actor_profile_id?: string | null
          created_at?: string
          entry_id?: string
          from_status?: Database["public"]["Enums"]["changelog_status"] | null
          id?: string
          note?: string
          organization_id?: string
          to_status?: Database["public"]["Enums"]["changelog_status"]
        }
        Relationships: [
          {
            foreignKeyName: "changelog_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "changelog_events_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "changelog_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "changelog_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      data_quality_issues: {
        Row: {
          code: string
          created_at: string
          id: string
          organization_id: string
          resolved_at: string | null
          run_id: string
          safe_message: string
          severity: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          organization_id: string
          resolved_at?: string | null
          run_id: string
          safe_message: string
          severity: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          organization_id?: string
          resolved_at?: string | null
          run_id?: string
          safe_message?: string
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_quality_issues_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_quality_issues_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "integration_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_scenario_versions: {
        Row: {
          organization_id: string
          restored_at: string
          restored_by: string | null
          scenario_checksum: string
          scenario_version: number
        }
        Insert: {
          organization_id: string
          restored_at?: string
          restored_by?: string | null
          scenario_checksum: string
          scenario_version: number
        }
        Update: {
          organization_id?: string
          restored_at?: string
          restored_by?: string | null
          scenario_checksum?: string
          scenario_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "demo_scenario_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_scenario_versions_restored_by_fkey"
            columns: ["restored_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_events: {
        Row: {
          actor_profile_id: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["incident_status"] | null
          id: string
          incident_id: string
          kind: Database["public"]["Enums"]["incident_event_kind"]
          note: string
          organization_id: string
          to_status: Database["public"]["Enums"]["incident_status"] | null
        }
        Insert: {
          actor_profile_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["incident_status"] | null
          id?: string
          incident_id: string
          kind: Database["public"]["Enums"]["incident_event_kind"]
          note: string
          organization_id: string
          to_status?: Database["public"]["Enums"]["incident_status"] | null
        }
        Update: {
          actor_profile_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["incident_status"] | null
          id?: string
          incident_id?: string
          kind?: Database["public"]["Enums"]["incident_event_kind"]
          note?: string
          organization_id?: string
          to_status?: Database["public"]["Enums"]["incident_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_events_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          affected_service: string
          assignee_person_id: string | null
          assignee_profile_id: string | null
          category: Database["public"]["Enums"]["incident_category"]
          corrective_task_id: string | null
          created_at: string
          description: string
          detection_channel: string
          first_response_at: string | null
          id: string
          impact_scope: string
          organization_id: string
          priority: Database["public"]["Enums"]["incident_priority"]
          project_id: string | null
          reference: string
          requester_person_id: string
          requester_profile_id: string
          resolution: string | null
          root_cause: string | null
          sla_due_at: string
          status: Database["public"]["Enums"]["incident_status"]
          title: string
          updated_at: string
        }
        Insert: {
          affected_service?: string
          assignee_person_id?: string | null
          assignee_profile_id?: string | null
          category?: Database["public"]["Enums"]["incident_category"]
          corrective_task_id?: string | null
          created_at?: string
          description: string
          detection_channel?: string
          first_response_at?: string | null
          id?: string
          impact_scope?: string
          organization_id: string
          priority?: Database["public"]["Enums"]["incident_priority"]
          project_id?: string | null
          reference: string
          requester_person_id: string
          requester_profile_id: string
          resolution?: string | null
          root_cause?: string | null
          sla_due_at?: string
          status?: Database["public"]["Enums"]["incident_status"]
          title: string
          updated_at?: string
        }
        Update: {
          affected_service?: string
          assignee_person_id?: string | null
          assignee_profile_id?: string | null
          category?: Database["public"]["Enums"]["incident_category"]
          corrective_task_id?: string | null
          created_at?: string
          description?: string
          detection_channel?: string
          first_response_at?: string | null
          id?: string
          impact_scope?: string
          organization_id?: string
          priority?: Database["public"]["Enums"]["incident_priority"]
          project_id?: string | null
          reference?: string
          requester_person_id?: string
          requester_profile_id?: string
          resolution?: string | null
          root_cause?: string | null
          sla_due_at?: string
          status?: Database["public"]["Enums"]["incident_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_assignee_person_id_fkey"
            columns: ["assignee_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_assignee_profile_id_fkey"
            columns: ["assignee_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_corrective_task_id_fkey"
            columns: ["corrective_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_requester_person_id_fkey"
            columns: ["requester_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_requester_profile_id_fkey"
            columns: ["requester_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_connectors: {
        Row: {
          code: string
          created_at: string
          enabled: boolean
          id: string
          kind: Database["public"]["Enums"]["integration_kind"]
          last_run_at: string | null
          name: string
          organization_id: string
          schedule_cron: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          enabled?: boolean
          id?: string
          kind: Database["public"]["Enums"]["integration_kind"]
          last_run_at?: string | null
          name: string
          organization_id: string
          schedule_cron?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          enabled?: boolean
          id?: string
          kind?: Database["public"]["Enums"]["integration_kind"]
          last_run_at?: string | null
          name?: string
          organization_id?: string
          schedule_cron?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_connectors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_mappings: {
        Row: {
          connector_id: string
          created_at: string
          enabled: boolean
          id: string
          organization_id: string
          priority: number
          source_pattern: string
          target_code: string
        }
        Insert: {
          connector_id: string
          created_at?: string
          enabled?: boolean
          id?: string
          organization_id: string
          priority?: number
          source_pattern: string
          target_code: string
        }
        Update: {
          connector_id?: string
          created_at?: string
          enabled?: boolean
          id?: string
          organization_id?: string
          priority?: number
          source_pattern?: string
          target_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_mappings_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "integration_connectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_mappings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_run_items: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          outcome: string
          run_id: string
          safe_message: string
          source_sequence: number
          target_kind: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          outcome: string
          run_id: string
          safe_message?: string
          source_sequence: number
          target_kind: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          outcome?: string
          run_id?: string
          safe_message?: string
          source_sequence?: number
          target_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_run_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_run_items_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "integration_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_runs: {
        Row: {
          connector_id: string
          created_at: string
          created_by: string | null
          duplicate_count: number
          effective_date: string
          error_count: number
          finished_at: string | null
          id: string
          imported_count: number
          organization_id: string
          processed_count: number
          safe_summary: string
          source_sequence: number
          started_at: string | null
          status: Database["public"]["Enums"]["integration_run_status"]
          trigger_kind: string
        }
        Insert: {
          connector_id: string
          created_at?: string
          created_by?: string | null
          duplicate_count?: number
          effective_date: string
          error_count?: number
          finished_at?: string | null
          id?: string
          imported_count?: number
          organization_id: string
          processed_count?: number
          safe_summary?: string
          source_sequence?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["integration_run_status"]
          trigger_kind: string
        }
        Update: {
          connector_id?: string
          created_at?: string
          created_by?: string | null
          duplicate_count?: number
          effective_date?: string
          error_count?: number
          finished_at?: string | null
          id?: string
          imported_count?: number
          organization_id?: string
          processed_count?: number
          safe_summary?: string
          source_sequence?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["integration_run_status"]
          trigger_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_runs_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "integration_connectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          revoked_at: string | null
          role_id: string
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          organization_id: string
          revoked_at?: string | null
          role_id: string
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          revoked_at?: string | null
          role_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_policies: {
        Row: {
          active: boolean
          annual_days: number
          created_at: string
          id: string
          name: string
          organization_id: string
          requires_approval: boolean
          updated_at: string
        }
        Insert: {
          active?: boolean
          annual_days: number
          created_at?: string
          id?: string
          name: string
          organization_id: string
          requires_approval?: boolean
          updated_at?: string
        }
        Update: {
          active?: boolean
          annual_days?: number
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          requires_approval?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_request_events: {
        Row: {
          actor_profile_id: string | null
          created_at: string
          from_status:
            | Database["public"]["Enums"]["leave_request_status"]
            | null
          id: string
          note: string
          organization_id: string
          request_id: string
          to_status: Database["public"]["Enums"]["leave_request_status"]
        }
        Insert: {
          actor_profile_id?: string | null
          created_at?: string
          from_status?:
            | Database["public"]["Enums"]["leave_request_status"]
            | null
          id?: string
          note: string
          organization_id: string
          request_id: string
          to_status: Database["public"]["Enums"]["leave_request_status"]
        }
        Update: {
          actor_profile_id?: string | null
          created_at?: string
          from_status?:
            | Database["public"]["Enums"]["leave_request_status"]
            | null
          id?: string
          note?: string
          organization_id?: string
          request_id?: string
          to_status?: Database["public"]["Enums"]["leave_request_status"]
        }
        Relationships: [
          {
            foreignKeyName: "leave_request_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_request_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_request_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "leave_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          business_days: number | null
          created_at: string
          end_date: string
          id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          organization_id: string
          person_id: string
          profile_id: string
          reason: string
          start_date: string
          status: Database["public"]["Enums"]["leave_request_status"]
          updated_at: string
        }
        Insert: {
          business_days?: number | null
          created_at?: string
          end_date: string
          id?: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          organization_id: string
          person_id: string
          profile_id: string
          reason: string
          start_date: string
          status?: Database["public"]["Enums"]["leave_request_status"]
          updated_at?: string
        }
        Update: {
          business_days?: number | null
          created_at?: string
          end_date?: string
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          organization_id?: string
          person_id?: string
          profile_id?: string
          reason?: string
          start_date?: string
          status?: Database["public"]["Enums"]["leave_request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          joined_at: string | null
          organization_id: string
          profile_id: string
          role_id: string
          status: Database["public"]["Enums"]["membership_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          joined_at?: string | null
          organization_id: string
          profile_id: string
          role_id: string
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          joined_at?: string | null
          organization_id?: string
          profile_id?: string
          role_id?: string
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      module_settings: {
        Row: {
          enabled: boolean
          module_id: string
          organization_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          module_id: string
          organization_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          module_id?: string
          organization_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          locale: string
          logo_path: string | null
          organization_id: string
          primary_color: string
          timezone: string
          updated_at: string
        }
        Insert: {
          locale?: string
          logo_path?: string | null
          organization_id: string
          primary_color?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          locale?: string
          logo_path?: string | null
          organization_id?: string
          primary_color?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          last_active_at: string
          name: string
          scenario_anchor_date: string
          scenario_version: number | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_active_at?: string
          name: string
          scenario_anchor_date?: string
          scenario_version?: number | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_active_at?: string
          name?: string
          scenario_anchor_date?: string
          scenario_version?: number | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      payroll_breakdowns: {
        Row: {
          employer_cost_total_cents: number
          gross_total_cents: number
          id: string
          organization_id: string
          people_count: number
          run_id: string
          team: string
        }
        Insert: {
          employer_cost_total_cents: number
          gross_total_cents: number
          id?: string
          organization_id: string
          people_count: number
          run_id: string
          team: string
        }
        Update: {
          employer_cost_total_cents?: number
          gross_total_cents?: number
          id?: string
          organization_id?: string
          people_count?: number
          run_id?: string
          team?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_breakdowns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_breakdowns_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_checks: {
        Row: {
          code: string
          id: string
          organization_id: string
          run_id: string
          severity: string
          status: string
          summary: string
        }
        Insert: {
          code: string
          id?: string
          organization_id: string
          run_id: string
          severity: string
          status: string
          summary: string
        }
        Update: {
          code?: string
          id?: string
          organization_id?: string
          run_id?: string
          severity?: string
          status?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_checks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_checks_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_events: {
        Row: {
          actor_profile_id: string
          created_at: string
          from_status: Database["public"]["Enums"]["payroll_run_status"] | null
          id: number
          kind: string
          note: string
          organization_id: string
          run_id: string
          to_status: Database["public"]["Enums"]["payroll_run_status"]
        }
        Insert: {
          actor_profile_id: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["payroll_run_status"] | null
          id?: never
          kind: string
          note: string
          organization_id: string
          run_id: string
          to_status: Database["public"]["Enums"]["payroll_run_status"]
        }
        Update: {
          actor_profile_id?: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["payroll_run_status"] | null
          id?: never
          kind?: string
          note?: string
          organization_id?: string
          run_id?: string
          to_status?: Database["public"]["Enums"]["payroll_run_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payroll_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_events_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_participants: {
        Row: {
          created_at: string
          id: string
          inclusion_status: string
          organization_id: string
          person_id: string
          run_id: string
          validation_status: string
        }
        Insert: {
          created_at?: string
          id?: string
          inclusion_status: string
          organization_id: string
          person_id: string
          run_id: string
          validation_status: string
        }
        Update: {
          created_at?: string
          id?: string
          inclusion_status?: string
          organization_id?: string
          person_id?: string
          run_id?: string
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_participants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_participants_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_participants_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          created_at: string
          created_by: string
          currency: string
          deduction_total_cents: number
          employer_cost_total_cents: number | null
          gross_total_cents: number
          id: string
          net_total_cents: number | null
          notes: string
          organization_id: string
          people_count: number
          period_end: string
          period_start: string
          status: Database["public"]["Enums"]["payroll_run_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          currency?: string
          deduction_total_cents?: number
          employer_cost_total_cents?: number | null
          gross_total_cents?: number
          id?: string
          net_total_cents?: number | null
          notes?: string
          organization_id: string
          people_count?: number
          period_end: string
          period_start: string
          status?: Database["public"]["Enums"]["payroll_run_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          currency?: string
          deduction_total_cents?: number
          employer_cost_total_cents?: number | null
          gross_total_cents?: number
          id?: string
          net_total_cents?: number | null
          notes?: string
          organization_id?: string
          people_count?: number
          period_end?: string
          period_start?: string
          status?: Database["public"]["Enums"]["payroll_run_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          created_at: string
          display_name: string
          employment_contract_type: string
          id: string
          manager_person_id: string | null
          organization_id: string
          position_title: string
          profile_id: string | null
          role_code: Database["public"]["Enums"]["person_role_code"]
          status: Database["public"]["Enums"]["person_status"]
          team: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          employment_contract_type?: string
          id?: string
          manager_person_id?: string | null
          organization_id: string
          position_title?: string
          profile_id?: string | null
          role_code?: Database["public"]["Enums"]["person_role_code"]
          status?: Database["public"]["Enums"]["person_status"]
          team?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          employment_contract_type?: string
          id?: string
          manager_person_id?: string | null
          organization_id?: string
          position_title?: string
          profile_id?: string | null
          role_code?: Database["public"]["Enums"]["person_role_code"]
          status?: Database["public"]["Enums"]["person_status"]
          team?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_manager_person_id_fkey"
            columns: ["manager_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      people_events: {
        Row: {
          actor_profile_id: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["people_event_kind"]
          note: string
          organization_id: string
          person_id: string
        }
        Insert: {
          actor_profile_id?: string | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["people_event_kind"]
          note: string
          organization_id: string
          person_id: string
        }
        Update: {
          actor_profile_id?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["people_event_kind"]
          note?: string
          organization_id?: string
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_events_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          code: string
          description: string
          id: string
        }
        Insert: {
          code: string
          description: string
          id?: string
        }
        Update: {
          code?: string
          description?: string
          id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          alias: string | null
          avatar_path: string | null
          avatar_url: string | null
          created_at: string
          default_dashboard: string
          density: string
          display_name: string
          email: string | null
          high_contrast: boolean
          id: string
          locale: string
          notification_preferences: Json
          reduced_motion: boolean
          simulated_role: Database["public"]["Enums"]["person_role_code"] | null
          theme: string
          timezone: string
          updated_at: string
        }
        Insert: {
          alias?: string | null
          avatar_path?: string | null
          avatar_url?: string | null
          created_at?: string
          default_dashboard?: string
          density?: string
          display_name: string
          email?: string | null
          high_contrast?: boolean
          id: string
          locale?: string
          notification_preferences?: Json
          reduced_motion?: boolean
          simulated_role?:
            | Database["public"]["Enums"]["person_role_code"]
            | null
          theme?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          alias?: string | null
          avatar_path?: string | null
          avatar_url?: string | null
          created_at?: string
          default_dashboard?: string
          density?: string
          display_name?: string
          email?: string | null
          high_contrast?: boolean
          id?: string
          locale?: string
          notification_preferences?: Json
          reduced_motion?: boolean
          simulated_role?:
            | Database["public"]["Enums"]["person_role_code"]
            | null
          theme?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_events: {
        Row: {
          actor_profile_id: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["project_event_kind"]
          note: string
          organization_id: string
          project_id: string
        }
        Insert: {
          actor_profile_id?: string | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["project_event_kind"]
          note: string
          organization_id: string
          project_id: string
        }
        Update: {
          actor_profile_id?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["project_event_kind"]
          note?: string
          organization_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          created_at: string
          created_by: string
          organization_id: string
          person_id: string
          project_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          organization_id: string
          person_id: string
          project_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          organization_id?: string
          person_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          code: string
          color: string
          created_at: string
          created_by: string
          health: Database["public"]["Enums"]["project_health"]
          id: string
          name: string
          organization_id: string
          owner_person_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          summary: string
          target_date: string | null
          updated_at: string
        }
        Insert: {
          code: string
          color?: string
          created_at?: string
          created_by: string
          health?: Database["public"]["Enums"]["project_health"]
          id?: string
          name: string
          organization_id: string
          owner_person_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          summary?: string
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          color?: string
          created_at?: string
          created_by?: string
          health?: Database["public"]["Enums"]["project_health"]
          id?: string
          name?: string
          organization_id?: string
          owner_person_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          summary?: string
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_owner_person_id_fkey"
            columns: ["owner_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          code: string
          color: string
          created_at: string
          id: string
          is_system: boolean
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          code: string
          color?: string
          created_at?: string
          id?: string
          is_system?: boolean
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          color?: string
          created_at?: string
          id?: string
          is_system?: boolean
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_analytics_views: {
        Row: {
          created_at: string
          filters: Json
          id: string
          module_id: string
          name: string
          organization_id: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          module_id: string
          name: string
          organization_id: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          module_id?: string
          name?: string
          organization_id?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_analytics_views_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_analytics_views_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          author_profile_id: string
          body: string
          created_at: string
          id: string
          organization_id: string
          task_id: string
        }
        Insert: {
          author_profile_id: string
          body: string
          created_at?: string
          id?: string
          organization_id: string
          task_id: string
        }
        Update: {
          author_profile_id?: string
          body?: string
          created_at?: string
          id?: string
          organization_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_dependencies: {
        Row: {
          created_at: string
          created_by: string
          depends_on_task_id: string
          id: string
          organization_id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          depends_on_task_id: string
          id?: string
          organization_id: string
          task_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          depends_on_task_id?: string
          id?: string
          organization_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_depends_on_task_id_fkey"
            columns: ["depends_on_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_events: {
        Row: {
          actor_profile_id: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["task_status"] | null
          id: string
          kind: Database["public"]["Enums"]["task_event_kind"]
          note: string
          organization_id: string
          task_id: string
          to_status: Database["public"]["Enums"]["task_status"] | null
        }
        Insert: {
          actor_profile_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["task_status"] | null
          id?: string
          kind: Database["public"]["Enums"]["task_event_kind"]
          note: string
          organization_id: string
          task_id: string
          to_status?: Database["public"]["Enums"]["task_status"] | null
        }
        Update: {
          actor_profile_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["task_status"] | null
          id?: string
          kind?: Database["public"]["Enums"]["task_event_kind"]
          note?: string
          organization_id?: string
          task_id?: string
          to_status?: Database["public"]["Enums"]["task_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "task_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_person_id: string | null
          assignee_profile_id: string | null
          created_at: string
          created_by: string
          description: string
          due_date: string | null
          id: string
          organization_id: string
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assignee_person_id?: string | null
          assignee_profile_id?: string | null
          created_at?: string
          created_by: string
          description?: string
          due_date?: string | null
          id?: string
          organization_id: string
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assignee_person_id?: string | null
          assignee_profile_id?: string | null
          created_at?: string
          created_by?: string
          description?: string
          due_date?: string | null
          id?: string
          organization_id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_person_id_fkey"
            columns: ["assignee_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assignee_profile_id_fkey"
            columns: ["assignee_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_entries: {
        Row: {
          amount_cents: number
          category: string
          concept: string
          created_at: string
          created_by: string
          currency: string
          entry_date: string
          id: string
          organization_id: string
          source: string
          status: Database["public"]["Enums"]["treasury_entry_status"]
          updated_at: string
        }
        Insert: {
          amount_cents: number
          category?: string
          concept: string
          created_at?: string
          created_by: string
          currency?: string
          entry_date: string
          id?: string
          organization_id: string
          source?: string
          status?: Database["public"]["Enums"]["treasury_entry_status"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          category?: string
          concept?: string
          created_at?: string
          created_by?: string
          currency?: string
          entry_date?: string
          id?: string
          organization_id?: string
          source?: string
          status?: Database["public"]["Enums"]["treasury_entry_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treasury_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_events: {
        Row: {
          actor_profile_id: string
          created_at: string
          entry_id: string
          from_status:
            | Database["public"]["Enums"]["treasury_entry_status"]
            | null
          id: number
          kind: string
          note: string
          organization_id: string
          to_status: Database["public"]["Enums"]["treasury_entry_status"]
        }
        Insert: {
          actor_profile_id: string
          created_at?: string
          entry_id: string
          from_status?:
            | Database["public"]["Enums"]["treasury_entry_status"]
            | null
          id?: never
          kind: string
          note: string
          organization_id: string
          to_status: Database["public"]["Enums"]["treasury_entry_status"]
        }
        Update: {
          actor_profile_id?: string
          created_at?: string
          entry_id?: string
          from_status?:
            | Database["public"]["Enums"]["treasury_entry_status"]
            | null
          id?: never
          kind?: string
          note?: string
          organization_id?: string
          to_status?: Database["public"]["Enums"]["treasury_entry_status"]
        }
        Relationships: [
          {
            foreignKeyName: "treasury_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_events_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "treasury_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_configuration: {
        Row: {
          analytics_policy: Json
          appearance_policy: Json
          calendar_policy: Json
          configuration: Json
          incident_policy: Json
          integration_policy: Json
          module_policy: Json
          organization_id: string
          payroll_policy: Json
          task_policy: Json
          treasury_policy: Json
          updated_at: string
          updated_by: string | null
          vacation_policy: Json
        }
        Insert: {
          analytics_policy?: Json
          appearance_policy?: Json
          calendar_policy?: Json
          configuration?: Json
          incident_policy?: Json
          integration_policy?: Json
          module_policy?: Json
          organization_id: string
          payroll_policy?: Json
          task_policy?: Json
          treasury_policy?: Json
          updated_at?: string
          updated_by?: string | null
          vacation_policy?: Json
        }
        Update: {
          analytics_policy?: Json
          appearance_policy?: Json
          calendar_policy?: Json
          configuration?: Json
          incident_policy?: Json
          integration_policy?: Json
          module_policy?: Json
          organization_id?: string
          payroll_policy?: Json
          task_policy?: Json
          treasury_policy?: Json
          updated_at?: string
          updated_by?: string | null
          vacation_policy?: Json
        }
        Relationships: [
          {
            foreignKeyName: "workspace_configuration_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_configuration_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      clear_own_avatar_path: { Args: never; Returns: undefined }
      create_payroll_run: {
        Args: {
          expected_organization_id: string
          target_currency: string
          target_deduction_total_cents: number
          target_gross_total_cents: number
          target_notes: string
          target_people_count: number
          target_period_end: string
          target_period_start: string
        }
        Returns: string
      }
      create_treasury_entry: {
        Args: {
          expected_organization_id: string
          target_amount_cents: number
          target_concept: string
          target_currency: string
          target_entry_date: string
        }
        Returns: string
      }
      ensure_public_demo_workspace: { Args: never; Returns: string }
      get_demo_workspace_status: {
        Args: { expected_organization_id: string }
        Returns: {
          database_size_bytes: number
          free_plan_read_only_threshold_bytes: number
          last_active_at: string
          scenario_version: number
        }[]
      }
      mark_demo_scenario_v2_restored: {
        Args: { target_checksum: string; target_organization_id: string }
        Returns: undefined
      }
      restore_demo_scenario: {
        Args: { expected_organization_id: string; target_module?: string }
        Returns: undefined
      }
      restore_demo_scenario_v3: { Args: never; Returns: undefined }
      restore_demo_scenario_v4: { Args: never; Returns: undefined }
      restore_demo_scenario_v5: { Args: never; Returns: undefined }
      restore_demo_scenario_v6: { Args: never; Returns: undefined }
      set_own_avatar_path: { Args: { target_path: string }; Returns: undefined }
      simulate_integration_run: {
        Args: {
          expected_connector_id: string
          expected_organization_id: string
        }
        Returns: string
      }
      touch_demo_workspace: {
        Args: { expected_organization_id: string }
        Returns: undefined
      }
      transition_changelog_entry: {
        Args: {
          expected_organization_id: string
          target_entry_id: string
          target_status: Database["public"]["Enums"]["changelog_status"]
          transition_note: string
        }
        Returns: undefined
      }
      transition_incident: {
        Args: {
          expected_organization_id: string
          target_incident_id: string
          target_status: Database["public"]["Enums"]["incident_status"]
          transition_note: string
        }
        Returns: undefined
      }
      transition_leave_request: {
        Args: {
          expected_organization_id: string
          target_request_id: string
          target_status: Database["public"]["Enums"]["leave_request_status"]
          transition_note: string
        }
        Returns: undefined
      }
      transition_payroll_run: {
        Args: {
          expected_organization_id: string
          target_run_id: string
          target_status: Database["public"]["Enums"]["payroll_run_status"]
          transition_note: string
        }
        Returns: undefined
      }
      transition_task: {
        Args: {
          expected_organization_id: string
          target_status: Database["public"]["Enums"]["task_status"]
          target_task_id: string
          transition_note: string
        }
        Returns: undefined
      }
      transition_treasury_entry: {
        Args: {
          expected_organization_id: string
          target_entry_id: string
          target_status: Database["public"]["Enums"]["treasury_entry_status"]
          transition_note: string
        }
        Returns: undefined
      }
      update_membership_access: {
        Args: {
          expected_organization_id: string
          target_membership_id: string
          target_role_id: string
          target_status: Database["public"]["Enums"]["membership_status"]
        }
        Returns: undefined
      }
      update_module_setting: {
        Args: {
          expected_organization_id: string
          target_enabled: boolean
          target_module_id: string
          target_sort_order: number
        }
        Returns: undefined
      }
      update_own_profile_preferences: {
        Args: {
          target_alias: string
          target_default_dashboard: string
          target_density: string
          target_high_contrast: boolean
          target_locale: string
          target_notification_preferences: Json
          target_reduced_motion: boolean
          target_simulated_role: Database["public"]["Enums"]["person_role_code"]
          target_theme: string
          target_timezone: string
        }
        Returns: undefined
      }
      update_payroll_collecting_run: {
        Args: {
          expected_organization_id: string
          target_currency: string
          target_deduction_total_cents: number
          target_gross_total_cents: number
          target_notes: string
          target_people_count: number
          target_period_end: string
          target_period_start: string
          target_run_id: string
        }
        Returns: undefined
      }
      update_role_permissions: {
        Args: {
          expected_organization_id: string
          target_permission_codes: string[]
          target_role_id: string
        }
        Returns: undefined
      }
      update_treasury_draft: {
        Args: {
          expected_organization_id: string
          target_amount_cents: number
          target_concept: string
          target_currency: string
          target_entry_date: string
          target_entry_id: string
        }
        Returns: undefined
      }
      update_workspace_configuration: {
        Args: { configuration_payload: Json; expected_organization_id: string }
        Returns: undefined
      }
    }
    Enums: {
      changelog_status: "draft" | "in_review" | "published"
      incident_category: "access" | "data" | "hardware" | "software" | "other"
      incident_event_kind:
        | "created"
        | "updated"
        | "assigned"
        | "status"
        | "priority"
      incident_priority: "low" | "medium" | "high" | "critical"
      incident_status:
        | "registered"
        | "triaged"
        | "assigned"
        | "investigating"
        | "resolved"
        | "closed"
      integration_kind: "financial" | "payroll" | "people"
      integration_run_status:
        | "scheduled"
        | "running"
        | "succeeded"
        | "partial"
        | "failed"
        | "cancelled"
      leave_request_status:
        | "draft"
        | "submitted"
        | "approved"
        | "rejected"
        | "cancelled"
      leave_type: "vacation" | "personal"
      membership_status: "invited" | "active" | "suspended"
      payroll_run_status:
        | "collecting"
        | "validating"
        | "calculated"
        | "reviewed"
        | "closed"
      people_event_kind: "created" | "updated" | "status" | "role"
      person_role_code: "admin" | "manager" | "collaborator" | "viewer"
      person_status: "invited" | "active" | "suspended" | "inactive"
      project_event_kind: "created" | "updated" | "status" | "health" | "member"
      project_health: "on_track" | "at_risk" | "off_track"
      project_status:
        | "planned"
        | "active"
        | "on_hold"
        | "completed"
        | "cancelled"
      task_event_kind:
        | "created"
        | "updated"
        | "assigned"
        | "status"
        | "comment"
        | "dependency"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status:
        | "pending"
        | "in_progress"
        | "blocked"
        | "in_review"
        | "completed"
      treasury_entry_status:
        | "draft"
        | "registered"
        | "reconciled"
        | "validated"
        | "closed"
      work_item_status:
        | "backlog"
        | "active"
        | "blocked"
        | "completed"
        | "archived"
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
    Enums: {
      changelog_status: ["draft", "in_review", "published"],
      incident_category: ["access", "data", "hardware", "software", "other"],
      incident_event_kind: [
        "created",
        "updated",
        "assigned",
        "status",
        "priority",
      ],
      incident_priority: ["low", "medium", "high", "critical"],
      incident_status: [
        "registered",
        "triaged",
        "assigned",
        "investigating",
        "resolved",
        "closed",
      ],
      integration_kind: ["financial", "payroll", "people"],
      integration_run_status: [
        "scheduled",
        "running",
        "succeeded",
        "partial",
        "failed",
        "cancelled",
      ],
      leave_request_status: [
        "draft",
        "submitted",
        "approved",
        "rejected",
        "cancelled",
      ],
      leave_type: ["vacation", "personal"],
      membership_status: ["invited", "active", "suspended"],
      payroll_run_status: [
        "collecting",
        "validating",
        "calculated",
        "reviewed",
        "closed",
      ],
      people_event_kind: ["created", "updated", "status", "role"],
      person_role_code: ["admin", "manager", "collaborator", "viewer"],
      person_status: ["invited", "active", "suspended", "inactive"],
      project_event_kind: ["created", "updated", "status", "health", "member"],
      project_health: ["on_track", "at_risk", "off_track"],
      project_status: [
        "planned",
        "active",
        "on_hold",
        "completed",
        "cancelled",
      ],
      task_event_kind: [
        "created",
        "updated",
        "assigned",
        "status",
        "comment",
        "dependency",
      ],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: [
        "pending",
        "in_progress",
        "blocked",
        "in_review",
        "completed",
      ],
      treasury_entry_status: [
        "draft",
        "registered",
        "reconciled",
        "validated",
        "closed",
      ],
      work_item_status: [
        "backlog",
        "active",
        "blocked",
        "completed",
        "archived",
      ],
    },
  },
} as const
