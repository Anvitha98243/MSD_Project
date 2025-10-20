/*
  # Smart Food Donation System Database Schema

  ## Overview
  This migration creates the complete database structure for a food donation platform
  connecting donors with orphanages.

  ## 1. New Tables
  
  ### `profiles`
  - `id` (uuid, primary key, references auth.users)
  - `email` (text, unique, not null)
  - `full_name` (text, not null)
  - `role` (text, not null) - Either 'donor' or 'orphanage'
  - `phone` (text)
  - `address` (text)
  - `latitude` (numeric) - For location tracking
  - `longitude` (numeric) - For location tracking
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `orphanages`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles) - Links to user account
  - `name` (text, not null)
  - `address` (text, not null)
  - `phone` (text, not null)
  - `latitude` (numeric, not null)
  - `longitude` (numeric, not null)
  - `capacity` (integer) - Number of people they can feed
  - `verified` (boolean, default false)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `donations`
  - `id` (uuid, primary key)
  - `donor_id` (uuid, references profiles) - User who donated
  - `food_type` (text, not null) - Type of food
  - `quantity` (text, not null) - Amount of food
  - `expiry_time` (timestamptz, not null) - When food expires
  - `location` (text, not null) - Pickup location
  - `latitude` (numeric, not null)
  - `longitude` (numeric, not null)
  - `status` (text, default 'pending') - pending, accepted, completed, rejected
  - `accepted_by` (uuid, references orphanages) - Which orphanage accepted
  - `notes` (text) - Additional information
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `notifications`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles) - Recipient of notification
  - `donation_id` (uuid, references donations)
  - `message` (text, not null)
  - `read` (boolean, default false)
  - `created_at` (timestamptz)

  ## 2. Security
  
  ### Row Level Security (RLS)
  - Enabled on all tables
  - Profiles: Users can read all profiles but only update their own
  - Orphanages: Anyone can view, only orphanage users can manage their own
  - Donations: Donors manage their donations, orphanages can view and accept
  - Notifications: Users can only see and manage their own notifications

  ## 3. Indexes
  - Location-based queries on latitude/longitude for orphanages and donations
  - Status filtering on donations
  - User lookups on user_id foreign keys

  ## 4. Sample Data
  - Pre-loaded orphanages in various locations for testing
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('donor', 'orphanage')),
  phone text,
  address text,
  latitude numeric,
  longitude numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create orphanages table
CREATE TABLE IF NOT EXISTS orphanages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text NOT NULL,
  phone text NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  capacity integer DEFAULT 50,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create donations table
CREATE TABLE IF NOT EXISTS donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  food_type text NOT NULL,
  quantity text NOT NULL,
  expiry_time timestamptz NOT NULL,
  location text NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'rejected')),
  accepted_by uuid REFERENCES orphanages(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  donation_id uuid REFERENCES donations(id) ON DELETE CASCADE,
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orphanages_location ON orphanages(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_donations_location ON donations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
CREATE INDEX IF NOT EXISTS idx_donations_donor ON donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orphanages ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Orphanages policies
CREATE POLICY "Anyone can view orphanages"
  ON orphanages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Orphanage users can insert their orphanage"
  ON orphanages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'orphanage'
    )
  );

CREATE POLICY "Orphanage users can update their own orphanage"
  ON orphanages FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Donations policies
CREATE POLICY "Donors can view their own donations"
  ON donations FOR SELECT
  TO authenticated
  USING (donor_id = auth.uid());

CREATE POLICY "Orphanages can view all pending donations"
  ON donations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'orphanage'
    )
  );

CREATE POLICY "Donors can insert donations"
  ON donations FOR INSERT
  TO authenticated
  WITH CHECK (
    donor_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'donor'
    )
  );

CREATE POLICY "Donors can update their own donations"
  ON donations FOR UPDATE
  TO authenticated
  USING (donor_id = auth.uid())
  WITH CHECK (donor_id = auth.uid());

CREATE POLICY "Orphanages can accept donations"
  ON donations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'orphanage'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'orphanage'
    )
  );

-- Notifications policies
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Insert sample orphanages (without user_id as they are pre-loaded)
INSERT INTO orphanages (name, address, phone, latitude, longitude, capacity, verified)
VALUES
  ('Hope Children Home', '123 Main St, Downtown', '+1-555-0101', 40.7128, -74.0060, 50, true),
  ('Bright Future Orphanage', '456 Oak Ave, Eastside', '+1-555-0102', 40.7589, -73.9851, 75, true),
  ('Caring Hearts Home', '789 Pine Rd, Westend', '+1-555-0103', 40.7489, -73.9680, 60, true),
  ('Sunshine Kids Center', '321 Elm St, Northside', '+1-555-0104', 40.7829, -73.9654, 40, true),
  ('Little Angels Home', '654 Maple Dr, Southside', '+1-555-0105', 40.6892, -74.0445, 55, true)
ON CONFLICT DO NOTHING;