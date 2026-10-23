CREATE TABLE public.game_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game text NOT NULL CHECK (game IN ('real_robot','robot_chef','train_bugley','fact_fib')),
  level int NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 3),
  bands text[] NOT NULL DEFAULT ARRAY['sprouts','explorers','builders'],
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  image_path text,
  position int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_content TO authenticated;
GRANT ALL ON public.game_content TO service_role;
ALTER TABLE public.game_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage game content" ON public.game_content FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.game_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL,
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  game text NOT NULL,
  level int NOT NULL,
  items uuid[] NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  score int,
  total int NOT NULL,
  bonus int NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX game_rounds_child_idx ON public.game_rounds (child_id, game, finished_at);
GRANT SELECT ON public.game_rounds TO authenticated;
GRANT ALL ON public.game_rounds TO service_role;
ALTER TABLE public.game_rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents view family rounds" ON public.game_rounds FOR SELECT TO authenticated USING (parent_id = auth.uid() AND public.is_active_parent());

CREATE TABLE public.game_progress (
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL,
  game text NOT NULL,
  unlocked int NOT NULL DEFAULT 1,
  sparks int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (child_id, game)
);
GRANT SELECT ON public.game_progress TO authenticated;
GRANT ALL ON public.game_progress TO service_role;
ALTER TABLE public.game_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents view family game progress" ON public.game_progress FOR SELECT TO authenticated USING (parent_id = auth.uid() AND public.is_active_parent());

CREATE TABLE public.game_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL,
  game text NOT NULL,
  badge text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (child_id, game, badge)
);
GRANT SELECT ON public.game_badges TO authenticated;
GRANT ALL ON public.game_badges TO service_role;
ALTER TABLE public.game_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents view family game badges" ON public.game_badges FOR SELECT TO authenticated USING (parent_id = auth.uid() AND public.is_active_parent());

CREATE POLICY "Admins upload game images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'game-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read game images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'game-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete game images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'game-images' AND public.has_role(auth.uid(), 'admin'));

INSERT INTO public.game_content (game, level, bands, position, data) VALUES
('fact_fib',1,ARRAY['explorers','builders'],1,'{"statement":"The Moon makes its own light, just like the Sun!","answer":"fib","clues":[{"kind":"book","title":"Space Book, page 12","text":"The Moon does not glow by itself. It reflects light from the Sun."}],"explain":"The Moon shines because sunlight bounces off it."}'),
('fact_fib',1,ARRAY['explorers','builders'],2,'{"statement":"Octopuses have eight arms.","answer":"fact","clues":[{"kind":"book","title":"Ocean Animals","text":"Octo means eight. An octopus has eight arms covered in suckers."}],"explain":"Octopuses really do have eight arms."}'),
('fact_fib',1,ARRAY['explorers','builders'],3,'{"statement":"Penguins live at the North Pole with polar bears.","answer":"fib","clues":[{"kind":"map","title":"World Map","text":"Polar bears: Arctic (far north). Most wild penguins: Antarctica and southern oceans (far south)."}],"explain":"Penguins and polar bears live at opposite ends of the Earth."}'),
('fact_fib',1,ARRAY['explorers','builders'],4,'{"statement":"Water freezes into ice when it gets very cold.","answer":"fact","clues":[{"kind":"chart","title":"Water Chart","text":"Cold (0°C / 32°F and below): ice. Warm: liquid water. Very hot (100°C / 212°F): steam."}],"explain":"Water turns to ice at 0°C (32°F)."}'),
('fact_fib',2,ARRAY['explorers','builders'],5,'{"statement":"Spiders are insects because they have six legs.","answer":"fib","clues":[{"kind":"chart","title":"Bug Chart","text":"Insects: 6 legs, 3 body parts. Spiders: 8 legs, 2 body parts."}],"explain":"Spiders have eight legs, so they are not insects."}'),
('fact_fib',2,ARRAY['explorers','builders'],6,'{"statement":"Australia is a country and a continent.","answer":"fact","clues":[{"kind":"map","title":"World Map","text":"The continent of Australia is mostly made up of the country of Australia."}],"explain":"Australia is both a country and a continent."}'),
('fact_fib',2,ARRAY['explorers','builders'],7,'{"statement":"Bats are blind and cannot see at all.","answer":"fib","clues":[{"kind":"book","title":"Night Animals","text":"All bats can see. Many also use echoes to find their way in the dark."}],"explain":"Bats can see, and many use echoes too."}'),
('fact_fib',2,ARRAY['explorers','builders'],8,'{"statement":"Plants need sunlight to make their food.","answer":"fact","clues":[{"kind":"book","title":"Growing Things","text":"Leaves use sunlight, water and air to make food for the plant."}],"explain":"Plants use sunlight to make food."}'),
('fact_fib',3,ARRAY['explorers','builders'],9,'{"statement":"Lightning never strikes the same place twice.","answer":"fib","clues":[{"kind":"chart","title":"Weather Facts","text":"Tall buildings can be struck by lightning many times every year."}],"explain":"Lightning can hit the same spot again and again."}'),
('fact_fib',3,ARRAY['explorers','builders'],10,'{"statement":"Honey stored in a sealed jar can stay good for a very, very long time.","answer":"fact","clues":[{"kind":"book","title":"Bee Book","text":"Honey has very little water, so germs have trouble growing in it."}],"explain":"Sealed honey can last for an amazingly long time."}'),
('fact_fib',3,ARRAY['explorers','builders'],11,'{"statement":"Goldfish can only remember things for three seconds.","answer":"fib","clues":[{"kind":"book","title":"Pet Fish","text":"Scientists have trained goldfish to remember tricks for months."}],"explain":"Goldfish can remember things for months."}'),
('fact_fib',3,ARRAY['explorers','builders'],12,'{"statement":"A day on Venus is longer than a year on Venus.","answer":"fact","clues":[{"kind":"chart","title":"Planet Chart","text":"Venus: one spin (a day) takes about 243 Earth days. One trip around the Sun (a year) takes about 225 Earth days."}],"explain":"Venus spins so slowly that its day is longer than its year."}'),

