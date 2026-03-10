-- =============================================
-- STAMPS LAND - DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. PROFILES (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  avatar_url text,
  bio text,
  city text,
  stamp_count integer default 0 not null,
  stamp_level text default 'first_press' not null,
  role text default 'fan' not null check (role in ('fan', 'band', 'admin')),
  band_member text check (band_member in ('sofia', 'scarlett', 'rubina')),
  joined_at timestamp with time zone default now() not null,
  last_seen_at timestamp with time zone default now(),
  login_streak integer default 0,
  show_count integer default 0
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', 'new stamp'),
    coalesce(new.raw_user_meta_data->>'avatar_url', null)
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. POSTS (community + member feeds)
create table public.posts (
  id uuid default gen_random_uuid() primary key,
  author_id uuid references public.profiles on delete cascade not null,
  content text not null,
  feed_type text default 'community' not null check (feed_type in ('community', 'sofia', 'scarlett', 'rubina')),
  is_exclusive boolean default false,
  exclusive_level text default 'stamped' check (exclusive_level in ('b_side', 'deep_cut', 'inner_sleeve', 'stamped')),
  like_count integer default 0,
  comment_count integer default 0,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now()
);

create index idx_posts_feed on posts(feed_type, created_at desc);
create index idx_posts_author on posts(author_id);


-- 3. POST LIKES
create table public.post_likes (
  post_id uuid references public.posts on delete cascade not null,
  user_id uuid references public.profiles on delete cascade not null,
  created_at timestamp with time zone default now(),
  primary key (post_id, user_id)
);


-- 4. COMMENTS
create table public.comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts on delete cascade not null,
  author_id uuid references public.profiles on delete cascade not null,
  content text not null,
  like_count integer default 0,
  created_at timestamp with time zone default now()
);

create index idx_comments_post on comments(post_id, created_at);


-- 5. SHOWS / TOUR DATES
create table public.shows (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  city text not null,
  venue text not null,
  country text,
  region text check (region in ('australia', 'europe', 'uk', 'north_america', 'other')),
  ticket_url text,
  status text default 'on_sale' check (status in ('on_sale', 'sold_out', 'cancelled', 'announced')),
  sort_order integer default 0,
  created_at timestamp with time zone default now()
);

create index idx_shows_date on shows(date);


-- 6. STREAMING & SOCIAL LINKS (replaces Komi)
create table public.links (
  id uuid default gen_random_uuid() primary key,
  label text not null,
  url text not null,
  icon text,
  category text not null check (category in ('streaming', 'social', 'merch', 'other')),
  sort_order integer default 0,
  is_active boolean default true
);


-- 7. STAMP REWARD ACTIONS (flexible - band can add/edit/remove)
create table public.stamp_actions (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  points integer not null,
  action_type text not null check (action_type in ('auto', 'manual')),
  trigger_key text unique,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

-- Default stamp actions
insert into public.stamp_actions (name, description, points, action_type, trigger_key) values
  ('Post in community', 'Create a post in the community feed', 5, 'auto', 'post_created'),
  ('Reply to someone', 'Comment on a post', 2, 'auto', 'comment_created'),
  ('Daily check-in', 'Log in each day', 3, 'auto', 'daily_login'),
  ('Attend a show', 'Check in at a live show', 50, 'manual', 'show_attended'),
  ('Refer a friend', 'Invite someone who signs up', 25, 'auto', 'referral_completed'),
  ('Share a playlist', 'Share a playlist with the community', 10, 'auto', 'playlist_shared'),
  ('Photo with the band', 'Get a photo with Sofia, Scarlett or Rubina', 500, 'manual', 'photo_with_band');


-- 8. STAMP TRANSACTIONS (ledger of all stamps earned)
create table public.stamp_transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  action_id uuid references public.stamp_actions on delete set null,
  points integer not null,
  description text,
  awarded_by uuid references public.profiles on delete set null,
  created_at timestamp with time zone default now()
);

create index idx_stamp_transactions_user on stamp_transactions(user_id, created_at desc);


-- 9. SHOW ATTENDANCE (for manual stamp awarding at gigs)
create table public.show_attendance (
  show_id uuid references public.shows on delete cascade not null,
  user_id uuid references public.profiles on delete cascade not null,
  checked_in_at timestamp with time zone default now(),
  primary key (show_id, user_id)
);


-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.comments enable row level security;
alter table public.shows enable row level security;
alter table public.links enable row level security;
alter table public.stamp_actions enable row level security;
alter table public.stamp_transactions enable row level security;
alter table public.show_attendance enable row level security;

-- Profiles: anyone can read, users can update their own
create policy "profiles_read" on profiles for select using (true);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

-- Posts: anyone can read non-exclusive, authenticated can create
create policy "posts_read" on posts for select using (true);
create policy "posts_create" on posts for insert with check (auth.uid() = author_id);
create policy "posts_update_own" on posts for update using (auth.uid() = author_id);
create policy "posts_delete_own" on posts for delete using (
  auth.uid() = author_id
  or exists (select 1 from profiles where id = auth.uid() and role in ('band', 'admin'))
);

-- Post likes: authenticated users
create policy "likes_read" on post_likes for select using (true);
create policy "likes_create" on post_likes for insert with check (auth.uid() = user_id);
create policy "likes_delete" on post_likes for delete using (auth.uid() = user_id);

-- Comments: anyone can read, authenticated can create
create policy "comments_read" on comments for select using (true);
create policy "comments_create" on comments for insert with check (auth.uid() = author_id);
create policy "comments_delete" on comments for delete using (
  auth.uid() = author_id
  or exists (select 1 from profiles where id = auth.uid() and role in ('band', 'admin'))
);

-- Shows: anyone can read, band/admin can manage
create policy "shows_read" on shows for select using (true);
create policy "shows_manage" on shows for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('band', 'admin'))
);

