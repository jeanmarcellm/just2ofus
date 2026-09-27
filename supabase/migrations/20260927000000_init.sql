-- =========================================================
-- Couples & profiles
-- =========================================================

create table public.couples (
  id uuid primary key default gen_random_uuid(),
  together_since date not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  couple_id uuid references public.couples (id) on delete set null,
  created_at timestamptz not null default now()
);

create index profiles_couple_id_idx on public.profiles (couple_id);

-- security definer so policies can call it without recursing into profiles RLS
create or replace function public.my_couple_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select couple_id from public.profiles where id = auth.uid()
$$;

create or replace function public.couple_member_count(p_couple_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.profiles where couple_id = p_couple_id
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.couples enable row level security;
alter table public.profiles enable row level security;

create policy "members read couple" on public.couples
  for select to authenticated using (id = public.my_couple_id());
create policy "members update couple" on public.couples
  for update to authenticated using (id = public.my_couple_id()) with check (id = public.my_couple_id());

create policy "read self and partner" on public.profiles
  for select to authenticated
  using (id = auth.uid() or (couple_id is not null and couple_id = public.my_couple_id()));
create policy "update self" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- couple membership only changes through the RPCs below.
-- Grants are explicit because new Supabase projects may not auto-expose tables to the API.
revoke all on public.couples from anon, authenticated;
grant select, update (together_since) on public.couples to authenticated;
revoke all on public.profiles from anon, authenticated;
grant select, update (display_name, avatar_url) on public.profiles to authenticated;

revoke execute on function public.my_couple_id() from public, anon;
grant execute on function public.my_couple_id() to authenticated;
-- internal helper for the security definer RPCs; not callable from the API
revoke execute on function public.couple_member_count(uuid) from public, anon, authenticated;

-- =========================================================
-- Invites
-- =========================================================

create table public.couple_invites (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  inviter_id uuid not null references auth.users (id) on delete cascade,
  token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  accepted_by uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.couple_invites enable row level security;
create policy "members read invites" on public.couple_invites
  for select to authenticated using (couple_id = public.my_couple_id());
revoke all on public.couple_invites from anon, authenticated;
grant select on public.couple_invites to authenticated;

create or replace function public.create_couple(p_together_since date)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_couple_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if public.my_couple_id() is not null then
    raise exception 'already_in_couple';
  end if;

  insert into public.couples (together_since, created_by)
  values (p_together_since, auth.uid())
  returning id into v_couple_id;

  update public.profiles set couple_id = v_couple_id where id = auth.uid();
  return v_couple_id;
end;
$$;

create or replace function public.create_invite()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_couple_id uuid := public.my_couple_id();
  v_token text;
begin
  if v_couple_id is null then
    raise exception 'no_couple';
  end if;
  if public.couple_member_count(v_couple_id) >= 2 then
    raise exception 'couple_full';
  end if;

  select token into v_token from public.couple_invites
  where couple_id = v_couple_id and accepted_by is null
  order by created_at desc limit 1;

  if v_token is null then
    insert into public.couple_invites (couple_id, inviter_id)
    values (v_couple_id, auth.uid())
    returning token into v_token;
  end if;

  return v_token;
end;
$$;

-- callable before sign-up so the invite page can show who is inviting
create or replace function public.get_invite(p_token text)
returns table (inviter_name text, together_since date, status text)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.display_name,
    c.together_since,
    case
      when i.accepted_by is not null then 'used'
      when public.couple_member_count(i.couple_id) >= 2 then 'full'
      else 'valid'
    end
  from public.couple_invites i
  join public.couples c on c.id = i.couple_id
  join public.profiles p on p.id = i.inviter_id
  where i.token = p_token
$$;

create or replace function public.accept_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.couple_invites;
  v_current uuid := public.my_couple_id();
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_invite from public.couple_invites where token = p_token for update;
  if not found then
    raise exception 'invite_not_found';
  end if;
  if v_current = v_invite.couple_id then
    return v_current;
  end if;
  if v_current is not null then
    raise exception 'already_in_couple';
  end if;
  if v_invite.accepted_by is not null then
    raise exception 'invite_used';
  end if;
  if public.couple_member_count(v_invite.couple_id) >= 2 then
    raise exception 'couple_full';
  end if;

  update public.profiles set couple_id = v_invite.couple_id where id = auth.uid();
  update public.couple_invites set accepted_by = auth.uid(), accepted_at = now() where id = v_invite.id;
  return v_invite.couple_id;
end;
$$;

revoke execute on function public.create_couple(date) from public, anon;
revoke execute on function public.create_invite() from public, anon;
revoke execute on function public.accept_invite(text) from public, anon;
grant execute on function public.create_couple(date) to authenticated;
grant execute on function public.create_invite() to authenticated;
grant execute on function public.accept_invite(text) to authenticated;
grant execute on function public.get_invite(text) to anon, authenticated;

-- =========================================================
-- Shared couple content
-- =========================================================

create table public.moments (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null default public.my_couple_id() references public.couples (id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  description text,
  emoji text not null default '❤️',
  happened_on date not null,
  created_at timestamptz not null default now()
);
create index moments_couple_date_idx on public.moments (couple_id, happened_on);

create table public.date_plans (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null default public.my_couple_id() references public.couples (id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  scheduled_at timestamptz not null,
  location text,
  notes text,
  status text not null default 'planned' check (status in ('planned', 'done', 'cancelled')),
  moment_id uuid references public.moments (id) on delete set null,
  created_at timestamptz not null default now()
);
create index date_plans_couple_idx on public.date_plans (couple_id, scheduled_at);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null default public.my_couple_id() references public.couples (id) on delete cascade,
  uploaded_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  storage_path text not null unique,
  caption text,
  taken_on date not null default current_date,
  is_special boolean not null default false,
  created_at timestamptz not null default now()
);
create index photos_couple_idx on public.photos (couple_id, taken_on desc);

-- couple_id null = built-in question available to every couple
create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid default public.my_couple_id() references public.couples (id) on delete cascade,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  prompt text not null,
  options text[] not null check (array_length(options, 1) between 2 and 6),
  created_at timestamptz not null default now()
);

-- each person answers about themselves; the partner then tries to guess
create table public.quiz_answers (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  question_id uuid not null references public.quiz_questions (id) on delete cascade,
  couple_id uuid not null default public.my_couple_id() references public.couples (id) on delete cascade,
  answer_index int not null check (answer_index >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create table public.quiz_rounds (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null default public.my_couple_id() references public.couples (id) on delete cascade,
  player_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  score int not null check (score >= 0),
  total int not null check (total > 0 and score <= total),
  played_at timestamptz not null default now()
);

revoke all on public.moments, public.date_plans, public.photos,
  public.quiz_questions, public.quiz_answers, public.quiz_rounds from anon;
grant select, insert, update, delete on public.moments, public.date_plans, public.photos to authenticated;
grant select, insert, delete on public.quiz_questions to authenticated;
grant select, insert, update on public.quiz_answers to authenticated;
grant select, insert on public.quiz_rounds to authenticated;

alter table public.moments enable row level security;
alter table public.date_plans enable row level security;
alter table public.photos enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_answers enable row level security;
alter table public.quiz_rounds enable row level security;

create policy "couple all" on public.moments for all to authenticated
  using (couple_id = public.my_couple_id()) with check (couple_id = public.my_couple_id());
create policy "couple all" on public.date_plans for all to authenticated
  using (couple_id = public.my_couple_id()) with check (couple_id = public.my_couple_id());
create policy "couple all" on public.photos for all to authenticated
  using (couple_id = public.my_couple_id()) with check (couple_id = public.my_couple_id());

create policy "read builtin and own" on public.quiz_questions for select to authenticated
  using (couple_id is null or couple_id = public.my_couple_id());
create policy "create own" on public.quiz_questions for insert to authenticated
  with check (couple_id = public.my_couple_id() and created_by = auth.uid());
create policy "delete own" on public.quiz_questions for delete to authenticated
  using (couple_id = public.my_couple_id() and created_by = auth.uid());

create policy "couple reads answers" on public.quiz_answers for select to authenticated
  using (couple_id = public.my_couple_id());
create policy "write own answers" on public.quiz_answers for insert to authenticated
  with check (user_id = auth.uid() and couple_id = public.my_couple_id());
create policy "update own answers" on public.quiz_answers for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and couple_id = public.my_couple_id());

create policy "couple reads rounds" on public.quiz_rounds for select to authenticated
  using (couple_id = public.my_couple_id());
create policy "record own rounds" on public.quiz_rounds for insert to authenticated
  with check (player_id = auth.uid() and couple_id = public.my_couple_id());

-- =========================================================
-- Photo storage: files live under "<couple_id>/..."
-- =========================================================

insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

create policy "couple reads photos" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = public.my_couple_id()::text);
create policy "couple uploads photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = public.my_couple_id()::text);
create policy "couple deletes photos" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = public.my_couple_id()::text);

-- =========================================================
-- Built-in quiz questions
-- =========================================================

insert into public.quiz_questions (couple_id, created_by, prompt, options) values
  (null, null, 'Praia ou montanha?', array['Praia', 'Montanha', 'Tanto faz', 'Nenhum, prefiro cidade']),
  (null, null, 'Qual a refeição favorita do dia?', array['Café da manhã', 'Almoço', 'Lanche da tarde', 'Jantar']),
  (null, null, 'Doce ou salgado?', array['Doce', 'Salgado', 'Os dois juntos']),
  (null, null, 'Programa perfeito de domingo?', array['Maratonar série', 'Sair para comer', 'Passeio ao ar livre', 'Dormir até tarde']),
  (null, null, 'Cachorro ou gato?', array['Cachorro', 'Gato', 'Os dois', 'Nenhum']),
  (null, null, 'Qual estação do ano preferida?', array['Primavera', 'Verão', 'Outono', 'Inverno']),
  (null, null, 'Gênero de filme favorito?', array['Comédia', 'Terror', 'Romance', 'Ação', 'Ficção científica', 'Drama']),
  (null, null, 'Qual a linguagem do amor principal?', array['Palavras de afirmação', 'Tempo de qualidade', 'Presentes', 'Atos de serviço', 'Toque físico']),
  (null, null, 'Madrugador(a) ou coruja?', array['Madrugador(a)', 'Coruja', 'Depende do dia']),
  (null, null, 'Viagem dos sonhos?', array['Europa', 'Ásia', 'Caribe', 'Road trip pelo Brasil', 'Neve e montanhas']),
  (null, null, 'Pizza favorita?', array['Calabresa', 'Margherita', 'Quatro queijos', 'Frango com catupiry', 'Portuguesa', 'Doce']),
  (null, null, 'Em uma festa, você é…', array['Quem dança a noite toda', 'Quem conversa num canto', 'Quem cuida da comida', 'Quem vai embora cedo']),
  (null, null, 'Café ou chá?', array['Café', 'Chá', 'Nenhum dos dois']),
  (null, null, 'O que mais te irrita?', array['Atraso', 'Barulho de mastigar', 'Bagunça', 'Celular na mesa']),
  (null, null, 'Presente ideal?', array['Algo feito à mão', 'Uma experiência', 'Algo útil', 'Uma surpresa qualquer']);
