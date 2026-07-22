-- ============================================================
-- SWIJ Community — 認定講師コミュニティ基盤 (V2.0)
-- Migration: 20260722250000_community
-- ============================================================

-- コミュニティ利用可否: instructor / admin / super_admin
create or replace function public.is_community_member()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    (
      select role in ('instructor', 'admin', 'super_admin')
      from public.profiles
      where id = auth.uid()
    ),
    false
  );
$$;

grant execute on function public.is_community_member() to authenticated;

-- ------------------------------------------------------------
-- ① お知らせ（本部配信）
-- ------------------------------------------------------------
create table if not exists public.community_announcements (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  title text not null,
  body text not null,
  published_at timestamptz not null default now(),
  pinned boolean not null default false,
  author_name text not null default 'SWIJ本部',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_announcements_category_check
    check (category in ('update', 'event', 'study', 'research')),
  constraint community_announcements_title_not_blank
    check (btrim(title) <> ''),
  constraint community_announcements_body_not_blank
    check (btrim(body) <> '')
);

create index if not exists community_announcements_published_idx
  on public.community_announcements (pinned desc, published_at desc);

comment on table public.community_announcements is
  'SWIJ本部からのコミュニティお知らせ';

drop trigger if exists community_announcements_set_updated_at
  on public.community_announcements;
create trigger community_announcements_set_updated_at
before update on public.community_announcements
for each row execute function public.set_updated_at();

alter table public.community_announcements enable row level security;

drop policy if exists "community_announcements_select_members"
  on public.community_announcements;
create policy "community_announcements_select_members"
  on public.community_announcements for select
  using (public.is_community_member());

drop policy if exists "community_announcements_admin_all"
  on public.community_announcements;
create policy "community_announcements_admin_insert"
  on public.community_announcements for insert
  with check (public.is_admin_or_above());

create policy "community_announcements_admin_update"
  on public.community_announcements for update
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

create policy "community_announcements_admin_delete"
  on public.community_announcements for delete
  using (public.is_admin_or_above());

-- ------------------------------------------------------------
-- ② ディスカッション投稿
-- ------------------------------------------------------------
create table if not exists public.community_discussion_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null,
  category text not null,
  title text not null,
  body text not null,
  like_count integer not null default 0,
  comment_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_discussion_posts_category_check
    check (
      category in (
        'sleep_science',
        'melatonin_yoga',
        'case_consult',
        'enterprise',
        'retreat',
        'other'
      )
    ),
  constraint community_discussion_posts_title_not_blank
    check (btrim(title) <> ''),
  constraint community_discussion_posts_body_not_blank
    check (btrim(body) <> ''),
  constraint community_discussion_posts_like_count_nonneg
    check (like_count >= 0),
  constraint community_discussion_posts_comment_count_nonneg
    check (comment_count >= 0)
);

create index if not exists community_discussion_posts_created_idx
  on public.community_discussion_posts (created_at desc);

create index if not exists community_discussion_posts_category_idx
  on public.community_discussion_posts (category, created_at desc);

comment on table public.community_discussion_posts is
  '認定講師コミュニティのディスカッション投稿';

drop trigger if exists community_discussion_posts_set_updated_at
  on public.community_discussion_posts;
create trigger community_discussion_posts_set_updated_at
before update on public.community_discussion_posts
for each row execute function public.set_updated_at();

alter table public.community_discussion_posts enable row level security;

drop policy if exists "community_discussion_posts_select_members"
  on public.community_discussion_posts;
create policy "community_discussion_posts_select_members"
  on public.community_discussion_posts for select
  using (public.is_community_member());

drop policy if exists "community_discussion_posts_insert_own"
  on public.community_discussion_posts;
create policy "community_discussion_posts_insert_own"
  on public.community_discussion_posts for insert
  with check (
    public.is_community_member()
    and auth.uid() = author_id
  );

drop policy if exists "community_discussion_posts_update_own_or_admin"
  on public.community_discussion_posts;
create policy "community_discussion_posts_update_own_or_admin"
  on public.community_discussion_posts for update
  using (
    auth.uid() = author_id
    or public.is_admin_or_above()
  )
  with check (
    auth.uid() = author_id
    or public.is_admin_or_above()
  );

drop policy if exists "community_discussion_posts_delete_own_or_admin"
  on public.community_discussion_posts;
create policy "community_discussion_posts_delete_own_or_admin"
  on public.community_discussion_posts for delete
  using (
    auth.uid() = author_id
    or public.is_admin_or_above()
  );

-- ------------------------------------------------------------
-- ② コメント / 返信
-- ------------------------------------------------------------
create table if not exists public.community_discussion_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null
    references public.community_discussion_posts (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null,
  parent_id uuid references public.community_discussion_comments (id)
    on delete cascade,
  body text not null,
  like_count integer not null default 0,
  created_at timestamptz not null default now(),
  constraint community_discussion_comments_body_not_blank
    check (btrim(body) <> ''),
  constraint community_discussion_comments_like_count_nonneg
    check (like_count >= 0)
);

