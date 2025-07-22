import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tipos para nuestras tablas
export interface LocationData {
  id?: string
  user_id?: string
  session_id?: string
  mapbox_id: string
  name: string
  address: string
  coordinates: {
    lat: number
    lng: number
  }
  custom_data: {
    link?: string
    price?: string
    contact?: string
  }
  created_at?: string
  updated_at?: string
}

export interface UserProfile {
  id: string
  email: string
  created_at: string
  updated_at: string
}
