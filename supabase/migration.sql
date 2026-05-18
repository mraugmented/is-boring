-- is-boring platform schema
-- Multi-tenant client management platform

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get current user's client_id
CREATE OR REPLACE FUNCTION get_client_id()
RETURNS uuid AS $$
  SELECT id FROM clients WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PROFILES (linked to auth.users)
-- ============================================
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  role text NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client')),
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'client'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid() OR is_admin());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (is_admin() OR id = auth.uid());

-- ============================================
-- CLIENTS
-- ============================================
CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  company_name text NOT NULL,
  contact_name text,
  contact_email text,
  phone text,
  plan text DEFAULT 'starter' CHECK (plan IN ('starter', 'growth', 'enterprise')),
  status text NOT NULL DEFAULT 'onboarding' CHECK (status IN ('active', 'inactive', 'onboarding')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own record"
  ON clients FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Admins can manage clients"
  ON clients FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- CLIENT SITES
-- ============================================
CREATE TABLE client_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  site_name text NOT NULL,
  domain text,
  vercel_project_id text,
  template text,
  status text NOT NULL DEFAULT 'development' CHECK (status IN ('live', 'development', 'maintenance', 'offline')),
  last_deploy_at timestamptz,
  last_deploy_status text,
  tech_stack text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER client_sites_updated_at
  BEFORE UPDATE ON client_sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE client_sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own sites"
  ON client_sites FOR SELECT
  USING (client_id = get_client_id() OR is_admin());

CREATE POLICY "Admins can manage sites"
  ON client_sites FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- REQUESTS (change requests from clients)
-- ============================================
CREATE TABLE requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  site_id uuid REFERENCES client_sites(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'review', 'completed', 'cancelled')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER requests_updated_at
  BEFORE UPDATE ON requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_requests_client ON requests(client_id);
CREATE INDEX idx_requests_status ON requests(status);

ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own requests"
  ON requests FOR SELECT
  USING (client_id = get_client_id() OR is_admin());

CREATE POLICY "Clients can create requests"
  ON requests FOR INSERT
  WITH CHECK (client_id = get_client_id() OR is_admin());

CREATE POLICY "Clients can update own pending requests"
  ON requests FOR UPDATE
  USING ((client_id = get_client_id() AND status = 'pending') OR is_admin());

CREATE POLICY "Admins can manage all requests"
  ON requests FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- MESSAGES (client <-> admin communication)
-- ============================================
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  request_id uuid REFERENCES requests(id) ON DELETE SET NULL,
  sender_id uuid NOT NULL REFERENCES auth.users(id),
  sender_role text NOT NULL CHECK (sender_role IN ('admin', 'client')),
  content text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_client ON messages(client_id);
CREATE INDEX idx_messages_request ON messages(request_id);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own messages"
  ON messages FOR SELECT
  USING (client_id = get_client_id() OR is_admin());

CREATE POLICY "Users can create messages for their client"
  ON messages FOR INSERT
  WITH CHECK ((client_id = get_client_id() AND sender_id = auth.uid()) OR is_admin());

CREATE POLICY "Admins can manage all messages"
  ON messages FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- SITE ANALYTICS (cached from Vercel)
-- ============================================
CREATE TABLE site_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES client_sites(id) ON DELETE CASCADE,
  date date NOT NULL,
  page_views integer NOT NULL DEFAULT 0,
  unique_visitors integer NOT NULL DEFAULT 0,
  top_pages jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_analytics_site_date ON site_analytics(site_id, date);

ALTER TABLE site_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own site analytics"
  ON site_analytics FOR SELECT
  USING (
    site_id IN (
      SELECT id FROM client_sites WHERE client_id = get_client_id()
    ) OR is_admin()
  );

CREATE POLICY "Admins can manage analytics"
  ON site_analytics FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- CONTACTS (from landing page form — already exists, ensure it's here)
-- ============================================
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  email text NOT NULL,
  message text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert contacts"
  ON contacts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view contacts"
  ON contacts FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can manage contacts"
  ON contacts FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