create index if not exists community_discussion_comments_post_idx
  on public.community_discussion_comments (post_id, created_at);

comment on table public.community_discussion_comments is
  'ディスカッションへのコメント・返信';

alter table public.community_discussion_comments enable row level security;

drop policy if exists "community_discussion_comments_select_members"
  on public.community_discussion_comments;
create policy "community_discussion_comments_select_members"
  on public.community_discussion_comments for select
  using (public.is_community_member());

drop policy if exists "community_discussion_comments_insert_own"
  on public.community_discussion_comments;
create policy "community_discussion_comments_insert_own"
  on public.community_discussion_comments for insert
  with check (
    public.is_community_member()
    and auth.uid() = author_id
  );

drop policy if exists "community_discussion_comments_update_own_or_admin"
  on public.community_discussion_comments;
create policy "community_discussion_comments_update_own_or_admin"
  on public.community_discussion_comments for update
  using (
    auth.uid() = author_id
    or public.is_admin_or_above()
  )
  with check (
    auth.uid() = author_id
    or public.is_admin_or_above()
  );

drop policy if exists "community_discussion_comments_delete_own_or_admin"
  on public.community_discussion_comments;
create policy "community_discussion_comments_delete_own_or_admin"
  on public.community_discussion_comments for delete
  using (
    auth.uid() = author_id
    or public.is_admin_or_above()
  );

-- ------------------------------------------------------------
-- いいね
-- ------------------------------------------------------------
create table if not exists public.community_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  created_at timestamptz not null default now(),
  constraint community_likes_target_type_check
    check (
      target_type in (
        'discussion_post',
        'discussion_comment',
        'case'
      )
    ),
  constraint community_likes_user_target_unique
    unique (user_id, target_type, target_id)
);

create index if not exists community_likes_target_idx
  on public.community_likes (target_type, target_id);

comment on table public.community_likes is
  'コミュニティ投稿・コメント・ケースへのいいね';

alter table public.community_likes enable row level security;

drop policy if exists "community_likes_select_members"
  on public.community_likes;
create policy "community_likes_select_members"
  on public.community_likes for select
  using (public.is_community_member());

drop policy if exists "community_likes_insert_own"
  on public.community_likes;
create policy "community_likes_insert_own"
  on public.community_likes for insert
  with check (
    public.is_community_member()
    and auth.uid() = user_id
  );

drop policy if exists "community_likes_delete_own"
  on public.community_likes;
create policy "community_likes_delete_own"
  on public.community_likes for delete
  using (auth.uid() = user_id or public.is_admin_or_above());

-- ------------------------------------------------------------
-- ③ ケース共有（匿名化）
-- ------------------------------------------------------------
create table if not exists public.community_case_shares (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null,
  age_band text not null,
  gender text not null default 'unspecified',
  challenge text not null,
  intervention text not null,
  outcome text not null,
  attachment_note text,
  like_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_case_shares_gender_check
    check (gender in ('female', 'male', 'other', 'unspecified')),
  constraint community_case_shares_fields_not_blank
    check (
      btrim(age_band) <> ''
      and btrim(challenge) <> ''
      and btrim(intervention) <> ''
      and btrim(outcome) <> ''
    ),
  constraint community_case_shares_like_count_nonneg
    check (like_count >= 0)
);

create index if not exists community_case_shares_created_idx
  on public.community_case_shares (created_at desc);

comment on table public.community_case_shares is
  '匿名化されたケース共有（画像添付は将来拡張）';

drop trigger if exists community_case_shares_set_updated_at
  on public.community_case_shares;
create trigger community_case_shares_set_updated_at
before update on public.community_case_shares
for each row execute function public.set_updated_at();

alter table public.community_case_shares enable row level security;

drop policy if exists "community_case_shares_select_members"
  on public.community_case_shares;
create policy "community_case_shares_select_members"
  on public.community_case_shares for select
  using (public.is_community_member());

drop policy if exists "community_case_shares_insert_own"
  on public.community_case_shares;
create policy "community_case_shares_insert_own"
  on public.community_case_shares for insert
  with check (
    public.is_community_member()
    and auth.uid() = author_id
  );

drop policy if exists "community_case_shares_update_own_or_admin"
  on public.community_case_shares;
create policy "community_case_shares_update_own_or_admin"
  on public.community_case_shares for update
  using (
    auth.uid() = author_id
    or public.is_admin_or_above()
  )
  with check (
    auth.uid() = author_id
    or public.is_admin_or_above()
  );

drop policy if exists "community_case_shares_delete_own_or_admin"
  on public.community_case_shares;
create policy "community_case_shares_delete_own_or_admin"
  on public.community_case_shares for delete
  using (
    auth.uid() = author_id
    or public.is_admin_or_above()
  );

