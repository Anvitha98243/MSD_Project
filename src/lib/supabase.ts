import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: 'donor' | 'orphanage';
  phone?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
};

export type Orphanage = {
  id: string;
  user_id?: string;
  name: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
  capacity: number;
  verified: boolean;
  created_at: string;
  updated_at: string;
};

export type Donation = {
  id: string;
  donor_id: string;
  food_type: string;
  quantity: string;
  expiry_time: string;
  location: string;
  latitude: number;
  longitude: number;
  status: 'pending' | 'accepted' | 'completed' | 'rejected';
  accepted_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  donation_id?: string;
  message: string;
  read: boolean;
  created_at: string;
};
