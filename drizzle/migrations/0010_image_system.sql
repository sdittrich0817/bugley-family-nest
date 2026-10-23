CREATE TABLE public.image_models (
  mode text PRIMARY KEY CHECK (mode IN ('sketch','final','character')),
  model text NOT NULL DEFAULT '',
  version text NOT NULL DEFAULT '',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.image_models TO authenticated;
GRANT ALL ON public.image_models TO service_role;
ALTER TABLE public.image_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manages image models" ON public.image_models FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.image_models (mode) VALUES ('sketch'),('final'),('character');

CREATE TABLE public.art_styles (
  key text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  recipe text NOT NULL DEFAULT '',
  position int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.art_styles TO authenticated;
GRANT ALL ON public.art_styles TO service_role;
ALTER TABLE public.art_styles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manages art styles" ON public.art_styles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.art_styles (key,name,description,recipe,position) VALUES
('classic_comic','Classic Comic','Bold ink lines and bright flat colors','classic comic book illustration, bold clean black ink outlines, bright flat colors, halftone dot shading, dynamic composition',1),
('cartoon','Cartoon','Round, bouncy and super friendly','friendly cartoon illustration, rounded shapes, thick soft outlines, cheerful saturated colors, expressive faces',2),
('watercolor','Watercolor','Soft paint that blends and glows','soft watercolor painting, gentle color washes, visible paper texture, light airy edges, dreamy palette',3),
('crayon','Crayon','Like your best crayon drawing','childlike crayon drawing on paper, waxy textured strokes, bright colors, playful imperfect lines',4),
('storybook','Storybook','Cozy picture-book magic','classic children''s picture book illustration, warm cozy lighting, soft gouache texture, detailed whimsical backgrounds',5),
('pixel_art','Pixel Art','Blocky like a retro video game','retro 16-bit pixel art, crisp square pixels, limited bright palette, clean video game scene',6),
('clay','Clay','Squishy clay figures','handmade clay figure scene, soft modeling clay texture, rounded chunky shapes, gentle studio lighting',7),
('paper_cutout','Paper Cutout','Layers of cut paper','layered cut paper collage, construction paper textures, soft drop shadows between layers, bold simple shapes',8),
('sketchbook','Sketchbook','Pencil sketches with a splash of color','pencil sketchbook drawing, loose graphite lines, light colored pencil accents, notebook paper feel',9),
('bright_anime','Bright Anime-Inspired','Big sparkly eyes and bright colors','bright anime-inspired illustration, big expressive eyes, clean cel shading, vivid cheerful colors, sparkly highlights',10);

ALTER TABLE public.studio_creations ADD COLUMN details jsonb, ADD COLUMN style_key text;

CREATE POLICY "parents read own studio images" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'studio-images' AND (storage.foldername(name))[1] = auth.uid()::text AND public.is_active_parent());