-- Recados, humor do dia, pergunta do dia, listas, metas, datas especiais,
-- ideias de date, cápsula do tempo e "neste dia".
-- Runs after 20260927000000_init.sql. Every table follows the same rules as init:
-- rows belong to a couple, RLS limits them to that couple, grants are explicit.

-- =========================================================
-- Bilhetinhos: a note can be scheduled to appear later
-- =========================================================

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null default public.my_couple_id() references public.couples (id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  emoji text not null default '💌',
  visible_from timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index notes_couple_idx on public.notes (couple_id, visible_from desc);

alter table public.notes enable row level security;
-- the author always sees their notes; the partner only once visible_from has passed
create policy "couple reads visible notes" on public.notes for select to authenticated
  using (couple_id = public.my_couple_id() and (author_id = auth.uid() or visible_from <= now()));
create policy "write own notes" on public.notes for insert to authenticated
  with check (couple_id = public.my_couple_id() and author_id = auth.uid());
create policy "delete own notes" on public.notes for delete to authenticated
  using (couple_id = public.my_couple_id() and author_id = auth.uid());

-- =========================================================
-- Humor do dia: one entry per person per day
-- =========================================================

create table public.moods (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  couple_id uuid not null default public.my_couple_id() references public.couples (id) on delete cascade,
  day date not null,
  emoji text not null,
  note text check (char_length(note) <= 140),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
create index moods_couple_day_idx on public.moods (couple_id, day);

alter table public.moods enable row level security;
create policy "couple reads moods" on public.moods for select to authenticated
  using (couple_id = public.my_couple_id());
create policy "write own mood" on public.moods for insert to authenticated
  with check (user_id = auth.uid() and couple_id = public.my_couple_id());
create policy "update own mood" on public.moods for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and couple_id = public.my_couple_id());
create policy "delete own mood" on public.moods for delete to authenticated
  using (user_id = auth.uid());

-- =========================================================
-- Pergunta do dia: answers stay hidden until you answer too
-- =========================================================

-- id is the position in the daily rotation (the app picks id = day index mod count)
create table public.daily_questions (
  id int primary key,
  prompt text not null
);

create table public.daily_answers (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  couple_id uuid not null default public.my_couple_id() references public.couples (id) on delete cascade,
  day date not null,
  question_id int not null references public.daily_questions (id),
  answer text not null check (char_length(answer) between 1 and 1000),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
create index daily_answers_couple_day_idx on public.daily_answers (couple_id, day);

-- security definer: a policy on daily_answers cannot query daily_answers itself without recursing
create or replace function public.answered_daily(p_day date)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.daily_answers where user_id = auth.uid() and day = p_day)
$$;

-- lets the app say "seu amor já respondeu" without revealing the answer
create or replace function public.partner_answered_daily(p_day date)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.daily_answers
    where couple_id = public.my_couple_id() and user_id <> auth.uid() and day = p_day
  )
$$;

alter table public.daily_questions enable row level security;
alter table public.daily_answers enable row level security;

create policy "everyone reads questions" on public.daily_questions for select to authenticated using (true);

create policy "read own or unlocked answers" on public.daily_answers for select to authenticated
  using (couple_id = public.my_couple_id() and (user_id = auth.uid() or public.answered_daily(day)));
-- +-1 day of slack because "today" is the phone's local date, not the server's UTC date
create policy "answer today" on public.daily_answers for insert to authenticated
  with check (
    user_id = auth.uid() and couple_id = public.my_couple_id()
    and day between current_date - 1 and current_date + 1
  );
create policy "edit own answer" on public.daily_answers for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and couple_id = public.my_couple_id());

-- =========================================================
-- Listas compartilhadas
-- =========================================================

create table public.lists (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null default public.my_couple_id() references public.couples (id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 60),
  emoji text not null default '📝',
  created_at timestamptz not null default now(),
  unique (id, couple_id)
);

create table public.list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null,
  couple_id uuid not null default public.my_couple_id(),
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 200),
  done boolean not null default false,
  done_at timestamptz,
  done_by uuid references auth.users (id) on delete set null,
  moment_id uuid references public.moments (id) on delete set null,
  created_at timestamptz not null default now(),
  -- composite key: an item can only point at a list of its own couple
  foreign key (list_id, couple_id) references public.lists (id, couple_id) on delete cascade
);
create index list_items_list_idx on public.list_items (list_id, created_at);

-- =========================================================
-- Metas do casal (bucket list)
-- =========================================================

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null default public.my_couple_id() references public.couples (id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  emoji text not null default '🎯',
  target_on date,
  done_on date,
  moment_id uuid references public.moments (id) on delete set null,
  photo_id uuid references public.photos (id) on delete set null,
  created_at timestamptz not null default now()
);
create index goals_couple_idx on public.goals (couple_id, created_at);

