// Hand-written to mirror `supabase/schema.sql`. If you'd rather generate
// this automatically once your Supabase project exists, run:
//   npx supabase gen types typescript --project-id <your-project-ref> > lib/database.types.ts

export type Database = {
  public: {
    Tables: {
      shops: {
        Row: { id: string; etsy_shop_id: number; shop_name: string; created_at: string };
        Insert: { id?: string; etsy_shop_id: number; shop_name: string; created_at?: string };
        Update: Partial<{ id: string; etsy_shop_id: number; shop_name: string; created_at: string }>;
        Relationships: [];
      };
      listing_snapshots: {
        Row: {
          id: string;
          shop_id: string;
          listing_id: number;
          run_id: string;
          title: string | null;
          description: string | null;
          price: number | null;
          currency_code: string | null;
          quantity: number | null;
          tags: string[] | null;
          taken_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          listing_id: number;
          run_id: string;
          title?: string | null;
          description?: string | null;
          price?: number | null;
          currency_code?: string | null;
          quantity?: number | null;
          tags?: string[] | null;
          taken_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["listing_snapshots"]["Insert"]>;
        Relationships: [];
      };
      listing_changes: {
        Row: {
          id: string;
          shop_id: string;
          listing_id: number;
          listing_title: string | null;
          listing_url: string | null;
          field: string;
          old_value: string | null;
          new_value: string | null;
          detected_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          listing_id: number;
          listing_title?: string | null;
          listing_url?: string | null;
          field: string;
          old_value?: string | null;
          new_value?: string | null;
          detected_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["listing_changes"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
  };
};