('robot_chef',1,ARRAY['sprouts','explorers'],1,'{"task":"Make a peanut butter sandwich","steps":[{"id":"a","text":"Take out two slices of bread","ifMissing":"Chef Bolt spreads peanut butter right on the plate!"},{"id":"b","text":"Open the peanut butter jar","ifMissing":"Chef Bolt rubs the closed jar on the bread. Nothing happens!"},{"id":"c","text":"Scoop peanut butter with a knife","ifMissing":"Chef Bolt puts the whole jar on the bread!"},{"id":"d","text":"Spread it on one slice","ifMissing":"Chef Bolt holds a blob of peanut butter in the air. Plop!"},{"id":"e","text":"Put the other slice on top","ifMissing":"Chef Bolt serves one sticky open slice. Messy!"}],"decoys":[]}'),
('robot_chef',1,ARRAY['sprouts','explorers'],2,'{"task":"Build a snowman","steps":[{"id":"a","text":"Roll a big snowball","ifMissing":"Chef Bolt stacks snowballs on nothing. They fall down!"},{"id":"b","text":"Roll a middle snowball and put it on top","ifMissing":"Chef Bolt puts a tiny head right on the big ball. Too short!"},{"id":"c","text":"Roll a small snowball for the head","ifMissing":"Chef Bolt''s snowman has no head!"},{"id":"d","text":"Add a carrot nose","ifMissing":"Chef Bolt sticks the carrot on the ground."}],"decoys":[]}'),
('robot_chef',2,ARRAY['sprouts','explorers'],3,'{"task":"Brush your teeth","steps":[{"id":"a","text":"Pick up the toothbrush","ifMissing":"Chef Bolt tries to brush with his finger!"},{"id":"b","text":"Squeeze toothpaste onto the brush","ifMissing":"Chef Bolt brushes with a dry brush. Squeak squeak!"},{"id":"c","text":"Brush all your teeth","ifMissing":"Chef Bolt just holds the brush and smiles."},{"id":"d","text":"Rinse with water","ifMissing":"Chef Bolt walks off with a foamy mouth!"}],"decoys":[{"id":"x","text":"Put toothpaste in your shoe","funny":"Chef Bolt squishes toothpaste in his shoe. Squelch!"}]}'),
('robot_chef',2,ARRAY['sprouts','explorers'],4,'{"task":"Plant a seed","steps":[{"id":"a","text":"Fill a pot with dirt","ifMissing":"Chef Bolt drops the seed in an empty pot. Clink!"},{"id":"b","text":"Make a little hole","ifMissing":"Chef Bolt balances the seed on top of the dirt."},{"id":"c","text":"Drop the seed in the hole","ifMissing":"Chef Bolt waters a pot with no seed!"},{"id":"d","text":"Cover it with dirt","ifMissing":"A bird eats the uncovered seed. Tweet!"},{"id":"e","text":"Water it","ifMissing":"Chef Bolt waits and waits. The dry seed takes a nap."}],"decoys":[{"id":"x","text":"Bake the seed in the oven","funny":"Chef Bolt bakes the seed. It smells like toast!"}]}'),
('robot_chef',3,ARRAY['sprouts','explorers'],5,'{"task":"Make a fruit snack","steps":[{"id":"a","text":"Wash your hands","ifMissing":"Chef Bolt''s hands are covered in paint!"},{"id":"b","text":"Get a banana and a bowl","ifMissing":"Chef Bolt peels the air."},{"id":"c","text":"Peel the banana","ifMissing":"Chef Bolt slices the banana with the peel on!"},{"id":"d","text":"Ask a grown-up to help slice it","ifMissing":"Chef Bolt puts the whole banana in the bowl. Too big!"},{"id":"e","text":"Put the slices in the bowl","ifMissing":"Chef Bolt holds the slices and has nowhere to put them."},{"id":"f","text":"Add some berries on top","ifMissing":"Chef Bolt''s snack is missing its berries!"}],"decoys":[{"id":"x","text":"Put the bowl on your head","funny":"Chef Bolt wears the bowl like a hat!"},{"id":"y","text":"Peel the bowl","funny":"Chef Bolt tries to peel the bowl. Scritch scratch!"}]}'),