-- =========================================================
-- Datas especiais (aniversários, pedido, casamento…)
-- =========================================================

create table public.special_dates (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null default public.my_couple_id() references public.couples (id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  emoji text not null default '🎉',
  day date not null,
  yearly boolean not null default true,
  created_at timestamptz not null default now()
);
create index special_dates_couple_idx on public.special_dates (couple_id);

-- =========================================================
-- Ideias de date (para a roleta)
-- =========================================================

create table public.date_ideas (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null default public.my_couple_id() references public.couples (id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  location text,
  setting text not null check (setting in ('home', 'out')),
  budget text not null check (budget in ('low', 'medium', 'high')),
  created_at timestamptz not null default now()
);
create index date_ideas_couple_idx on public.date_ideas (couple_id);

alter table public.lists enable row level security;
alter table public.list_items enable row level security;
alter table public.goals enable row level security;
alter table public.special_dates enable row level security;
alter table public.date_ideas enable row level security;

create policy "couple all" on public.lists for all to authenticated
  using (couple_id = public.my_couple_id()) with check (couple_id = public.my_couple_id());
create policy "couple all" on public.list_items for all to authenticated
  using (couple_id = public.my_couple_id()) with check (couple_id = public.my_couple_id());
create policy "couple all" on public.goals for all to authenticated
  using (couple_id = public.my_couple_id()) with check (couple_id = public.my_couple_id());
create policy "couple all" on public.special_dates for all to authenticated
  using (couple_id = public.my_couple_id()) with check (couple_id = public.my_couple_id());
create policy "couple all" on public.date_ideas for all to authenticated
  using (couple_id = public.my_couple_id()) with check (couple_id = public.my_couple_id());

-- =========================================================
-- Cápsula do tempo: the message lives in a separate table that
-- nobody (not even the author) can read before opens_at
-- =========================================================

create table public.capsules (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null default public.my_couple_id() references public.couples (id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  opens_at timestamptz not null,
  has_photo boolean not null default false,
  created_at timestamptz not null default now(),
  check (opens_at > created_at)
);
create index capsules_couple_idx on public.capsules (couple_id, opens_at);

create table public.capsule_contents (
  capsule_id uuid primary key references public.capsules (id) on delete cascade,
  couple_id uuid not null default public.my_couple_id() references public.couples (id) on delete cascade,
  message text not null check (char_length(message) between 1 and 5000)
);

create or replace function public.capsule_is_open(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.capsules
    where id = p_id and couple_id = public.my_couple_id() and opens_at <= now()
  )
$$;

alter table public.capsules enable row level security;
alter table public.capsule_contents enable row level security;

create policy "couple reads capsules" on public.capsules for select to authenticated
  using (couple_id = public.my_couple_id());
create policy "seal own capsule" on public.capsules for insert to authenticated
  with check (couple_id = public.my_couple_id() and created_by = auth.uid());
create policy "delete own capsule" on public.capsules for delete to authenticated
  using (couple_id = public.my_couple_id() and created_by = auth.uid());

create policy "read opened content" on public.capsule_contents for select to authenticated
  using (couple_id = public.my_couple_id() and public.capsule_is_open(capsule_id));
create policy "write content of own capsule" on public.capsule_contents for insert to authenticated
  with check (
    couple_id = public.my_couple_id()
    and exists (select 1 from public.capsules c where c.id = capsule_id and c.created_by = auth.uid())
  );

-- capsule photos: private bucket, one file per capsule at "<couple_id>/<capsule_id>"
insert into storage.buckets (id, name, public)
values ('capsules', 'capsules', false)
on conflict (id) do nothing;

create or replace function public.capsule_file_readable(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.capsules c
    where c.couple_id = public.my_couple_id()
      and c.opens_at <= now()
      and p_name = c.couple_id::text || '/' || c.id::text
  )
$$;

-- the uploader keeps access to their own file so it can be removed with the capsule
create policy "capsule reads opened photo" on storage.objects for select to authenticated
  using (bucket_id = 'capsules' and (owner_id = auth.uid()::text or public.capsule_file_readable(name)));
create policy "capsule uploads own photo" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'capsules'
    and exists (
      select 1 from public.capsules c
      where c.created_by = auth.uid() and name = c.couple_id::text || '/' || c.id::text
    )
  );
create policy "capsule deletes own photo" on storage.objects for delete to authenticated
  using (bucket_id = 'capsules' and owner_id = auth.uid()::text);

-- =========================================================
-- "Neste dia": moments and photos from the same day in past years
-- =========================================================

-- security invoker: RLS on moments/photos still limits it to the caller's couple
create or replace function public.on_this_day(p_day date)
returns table (kind text, id uuid, title text, emoji text, day date, storage_path text)
language sql
stable
security invoker
set search_path = public
as $$
  select 'moment', m.id, m.title, m.emoji, m.happened_on, null::text
  from public.moments m
  where extract(month from m.happened_on) = extract(month from p_day)
    and extract(day from m.happened_on) = extract(day from p_day)
    and m.happened_on < p_day
  union all
  select 'photo', p.id, p.caption, null::text, p.taken_on, p.storage_path
  from public.photos p
  where extract(month from p.taken_on) = extract(month from p_day)
    and extract(day from p.taken_on) = extract(day from p_day)
    and p.taken_on < p_day
  order by 5 desc
$$;

-- =========================================================
-- Grants
-- =========================================================

revoke all on public.notes, public.moods, public.daily_questions, public.daily_answers,
  public.lists, public.list_items, public.goals, public.special_dates, public.date_ideas,
  public.capsules, public.capsule_contents from anon, authenticated;

grant select, insert, delete on public.notes to authenticated;
grant select, insert, update, delete on public.moods to authenticated;
grant select on public.daily_questions to authenticated;
grant select, insert, update on public.daily_answers to authenticated;
grant select, insert, update, delete on public.lists, public.list_items, public.goals,
  public.special_dates, public.date_ideas to authenticated;
grant select, insert, delete on public.capsules to authenticated;
grant select, insert on public.capsule_contents to authenticated;

revoke execute on function public.answered_daily(date) from public, anon;
revoke execute on function public.partner_answered_daily(date) from public, anon;
revoke execute on function public.capsule_is_open(uuid) from public, anon;
revoke execute on function public.capsule_file_readable(text) from public, anon;
revoke execute on function public.on_this_day(date) from public, anon;
grant execute on function public.answered_daily(date) to authenticated;
grant execute on function public.partner_answered_daily(date) to authenticated;
grant execute on function public.capsule_is_open(uuid) to authenticated;
grant execute on function public.capsule_file_readable(text) to authenticated;
grant execute on function public.on_this_day(date) to authenticated;

-- =========================================================
-- Perguntas do dia
-- =========================================================

insert into public.daily_questions (id, prompt) values
  (0, 'Qual foi o momento mais feliz da sua semana?'),
  (1, 'O que eu faço que sempre te faz sorrir?'),
  (2, 'Qual lembrança nossa você mais gosta de reviver?'),
  (3, 'Se pudéssemos viajar amanhã, para onde iríamos?'),
  (4, 'Qual música te lembra de nós?'),
  (5, 'O que você mais admira em mim?'),
  (6, 'Qual sonho você ainda quer realizar comigo?'),
  (7, 'Como seria o nosso dia perfeito?'),
  (8, 'O que te deixou preocupado(a) ultimamente?'),
  (9, 'Qual foi a primeira coisa que você reparou em mim?'),
  (10, 'Que hábito nosso você nunca quer perder?'),
  (11, 'O que eu poderia fazer para deixar sua semana mais leve?'),
  (12, 'Qual comida te lembra a infância?'),
  (13, 'Qual foi o melhor presente que você já recebeu?'),
  (14, 'Do que você tem mais orgulho em você?'),
  (15, 'Qual date nosso foi o mais divertido?'),
  (16, 'Que coisa nova você gostaria que a gente aprendesse junto?'),
  (17, 'Onde você se imagina com a gente daqui a 5 anos?'),
  (18, 'Qual é a sua forma favorita de receber carinho?'),
  (19, 'Que filme ou série a gente deveria ver juntos?'),
  (20, 'O que te faz se sentir amado(a)?'),
  (21, 'Qual foi o maior aprendizado do nosso relacionamento?'),
  (22, 'Que mania minha você acha fofa?'),
  (23, 'Qual tradição você quer que a gente crie?'),
  (24, 'Se você pudesse reviver um dia nosso, qual seria?'),
  (25, 'O que você gostaria de me agradecer hoje?'),
  (26, 'Qual o seu lugar favorito no mundo?'),
  (27, 'O que você faria se ganhasse um dia de folga surpresa?'),
  (28, 'Qual pequena coisa do dia a dia te deixa feliz?'),
  (29, 'O que você ainda não me contou sobre você?'),
  (30, 'Qual desafio a gente superou que te deixou orgulhoso(a)?'),
  (31, 'Como você gosta de comemorar conquistas?'),
  (32, 'Qual cheiro te traz uma boa lembrança?'),
  (33, 'Que conselho você daria para nós no começo do namoro?'),
  (34, 'Qual é a sua memória favorita de um fim de semana nosso?'),
  (35, 'O que mais te dá energia quando você está cansado(a)?'),
  (36, 'Que superpoder você gostaria de ter?'),
  (37, 'Qual é a sua meta pessoal para este ano?'),
  (38, 'Qual foi a última coisa que te fez rir muito?'),
  (39, 'Que palavra descreve a gente hoje?');
