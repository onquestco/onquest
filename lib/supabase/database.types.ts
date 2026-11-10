
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "geocode_cache": {
                  Row: {
                    "cache_key": string,"result": NonNullable<Json>,"save_reason": string,"saved_at": string,"saved_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cache_key": string,"result": NonNullable<Json>,"save_reason": string,"saved_at": string,"saved_by"?: string | null
                  }
                  Update: {
                    "cache_key"?: string,"result"?: NonNullable<Json>,"save_reason"?: string,"saved_at"?: string,"saved_by"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"geocoder_calls": {
                  Row: {
                    "called_at": string,"key": string,"kind": string,"save_reason": string,"saved_at": string,"saved_by": string | null,"user_key": string
                  }
                  ComputedFields: never
                  Insert: {
                    "called_at": string,"key": string,"kind": string,"save_reason": string,"saved_at": string,"saved_by"?: string | null,"user_key": string
                  }
                  Update: {
                    "called_at"?: string,"key"?: string,"kind"?: string,"save_reason"?: string,"saved_at"?: string,"saved_by"?: string | null,"user_key"?: string
                  }
                  Relationships: [
                    
                  ]
                },"handle_claims": {
                  Row: {
                    "handle": string,"profile_key": string,"save_reason": string,"saved_at": string,"saved_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "handle": string,"profile_key": string,"save_reason": string,"saved_at": string,"saved_by"?: string | null
                  }
                  Update: {
                    "handle"?: string,"profile_key"?: string,"save_reason"?: string,"saved_at"?: string,"saved_by"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"photos": {
                  Row: {
                    "caption": string | null,"height": number,"id": string,"owner_id": string,"sort": number,"taken_at": string | null,"trip_id": string,"width": number
                  }
                  ComputedFields: never
                  Insert: {
                    "caption"?: string | null,"height": number,"id": string,"owner_id": string,"sort"?: number,"taken_at"?: string | null,"trip_id": string,"width": number
                  }
                  Update: {
                    "caption"?: string | null,"height"?: number,"id"?: string,"owner_id"?: string,"sort"?: number,"taken_at"?: string | null,"trip_id"?: string,"width"?: number
                  }
                  Relationships: [
                    
                  ]
                },"places": {
                  Row: {
                    "city": string | null,"country_code": string | null,"geo_ref": string | null,"id": string,"lat": number,"lng": number,"name": string,"note": string | null,"photo_id": string | null,"sort": number,"trip_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "city"?: string | null,"country_code"?: string | null,"geo_ref"?: string | null,"id"?: string,"lat": number,"lng": number,"name": string,"note"?: string | null,"photo_id"?: string | null,"sort"?: number,"trip_id": string
                  }
                  Update: {
                    "city"?: string | null,"country_code"?: string | null,"geo_ref"?: string | null,"id"?: string,"lat"?: number,"lng"?: number,"name"?: string,"note"?: string | null,"photo_id"?: string | null,"sort"?: number,"trip_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"bio": string | null,"created_at": string,"handle": string,"home_city": string | null,"key": string,"name": string | null,"save_reason": string,"saved_at": string,"saved_by": string | null,"settings": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"bio"?: string | null,"created_at"?: string,"handle": string,"home_city"?: string | null,"key": string,"name"?: string | null,"save_reason"?: string,"saved_at"?: string,"saved_by"?: string | null,"settings"?: NonNullable<Json>
                  }
                  Update: {
                    "avatar_url"?: string | null,"bio"?: string | null,"created_at"?: string,"handle"?: string,"home_city"?: string | null,"key"?: string,"name"?: string | null,"save_reason"?: string,"saved_at"?: string,"saved_by"?: string | null,"settings"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"profiles_archive": {
                  Row: {
                    "archived_at": string,"avatar_url": string | null,"bio": string | null,"created_at": string,"handle": string,"home_city": string | null,"key": string,"name": string | null,"save_reason": string,"saved_at": string,"saved_by": string | null,"settings": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at": string,"avatar_url"?: string | null,"bio"?: string | null,"created_at": string,"handle": string,"home_city"?: string | null,"key": string,"name"?: string | null,"save_reason": string,"saved_at": string,"saved_by"?: string | null,"settings": NonNullable<Json>
                  }
                  Update: {
                    "archived_at"?: string,"avatar_url"?: string | null,"bio"?: string | null,"created_at"?: string,"handle"?: string,"home_city"?: string | null,"key"?: string,"name"?: string | null,"save_reason"?: string,"saved_at"?: string,"saved_by"?: string | null,"settings"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"removed_trip_urls": {
                  Row: {
                    "save_reason": string,"saved_at": string,"saved_by": string | null,"trip_key": string,"url_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "save_reason": string,"saved_at": string,"saved_by"?: string | null,"trip_key": string,"url_hash": string
                  }
                  Update: {
                    "save_reason"?: string,"saved_at"?: string,"saved_by"?: string | null,"trip_key"?: string,"url_hash"?: string
                  }
                  Relationships: [
                    
                  ]
                },"trip_drafts": {
                  Row: {
                    "content": NonNullable<Json>,"cover_photo_key": string | null,"end_date": string | null,"key": string,"owner_key": string,"photos": NonNullable<Json>,"places": NonNullable<Json>,"save_reason": string,"saved_at": string,"saved_by": string | null,"short_title": string | null,"start_date": string | null,"started_at": string | null,"template_id": string,"title": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "content": NonNullable<Json>,"cover_photo_key"?: string | null,"end_date"?: string | null,"key": string,"owner_key": string,"photos": NonNullable<Json>,"places": NonNullable<Json>,"save_reason": string,"saved_at": string,"saved_by"?: string | null,"short_title"?: string | null,"start_date"?: string | null,"started_at"?: string | null,"template_id": string,"title"?: string | null
                  }
                  Update: {
                    "content"?: NonNullable<Json>,"cover_photo_key"?: string | null,"end_date"?: string | null,"key"?: string,"owner_key"?: string,"photos"?: NonNullable<Json>,"places"?: NonNullable<Json>,"save_reason"?: string,"saved_at"?: string,"saved_by"?: string | null,"short_title"?: string | null,"start_date"?: string | null,"started_at"?: string | null,"template_id"?: string,"title"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "trip_drafts_key_fkey"
      columns: ["key"]
isOneToOne: true
      referencedRelation: "trips"
      referencedColumns: ["key"]
    },{
      foreignKeyName: "trip_drafts_owner_key_fkey"
      columns: ["owner_key"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["key"]
    }
                  ]
                },"trip_drafts_archive": {
                  Row: {
                    "archived_at": string,"content": NonNullable<Json>,"cover_photo_key": string | null,"end_date": string | null,"key": string,"owner_key": string,"photos": NonNullable<Json>,"places": NonNullable<Json>,"save_reason": string,"saved_at": string,"saved_by": string | null,"short_title": string | null,"start_date": string | null,"started_at": string | null,"template_id": string,"title": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at": string,"content": NonNullable<Json>,"cover_photo_key"?: string | null,"end_date"?: string | null,"key": string,"owner_key": string,"photos": NonNullable<Json>,"places": NonNullable<Json>,"save_reason": string,"saved_at": string,"saved_by"?: string | null,"short_title"?: string | null,"start_date"?: string | null,"started_at"?: string | null,"template_id": string,"title"?: string | null
                  }
                  Update: {
                    "archived_at"?: string,"content"?: NonNullable<Json>,"cover_photo_key"?: string | null,"end_date"?: string | null,"key"?: string,"owner_key"?: string,"photos"?: NonNullable<Json>,"places"?: NonNullable<Json>,"save_reason"?: string,"saved_at"?: string,"saved_by"?: string | null,"short_title"?: string | null,"start_date"?: string | null,"started_at"?: string | null,"template_id"?: string,"title"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"trips": {
                  Row: {
                    "comments_on": boolean,"content": NonNullable<Json>,"cover_photo_key": string | null,"end_date": string | null,"key": string,"owner_key": string,"photos": NonNullable<Json>,"places": NonNullable<Json>,"published_at": string | null,"published_draft_saved_at": string | null,"save_reason": string,"saved_at": string,"saved_by": string | null,"search_text": string,"seed": number,"short_title": string | null,"slug": string,"start_date": string | null,"started_at": string | null,"status": string,"template_id": string,"title": string | null,"visibility": string,"word_count": number
                  }
                  ComputedFields: never
                  Insert: {
                    "comments_on": boolean,"content"?: NonNullable<Json>,"cover_photo_key"?: string | null,"end_date"?: string | null,"key"?: string,"owner_key": string,"photos"?: NonNullable<Json>,"places"?: NonNullable<Json>,"published_at"?: string | null,"published_draft_saved_at"?: string | null,"save_reason"?: string,"saved_at": string,"saved_by"?: string | null,"search_text"?: string,"seed": number,"short_title"?: string | null,"slug": string,"start_date"?: string | null,"started_at"?: string | null,"status": string,"template_id": string,"title"?: string | null,"visibility": string,"word_count"?: number
                  }
                  Update: {
                    "comments_on"?: boolean,"content"?: NonNullable<Json>,"cover_photo_key"?: string | null,"end_date"?: string | null,"key"?: string,"owner_key"?: string,"photos"?: NonNullable<Json>,"places"?: NonNullable<Json>,"published_at"?: string | null,"published_draft_saved_at"?: string | null,"save_reason"?: string,"saved_at"?: string,"saved_by"?: string | null,"search_text"?: string,"seed"?: number,"short_title"?: string | null,"slug"?: string,"start_date"?: string | null,"started_at"?: string | null,"status"?: string,"template_id"?: string,"title"?: string | null,"visibility"?: string,"word_count"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "trips_owner_key_fkey"
      columns: ["owner_key"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["key"]
    }
                  ]
                },"trips_archive": {
                  Row: {
                    "archived_at": string,"comments_on": boolean,"content": NonNullable<Json>,"cover_photo_key": string | null,"end_date": string | null,"key": string,"owner_key": string,"photos": NonNullable<Json>,"places": NonNullable<Json>,"published_at": string | null,"published_draft_saved_at": string | null,"save_reason": string,"saved_at": string,"saved_by": string | null,"search_text": string,"seed": number,"short_title": string | null,"slug": string,"start_date": string | null,"started_at": string | null,"status": string,"template_id": string,"title": string | null,"visibility": string,"word_count": number
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at": string,"comments_on": boolean,"content": NonNullable<Json>,"cover_photo_key"?: string | null,"end_date"?: string | null,"key": string,"owner_key": string,"photos": NonNullable<Json>,"places": NonNullable<Json>,"published_at"?: string | null,"published_draft_saved_at"?: string | null,"save_reason": string,"saved_at": string,"saved_by"?: string | null,"search_text": string,"seed": number,"short_title"?: string | null,"slug": string,"start_date"?: string | null,"started_at"?: string | null,"status": string,"template_id": string,"title"?: string | null,"visibility": string,"word_count": number
                  }
                  Update: {
                    "archived_at"?: string,"comments_on"?: boolean,"content"?: NonNullable<Json>,"cover_photo_key"?: string | null,"end_date"?: string | null,"key"?: string,"owner_key"?: string,"photos"?: NonNullable<Json>,"places"?: NonNullable<Json>,"published_at"?: string | null,"published_draft_saved_at"?: string | null,"save_reason"?: string,"saved_at"?: string,"saved_by"?: string | null,"search_text"?: string,"seed"?: number,"short_title"?: string | null,"slug"?: string,"start_date"?: string | null,"started_at"?: string | null,"status"?: string,"template_id"?: string,"title"?: string | null,"visibility"?: string,"word_count"?: number
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "archive_draft":
{ Args: { "p_now": string,"p_row": Omit<Database["public"]['Tables']["trip_drafts"]['Row'], Database["public"]['Tables']["trip_drafts"]['ComputedFields']> }; Returns: undefined
                           },
"archive_trip":
{ Args: { "p_now": string,"p_row": Omit<Database["public"]['Tables']["trips"]['Row'], Database["public"]['Tables']["trips"]['ComputedFields']> }; Returns: undefined
                           },
"claim_geocoder_slot":
{ Args: { "p_kind": string,"p_user_key": string }; Returns: number
                           },
"create_trip":
{ Args: { "p_key": string,"p_template_id"?: string }; Returns: string
                           },
"delete_trip":
{ Args: { "p_key": string }; Returns: Json
                           },
"geocode_cache_get":
{ Args: { "p_keys": (string)[] }; Returns: {
              "cache_key": string,"result": Json
            }[]
                           },
"geocode_cache_put":
{ Args: { "p_key": string,"p_result": Json }; Returns: undefined
                           },
"get_profile":
{ Args: { "p_handle": string }; Returns: Json
                           },
"get_trip":
{ Args: { "p_handle": string,"p_slug": string }; Returns: Json
                           },
"insert_trip":
{ Args: { "p_by": string,"p_now": string,"p_reason": string,"p_row": Omit<Database["public"]['Tables']["trips"]['Row'], Database["public"]['Tables']["trips"]['ComputedFields']> }; Returns: undefined
                           },
"is_handle_available":
{ Args: { "p_handle": string }; Returns: boolean
                           },
"is_reserved_handle":
{ Args: { "p_handle": string }; Returns: boolean
                           },
"list_sitemap_trips":
{ Args: Record<PropertyKey, never>; Returns: {
              "handle": string,"slug": string,"updated_at": string
            }[]
                           },
"publish_trip":
{ Args: { "p_based_on_draft": string,"p_based_on_trip": string,"p_key": string,"p_slug": string,"p_title": string,"p_visibility": string,"p_word_count": number }; Returns: Json
                           },
"raise_missing":
{ Args: { "p_key": string,"p_owner": string,"p_table": string }; Returns: undefined
                           },
"require_user":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"run_retention_cleanup":
{ Args: { "p_now"?: string }; Returns: undefined
                           },
"save_profile":
{ Args: { "p_based_on": string,"p_profile": Json }; Returns: string
                           },
"save_trip_draft":
{ Args: { "p_based_on": string,"p_document": Json,"p_key": string }; Returns: string
                           },
"set_trip_comments":
{ Args: { "p_based_on": string,"p_key": string,"p_on": boolean }; Returns: string
                           },
"set_trip_visibility":
{ Args: { "p_based_on": string,"p_key": string,"p_visibility": string }; Returns: string
                           },
"trip_url_hash":
{ Args: { "p_handle": string,"p_slug": string }; Returns: string
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