-- ------------------------------------------------------------
-- ④ ナレッジライブラリ（本部配信）
-- ------------------------------------------------------------
create table if not exists public.community_knowledge_items (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  title text not null,
  description text not null default '',
  tags text[] not null default '{}',
  href text,
  published_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_knowledge_items_type_check
    check (type in ('pdf', 'video', 'template', 'research')),
  constraint community_knowledge_items_title_not_blank
    check (btrim(title) <> '')
);

create index if not exists community_knowledge_items_published_idx
  on public.community_knowledge_items (published_at desc);

comment on table public.community_knowledge_items is
  '本部配信のナレッジライブラリ（PDF / 動画 / テンプレート / 研究資料）';

drop trigger if exists community_knowledge_items_set_updated_at
  on public.community_knowledge_items;
create trigger community_knowledge_items_set_updated_at
before update on public.community_knowledge_items
for each row execute function public.set_updated_at();

alter table public.community_knowledge_items enable row level security;

drop policy if exists "community_knowledge_items_select_members"
  on public.community_knowledge_items;
create policy "community_knowledge_items_select_members"
  on public.community_knowledge_items for select
  using (public.is_community_member());

create policy "community_knowledge_items_admin_insert"
  on public.community_knowledge_items for insert
  with check (public.is_admin_or_above());

create policy "community_knowledge_items_admin_update"
  on public.community_knowledge_items for update
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

create policy "community_knowledge_items_admin_delete"
  on public.community_knowledge_items for delete
  using (public.is_admin_or_above());

-- ------------------------------------------------------------
-- ⑤ イベント
-- ------------------------------------------------------------
create table if not exists public.community_events (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  title text not null,
  description text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text not null default '',
  capacity integer,
  registration_url text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_events_type_check
    check (type in ('study', 'zoom', 'retreat', 'training')),
  constraint community_events_title_not_blank
    check (btrim(title) <> ''),
  constraint community_events_capacity_positive
    check (capacity is null or capacity > 0)
);

create index if not exists community_events_starts_idx
  on public.community_events (starts_at);

comment on table public.community_events is
  '勉強会・Zoom・リトリート・養成講座のイベント一覧';

drop trigger if exists community_events_set_updated_at
  on public.community_events;
create trigger community_events_set_updated_at
before update on public.community_events
for each row execute function public.set_updated_at();

alter table public.community_events enable row level security;

drop policy if exists "community_events_select_members"
  on public.community_events;
create policy "community_events_select_members"
  on public.community_events for select
  using (public.is_community_member());

create policy "community_events_admin_insert"
  on public.community_events for insert
  with check (public.is_admin_or_above());

create policy "community_events_admin_update"
  on public.community_events for update
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

create policy "community_events_admin_delete"
  on public.community_events for delete
  using (public.is_admin_or_above());

-- ------------------------------------------------------------
-- ⑥ メッセージ（V2.0 はスキーマのみ。UIはダミー可）
-- ------------------------------------------------------------
create table if not exists public.community_message_threads (
  id uuid primary key default gen_random_uuid(),
  participant_a uuid not null references auth.users (id) on delete cascade,
  participant_b uuid not null references auth.users (id) on delete cascade,
  last_message text not null default '',
  last_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint community_message_threads_distinct_participants
    check (participant_a <> participant_b),
  constraint community_message_threads_pair_unique
    unique (participant_a, participant_b)
);

create table if not exists public.community_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null
    references public.community_message_threads (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  sent_at timestamptz not null default now(),
  read_at timestamptz,
  constraint community_messages_body_not_blank
    check (btrim(body) <> '')
);

create index if not exists community_messages_thread_idx
  on public.community_messages (thread_id, sent_at);

comment on table public.community_message_threads is
  '認定講師同士の1対1メッセージスレッド';
comment on table public.community_messages is
  '1対1メッセージ本体';

alter table public.community_message_threads enable row level security;
alter table public.community_messages enable row level security;

create policy "community_message_threads_select_participants"
  on public.community_message_threads for select
  using (
    public.is_community_member()
    and (
      auth.uid() = participant_a
      or auth.uid() = participant_b
      or public.is_admin_or_above()
    )
  );

create policy "community_message_threads_insert_participants"
  on public.community_message_threads for insert
  with check (
    public.is_community_member()
    and (
      auth.uid() = participant_a
      or auth.uid() = participant_b
    )
  );

create policy "community_messages_select_participants"
  on public.community_messages for select
  using (
    public.is_community_member()
    and (
      exists (
        select 1
        from public.community_message_threads t
        where t.id = thread_id
          and (
            t.participant_a = auth.uid()
            or t.participant_b = auth.uid()
            or public.is_admin_or_above()
          )
      )
    )
  );

create policy "community_messages_insert_own"
  on public.community_messages for insert
  with check (
    public.is_community_member()
    and auth.uid() = sender_id
    and exists (
      select 1
      from public.community_message_threads t
      where t.id = thread_id
        and (t.participant_a = auth.uid() or t.participant_b = auth.uid())
    )
  );