('train_bugley',1,ARRAY['explorers','builders'],1,'{"task":"Teach Bugley: apples or oranges?","groups":["Apples","Oranges"],"twist":false,"examples":[{"id":"e1","emoji":"🍎","name":"red apple","traits":{"color":"red","skin":"smooth"}},{"id":"e2","emoji":"🍏","name":"green apple","traits":{"color":"green","skin":"smooth"}},{"id":"e3","emoji":"🍊","name":"orange","traits":{"color":"orange","skin":"bumpy"}},{"id":"e4","emoji":"🍊","name":"big orange","traits":{"color":"orange","skin":"bumpy"}}],"tests":[{"emoji":"🍎","name":"shiny red apple","group":"Apples","traits":{"color":"red","skin":"smooth"}},{"emoji":"🍏","name":"green apple","group":"Apples","traits":{"color":"green","skin":"smooth"}},{"emoji":"🍊","name":"orange","group":"Oranges","traits":{"color":"orange","skin":"bumpy"}}]}'),
('train_bugley',2,ARRAY['explorers','builders'],2,'{"task":"Teach Bugley: friendly or grumpy monsters?","groups":["Friendly","Grumpy"],"twist":false,"examples":[{"id":"m1","emoji":"😊","name":"smiling fuzzy monster","traits":{"face":"smile","arms":"waving"}},{"id":"m2","emoji":"🤗","name":"hugging monster","traits":{"face":"smile","arms":"open"}},{"id":"m3","emoji":"😠","name":"frowning monster","traits":{"face":"frown","arms":"crossed"}},{"id":"m4","emoji":"😤","name":"huffy monster","traits":{"face":"frown","arms":"stomping"}}],"tests":[{"emoji":"😄","name":"grinning monster","group":"Friendly","traits":{"face":"smile","arms":"waving"}},{"emoji":"😾","name":"grumbly monster","group":"Grumpy","traits":{"face":"frown","arms":"crossed"}},{"emoji":"🥰","name":"cuddly monster","group":"Friendly","traits":{"face":"smile","arms":"open"}}]}'),
('train_bugley',3,ARRAY['explorers','builders'],3,'{"task":"Teach Bugley apples again, but with only these examples!","groups":["Apples","Oranges"],"twist":true,"examples":[{"id":"r1","emoji":"🍎","name":"red apple","traits":{"color":"red"}},{"id":"r2","emoji":"🍎","name":"another red apple","traits":{"color":"red"}},{"id":"r3","emoji":"🍊","name":"orange","traits":{"color":"orange"}}],"tests":[{"emoji":"🍎","name":"red apple","group":"Apples","traits":{"color":"red"}},{"emoji":"🍏","name":"green apple","group":"Apples","traits":{"color":"green"}},{"emoji":"🍊","name":"orange","group":"Oranges","traits":{"color":"orange"}}]}');
