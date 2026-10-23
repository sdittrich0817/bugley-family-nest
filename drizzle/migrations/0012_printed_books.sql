CREATE TABLE public.print_formats (
  key text PRIMARY KEY,
  label text NOT NULL,
  book_format text NOT NULL CHECK (book_format IN ('comic','story')),
  cover_type text NOT NULL CHECK (cover_type IN ('stapled','softcover','hardcover')),
  pod_package_id text NOT NULL,
  trim_width_in numeric NOT NULL,
  trim_height_in numeric NOT NULL,
  min_pages int NOT NULL,
  max_pages int NOT NULL,
  page_multiple int NOT NULL DEFAULT 2,
  markup_percent numeric NOT NULL DEFAULT 15,
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.print_formats TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.print_formats TO authenticated;
GRANT ALL ON public.print_formats TO service_role;
ALTER TABLE public.print_formats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in read print formats" ON public.print_formats FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage print formats" ON public.print_formats FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.print_formats (key,label,book_format,cover_type,pod_package_id,trim_width_in,trim_height_in,min_pages,max_pages,page_multiple,markup_percent) VALUES
 ('comic_stapled','Comic Book (stapled)','comic','stapled','0663X1025FCSTDSS080CW444GXX',6.625,10.25,8,48,4,15),
 ('picture_softcover','Picture Book (softcover)','story','softcover','0850X0850FCPREPB080CW444GXX',8.5,8.5,24,800,2,15),
 ('picture_hardcover','Picture Book (hardcover)','story','hardcover','0850X0850FCPRECW080CW444GXX',8.5,8.5,24,800,2,15);

CREATE TABLE public.print_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  lulu_env text NOT NULL DEFAULT 'sandbox' CHECK (lulu_env IN ('sandbox','live')),
  brand_name text NOT NULL DEFAULT 'Bugley',
  contact_email text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.print_settings TO authenticated;
GRANT ALL ON public.print_settings TO service_role;
ALTER TABLE public.print_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read print settings" ON public.print_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update print settings" ON public.print_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.print_settings (id) VALUES (1);

CREATE TABLE public.print_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL,
  child_id uuid NOT NULL,
  book_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','ordered','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX print_requests_one_pending ON public.print_requests (book_id) WHERE status = 'pending';
GRANT SELECT ON public.print_requests TO authenticated;
GRANT ALL ON public.print_requests TO service_role;
ALTER TABLE public.print_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents read own print requests" ON public.print_requests FOR SELECT TO authenticated USING (parent_id = auth.uid());

CREATE TABLE public.print_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL,
  request_id uuid,
  book_id uuid NOT NULL,
  child_id uuid NOT NULL,
  format_key text NOT NULL,
  quantity int NOT NULL CHECK (quantity BETWEEN 1 AND 20),
  page_count int NOT NULL,
  shipping_address jsonb NOT NULL,
  shipping_level text NOT NULL,
  quote jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_cents int NOT NULL,
  credit_used boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'awaiting_payment',
  status_detail text,
  stripe_session_id text,
  environment text NOT NULL,
  lulu_env text NOT NULL,
  lulu_job_id text,
  interior_path text,
  cover_path text,
  interior_validation_id text,
  cover_validation_id text,
  tracking jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX print_orders_parent ON public.print_orders (parent_id, created_at DESC);
GRANT SELECT ON public.print_orders TO authenticated;
GRANT ALL ON public.print_orders TO service_role;
ALTER TABLE public.print_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents read own print orders" ON public.print_orders FOR SELECT TO authenticated USING (parent_id = auth.uid());
CREATE POLICY "Admins read all print orders" ON public.print_orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));