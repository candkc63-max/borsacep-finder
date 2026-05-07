-- Forum: posts, comments, likes (her birinde RLS açık)

create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text,
  title text not null check (length(title) between 3 and 200),
  body text not null check (length(body) between 1 and 5000),
  ticker text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists forum_posts_created_at_idx on public.forum_posts (created_at desc);
create index if not exists forum_posts_ticker_idx on public.forum_posts (ticker) where ticker is not null;

create table if not exists public.forum_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text,
  body text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists forum_comments_post_idx on public.forum_comments (post_id, created_at);

create table if not exists public.forum_likes (
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists forum_likes_post_idx on public.forum_likes (post_id);

-- RLS
alter table public.forum_posts enable row level security;
alter table public.forum_comments enable row level security;
alter table public.forum_likes enable row level security;

drop policy if exists "forum_posts_read" on public.forum_posts;
create policy "forum_posts_read" on public.forum_posts for select using (true);

drop policy if exists "forum_posts_insert" on public.forum_posts;
create policy "forum_posts_insert" on public.forum_posts for insert with check (auth.uid() = user_id);

drop policy if exists "forum_posts_update" on public.forum_posts;
create policy "forum_posts_update" on public.forum_posts for update using (auth.uid() = user_id);

drop policy if exists "forum_posts_delete" on public.forum_posts;
create policy "forum_posts_delete" on public.forum_posts for delete using (auth.uid() = user_id);

drop policy if exists "forum_comments_read" on public.forum_comments;
create policy "forum_comments_read" on public.forum_comments for select using (true);

drop policy if exists "forum_comments_insert" on public.forum_comments;
create policy "forum_comments_insert" on public.forum_comments for insert with check (auth.uid() = user_id);

drop policy if exists "forum_comments_delete" on public.forum_comments;
create policy "forum_comments_delete" on public.forum_comments for delete using (auth.uid() = user_id);

drop policy if exists "forum_likes_read" on public.forum_likes;
create policy "forum_likes_read" on public.forum_likes for select using (true);

drop policy if exists "forum_likes_insert" on public.forum_likes;
create policy "forum_likes_insert" on public.forum_likes for insert with check (auth.uid() = user_id);

drop policy if exists "forum_likes_delete" on public.forum_likes;
create policy "forum_likes_delete" on public.forum_likes for delete using (auth.uid() = user_id);

-- Like + comment sayıları için view
create or replace view public.forum_post_stats as
select
  p.id as post_id,
  coalesce(l.like_count, 0) as like_count,
  coalesce(c.comment_count, 0) as comment_count
from public.forum_posts p
left join (
  select post_id, count(*)::int as like_count from public.forum_likes group by post_id
) l on l.post_id = p.id
left join (
  select post_id, count(*)::int as comment_count from public.forum_comments group by post_id
) c on c.post_id = p.id;

grant select on public.forum_post_stats to anon, authenticated;
