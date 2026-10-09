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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ad_campaign_enquiries: {
        Row: {
          budget_pence: number | null
          contact_email: string
          created_at: string
          id: string
          objective: string
          provider_id: string
          requested_by: string
          requested_end: string | null
          requested_start: string | null
          status: string
          target_category_ids: string[]
          target_cities: string[]
          updated_at: string
        }
        Insert: {
          budget_pence?: number | null
          contact_email: string
          created_at?: string
          id?: string
          objective: string
          provider_id: string
          requested_by: string
          requested_end?: string | null
          requested_start?: string | null
          status?: string
          target_category_ids?: string[]
          target_cities?: string[]
          updated_at?: string
        }
        Update: {
          budget_pence?: number | null
          contact_email?: string
          created_at?: string
          id?: string
          objective?: string
          provider_id?: string
          requested_by?: string
          requested_end?: string | null
          requested_start?: string | null
          status?: string
          target_category_ids?: string[]
          target_cities?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaign_enquiries_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_campaign_events: {
        Row: {
          anonymous_session_id: string
          campaign_id: string
          event_type: string
          id: number
          occurred_at: string
          placement: string
        }
        Insert: {
          anonymous_session_id: string
          campaign_id: string
          event_type: string
          id?: never
          occurred_at?: string
          placement: string
        }
        Update: {
          anonymous_session_id?: string
          campaign_id?: string
          event_type?: string
          id?: never
          occurred_at?: string
          placement?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaign_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaign_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_campaign_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_campaign_invoices: {
        Row: {
          amount_pence: number
          campaign_id: string
          created_at: string
          currency: string
          due_at: string | null
          id: string
          invoice_number: string
          issued_at: string | null
          paid_at: string | null
          status: string
        }
        Insert: {
          amount_pence: number
          campaign_id: string
          created_at?: string
          currency?: string
          due_at?: string | null
          id?: string
          invoice_number: string
          issued_at?: string | null
          paid_at?: string | null
          status?: string
        }
        Update: {
          amount_pence?: number
          campaign_id?: string
          created_at?: string
          currency?: string
          due_at?: string | null
          id?: string
          invoice_number?: string
          issued_at?: string | null
          paid_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaign_invoices_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaign_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_campaign_invoices_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_campaigns: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          body: string
          created_at: string
          creative_url: string
          destination_url: string
          ends_at: string
          enquiry_id: string | null
          headline: string
          id: string
          name: string
          provider_id: string
          starts_at: string
          status: string
          target_category_ids: string[]
          target_cities: string[]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          body: string
          created_at?: string
          creative_url: string
          destination_url: string
          ends_at: string
          enquiry_id?: string | null
          headline: string
          id?: string
          name: string
          provider_id: string
          starts_at: string
          status?: string
          target_category_ids?: string[]
          target_cities?: string[]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          body?: string
          created_at?: string
          creative_url?: string
          destination_url?: string
          ends_at?: string
          enquiry_id?: string | null
          headline?: string
          id?: string
          name?: string
          provider_id?: string
          starts_at?: string
          status?: string
          target_category_ids?: string[]
          target_cities?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaigns_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "ad_campaign_enquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_campaigns_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string
          id: number
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type: string
          id?: never
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: never
        }
        Relationships: []
      }
      app_error_events: {
        Row: {
          app_area: string
          created_at: string
          error_name: string
          id: number
          message: string
          metadata: Json
          platform: string
          user_id: string | null
        }
        Insert: {
          app_area: string
          created_at?: string
          error_name: string
          id?: never
          message: string
          metadata?: Json
          platform: string
          user_id?: string | null
        }
        Update: {
          app_area?: string
          created_at?: string
          error_name?: string
          id?: never
          message?: string
          metadata?: Json
          platform?: string
          user_id?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          provider_id: string | null
          provider_message: string | null
          requested_date: string | null
          requested_time: string | null
          responded_at: string | null
          service_id: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          provider_id?: string | null
          provider_message?: string | null
          requested_date?: string | null
          requested_time?: string | null
          responded_at?: string | null
          service_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          provider_id?: string | null
          provider_message?: string | null
          requested_date?: string | null
          requested_time?: string | null
          responded_at?: string | null
          service_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      business_applications: {
        Row: {
          applicant_id: string
          business_name: string
          category_id: string
          city: string
          email: string
          id: string
          phone: string
          postcode: string
          proof_name: string
          proof_path: string
          provider_id: string | null
          review_due_at: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          revision: number
          status: string
          submitted_at: string
        }
        Insert: {
          applicant_id: string
          business_name: string
          category_id: string
          city: string
          email: string
          id: string
          phone: string
          postcode: string
          proof_name: string
          proof_path: string
          provider_id?: string | null
          review_due_at?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision?: number
          status?: string
          submitted_at?: string
        }
        Update: {
          applicant_id?: string
          business_name?: string
          category_id?: string
          city?: string
          email?: string
          id?: string
          phone?: string
          postcode?: string
          proof_name?: string
          proof_path?: string
          provider_id?: string | null
          review_due_at?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision?: number
          status?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_applications_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_applications_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string
          created_at: string | null
          icon: string
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          color: string
          created_at?: string | null
          icon: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          color?: string
          created_at?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      community_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          parent_comment_id: string | null
          post_id: string
          status: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id: string
          status?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "community_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_events: {
        Row: {
          address: string | null
          booking_url: string | null
          city: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          ends_at: string | null
          event_type: string
          id: string
          image_url: string | null
          map_url: string | null
          organizer_name: string
          postcode: string | null
          publication_consent: boolean
          starts_at: string
          status: string
          summary: string
          title: string
          updated_at: string
          venue_name: string | null
        }
        Insert: {
          address?: string | null
          booking_url?: string | null
          city: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          event_type?: string
          id?: string
          image_url?: string | null
          map_url?: string | null
          organizer_name: string
          postcode?: string | null
          publication_consent?: boolean
          starts_at: string
          status?: string
          summary: string
          title: string
          updated_at?: string
          venue_name?: string | null
        }
        Update: {
          address?: string | null
          booking_url?: string | null
          city?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          event_type?: string
          id?: string
          image_url?: string | null
          map_url?: string | null
          organizer_name?: string
          postcode?: string | null
          publication_consent?: boolean
          starts_at?: string
          status?: string
          summary?: string
          title?: string
          updated_at?: string
          venue_name?: string | null
        }
        Relationships: []
      }
      community_member_permissions: {
        Row: {
          can_comment: boolean
          can_post: boolean
          space_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_comment?: boolean
          can_post?: boolean
          space_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_comment?: boolean
          can_post?: boolean
          space_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_member_permissions_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "community_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      community_memberships: {
        Row: {
          joined_at: string
          role: string
          space_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          role?: string
          space_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          role?: string
          space_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_memberships_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "community_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_reports: {
        Row: {
          comment_id: string | null
          created_at: string
          id: string
          post_id: string
          reason: string
          reporter_id: string
          status: string
          updated_at: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id: string
          reason: string
          reporter_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string
          reason?: string
          reporter_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "community_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_post_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_sync_receipts: {
        Row: {
          created_at: string
          operation_id: string
          payload: Json
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          operation_id: string
          payload: Json
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          operation_id?: string
          payload?: Json
          post_id?: string
          user_id?: string
        }
        Relationships: []
      }
      community_posts: {
        Row: {
          author_id: string
          body: string
          community_id: string
          created_at: string
          id: string
          image_url: string | null
          location_city: string | null
          offer_expires_at: string | null
          post_type: string
          provider_id: string | null
          region_key: string | null
          status: string
        }
        Insert: {
          author_id: string
          body: string
          community_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          location_city?: string | null
          offer_expires_at?: string | null
          post_type?: string
          provider_id?: string | null
          region_key?: string | null
          status?: string
        }
        Update: {
          author_id?: string
          body?: string
          community_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          location_city?: string | null
          offer_expires_at?: string | null
          post_type?: string
          provider_id?: string | null
          region_key?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "community_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      community_rate_limit_buckets: {
        Row: {
          action: string
          request_count: number
          user_id: string
          window_started_at: string
        }
        Insert: {
          action: string
          request_count: number
          user_id: string
          window_started_at: string
        }
        Update: {
          action?: string
          request_count?: number
          user_id?: string
          window_started_at?: string
        }
        Relationships: []
      }
      community_resources: {
        Row: {
          city: string | null
          consent_confirmed_at: string | null
          consent_reference: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          region: string | null
          resource_type: string
          rights_basis: string
          source_url: string
          status: string
          summary: string
          updated_at: string
          website_url: string | null
          whatsapp_url: string | null
        }
        Insert: {
          city?: string | null
          consent_confirmed_at?: string | null
          consent_reference?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          region?: string | null
          resource_type: string
          rights_basis: string
          source_url: string
          status?: string
          summary: string
          updated_at?: string
          website_url?: string | null
          whatsapp_url?: string | null
        }
        Update: {
          city?: string | null
          consent_confirmed_at?: string | null
          consent_reference?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          region?: string | null
          resource_type?: string
          rights_basis?: string
          source_url?: string
          status?: string
          summary?: string
          updated_at?: string
          website_url?: string | null
          whatsapp_url?: string | null
        }
        Relationships: []
      }
      community_saved_posts: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_spaces: {
        Row: {
          comments_enabled: boolean
          created_at: string
          created_by: string | null
          description: string
          id: string
          name: string
          posting_policy: string
          rules: string
          slug: string
          status: string
          updated_at: string
          visibility: string
        }
        Insert: {
          comments_enabled?: boolean
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          name: string
          posting_policy?: string
          rules?: string
          slug: string
          status?: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          comments_enabled?: boolean
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          name?: string
          posting_policy?: string
          rules?: string
          slug?: string
          status?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      community_user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: []
      }
      directory_import_candidates: {
        Row: {
          business_name: string
          consent_evidence: string | null
          contact_channel: string | null
          contact_reference: string | null
          created_at: string
          id: string
          image_rights_evidence: string | null
          notes: string | null
          provider_id: string | null
          publication_consent: string
          source_checked_at: string | null
          source_url: string
          status: string
          updated_at: string
        }
        Insert: {
          business_name: string
          consent_evidence?: string | null
          contact_channel?: string | null
          contact_reference?: string | null
          created_at?: string
          id?: string
          image_rights_evidence?: string | null
          notes?: string | null
          provider_id?: string | null
          publication_consent?: string
          source_checked_at?: string | null
          source_url: string
          status?: string
          updated_at?: string
        }
        Update: {
          business_name?: string
          consent_evidence?: string | null
          contact_channel?: string | null
          contact_reference?: string | null
          created_at?: string
          id?: string
          image_rights_evidence?: string | null
          notes?: string | null
          provider_id?: string | null
          publication_consent?: string
          source_checked_at?: string | null
          source_url?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "directory_import_candidates_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      directory_profiles: {
        Row: {
          address: string | null
          category: string
          city: string | null
          demo_use: string
          description: string
          email: string | null
          facebook: string | null
          imported_at: string
          instagram: string | null
          language_tags: string[]
          name: string
          notes: string | null
          phone: string | null
          profile_type: string
          region: string | null
          source_id: string
          source_url: string
          subcategory: string | null
          updated_at: string
          verification_status: string
          website: string | null
        }
        Insert: {
          address?: string | null
          category: string
          city?: string | null
          demo_use: string
          description: string
          email?: string | null
          facebook?: string | null
          imported_at?: string
          instagram?: string | null
          language_tags?: string[]
          name: string
          notes?: string | null
          phone?: string | null
          profile_type: string
          region?: string | null
          source_id: string
          source_url: string
          subcategory?: string | null
          updated_at?: string
          verification_status: string
          website?: string | null
        }
        Update: {
          address?: string | null
          category?: string
          city?: string | null
          demo_use?: string
          description?: string
          email?: string | null
          facebook?: string | null
          imported_at?: string
          instagram?: string | null
          language_tags?: string[]
          name?: string
          notes?: string | null
          phone?: string | null
          profile_type?: string
          region?: string | null
          source_id?: string
          source_url?: string
          subcategory?: string | null
          updated_at?: string
          verification_status?: string
          website?: string | null
        }
        Relationships: []
      }
      edge_rate_limits: {
        Row: {
          bucket_started_at: string
          identifier: string
          request_count: number
          scope: string
        }
        Insert: {
          bucket_started_at: string
          identifier: string
          request_count: number
          scope: string
        }
        Update: {
          bucket_started_at?: string
          identifier?: string
          request_count?: number
          scope?: string
        }
        Relationships: []
      }
      mvp_events: {
        Row: {
          created_at: string
          entity_id: string | null
          event_type: string
          id: number
          installation_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          event_type: string
          id?: never
          installation_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          event_type?: string
          id?: never
          installation_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          event_key: string | null
          id: string
          read_at: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_key?: string | null
          id?: string
          read_at?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_key?: string | null
          id?: string
          read_at?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payment_records: {
        Row: {
          amount_pence: number
          created_at: string
          currency: string
          id: string
          invoice_url: string | null
          provider_id: string
          receipt_url: string | null
          status: string
          transaction_id: string | null
        }
        Insert: {
          amount_pence: number
          created_at?: string
          currency?: string
          id?: string
          invoice_url?: string | null
          provider_id: string
          receipt_url?: string | null
          status: string
          transaction_id?: string | null
        }
        Update: {
          amount_pence?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_url?: string | null
          provider_id?: string
          receipt_url?: string | null
          status?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_records_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string | null
          expo_push_token: string | null
          full_name: string | null
          id: string
          phone: string | null
          preferred_categories: string[] | null
          push_channel_id: string
          push_token_updated_at: string | null
          push_vibration_enabled: boolean
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string | null
          expo_push_token?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          preferred_categories?: string[] | null
          push_channel_id?: string
          push_token_updated_at?: string | null
          push_vibration_enabled?: boolean
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string | null
          expo_push_token?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          preferred_categories?: string[] | null
          push_channel_id?: string
          push_token_updated_at?: string | null
          push_vibration_enabled?: boolean
        }
        Relationships: []
      }
      provider_analytics_events: {
        Row: {
          created_at: string
          event_type: string
          id: number
          provider_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: never
          provider_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: never
          provider_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_analytics_events_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_entitlements: {
        Row: {
          expires_at: string | null
          offer_period_start: string | null
          offer_posts_used: number
          offers_active: boolean
          plan_code: string | null
          provider_id: string
          search_tier: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          expires_at?: string | null
          offer_period_start?: string | null
          offer_posts_used?: number
          offers_active?: boolean
          plan_code?: string | null
          provider_id: string
          search_tier?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          expires_at?: string | null
          offer_period_start?: string | null
          offer_posts_used?: number
          offers_active?: boolean
          plan_code?: string | null
          provider_id?: string
          search_tier?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_entitlements_plan_code_fkey"
            columns: ["plan_code"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "provider_entitlements_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_hours: {
        Row: {
          close_time: string | null
          day_of_week: number
          id: string
          is_closed: boolean | null
          open_time: string | null
          provider_id: string | null
        }
        Insert: {
          close_time?: string | null
          day_of_week: number
          id?: string
          is_closed?: boolean | null
          open_time?: string | null
          provider_id?: string | null
        }
        Update: {
          close_time?: string | null
          day_of_week?: number
          id?: string
          is_closed?: boolean | null
          open_time?: string | null
          provider_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_hours_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_lead_deliveries: {
        Row: {
          attempts: number
          channel: string
          created_at: string
          delivered_at: string | null
          destination: string | null
          id: string
          last_error: string | null
          provider_id: string
          quote_request_id: string
          status: string
        }
        Insert: {
          attempts?: number
          channel: string
          created_at?: string
          delivered_at?: string | null
          destination?: string | null
          id?: string
          last_error?: string | null
          provider_id: string
          quote_request_id: string
          status?: string
        }
        Update: {
          attempts?: number
          channel?: string
          created_at?: string
          delivered_at?: string | null
          destination?: string | null
          id?: string
          last_error?: string | null
          provider_id?: string
          quote_request_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_lead_deliveries_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_lead_deliveries_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_publication_consents: {
        Row: {
          contact_channel: string | null
          contact_confirmed_at: string | null
          contact_reference: string | null
          contact_status: string
          contacted_at: string | null
          evidence_reference: string | null
          expires_at: string | null
          image_rights_status: string
          notes: string | null
          provider_id: string
          responded_at: string | null
          reviewed_at: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          contact_channel?: string | null
          contact_confirmed_at?: string | null
          contact_reference?: string | null
          contact_status?: string
          contacted_at?: string | null
          evidence_reference?: string | null
          expires_at?: string | null
          image_rights_status?: string
          notes?: string | null
          provider_id: string
          responded_at?: string | null
          reviewed_at?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          contact_channel?: string | null
          contact_confirmed_at?: string | null
          contact_reference?: string | null
          contact_status?: string
          contacted_at?: string | null
          evidence_reference?: string | null
          expires_at?: string | null
          image_rights_status?: string
          notes?: string | null
          provider_id?: string
          responded_at?: string | null
          reviewed_at?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_publication_consents_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_removal_archive: {
        Row: {
          provider: Json
          provider_id: string
          reason: string
          removed_at: string
        }
        Insert: {
          provider: Json
          provider_id: string
          reason: string
          removed_at?: string
        }
        Update: {
          provider?: Json
          provider_id?: string
          reason?: string
          removed_at?: string
        }
        Relationships: []
      }
      provider_reports: {
        Row: {
          created_at: string | null
          details: string | null
          id: string
          provider_id: string
          reason: string
          reporter_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          details?: string | null
          id?: string
          provider_id: string
          reason: string
          reporter_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          details?: string | null
          id?: string
          provider_id?: string
          reason?: string
          reporter_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_reports_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          avg_rating: number | null
          base_city: string
          base_location: unknown
          base_postcode: string | null
          business_name: string
          category_id: string
          contact_email: string | null
          cover_image_url: string | null
          created_at: string | null
          data_notes: string | null
          data_verification_status: string
          data_verified_at: string | null
          description: string | null
          facebook: string | null
          google_place_id: string | null
          id: string
          instagram: string | null
          is_claimed: boolean | null
          is_verified: boolean | null
          languages_spoken: string[] | null
          owner_id: string | null
          phone: string | null
          portfolio_urls: string[] | null
          price_range: number | null
          review_count: number | null
          service_areas: string[] | null
          source_profile_id: string | null
          source_url: string | null
          sponsored_rank: number
          sponsored_until: string | null
          street_address: string | null
          subcategory: string | null
          updated_at: string | null
          verification_status: string
          website: string | null
          whatsapp: string | null
          years_experience: number | null
        }
        Insert: {
          avg_rating?: number | null
          base_city: string
          base_location?: unknown
          base_postcode?: string | null
          business_name: string
          category_id: string
          contact_email?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          data_notes?: string | null
          data_verification_status?: string
          data_verified_at?: string | null
          description?: string | null
          facebook?: string | null
          google_place_id?: string | null
          id?: string
          instagram?: string | null
          is_claimed?: boolean | null
          is_verified?: boolean | null
          languages_spoken?: string[] | null
          owner_id?: string | null
          phone?: string | null
          portfolio_urls?: string[] | null
          price_range?: number | null
          review_count?: number | null
          service_areas?: string[] | null
          source_profile_id?: string | null
          source_url?: string | null
          sponsored_rank?: number
          sponsored_until?: string | null
          street_address?: string | null
          subcategory?: string | null
          updated_at?: string | null
          verification_status?: string
          website?: string | null
          whatsapp?: string | null
          years_experience?: number | null
        }
        Update: {
          avg_rating?: number | null
          base_city?: string
          base_location?: unknown
          base_postcode?: string | null
          business_name?: string
          category_id?: string
          contact_email?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          data_notes?: string | null
          data_verification_status?: string
          data_verified_at?: string | null
          description?: string | null
          facebook?: string | null
          google_place_id?: string | null
          id?: string
          instagram?: string | null
          is_claimed?: boolean | null
          is_verified?: boolean | null
          languages_spoken?: string[] | null
          owner_id?: string | null
          phone?: string | null
          portfolio_urls?: string[] | null
          price_range?: number | null
          review_count?: number | null
          service_areas?: string[] | null
          source_profile_id?: string | null
          source_url?: string | null
          sponsored_rank?: number
          sponsored_until?: string | null
          street_address?: string | null
          subcategory?: string | null
          updated_at?: string | null
          verification_status?: string
          website?: string | null
          whatsapp?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "providers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      push_delivery_attempts: {
        Row: {
          created_at: string
          delivery_state: string
          error_code: string | null
          expo_ticket_id: string | null
          id: number
          notification_id: string
          outcome: string
          provider_status: string | null
          receipt_checked_at: string | null
          recipient_token_hash: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          delivery_state?: string
          error_code?: string | null
          expo_ticket_id?: string | null
          id?: never
          notification_id: string
          outcome: string
          provider_status?: string | null
          receipt_checked_at?: string | null
          recipient_token_hash?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          delivery_state?: string
          error_code?: string | null
          expo_ticket_id?: string | null
          id?: never
          notification_id?: string
          outcome?: string
          provider_status?: string | null
          receipt_checked_at?: string | null
          recipient_token_hash?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      quote_request_attachments: {
        Row: {
          byte_size: number | null
          created_at: string
          file_name: string
          id: string
          mime_type: string
          quote_request_id: string
          storage_path: string
        }
        Insert: {
          byte_size?: number | null
          created_at?: string
          file_name: string
          id?: string
          mime_type: string
          quote_request_id: string
          storage_path: string
        }
        Update: {
          byte_size?: number | null
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string
          quote_request_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_request_attachments_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_requests: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          preferred_contact: string | null
          provider_id: string | null
          responded_at: string | null
          response_message: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          preferred_contact?: string | null
          provider_id?: string | null
          responded_at?: string | null
          response_message?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          preferred_contact?: string | null
          provider_id?: string | null
          responded_at?: string | null
          response_message?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_requests_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      recent_searches: {
        Row: {
          created_at: string | null
          id: string
          query: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          query: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          query?: string
          user_id?: string | null
        }
        Relationships: []
      }
      review_replies: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          provider_id: string
          review_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          provider_id: string
          review_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          provider_id?: string
          review_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_replies_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_replies_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: true
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          moderation_status: string
          provider_id: string | null
          rating: number
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          moderation_status?: string
          provider_id?: string | null
          rating: number
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          moderation_status?: string
          provider_id?: string | null
          rating?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_items: {
        Row: {
          created_at: string | null
          id: string
          provider_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          provider_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          provider_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_items_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      service_catalog: {
        Row: {
          category_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_catalog_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          catalog_service_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_featured: boolean | null
          name: string
          provider_id: string | null
          starting_price: number | null
        }
        Insert: {
          catalog_service_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean | null
          name: string
          provider_id?: string | null
          starting_price?: number | null
        }
        Update: {
          catalog_service_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean | null
          name?: string
          provider_id?: string | null
          starting_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "services_catalog_service_id_fkey"
            columns: ["catalog_service_id"]
            isOneToOne: false
            referencedRelation: "service_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          active: boolean
          code: string
          features: Json
          name: string
          price_pence: number
          promotion_limit: number
          search_tier: number
        }
        Insert: {
          active?: boolean
          code: string
          features?: Json
          name: string
          price_pence: number
          promotion_limit?: number
          search_tier?: number
        }
        Update: {
          active?: boolean
          code?: string
          features?: Json
          name?: string
          price_pence?: number
          promotion_limit?: number
          search_tier?: number
        }
        Relationships: []
      }
      subscription_requests: {
        Row: {
          created_at: string
          id: string
          plan_code: string
          provider_id: string
          requested_by: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan_code: string
          provider_id: string
          requested_by: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          plan_code?: string
          provider_id?: string
          requested_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_requests_plan_code_fkey"
            columns: ["plan_code"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "subscription_requests_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_moderation_status: {
        Row: {
          reason: string | null
          status: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          reason?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          reason?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      verification_documents: {
        Row: {
          created_at: string
          document_type: string
          id: string
          provider_id: string
          request_id: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          document_type: string
          id?: string
          provider_id: string
          request_id: string
          storage_path: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          document_type?: string
          id?: string
          provider_id?: string
          request_id?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_documents_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_documents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "verification_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_requests: {
        Row: {
          admin_notes: string | null
          id: string
          notes: string | null
          provider_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          submitted_by: string
        }
        Insert: {
          admin_notes?: string | null
          id?: string
          notes?: string | null
          provider_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          submitted_by: string
        }
        Update: {
          admin_notes?: string | null
          id?: string
          notes?: string | null
          provider_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          submitted_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_requests_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      ad_campaign_performance: {
        Row: {
          click_through_rate: number | null
          clicks: number | null
          ends_at: string | null
          id: string | null
          impressions: number | null
          name: string | null
          provider_id: string | null
          starts_at: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaigns_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      mvp_success_metrics: {
        Row: {
          businesses_claimed: number | null
          businesses_listed: number | null
          event_views: number | null
          installs: number | null
          offer_views: number | null
          quote_requests: number | null
          quote_responses: number | null
          signups: number | null
        }
        Relationships: []
      }
      operational_error_summary: {
        Row: {
          app_area: string | null
          bucket: string | null
          error_count: number | null
          fatal_count: number | null
          platform: string | null
        }
        Relationships: []
      }
      operational_push_summary: {
        Row: {
          attempt_count: number | null
          bucket: string | null
          delivered_count: number | null
          failed_count: number | null
          skipped_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      admin_broadcast_notification: {
        Args: { message_body: string; message_title: string }
        Returns: number
      }
      admin_moderate_community_report: {
        Args: {
          moderation_action: string
          moderation_note: string
          report_id: string
        }
        Returns: string
      }
      admin_resolve_report: {
        Args: {
          expected_status: string
          expected_updated_at: string
          next_status: string
          report_id: string
          report_kind: string
          resolution_note: string
        }
        Returns: Json
      }
      admin_save_community_space: {
        Args: {
          changes: Json
          decision_note: string
          expected_updated_at: string
          target_space: string
        }
        Returns: string
      }
      admin_search_members: {
        Args: { result_limit?: number; search_term: string }
        Returns: {
          account_status: string
          created_at: string
          display_name: string
          email: string
          user_id: string
        }[]
      }
      admin_set_community_member: {
        Args: {
          allow_comments: boolean
          allow_posts: boolean
          decision_note: string
          expected_permission_update: string
          expected_role: string
          new_role: string
          target_space: string
          target_user: string
        }
        Returns: undefined
      }
      admin_set_user_moderation: {
        Args: {
          moderation_reason: string
          next_status: string
          target_email: string
        }
        Returns: string
      }
      admin_transition_community_comment: {
        Args: {
          comment_id: string
          expected_status: string
          next_status: string
          reason: string
        }
        Returns: Json
      }
      admin_transition_community_post: {
        Args: {
          expected_status: string
          next_status: string
          post_id: string
          reason: string
        }
        Returns: Json
      }
      claim_imported_provider: {
        Args: { target_provider: string }
        Returns: {
          business_name: string
          provider_id: string
          request_id: string
        }[]
      }
      community_can_contribute: {
        Args: { contribution: string; target_space: string }
        Returns: boolean
      }
      community_has_membership: {
        Args: { target_space: string }
        Returns: boolean
      }
      community_moderate_comment: {
        Args: {
          expected_status: string
          next_status: string
          reason: string
          target_comment: string
        }
        Returns: Json
      }
      community_moderate_post: {
        Args: {
          expected_status: string
          next_status: string
          reason: string
          target_post: string
        }
        Returns: Json
      }
      community_post_engagement: {
        Args: never
        Returns: {
          comment_count: number
          is_liked: boolean
          like_count: number
          post_id: string
        }[]
      }
      community_post_engagement_for_posts: {
        Args: { requested_posts: string[] }
        Returns: {
          comment_count: number
          is_liked: boolean
          like_count: number
          post_id: string
        }[]
      }
      community_users_blocked: {
        Args: { user_a: string; user_b: string }
        Returns: boolean
      }
      consume_community_rate_limit: {
        Args: {
          max_requests: number
          target_action: string
          target_user: string
          window_seconds: number
        }
        Returns: undefined
      }
      consume_edge_rate_limit: {
        Args: {
          maximum_requests: number
          rate_identifier: string
          rate_scope: string
          window_seconds: number
        }
        Returns: {
          request_count: number
        }[]
      }
      disablelongtransactions: { Args: never; Returns: string }
      dispatch_push_receipt_check: { Args: never; Returns: undefined }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_community_member_profile: {
        Args: { target_author: string }
        Returns: {
          author_id: string
          avatar_url: string
          display_name: string
          joined_year: number
        }[]
      }
      gettransactionid: { Args: never; Returns: unknown }
      is_admin: { Args: never; Returns: boolean }
      list_active_ad_campaigns: {
        Args: { target_category?: string; target_city?: string }
        Returns: {
          body: string
          creative_url: string
          destination_url: string
          headline: string
          id: string
          provider_id: string
        }[]
      }
      list_claimable_providers: {
        Args: never
        Returns: {
          base_city: string
          base_postcode: string
          business_name: string
          id: string
        }[]
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      owns_provider: { Args: { target_provider: string }; Returns: boolean }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      prepare_account_deletion: {
        Args: { target_user: string }
        Returns: undefined
      }
      public_provider_coordinates: {
        Args: never
        Returns: {
          id: string
          latitude: number
          longitude: number
        }[]
      }
      publish_queued_community_post: {
        Args: { operation_id: string; payload: Json }
        Returns: string
      }
      record_ad_campaign_event: {
        Args: {
          event_kind: string
          placement_name: string
          session_id: string
          target_campaign: string
        }
        Returns: undefined
      }
      record_user_moderation_change: {
        Args: {
          actor_user_id: string
          moderation_reason: string
          next_status: string
          previous_status: string
          request_id: string
          target_user_id: string
        }
        Returns: undefined
      }
      replace_provider_hours: {
        Args: { schedule: Json; target_provider: string }
        Returns: Json
      }
      respond_to_quote: {
        Args: {
          expected_status: string
          response_text: string
          target_quote: string
        }
        Returns: Json
      }
      review_business_application: {
        Args: {
          application_id: string
          decision: string
          decision_note: string
          expected_revision: number
        }
        Returns: string
      }
      search_providers: {
        Args: { p_category_slug?: string; p_city?: string; p_language?: string }
        Returns: {
          avg_rating: number
          base_city: string
          business_name: string
          category: string
          cover_image_url: string
          id: string
          price_range: number
          review_count: number
          service_areas: string[]
        }[]
      }
      send_community_activity_notification: {
        Args: {
          activity_key: string
          actor: string
          kind: string
          message_body: string
          message_title: string
          post_id: string
          recipient: string
        }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      submit_business_application: {
        Args: {
          application_id: string
          business_name: string
          category_id: string
          city: string
          phone: string
          postcode: string
          proof_name: string
          proof_path: string
        }
        Returns: string
      }
      submit_provider_verification: {
        Args: { request_notes?: string; target_provider: string }
        Returns: string
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
    Enums: {},
  },
} as const