-- Links: anyone can read, band/admin can manage
create policy "links_read" on links for select using (true);
create policy "links_manage" on links for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('band', 'admin'))
);

-- Stamp actions: anyone can read, band/admin can manage
create policy "stamp_actions_read" on stamp_actions for select using (true);
create policy "stamp_actions_manage" on stamp_actions for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('band', 'admin'))
);

-- Stamp transactions: users can read their own, band/admin can read all and create
create policy "stamp_tx_read_own" on stamp_transactions for select using (
  auth.uid() = user_id
  or exists (select 1 from profiles where id = auth.uid() and role in ('band', 'admin'))
);
create policy "stamp_tx_create" on stamp_transactions for insert with check (
  auth.uid() = user_id
  or exists (select 1 from profiles where id = auth.uid() and role in ('band', 'admin'))
);

-- Show attendance: users can read their own, band/admin can manage
create policy "attendance_read" on show_attendance for select using (
  auth.uid() = user_id
  or exists (select 1 from profiles where id = auth.uid() and role in ('band', 'admin'))
);
create policy "attendance_manage" on show_attendance for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('band', 'admin'))
);


-- =============================================
-- HELPER FUNCTION: Award stamps to a user
-- =============================================
create or replace function public.award_stamps(
  target_user_id uuid,
  action_trigger_key text,
  awarded_by_id uuid default null
)
returns void as $$
declare
  action_record record;
begin
  -- Find the action
  select * into action_record from stamp_actions
  where trigger_key = action_trigger_key and is_active = true;

  if action_record is null then return; end if;

  -- Create transaction
  insert into stamp_transactions (user_id, action_id, points, description, awarded_by)
  values (target_user_id, action_record.id, action_record.points, action_record.name, awarded_by_id);

  -- Update user stamp count
  update profiles
  set stamp_count = stamp_count + action_record.points,
      stamp_level = case
        when stamp_count + action_record.points >= 500 then 'stamped'
        when stamp_count + action_record.points >= 300 then 'inner_sleeve'
        when stamp_count + action_record.points >= 150 then 'deep_cut'
        when stamp_count + action_record.points >= 50 then 'b_side'
        else 'first_press'
      end
  where id = target_user_id;
end;
$$ language plpgsql security definer;


-- =============================================
-- SEED DATA: Tour dates
-- =============================================
insert into public.shows (date, city, venue, country, region, status) values
  ('2026-02-05', 'Fremantle', 'Mojos', 'AU', 'australia', 'sold_out'),
  ('2026-02-12', 'Fremantle', 'Mojos', 'AU', 'australia', 'sold_out'),
  ('2026-02-19', 'Fremantle', 'Mojos', 'AU', 'australia', 'sold_out'),
  ('2026-02-26', 'Fremantle', 'Mojos', 'AU', 'australia', 'sold_out'),
  ('2026-03-12', 'Brisbane', 'Black Bear Lodge', 'AU', 'australia', 'sold_out'),
  ('2026-03-13', 'Sydney', 'The Eveleigh', 'AU', 'australia', 'sold_out'),
  ('2026-03-14', 'Melbourne', 'Bergy Bandroom', 'AU', 'australia', 'sold_out'),
  ('2026-05-15', 'Saarbrücken', 'Terminus', 'DE', 'europe', 'on_sale'),
  ('2026-05-16', 'Karlsruhe', 'Café Nun', 'DE', 'europe', 'on_sale'),
  ('2026-05-20', 'Grevenbroich', 'Kultus Das Café', 'DE', 'europe', 'on_sale'),
  ('2026-05-22', 'Bergneustadt', 'Schauspielhaus', 'DE', 'europe', 'on_sale'),
  ('2026-05-23', 'Wallisellen', 'Bar 8304', 'CH', 'europe', 'on_sale'),
  ('2026-05-27', 'Wien', 'Club Lucia', 'AT', 'europe', 'on_sale'),
  ('2026-05-29', 'Magdeburg', 'Volksbad Buckau', 'DE', 'europe', 'on_sale'),
  ('2026-05-31', 'Berlin', 'Zimmer 16', 'DE', 'europe', 'on_sale'),
  ('2026-06-01', 'Hamburg', 'Knust Bar', 'DE', 'europe', 'on_sale'),
  ('2026-06-03', 'Leeds', 'Northern Guitars Cafe Bar', 'UK', 'uk', 'on_sale'),
  ('2026-06-04', 'Manchester', 'Gullivers', 'UK', 'uk', 'on_sale'),
  ('2026-06-05', 'Exeter', 'Cavern Club', 'UK', 'uk', 'on_sale'),
  ('2026-06-06', 'London', 'LVLS', 'UK', 'uk', 'on_sale'),
  ('2026-06-07', 'Brighton and Hove', 'The Brunswick', 'UK', 'uk', 'on_sale');


-- =============================================
-- SEED DATA: Streaming & Social Links
-- =============================================
insert into public.links (label, url, icon, category, sort_order) values
  ('Spotify', 'https://open.spotify.com/artist/4lNBuBS2if6Kz9IYUK5fdC', 'spotify', 'streaming', 1),
  ('Apple Music', 'https://music.apple.com/us/artist/the-stamps/1615158764', 'apple-music', 'streaming', 2),
  ('YouTube', 'https://www.youtube.com/@TheStampsOfficial', 'youtube', 'streaming', 3),
  ('Bandcamp', 'https://thestampsofficial.bandcamp.com', 'bandcamp', 'streaming', 4),
  ('Instagram', 'https://www.instagram.com/thestampsofficial', 'instagram', 'social', 1),
  ('TikTok', 'https://www.tiktok.com/@thestampsofficial', 'tiktok', 'social', 2);
